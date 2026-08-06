/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, ReactNode } from 'react';
import { PrecificacaoContext, PrecificacaoContextType } from '../contexts/PrecificacaoContext';
import { Precificacao, Insumo } from '../types';
import { PrecificacaoService } from '../services/PrecificacaoService';
import { AuthContext } from '../contexts/AuthContext';

interface PrecificacaoProviderProps {
  children: ReactNode;
}

export const PrecificacaoProvider: React.FC<PrecificacaoProviderProps> = ({ children }) => {
  const auth = useContext(AuthContext);
  const [precificacoes, setPrecificacoes] = useState<Precificacao[]>([]);
  const [isLoadingPrecificacoes, setIsLoadingPrecificacoes] = useState<boolean>(false);

  const loadPrecificacoesForUser = async () => {
    if (!auth || !auth.currentUser) {
      setPrecificacoes([]);
      setIsLoadingPrecificacoes(false);
      return;
    }

    setIsLoadingPrecificacoes(true);
    try {
      const list = await PrecificacaoService.getPrecificacoes(auth.currentUser.empresaId);
      setPrecificacoes(list);
    } catch (err) {
      console.error('Erro ao carregar precificações:', err);
    } finally {
      setIsLoadingPrecificacoes(false);
    }
  };

  useEffect(() => {
    loadPrecificacoesForUser();

    // Escuta por atualizações de precificações para sincronizar estados
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.empresaId === auth?.currentUser?.empresaId) {
        loadPrecificacoesForUser();
      } else if (!customEvent.detail) {
        loadPrecificacoesForUser();
      }
    };
    window.addEventListener('precificacoes_updated', handleUpdate);
    return () => {
      window.removeEventListener('precificacoes_updated', handleUpdate);
    };
  }, [auth?.currentUser?.empresaId]);

  const savePrecificacao = async (data: Precificacao): Promise<Precificacao> => {
    setIsLoadingPrecificacoes(true);
    try {
      const saved = await PrecificacaoService.savePrecificacao({
        ...data,
        empresaId: auth?.currentUser?.empresaId || 'default_tenant'
      });
      await loadPrecificacoesForUser();
      return saved;
    } finally {
      setIsLoadingPrecificacoes(false);
    }
  };

  const deletePrecificacao = async (id: string): Promise<void> => {
    setIsLoadingPrecificacoes(true);
    try {
      await PrecificacaoService.deletePrecificacao(id, auth?.currentUser?.empresaId || 'default_tenant');
      await loadPrecificacoesForUser();
    } finally {
      setIsLoadingPrecificacoes(false);
    }
  };

  const reloadPrecificacoes = async () => {
    await loadPrecificacoesForUser();
  };

  const calcularValores = (params: {
    materiais: Insumo[];
    tempoMedioExecucao: number;
    valorHora: number;
    custosFixos: number;
    impostos: number;
    margemUtilizada: number;
  }) => {
    return PrecificacaoService.calcularValores(params);
  };

  const value: PrecificacaoContextType = {
    precificacoes,
    isLoadingPrecificacoes,
    savePrecificacao,
    deletePrecificacao,
    reloadPrecificacoes,
    calcularValores
  };

  return <PrecificacaoContext.Provider value={value}>{children}</PrecificacaoContext.Provider>;
};
