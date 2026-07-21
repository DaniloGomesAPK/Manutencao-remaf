/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Equipamento } from '../types';
import { openDB, EQUIPAMENTOS_STORE_NAME } from '../db';
import { ClienteService } from './ClienteService';

const LOCAL_STORAGE_PREFIX = 'remaf_equipamento_';

export const EquipamentoService = {
  /**
   * Gera um UUID para identificador do Equipamento
   */
  generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback manual para UUID v4 compatível
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  /**
   * Obtém todos os equipamentos de um determinado inquilino (empresaId)
   */
  async getEquipamentos(empresaId: string): Promise<Equipamento[]> {
    try {
      const db = await openDB();
      const equipamentos = await new Promise<Equipamento[]>((resolve, reject) => {
        const transaction = db.transaction(EQUIPAMENTOS_STORE_NAME, 'readonly');
        const store = transaction.objectStore(EQUIPAMENTOS_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      // Filtra por empresaId
      const tenantEquipamentos = equipamentos.filter(e => e.empresaId === empresaId);

      // Enriquecer com o nome do cliente a partir do cache ou do ClienteService
      const clientes = await ClienteService.getClientes(empresaId);
      const clienteMap = new Map(clientes.map(c => [c.id, c.nome]));
      
      const enriched = tenantEquipamentos.map(e => ({
        ...e,
        clienteNome: e.clienteId ? clienteMap.get(e.clienteId) || 'Cliente não encontrado' : 'Sem cliente'
      }));

      // Cache em localStorage
      try {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}list_${empresaId}`, JSON.stringify(enriched));
      } catch (_) {}

      return enriched;
    } catch (err) {
      console.warn('Erro ao ler equipamentos do IndexedDB, tentando localStorage:', err);
      try {
        const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}list_${empresaId}`);
        if (cached) {
          return JSON.parse(cached) as Equipamento[];
        }
      } catch (_) {}
      return [];
    }
  },

  /**
   * Salva ou atualiza um equipamento
   */
  async saveEquipamento(equipamentoData: Equipamento): Promise<Equipamento> {
    const timestamp = new Date().toISOString();
    const id = equipamentoData.id || this.generateUUID(); // Sempre gerando UUID único se for novo
    
    const equipamento: Equipamento = {
      ...equipamentoData,
      id,
      createdAt: equipamentoData.createdAt || timestamp,
      updatedAt: timestamp,
    };

    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(EQUIPAMENTOS_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(EQUIPAMENTOS_STORE_NAME);
        const request = store.put(equipamento);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Recarrega e atualiza o cache do LocalStorage em background
      await this.getEquipamentos(equipamento.empresaId);

      // Despacha evento de atualização
      window.dispatchEvent(new CustomEvent('equipamentos_updated', { detail: { empresaId: equipamento.empresaId } }));
    } catch (error) {
      console.error('Erro ao salvar equipamento no IndexedDB:', error);
      throw error;
    }

    return equipamento;
  },

  /**
   * Exclui um equipamento
   */
  async deleteEquipamento(id: string, empresaId: string): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(EQUIPAMENTOS_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(EQUIPAMENTOS_STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Recarrega e atualiza o cache do LocalStorage em background
      await this.getEquipamentos(empresaId);

      // Despacha evento de atualização
      window.dispatchEvent(new CustomEvent('equipamentos_updated', { detail: { empresaId } }));
    } catch (error) {
      console.error('Erro ao excluir equipamento no IndexedDB:', error);
      throw error;
    }
  },

  /**
   * Pesquisa equipamentos por placa, chassi, número de série ou nome do cliente
   */
  async searchEquipamentos(empresaId: string, term: string): Promise<Equipamento[]> {
    const all = await this.getEquipamentos(empresaId);
    if (!term || !term.trim()) return all;

    const normalizedTerm = term.toLowerCase().trim();
    return all.filter(e => 
      e.placa.toLowerCase().includes(normalizedTerm) ||
      e.chassi.toLowerCase().includes(normalizedTerm) ||
      e.numeroSerie.toLowerCase().includes(normalizedTerm) ||
      (e.clienteNome && e.clienteNome.toLowerCase().includes(normalizedTerm)) ||
      e.tipo.toLowerCase().includes(normalizedTerm) ||
      e.fabricante.toLowerCase().includes(normalizedTerm) ||
      e.modelo.toLowerCase().includes(normalizedTerm)
    );
  }
};
