/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { openDB } from '../db';

export const StorageService = {
  /**
   * Salva ou adiciona um objeto em uma store específica do IndexedDB.
   */
  async salvar<T>(storeName: string, item: T): Promise<T> {
    const db = await openDB();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Atualiza um objeto em uma store específica do IndexedDB (mesmo que salvar).
   */
  async atualizar<T>(storeName: string, item: T): Promise<T> {
    return this.salvar(storeName, item);
  },

  /**
   * Exclui um objeto pelo id de uma store específica.
   */
  async excluir(storeName: string, id: string): Promise<void> {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Busca um objeto pelo id de uma store específica.
   */
  async buscar<T>(storeName: string, id: string): Promise<T | null> {
    const db = await openDB();
    return new Promise<T | null>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve((request.result as T) || null);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Busca todos os itens de uma store específica.
   */
  async buscarTodos<T>(storeName: string): Promise<T[]> {
    const db = await openDB();
    return new Promise<T[]>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as T[]) || []);
      request.onerror = () => reject(request.error);
    });
  }
};
