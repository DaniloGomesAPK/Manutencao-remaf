/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, useCallback, ReactNode } from 'react';
import { SyncContext } from '../contexts/SyncContext';
import { AuthContext } from '../contexts/AuthContext';
import { FirestoreSyncEngine } from '../services/FirestoreSyncEngine';
import { NotificationService } from '../services/NotificationService';

interface SyncProviderProps {
  children: ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const auth = useContext(AuthContext);
  const empresaId = auth?.currentUser?.empresaId || '';

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem('remaf_saas_last_sync') || null;
    } catch (_) {
      return null;
    }
  });

  const refreshPendingCount = useCallback(async () => {
    if (!empresaId) return;
    try {
      const count = await FirestoreSyncEngine.getPendingCount(empresaId);
      setPendingCount(count);
    } catch (e) {
      console.warn('Erro ao verificar pendências:', e);
    }
  }, [empresaId]);

  const performSync = useCallback(async () => {
    if (!empresaId || !navigator.onLine) {
      refreshPendingCount();
      return;
    }

    setIsSyncing(true);
    try {
      const res = await FirestoreSyncEngine.syncAllPending(empresaId);
      const timestamp = new Date().toISOString();
      setLastSyncedAt(timestamp);
      setPendingCount(res.remainingCount);
      localStorage.setItem('remaf_saas_last_sync', timestamp);

      if (res.syncedCount > 0) {
        NotificationService.notify(
          'success',
          'Sincronização Concluída',
          `${res.syncedCount} registro(s) sincronizado(s) com sucesso no Firestore.`
        );
      }
    } catch (err) {
      console.error('Falha na sincronização:', err);
    } finally {
      setIsSyncing(false);
      refreshPendingCount();
    }
  }, [empresaId, refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      performSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshPendingCount();
    };

    const handleStatusChanged = () => {
      refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('remaf_sync_status_changed', handleStatusChanged);

    // Intervalo periódico de sincronização de pendências a cada 45 segundos se estiver online
    const interval = setInterval(() => {
      if (navigator.onLine && empresaId) {
        performSync();
      }
    }, 45000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('remaf_sync_status_changed', handleStatusChanged);
      clearInterval(interval);
    };
  }, [empresaId, performSync, refreshPendingCount]);

  const syncStatus: 'synced' | 'syncing' | 'offline' = !isOnline
    ? 'offline'
    : isSyncing
    ? 'syncing'
    : 'synced';

  const syncAll = async () => {
    if (!isOnline) {
      NotificationService.notify('warning', 'Modo Offline', 'Aparelho sem conexão com a internet. Os registros serão sincronizados automaticamente quando reconectar.');
      return;
    }
    await performSync();
  };

  const syncEmpresa = async () => {
    await syncAll();
  };

  const syncDadosTecnicos = async () => {
    await syncAll();
  };

  return (
    <SyncContext.Provider
      value={{
        isSyncing,
        isOnline,
        lastSyncedAt,
        pendingCount,
        syncStatus,
        syncAll,
        syncEmpresa,
        syncDadosTecnicos,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};
