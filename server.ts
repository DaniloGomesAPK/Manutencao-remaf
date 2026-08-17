import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from './server/firebaseAdmin';
import { handleTrialOnboarding } from './server/onboardingService';
import { handleAdminLicenseOperation } from './server/adminLicenseService';
import { handleCaktoWebhook } from './server/caktoWebhookService';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Rota de Healthcheck
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // NOVO ENDPOINT DE ONBOARDING TRIAL SERVER-AUTHORITATIVE (ETAPA 01B)
  app.post('/api/onboarding/trial', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Cabeçalho de autorização ausente ou inválido. Bearer <Firebase ID Token> é obrigatório.',
      });
    }

    const idToken = authHeader.substring(7).trim();
    if (!idToken) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação não fornecido no cabeçalho Bearer.',
      });
    }

    try {
      const result = await handleTrialOnboarding(idToken, req.body);
      return res.json(result);
    } catch (error: any) {
      console.error('[API Onboarding Trial] Erro:', error.message || error);
      const isAuthErr =
        error.message?.includes('não autorizado') ||
        error.message?.includes('Token') ||
        error.message?.includes('expirada') ||
        error.message?.includes('autenticação');
      const isForbidden =
        error.message?.includes('EMAIL_NAO_VERIFICADO') ||
        error.message?.includes('não verificado') ||
        error.message?.includes('negada') ||
        error.message?.includes('integridade') ||
        error.message?.includes('Conflito') ||
        error.message?.includes('bloqueada') ||
        error.message?.includes('bloqueado') ||
        error.message?.includes('revogado') ||
        error.message?.includes('utilizado');
      const status = isAuthErr ? 401 : isForbidden ? 403 : 400;

      return res.status(status).json({
        success: false,
        error: error.message || 'Falha ao processar o cadastro de avaliação.',
      });
    }
  });

  // NOVO ENDPOINT DE GESTÃO MANUAL DE LICENÇA (PIX / SUPORTE)
  app.post('/api/admin/license', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Cabeçalho de autorização ausente ou inválido. Bearer <Firebase ID Token> é obrigatório.',
      });
    }

    const idToken = authHeader.substring(7).trim();
    if (!idToken) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação não fornecido no cabeçalho Bearer.',
      });
    }

    try {
      const result = await handleAdminLicenseOperation(idToken, req.body);
      return res.json(result);
    } catch (error: any) {
      console.error('[API Admin License] Erro:', error?.message || error);
      const msg = error?.message || '';
      const isAuthErr =
        msg.includes('Sessão expirada') ||
        msg.includes('token de autenticação') ||
        msg.includes('Token');
      const isForbidden =
        msg.includes('negado') ||
        msg.includes('negada') ||
        msg.includes('não possui privilégios') ||
        msg.includes('não configurado');
      const isNotFound =
        msg.includes('não encontrado') ||
        msg.includes('inexistente');

      const status = isAuthErr ? 401 : isForbidden ? 403 : isNotFound ? 404 : 400;

      return res.status(status).json({
        success: false,
        error: msg || 'Falha ao processar operação administrativa de licença.',
      });
    }
  });

  // ENDPOINT DE WEBHOOK CAKTO (PAGAMENTOS / ASSINATURAS)
  // Desativado por padrão via CAKTO_WEBHOOK_ENABLED=false
  // Validação estrita por header (req.query.secret é rejeitado)
  app.post(['/api/webhooks/cakto', '/api/webhook/cakto'], async (req, res) => {
    try {
      const result = await handleCaktoWebhook(req.headers, req.body);
      return res.status(result.statusCode).json(result.body);
    } catch (error: any) {
      console.error('[API Cakto Webhook] Erro não tratado:', error?.message || error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao processar notificação da Cakto.',
      });
    }
  });

  // Rota de Verificação de Identidade do ID Token do Firebase (Apenas leitura/verificação sem criação de dados)
  app.post('/api/auth/verify', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    let idToken = '';
    if (authHeader.startsWith('Bearer ')) {
      idToken = authHeader.substring(7).trim();
    } else if (req.body && typeof req.body.idToken === 'string') {
      idToken = req.body.idToken.trim();
    }

    if (!idToken) {
      return res.status(400).json({ error: 'idToken é obrigatório.' });
    }

    try {
      const adminApp = getFirebaseAdmin();
      const auth = getAuth(adminApp);
      const decodedToken = await auth.verifyIdToken(idToken);
      const email = decodedToken.email?.trim().toLowerCase();

      if (!email) {
        return res.status(400).json({ error: 'O token verificado não possui e-mail associado.' });
      }

      const db = getFirestore(adminApp);
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.exists ? userDoc.data() : null;

      return res.json({
        success: true,
        uid: decodedToken.uid,
        email,
        name: decodedToken.name || userData?.nome || email.split('@')[0],
        empresaId: userData?.empresaId || '',
        statusConta: userData?.statusConta || 'pending',
      });
    } catch (error: any) {
      console.error('Erro na verificação server-side do ID Token:', error);
      return res.status(401).json({
        success: false,
        error: error.message || 'Token inválido ou expirado.',
      });
    }
  });

  // Configuração do Vite Middleware (Desenvolvimento) ou Servidor Estático (Produção)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT} (http://0.0.0.0:${PORT})`);
  });
}

startServer().catch((err) => {
  console.error('Falha crítica ao iniciar o servidor Express:', err);
});
