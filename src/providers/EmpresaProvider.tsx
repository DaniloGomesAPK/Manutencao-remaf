/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, ReactNode } from 'react';
import { EmpresaContext, EmpresaContextType } from '../contexts/EmpresaContext';
import { Empresa } from '../models/Empresa';
import { EmpresaService } from '../services/EmpresaService';
import { AuthContext } from '../contexts/AuthContext';

interface EmpresaProviderProps {
  children: ReactNode;
}

export const EmpresaProvider: React.FC<EmpresaProviderProps> = ({ children }) => {
  const auth = useContext(AuthContext);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [isLoadingEmpresa, setIsLoadingEmpresa] = useState<boolean>(false);

  const loadEmpresaForUser = async () => {
    if (!auth || !auth.currentUser) {
      setEmpresa(null);
      setIsLoadingEmpresa(false);
      return;
    }

    setIsLoadingEmpresa(true);
    try {
      const emp = await EmpresaService.ensureEmpresaExists(auth.currentUser.empresaId, auth.currentUser);
      setEmpresa(emp);
    } catch (err) {
      console.error('Erro ao carregar empresa vinculada:', err);
    } finally {
      setIsLoadingEmpresa(false);
    }
  };

  useEffect(() => {
    loadEmpresaForUser();
    
    // Escuta por atualizações da empresa para sincronizar estados entre componentes
    const handleUpdate = () => {
      loadEmpresaForUser();
    };
    window.addEventListener('remaf_company_updated', handleUpdate);
    return () => {
      window.removeEventListener('remaf_company_updated', handleUpdate);
    };
  }, [auth?.currentUser?.empresaId]);

  const saveEmpresa = async (data: Empresa): Promise<Empresa> => {
    setIsLoadingEmpresa(true);
    try {
      const updated = await EmpresaService.saveEmpresa(data);
      setEmpresa(updated);
      return updated;
    } finally {
      setIsLoadingEmpresa(false);
    }
  };

  const reloadEmpresa = async () => {
    await loadEmpresaForUser();
  };

  const value: EmpresaContextType = {
    empresa,
    isLoadingEmpresa,
    saveEmpresa,
    reloadEmpresa
  };

  return <EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>;
};
export { EmpresaContext };
