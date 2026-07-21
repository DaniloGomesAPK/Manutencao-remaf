/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext } from 'react';
import { Usuario } from '../models/Usuario';

export interface AuthContextType {
  currentUser: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, nomeCompleto?: string) => Promise<Usuario>;
  loginWithGoogle: () => Promise<Usuario>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updateUser: (usuario: Usuario) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
