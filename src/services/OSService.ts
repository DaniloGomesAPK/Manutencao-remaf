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
   * Obtém todas as ordens de serviço do inquilino
   */
  async getOrdensServico(empresaId: string, userEmail?: string): Promise<OrdemDeServico[]> {
    return FirestoreRepository.getAll<OrdemDeServico>('ordensServico', empresaId, userEmail);
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
   */
  async saveOrdemServico(osData: OrdemDeServico, userEmail?: string): Promise<OrdemDeServico> {
    const cleanEmpresaId = osData.empresaId?.trim();
    if (!cleanEmpresaId) {
      throw new Error('empresaId é obrigatório para salvar a Ordem de Serviço.');
    }

    // 1. Salva no IndexedDB local para manter compatibilidade
    const savedLocal = await saveOrdemDeServico(osData);

    // 2. Salva no FirestoreRepository (sincroniza Firestore + cache)
    const savedRemote = await FirestoreRepository.add<OrdemDeServico>(
      'ordensServico',
      savedLocal,
      cleanEmpresaId,
      userEmail
    );

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
