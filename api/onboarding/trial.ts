import type { IncomingMessage, ServerResponse } from 'http';
import { handleTrialOnboarding } from '../../server/onboardingService';

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
    const result = await handleTrialOnboarding(idToken, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Vercel Onboarding] Erro:', error.message || error);
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
      error.message?.includes('expirado') ||
      error.message?.includes('utilizado');
    const status = isAuthErr ? 401 : isForbidden ? 403 : 400;

    return res.status(status).json({
      success: false,
      error: error.message || 'Falha ao processar cadastro de avaliação.',
    });
  }
}
