import { handleAdminLicenseOperation } from '../../server/adminLicenseService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Método ${req.method} não permitido. Utilize POST.` });
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
    const result = await handleAdminLicenseOperation(idToken, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Vercel Admin License] Erro:', error?.message || error);

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
}
