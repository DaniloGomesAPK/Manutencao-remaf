import { handleAdminLicenseOperation } from '../../server/adminLicenseService';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdmin } from '../../server/firebaseAdmin';
import { applyRateLimit, adminRateLimiter } from '../../server/rateLimiter';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: `Método ${req.method} não permitido. Utilize POST.`,
    });
  }

  // Camada de proteção contra abuso / Rate Limiting (HTTP 429)
  if (!applyRateLimit(req, res, adminRateLimiter)) {
    return;
  }

  const authHeader = req.headers?.authorization || '';
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
    // 1. Validação estrita de autenticação e permissões administrativas no Firebase Admin SDK
    const adminApp = getFirebaseAdmin();
    const auth = getAuth(adminApp);
    const decodedToken = await auth.verifyIdToken(idToken);
    const userEmail = decodedToken.email?.trim().toLowerCase();

    if (!userEmail) {
      return res.status(401).json({
        success: false,
        error: 'O token de autenticação não possui e-mail associado.',
      });
    }

    const systemAdminEnv = process.env.SYSTEM_ADMIN_EMAILS || '';
    const systemAdmins = systemAdminEnv
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (systemAdmins.length === 0) {
      console.error('[Vercel Admin API] CRÍTICO: SYSTEM_ADMIN_EMAILS não configurada. Negando operação (Fail-Closed).');
      return res.status(403).json({
        success: false,
        error: 'Acesso administrativo não configurado no servidor. Operação negada por segurança.',
      });
    }

    if (!systemAdmins.includes(userEmail)) {
      console.warn(`[Vercel Admin API] ACESSO NEGADO (403): Usuário ${userEmail} (${decodedToken.uid}) tentou acessar endpoint administrativo.`);
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Usuário autenticado não possui privilégios de administrador do sistema.',
      });
    }

    if (decodedToken.email_verified !== true) {
      console.warn(`[Vercel Admin API] ACESSO NEGADO (403): Administrador ${userEmail} sem e-mail verificado.`);
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. O e-mail do administrador precisa estar verificado para executar ações no sistema.',
      });
    }

    // 2. Executa a operação administrativa no banco Firestore de forma atômica
    const result = await handleAdminLicenseOperation(idToken, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Vercel Admin License] Erro:', error?.message || error);

    const msg = error?.message || '';
    const isAuthErr =
      msg.includes('Sessão expirada') ||
      msg.includes('token de autenticação') ||
      msg.includes('Token') ||
      msg.includes('não autorizado');
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
}
