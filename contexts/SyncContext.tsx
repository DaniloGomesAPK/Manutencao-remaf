/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext } from 'react';

export interface SyncContextType {
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  syncStatus: 'synced' | 'syncing' | 'offline';
  syncAll: () => Promise<void>;
  syncEmpresa: () => Promise<void>;
  syncDadosTecnicos: () => Promise<void>;
}

export const SyncContext = createContext<SyncContextType | undefined>(undefined);
