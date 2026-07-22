/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { validateEmpresaId, getTenantCollectionPath } from '../services/FirestoreRepository';

export function runTenantSecurityTests() {
  console.log('=== INICIANDO TESTES AUTOMÁTICOS DE SEGURANÇA MULTIEMPRESA (TENANT ISOLATION) ===');

  let passed = 0;
  let failed = 0;

  function assertThrows(testName: string, fn: () => void) {
    try {
      fn();
      console.error(`❌ TEST FAILED: [${testName}] - Deveria ter lançado exceção mas passou.`);
      failed++;
    } catch (e: any) {
      if (e.message.includes('TenantIsolationViolation') || e.message.includes('empresaId ausente ou inválido')) {
        console.log(`✅ TEST PASSED: [${testName}] - Exceção de segurança lançada com sucesso: ${e.message}`);
        passed++;
      } else {
        console.error(`❌ TEST FAILED: [${testName}] - Exceção inesperada: ${e.message}`);
        failed++;
      }
    }
  }

  function assertEqual(testName: string, actual: string, expected: string) {
    if (actual === expected) {
      console.log(`✅ TEST PASSED: [${testName}] - Resultado esperado: ${actual}`);
      passed++;
    } else {
      console.error(`❌ TEST FAILED: [${testName}] - Esperado '${expected}', mas obteve '${actual}'`);
      failed++;
    }
  }

  // 1. Testes com empresaId válido
  assertEqual('EmpresaId Válido (Padrão)', validateEmpresaId('emp_empresa123', 'test', 'clientes'), 'emp_empresa123');
  assertEqual('Caminho do Firestore Válido', getTenantCollectionPath('clientes', 'emp_empresa123'), 'empresas/emp_empresa123/clientes');

  // 2. Teste: empresaId null
  assertThrows('empresaId null', () => {
    validateEmpresaId(null as any, 'test_null', 'clientes');
  });

  // 3. Teste: empresaId undefined
  assertThrows('empresaId undefined', () => {
    validateEmpresaId(undefined as any, 'test_undefined', 'clientes');
  });

  // 4. Teste: empresaId string vazia
  assertThrows('empresaId string vazia', () => {
    validateEmpresaId('', 'test_empty', 'clientes');
  });

  // 5. Teste: empresaId com apenas espaços
  assertThrows('empresaId apenas espaços', () => {
    validateEmpresaId('   ', 'test_spaces', 'clientes');
  });

  // 6. Teste: tentativa de fallback emp_default
  assertThrows('empresaId igual a emp_default (rejeição de fallback)', () => {
    validateEmpresaId('emp_default', 'test_emp_default', 'clientes');
  });

  // 7. Teste: empresaId literal "null" ou "undefined"
  assertThrows('empresaId string "null"', () => {
    validateEmpresaId('null', 'test_str_null', 'clientes');
  });

  assertThrows('empresaId string "undefined"', () => {
    validateEmpresaId('undefined', 'test_str_undefined', 'clientes');
  });

  console.log(`\n=== RESUMO DOS TESTES DE TENANT ISOLATION ===`);
  console.log(`Total de testes: ${passed + failed}`);
  console.log(`Aprovados: ${passed}`);
  console.log(`Falhas: ${failed}`);

  if (failed > 0) {
    throw new Error(`[TenantSecurityTests] ${failed} teste(s) falharam!`);
  }

  return { passed, failed };
}
