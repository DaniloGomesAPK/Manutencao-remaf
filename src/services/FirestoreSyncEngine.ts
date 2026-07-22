/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FirestoreRepository, ALL_STORES, StoreName, SyncStatusInfo } from './FirestoreRepository';

export { ALL_STORES };
export type { StoreName, SyncStatusInfo };

/**
 * Motores de Sincronização FirestoreSyncEngine
 * Mantido como adaptador de compatibilidade apontando para o FirestoreRepository central.
 */
export const FirestoreSyncEngine = {
  isOnline(): boolean {
    return FirestoreRepository.isOnline();
  },

  async saveRecord<T extends { id: string; empresaId?: string; [key: string]: any }>(
    storeName: StoreName,
    item: T,
    empresaId: string
  ): Promise<T> {
    return FirestoreRepository.add<T>(storeName, item, empresaId);
  },

  async fetchCollection<T extends { id: string; empresaId?: string }>(
    storeName: StoreName,
    empresaId: string
  ): Promise<T[]> {
    return FirestoreRepository.getAll<T>(storeName, empresaId);
  },

  async deleteRecord(storeName: StoreName, id: string, empresaId: string): Promise<void> {
    return FirestoreRepository.delete(storeName, id, empresaId);
  },

  async syncAllPending(empresaId: string): Promise<{ success: boolean; syncedCount: number; remainingCount: number }> {
    const res = await FirestoreRepository.syncPendingRecords(empresaId);
    return { success: true, ...res };
  },

  async getPendingCount(empresaId: string): Promise<number> {
    return FirestoreRepository.getPendingCount(empresaId);
  }
};
