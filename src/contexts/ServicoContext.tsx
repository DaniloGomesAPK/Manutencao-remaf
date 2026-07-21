/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext } from 'react';
import { Servico } from '../types';

export interface ServicoContextType {
  servicos: Servico[];
  isLoadingServicos: boolean;
  saveServico: (data: Servico) => Promise<Servico>;
  deleteServico: (id: string) => Promise<void>;
  registrarUtilizacao: (id: string) => Promise<void>;
  reloadServicos: () => Promise<void>;
}

export const ServicoContext = createContext<ServicoContextType | undefined>(undefined);
