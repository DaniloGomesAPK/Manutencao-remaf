import crypto from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from './firebaseAdmin';

/**
 * Eventos reconhecidos por igualdade exata (Strict Equality).
 * Qualquer evento fora desta lista é ignorado com HTTP 200 sem alterar licenças.
 */
export const ALLOWED_CAKTO_EVENTS = [
  'purchase_approved',
  'subscription_renewed',
  'refund',
  'chargeback',
  'subscription_canceled',
  'purchase_refused',
] as const;

export type CaktoAllowedEvent = (typeof ALLOWED_CAKTO_EVENTS)[number];

export interface CaktoWebhookResponse {
  statusCode: number;
  body: {
    success: boolean;
    error?: string;
    message?: string;
    event?: string;
    eventId?: string;
    ignored?: boolean;
    idempotent?: boolean;
    details?: {
      targetEmail?: string;
      empresaId?: string;
      status?: string;
      action?: string;
    };
  };
}

/**
 * Comparação segura de strings com tempo constante para evitar ataques de timing.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Executa timingSafeEqual com o mesmo buffer para evitar vazamento por timing
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Extrai o segredo do webhook exclusivamente a partir dos cabeçalhos HTTP.
 * NUNCA inspeciona query parameters (req.query.secret é expressamente rejeitado).
 */
export function extractSecretFromHeaders(headers: Record<string, string | string[] | undefined>): string {
  const possibleHeaders = [
    'x-cakto-secret',
    'x-webhook-secret',
    'cakto-secret',
    'x-api-key',
    'authorization',
  ];

  for (const headerName of possibleHeaders) {
    const rawVal = headers[headerName];
    if (typeof rawVal === 'string' && rawVal.trim()) {
      if (headerName === 'authorization' && rawVal.startsWith('Bearer ')) {
        return rawVal.substring(7).trim();
      }
      return rawVal.trim();
    }
  }

  return '';
}

/**
 * Sanitiza strings para logs seguros.
 */
function sanitizeForLog(str: any, maxLength = 120): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[^\w@.-]/g, '_').substring(0, maxLength);
}

/**
 * Extrai o identificador único estável do evento da Cakto.
 * NÃO inventa IDs aleatórios — utiliza o identificador real enviado pela plataforma.
 */
export function extractCaktoEventId(payload: any): string {
  if (!payload || typeof payload !== 'object') return '';

  const candidates = [
    payload.id,
    payload.event_id,
    payload.eventId,
    payload.transaction_id,
    payload.transactionId,
    payload.data?.id,
    payload.data?.event_id,
    payload.data?.eventId,
    payload.data?.transaction_id,
    payload.data?.transactionId,
    payload.data?.subscription?.id,
    payload.subscription?.id,
    payload.data?.order?.id,
    payload.order?.id,
  ];

  for (const cand of candidates) {
    if (typeof cand === 'string' && cand.trim().length > 0) {
      // Normaliza removendo caracteres inválidos para documento do Firestore
      return cand.trim().replace(/[/\\#?]/g, '_');
    }
    if (typeof cand === 'number') {
      return String(cand);
    }
  }

  return '';
}

/**
 * Extrai o identificador do usuário e e-mail a partir do payload Cakto.
 */
function extractUserIdentifiers(payload: any): { email: string; uid: string; planType: 'mensal' | 'anual' } {
  let email = '';
  let uid = '';
  let planType: 'mensal' | 'anual' = 'mensal';

  if (!payload || typeof payload !== 'object') {
    return { email, uid, planType };
  }

  // 1. Tenta extrair UID de metadata ou custom_fields
  const possibleUid =
    payload.data?.metadata?.uid ||
    payload.data?.custom_fields?.uid ||
    payload.metadata?.uid ||
    payload.custom_fields?.uid ||
    payload.data?.uid ||
    payload.uid;

  if (typeof possibleUid === 'string' && possibleUid.trim()) {
    uid = possibleUid.trim();
  }

  // 2. Tenta extrair E-mail do comprador/cliente
  const possibleEmail =
    payload.data?.buyer?.email ||
    payload.data?.customer?.email ||
    payload.data?.client?.email ||
    payload.buyer?.email ||
    payload.customer?.email ||
    payload.client?.email ||
    payload.data?.email ||
    payload.email;

  if (typeof possibleEmail === 'string' && possibleEmail.trim()) {
    email = possibleEmail.trim().toLowerCase();
  }

  // 3. Tenta extrair Plano (mensal vs anual)
  const planName = (
    payload.data?.plan?.name ||
    payload.data?.product?.name ||
    payload.plan?.name ||
    payload.product?.name ||
    payload.plano ||
    payload.plan ||
    ''
  ).toString().toLowerCase();

  if (planName.includes('anual') || planName.includes('ano') || planName.includes('12 meses') || planName.includes('annual')) {
    planType = 'anual';
  }

  return { email, uid, planType };
}

/**
 * Processador do Webhook Cakto (Server-Authoritative, Fail-Closed, Idempotente).
 * 
 * Regras:
 * 1. CAKTO_WEBHOOK_ENABLED === 'true' obrigatório.
 * 2. CAKTO_WEBHOOK_SECRET obrigatório e validado por header (nunca por query).
 * 3. Validação de evento por igualdade exata (nunca .includes).
 * 4. Trava de idempotência atômica via transação em webhook_logs/{eventId}.
 * 5. Não assume empresaId === uid. Busca users/{uid} e extrai empresaId real.
 * 6. Valida usuário, empresaId e existência de empresas/{empresaId}.
 * 7. Logs 100% seguros (sem secrets, tokens ou dados sensíveis).
 */
export async function handleCaktoWebhook(
  headers: Record<string, string | string[] | undefined>,
  payload: any
): Promise<CaktoWebhookResponse> {
  // 1. Verificação de ativação do Webhook (CAKTO_WEBHOOK_ENABLED)
  const isEnabled = process.env.CAKTO_WEBHOOK_ENABLED === 'true';
  if (!isEnabled) {
    console.log('[Cakto Webhook] Webhook desativado por configuração (CAKTO_WEBHOOK_ENABLED !== "true"). Nenhuma requisição é processada.');
    return {
      statusCode: 403,
      body: {
        success: false,
        error: 'O Webhook da Cakto está desativado no servidor por segurança.',
      },
    };
  }

  // 2. Verificação de CAKTO_WEBHOOK_SECRET
  const configuredSecret = process.env.CAKTO_WEBHOOK_SECRET;
  if (!configuredSecret || !configuredSecret.trim()) {
    console.error('[Cakto Webhook] CRÍTICO: CAKTO_WEBHOOK_SECRET não está configurado no servidor. Requisição bloqueada.');
    return {
      statusCode: 403,
      body: {
        success: false,
        error: 'Segredo de autenticação do webhook não configurado no servidor.',
      },
    };
  }

  const providedSecret = extractSecretFromHeaders(headers);
  if (!providedSecret || !timingSafeEqualStrings(providedSecret, configuredSecret.trim())) {
    console.warn('[Cakto Webhook] Falha de autenticação: cabeçalho com segredo do webhook inválido ou ausente.');
    return {
      statusCode: 401,
      body: {
        success: false,
        error: 'Autenticação do webhook inválida ou ausente.',
      },
    };
  }

  // 3. Validação do Payload e Evento
  if (!payload || typeof payload !== 'object') {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'Payload da requisição inválido ou vazio.',
      },
    };
  }

  // Extrai nome do evento (compatível com Cakto)
  const rawEvent = (
    typeof payload.event === 'string'
      ? payload.event.trim()
      : typeof payload.evento === 'string'
      ? payload.evento.trim()
      : typeof payload.status === 'string'
      ? payload.status.trim()
      : ''
  );

  if (!rawEvent) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'Campo "event" obrigatório não encontrado no payload.',
      },
    };
  }

  // 3.1 Verificação por igualdade exata (Strict Equality - Sem usar .includes())
  const isExactAllowedEvent = ALLOWED_CAKTO_EVENTS.includes(rawEvent as CaktoAllowedEvent);
  if (!isExactAllowedEvent) {
    console.log(`[Cakto Webhook] Evento ignorado (igualdade exata não correspondida): "${sanitizeForLog(rawEvent)}". Nenhuma licença foi modificada.`);
    return {
      statusCode: 200,
      body: {
        success: true,
        ignored: true,
        event: rawEvent,
        message: `Evento "${rawEvent}" recebido e ignorado sem alterações no banco de dados.`,
      },
    };
  }

  const event = rawEvent as CaktoAllowedEvent;
  console.log(`[Cakto Webhook] Processando evento autenticado: "${event}"`);

  // 4. Identificação do ID único do evento para Idempotência (NÃO inventar ID aleatório)
  const eventId = extractCaktoEventId(payload);
  if (!eventId) {
    console.warn('[Cakto Webhook] Identificador único do evento não encontrado no payload. Bloqueando por segurança de idempotência.');
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'Identificador único do evento ausente no payload da Cakto.',
      },
    };
  }

  // 5. Identificação do Usuário
  const { email: rawEmail, uid: rawUid, planType } = extractUserIdentifiers(payload);

  const adminApp = getFirebaseAdmin();
  const auth = getAuth(adminApp);
  const db = getFirestore(adminApp);

  let targetUid = rawUid;
  let targetEmail = rawEmail;

  // Se não temos UID mas temos e-mail, busca UID no Firebase Auth ou Firestore users
  if (!targetUid && targetEmail) {
    try {
      const userAuthRecord = await auth.getUserByEmail(targetEmail);
      targetUid = userAuthRecord.uid;
    } catch {
      // Se não encontrou no Auth, tenta busca no Firestore users por email
      const userQuery = await db.collection('users').where('email', '==', targetEmail).limit(1).get();
      if (!userQuery.empty) {
        targetUid = userQuery.docs[0].id;
      }
    }
  }

  if (!targetUid) {
    console.warn(`[Cakto Webhook] Usuário não localizado para o e-mail: ${sanitizeForLog(targetEmail)}.`);
    return {
      statusCode: 404,
      body: {
        success: false,
        error: `Usuário associado ao evento não foi encontrado no sistema.`,
      },
    };
  }

  // 5.1 Busca users/{targetUid} e usa o empresaId real desse documento (NUNCA assume empresaId === uid)
  const userDocRef = db.collection('users').doc(targetUid);
  const userDoc = await userDocRef.get();

  if (!userDoc.exists) {
    console.warn(`[Cakto Webhook] Documento users/${sanitizeForLog(targetUid)} inexistente no Firestore.`);
    return {
      statusCode: 404,
      body: {
        success: false,
        error: `Documento de usuário (users/${targetUid}) não encontrado.`,
      },
    };
  }

  const userData = userDoc.data()!;
  targetEmail = targetEmail || userData.email?.trim().toLowerCase() || '';

  // 6. Validação de integridade: usuário possui empresaId e empresa existe
  const realEmpresaId = userData.empresaId;
  if (typeof realEmpresaId !== 'string' || !realEmpresaId.trim()) {
    console.error(`[Cakto Webhook] Usuário ${sanitizeForLog(targetUid)} não possui empresaId vinculado.`);
    return {
      statusCode: 400,
      body: {
        success: false,
        error: `O usuário correspondente não possui empresa vinculada ao seu cadastro.`,
      },
    };
  }

  const empresaDocRef = db.collection('empresas').doc(realEmpresaId.trim());
  const empresaDoc = await empresaDocRef.get();

  if (!empresaDoc.exists) {
    console.error(`[Cakto Webhook] Empresa ${sanitizeForLog(realEmpresaId)} não encontrada no Firestore.`);
    return {
      statusCode: 404,
      body: {
        success: false,
        error: `A empresa "${realEmpresaId}" associada ao usuário não existe no sistema.`,
      },
    };
  }

  // 7. Trava de Idempotência e Execução Atômica via Transação no Firestore
  const eventRef = db.collection('webhook_logs').doc(eventId);
  const licencaAtualRef = empresaDocRef.collection('licenca').doc('licencaAtual');
  const emailAuthRef = targetEmail ? db.collection('emailsAutorizados').doc(targetEmail) : null;

  const now = new Date();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();

  let finalStatus = 'pago';
  let calculatedValidade: string | null = null;
  let accessUntilTimestamp: Timestamp | null = null;
  let actionDescription = '';
  const planDays = planType === 'anual' ? 365 : 30;

  if (event === 'purchase_approved' || event === 'subscription_renewed') {
    let baseMs = nowMs;

    if (event === 'subscription_renewed') {
      const existingAccessUntil = userData.accessUntil;
      let existingMs: number | null = null;
      if (existingAccessUntil && typeof existingAccessUntil.toMillis === 'function') {
        existingMs = existingAccessUntil.toMillis();
      } else if (existingAccessUntil && typeof existingAccessUntil.toDate === 'function') {
        existingMs = existingAccessUntil.toDate().getTime();
      }

      if (existingMs && existingMs > nowMs) {
        baseMs = existingMs;
      }
    }

    const expDate = new Date(baseMs + planDays * 24 * 60 * 60 * 1000);
    calculatedValidade = expDate.toISOString();
    accessUntilTimestamp = Timestamp.fromDate(expDate);
    finalStatus = 'pago';
    actionDescription = `Licença (${planType}) ${event === 'subscription_renewed' ? 'renovada' : 'ativada'} via Cakto por ${planDays} dias.`;
  } else if (
    event === 'refund' ||
    event === 'chargeback' ||
    event === 'subscription_canceled' ||
    event === 'purchase_refused'
  ) {
    finalStatus = event === 'purchase_refused' ? 'expirado' : 'bloqueado';
    calculatedValidade = nowIso;
    accessUntilTimestamp = Timestamp.fromDate(new Date(nowMs - 1000));
    actionDescription = `Acesso cancelado/revogado via evento Cakto: ${event}.`;
  }

  // Executa verificação e gravação em transação (Idempotência garantida)
  let alreadyProcessed = false;

  await db.runTransaction(async (transaction) => {
    const eventDocSnapshot = await transaction.get(eventRef);
    if (eventDocSnapshot.exists) {
      alreadyProcessed = true;
      console.log(`[Cakto Webhook] Evento "${sanitizeForLog(eventId)}" já foi processado anteriormente. Nenhuma alteração aplicada.`);
      return;
    }

    // 1. Grava registro na coleção webhook_logs/{eventId}
    transaction.set(eventRef, {
      eventId,
      evento: event,
      targetUid,
      targetEmail: targetEmail || 'n/a',
      empresaId: realEmpresaId,
      statusAplicado: finalStatus,
      plano: planType,
      validade: calculatedValidade,
      processedAt: nowIso,
    });

    // 2. Aplica alterações na licença de acordo com o status
    if (event === 'purchase_approved' || event === 'subscription_renewed') {
      if (emailAuthRef && targetEmail) {
        transaction.set(
          emailAuthRef,
          {
            email: targetEmail,
            empresaId: realEmpresaId,
            status: 'pago',
            plano: planType,
            validade: calculatedValidade,
            accessUntil: accessUntilTimestamp,
            ativo: true,
            bloqueado: false,
            trialAtivo: false,
            origemPagamento: 'cakto',
            ultimaAtualizacao: nowIso,
          },
          { merge: true }
        );
      }

      transaction.set(
        userDocRef,
        {
          statusConta: 'active',
          statusLicenca: 'pago',
          ativo: true,
          trialAtivo: false,
          plano: planType,
          accessUntil: accessUntilTimestamp,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      transaction.set(
        empresaDocRef,
        {
          trialAtivo: false,
          statusLicenca: 'pago',
          plano: planType,
          dataExpiracaoLicenca: calculatedValidade,
          accessUntil: accessUntilTimestamp,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      transaction.set(
        licencaAtualRef,
        {
          status: 'pago',
          plano: planType,
          validade: calculatedValidade,
          accessUntil: accessUntilTimestamp,
          ativo: true,
          origem: 'cakto',
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } else {
      if (emailAuthRef && targetEmail) {
        transaction.set(
          emailAuthRef,
          {
            status: finalStatus,
            ativo: false,
            bloqueado: true,
            accessUntil: accessUntilTimestamp,
            ultimaAtualizacao: nowIso,
          },
          { merge: true }
        );
      }

      transaction.set(
        userDocRef,
        {
          statusConta: 'suspended',
          statusLicenca: finalStatus,
          ativo: false,
          accessUntil: accessUntilTimestamp,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      transaction.set(
        empresaDocRef,
        {
          statusLicenca: finalStatus,
          accessUntil: accessUntilTimestamp,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      transaction.set(
        licencaAtualRef,
        {
          status: finalStatus,
          ativo: false,
          accessUntil: accessUntilTimestamp,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    }

    // 3. Log de auditoria complementar
    const auditId = `audit_cakto_${nowMs}_${Math.random().toString(36).substring(2, 8)}`;
    const auditRef = db.collection('adminAuditLogs').doc(auditId);
    transaction.set(auditRef, {
      tipo: 'webhook_cakto',
      evento: event,
      eventId,
      targetUid,
      targetEmail: targetEmail || 'n/a',
      empresaId: realEmpresaId,
      statusResultante: finalStatus,
      plano: planType,
      validade: calculatedValidade,
      timestamp: nowIso,
    });
  });

  if (alreadyProcessed) {
    return {
      statusCode: 200,
      body: {
        success: true,
        idempotent: true,
        eventId,
        event,
        message: `Evento "${eventId}" já foi processado anteriormente. Nenhuma ação duplicada realizada.`,
      },
    };
  }

  console.log(`[Cakto Webhook] Evento "${event}" (ID: ${sanitizeForLog(eventId)}) processado com sucesso para empresa "${sanitizeForLog(realEmpresaId)}". Status: ${finalStatus}.`);

  return {
    statusCode: 200,
    body: {
      success: true,
      event,
      eventId,
      message: actionDescription,
      details: {
        targetEmail,
        empresaId: realEmpresaId,
        status: finalStatus,
        action: event,
      },
    },
  };
}
