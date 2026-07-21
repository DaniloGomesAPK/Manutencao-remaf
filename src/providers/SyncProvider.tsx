/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useContext, ReactNode } from 'react';
import { SyncContext, SyncContextType } from '../contexts/SyncContext';
import { SyncService } from '../services/SyncService';
import { AuthContext } from '../contexts/AuthContext';
import { EmpresaContext } from '../contexts/EmpresaContext';
import { NotificationService } from '../services/NotificationService';

interface SyncProviderProps {
  children: ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const auth = useContext(AuthContext);
  const empresaCtx = useContext(EmpresaContext);
  const empresaId = auth?.currentUser?.empresaId;

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem('remaf_saas_last_sync') || null;
    } catch (_) {
      return null;
    }
  });

  const syncAll = async () => {
    if (!empresaId) return;
    setIsSyncing(true);
    try {
      // 1. Sincroniza dados cadastrais da empresa se houver contexto
      if (empresaCtx?.empresa) {
        await SyncService.sincronizarEmpresa(empresaCtx.empresa);
      }
      // 2. Sincroniza outros dados de negócio
      await SyncService.sincronizarClientes(empresaId);
      await SyncService.sincronizarEquipamentos(empresaId);
      await SyncService.sincronizarRelatorios(empresaId);
      await SyncService.sincronizarFotos(empresaId);

      const timestamp = new Date().toISOString();
      setLastSyncedAt(timestamp);
      try {
        localStorage.setItem('remaf_saas_last_sync', timestamp);
      } catch (_) {}

      NotificationService.notify(
        'success',
        'Sincronização Concluída',
        'Todos os dados locais (IndexedDB) foram replicados com segurança para o ambiente central em nuvem.'
      );
    } catch (err) {
      console.error('Falha ao sincronizar dados:', err);
      NotificationService.notify(
        'error',
        'Erro na Sincronização',
        'Falha de comunicação temporária com o servidor de nuvem. Seus dados permanecem salvos em segurança offline neste dispositivo.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const syncEmpresa = async () => {
    if (!empresaCtx?.empresa) return;
    setIsSyncing(true);
    try {
      await SyncService.sincronizarEmpresa(empresaCtx.empresa);
      NotificationService.notify(
        'success',
        'Perfil Sincronizado',
        'O perfil corporativo e logomarca da empresa foram sincronizados com o servidor.'
      );
    } catch (err) {
      console.error('Erro ao sincronizar empresa:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncDadosTecnicos = async () => {
    if (!empresaId) return;
    setIsSyncing(true);
    try {
      await SyncService.sincronizarRelatorios(empresaId);
      NotificationService.notify(
        'success',
        'Ordens de Serviço Sincronizadas',
        'Suas ordens de serviço foram totalmente replicadas na nuvem.'
      );
    } catch (err) {
      console.error('Erro ao sincronizar dados técnicos:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const value: SyncContextType = {
    isSyncing,
    lastSyncedAt,
    syncAll,
    syncEmpresa,
    syncDadosTecnicos
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};
