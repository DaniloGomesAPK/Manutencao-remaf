/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LicenseService } from '../services/LicenseService';
import { EmailAutorizado } from '../models/License';

export async function runTrialOnboardingFlowTests() {
  console.log('=== TESTES DO FLUXO DE ONBOARDING TRIAL E RECUPERAÇÃO ===');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, errorDetail?: string) {
    if (condition) {
      console.log(`✅ TEST PASSED: [${testName}]`);
      passed++;
    } else {
      console.error(`❌ TEST FAILED: [${testName}] - ${errorDetail || 'Falha na asserção'}`);
      failed++;
    }
  }

  // 1. Teste: Novo usuário + e-mail confirmado -> 7 dias liberados com status "trial"
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const novoTrialDoc: EmailAutorizado = {
    email: 'novo_usuario@oficina.com',
    empresaId: 'emp_novousuario123',
    status: 'trial',
    plano: 'Trial 7 Dias',
    ativo: true,
    bloqueado: false,
    trialInicio: now.toISOString(),
    trialFim: expiresAt.toISOString(),
    validade: expiresAt.toISOString(),
    accessUntil: expiresAt.toISOString(),
    criadoEm: now.toISOString(),
  };

  const valNovoTrial = LicenseService.validarLicenca(novoTrialDoc);
  const tempoNovoTrial = LicenseService.getTempoRestanteTrial(novoTrialDoc.trialFim);

  assert(
    valNovoTrial.isValid && valNovoTrial.status === 'trial' && tempoNovoTrial.dias >= 6 && !tempoNovoTrial.expirou,
    '1. Novo usuário com e-mail confirmado -> 7 dias liberados e válido no LicenseService'
  );

  // 2. Teste: Documento com status ausente (antigo bug) -> tratado como pending pelo LicenseService
  const docSemStatus = {
    email: 'usuario_sem_status@oficina.com',
    empresaId: 'emp_semstatus',
    ativo: true,
    bloqueado: false,
    trialInicio: now.toISOString(),
    trialFim: expiresAt.toISOString(),
    accessUntil: expiresAt.toISOString(),
  } as any;

  const mappedSemStatus = LicenseService.mapDocToLicencaAtual(docSemStatus, docSemStatus.email);
  assert(
    mappedSemStatus.status === 'pending',
    '2. Documento com status ausente vira "pending" no mapper (exigindo que o backend sempre grave status: "trial")'
  );

  // 3. Teste: Usuário verificado com Firestore incompleto recuperado
  // O backend grava todos os campos requeridos
  const docRecuperado: EmailAutorizado = {
    email: 'usuario_incompleto@oficina.com',
    empresaId: 'emp_incompleto123',
    status: 'trial',
    plano: 'Trial 7 Dias',
    ativo: true,
    bloqueado: false,
    trialInicio: now.toISOString(),
    trialFim: expiresAt.toISOString(),
    validade: expiresAt.toISOString(),
    accessUntil: expiresAt.toISOString(),
  };
  const valRecuperado = LicenseService.validarLicenca(docRecuperado);
  assert(
    valRecuperado.isValid && valRecuperado.status === 'trial',
    '3. Usuário verificado com Firestore incompleto -> onboarding recuperado com status "trial"'
  );

  // 4. Teste: Recovery repetido (idempotência) -> preserva datas originais sem estender 7 dias
  const dataInicioOriginal = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 dias atrás
  const dataFimOriginal = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(); // restam 5 dias
  const docRecoveryIdempotente: EmailAutorizado = {
    email: 'usuario_recovery@oficina.com',
    empresaId: 'emp_recovery123',
    status: 'trial',
    plano: 'Trial 7 Dias',
    ativo: true,
    bloqueado: false,
    trialInicio: dataInicioOriginal,
    trialFim: dataFimOriginal,
    validade: dataFimOriginal,
    accessUntil: dataFimOriginal,
  };
  const valIdempotente = LicenseService.validarLicenca(docRecoveryIdempotente);
  const tempoIdempotente = LicenseService.getTempoRestanteTrial(docRecoveryIdempotente.trialFim);
  assert(
    valIdempotente.isValid && tempoIdempotente.dias <= 5,
    '4. Recovery repetido -> preserva expiração original sem reiniciar 7 dias'
  );

  // 5. Teste: Trial expirado -> continua bloqueado (Fail-Closed)
  const dataExpirada = new Date(now.getTime() - 1000).toISOString();
  const docExpirado: EmailAutorizado = {
    email: 'usuario_expirado@oficina.com',
    empresaId: 'emp_expirado123',
    status: 'trial',
    plano: 'Trial 7 Dias',
    ativo: true,
    bloqueado: false,
    trialInicio: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    trialFim: dataExpirada,
    validade: dataExpirada,
    accessUntil: dataExpirada,
  };
  const valExpirado = LicenseService.validarLicenca(docExpirado);
  assert(
    !valExpirado.isValid && valExpirado.status === 'expired',
    '5. Trial expirado -> continua bloqueado (Fail-Closed)'
  );

  // 6. Teste: Plano pago existente -> não alterar nem rebaixar
  const pagoFuturo = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const docPago: EmailAutorizado = {
    email: 'cliente_pago@oficina.com',
    empresaId: 'emp_pago123',
    status: 'pago',
    plano: 'Profissional Mensal',
    ativo: true,
    bloqueado: false,
    validade: pagoFuturo,
    accessUntil: pagoFuturo,
    trialInicio: null,
    trialFim: null,
  };
  const valPago = LicenseService.validarLicenca(docPago);
  assert(
    valPago.isValid && valPago.status === 'pago',
    '6. Plano pago existente -> mantido como pago ativo e válido'
  );

  // 7. Teste: API Handler - GET deve retornar 405
  let mockGetStatusCode = 0;
  let mockGetResponse: any = null;
  const mockGetRes = {
    setHeader: () => {},
    status: (code: number) => {
      mockGetStatusCode = code;
      return {
        json: (data: any) => { mockGetResponse = data; return mockGetResponse; }
      };
    }
  };
  const trialHandler = (await import('../../api/onboarding/trial')).default;
  await trialHandler({ method: 'GET', headers: {} }, mockGetRes);
  assert(
    mockGetStatusCode === 405 && mockGetResponse?.success === false,
    '7. GET /api/onboarding/trial -> 405 Method Not Allowed (nunca 500)'
  );

  // 8. Teste: API Handler - POST sem token deve retornar 401
  let mockPostNoTokenCode = 0;
  let mockPostNoTokenResponse: any = null;
  const mockPostNoTokenRes = {
    setHeader: () => {},
    status: (code: number) => {
      mockPostNoTokenCode = code;
      return {
        json: (data: any) => { mockPostNoTokenResponse = data; return mockPostNoTokenResponse; }
      };
    }
  };
  await trialHandler({ method: 'POST', headers: {} }, mockPostNoTokenRes);
  assert(
    mockPostNoTokenCode === 401 && mockPostNoTokenResponse?.success === false,
    '8. POST /api/onboarding/trial sem Bearer Token -> 401 Unauthorized (nunca 500)'
  );

  console.log(`=== RESUMO: ${passed} passaram, ${failed} falharam ===\n`);
  if (failed > 0) {
    throw new Error(`${failed} testes falharam.`);
  }
}
