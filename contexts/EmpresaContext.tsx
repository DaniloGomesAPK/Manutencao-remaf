/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext } from 'react';
import { Empresa } from '../models/Empresa';
import { PerfilConfig, getPerfilConfig } from '../config/perfis';

export interface EmpresaContextType {
  empresa: Empresa | null;
  perfilConfig: PerfilConfig;
  isLoadingEmpresa: boolean;
  saveEmpresa: (data: Empresa) => Promise<Empresa>;
  reloadEmpresa: () => Promise<void>;
}

export const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

export function useEmpresa() {
  const context = useContext(EmpresaContext);
  if (!context) {
    return {
      empresa: null,
      perfilConfig: getPerfilConfig(null),
      isLoadingEmpresa: false,
      saveEmpresa: async () => { throw new Error('EmpresaContext not initialized'); },
      reloadEmpresa: async () => {}
    };
  }
  return context;
}

