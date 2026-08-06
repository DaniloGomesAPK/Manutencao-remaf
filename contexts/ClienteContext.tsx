/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext } from 'react';
import { Cliente } from '../types';

export interface ClienteContextType {
  clientes: Cliente[];
  isLoadingClientes: boolean;
  saveCliente: (data: Cliente) => Promise<Cliente>;
  deleteCliente: (id: string) => Promise<void>;
  searchClientes: (term: string) => Promise<Cliente[]>;
  reloadClientes: () => Promise<void>;
}

export const ClienteContext = createContext<ClienteContextType | undefined>(undefined);
