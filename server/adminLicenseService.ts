import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from './firebaseAdmin';

export type AdminLicenseAction = 'activate' | 'renew' | 'block' | 'revoke';
export type AdminLicensePlan = 'mensal' | 'anual';

export interface AdminLicenseInput {
  action: AdminLicenseAction;
  email: string;
  plano?: AdminLicensePlan;
}

export interface AdminLicenseResult {
  success: boolean;
  action: AdminLicenseAction;
  targetEmail: string;
  empresaId: string;
  status: string;
  plano: string | null;
  validade: string | null;
  message: string;
  auditId: string;
}

/**
 * Sanitiza strings de entrada para evitar injeções ou valores corrompidos.
 */
function sanitizeString(val: any, maxLength = 100): string {
  if (typeof val !== 'string') return '';
  return val.trim().substring(0, maxLength);
}

/**
 * Regras Comerciais Fixas de Duração:
 * - Mensal: 30 dias
 * - Anual: 365 dias
 */
const PLAN_DURATIONS_DAYS: Record<AdminLicensePlan, number> = {
  mensal: 30,
  anual: 365,
};

/**
 * Extrai o timestamp em milissegundos de um campo accessUntil ou validade.
 */
function parseAccessUntilMs(accessUntilField: any, validadeField?: string | null): number | null {
  if (accessUntilField) {
    if (typeof accessUntilField.toMillis === 'function') {
      return accessUntilField.toMillis();
    }
    if (typeof accessUntilField.toDate === 'function') {
      return accessUntilField.toDate().getTime();
    }
    if (typeof accessUntilField.seconds === 'number') {
      return accessUntilField.seconds * 1000;
    }
    if (typeof accessUntilField === 'string' || typeof accessUntilField === 'number') {
      const d = new Date(accessUntilField);
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }
  if (validadeField) {
    const d = new Date(validadeField);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return null;
}

/**
 * Serviço Server-Authoritative para Gestão Manual de Licenças (Liberação Pós-Pix / Suporte).
 * 
 * Regras Estritas de Segurança e Controle Comercial:
 * 1. O Firebase ID Token do administrador é verificado exclusivamente pelo Firebase Admin SDK.
 * 2. O e-mail do administrador deve constar em SYSTEM_ADMIN_EMAILS e possuir email_verified == true.
 *    Caso contrário -> Fail-Closed (HTTP 403).
 * 3. O cliente de destino deve existir no Firebase Auth e em users/{uid} com empresaId válida.
 * 4. NUNCA cria novo usuário, nova empresa ou gera empresaId nesta rota.
 * 5. As ações permitidas são estritamente: activate, renew, block, revoke.
 * 6. Para activate/renew, o plano deve ser estritamente 'mensal' (30 dias) ou 'anual' (365 dias).
 *    Parâmetro arbitrário de 'dias' não é aceito.
 * 7. Idempotência: 'activate' repetido em licença ativa NÃO acumula ou estende dias. Extensão ocorre exclusivamente via 'renew'.
 * 8. Atualização atômica via WriteBatch em:
 *    - emailsAutorizados/{email}
 *    - users/{uid}
 *    - empresas/{empresaId}
 *    - empresas/{empresaId}/licenca/licencaAtual
 *    - adminAuditLogs/{logId} (registro de auditoria sem segredos ou tokens)
 *    Incluindo o campo server-controlled `accessUntil` (Firestore Timestamp).
 */
export async function handleAdminLicenseOperation(
  idToken: string,
  rawPayload: AdminLicenseInput
): Promise<AdminLicenseResult> {
  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    throw new Error('Token de autenticação administrativo não fornecido no cabeçalho Bearer.');
  }

  const adminApp = getFirebaseAdmin();
  const auth = getAuth(adminApp);
  const db = getFirestore(adminApp);

  // 1. Verificação server-side do ID Token do Administrador
  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(idToken.trim());
  } catch (verifyErr: any) {
    console.error('[Admin License] Falha na validação do ID Token do Administrador:', verifyErr?.message || verifyErr);
    throw new Error('Sessão expirada ou token de autenticação administrativo inválido.');
  }

  const adminEmail = decodedToken.email?.trim().toLowerCase();
  if (!adminEmail) {
    throw new Error('O token de autenticação administrativo não possui e-mail associado.');
  }

  // 2. Verificação de SYSTEM_ADMIN_EMAILS e email_verified == true
  const systemAdminEnv = process.env.SYSTEM_ADMIN_EMAILS || '';
  const systemAdmins = systemAdminEnv
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (systemAdmins.length === 0) {
    console.error('[Admin License] CRÍTICO: SYSTEM_ADMIN_EMAILS não está configurada no servidor. Operação negada (Fail-Closed).');
    throw new Error('Acesso administrativo não configurado no servidor. Operação negada por segurança.');
  }

  if (!systemAdmins.includes(adminEmail)) {
    console.warn(`[Admin License] ACESSO NEGADO: Usuário ${adminEmail} tentou executar ação administrativa sem pertencer a SYSTEM_ADMIN_EMAILS.`);
    throw new Error('Acesso negado. Usuário autenticado não possui privilégios de administrador do sistema.');
  }

  if (decodedToken.email_verified !== true) {
    console.warn(`[Admin License] ACESSO NEGADO: Administrador ${adminEmail} não possui e-mail verificado.`);
    throw new Error('Acesso negado. O e-mail do administrador precisa estar verificado para executar ações no sistema.');
  }

  // 3. Validação dos Parâmetros da Requisição
  if (!rawPayload || typeof rawPayload !== 'object') {
    throw new Error('Payload da requisição inválido ou ausente.');
  }

  const action = rawPayload.action;
  const validActions: AdminLicenseAction[] = ['activate', 'renew', 'block', 'revoke'];
  if (!action || !validActions.includes(action)) {
    throw new Error(`Ação administrativa inválida: "${action}". As ações permitidas são: ${validActions.join(', ')}.`);
  }

  const targetEmail = sanitizeString(rawPayload.email, 120).toLowerCase();
  if (!targetEmail || !targetEmail.includes('@')) {
    throw new Error('O e-mail do cliente de destino é obrigatório e deve ser válido.');
  }

  let planoFinal: AdminLicensePlan | null = null;
  let diasCalculados: number | null = null;

  if (action === 'activate' || action === 'renew') {
    const rawPlano = sanitizeString(rawPayload.plano, 20).toLowerCase() as AdminLicensePlan;
    if (rawPlano !== 'mensal' && rawPlano !== 'anual') {
      throw new Error('Plano inválido. Os únicos planos permitidos são "mensal" (30 dias) ou "anual" (365 dias).');
    }
    planoFinal = rawPlano;
    diasCalculados = PLAN_DURATIONS_DAYS[planoFinal];
  }

  // 4. Localização do Cliente de Destino no Firebase Authentication
  let targetUserRecord;
  try {
    targetUserRecord = await auth.getUserByEmail(targetEmail);
  } catch (err: any) {
    console.warn(`[Admin License] Usuário ${targetEmail} não encontrado no Firebase Auth.`);
    throw new Error(`Usuário com o e-mail "${targetEmail}" não encontrado no sistema de autenticação.`);
  }

  const targetUid = targetUserRecord.uid;

  // 5. Validação de users/{targetUid}
  const userRef = db.collection('users').doc(targetUid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    console.warn(`[Admin License] Documento users/${targetUid} inexistente para o e-mail ${targetEmail}.`);
    throw new Error(`Registro de usuário (users/${targetUid}) não encontrado no banco de dados. Liberação negada.`);
  }

  const userData = userDoc.data()!;
  const empresaId = userData.empresaId;
  if (typeof empresaId !== 'string' || !empresaId.trim()) {
    console.error(`[Admin License] Usuário ${targetEmail} (UID: ${targetUid}) sem empresaId vinculada.`);
    throw new Error('Usuário de destino não possui empresa vinculada no cadastro. Liberação negada.');
  }

  // 6. Validação da Empresa associada empresas/{empresaId}
  const empresaRef = db.collection('empresas').doc(empresaId);
  const empresaDoc = await empresaRef.get();
  if (!empresaDoc.exists) {
    console.error(`[Admin License] Empresa ${empresaId} não encontrada para o usuário ${targetEmail}.`);
    throw new Error(`Empresa de ID "${empresaId}" associada ao usuário não foi encontrada no banco de dados.`);
  }

  // 7. Busca do documento em emailsAutorizados/{targetEmail}
  const emailAuthRef = db.collection('emailsAutorizados').doc(targetEmail);
  const emailAuthDoc = await emailAuthRef.get();
  const existingEmailAuth = emailAuthDoc.exists ? emailAuthDoc.data() : null;

  // 8. Processamento das Ações e Cálculo de accessUntil / Validade
  const now = new Date();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();

  let calculatedValidade: string | null = null;
  let accessUntilTimestamp: Timestamp | null = null;
  let finalStatus = 'pago';
  let message = '';

  const batch = db.batch();
  const licencaAtualRef = db
    .collection('empresas')
    .doc(empresaId)
    .collection('licenca')
    .doc('licencaAtual');

  if (action === 'activate') {
    // 8.1 Regra de Primeira Ativação ('activate'):
    // Usar exclusivamente para primeira ativação paga após Trial.
    // Se já existir histórico de licença paga (válida OU expirada), 'activate' DEVE rejeitar e exigir 'renew'.
    const hasPaidHistory = 
      existingEmailAuth?.status === 'pago' ||
      !!existingEmailAuth?.origemPagamento ||
      existingEmailAuth?.plano === 'mensal' ||
      existingEmailAuth?.plano === 'anual' ||
      existingEmailAuth?.origem === 'pix_manual' ||
      existingEmailAuth?.origem === 'cakto' ||
      userData.statusLicenca === 'pago' ||
      userData.plano === 'mensal' ||
      userData.plano === 'anual' ||
      empresaDoc.data()?.statusLicenca === 'pago' ||
      empresaDoc.data()?.plano === 'mensal' ||
      empresaDoc.data()?.plano === 'anual';

    if (hasPaidHistory) {
      throw new Error(
        'Este cliente já possui histórico de licença paga. A ação "activate" é permitida apenas para a primeira ativação pós-trial. Para renovar ou estender a licença, utilize a ação "renew".'
      );
    }

    finalStatus = 'pago';
    const expDate = new Date(nowMs + diasCalculados! * 24 * 60 * 60 * 1000);
    calculatedValidade = expDate.toISOString();
    accessUntilTimestamp = Timestamp.fromDate(expDate);
    message = `Primeira licença (${planoFinal}) ativada com sucesso para ${targetEmail} por ${diasCalculados} dias (Válida até: ${calculatedValidade}).`;

    // 8.1. emailsAutorizados/{email}
    batch.set(
      emailAuthRef,
      {
        email: targetEmail,
        empresaId: empresaId,
        status: 'pago',
        plano: planoFinal,
        validade: calculatedValidade,
        accessUntil: accessUntilTimestamp,
        ativo: true,
        bloqueado: false,
        trialAtivo: false,
        origemPagamento: 'pix_manual',
        ultimaAtualizacao: nowIso,
      },
      { merge: true }
    );

    // 8.2. users/{uid}
    batch.set(
      userRef,
      {
        statusConta: 'active',
        statusLicenca: 'pago',
        ativo: true,
        trialAtivo: false,
        plano: planoFinal,
        accessUntil: accessUntilTimestamp,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // 8.3. empresas/{empresaId}
    batch.set(
      empresaRef,
      {
        trialAtivo: false,
        statusLicenca: 'pago',
        plano: planoFinal,
        dataExpiracaoLicenca: calculatedValidade,
        accessUntil: accessUntilTimestamp,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // 8.4. empresas/{empresaId}/licenca/licencaAtual
    batch.set(
      licencaAtualRef,
      {
        empresaId: empresaId,
        status: 'pago',
        plano: planoFinal,
        validade: calculatedValidade,
        accessUntil: accessUntilTimestamp,
        trialUtilizado: true,
        origemPagamento: 'pix_manual',
        ultimaAtualizacao: nowIso,
      },
      { merge: true }
    );
  } else if (action === 'renew') {
    finalStatus = 'pago';

    const hasPaidHistory = 
      existingEmailAuth?.status === 'pago' ||
      !!existingEmailAuth?.origemPagamento ||
      existingEmailAuth?.plano === 'mensal' ||
      existingEmailAuth?.plano === 'anual' ||
      existingEmailAuth?.origem === 'pix_manual' ||
      existingEmailAuth?.origem === 'cakto' ||
      userData.statusLicenca === 'pago' ||
      userData.plano === 'mensal' ||
      userData.plano === 'anual' ||
      empresaDoc.data()?.statusLicenca === 'pago' ||
      empresaDoc.data()?.plano === 'mensal' ||
      empresaDoc.data()?.plano === 'anual';

    if (!hasPaidHistory) {
      throw new Error(
        'Este cliente ainda não possui histórico de licença paga. A primeira liberação deve ser feita com a ação "activate".'
      );
    }
    const existingAccessUntilMs = parseAccessUntilMs(
      existingEmailAuth?.accessUntil || userData.accessUntil,
      existingEmailAuth?.validade || userData.dataExpiracaoLicenca
    );

    let baseMs = nowMs;
    if (existingAccessUntilMs && existingAccessUntilMs > nowMs) {
      baseMs = existingAccessUntilMs;
    }

    const newExpDate = new Date(baseMs + diasCalculados! * 24 * 60 * 60 * 1000);
    calculatedValidade = newExpDate.toISOString();
    accessUntilTimestamp = Timestamp.fromDate(newExpDate);
    message = `Licença (${planoFinal}) renovada com sucesso para ${targetEmail} (+${diasCalculados} dias). Nova validade: ${calculatedValidade}.`;

    // 8.1. emailsAutorizados/{email}
    batch.set(
      emailAuthRef,
      {
        email: targetEmail,
        empresaId: empresaId,
        status: 'pago',
        plano: planoFinal,
        validade: calculatedValidade,
        accessUntil: accessUntilTimestamp,
        ativo: true,
        bloqueado: false,
        trialAtivo: false,
        origemPagamento: 'pix_manual',
        ultimaAtualizacao: nowIso,
      },
      { merge: true }
    );

    // 8.2. users/{uid}
    batch.set(
      userRef,
      {
        statusConta: 'active',
        statusLicenca: 'pago',
        ativo: true,
        trialAtivo: false,
        plano: planoFinal,
        accessUntil: accessUntilTimestamp,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // 8.3. empresas/{empresaId}
    batch.set(
      empresaRef,
      {
        trialAtivo: false,
        statusLicenca: 'pago',
        plano: planoFinal,
        dataExpiracaoLicenca: calculatedValidade,
        accessUntil: accessUntilTimestamp,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // 8.4. empresas/{empresaId}/licenca/licencaAtual
    batch.set(
      licencaAtualRef,
      {
        empresaId: empresaId,
        status: 'pago',
        plano: planoFinal,
        validade: calculatedValidade,
        accessUntil: accessUntilTimestamp,
        trialUtilizado: true,
        origemPagamento: 'pix_manual',
        ultimaAtualizacao: nowIso,
      },
      { merge: true }
    );
  } else if (action === 'block') {
    finalStatus = 'blocked';
    message = `Acesso da conta ${targetEmail} bloqueado administrativamente com sucesso.`;
    const revokedTimestamp = Timestamp.fromMillis(0);

    // 8.1. emailsAutorizados/{email}
    batch.set(
      emailAuthRef,
      {
        status: 'blocked',
        bloqueado: true,
        ativo: false,
        accessUntil: revokedTimestamp,
        ultimaAtualizacao: nowIso,
      },
      { merge: true }
    );

    // 8.2. users/{uid}
    batch.set(
      userRef,
      {
        statusConta: 'blocked',
        statusLicenca: 'blocked',
        bloqueado: true,
        ativo: false,
        accessUntil: revokedTimestamp,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // 8.3. empresas/{empresaId}
    batch.set(
      empresaRef,
      {
        bloqueado: true,
        statusLicenca: 'blocked',
        accessUntil: revokedTimestamp,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // 8.4. empresas/{empresaId}/licenca/licencaAtual
    batch.set(
      licencaAtualRef,
      {
        status: 'blocked',
        accessUntil: revokedTimestamp,
        ultimaAtualizacao: nowIso,
      },
      { merge: true }
    );
  } else if (action === 'revoke') {
    finalStatus = 'cancelled';
    message = `Licença de ${targetEmail} revogada/cancelada administrativamente com sucesso.`;
    const revokedTimestamp = Timestamp.fromMillis(0);

    // 8.1. emailsAutorizados/{email}
    batch.set(
      emailAuthRef,
      {
        status: 'cancelled',
        ativo: false,
        accessUntil: revokedTimestamp,
        ultimaAtualizacao: nowIso,
      },
      { merge: true }
    );

    // 8.2. users/{uid}
    batch.set(
      userRef,
      {
        statusConta: 'cancelled',
        statusLicenca: 'cancelled',
        ativo: false,
        accessUntil: revokedTimestamp,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // 8.3. empresas/{empresaId}
    batch.set(
      empresaRef,
      {
        statusLicenca: 'cancelled',
        accessUntil: revokedTimestamp,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // 8.4. empresas/{empresaId}/licenca/licencaAtual
    batch.set(
      licencaAtualRef,
      {
        status: 'cancelled',
        accessUntil: revokedTimestamp,
        ultimaAtualizacao: nowIso,
      },
      { merge: true }
    );
  }

  // 9. Registro de Log de Auditoria em adminAuditLogs
  const auditLogRef = db.collection('adminAuditLogs').doc();
  batch.set(auditLogRef, {
    id: auditLogRef.id,
    adminEmail: adminEmail,
    targetEmail: targetEmail,
    targetUid: targetUid,
    empresaId: empresaId,
    action: action,
    plano: planoFinal,
    validade: calculatedValidade,
    diasCalculados: diasCalculados,
    origem: 'pix_manual',
    timestamp: nowIso,
  });

  // 10. Commit Atômico
  await batch.commit();

  console.log(
    `[Admin Audit] Admin "${adminEmail}" executou "${action}" para o cliente "${targetEmail}" (Tenant: ${empresaId}, Plano: ${planoFinal || 'N/A'}, Validade: ${calculatedValidade || 'N/A'}, AuditID: ${auditLogRef.id}) às ${nowIso}.`
  );

  return {
    success: true,
    action,
    targetEmail,
    empresaId,
    status: finalStatus,
    plano: planoFinal,
    validade: calculatedValidade,
    message,
    auditId: auditLogRef.id,
  };
}
