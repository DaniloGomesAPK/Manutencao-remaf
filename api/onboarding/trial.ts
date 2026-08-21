/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { applyRateLimit, trialRateLimiter } from '../../server/rateLimiter';

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validação de método: métodos diferentes de POST retornam 405
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: `Método ${req.method} não permitido. Utilize POST.`,
    });
  }

  // Camada de proteção contra abuso / Rate Limiting (HTTP 429)
  if (!applyRateLimit(req, res, trialRateLimiter)) {
    return;
  }

  // Validação de cabeçalho de autorização: sem Bearer token retorna 401
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

    // Import dinâmico dentro do try para prevenir quebras no carregamento inicial do módulo
    const { handleTrialOnboarding } = await import('../../server/onboardingService.js');

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

