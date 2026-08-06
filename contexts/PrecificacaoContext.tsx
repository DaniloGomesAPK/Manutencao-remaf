/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext } from 'react';
import { Precificacao, Insumo } from '../types';

export interface PrecificacaoContextType {
  precificacoes: Precificacao[];
  isLoadingPrecificacoes: boolean;
  savePrecificacao: (data: Precificacao) => Promise<Precificacao>;
  deletePrecificacao: (id: string) => Promise<void>;
  reloadPrecificacoes: () => Promise<void>;
  calcularValores: (params: {
    materiais: Insumo[];
    tempoMedioExecucao: number;
    valorHora: number;
    custosFixos: number;
    impostos: number;
    margemUtilizada: number;
  }) => any;
}

export const PrecificacaoContext = createContext<PrecificacaoContextType | undefined>(undefined);
