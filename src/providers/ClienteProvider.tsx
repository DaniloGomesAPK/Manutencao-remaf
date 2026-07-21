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
    if (!auth || !auth.currentUser) {
      setClientes([]);
      setIsLoadingClientes(false);
      return;
    }

    setIsLoadingClientes(true);
    try {
      const list = await ClienteService.getClientes(auth.currentUser.empresaId);
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
      if (customEvent.detail?.empresaId === auth?.currentUser?.empresaId) {
        loadClientesForUser();
      } else if (!customEvent.detail) {
        loadClientesForUser();
      }
    };
    window.addEventListener('clientes_updated', handleUpdate);
    return () => {
      window.removeEventListener('clientes_updated', handleUpdate);
    };
  }, [auth?.currentUser?.empresaId]);

  const saveCliente = async (data: Cliente): Promise<Cliente> => {
    setIsLoadingClientes(true);
    try {
      const saved = await ClienteService.saveCliente({
        ...data,
        empresaId: auth?.currentUser?.empresaId || 'default_tenant'
      });
      await loadClientesForUser();
      return saved;
    } finally {
      setIsLoadingClientes(false);
    }
  };

  const deleteCliente = async (id: string): Promise<void> => {
    setIsLoadingClientes(true);
    try {
      await ClienteService.deleteCliente(id, auth?.currentUser?.empresaId || 'default_tenant');
      await loadClientesForUser();
    } finally {
      setIsLoadingClientes(false);
    }
  };

  const searchClientes = async (term: string): Promise<Cliente[]> => {
    return await ClienteService.searchClientes(auth?.currentUser?.empresaId || 'default_tenant', term);
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
