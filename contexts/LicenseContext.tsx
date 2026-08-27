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
}

export const LicenseContext = createContext<LicenseContextType | undefined>(undefined);
