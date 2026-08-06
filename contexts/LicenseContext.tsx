/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext } from 'react';
import { License, LicencaAtual } from '../models/License';

export interface LicenseContextType {
  license: License | null;
  licencaAtual: LicencaAtual | null;
  isLoadingLicense: boolean;
  isValid: boolean;
  verificarStatus: () => Promise<boolean>;
  refreshLicenca: () => Promise<void>;
  ativar: (plano?: string) => Promise<License>;
  renovar: (dias?: number) => Promise<License>;
  bloquear: () => Promise<License>;
  liberar: () => Promise<License>;
  iniciarTrial: (dias?: number) => Promise<License>;
  encerrarTrial: () => Promise<License>;
}

export const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

