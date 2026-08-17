import { handleCaktoWebhook } from '../../server/caktoWebhookService';

/**
 * Vercel Serverless Function: Webhook Cakto
 * Endpoint: /api/webhooks/cakto
 * 
 * Encaminha requisições com segurança para o handleCaktoWebhook().
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: `Método ${req.method} não permitido. Utilize POST.`,
    });
  }

  try {
    const result = await handleCaktoWebhook(req.headers || {}, req.body);
    return res.status(result.statusCode).json(result.body);
  } catch (error: any) {
    console.error('[Vercel Cakto Webhook] Erro não tratado:', error?.message || error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao processar notificação da Cakto.',
    });
  }
}
