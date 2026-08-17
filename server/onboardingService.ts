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
 * Operação Server-Authoritative para Onboarding de novo Tenant Trial (Etapa 01B).
 * 
 * Regras Estritas de Segurança:
 * 1. O Firebase ID Token é verificado exclusivamente pelo Firebase Admin SDK via Authorization Bearer.
 * 2. UID e E-mail são extraídos EXCLUSIVAMENTE do token verificado.
 * 3. Qualquer empresaId, role, trialAtivo, dataExpiracaoTrial ou limiteUsuarios enviado pelo cliente é 100% ignorado.
 * 4. Usuário existente (mesmo UID com onboarding comprovado):
 *    - Exige diretamente de users/{uid}: statusConta, trialAtivo, dataExpiracaoTrial, role, empresaId.
 *    - Se qualquer campo estiver ausente ou inválido, retorna erro administrativo (sem fallbacks).
 *    - Se o trial existente já expirou, rejeita com erro sem conceder novo período.
 * 5. E-mail com histórico existente em emailsAutorizados/{email}:
 *    - Se o documento já existir e o UID atual não for o usuário vinculado comprovado, rejeita a criação de novo Trial.
 *    - Impede que um e-mail ganhe novos 7 dias apenas recriando credenciais Auth com novo UID.
 * 6. Proteção contra Tenant Hijacking e Empresa sem ownerUid:
 *    - Se a empresa existir e ownerUid === uid -> permite retry/idempotência.
 *    - Se a empresa existir e ownerUid !== uid -> rejeita com erro de segurança.
 *    - Se a empresa existir sem ownerUid -> só aceita se users/{uid}.empresaId == empresaId; caso contrário rejeita.
 * 7. Novo Tenant Legítimo:
 *    - Gera empresaId deterministicamente a partir do UID completo do usuário (emp_${cleanUid}).
 *    - Define exatamente 7 dias de avaliação no relógio do servidor.
 *    - Gravação atômica via WriteBatch em users, empresas, emailsAutorizados e company_profile.
 */
export async function handleTrialOnboarding(
  idToken: string,
  rawPayload: TrialOnboardingInput = {}
): Promise<TrialOnboardingResult> {
  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
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
    console.error('[Onboarding] Falha na validação do ID Token:', verifyErr?.message || verifyErr);
    throw new Error('Sessão expirada ou token de autenticação inválido.');
  }

  const uid = decodedToken.uid;
  const userEmail = decodedToken.email?.trim().toLowerCase();

  if (!userEmail) {
    throw new Error('O token de autenticação não possui endereço de e-mail associado.');
  }

  // Validação obrigatória de segurança: e-mail deve estar verificado no Firebase Auth
  if (decodedToken.email_verified !== true) {
    console.warn(`[Onboarding] Bloqueio 403: E-mail não verificado para UID ${uid} (${userEmail}).`);
    throw new Error('EMAIL_NAO_VERIFICADO: É necessário confirmar seu endereço de e-mail antes de ativar o período de avaliação.');
  }

  // 2. Sanitização estrita de dados cadastrais não privilegiados
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

  // 3. Verificação de Usuário Existente em users/{uid} (Idempotência / Retry do mesmo UID)
  // Se users/{uid} já existir, NUNCA deve continuar para o fluxo de novo tenant.
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    const existingUserData = userDoc.data()!;

    // 3.1. Bloqueio administrativo existente
    if (
      existingUserData.ativo === false ||
      existingUserData.bloqueado === true ||
      existingUserData.statusConta === 'blocked' ||
      existingUserData.statusConta === 'revoked'
    ) {
      console.warn(`[Onboarding] Bloqueio: UID ${uid} com status inativo/bloqueado.`);
      throw new Error('Conta de usuário bloqueada ou revogada administrativamente.');
    }

    const existingEmpresaId = existingUserData.empresaId;
    const existingRole = existingUserData.role;
    const existingStatus = existingUserData.statusConta;
    const existingTrialAtivo = existingUserData.trialAtivo;
    const existingExpDate = existingUserData.dataExpiracaoTrial;

    // Validação estrita direta de users/{uid} sem fallbacks, derivações ou valores inventados
    // users/{uid} existente sem empresaId ou com qualquer campo ausente/inválido -> ERRO administrativo imediato
    if (
      typeof existingEmpresaId !== 'string' ||
      !existingEmpresaId.trim() ||
      typeof existingRole !== 'string' ||
      !existingRole.trim() ||
      typeof existingStatus !== 'string' ||
      !existingStatus.trim() ||
      typeof existingTrialAtivo !== 'boolean' ||
      typeof existingExpDate !== 'string' ||
      !existingExpDate.trim()
    ) {
      console.error(`[Onboarding] Inconsistência administrativa em users/${uid}: Campos administrativos incompletos ou ausentes.`);
      throw new Error('Inconsistência administrativa no cadastro do usuário existente. Contate o suporte.');
    }

    // Validação de conversão de dataExpiracaoTrial para uma data válida
    const expMs = new Date(existingExpDate).getTime();
    if (isNaN(expMs)) {
      console.error(`[Onboarding] Inconsistência administrativa em users/${uid}: dataExpiracaoTrial inválida (${existingExpDate}).`);
      throw new Error('Inconsistência administrativa no cadastro do usuário existente: data de expiração inválida. Contate o suporte.');
    }

    // Verificação de Trial expirado no documento do usuário existente
    if (expMs < Date.now()) {
      console.warn(`[Onboarding] Bloqueio: UID ${uid} com Trial expirado (${existingExpDate}).`);
      throw new Error('Período de avaliação já expirado para este usuário. Para continuar utilizando, adquira uma licença.');
    }

    // Busca dados da empresa existente
    const existingEmpresaDoc = await db.collection('empresas').doc(existingEmpresaId).get();
    if (existingEmpresaDoc.exists && existingEmpresaDoc.data()?.bloqueado === true) {
      throw new Error('Empresa bloqueada administrativamente.');
    }

    return {
      success: true,
      isExisting: true,
      empresaId: existingEmpresaId,
      trialAtivo: existingTrialAtivo,
      dataExpiracaoTrial: existingExpDate,
      usuario: {
        id: uid,
        nome: existingUserData.nome || nomeFinal,
        email: userEmail,
        whatsapp: existingUserData.whatsapp || whatsappFinal,
        empresaId: existingEmpresaId,
        role: existingRole,
        statusConta: existingStatus,
        trialAtivo: existingTrialAtivo,
        dataExpiracaoTrial: existingExpDate,
      },
    };
  }

  // 4. Verificação de Histórico e Bloqueios em emailsAutorizados/{userEmail}
  // Se o e-mail já existe na base e o UID atual ainda não possui vínculo comprovado acima,
  // BLOQUEIA a criação de novo Trial (não concede novos 7 dias para o mesmo e-mail com outro UID)
  const emailAuthRef = db.collection('emailsAutorizados').doc(userEmail);
  const emailAuthDoc = await emailAuthRef.get();

  if (emailAuthDoc.exists) {
    const emailData = emailAuthDoc.data()!;
    if (
      emailData.ativo === false ||
      emailData.bloqueado === true ||
      emailData.status === 'blocked' ||
      emailData.status === 'revoked'
    ) {
      console.warn(`[Onboarding] Bloqueio: e-mail ${userEmail} marcado como bloqueado/revogado.`);
      throw new Error('Acesso bloqueado ou revogado administrativamente. Entre em contato com o suporte.');
    }

    // Se o documento existe e o UID atual não possui vínculo pré-estabelecido com este tenant/e-mail
    console.warn(`[Onboarding] Bloqueio: e-mail ${userEmail} já possui histórico em emailsAutorizados sem vínculo prévio com UID ${uid}.`);
    throw new Error('Este e-mail já possui histórico de cadastro ou avaliação no sistema. Contate o suporte para recuperar seu acesso.');
  }

  // 5. Geração determinística de empresaId baseada no UID completo (sem truncamento)
  const cleanUid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const empresaId = `emp_${cleanUid}`;

  // 6. Verificação de Empresa Existente e Proteção contra Tenant Hijacking
  const empresaRef = db.collection('empresas').doc(empresaId);
  const empresaDoc = await empresaRef.get();

  if (empresaDoc.exists) {
    const empData = empresaDoc.data()!;
    if (empData.bloqueado === true) {
      throw new Error('Empresa bloqueada administrativamente.');
    }

    if (empData.ownerUid && empData.ownerUid !== uid) {
      console.error(`[SECURITY ALERT] Tentativa de colisão ou hijacking no tenant ${empresaId} pelo UID ${uid}.`);
      throw new Error('Conflito de integridade de inquilino. Operação negada por segurança.');
    }

    if (!empData.ownerUid) {
      // Empresa legada sem ownerUid: só aceita se houver prova server-side confiável
      const isUserLinked = userDoc.exists && userDoc.data()?.empresaId === empresaId;
      if (!isUserLinked) {
        console.error(`[SECURITY ALERT] Empresa existente ${empresaId} sem ownerUid e sem vínculo comprovado com UID ${uid}.`);
        throw new Error('Empresa existente sem comprovação de propriedade. Contate o suporte.');
      }
    }

    // Se a empresa já existir, verifica se o trial dela já expirou
    if (empData.dataExpiracaoTrial) {
      const expMs = new Date(empData.dataExpiracaoTrial).getTime();
      if (!isNaN(expMs) && expMs < Date.now()) {
        console.warn(`[Onboarding] Bloqueio: Empresa ${empresaId} com Trial já expirado (${empData.dataExpiracaoTrial}).`);
        throw new Error('Período de avaliação já expirado para esta empresa. Para continuar utilizando, adquira uma licença.');
      }
    }
  }

  // 7. Cálculo server-side do período de Trial (exatamente 7 dias no relógio do servidor)
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiresAtIso = expiresAt.toISOString();
  const accessUntilTimestamp = Timestamp.fromDate(expiresAt);

  // 8. Preparação do WriteBatch Atômico
  const batch = db.batch();

  // 8.1. Documento em users/{uid}
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
      statusConta: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  // 8.2. Documento em empresas/{empresaId}
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
      dataCriacao: nowIso,
      dataExpiracaoTrial: expiresAtIso,
      accessUntil: accessUntilTimestamp,
      limiteUsuarios: 2,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  // 8.3. Documento em emailsAutorizados/{email}
  batch.set(emailAuthRef, {
    email: userEmail,
    role: 'admin',
    empresaId: empresaId,
    ativo: true,
    trialAtivo: true,
    dataCriacao: nowIso,
    dataExpiracaoTrial: expiresAtIso,
    accessUntil: accessUntilTimestamp,
    updatedAt: nowIso,
  });

  // 8.4. Documento multi-tenant em empresas/{empresaId}/company_profile/{empresaId}
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

  // 9. Commit Atômico
  await batch.commit();

  console.log(`[Onboarding] Novo tenant ${empresaId} criado com sucesso para ${userEmail} (UID: ${uid}).`);

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
