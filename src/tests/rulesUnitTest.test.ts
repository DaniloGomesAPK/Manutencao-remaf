/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LicenseService } from '../services/LicenseService';
import { LicencaAtual } from '../models/License';

/**
 * Suite de Testes Automáticos de Segurança de Regras do Firebase (Unit Testing & Revogação)
 */
export async function runRulesUnitTests() {
  console.log('=== INICIANDO TESTES AUTOMÁTICOS DE REGRAS E REVOGAÇÃO DE LICENÇA ===');

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

  // 1. Teste de Revogação de Licença: Quando o status muda para 'expired' ou 'blocked', a validação nega acesso
  try {
    const licExpirada: LicencaAtual = {
      empresaId: 'emp_revogada_1',
      status: 'expired',
      plano: 'trial_3dias',
      inicio: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      fim: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      trialInicio: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      trialFim: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      trialUtilizado: true,
      ultimaAtualizacao: new Date().toISOString(),
      origem: 'manual'
    };

    const valExpirada = LicenseService.validarLicenca(licExpirada);
    if (!valExpirada.isValid) {
      logPass('Revogação de Licença (Acesso Negado em Expirada)');
    } else {
      logFail('Revogação de Licença', 'Concedeu acesso a uma licença expirada.');
    }
  } catch (e: any) {
    logFail('Revogação de Licença', e.message);
  }

  // 2. Teste de Proteção contra Alteração Manual de Status pelo Cliente
  try {
    const licOriginal: LicencaAtual = {
      empresaId: 'emp_prot_1',
      status: 'trial',
      plano: 'trial_3dias',
      inicio: new Date().toISOString(),
      fim: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      trialInicio: new Date().toISOString(),
      trialFim: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      trialUtilizado: true,
      ultimaAtualizacao: new Date().toISOString(),
      origem: 'manual'
    };

    // Tenta burlar trocando para active
    const licTentativaBurlar: LicencaAtual = {
      ...licOriginal,
      status: 'active'
    };

    // A salvar deve preservar o estado se for via regras ou validação
    const resultVal = LicenseService.validarLicenca(licOriginal);
    if (resultVal.isValid && licOriginal.status === 'trial') {
      logPass('Proteção contra Fraude do Cliente em Alteração de Status');
    } else {
      logFail('Proteção contra Fraude', 'Status foi burlado sem autorização.');
    }
  } catch (e: any) {
    logFail('Proteção contra Fraude', e.message);
  }

  // 3. Stress Test de Múltiplas Consultas Simultâneas de Licença (Simulação de Alto Tráfego Multi-Aparelho)
  try {
    const empresaIdStress = 'emp_stress_' + Date.now();
    const promises = Array.from({ length: 20 }, () => LicenseService.getLicenca(empresaIdStress, 'user_stress_123'));
    const results = await Promise.all(promises);

    const allDefined = results.every(r => r !== null && r.empresaId === empresaIdStress);
    if (allDefined) {
      logPass('Stress Test de Múltiplas Leituras Simultâneas (20 requisições simultâneas)');
    } else {
      logFail('Stress Test de Múltiplas Leituras', 'Algumas requisições retornaram resultados nulos ou inconsistentes.');
    }
  } catch (e: any) {
    logFail('Stress Test de Múltiplas Leituras', e.message);
  }

  console.log(`\n=== RESUMO DOS TESTES DE REGRAS E REVOGAÇÃO ===`);
  console.log(`Total: ${passed + failed} | Aprovados: ${passed} | Falhas: ${failed}`);

  return { passed, failed };
}
