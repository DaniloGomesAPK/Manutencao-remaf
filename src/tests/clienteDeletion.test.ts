/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClienteService } from '../services/ClienteService';
import { FirestoreRepository, validateEmpresaId, getTenantCollectionPath, mapCollectionToStoreName } from '../services/FirestoreRepository';
import { IntegridadeService } from '../services/IntegridadeService';
import { RecuperacaoService } from '../services/RecuperacaoService';
import { safeStorage } from '../utils/safeStorage';
import { Cliente } from '../types';

export async function runClienteDeletionTests() {
  console.log('\n--- INICIANDO TESTES DO FLUXO DE EXCLUSÃO DE CLIENTES E LIXEIRA ---');
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

  const testEmpresaId = 'emp_test_deletion_999';
  const testUserEmail = 'tester@dgdistribuidora.com';

  // 1. Teste de caminho oficial de isolamento multiempresa
  try {
    const path = getTenantCollectionPath('clientes', testEmpresaId);
    if (path === `empresas/${testEmpresaId}/clientes`) {
      logPass(`Caminho oficial do Firestore correto: ${path}`);
    } else {
      logFail('Caminho oficial do Firestore', `Esperado: empresas/${testEmpresaId}/clientes, obtido: ${path}`);
    }
  } catch (e: any) {
    logFail('Caminho oficial do Firestore', e.message);
  }

  // 2. Teste de validação de tenant nulo/inválido na exclusão
  try {
    let threw = false;
    try {
      await ClienteService.deleteCliente('cli_123', '');
    } catch {
      threw = true;
    }
    if (threw) {
      logPass('Exclusão com empresaId vazio é bloqueada');
    } else {
      logFail('Exclusão com empresaId vazio', 'Permitiu exclusão sem empresaId!');
    }
  } catch (e: any) {
    logFail('Exclusão com empresaId vazio', e.message);
  }

  // 3. Teste de validação de ID do cliente vazio
  try {
    let threw = false;
    try {
      await ClienteService.deleteCliente('', testEmpresaId);
    } catch {
      threw = true;
    }
    if (threw) {
      logPass('Exclusão com ID de cliente vazio é bloqueada');
    } else {
      logFail('Exclusão com ID de cliente vazio', 'Permitiu exclusão sem ID de cliente!');
    }
  } catch (e: any) {
    logFail('Exclusão com ID de cliente vazio', e.message);
  }

  // 4. Teste de proteção de integridade com OS vinculada
  try {
    const fakeClienteId = 'cli_with_os_123';
    const integrityCheck = await IntegridadeService.canDeleteCliente(fakeClienteId, testEmpresaId, testUserEmail);
    if (typeof integrityCheck.allowed === 'boolean') {
      logPass('Validação de integridade canDeleteCliente responde com formato válido');
    } else {
      logFail('Validação de integridade', 'canDeleteCliente não retornou allowed boolean');
    }
  } catch (e: any) {
    logFail('Validação de integridade', e.message);
  }

  // 5. Teste de mapeamento de stores do IndexedDB
  try {
    if (
      mapCollectionToStoreName('ordensServico') === 'serviceOrders' &&
      mapCollectionToStoreName('servicos_inteligentes') === 'servicos' &&
      mapCollectionToStoreName('precificacao') === 'precificacao' &&
      mapCollectionToStoreName('clientes') === 'clientes' &&
      mapCollectionToStoreName('equipamentos') === 'equipamentos' &&
      mapCollectionToStoreName('lixeira') === 'lixeira' &&
      mapCollectionToStoreName('financeiro') === 'financeiro' &&
      mapCollectionToStoreName('historicos') === 'historicos' &&
      mapCollectionToStoreName('relatorios') === 'relatorios' &&
      mapCollectionToStoreName('configuracoes') === 'configuracoes' &&
      mapCollectionToStoreName('company_profile') === 'company_profile'
    ) {
      logPass('Mapeamento de coleções para stores do IndexedDB está 100% correto e compatível');
    } else {
      logFail('mapCollectionToStoreName', 'Mapeamento incorreto de stores do IndexedDB');
    }
  } catch (e: any) {
    logFail('mapCollectionToStoreName', e.message);
  }

  // 6. Teste de preservação de tombstones (remaf_deleted_*) na limpeza de cache
  try {
    const tombstoneKey = `remaf_deleted_clientes_${testEmpresaId}`;
    safeStorage.setItem(tombstoneKey, JSON.stringify(['cli_deleted_1', 'cli_deleted_2']));
    safeStorage.setItem('remaf_cache_temp_test', 'cache_data');

    safeStorage.clearExpendableCache();

    const storedTombstone = safeStorage.getItem(tombstoneKey);
    if (storedTombstone && storedTombstone.includes('cli_deleted_1')) {
      logPass('Tombstones de exclusão (remaf_deleted_*) são preservadas após limpeza de cache');
    } else {
      logFail('Tombstones de exclusão', 'Tombstone foi indevidamente apagada pela limpeza de cache');
    }
  } catch (e: any) {
    logFail('Tombstones de exclusão', e.message);
  }

  console.log(`\n--- RESULTADO DOS TESTES DE EXCLUSÃO: ${passed} PASS, ${failed} FAIL ---\n`);
  return { passed, failed };
}
