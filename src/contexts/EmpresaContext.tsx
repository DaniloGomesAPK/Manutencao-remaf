/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext } from 'react';
import { Empresa } from '../models/Empresa';

export interface EmpresaContextType {
  empresa: Empresa | null;
  isLoadingEmpresa: boolean;
  saveEmpresa: (data: Empresa) => Promise<Empresa>;
  reloadEmpresa: () => Promise<void>;
}

export const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);
