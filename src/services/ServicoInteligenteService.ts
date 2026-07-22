/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Servico } from '../types';
import { FirestoreRepository } from './FirestoreRepository';

export const ServicoInteligenteService = {
  /**
   * Obtém todos os serviços inteligentes de um inquilino (empresaId) via FirestoreRepository
   */
  async getServicos(empresaId: string, userEmail?: string): Promise<Servico[]> {
    return FirestoreRepository.getAll<Servico>('servicos_inteligentes', empresaId, userEmail);
  },

  /**
   * Salva ou atualiza um serviço inteligente via FirestoreRepository
   */
  async saveServico(servicoData: Servico, userEmail?: string): Promise<Servico> {
    const timestamp = new Date().toISOString();
    const id = servicoData.id || 'srv_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    
    const servico: Servico = {
      ...servicoData,
      id,
      dataCriacao: servicoData.dataCriacao || timestamp,
      ultimaAtualizacao: timestamp,
      quantidadeUtilizacoes: servicoData.quantidadeUtilizacoes ?? 0,
      status: servicoData.status || 'Ativo',
      createdAt: servicoData.createdAt || timestamp,
      updatedAt: timestamp,
    };

    const saved = await FirestoreRepository.add<Servico>('servicos_inteligentes', servico, servico.empresaId, userEmail);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('servicos_updated', { detail: { empresaId: servico.empresaId } }));
    }

    return saved;
  },

  /**
   * Escuta em tempo real serviços inteligentes
   */
  listenServicos(empresaId: string, callback: (servicos: Servico[]) => void, userEmail?: string) {
    return FirestoreRepository.listen<Servico>('servicos_inteligentes', empresaId, callback, [], userEmail);
  },

  /**
   * Incrementa o contador de utilizações de um serviço inteligente
   */
  async registrarUtilizacao(id: string, empresaId: string, userEmail?: string): Promise<void> {
    try {
      const servicos = await this.getServicos(empresaId, userEmail);
      const servico = servicos.find(s => s.id === id);
      if (servico) {
        servico.quantidadeUtilizacoes = (servico.quantidadeUtilizacoes || 0) + 1;
        servico.ultimaUtilizacao = new Date().toISOString();
        await this.saveServico(servico, userEmail);
      }
    } catch (e) {
      console.warn('[ServicoInteligenteService] Erro ao registrar utilização do serviço:', e);
    }
  },

  /**
   * Exclui um serviço inteligente via FirestoreRepository
   */
  async deleteServico(id: string, empresaId: string, userEmail?: string): Promise<void> {
    await FirestoreRepository.delete('servicos_inteligentes', id, empresaId, userEmail);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('servicos_updated', { detail: { empresaId } }));
    }
  }
};
