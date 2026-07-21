/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Cliente } from '../types';
import { openDB, CLIENTES_STORE_NAME } from '../db';

const LOCAL_STORAGE_PREFIX = 'remaf_cliente_';

export const ClienteService = {
  /**
   * Obtém todos os clientes de um determinado inquilino (empresaId)
   */
  async getClientes(empresaId: string): Promise<Cliente[]> {
    try {
      const db = await openDB();
      const clientes = await new Promise<Cliente[]>((resolve, reject) => {
        const transaction = db.transaction(CLIENTES_STORE_NAME, 'readonly');
        const store = transaction.objectStore(CLIENTES_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      // Filtra por empresaId
      const tenantClientes = clientes.filter(c => c.empresaId === empresaId);

      // Cache em localStorage
      try {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}list_${empresaId}`, JSON.stringify(tenantClientes));
      } catch (_) {}

      return tenantClientes;
    } catch (err) {
      console.warn('Erro ao ler clientes do IndexedDB, tentando localStorage:', err);
      try {
        const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}list_${empresaId}`);
        if (cached) {
          return JSON.parse(cached) as Cliente[];
        }
      } catch (_) {}
      return [];
    }
  },

  /**
   * Salva ou atualiza um cliente
   */
  async saveCliente(clienteData: Cliente): Promise<Cliente> {
    const timestamp = new Date().toISOString();
    const id = clienteData.id || 'cli_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    
    const cliente: Cliente = {
      ...clienteData,
      id,
      createdAt: clienteData.createdAt || timestamp,
      updatedAt: timestamp,
    };

    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(CLIENTES_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(CLIENTES_STORE_NAME);
        const request = store.put(cliente);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Recarrega e atualiza o cache do LocalStorage em background
      await this.getClientes(cliente.empresaId);

      // Despacha evento de atualização
      window.dispatchEvent(new CustomEvent('clientes_updated', { detail: { empresaId: cliente.empresaId } }));
    } catch (error) {
      console.error('Erro ao salvar cliente no IndexedDB:', error);
      throw error;
    }

    return cliente;
  },

  /**
   * Exclui um cliente
   */
  async deleteCliente(id: string, empresaId: string): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(CLIENTES_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(CLIENTES_STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Recarrega e atualiza o cache do LocalStorage em background
      await this.getClientes(empresaId);

      // Despacha evento de atualização
      window.dispatchEvent(new CustomEvent('clientes_updated', { detail: { empresaId } }));
    } catch (error) {
      console.error('Erro ao excluir cliente no IndexedDB:', error);
      throw error;
    }
  },

  /**
   * Pesquisa clientes por termo (Nome, CPF/CNPJ, Telefone)
   */
  async searchClientes(empresaId: string, term: string): Promise<Cliente[]> {
    const all = await this.getClientes(empresaId);
    if (!term || !term.trim()) return all;

    const normalizedTerm = term.toLowerCase().trim();
    return all.filter(c => 
      c.nome.toLowerCase().includes(normalizedTerm) ||
      c.documento.toLowerCase().includes(normalizedTerm) ||
      c.telefone.toLowerCase().includes(normalizedTerm) ||
      c.whatsapp.toLowerCase().includes(normalizedTerm)
    );
  }
};
