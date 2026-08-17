/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ALLOWED_CAKTO_EVENTS,
  timingSafeEqualStrings,
  extractSecretFromHeaders,
  extractCaktoEventId,
  handleCaktoWebhook,
} from '../../server/caktoWebhookService';

export async function runCaktoWebhookTests() {
  console.log('\n--- INICIANDO TESTES DO WEBHOOK CAKTO ---');
  let passed = 0;
  let failed = 0;

  const logPass = (name: string) => {
    console.log(`✅ [PASS] ${name}`);
    passed++;
  };

  const logFail = (name: string, reason: string) => {
    console.error(`❌ [FAIL] ${name}: ${reason}`);
    failed++;
  };

  // 1. Teste de timingSafeEqualStrings
  try {
    const s1 = 'my_secret_token_12345';
    const s2 = 'my_secret_token_12345';
    const s3 = 'my_secret_token_99999';
    const s4 = 'short';

    if (
      timingSafeEqualStrings(s1, s2) === true &&
      timingSafeEqualStrings(s1, s3) === false &&
      timingSafeEqualStrings(s1, s4) === false &&
      timingSafeEqualStrings('', '') === false
    ) {
      logPass('Comparação segura de segredos (timingSafeEqualStrings) funcionando corretamente');
    } else {
      logFail('timingSafeEqualStrings', 'Resultado inesperado na comparação segura');
    }
  } catch (e: any) {
    logFail('timingSafeEqualStrings', e.message);
  }

  // 2. Teste de extração de secret apenas por headers (ignora query)
  try {
    const headers1 = { 'x-cakto-secret': 'sec_cakto_abc' };
    const headers2 = { authorization: 'Bearer sec_cakto_bearer' };
    const headers3 = { 'x-webhook-secret': 'sec_cakto_custom' };
    const headersEmpty = {};

    if (
      extractSecretFromHeaders(headers1) === 'sec_cakto_abc' &&
      extractSecretFromHeaders(headers2) === 'sec_cakto_bearer' &&
      extractSecretFromHeaders(headers3) === 'sec_cakto_custom' &&
      extractSecretFromHeaders(headersEmpty) === ''
    ) {
      logPass('Extração de segredo exclusivamente via headers HTTP funcionando');
    } else {
      logFail('extractSecretFromHeaders', 'Falha ao extrair cabeçalho correto');
    }
  } catch (e: any) {
    logFail('extractSecretFromHeaders', e.message);
  }

  // 3. Teste de extração do eventId estável da Cakto (Idempotência sem IDs aleatórios)
  try {
    const p1 = { id: 'evt_123456' };
    const p2 = { transaction_id: 'tx_987654' };
    const p3 = { data: { event_id: 'data_evt_777' } };
    const pEmpty = {};

    if (
      extractCaktoEventId(p1) === 'evt_123456' &&
      extractCaktoEventId(p2) === 'tx_987654' &&
      extractCaktoEventId(p3) === 'data_evt_777' &&
      extractCaktoEventId(pEmpty) === ''
    ) {
      logPass('Extração do identificador estável de idempotência (extractCaktoEventId) funcionando');
    } else {
      logFail('extractCaktoEventId', 'Falha ao extrair identificador estável de idempotência');
    }
  } catch (e: any) {
    logFail('extractCaktoEventId', e.message);
  }

  // 4. Teste de desativação por padrão (CAKTO_WEBHOOK_ENABLED === 'false')
  try {
    const oldEnabled = process.env.CAKTO_WEBHOOK_ENABLED;
    process.env.CAKTO_WEBHOOK_ENABLED = 'false';

    const res = await handleCaktoWebhook({ 'x-cakto-secret': 'any' }, { id: 'evt_1', event: 'purchase_approved' });
    if (res.statusCode === 403 && res.body.success === false) {
      logPass('Webhook recusa processamento quando CAKTO_WEBHOOK_ENABLED=false (HTTP 403)');
    } else {
      logFail('CAKTO_WEBHOOK_ENABLED=false', `Esperava status 403, obteve: ${res.statusCode}`);
    }

    process.env.CAKTO_WEBHOOK_ENABLED = oldEnabled;
  } catch (e: any) {
    logFail('CAKTO_WEBHOOK_ENABLED=false', e.message);
  }

  // 5. Teste de bloqueio se CAKTO_WEBHOOK_SECRET não estiver configurado
  try {
    const oldEnabled = process.env.CAKTO_WEBHOOK_ENABLED;
    const oldSecret = process.env.CAKTO_WEBHOOK_SECRET;
    process.env.CAKTO_WEBHOOK_ENABLED = 'true';
    process.env.CAKTO_WEBHOOK_SECRET = '';

    const res = await handleCaktoWebhook({ 'x-cakto-secret': 'any' }, { id: 'evt_1', event: 'purchase_approved' });
    if (res.statusCode === 403 && res.body.success === false) {
      logPass('Webhook recusa processamento se CAKTO_WEBHOOK_SECRET não estiver configurado no servidor');
    } else {
      logFail('CAKTO_WEBHOOK_SECRET ausente', `Esperava status 403, obteve: ${res.statusCode}`);
    }

    process.env.CAKTO_WEBHOOK_ENABLED = oldEnabled;
    process.env.CAKTO_WEBHOOK_SECRET = oldSecret;
  } catch (e: any) {
    logFail('CAKTO_WEBHOOK_SECRET ausente', e.message);
  }

  // 6. Teste de rejeição com segredo inválido no cabeçalho
  try {
    const oldEnabled = process.env.CAKTO_WEBHOOK_ENABLED;
    const oldSecret = process.env.CAKTO_WEBHOOK_SECRET;
    process.env.CAKTO_WEBHOOK_ENABLED = 'true';
    process.env.CAKTO_WEBHOOK_SECRET = 'correct_secret_xyz';

    const res = await handleCaktoWebhook({ 'x-cakto-secret': 'wrong_secret_123' }, { id: 'evt_1', event: 'purchase_approved' });
    if (res.statusCode === 401 && res.body.success === false) {
      logPass('Webhook rejeita requisição com segredo incorreto (HTTP 401)');
    } else {
      logFail('Segredo incorreto', `Esperava status 401, obteve: ${res.statusCode}`);
    }

    process.env.CAKTO_WEBHOOK_ENABLED = oldEnabled;
    process.env.CAKTO_WEBHOOK_SECRET = oldSecret;
  } catch (e: any) {
    logFail('Segredo incorreto', e.message);
  }

  // 7. Teste de eventos permitidos por igualdade exata (Strict Equality)
  try {
    const allowed = [
      'purchase_approved',
      'subscription_renewed',
      'refund',
      'chargeback',
      'subscription_canceled',
      'purchase_refused',
    ];

    const allMatch = allowed.every((ev) => ALLOWED_CAKTO_EVENTS.includes(ev as any));
    const partialMatchRejection = !ALLOWED_CAKTO_EVENTS.includes('my_purchase_approved' as any) &&
      !ALLOWED_CAKTO_EVENTS.includes('subscription_renewed_extra' as any) &&
      !ALLOWED_CAKTO_EVENTS.includes('refund_partial' as any);

    if (allMatch && partialMatchRejection) {
      logPass('Lista de eventos permitidos por igualdade exata validada com sucesso');
    } else {
      logFail('ALLOWED_CAKTO_EVENTS', 'Falha na verificação da lista de eventos estritos');
    }
  } catch (e: any) {
    logFail('ALLOWED_CAKTO_EVENTS', e.message);
  }

  // 8. Teste de evento desconhecido ignorado sem erro e sem alterar licenças
  try {
    const oldEnabled = process.env.CAKTO_WEBHOOK_ENABLED;
    const oldSecret = process.env.CAKTO_WEBHOOK_SECRET;
    process.env.CAKTO_WEBHOOK_ENABLED = 'true';
    process.env.CAKTO_WEBHOOK_SECRET = 'valid_sec_123';

    const res = await handleCaktoWebhook(
      { 'x-cakto-secret': 'valid_sec_123' },
      { id: 'evt_unknown_1', event: 'lead_captured_unknown_event', email: 'test@empresa.com' }
    );

    if (res.statusCode === 200 && res.body.ignored === true && res.body.success === true) {
      logPass('Evento desconhecido é ignorado com HTTP 200 sem alterar licenças');
    } else {
      logFail('Evento desconhecido', `Esperava status 200 com ignored=true, obteve: ${res.statusCode}`);
    }

    process.env.CAKTO_WEBHOOK_ENABLED = oldEnabled;
    process.env.CAKTO_WEBHOOK_SECRET = oldSecret;
  } catch (e: any) {
    logFail('Evento desconhecido', e.message);
  }

  // 9. Teste de bloqueio de evento sem eventId no payload quando ativo
  try {
    const oldEnabled = process.env.CAKTO_WEBHOOK_ENABLED;
    const oldSecret = process.env.CAKTO_WEBHOOK_SECRET;
    process.env.CAKTO_WEBHOOK_ENABLED = 'true';
    process.env.CAKTO_WEBHOOK_SECRET = 'valid_sec_123';

    const res = await handleCaktoWebhook(
      { 'x-cakto-secret': 'valid_sec_123' },
      { event: 'purchase_approved', email: 'test@empresa.com' } // sem id
    );

    if (res.statusCode === 400 && res.body.success === false) {
      logPass('Webhook recusa evento sem identificador estável de idempotência (HTTP 400)');
    } else {
      logFail('Idempotência sem ID', `Esperava status 400, obteve: ${res.statusCode}`);
    }

    process.env.CAKTO_WEBHOOK_ENABLED = oldEnabled;
    process.env.CAKTO_WEBHOOK_SECRET = oldSecret;
  } catch (e: any) {
    logFail('Idempotência sem ID', e.message);
  }

  console.log(`\n--- RESULTADO DOS TESTES DO WEBHOOK CAKTO: ${passed} PASS, ${failed} FAIL ---\n`);
  return { passed, failed };
}
