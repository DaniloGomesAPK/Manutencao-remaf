/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, ReactNode } from 'react';
import { ServicoContext, ServicoContextType } from '../contexts/ServicoContext';
import { Servico } from '../types';
import { ServicoInteligenteService } from '../services/ServicoInteligenteService';
import { AuthContext } from '../contexts/AuthContext';

interface ServicoProviderProps {
  children: ReactNode;
}

export const ServicoProvider: React.FC<ServicoProviderProps> = ({ children }) => {
  const auth = useContext(AuthContext);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [isLoadingServicos, setIsLoadingServicos] = useState<boolean>(false);

  const loadServicosForUser = async () => {
    if (!auth || !auth.currentUser) {
      setServicos([]);
      setIsLoadingServicos(false);
      return;
    }

    setIsLoadingServicos(true);
    try {
      const list = await ServicoInteligenteService.getServicos(auth.currentUser.empresaId);
      setServicos(list);
    } catch (err) {
      console.error('Erro ao carregar serviços inteligentes:', err);
    } finally {
      setIsLoadingServicos(false);
    }
  };

  useEffect(() => {
    loadServicosForUser();

    // Escuta por atualizações de serviços para sincronizar estados
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.empresaId === auth?.currentUser?.empresaId) {
        loadServicosForUser();
      } else if (!customEvent.detail) {
        loadServicosForUser();
      }
    };
    window.addEventListener('servicos_updated', handleUpdate);
    return () => {
      window.removeEventListener('servicos_updated', handleUpdate);
    };
  }, [auth?.currentUser?.empresaId]);

  const saveServico = async (data: Servico): Promise<Servico> => {
    setIsLoadingServicos(true);
    try {
      const saved = await ServicoInteligenteService.saveServico({
        ...data,
        empresaId: auth?.currentUser?.empresaId || 'default_tenant'
      });
      await loadServicosForUser();
      return saved;
    } finally {
      setIsLoadingServicos(false);
    }
  };

  const deleteServico = async (id: string): Promise<void> => {
    setIsLoadingServicos(true);
    try {
      await ServicoInteligenteService.deleteServico(id, auth?.currentUser?.empresaId || 'default_tenant');
      await loadServicosForUser();
    } finally {
      setIsLoadingServicos(false);
    }
  };

  const registrarUtilizacao = async (id: string): Promise<void> => {
    await ServicoInteligenteService.registrarUtilizacao(id, auth?.currentUser?.empresaId || 'default_tenant');
    await loadServicosForUser();
  };

  const reloadServicos = async () => {
    await loadServicosForUser();
  };

  const value: ServicoContextType = {
    servicos,
    isLoadingServicos,
    saveServico,
    deleteServico,
    registrarUtilizacao,
    reloadServicos
  };

  return <ServicoContext.Provider value={value}>{children}</ServicoContext.Provider>;
};
