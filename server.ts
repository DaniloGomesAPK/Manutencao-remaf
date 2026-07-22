import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdmin, hashEmail } from './server/firebaseAdmin';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Rota de Healthcheck
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Rota administrativa para conceder ou alterar o acesso de um e-mail manualmente (server-side)
  app.post('/api/admin/grant-access', async (req, res) => {
    const { email, plan, status, expiresAt } = req.body;
    
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
    const expectedKey = process.env.ADMIN_SECRET_KEY || 'ChaveMestraRemaf123!';

    if (adminKey !== expectedKey) {
      return res.status(403).json({ error: 'Chave de administração inválida ou ausente.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'O parâmetro email é obrigatório.' });
    }

    try {
      const adminApp = getFirebaseAdmin();
      const db = getFirestore(adminApp);
      const emailHash = hashEmail(email);

      const grantData = {
        email: email.trim().toLowerCase(),
        status: status || 'active',
        plan: plan || 'premium',
        expiresAt: expiresAt || null, // ISO String (ex: "2026-12-31T23:59:59.000Z") ou null
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection('accessGrants').doc(emailHash).set(grantData, { merge: true });

      return res.json({
        success: true,
        message: `Acesso configurado com sucesso para o e-mail: ${email}`,
        hash: emailHash,
        data: grantData,
      });
    } catch (error: any) {
      console.error('Erro na rota administrativa /api/admin/grant-access:', error);
      return res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
    }
  });

  // Rota de Auditoria/Verificação server-side do ID Token do Firebase
  app.post('/api/auth/verify', async (req, res) => {
    const { idToken, nome } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'idToken é obrigatório.' });
    }

    try {
      const adminApp = getFirebaseAdmin();
      const auth = getAuth(adminApp);
      const decodedToken = await auth.verifyIdToken(idToken);
      const email = decodedToken.email;

      if (!email) {
        return res.status(400).json({ error: 'O token verificado não possui e-mail associado.' });
      }

      const db = getFirestore(adminApp);
      const emailHash = hashEmail(email);

      // Consulta a autorização pelo e-mail normalizado
      const grantRef = db.collection('accessGrants').doc(emailHash);
      const grantDoc = await grantRef.get();

      let status = 'pending';
      let plan = 'free';
      let expiresAt: string | null = null;

      if (grantDoc.exists) {
        const data = grantDoc.data()!;
        status = data.status || 'pending';
        plan = data.plan || 'free';
        expiresAt = data.expiresAt || null;

        // Se estiver ativo mas possuir data de expiração, valida se expirou
        if (status === 'active' && expiresAt) {
          const expDate = new Date(expiresAt);
          if (expDate.getTime() < Date.now()) {
            status = 'expired';
            await grantRef.update({
              status: 'expired',
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } else {
        // Cria registro de intenção/solicitação de acesso "pending" para auditoria manual
        const timestamp = new Date().toISOString();
        const pendingGrant = {
          email: email.trim().toLowerCase(),
          status: 'pending',
          plan: 'free',
          expiresAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        await grantRef.set(pendingGrant);
      }

      // Se o status da autorização não for ativo, impede o login com mensagem apropriada
      if (status !== 'active') {
        let statusMsg = 'Acesso pendente de liberação.';
        if (status === 'blocked') statusMsg = 'Esta conta foi bloqueada de acessar a plataforma.';
        if (status === 'expired') statusMsg = 'Sua assinatura ou licença de acesso expirou.';

        return res.status(403).json({
          success: false,
          error: statusMsg,
          statusConta: status,
        });
      }

      // Busca ou cria o documento correspondente em users/{uid}
      const userRef = db.collection('users').doc(decodedToken.uid);
      const userDoc = await userRef.get();

      let empresaId = '';
      let dataCadastro = new Date().toISOString();

      if (userDoc.exists) {
        const uData = userDoc.data()!;
        empresaId = uData.empresaId;
        dataCadastro = uData.dataCadastro || dataCadastro;
      }

      // Se não houver empresaId mapeada, gera um identificador único de tenant
      if (!empresaId) {
        empresaId = `emp_${Math.random().toString(36).substring(2, 11)}`;
      }

      const finalNome = nome || decodedToken.name || userDoc.data()?.nome || email.split('@')[0];

      const userData = {
        id: decodedToken.uid,
        nome: finalNome,
        email: email.trim().toLowerCase(),
        empresaId,
        statusConta: status, // active
        dataCadastro,
        ultimoAcesso: new Date().toISOString(),
      };

      // Grava no Firestore
      await userRef.set(userData, { merge: true });

      return res.json({
        success: true,
        uid: decodedToken.uid,
        email: email.trim().toLowerCase(),
        name: finalNome,
        empresaId,
        statusConta: status,
        dataCadastro,
        ultimoAcesso: userData.ultimoAcesso,
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
