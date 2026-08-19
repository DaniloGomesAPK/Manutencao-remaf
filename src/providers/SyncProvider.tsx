/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, useCallback, ReactNode } from 'react';
import { SyncContext } from '../contexts/SyncContext';
import { AuthContext } from '../contexts/AuthContext';
import { FirestoreSyncEngine } from '../services/FirestoreSyncEngine';
import { NotificationService } from '../services/NotificationService';
import { safeStorage } from '../utils/safeStorage';

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
  const [syncError, setSyncError] = useState<string | null>(null);

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem('remaf_saas_last_sync') || null;
    } catch (_) {
      return null;
    }
  });

  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<string | null>(() => {
    try {
      return localStorage.getItem('remaf_saas_last_successful_sync') || null;
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

  /**
   * Sincronização Completa (Upload + Download Remoto):
   * Executada SOMENTE:
   * 1. Ao iniciar sessão/empresa
   * 2. Quando a internet reconectar (evento online)
   * 3. Ao clicar no botão "Sincronizar Agora"
   */
  const performFullSync = useCallback(async (isManual: boolean = false) => {
    if (!empresaId || !navigator.onLine) {
      refreshPendingCount();
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await FirestoreSyncEngine.syncBidirectional(empresaId, auth?.currentUser?.email);
      const timestamp = new Date().toISOString();
      setLastSyncedAt(timestamp);
      setPendingCount(res.remainingCount);
      safeStorage.setItem('remaf_saas_last_sync', timestamp);

      if (res.success) {
        setLastSuccessfulSync(timestamp);
        setSyncError(null);
        safeStorage.setItem('remaf_saas_last_successful_sync', timestamp);

        if (isManual || res.syncedCount > 0 || res.fetchedCount > 0) {
          NotificationService.notify(
            'success',
            'Sincronização Concluída',
            res.syncedCount > 0
              ? `${res.syncedCount} registro(s) sincronizado(s) com sucesso no Firestore.`
              : 'Dados reconciliados com o Firestore em nuvem.'
          );
        }
      } else {
        const errorMsg = res.error || 'Falha ao sincronizar com o Firestore.';
        setSyncError(errorMsg);
        if (isManual) {
          NotificationService.notify(
            'warning',
            'Sincronização Parcial',
            `Não foi possível confirmar sincronização com a nuvem: ${errorMsg}`
          );
        }
      }
    } catch (err: any) {
      console.error('Falha na sincronização:', err);
      const errorMsg = err?.message || 'Falha ao conectar com o Firestore.';
      setSyncError(errorMsg);
      if (isManual) {
        NotificationService.notify(
          'error',
          'Erro de Sincronização',
          `Falha ao comunicar com o servidor: ${errorMsg}`
        );
      }
    } finally {
      setIsSyncing(false);
      refreshPendingCount();
    }
  }, [empresaId, auth?.currentUser?.email, refreshPendingCount]);

  /**
   * Envio periódico de registros locais pendentes (A cada 45 segundos):
   * NÃO faz download de todas as coleções, apenas envia pendências locais.
   * Não atualiza lastSuccessfulSync nem apaga syncError (apenas reconciliação remota confirmada faz isso).
   */
  const performPendingUpload = useCallback(async () => {
    if (!empresaId || !navigator.onLine) {
      refreshPendingCount();
      return;
    }

    try {
      const count = await FirestoreSyncEngine.getPendingCount(empresaId);
      setPendingCount(count);
      if (count > 0) {
        setIsSyncing(true);
        const res = await FirestoreSyncEngine.syncAllPending(empresaId, auth?.currentUser?.email);
        setPendingCount(res.remainingCount);
        const timestamp = new Date().toISOString();
        setLastSyncedAt(timestamp);
        safeStorage.setItem('remaf_saas_last_sync', timestamp);

        if (!res.success) {
          setSyncError(res.error || 'Falha ao enviar registros pendentes para o Firestore.');
        }
      }
    } catch (err: any) {
      console.warn('Erro no envio periódico de pendências:', err);
      setSyncError(err?.message || 'Falha ao conectar com o Firestore.');
    } finally {
      setIsSyncing(false);
      refreshPendingCount();
    }
  }, [empresaId, auth?.currentUser?.email, refreshPendingCount]);

  // Sincronização inicial ao carregar a empresa
  useEffect(() => {
    if (empresaId && navigator.onLine) {
      performFullSync(false);
    } else {
      refreshPendingCount();
    }
  }, [empresaId]);

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      // Quando a internet volta, executa sincronização completa
      performFullSync(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshPendingCount();
    };

    const handleStatusChanged = () => {
      refreshPendingCount();
    };

    // Callback de status dos listeners onSnapshot
    const handleSnapshotStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ healthy: boolean; error?: string; colecao?: string; fromCache?: boolean }>;
      const { healthy, error, fromCache } = customEvent.detail || {};

      if (!healthy) {
        setSyncError(error || 'Falha na conexão em tempo real com o Firestore.');
      } else if (healthy && !fromCache) {
        // Snapshot confirmado pelo servidor: permite limpar o erro de conexão/tempo real
        setSyncError((prev) => {
          if (prev && (prev.includes('Firestore') || prev.includes('tempo real') || prev.includes('listener') || prev.includes('Falha na conexão'))) {
            return null;
          }
          return prev;
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('remaf_sync_status_changed', handleStatusChanged);
    window.addEventListener('firestore_snapshot_status', handleSnapshotStatus);

    // Intervalo periódico de 45s: Envia APENAS pendências locais (sem download completo)
    const interval = setInterval(() => {
      if (navigator.onLine && empresaId) {
        performPendingUpload();
      }
    }, 45000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('remaf_sync_status_changed', handleStatusChanged);
      window.removeEventListener('firestore_snapshot_status', handleSnapshotStatus);
      clearInterval(interval);
    };
  }, [empresaId, performFullSync, performPendingUpload, refreshPendingCount]);

  const syncStatus: 'synced' | 'syncing' | 'error' | 'offline' = !isOnline
    ? 'offline'
    : isSyncing || pendingCount > 0
    ? 'syncing'
    : syncError
    ? 'error'
    : lastSuccessfulSync
    ? 'synced'
    : 'syncing';

  const syncAll = async () => {
    if (!isOnline) {
      NotificationService.notify('warning', 'Modo Offline', 'Aparelho sem conexão com a internet. Os registros serão sincronizados automaticamente quando reconectar.');
      return;
    }
    await performFullSync(true);
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
        lastSuccessfulSync,
        syncError,
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
