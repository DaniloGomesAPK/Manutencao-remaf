/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Servico } from '../types';
import { openDB, SERVICOS_INTELIGENTES_STORE_NAME } from '../db';

const LOCAL_STORAGE_PREFIX = 'remaf_servico_inteligente_';

export const ServicoInteligenteService = {
  /**
   * Obtém todos os serviços inteligentes de um inquilino (empresaId)
   */
  async getServicos(empresaId: string): Promise<Servico[]> {
    try {
      const db = await openDB();
      const servicos = await new Promise<Servico[]>((resolve, reject) => {
        const transaction = db.transaction(SERVICOS_INTELIGENTES_STORE_NAME, 'readonly');
        const store = transaction.objectStore(SERVICOS_INTELIGENTES_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      // Filtra por empresaId
      const tenantServicos = servicos.filter(s => s.empresaId === empresaId);

      // Cache em localStorage
      try {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}list_${empresaId}`, JSON.stringify(tenantServicos));
      } catch (_) {}

      return tenantServicos;
    } catch (err) {
      console.warn('Erro ao ler serviços inteligentes do IndexedDB, tentando localStorage:', err);
      try {
        const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}list_${empresaId}`);
        if (cached) {
          return JSON.parse(cached) as Servico[];
        }
      } catch (_) {}
      return [];
    }
  },

  /**
   * Salva ou atualiza um serviço inteligente
   */
  async saveServico(servicoData: Servico): Promise<Servico> {
    const timestamp = new Date().toISOString();
    const id = servicoData.id || 'srv_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    
    const servico: Servico = {
      ...servicoData,
      id,
      dataCriacao: servicoData.dataCriacao || timestamp,
      ultimaAtualizacao: timestamp,
      quantidadeUtilizacoes: servicoData.quantidadeUtilizacoes ?? 0,
      status: servicoData.status || 'Ativo',
    };

    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(SERVICOS_INTELIGENTES_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SERVICOS_INTELIGENTES_STORE_NAME);
        const request = store.put(servico);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Recarrega e atualiza o cache do LocalStorage em background
      await this.getServicos(servico.empresaId);

      // Despacha evento de atualização
      window.dispatchEvent(new CustomEvent('servicos_updated', { detail: { empresaId: servico.empresaId } }));
    } catch (error) {
      console.error('Erro ao salvar serviço inteligente no IndexedDB:', error);
      throw error;
    }

    return servico;
  },

  /**
   * Exclui um serviço inteligente
   */
  async deleteServico(id: string, empresaId: string): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(SERVICOS_INTELIGENTES_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SERVICOS_INTELIGENTES_STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Recarrega e atualiza o cache do LocalStorage em background
      await this.getServicos(empresaId);

      // Despacha evento de atualização
      window.dispatchEvent(new CustomEvent('servicos_updated', { detail: { empresaId } }));
    } catch (error) {
      console.error('Erro ao excluir serviço inteligente no IndexedDB:', error);
      throw error;
    }
  },

  /**
   * Registra a utilização de um serviço inteligente em uma OS
   */
  async registrarUtilizacao(id: string, empresaId: string): Promise<void> {
    try {
      const servicos = await this.getServicos(empresaId);
      const servico = servicos.find(s => s.id === id);
      if (!servico) return;

      const updated: Servico = {
        ...servico,
        quantidadeUtilizacoes: (servico.quantidadeUtilizacoes || 0) + 1,
        ultimaUtilizacao: new Date().toISOString(),
        ultimaAtualizacao: new Date().toISOString()
      };

      await this.saveServico(updated);
    } catch (err) {
      console.error('Erro ao registrar utilização do serviço inteligente:', err);
    }
  }
};
