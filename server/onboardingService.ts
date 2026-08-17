/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from './firebaseAdmin';

export interface TrialOnboardingInput {
  nomeResponsavel?: string;
  nomeEmpresa?: string;
  perfilEmpresa?: string;
  whatsapp?: string;
}

export interface TrialOnboardingResult {
  success: boolean;
  isExisting: boolean;
  empresaId: string;
  trialAtivo: boolean;
  dataExpiracaoTrial: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    whatsapp: string;
    empresaId: string;
    role: string;
    statusConta: string;
    trialAtivo: boolean;
    dataExpiracaoTrial: string;
  };
}

/**
 * Sanitiza strings de entrada para prevenir injeção ou valores excessivos.
 */
function sanitizeString(val: any, maxLength = 150): string {
  if (typeof val !== 'string') return '';
  return val.trim().substring(0, maxLength);
}

/**
 * Operação Server-Authoritative para Onboarding / Ativação / Recuperação de Tenant Trial (7 dias).
 * 
 * Regras Estritas de Segurança:
 * 1. O Firebase ID Token é verificado exclusivamente pelo Firebase Admin SDK via Authorization Bearer.
 * 2. UID e E-mail são extraídos EXCLUSIVAMENTE do token verificado.
 * 3. email_verified DEVE ser estritamente true (sendEmailVerification + reload).
 * 4. Gravações atômicas (WriteBatch) sincronizam:
 *    - users/{uid}
 *    - empresas/{empresaId}
 *    - emailsAutorizados/{userEmail} (com status: "trial", ativo: true, bloqueado: false, trialAtivo: true, trialInicio, trialFim, accessUntil)
 *    - empresas/{empresaId}/company_profile/{empresaId}
 * 5. Recuperação Idempotente:
 *    - Se o usuário já possui histórico ou onboarding incompleto, recupera o estado sem estender os 7 dias e sem criar empresa duplicada.
 *    - Se o Trial já expirou, rejeita com erro administrativo objetivo sem liberar novo período.
 *    - Se a conta ou empresa estiver bloqueada, rejeita.
 *    - Se houver plano pago existente, preserva sem rebaixar para trial.
 */
export async function handleTrialOnboarding(
  idToken: string,
  rawPayload: TrialOnboardingInput = {}
): Promise<TrialOnboardingResult> {
  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    console.error('[ONBOARDING ERROR] etapa: validacao_token, code: TOKEN_MISSING, message: ID Token ausente ou inválido.');
    throw new Error('ID Token ausente ou inválido. Acesso não autorizado.');
  }

  const adminApp = getFirebaseAdmin();
  const auth = getAuth(adminApp);
  const db = getFirestore(adminApp);

  // 1. Verificação server-side do Firebase ID Token
  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(idToken.trim());
  } catch (verifyErr: any) {
    console.error('[ONBOARDING ERROR] etapa: validacao_token, code: TOKEN_INVALID, message: Falha ao verificar token Firebase Admin.');
    throw new Error('Sessão expirada ou token de autenticação inválido.');
  }

  const uid = decodedToken.uid;
  const userEmail = decodedToken.email?.trim().toLowerCase();

  if (!userEmail) {
    console.error('[ONBOARDING ERROR] etapa: validacao_token, code: NO_EMAIL, message: Token sem endereço de e-mail associado.');
    throw new Error('O token de autenticação não possui endereço de e-mail associado.');
  }

  console.log(`[ONBOARDING] token validado (UID: ${uid})`);

  // 2. Validação obrigatória de segurança: e-mail deve estar verificado no Firebase Auth
  if (decodedToken.email_verified !== true) {
    console.warn(`[ONBOARDING ERROR] etapa: validacao_email, code: EMAIL_NOT_VERIFIED, message: E-mail ${userEmail} não confirmado no Firebase Auth.`);
    throw new Error('EMAIL_NAO_VERIFICADO: É necessário confirmar seu endereço de e-mail antes de ativar o período de avaliação.');
  }

  console.log(`[ONBOARDING] email verified: ${userEmail}`);

  // 3. Sanitização de dados cadastrais
  const nomeResponsavelSanitizado = sanitizeString(rawPayload.nomeResponsavel, 120);
  const nomeEmpresaSanitizado = sanitizeString(rawPayload.nomeEmpresa, 120);
  const perfilEmpresaSanitizado = sanitizeString(rawPayload.perfilEmpresa, 60);
  const whatsappSanitizado = sanitizeString(rawPayload.whatsapp, 30);

  const nomeFinal =
    nomeResponsavelSanitizado ||
    decodedToken.name ||
    userEmail.split('@')[0] ||
    'Administrador';

  const nomeEmpresaFinal =
    nomeEmpresaSanitizado ||
    'Minha Empresa';

  const perfilEmpresaFinal =
    perfilEmpresaSanitizado ||
    'mecanica_pesada';

  const whatsappFinal = whatsappSanitizado;

  // 4. Consulta de estado existente no Firestore (users, emailsAutorizados, empresas)
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();

  const emailAuthRef = db.collection('emailsAutorizados').doc(userEmail);
  const emailAuthDoc = await emailAuthRef.get();

  // Determinar empresaId determinístico ou existente
  let empresaId = '';
  if (userDoc.exists && userDoc.data()?.empresaId) {
    empresaId = userDoc.data()!.empresaId;
  } else if (emailAuthDoc.exists && emailAuthDoc.data()?.empresaId) {
    empresaId = emailAuthDoc.data()!.empresaId;
  } else {
    const cleanUid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
    empresaId = `emp_${cleanUid}`;
  }

  const empresaRef = db.collection('empresas').doc(empresaId);
  const empresaDoc = await empresaRef.get();

  // 4.1. Verificação de Bloqueios Administrativos
  const isUserBlocked = userDoc.exists && (
    userDoc.data()?.ativo === false ||
    userDoc.data()?.bloqueado === true ||
    userDoc.data()?.statusConta === 'blocked' ||
    userDoc.data()?.statusConta === 'revoked'
  );

  const isEmailBlocked = emailAuthDoc.exists && (
    emailAuthDoc.data()?.ativo === false ||
    emailAuthDoc.data()?.bloqueado === true ||
    emailAuthDoc.data()?.status === 'blocked' ||
    emailAuthDoc.data()?.status === 'revoked'
  );

  const isEmpresaBlocked = empresaDoc.exists && (
    empresaDoc.data()?.ativo === false ||
    empresaDoc.data()?.bloqueado === true
  );

  if (isUserBlocked || isEmailBlocked || isEmpresaBlocked) {
    console.error(`[ONBOARDING ERROR] etapa: checagem_bloqueio, code: BLOCKED, message: Conta ${userEmail} ou empresa ${empresaId} bloqueada.`);
    throw new Error('Conta de usuário ou empresa bloqueada administrativamente.');
  }

  // 4.2. Proteção contra Tenant Hijacking
  if (empresaDoc.exists && empresaDoc.data()?.ownerUid && empresaDoc.data()!.ownerUid !== uid) {
    console.error(`[ONBOARDING ERROR] etapa: protecao_tenant, code: TENANT_HIJACK, message: Conflito de integridade no tenant ${empresaId} para UID ${uid}`);
    throw new Error('Conflito de integridade de inquilino. Operação negada por segurança.');
  }

  // 4.3. Verificação de Plano Pago Existente (Preservar sem alterar vigência ou rebaixar)
  if (emailAuthDoc.exists && (emailAuthDoc.data()?.status === 'pago' || emailAuthDoc.data()?.status === 'active')) {
    console.log(`[ONBOARDING] histórico encontrado (plano pago ativo para ${userEmail})`);
    const emailData = emailAuthDoc.data()!;
    const paidEmpresaId = emailData.empresaId || empresaId;
    const paidAccessUntil = emailData.accessUntil || emailData.validade || null;
    const nowIso = new Date().toISOString();

    if (!userDoc.exists || !userDoc.data()?.empresaId) {
      const batch = db.batch();
      batch.set(
        userRef,
        {
          id: uid,
          nome: nomeFinal,
          email: userEmail,
          whatsapp: whatsappFinal,
          role: 'admin',
          empresaId: paidEmpresaId,
          statusConta: 'active',
          ativo: true,
          bloqueado: false,
          accessUntil: paidAccessUntil,
          updatedAt: nowIso,
        },
        { merge: true }
      );
      await batch.commit();
      console.log('[ONBOARDING] batch concluído (vínculo de usuário com plano pago existente)');
    }

    return {
      success: true,
      isExisting: true,
      empresaId: paidEmpresaId,
      trialAtivo: false,
      dataExpiracaoTrial: emailData.validade || '',
      usuario: {
        id: uid,
        nome: nomeFinal,
        email: userEmail,
        whatsapp: whatsappFinal,
        empresaId: paidEmpresaId,
        role: 'admin',
        statusConta: 'active',
        trialAtivo: false,
        dataExpiracaoTrial: emailData.validade || '',
      },
    };
  }

  // 4.4. Verificação de Histórico de Trial Existente (Idempotência e Recuperação)
  const userData = userDoc.exists ? userDoc.data() : null;
  const emailData = emailAuthDoc.exists ? emailAuthDoc.data() : null;
  const empData = empresaDoc.exists ? empresaDoc.data() : null;

  const existingExpStr =
    emailData?.trialFim ||
    userData?.dataExpiracaoTrial ||
    empData?.dataExpiracaoTrial ||
    emailData?.dataExpiracaoTrial ||
    emailData?.validade;

  const existingInicioStr =
    emailData?.trialInicio ||
    emailData?.dataCriacao ||
    userData?.dataCadastro ||
    userData?.createdAt ||
    empData?.dataCriacao ||
    empData?.createdAt;

  const existingAccessUntil =
    emailData?.accessUntil ||
    userData?.accessUntil ||
    empData?.accessUntil;

  let existingExpMs: number | null = null;
  if (existingAccessUntil) {
    if (typeof existingAccessUntil.toMillis === 'function') existingExpMs = existingAccessUntil.toMillis();
    else if (typeof existingAccessUntil.toDate === 'function') existingExpMs = existingAccessUntil.toDate().getTime();
    else if (typeof existingAccessUntil.seconds === 'number') existingExpMs = existingAccessUntil.seconds * 1000;
    else if (typeof existingAccessUntil === 'string' || typeof existingAccessUntil === 'number') {
      const d = new Date(existingAccessUntil);
      if (!isNaN(d.getTime())) existingExpMs = d.getTime();
    }
  }

  if (existingExpMs === null && existingExpStr) {
    const d = new Date(existingExpStr);
    if (!isNaN(d.getTime())) existingExpMs = d.getTime();
  }

  if (existingExpMs === null && existingInicioStr) {
    const d = new Date(existingInicioStr);
    if (!isNaN(d.getTime())) existingExpMs = d.getTime() + 7 * 24 * 60 * 60 * 1000;
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // Se já existe registro prévio de Trial para este usuário/e-mail
  if (existingExpMs !== null) {
    // 4.4.1. Trial expirado: NÃO conceder novos dias
    if (existingExpMs < Date.now()) {
      console.warn(`[ONBOARDING ERROR] etapa: validacao_trial, code: TRIAL_EXPIRED, message: Trial expirado para ${userEmail} em ${new Date(existingExpMs).toISOString()}`);
      throw new Error('Período de avaliação já expirado para este usuário. Para continuar utilizando, adquira uma licença.');
    }

    // 4.4.2. Trial ainda ativo: Recuperação Idempotente sem estender vigência
    console.log(`[ONBOARDING] histórico encontrado: recuperando estado do trial existente até ${new Date(existingExpMs).toISOString()} para ${userEmail}`);
    const trialExpiresAtIso = new Date(existingExpMs).toISOString();
    const trialInicioIso = existingInicioStr
      ? new Date(existingInicioStr).toISOString()
      : new Date(existingExpMs - 7 * 24 * 60 * 60 * 1000).toISOString();
    const accessUntilTimestamp = Timestamp.fromDate(new Date(existingExpMs));

    const batch = db.batch();

    // Sincroniza users/{uid}
    batch.set(
      userRef,
      {
        id: uid,
        nome: nomeFinal,
        email: userEmail,
        whatsapp: whatsappFinal || userData?.whatsapp || '',
        role: 'admin',
        empresaId: empresaId,
        perfilEmpresa: perfilEmpresaFinal || userData?.perfilEmpresa || 'mecanica_pesada',
        trialAtivo: true,
        dataExpiracaoTrial: trialExpiresAtIso,
        accessUntil: accessUntilTimestamp,
        ativo: true,
        bloqueado: false,
        statusConta: 'active',
        dataCadastro: trialInicioIso,
        createdAt: trialInicioIso,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // Sincroniza empresas/{empresaId}
    batch.set(
      empresaRef,
      {
        id: empresaId,
        ownerUid: uid,
        nome: nomeEmpresaFinal || empData?.nome || 'Minha Empresa',
        emailContato: userEmail,
        telefone: whatsappFinal || empData?.telefone || '',
        perfilEmpresa: perfilEmpresaFinal || empData?.perfilEmpresa || 'mecanica_pesada',
        trialAtivo: true,
        status: 'trial',
        dataCriacao: trialInicioIso,
        dataExpiracaoTrial: trialExpiresAtIso,
        accessUntil: accessUntilTimestamp,
        limiteUsuarios: 2,
        ativo: true,
        bloqueado: false,
        createdAt: trialInicioIso,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // Sincroniza emailsAutorizados/{userEmail} com todos os campos exigidos pelo LicenseService
    batch.set(
      emailAuthRef,
      {
        email: userEmail,
        role: 'admin',
        empresaId: empresaId,
        status: 'trial',
        plano: 'Trial 7 Dias',
        ativo: true,
        bloqueado: false,
        trialAtivo: true,
        trialInicio: trialInicioIso,
        trialFim: trialExpiresAtIso,
        validade: trialExpiresAtIso,
        dataCriacao: trialInicioIso,
        dataExpiracaoTrial: trialExpiresAtIso,
        accessUntil: accessUntilTimestamp,
        createdAt: trialInicioIso,
        updatedAt: nowIso,
        ultimaAtualizacao: nowIso,
      },
      { merge: true }
    );

    // Sincroniza company_profile/{empresaId}
    const companyProfileRef = db
      .collection('empresas')
      .doc(empresaId)
      .collection('company_profile')
      .doc(empresaId);

    batch.set(
      companyProfileRef,
      {
        id: empresaId,
        empresaId: empresaId,
        nomeFantasia: nomeEmpresaFinal || empData?.nome || 'Minha Empresa',
        razaoSocial: nomeEmpresaFinal || empData?.nome || 'Minha Empresa',
        nomeEmpresa: nomeEmpresaFinal || empData?.nome || 'Minha Empresa',
        perfilEmpresa: perfilEmpresaFinal || 'mecanica_pesada',
        nomeResponsavel: nomeFinal,
        whatsapp: whatsappFinal,
        telefone: whatsappFinal,
        email: userEmail,
        trialAtivo: true,
        dataExpiracaoTrial: trialExpiresAtIso,
        accessUntil: accessUntilTimestamp,
        createdAt: trialInicioIso,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    await batch.commit();
    console.log('[ONBOARDING] batch concluído');

    return {
      success: true,
      isExisting: true,
      empresaId,
      trialAtivo: true,
      dataExpiracaoTrial: trialExpiresAtIso,
      usuario: {
        id: uid,
        nome: nomeFinal,
        email: userEmail,
        whatsapp: whatsappFinal,
        empresaId: empresaId,
        role: 'admin',
        statusConta: 'active',
        trialAtivo: true,
        dataExpiracaoTrial: trialExpiresAtIso,
      },
    };
  }

  // 5. Novo Trial Legítimo (Exatamente 7 dias a partir do momento atual no servidor)
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiresAtIso = expiresAt.toISOString();
  const accessUntilTimestamp = Timestamp.fromDate(expiresAt);

  const batch = db.batch();

  // 5.1. users/{uid}
  batch.set(
    userRef,
    {
      id: uid,
      nome: nomeFinal,
      email: userEmail,
      whatsapp: whatsappFinal,
      role: 'admin',
      empresaId: empresaId,
      perfilEmpresa: perfilEmpresaFinal,
      trialAtivo: true,
      dataExpiracaoTrial: expiresAtIso,
      accessUntil: accessUntilTimestamp,
      ativo: true,
      bloqueado: false,
      statusConta: 'active',
      dataCadastro: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  // 5.2. empresas/{empresaId}
  batch.set(
    empresaRef,
    {
      id: empresaId,
      ownerUid: uid,
      nome: nomeEmpresaFinal,
      emailContato: userEmail,
      telefone: whatsappFinal,
      perfilEmpresa: perfilEmpresaFinal,
      trialAtivo: true,
      status: 'trial',
      dataCriacao: nowIso,
      dataExpiracaoTrial: expiresAtIso,
      accessUntil: accessUntilTimestamp,
      limiteUsuarios: 2,
      ativo: true,
      bloqueado: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  // 5.3. emailsAutorizados/{userEmail} (Status "trial" obrigatório e coerente com LicenseService)
  batch.set(
    emailAuthRef,
    {
      email: userEmail,
      role: 'admin',
      empresaId: empresaId,
      status: 'trial',
      plano: 'Trial 7 Dias',
      ativo: true,
      bloqueado: false,
      trialAtivo: true,
      trialInicio: nowIso,
      trialFim: expiresAtIso,
      validade: expiresAtIso,
      dataCriacao: nowIso,
      dataExpiracaoTrial: expiresAtIso,
      accessUntil: accessUntilTimestamp,
      createdAt: nowIso,
      updatedAt: nowIso,
      ultimaAtualizacao: nowIso,
    },
    { merge: true }
  );

  // 5.4. company_profile/{empresaId}
  const companyProfileRef = db
    .collection('empresas')
    .doc(empresaId)
    .collection('company_profile')
    .doc(empresaId);

  batch.set(
    companyProfileRef,
    {
      id: empresaId,
      empresaId: empresaId,
      nomeFantasia: nomeEmpresaFinal,
      razaoSocial: nomeEmpresaFinal,
      nomeEmpresa: nomeEmpresaFinal,
      perfilEmpresa: perfilEmpresaFinal,
      nomeResponsavel: nomeFinal,
      whatsapp: whatsappFinal,
      telefone: whatsappFinal,
      email: userEmail,
      trialAtivo: true,
      dataExpiracaoTrial: expiresAtIso,
      accessUntil: accessUntilTimestamp,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  await batch.commit();
  console.log('[ONBOARDING] batch concluído');

  return {
    success: true,
    isExisting: false,
    empresaId,
    trialAtivo: true,
    dataExpiracaoTrial: expiresAtIso,
    usuario: {
      id: uid,
      nome: nomeFinal,
      email: userEmail,
      whatsapp: whatsappFinal,
      empresaId: empresaId,
      role: 'admin',
      statusConta: 'active',
      trialAtivo: true,
      dataExpiracaoTrial: expiresAtIso,
    },
  };
}
