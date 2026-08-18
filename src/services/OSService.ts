/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OrdemDeServico } from '../types';
import { FirestoreRepository, deleteLocalStoreItem } from './FirestoreRepository';
import { RecuperacaoService } from './RecuperacaoService';
import { fetchServiceOrderById, saveOrdemDeServico, deleteServiceOrder as deleteServiceOrderLocalIDB } from '../db';
import { LogService } from './LogService';

export const OrdemServicoService = {
  /**
   * Obtém todas as ordens de serviço do inquilino (Firestore como fonte oficial + sincronização de cache local).
   */
  async getOrdensServico(empresaId: string, userEmail?: string): Promise<OrdemDeServico[]> {
    if (!empresaId || typeof empresaId !== 'string' || !empresaId.trim()) {
      return [];
    }
    return FirestoreRepository.getAll<OrdemDeServico>('ordensServico', empresaId.trim(), userEmail);
  },

  /**
   * Obtém uma OS por ID
   */
  async getOrdemServicoById(id: string, empresaId: string, userEmail?: string): Promise<OrdemDeServico | null> {
    if (!id || !empresaId) return null;
    const cleanId = id.trim();
    const cleanEmpresaId = empresaId.trim();

    // 1. Tenta buscar no Firestore/Cache unificado
    const remote = await FirestoreRepository.get<OrdemDeServico>('ordensServico', cleanId, cleanEmpresaId, userEmail);
    if (remote) return remote;

    // 2. Fallback para IndexedDB local
    try {
      const local = await fetchServiceOrderById(cleanId, cleanEmpresaId);
      return local;
    } catch (_) {
      return null;
    }
  },

  /**
   * Salva ou atualiza uma OS em nuvem (Firestore) e localmente (IndexedDB / Cache)
   * Fluxo: OS -> OrdemServicoService -> FirestoreRepository -> Firestore -> Cache Local
   */
  async saveOrdemServico(osData: OrdemDeServico, userEmail?: string): Promise<OrdemDeServico> {
    const cleanEmpresaId = osData.empresaId?.trim();
    if (!cleanEmpresaId) {
      throw new Error('empresaId é obrigatório para salvar a Ordem de Serviço.');
    }

    const docId = osData.id || `os_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const preparedOS: OrdemDeServico = {
      ...osData,
      id: docId,
      empresaId: cleanEmpresaId,
      dataAbertura: osData.dataAbertura || new Date().toISOString(),
      horaAbertura: osData.horaAbertura || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: osData.status || 'Pendente',
      updatedAt: new Date().toISOString(),
    };

    // 1. Salva no FirestoreRepository (salva no cache local + grava no Firestore 'empresas/{empresaId}/ordensServico/{id}')
    const savedRemote = await FirestoreRepository.add<OrdemDeServico>(
      'ordensServico',
      preparedOS,
      cleanEmpresaId,
      userEmail
    );

    // 2. Mantém sincronizado o IndexedDB legado para compatibilidade total offline
    try {
      await saveOrdemDeServico(savedRemote);
    } catch (idbErr) {
      console.warn('[OSService] Aviso ao atualizar IndexedDB legado:', idbErr);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ordens_servico_updated', {
          detail: { empresaId: cleanEmpresaId, osId: savedRemote.id },
        })
      );
    }

    return savedRemote;
  },

  /**
   * Atualiza o status de uma Ordem de Serviço de forma atômica e sincronizada.
   */
  async updateStatus(
    id: string,
    empresaId: string,
    status: OrdemDeServico['status'],
    userEmail?: string
  ): Promise<OrdemDeServico | null> {
    if (!id || !empresaId) return null;
    const existing = await this.getOrdemServicoById(id, empresaId, userEmail);
    if (!existing) return null;

    const updated: OrdemDeServico = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
      dataConclusao: status === 'Concluído' ? (existing.dataConclusao || new Date().toISOString()) : existing.dataConclusao,
      horaConclusao: status === 'Concluído' ? (existing.horaConclusao || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })) : existing.horaConclusao,
    };

    return await this.saveOrdemServico(updated, userEmail);
  },

  /**
   * Gera o próximo número sequencial de OS considerando todas as OS da empresa.
   */
  async generateNextOSNumber(
    empresaId: string,
    customOrdersList?: OrdemDeServico[],
    userEmail?: string
  ): Promise<string> {
    const cleanEmpresaId = empresaId?.trim();
    if (!cleanEmpresaId) {
      throw new Error('empresaId é obrigatório para gerar o número da OS.');
    }
    const orders = customOrdersList && Array.isArray(customOrdersList)
      ? customOrdersList.filter(o => o.empresaId === cleanEmpresaId)
      : await this.getOrdensServico(cleanEmpresaId, userEmail);
    const nextNum = orders.length + 1;
    return `OS-${String(nextNum).padStart(4, '0')}`;
  },

  /**
   * Exclui uma Ordem de Serviço via Central de Recuperação (Soft Delete).
   *
   * FLUXO COMPLETO:
   * 1. Buscar dados completos da OS (Firestore ou IndexedDB)
   * 2. Preservar dados obrigatórios (id, empresaId, clienteId, clienteNome, identificacao/numeroOS, dadosOriginais)
   * 3. Criar registro na coleção 'lixeira'
   * 4. Excluir OS da coleção ativa 'ordensServico' no Firestore
   * 5. Remover OS do IndexedDB/cache local (deleteLocalStoreItem / deleteServiceOrder)
   * 6. Atualizar imediatamente a interface disparando os eventos globais
   */
  async deleteOrdemServico(id: string, empresaId: string, userEmail?: string): Promise<void> {
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new Error('ID da Ordem de Serviço é obrigatório para exclusão.');
    }
    if (!empresaId || typeof empresaId !== 'string' || !empresaId.trim()) {
      throw new Error('empresaId é obrigatório para exclusão da Ordem de Serviço.');
    }

    const cleanId = id.trim();
    const cleanEmpresaId = empresaId.trim();

    console.log('[DELETE OS] Iniciando exclusão via Central de Recuperação...', { osId: cleanId, empresaId: cleanEmpresaId });

    // 1. Busca dados completos da OS
    let osData: OrdemDeServico | null = null;
    try {
      osData = await FirestoreRepository.get<OrdemDeServico>('ordensServico', cleanId, cleanEmpresaId, userEmail);
    } catch (e) {
      console.warn('[DELETE OS] Aviso ao buscar do FirestoreRepository:', e);
    }

    if (!osData) {
      try {
        osData = await fetchServiceOrderById(cleanId, cleanEmpresaId);
      } catch (e) {
        console.warn('[DELETE OS] Aviso ao buscar do IndexedDB local:', e);
      }
    }

    // Se ainda não encontrou, monta registro básico para não travar o soft delete
    const finalData = osData || {
      id: cleanId,
      empresaId: cleanEmpresaId,
      numeroOS: cleanId,
      clienteNome: 'Ordem de Serviço',
      clienteId: '',
    };

    const nomeIdentificador = finalData.clienteNome || (finalData as any).cliente || `OS ${finalData.numeroOS || cleanId}`;
    const identificacao = finalData.numeroOS || cleanId;

    // 2. Mover para a Lixeira via RecuperacaoService (Grava em 'lixeira' e remove de 'ordensServico' no Firestore)
    // Se a exclusão no Firestore falhar, o RecuperacaoService/FirestoreRepository lança erro (Fail-Closed)
    await RecuperacaoService.softDeleteRecord(
      'ordensServico',
      cleanId,
      'Ordem de Serviço',
      nomeIdentificador,
      identificacao,
      cleanEmpresaId,
      userEmail,
      finalData
    );

    // 3. Garantir limpeza total no IndexedDB local
    try {
      await deleteServiceOrderLocalIDB(cleanId, cleanEmpresaId);
    } catch (e) {
      console.warn('[DELETE OS] Aviso ao remover do IndexedDB direto:', e);
    }

    // 4. Limpar cache local (IndexedDB e safeStorage)
    try {
      await deleteLocalStoreItem('ordensServico', cleanId, cleanEmpresaId);
      await deleteLocalStoreItem('serviceOrders', cleanId, cleanEmpresaId);
    } catch (e) {
      console.warn('[DELETE OS] Aviso ao limpar caches de store:', e);
    }

    console.log('[DELETE OS] Sucesso: OS movida para a lixeira e removida de ativos/cache local.', {
      osId: cleanId,
      empresaId: cleanEmpresaId,
    });

    // 5. Atualizar imediatamente a interface
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ordens_servico_updated', {
          detail: { empresaId: cleanEmpresaId, deletedId: cleanId },
        })
      );
      window.dispatchEvent(
        new CustomEvent('lixeira_updated', {
          detail: { empresaId: cleanEmpresaId },
        })
      );
      window.dispatchEvent(
        new CustomEvent('clientes_updated', {
          detail: { empresaId: cleanEmpresaId },
        })
      );
    }
  },
};
