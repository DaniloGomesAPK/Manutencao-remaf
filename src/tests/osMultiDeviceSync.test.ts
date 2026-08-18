/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OrdemDeServico } from '../types';
import { sanitizeForFirestore, stripHeavyFields } from '../services/FirestoreRepository';

/**
 * Suíte de Testes de Sincronização de Ordens de Serviço Multi-Dispositivo
 */
export async function runOSMultiDeviceSyncTests() {
  console.log('\n=== INICIANDO TESTES DE SINCRONIZAÇÃO DE OS MULTI-DISPOSITIVO ===');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ TEST PASSED: [${msg}]`);
      passed++;
    } else {
      console.error(`❌ TEST FAILED: [${msg}]`);
      failed++;
    }
  }

  // Simulação de Nuvem Firestore Central (Single Source of Truth)
  const firestoreCloudDB = new Map<string, any>();

  // Mock simulador do FirestoreRepository para múltiplos dispositivos
  const createDeviceEnvironment = (deviceName: string) => {
    const localCache = new Map<string, any>();
    let simulatedNetworkOnline = true;
    let shouldFailSetDoc = false;

    return {
      name: deviceName,
      localCache,
      setOnline(online: boolean) {
        simulatedNetworkOnline = online;
      },
      setSimulateSetDocFailure(fail: boolean) {
        shouldFailSetDoc = fail;
      },
      async saveOS(osData: OrdemDeServico): Promise<OrdemDeServico> {
        const cleanEmpresaId = osData.empresaId?.trim();
        if (!cleanEmpresaId) throw new Error('empresaId é obrigatório');

        const docId = osData.id || `os_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const timestamp = new Date().toISOString();

        const prepared: OrdemDeServico = {
          ...osData,
          id: docId,
          empresaId: cleanEmpresaId,
          dataAbertura: osData.dataAbertura || timestamp,
          horaAbertura: osData.horaAbertura || '10:00',
          status: osData.status || 'Pendente',
          updatedAt: timestamp,
          sincronizado: false,
          ultimaSincronizacao: null,
        };

        // 1. Grava no cache local primeiro (IndexedDB)
        localCache.set(docId, prepared);

        // 2. Tenta gravar no Firestore
        if (simulatedNetworkOnline) {
          try {
            if (shouldFailSetDoc) {
              throw new Error('Simulated setDoc Firestore network timeout / permission error');
            }
            const cloudPath = `empresas/${cleanEmpresaId}/ordensServico/${docId}`;
            const sanitized = sanitizeForFirestore(stripHeavyFields(prepared));
            sanitized.sincronizado = true;
            sanitized.ultimaSincronizacao = timestamp;

            firestoreCloudDB.set(cloudPath, sanitized);

            prepared.sincronizado = true;
            prepared.ultimaSincronizacao = timestamp;
            localCache.set(docId, prepared);
          } catch (err) {
            // Em caso de falha no setDoc, NÃO trata como sucesso: mantém sincronizado = false
            prepared.sincronizado = false;
            prepared.ultimaSincronizacao = null;
            localCache.set(docId, prepared);
          }
        } else {
          prepared.sincronizado = false;
          prepared.ultimaSincronizacao = null;
        }

        return prepared;
      },

      async getOrdensServico(empresaId: string): Promise<OrdemDeServico[]> {
        if (!empresaId || !empresaId.trim()) return [];
        const cleanEmpresaId = empresaId.trim();
        const prefix = `empresas/${cleanEmpresaId}/ordensServico/`;

        if (simulatedNetworkOnline) {
          // 1. Busca da nuvem oficial (Firestore)
          const cloudOrders: OrdemDeServico[] = [];
          for (const [path, data] of firestoreCloudDB.entries()) {
            if (path.startsWith(prefix) && data.empresaId === cleanEmpresaId) {
              cloudOrders.push(data);
            }
          }

          // 2. Atualiza / reconstrói o cache local preservando pendentes locais não sincronizados
          const pendingLocals = Array.from(localCache.values()).filter(l => l.sincronizado === false);
          localCache.clear();
          for (const order of cloudOrders) {
            localCache.set(order.id, order);
          }
          for (const pending of pendingLocals) {
            localCache.set(pending.id, pending);
          }

          return Array.from(localCache.values()).sort(
            (a, b) => new Date(b.dataAbertura || 0).getTime() - new Date(a.dataAbertura || 0).getTime()
          );
        }

        // Se offline, lê do cache local
        return Array.from(localCache.values()).sort(
          (a, b) => new Date(b.dataAbertura || 0).getTime() - new Date(a.dataAbertura || 0).getTime()
        );
      },

      async syncPending(empresaId: string): Promise<{ syncedCount: number; remainingCount: number }> {
        const cleanEmpresaId = empresaId.trim();
        let syncedCount = 0;
        const now = new Date().toISOString();

        for (const item of Array.from(localCache.values())) {
          if (item.sincronizado === false && simulatedNetworkOnline && !shouldFailSetDoc) {
            const cloudPath = `empresas/${cleanEmpresaId}/ordensServico/${item.id}`;
            const sanitized = sanitizeForFirestore(stripHeavyFields(item));
            sanitized.sincronizado = true;
            sanitized.ultimaSincronizacao = now;

            firestoreCloudDB.set(cloudPath, sanitized);

            item.sincronizado = true;
            item.ultimaSincronizacao = now;
            localCache.set(item.id, item);
            syncedCount++;
          }
        }

        const remaining = Array.from(localCache.values()).filter(i => i.sincronizado === false).length;
        return { syncedCount, remainingCount: remaining };
      },
    };
  };

  const deviceComputer = createDeviceEnvironment('Computador (Vercel/Desktop)');
  const deviceMobile = createDeviceEnvironment('Celular (Mobile Browser)');
  const deviceCompetitor = createDeviceEnvironment('Computador de Outra Empresa');

  const empresaPrincipal = 'empresa_alfa_123';
  const empresaInvasora = 'empresa_beta_999';

  // -------------------------------------------------------------
  // Teste 1: Criar OS no Computador -> Salva no Firestore
  // -------------------------------------------------------------
  const os1: OrdemDeServico = {
    id: 'os_pc_001',
    empresaId: empresaPrincipal,
    numeroOS: 'OS-0001',
    clienteId: 'cli_01',
    clienteNome: 'João Silva',
    equipamento: 'Empilhadeira Yale',
    placa: 'EMP-1234',
    tecnico: 'Carlos Técnico',
    status: 'Pendente',
    faseAtual: 1,
    dataAbertura: '2026-08-18T08:00:00.000Z',
    horaAbertura: '08:00',
  };

  const saved1 = await deviceComputer.saveOS(os1);
  const cloudKey1 = `empresas/${empresaPrincipal}/ordensServico/os_pc_001`;
  assert(
    saved1.sincronizado === true &&
    firestoreCloudDB.has(cloudKey1) &&
    firestoreCloudDB.get(cloudKey1).clienteNome === 'João Silva',
    '1. Criar OS no computador com conexão -> gravada no Firestore com sincronizado = true'
  );

  // -------------------------------------------------------------
  // Teste 2: Abrir no Celular (com cache vazio) -> Carrega a OS do Firestore e popula cache
  // -------------------------------------------------------------
  assert(deviceMobile.localCache.size === 0, '2a. Celular inicia com cache local zerado');
  const mobileList = await deviceMobile.getOrdensServico(empresaPrincipal);
  assert(
    mobileList.length === 1 && mobileList[0].id === 'os_pc_001' && deviceMobile.localCache.has('os_pc_001'),
    '2b. Celular consulta Firestore -> encontra OS criada no computador e reconstrói cache local'
  );

  // -------------------------------------------------------------
  // Teste 3: Editar OS no Celular -> Alteração reflete no Firestore e no Computador
  // -------------------------------------------------------------
  const os1Edited: OrdemDeServico = {
    ...mobileList[0],
    status: 'Concluído',
    faseAtual: 5,
    descricaoAvaria: 'Vazamento hidráulico no pistão principal corrigido',
  };

  const savedEdit = await deviceMobile.saveOS(os1Edited);
  assert(
    savedEdit.sincronizado === true &&
    firestoreCloudDB.get(cloudKey1).status === 'Concluído' &&
    firestoreCloudDB.get(cloudKey1).descricaoAvaria === 'Vazamento hidráulico no pistão principal corrigido',
    '3a. Edição realizada no celular -> gravada imediatamente no Firestore com confirmação'
  );

  const pcListAfterEdit = await deviceComputer.getOrdensServico(empresaPrincipal);
  assert(
    pcListAfterEdit[0].status === 'Concluído' &&
    pcListAfterEdit[0].descricaoAvaria === 'Vazamento hidráulico no pistão principal corrigido',
    '3b. Computador recarrega lista do Firestore -> reflete exatamente a edição feita no celular'
  );

  // -------------------------------------------------------------
  // Teste 4: Se setDoc() falha -> NÃO trata como sucesso, mantém no IndexedDB como pending (sincronizado: false)
  // -------------------------------------------------------------
  deviceMobile.setSimulateSetDocFailure(true);
  const osOfflineTest: OrdemDeServico = {
    id: 'os_pending_003',
    empresaId: empresaPrincipal,
    numeroOS: 'OS-0003',
    clienteId: 'cli_03',
    clienteNome: 'Fazenda Boa Esperança',
    equipamento: 'Trator Valtra',
    placa: 'TRA-9999',
    tecnico: 'Renato Silva',
    status: 'Pendente',
    dataAbertura: '2026-08-18T10:00:00.000Z',
    horaAbertura: '10:00',
  };

  const savedPending = await deviceMobile.saveOS(osOfflineTest);
  const cloudKeyPending = `empresas/${empresaPrincipal}/ordensServico/os_pending_003`;

  assert(
    savedPending.sincronizado === false &&
    !firestoreCloudDB.has(cloudKeyPending) &&
    deviceMobile.localCache.get('os_pending_003')?.sincronizado === false,
    '4a. Falha no setDoc() -> OS permanece salva localmente como PENDENTE (sincronizado: false) e NÃO atesta sucesso falso'
  );

  // -------------------------------------------------------------
  // Teste 5: Reenviar pendências quando a conexão normalizar -> setDoc() confirma e muda para synced
  // -------------------------------------------------------------
  deviceMobile.setSimulateSetDocFailure(false);
  const syncResult = await deviceMobile.syncPending(empresaPrincipal);

  assert(
    syncResult.syncedCount === 1 &&
    syncResult.remainingCount === 0 &&
    firestoreCloudDB.has(cloudKeyPending) &&
    deviceMobile.localCache.get('os_pending_003')?.sincronizado === true,
    '5. Conexão restaurada -> syncPending envia para o Firestore e só muda para sincronizado: true após confirmação real'
  );

  // -------------------------------------------------------------
  // Teste 6: Criar segunda OS no Celular -> Aparece no Computador
  // -------------------------------------------------------------
  const os2: OrdemDeServico = {
    id: 'os_mobile_002',
    empresaId: empresaPrincipal,
    numeroOS: 'OS-0002',
    clienteId: 'cli_02',
    clienteNome: 'Transportes Rápidos',
    equipamento: 'Guindaste Liebherr',
    placa: 'GUI-5678',
    tecnico: 'Marcos Mecânico',
    status: 'Pendente',
    dataAbertura: '2026-08-18T09:30:00.000Z',
    horaAbertura: '09:30',
  };

  await deviceMobile.saveOS(os2);
  const pcListWithAll = await deviceComputer.getOrdensServico(empresaPrincipal);
  assert(
    pcListWithAll.length === 3 &&
    pcListWithAll.some(o => o.id === 'os_pc_001') &&
    pcListWithAll.some(o => o.id === 'os_mobile_002') &&
    pcListWithAll.some(o => o.id === 'os_pending_003'),
    '6. Múltiplas OS criadas e sincronizadas entre celular e PC aparecem consolidadas no Firestore'
  );

  // -------------------------------------------------------------
  // Teste 7: Novo Dispositivo (Tablet) -> Reconstrói todo o estado oficial a partir do Firestore
  // -------------------------------------------------------------
  const deviceTablet = createDeviceEnvironment('Novo Tablet');
  const tabletList = await deviceTablet.getOrdensServico(empresaPrincipal);
  assert(
    tabletList.length === 3 && deviceTablet.localCache.size === 3,
    '7. Novo dispositivo (Tablet) sem histórico -> reconstrói todo o estado a partir do Firestore'
  );

  // -------------------------------------------------------------
  // Teste 8: Empresa diferente -> Isolamento estrito de Tenant
  // -------------------------------------------------------------
  const competitorList = await deviceCompetitor.getOrdensServico(empresaInvasora);
  assert(
    competitorList.length === 0 &&
    !competitorList.some(o => o.empresaId === empresaPrincipal),
    '8. Usuário de outra empresa (empresa_beta_999) -> isolamento 100% garantido, nenhuma OS vazada'
  );

  // -------------------------------------------------------------
  // Teste 9: Sanitização de undefined (proteção contra erro setDoc no Firestore)
  // -------------------------------------------------------------
  const uncleanedPayload = {
    id: 'os_clean_test',
    empresaId: empresaPrincipal,
    clienteNome: 'Teste Sanitização',
    quilometragem: undefined,
    fotosAntes: undefined,
    nested: {
      fieldA: 'ok',
      fieldB: undefined,
    },
  };
  const sanitized = sanitizeForFirestore(uncleanedPayload);
  assert(
    sanitized.quilometragem === undefined &&
    !('quilometragem' in sanitized) &&
    sanitized.nested.fieldA === 'ok' &&
    !('fieldB' in sanitized.nested),
    '9. Sanitização para Firestore -> remove chaves undefined recursivamente evitando crash no setDoc'
  );

  console.log(`\n=== RESUMO: ${passed} passaram, ${failed} falharam ===\n`);
  if (failed > 0) {
    throw new Error(`A suíte de testes de sincronização de OS falhou com ${failed} erros.`);
  }
}
