import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth, UserRecord } from 'firebase-admin/auth';

// Inicializa o Firebase Admin SDK se ainda não estiver inicializado
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

// Secret de validação para segurança
const CAKTO_WEBHOOK_SECRET = process.env.CAKTO_WEBHOOK_SECRET || 'SUA_CHAVE_SECRETA_CAKTO';

/**
 * Interface padronizada do Payload enviado pela Cakto
 */
export interface CaktoWebhookPayload {
  event?: string;
  status?: string;
  id?: string;
  transaction_id?: string;
  customer?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  data?: {
    event?: string;
    status?: string;
    customer?: {
      email?: string;
    };
    subscription?: {
      id?: string;
      status?: string;
    };
    plan?: {
      name?: string;
      id?: string;
    };
  };
}

/**
 * Cloud Function HTTP v2 para processamento de Webhooks da Cakto
 * Endpoint: https://<region>-<project-id>.cloudfunctions.net/caktoWebhook
 */
export const caktoWebhook = onRequest({ cors: true }, async (req, res) => {
  // Apenas aceita método POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
    return;
  }

  try {
    // 1. Validação do Secret Token no Header ou Query Parameter
    const tokenHeader = (req.headers['x-cakto-secret'] || req.headers['x-webhook-secret'] || req.query.secret) as string;
    if (CAKTO_WEBHOOK_SECRET && CAKTO_WEBHOOK_SECRET !== 'SUA_CHAVE_SECRETA_CAKTO' && tokenHeader !== CAKTO_WEBHOOK_SECRET) {
      console.warn('⚠️ Tentativa de requisição não autorizada no Webhook Cakto.');
      res.status(401).json({ error: 'Acesso não autorizado: Token secreto inválido.' });
      return;
    }

    const payload: CaktoWebhookPayload = req.body || {};
    
    // Extrai evento e email tratando variações comuns da estrutura Cakto
    const eventoType = (payload.event || payload.status || payload.data?.event || payload.data?.status || '').toLowerCase();
    const customerEmail = (payload.customer?.email || payload.data?.customer?.email || '').trim().toLowerCase();
    const eventId = payload.id || payload.transaction_id || `evt_${Date.now()}`;

    console.log(`📥 Webhook Cakto Recebido | Evento: [${eventoType}] | Email: [${customerEmail}] | EventId: [${eventId}]`);

    if (!customerEmail) {
      console.error('❌ E-mail do cliente não fornecido no payload da Cakto.');
      res.status(400).json({ error: 'Payload inválido: E-mail do cliente é obrigatório.' });
      return;
    }

    // 2. Trava de Idempotência em /webhook_logs/{eventId}
    const eventRef = db.collection('webhook_logs').doc(eventId);
    const eventDoc = await eventRef.get();
    if (eventDoc.exists) {
      console.log(`ℹ️ Evento [${eventId}] já processado anteriormente.`);
      res.status(200).json({ message: 'Evento já processado (Idempotente).' });
      return;
    }

    // 3. Localiza o Usuário no Firebase Auth pelo E-mail
    let userRecord: UserRecord;
    try {
      userRecord = await auth.getUserByEmail(customerEmail);
    } catch (err: any) {
      console.error(`❌ Usuário não encontrado no Firebase Auth para o e-mail: ${customerEmail}`);
      
      await eventRef.set({
        processedAt: FieldValue.serverTimestamp(),
        email: customerEmail,
        evento: eventoType,
        status: 'USER_NOT_FOUND',
        error: err.message || 'Usuário não cadastrado'
      });

      res.status(404).json({ error: `Usuário com e-mail ${customerEmail} não encontrado no sistema.` });
      return;
    }

    const uid = userRecord.uid;
    const planoNome = payload.data?.plan?.name || 'pro';

    // 4. Mapeamento de Eventos da Cakto
    const eventosAprovados = [
      'compra_aprovada',
      'purchase_approved',
      'payment_approved',
      'subscription_active',
      'paid',
      'active',
      'approved',
      'assinatura_renovada'
    ];

    const eventosCancelados = [
      'subscription_canceled',
      'assinatura_cancelada',
      'refunded',
      'reembolsado',
      'chargeback',
      'expired',
      'expirado',
      'payment_failed',
      'canceled',
      'bloqueado'
    ];

    let novoStatus: 'active' | 'blocked' | 'expired' | null = null;

    if (eventosAprovados.some(ev => eventoType.includes(ev))) {
      novoStatus = 'active';
    } else if (eventosCancelados.some(ev => eventoType.includes(ev))) {
      novoStatus = 'blocked';
    }

    if (!novoStatus) {
      console.log(`⚠️ Evento de status [${eventoType}] não exigiu alteração de licença.`);
      res.status(200).json({ message: 'Evento recebido, porém sem alteração necessária.' });
      return;
    }

    // 5. Batch de Atualização Atômica no Firestore
    const batch = db.batch();

    // A. Perfil do Usuário em /users/{uid}
    const userRef = db.collection('users').doc(uid);
    batch.set(userRef, {
      statusConta: novoStatus,
      statusLicenca: novoStatus,
      plano: planoNome,
      ultimaAtualizacaoPagamento: FieldValue.serverTimestamp()
    }, { merge: true });

    // B. Licença da Empresa em /empresas/{uid}/licenca/licencaAtual
    const licencaRef = db.collection('empresas').doc(uid).collection('licenca').doc('licencaAtual');
    batch.set(licencaRef, {
      empresaId: uid,
      status: novoStatus,
      plano: planoNome,
      trialUtilizado: true,
      ultimaAtualizacao: FieldValue.serverTimestamp(),
      origemPagamento: 'cakto_webhook'
    }, { merge: true });

    // C. Log de Auditoria
    batch.set(eventRef, {
      processedAt: FieldValue.serverTimestamp(),
      uid: uid,
      email: customerEmail,
      evento: eventoType,
      statusAplicado: novoStatus,
      payload: payload
    });

    await batch.commit();

    // 6. Atualização dos Custom Claims no Firebase Auth para Validação O(1) nas Security Rules
    await auth.setCustomUserClaims(uid, {
      statusConta: novoStatus,
      status: novoStatus,
      plano: planoNome,
      updatedAt: Date.now()
    });

    console.log(`✅ Licença e Custom Claims atualizados com sucesso para [${novoStatus}] (UID: ${uid})`);

    res.status(200).json({
      success: true,
      uid: uid,
      email: customerEmail,
      status: novoStatus,
      message: `Licença atualizada para '${novoStatus}' com sucesso.`
    });

  } catch (error: any) {
    console.error('❌ Erro interno ao processar Webhook da Cakto:', error);
    res.status(500).json({
      error: 'Erro interno no servidor ao processar o webhook.',
      details: error.message
    });
  }
});
