/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, ReactNode } from 'react';
import { ClienteContext, ClienteContextType } from '../contexts/ClienteContext';
import { Cliente } from '../types';
import { ClienteService } from '../services/ClienteService';
import { AuthContext } from '../contexts/AuthContext';

interface ClienteProviderProps {
  children: ReactNode;
}

export const ClienteProvider: React.FC<ClienteProviderProps> = ({ children }) => {
  const auth = useContext(AuthContext);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoadingClientes, setIsLoadingClientes] = useState<boolean>(false);

  const loadClientesForUser = async () => {
    const empresaId = auth?.currentUser?.empresaId?.trim();
    if (!empresaId) {
      setClientes([]);
      setIsLoadingClientes(false);
      return;
    }

    setIsLoadingClientes(true);
    try {
      const list = await ClienteService.getClientes(empresaId);
      setClientes(list);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setIsLoadingClientes(false);
    }
  };

  useEffect(() => {
    loadClientesForUser();
    
    // Escuta por atualizações de clientes para sincronizar estados entre abas/componentes
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const currentEmpresaId = auth?.currentUser?.empresaId?.trim();
      if (!currentEmpresaId) return;

      if (customEvent.detail?.empresaId === currentEmpresaId || !customEvent.detail) {
        loadClientesForUser();
      }
    };
    window.addEventListener('clientes_updated', handleUpdate);
    return () => {
      window.removeEventListener('clientes_updated', handleUpdate);
    };
  }, [auth?.currentUser?.empresaId]);

  const saveCliente = async (data: Cliente): Promise<Cliente> => {
    const empresaId = auth?.currentUser?.empresaId?.trim();
    if (!empresaId) {
      throw new Error('Operação bloqueada: empresaId é obrigatório e não foi informado para salvar Cliente.');
    }

    setIsLoadingClientes(true);
    try {
      const saved = await ClienteService.saveCliente({
        ...data,
        empresaId
      });
      await loadClientesForUser();
      return saved;
    } finally {
      setIsLoadingClientes(false);
    }
  };

  const deleteCliente = async (id: string): Promise<void> => {
    const empresaId = auth?.currentUser?.empresaId?.trim();
    console.log('[DELETE CLIENTE] clienteId:', id);
    console.log('[DELETE CLIENTE] empresaId:', empresaId);
    if (!empresaId) {
      const errorMsg = 'Operação bloqueada: empresaId é obrigatório e não foi informado para excluir Cliente.';
      console.error('[DELETE CLIENTE]', errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoadingClientes(true);
    try {
      const userEmail = auth?.currentUser?.email || undefined;
      await ClienteService.deleteCliente(id, empresaId, userEmail);
      // Remove do estado em memória imediatamente
      setClientes(prev => prev.filter(c => c.id !== id));
      await loadClientesForUser();
    } catch (err: any) {
      console.error('[ClienteProvider] Falha ao excluir cliente:', err);
      throw err;
    } finally {
      setIsLoadingClientes(false);
    }
  };

  const searchClientes = async (term: string): Promise<Cliente[]> => {
    const empresaId = auth?.currentUser?.empresaId?.trim();
    if (!empresaId) {
      throw new Error('Operação bloqueada: empresaId é obrigatório e não foi informado para buscar Clientes.');
    }
    return await ClienteService.searchClientes(empresaId, term);
  };

  const reloadClientes = async () => {
    await loadClientesForUser();
  };

  const value: ClienteContextType = {
    clientes,
    isLoadingClientes,
    saveCliente,
    deleteCliente,
    searchClientes,
    reloadClientes
  };

  return <ClienteContext.Provider value={value}>{children}</ClienteContext.Provider>;
};
export { ClienteContext };
