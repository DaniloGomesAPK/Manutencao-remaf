/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, ReactNode } from 'react';
import { PrecificacaoContext, PrecificacaoContextType } from '../contexts/PrecificacaoContext';
import { Precificacao, Insumo } from '../types';
import { PrecificacaoService } from '../services/PrecificacaoService';
import { FirestoreRepository } from '../services/FirestoreRepository';
import { AuthContext } from '../contexts/AuthContext';

interface PrecificacaoProviderProps {
  children: ReactNode;
}

export const PrecificacaoProvider: React.FC<PrecificacaoProviderProps> = ({ children }) => {
  const auth = useContext(AuthContext);
  const [precificacoes, setPrecificacoes] = useState<Precificacao[]>([]);
  const [isLoadingPrecificacoes, setIsLoadingPrecificacoes] = useState<boolean>(false);

  const loadPrecificacoesForUser = async () => {
    const empresaId = auth?.currentUser?.empresaId?.trim();
    if (!empresaId) {
      setPrecificacoes([]);
      setIsLoadingPrecificacoes(false);
      return;
    }

    setIsLoadingPrecificacoes(true);
    try {
      const list = await PrecificacaoService.getPrecificacoes(empresaId);
      setPrecificacoes(list);
    } catch (err) {
      console.error('Erro ao carregar precificações:', err);
    } finally {
      setIsLoadingPrecificacoes(false);
    }
  };

  useEffect(() => {
    const empresaId = auth?.currentUser?.empresaId?.trim();
    if (!empresaId) {
      setPrecificacoes([]);
      setIsLoadingPrecificacoes(false);
      return;
    }

    loadPrecificacoesForUser();

    // Listener em tempo real do Firestore para sincronização entre dispositivos
    const unsubscribe = FirestoreRepository.listen<Precificacao>(
      'precificacao',
      empresaId,
      (updatedList) => {
        setPrecificacoes(updatedList);
        setIsLoadingPrecificacoes(false);
      },
      [],
      auth?.currentUser?.email
    );

    // Escuta por atualizações de precificações para sincronizar estados
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const currentEmpresaId = auth?.currentUser?.empresaId?.trim();
      if (!currentEmpresaId) return;

      if (customEvent.detail?.empresaId === currentEmpresaId || !customEvent.detail) {
        loadPrecificacoesForUser();
      }
    };
    window.addEventListener('precificacoes_updated', handleUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('precificacoes_updated', handleUpdate);
    };
  }, [auth?.currentUser?.empresaId, auth?.currentUser?.email]);

  const savePrecificacao = async (data: Precificacao): Promise<Precificacao> => {
    const empresaId = auth?.currentUser?.empresaId?.trim();
    if (!empresaId) {
      throw new Error('Operação bloqueada: empresaId é obrigatório e não foi informado para salvar Precificação.');
    }

    setIsLoadingPrecificacoes(true);
    try {
      const saved = await PrecificacaoService.savePrecificacao({
        ...data,
        empresaId
      });
      await loadPrecificacoesForUser();
      return saved;
    } finally {
      setIsLoadingPrecificacoes(false);
    }
  };

  const deletePrecificacao = async (id: string): Promise<void> => {
    const empresaId = auth?.currentUser?.empresaId?.trim();
    if (!empresaId) {
      throw new Error('Operação bloqueada: empresaId é obrigatório e não foi informado para excluir Precificação.');
    }

    setIsLoadingPrecificacoes(true);
    try {
      await PrecificacaoService.deletePrecificacao(id, empresaId);
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
