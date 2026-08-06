/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, ReactNode } from 'react';
import { EquipamentoContext, EquipamentoContextType } from '../contexts/EquipamentoContext';
import { Equipamento } from '../types';
import { EquipamentoService } from '../services/EquipamentoService';
import { AuthContext } from '../contexts/AuthContext';

interface EquipamentoProviderProps {
  children: ReactNode;
}

export const EquipamentoProvider: React.FC<EquipamentoProviderProps> = ({ children }) => {
  const auth = useContext(AuthContext);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [isLoadingEquipamentos, setIsLoadingEquipamentos] = useState<boolean>(false);

  const loadEquipamentosForUser = async () => {
    if (!auth || !auth.currentUser) {
      setEquipamentos([]);
      setIsLoadingEquipamentos(false);
      return;
    }

    setIsLoadingEquipamentos(true);
    try {
      const list = await EquipamentoService.getEquipamentos(auth.currentUser.empresaId);
      setEquipamentos(list);
    } catch (err) {
      console.error('Erro ao carregar equipamentos:', err);
    } finally {
      setIsLoadingEquipamentos(false);
    }
  };

  useEffect(() => {
    loadEquipamentosForUser();
    
    // Escuta por atualizações de equipamentos ou de clientes (para atualizar o nome do cliente no cache)
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.empresaId === auth?.currentUser?.empresaId) {
        loadEquipamentosForUser();
      } else if (!customEvent.detail) {
        loadEquipamentosForUser();
      }
    };
    
    window.addEventListener('equipamentos_updated', handleUpdate);
    window.addEventListener('clientes_updated', handleUpdate);
    
    return () => {
      window.removeEventListener('equipamentos_updated', handleUpdate);
      window.removeEventListener('clientes_updated', handleUpdate);
    };
  }, [auth?.currentUser?.empresaId]);

  const saveEquipamento = async (data: Equipamento): Promise<Equipamento> => {
    setIsLoadingEquipamentos(true);
    try {
      const saved = await EquipamentoService.saveEquipamento({
        ...data,
        empresaId: auth?.currentUser?.empresaId || 'default_tenant'
      });
      await loadEquipamentosForUser();
      return saved;
    } finally {
      setIsLoadingEquipamentos(false);
    }
  };

  const deleteEquipamento = async (id: string): Promise<void> => {
    setIsLoadingEquipamentos(true);
    try {
      await EquipamentoService.deleteEquipamento(id, auth?.currentUser?.empresaId || 'default_tenant');
      await loadEquipamentosForUser();
    } finally {
      setIsLoadingEquipamentos(false);
    }
  };

  const searchEquipamentos = async (term: string): Promise<Equipamento[]> => {
    return await EquipamentoService.searchEquipamentos(auth?.currentUser?.empresaId || 'default_tenant', term);
  };

  const reloadEquipamentos = async () => {
    await loadEquipamentosForUser();
  };

  const value: EquipamentoContextType = {
    equipamentos,
    isLoadingEquipamentos,
    saveEquipamento,
    deleteEquipamento,
    searchEquipamentos,
    reloadEquipamentos
  };

  return <EquipamentoContext.Provider value={value}>{children}</EquipamentoContext.Provider>;
};
export { EquipamentoContext };
