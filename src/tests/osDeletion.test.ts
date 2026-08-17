/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OrdemServicoService } from '../services/OSService';
import { getTenantCollectionPath, mapCollectionToStoreName } from '../services/FirestoreRepository';
import { IntegridadeService } from '../services/IntegridadeService';
import { safeStorage } from '../utils/safeStorage';
import { Cliente, OrdemDeServico } from '../types';

export async function runOSDeletionTests() {
  console.log('\n--- INICIANDO TESTES DO FLUXO DE EXCLUSÃO DE OS E ATUALIZAÇÃO DE VÍNCULOS ---');
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

  const testEmpresaId = 'emp_test_os_deletion_123';
  const testUserEmail = 'tester@osdeletion.com';

  // 1. Teste de caminho oficial de isolamento multiempresa para ordensServico
  try {
    const path = getTenantCollectionPath('ordensServico', testEmpresaId);
    if (path === `empresas/${testEmpresaId}/ordensServico`) {
      logPass(`Caminho oficial do Firestore para ordensServico correto: ${path}`);
    } else {
      logFail('Caminho oficial do Firestore (ordensServico)', `Esperado: empresas/${testEmpresaId}/ordensServico, obtido: ${path}`);
    }
  } catch (e: any) {
    logFail('Caminho oficial do Firestore (ordensServico)', e.message);
  }

  // 2. Teste de validação de tenant nulo/inválido na exclusão de OS
  try {
    let threw = false;
    try {
      await OrdemServicoService.deleteOrdemServico('os_123', '');
    } catch {
      threw = true;
    }
    if (threw) {
      logPass('Exclusão de OS com empresaId vazio é bloqueada');
    } else {
      logFail('Exclusão de OS com empresaId vazio', 'Permitiu exclusão sem empresaId!');
    }
  } catch (e: any) {
    logFail('Exclusão de OS com empresaId vazio', e.message);
  }

  // 3. Teste de validação de ID da OS vazio
  try {
    let threw = false;
    try {
      await OrdemServicoService.deleteOrdemServico('', testEmpresaId);
    } catch {
      threw = true;
    }
    if (threw) {
      logPass('Exclusão de OS com ID vazio é bloqueada');
    } else {
      logFail('Exclusão de OS com ID vazio', 'Permitiu exclusão sem ID de OS!');
    }
  } catch (e: any) {
    logFail('Exclusão de OS com ID vazio', e.message);
  }

  // 4. Teste de integridade referencial: Cliente com OS ativa bloqueado -> OS excluída -> Cliente liberado
  try {
    const fakeClienteId = 'cli_teste_vinculo_os_99';
    const fakeClienteNome = 'Cliente Teste Vinculo OS';
    const fakeOSId = 'os_teste_vinculo_99';

    // Simula cliente e OS em memória / cache local
    const fakeCliente: Partial<Cliente> = {
      id: fakeClienteId,
      empresaId: testEmpresaId,
      nome: fakeClienteNome,
      documento: '11.222.333/0001-44',
      telefone: '(11) 98888-7777',
      whatsapp: '(11) 98888-7777',
      email: 'cliente@teste.com',
      endereco: 'Rua Teste',
      numero: '100',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01000-000',
    };

    const fakeOS: Partial<OrdemDeServico> = {
      id: fakeOSId,
      empresaId: testEmpresaId,
      numeroOS: 'OS-9999',
      clienteId: fakeClienteId,
      clienteNome: fakeClienteNome,
      status: 'Pendente',
      dataAbertura: new Date().toISOString(),
      horaAbertura: '10:00',
      equipamento: 'Impressora',
      placa: '',
      tecnico: 'Técnico Teste',
    };

    // Salva cliente e OS nas coleções locais de teste
    safeStorage.setItem(`remaf_cache_clientes_${testEmpresaId}`, JSON.stringify([fakeCliente]));
    safeStorage.setItem(`remaf_cache_ordensServico_${testEmpresaId}`, JSON.stringify([fakeOS]));
    safeStorage.setItem(`remaf_cache_equipamentos_${testEmpresaId}`, JSON.stringify([]));
    safeStorage.setItem(`remaf_cache_financeiro_${testEmpresaId}`, JSON.stringify([]));

    // Passo 1: Verificar se cliente com OS ativa está bloqueado
    const check1 = await IntegridadeService.canDeleteCliente(fakeClienteId, testEmpresaId, testUserEmail);
    if (!check1.allowed && check1.details?.ordensServico === 1) {
      logPass('Cenário 1: Cliente com OS vinculada é devidamente BLOQUEADO para exclusão');
    } else {
      logFail('Cenário 1', `Esperado bloqueio com 1 OS vinculada. Resultado: ${JSON.stringify(check1)}`);
    }

    // Passo 2: Executar exclusão da OS simulando tombstone e remoção dos registros ativos
    const deletedList = safeStorage.getItem(`remaf_deleted_ordensServico_${testEmpresaId}`);
    const delArray: string[] = deletedList ? JSON.parse(deletedList) : [];
    delArray.push(fakeOSId);
    safeStorage.setItem(`remaf_deleted_ordensServico_${testEmpresaId}`, JSON.stringify(delArray));
    safeStorage.setItem(`remaf_cache_ordensServico_${testEmpresaId}`, JSON.stringify([]));

    // Passo 3: Verificar se cliente agora está LIBERADO para exclusão
    const check2 = await IntegridadeService.canDeleteCliente(fakeClienteId, testEmpresaId, testUserEmail);
    if (check2.allowed) {
      logPass('Cenário 2: Após exclusão da OS, cliente é LIBERADO para exclusão (sem vínculos ativos)');
    } else {
      logFail('Cenário 2', `Cliente continuou bloqueado indevidamente após exclusão da OS: ${JSON.stringify(check2)}`);
    }

    // Limpeza dos mocks de teste
    safeStorage.removeItem(`remaf_cache_clientes_${testEmpresaId}`);
    safeStorage.removeItem(`remaf_cache_ordensServico_${testEmpresaId}`);
    safeStorage.removeItem(`remaf_cache_equipamentos_${testEmpresaId}`);
    safeStorage.removeItem(`remaf_cache_financeiro_${testEmpresaId}`);
    safeStorage.removeItem(`remaf_deleted_ordensServico_${testEmpresaId}`);
  } catch (e: any) {
    logFail('Teste integrado de exclusão de OS e validação de vínculo', e.message);
  }

  // 5. Teste de mapeamento do store da lixeira e ordensServico
  try {
    if (
      mapCollectionToStoreName('ordensServico') === 'serviceOrders' &&
      mapCollectionToStoreName('serviceOrders') === 'serviceOrders' &&
      mapCollectionToStoreName('lixeira') === 'lixeira'
    ) {
      logPass('Mapeamento de ordensServico e lixeira validado');
    } else {
      logFail('mapCollectionToStoreName', 'Falha no mapeamento das stores');
    }
  } catch (e: any) {
    logFail('mapCollectionToStoreName', e.message);
  }

  console.log(`\n--- RESULTADO DOS TESTES DE EXCLUSÃO DE OS: ${passed} PASS, ${failed} FAIL ---\n`);
  return { passed, failed };
}
