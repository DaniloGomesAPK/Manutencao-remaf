/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { AuthContext, AuthContextType } from '../contexts/AuthContext';
import { Usuario } from '../models/Usuario';
import { AuthService } from '../services/AuthService';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const user = await AuthService.getCurrentUser();
        if (user) {
          // Atualiza a marcação de último acesso para a auditoria do SaaS
          const updatedUser: Usuario = {
            ...user,
            ultimoAcesso: new Date().toISOString()
          };
          await AuthService.updateSessionUser(updatedUser);
          setCurrentUser(updatedUser);
        }
      } catch (err) {
        console.error('Falha ao restaurar sessão ativa do usuário SaaS:', err);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, nomeCompleto?: string): Promise<Usuario> => {
    setIsLoading(true);
    try {
      const user = await AuthService.login(email, nomeCompleto);
      setCurrentUser(user);
      return user;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<Usuario> => {
    setIsLoading(true);
    try {
      const user = await AuthService.loginWithGoogle();
      setCurrentUser(user);
      return user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await AuthService.logout();
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const sendPasswordResetEmail = async (email: string): Promise<void> => {
    await AuthService.sendPasswordResetEmail(email);
  };

  const updateUser = async (usuario: Usuario): Promise<void> => {
    await AuthService.updateSessionUser(usuario);
    setCurrentUser(usuario);
  };

  const value: AuthContextType = {
    currentUser,
    isAuthenticated: !!currentUser,
    isLoading,
    login,
    loginWithGoogle,
    logout,
    sendPasswordResetEmail,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export { AuthContext };
