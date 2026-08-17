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
    const empresaId = auth?.currentUser?.empresaId?.trim();
    if (!empresaId) {
      setServicos([]);
      setIsLoadingServicos(false);
      return;
    }

    setIsLoadingServicos(true);
    try {
      const list = await ServicoInteligenteService.getServicos(empresaId);
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
      const currentEmpresaId = auth?.currentUser?.empresaId?.trim();
      if (!currentEmpresaId) return;

      if (customEvent.detail?.empresaId === currentEmpresaId || !customEvent.detail) {
        loadServicosForUser();
      }
    };
    window.addEventListener('servicos_updated', handleUpdate);
    return () => {
      window.removeEventListener('servicos_updated', handleUpdate);
    };
  }, [auth?.currentUser?.empresaId]);

  const saveServico = async (data: Servico): Promise<Servico> => {
    const empresaId = auth?.currentUser?.empresaId?.trim();
    if (!empresaId) {
      throw new Error('Operação bloqueada: empresaId é obrigatório e não foi informado para salvar Serviço.');
    }

    setIsLoadingServicos(true);
    try {
      const saved = await ServicoInteligenteService.saveServico({
        ...data,
        empresaId
      });
      await loadServicosForUser();
      return saved;
    } finally {
      setIsLoadingServicos(false);
    }
  };

  const deleteServico = async (id: string): Promise<void> => {
    const empresaId = auth?.currentUser?.empresaId?.trim();
    if (!empresaId) {
      throw new Error('Operação bloqueada: empresaId é obrigatório e não foi informado para excluir Serviço.');
    }

    setIsLoadingServicos(true);
    try {
      await ServicoInteligenteService.deleteServico(id, empresaId);
      await loadServicosForUser();
    } finally {
      setIsLoadingServicos(false);
    }
  };

  const registrarUtilizacao = async (id: string): Promise<void> => {
    const empresaId = auth?.currentUser?.empresaId?.trim();
    if (!empresaId) {
      throw new Error('Operação bloqueada: empresaId é obrigatório para registrar utilização de Serviço.');
    }

    await ServicoInteligenteService.registrarUtilizacao(id, empresaId);
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
