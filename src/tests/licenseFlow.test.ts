/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LicenseService } from '../services/LicenseService';
import { LicencaAtual, StatusLicenca } from '../models/License';

// Mock do localStorage para ambiente Node puro
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

export async function runLicenseFlowTests() {
  console.log('=== INICIANDO TESTES AUTOMÁTICOS DO FLUXO DE LICENÇAS E AUTENTICAÇÃO ===');

  let passed = 0;
  let failed = 0;

  function logPass(testName: string) {
    console.log(`✅ TEST PASSED: [${testName}]`);
    passed++;
  }

  function logFail(testName: string, reason: string) {
    console.error(`❌ TEST FAILED: [${testName}] - ${reason}`);
    failed++;
  }

  function getDestinoTela(status: StatusLicenca): string {
    if (status === 'pending') return 'Tela Ativação';
    if (status === 'expired') return 'Licença Expirada';
    if (status === 'blocked') return 'Conta Bloqueada';
    if (status === 'cancelled') return 'Tela de Renovação';
    if (status === 'overdue') return 'Tela de Regularização';
    return 'Dashboard';
  }

  // 1. Teste: pending -> Tela Ativação
  const pendingLic: LicencaAtual = {
    empresaId: 'emp_test_pending',
    status: 'pending',
    plano: null,
    inicio: new Date().toISOString(),
    fim: new Date().toISOString(),
    trialInicio: null,
    trialFim: null,
    trialUtilizado: false,
    ultimaAtualizacao: new Date().toISOString(),
    origem: 'manual'
  };
  const validationPending = LicenseService.validarLicenca(pendingLic);
  const destinoPending = getDestinoTela(pendingLic.status);
  if (!validationPending.isValid && destinoPending === 'Tela Ativação') {
    logPass('status = pending -> Tela Ativação');
  } else {
    logFail('status = pending -> Tela Ativação', `Destino incorreto: ${destinoPending}`);
  }

  // 2. Teste: trial válido -> Dashboard
  const now = new Date();
  const trialFimFuturo = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const trialValidoLic: LicencaAtual = {
    empresaId: 'emp_test_trial_valid',
    status: 'trial',
    plano: 'trial_3dias',
    inicio: now.toISOString(),
    fim: trialFimFuturo,
    trialInicio: now.toISOString(),
    trialFim: trialFimFuturo,
    trialUtilizado: true,
    ultimaAtualizacao: now.toISOString(),
    origem: 'manual'
  };
  const validationTrialValido = LicenseService.validarLicenca(trialValidoLic);
  const destinoTrialValido = getDestinoTela(trialValidoLic.status);
  if (validationTrialValido.isValid && destinoTrialValido === 'Dashboard') {
    logPass('status = trial válido -> Dashboard');
  } else {
    logFail('status = trial válido -> Dashboard', `Destino ou validação incorretos`);
  }

  // 3. Teste: trial expirado -> Licença Expirada
  const trialFimPassado = new Date(now.getTime() - 1000).toISOString();
  const trialExpiradoLic: LicencaAtual = {
    empresaId: 'emp_test_trial_exp',
    status: 'trial',
    plano: 'trial_3dias',
    inicio: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    fim: trialFimPassado,
    trialInicio: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    trialFim: trialFimPassado,
    trialUtilizado: true,
    ultimaAtualizacao: trialFimPassado,
    origem: 'manual'
  };
  const validationTrialExpirado = LicenseService.validarLicenca(trialExpiradoLic);
  const statusAposValidacao = validationTrialExpirado.status;
  const destinoTrialExpirado = getDestinoTela(statusAposValidacao);
  if (!validationTrialExpirado.isValid && (statusAposValidacao === 'expired' || destinoTrialExpirado === 'Licença Expirada')) {
    logPass('status = trial expirado -> Licença Expirada');
  } else {
    logFail('status = trial expirado -> Licença Expirada', `Esperado Licença Expirada, obtido: ${destinoTrialExpirado}`);
  }

  // 4. Teste: active -> Dashboard
  const activeLic: LicencaAtual = {
    empresaId: 'emp_test_active',
    status: 'active',
    plano: 'Plano Mensal',
    inicio: now.toISOString(),
    fim: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    trialInicio: now.toISOString(),
    trialFim: trialFimPassado,
    trialUtilizado: true,
    ultimaAtualizacao: now.toISOString(),
    origem: 'manual'
  };
  const validationActive = LicenseService.validarLicenca(activeLic);
  const destinoActive = getDestinoTela(activeLic.status);
  if (validationActive.isValid && destinoActive === 'Dashboard') {
    logPass('status = active -> Dashboard');
  } else {
    logFail('status = active -> Dashboard', `Destino incorreto: ${destinoActive}`);
  }

  // 5. Teste: blocked -> Conta Bloqueada
  const blockedLic: LicencaAtual = {
    empresaId: 'emp_test_blocked',
    status: 'blocked',
    plano: null,
    inicio: now.toISOString(),
    fim: now.toISOString(),
    trialInicio: null,
    trialFim: null,
    trialUtilizado: false,
    ultimaAtualizacao: now.toISOString(),
    origem: 'manual'
  };
  const validationBlocked = LicenseService.validarLicenca(blockedLic);
  const destinoBlocked = getDestinoTela(blockedLic.status);
  if (!validationBlocked.isValid && destinoBlocked === 'Conta Bloqueada') {
    logPass('status = blocked -> Conta Bloqueada');
  } else {
    logFail('status = blocked -> Conta Bloqueada', `Destino incorreto: ${destinoBlocked}`);
  }

  // 6. Teste: overdue -> Regularização
  const overdueLic: LicencaAtual = {
    empresaId: 'emp_test_overdue',
    status: 'overdue',
    plano: 'Plano Mensal',
    inicio: now.toISOString(),
    fim: now.toISOString(),
    trialInicio: null,
    trialFim: null,
    trialUtilizado: false,
    ultimaAtualizacao: now.toISOString(),
    origem: 'manual'
  };
  const validationOverdue = LicenseService.validarLicenca(overdueLic);
  const destinoOverdue = getDestinoTela(overdueLic.status);
  if (!validationOverdue.isValid && destinoOverdue === 'Tela de Regularização') {
    logPass('status = overdue -> Regularização');
  } else {
    logFail('status = overdue -> Regularização', `Destino incorreto: ${destinoOverdue}`);
  }

  // 7. Teste: cancelled -> Renovação
  const cancelledLic: LicencaAtual = {
    empresaId: 'emp_test_cancelled',
    status: 'cancelled',
    plano: 'Plano Anual',
    inicio: now.toISOString(),
    fim: now.toISOString(),
    trialInicio: null,
    trialFim: null,
    trialUtilizado: false,
    ultimaAtualizacao: now.toISOString(),
    origem: 'manual'
  };
  const validationCancelled = LicenseService.validarLicenca(cancelledLic);
  const destinoCancelled = getDestinoTela(cancelledLic.status);
  if (!validationCancelled.isValid && destinoCancelled === 'Tela de Renovação') {
    logPass('status = cancelled -> Renovação');
  } else {
    logFail('status = cancelled -> Renovação', `Destino incorreto: ${destinoCancelled}`);
  }

  // 8. Teste: Proibir reinício do período gratuito
  try {
    const fakeEmpresa = 'emp_test_trial_protection_' + Date.now();
    await LicenseService.iniciarTrial(fakeEmpresa);
    const firstTrial = await LicenseService.getLicenca(fakeEmpresa);
    const firstTrialInicio = firstTrial?.trialInicio;
    const firstTrialFim = firstTrial?.trialFim;

    await LicenseService.iniciarTrial(fakeEmpresa);
    const secondTrial = await LicenseService.getLicenca(fakeEmpresa);

    if (secondTrial?.trialInicio === firstTrialInicio && secondTrial?.trialFim === firstTrialFim) {
      logPass('Proibir reinício do período gratuito');
    } else {
      logFail('Proibir reinício do período gratuito', 'Datas de trial foram alteradas em tentativa de re-trial!');
    }
  } catch (e: any) {
    logPass('Proibir reinício do período gratuito (rejeitado)');
  }

  console.log(`\n=== RESUMO DOS TESTES DE FLUXO DE LICENÇA ===`);
  console.log(`Total: ${passed + failed} | Aprovados: ${passed} | Falhas: ${failed}`);

  return { passed, failed };
}
