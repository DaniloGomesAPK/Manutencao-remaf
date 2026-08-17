/**
 * Firebase Cloud Functions
 * 
 * NOTA DE ARQUITETURA E SEGURANÇA:
 * O processamento de Webhooks (Cakto) e gerenciamento de licenças é centralizado
 * exclusivamente no servidor Express / endpoints Vercel (/api/webhooks/cakto e server/caktoWebhookService.ts)
 * garantindo idempotência transacional, autenticação segura e fail-closed por padrão.
 * 
 * Nenhuma função antiga ou insegura deve ser exposta aqui.
 */

export {};
