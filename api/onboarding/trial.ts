/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: `Método ${req.method} não permitido. Utilize POST.`,
    });
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
    console.log('[TRIAL API] handler iniciado');

    const { handleTrialOnboarding } = await import('../../server/onboardingService');

    console.log('[TRIAL API] onboardingService carregado');

    const result = await handleTrialOnboarding(idToken, req.body);

    console.log('[TRIAL API] onboarding concluído com sucesso');
    return res.status(200).json(result);
  } catch (error: any) {
    const errorMsg = error?.message || '';

    const isAuthErr =
      errorMsg.includes('não autorizado') ||
      errorMsg.includes('Token') ||
      errorMsg.includes('expirada') ||
      errorMsg.includes('autenticação');

    const isForbidden =
      errorMsg.includes('EMAIL_NAO_VERIFICADO') ||
      errorMsg.includes('não verificado') ||
      errorMsg.includes('negada') ||
      errorMsg.includes('integridade') ||
      errorMsg.includes('Conflito') ||
      errorMsg.includes('bloqueada') ||
      errorMsg.includes('bloqueado') ||
      errorMsg.includes('revogado') ||
      errorMsg.includes('expirado') ||
      errorMsg.includes('utilizado');

    if (isAuthErr || isForbidden) {
      console.warn('[TRIAL API REJEIÇÃO CONTROLADA]', {
        name: error?.name,
        code: error?.code,
        message: errorMsg,
      });

      const status = isAuthErr ? 401 : 403;
      return res.status(status).json({
        success: false,
        error: errorMsg,
        diagnosticCode: error?.code || error?.name || (isAuthErr ? 'UNAUTHORIZED' : 'FORBIDDEN'),
      });
    }

    console.error('[TRIAL API FATAL]', {
      name: error?.name,
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
    });

    return res.status(500).json({
      success: false,
      error: errorMsg || 'Falha interna no onboarding.',
      diagnosticCode: error?.code || error?.name || 'UNKNOWN',
    });
  }
}
