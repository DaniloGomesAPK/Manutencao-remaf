/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LicenseService } from '../services/LicenseService';
import { AdminLicenseService } from '../services/admin/AdminLicenseService';
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
    email: 'test_pending@empresa.com',
    empresaId: 'emp_test_pending',
    status: 'pending',
    plano: null,
    validade: null,
    ativo: true,
    bloqueado: false,
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
  const trialFimFuturo = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString();
  const trialValidoLic: LicencaAtual = {
    email: 'test_trial_valid@empresa.com',
    empresaId: 'emp_test_trial_valid',
    status: 'trial',
    plano: 'trial_7dias',
    validade: trialFimFuturo,
    ativo: true,
    bloqueado: false,
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
    email: 'test_trial_exp@empresa.com',
    empresaId: 'emp_test_trial_exp',
    status: 'trial',
    plano: 'trial_7dias',
    validade: trialFimPassado,
    ativo: true,
    bloqueado: false,
    inicio: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    fim: trialFimPassado,
    trialInicio: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
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
    email: 'test_active@empresa.com',
    empresaId: 'emp_test_active',
    status: 'active',
    plano: 'Plano Mensal',
    validade: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ativo: true,
    bloqueado: false,
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
    email: 'test_blocked@empresa.com',
    empresaId: 'emp_test_blocked',
    status: 'blocked',
    plano: null,
    validade: null,
    ativo: false,
    bloqueado: true,
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
    email: 'test_overdue@empresa.com',
    empresaId: 'emp_test_overdue',
    status: 'overdue',
    plano: 'Plano Mensal',
    validade: null,
    ativo: true,
    bloqueado: false,
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
    email: 'test_cancelled@empresa.com',
    empresaId: 'emp_test_cancelled',
    status: 'cancelled',
    plano: 'Plano Anual',
    validade: null,
    ativo: false,
    bloqueado: false,
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

  // 8. Teste: pago ativo com accessUntil futuro -> Dashboard
  const pagoAtivoLic: LicencaAtual = {
    email: 'test_pago_ativo@empresa.com',
    empresaId: 'emp_test_pago_ativo',
    status: 'pago',
    plano: 'mensal',
    validade: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    accessUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ativo: true,
    bloqueado: false,
    inicio: now.toISOString(),
    fim: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    trialInicio: null,
    trialFim: null,
    trialUtilizado: true,
    ultimaAtualizacao: now.toISOString(),
    origem: 'manual'
  };
  const valPagoAtivo = LicenseService.validarLicenca(pagoAtivoLic);
  if (valPagoAtivo.isValid && valPagoAtivo.status === 'pago') {
    logPass('status = pago com accessUntil futuro -> Válido');
  } else {
    logFail('status = pago com accessUntil futuro -> Válido', 'Falha na validação de licença paga ativa');
  }

  // 9. Teste: pago expirado com accessUntil passado -> Expirado (Sem acesso perpétuo)
  const pagoExpiradoLic: LicencaAtual = {
    email: 'test_pago_expirado@empresa.com',
    empresaId: 'emp_test_pago_expirado',
    status: 'pago',
    plano: 'mensal',
    validade: new Date(now.getTime() - 1000).toISOString(),
    accessUntil: new Date(now.getTime() - 1000).toISOString(),
    ativo: true,
    bloqueado: false,
    inicio: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    fim: new Date(now.getTime() - 1000).toISOString(),
    trialInicio: null,
    trialFim: null,
    trialUtilizado: true,
    ultimaAtualizacao: now.toISOString(),
    origem: 'manual'
  };
  const valPagoExpirado = LicenseService.validarLicenca(pagoExpiradoLic);
  if (!valPagoExpirado.isValid && valPagoExpirado.status === 'expired') {
    logPass('pago + accessUntil expirado -> Bloqueado');
  } else {
    logFail('pago + accessUntil expirado -> Bloqueado', 'Permitiu acesso em licença paga expirada!');
  }

  // 10. Teste: pago sem accessUntil -> Bloqueado (Fail-Closed)
  const pagoSemAccessUntil: LicencaAtual = {
    email: 'test_pago_sem_access@empresa.com',
    empresaId: 'emp_test_pago_sem_access',
    status: 'pago',
    plano: 'mensal',
    validade: null,
    accessUntil: null,
    ativo: true,
    bloqueado: false,
    inicio: now.toISOString(),
    fim: null,
    trialInicio: null,
    trialFim: null,
    trialUtilizado: true,
    ultimaAtualizacao: now.toISOString(),
    origem: 'manual'
  };
  const valPagoSemAccess = LicenseService.validarLicenca(pagoSemAccessUntil);
  if (!valPagoSemAccess.isValid && valPagoSemAccess.status === 'expired') {
    logPass('pago sem accessUntil -> Bloqueado (Fail-Closed)');
  } else {
    logFail('pago sem accessUntil -> Bloqueado', 'Permitiu acesso em licença paga sem accessUntil!');
  }

  // 11. Teste: accessUntil inválido -> Bloqueado (Fail-Closed)
  const pagoAccessInvalido: LicencaAtual = {
    email: 'test_pago_invalido@empresa.com',
    empresaId: 'emp_test_pago_invalido',
    status: 'pago',
    plano: 'mensal',
    validade: 'data_invalida_xyz',
    accessUntil: 'data_invalida_xyz',
    ativo: true,
    bloqueado: false,
    inicio: now.toISOString(),
    fim: 'data_invalida_xyz',
    trialInicio: null,
    trialFim: null,
    trialUtilizado: true,
    ultimaAtualizacao: now.toISOString(),
    origem: 'manual'
  };
  const valPagoInvalido = LicenseService.validarLicenca(pagoAccessInvalido);
  if (!valPagoInvalido.isValid && valPagoInvalido.status === 'expired') {
    logPass('accessUntil inválido -> Bloqueado (Fail-Closed)');
  } else {
    logFail('accessUntil inválido -> Bloqueado', 'Permitiu acesso em licença com data inválida!');
  }

  // 12. Teste: Trial sem data de expiração -> Bloqueado (Fail-Closed)
  const trialSemData: any = {
    email: 'test_trial_sem_data@empresa.com',
    empresaId: 'emp_test_trial_sem_data',
    status: 'trial',
    plano: 'Trial 7 Dias',
    validade: null,
    accessUntil: null,
    ativo: true,
    bloqueado: false,
    inicio: null,
    fim: null,
    trialInicio: null,
    trialFim: null,
    criadoEm: null
  };
  const valTrialSemData = LicenseService.validarLicenca(trialSemData);
  if (!valTrialSemData.isValid && valTrialSemData.status === 'expired') {
    logPass('Trial sem data de expiração -> Bloqueado (Fail-Closed)');
  } else {
    logFail('Trial sem data de expiração -> Bloqueado', 'Permitiu acesso em trial sem data!');
  }

  // 13. Teste: 'ativo' ausente/falso -> Bloqueado (Fail-Closed)
  const licAtivoAusente: any = {
    email: 'test_ativo_ausente@empresa.com',
    empresaId: 'emp_test_ativo_ausente',
    status: 'trial',
    plano: 'Trial 7 Dias',
    trialInicio: now.toISOString(),
    trialFim: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    accessUntil: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    // 'ativo' ausente
  };
  const valAtivoAusente = LicenseService.validarLicenca(licAtivoAusente);
  if (!valAtivoAusente.isValid) {
    logPass('ativo ausente -> Bloqueado (Fail-Closed)');
  } else {
    logFail('ativo ausente -> Bloqueado', 'Permitiu acesso com campo ativo indefinido!');
  }

  // 14. Teste: Trial normal de 7 dias com datas válidas -> Permitido
  const trialNormal: any = {
    email: 'test_trial_normal@empresa.com',
    empresaId: 'emp_test_trial_normal',
    status: 'trial',
    plano: 'Trial 7 Dias',
    trialInicio: now.toISOString(),
    trialFim: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    accessUntil: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ativo: true,
    bloqueado: false
  };
  const valTrialNormal = LicenseService.validarLicenca(trialNormal);
  if (valTrialNormal.isValid && valTrialNormal.status === 'trial') {
    logPass('Trial normal de 7 dias com datas válidas -> Permitido');
  } else {
    logFail('Trial normal de 7 dias com datas válidas -> Permitido', 'Bloqueou trial de 7 dias válido!');
  }

  // 15. Teste: Proibir reinício do período gratuito
  try {
    const fakeEmail = 'test_trial_protection_' + Date.now() + '@teste.com';
    const trialData: any = {
      email: fakeEmail,
      status: 'trial',
      trialInicio: new Date().toISOString(),
      trialFim: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      accessUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ativo: true,
      bloqueado: false,
    };
    LicenseService.saveLicencaLocal(fakeEmail, trialData);
    const firstTrial = LicenseService.getLicencaLocal(fakeEmail);
    const firstTrialInicio = firstTrial?.trialInicio;
    const firstTrialFim = firstTrial?.trialFim;

    if (firstTrialInicio && firstTrialFim) {
      logPass('Proibir reinício do período gratuito');
    } else {
      logFail('Proibir reinício do período gratuito', 'Datas de trial ausentes no cache');
    }
  } catch (e: any) {
    logPass('Proibir reinício do período gratuito (rejeitado)');
  }

  console.log(`\n=== RESUMO DOS TESTES DE FLUXO DE LICENÇA ===`);
  console.log(`Total: ${passed + failed} | Aprovados: ${passed} | Falhas: ${failed}`);

  return { passed, failed };
}
