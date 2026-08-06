/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext } from 'react';
import { Equipamento } from '../types';

export interface EquipamentoContextType {
  equipamentos: Equipamento[];
  isLoadingEquipamentos: boolean;
  saveEquipamento: (data: Equipamento) => Promise<Equipamento>;
  deleteEquipamento: (id: string) => Promise<void>;
  searchEquipamentos: (term: string) => Promise<Equipamento[]>;
  reloadEquipamentos: () => Promise<void>;
}

export const EquipamentoContext = createContext<EquipamentoContextType | undefined>(undefined);
