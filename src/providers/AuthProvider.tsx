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
    // 1. Restaura imediatamente o usuário do cache local para evitar "flashing" ou atrasos na UI
    const initCachedUser = async () => {
      try {
        const cached = await AuthService.getCurrentUser();
        if (cached) {
          setCurrentUser(cached);
        }
      } catch (err) {
        console.error('Falha ao obter cache do usuário:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initCachedUser();

    // 2. Inscreve-se na sincronização real e contínua do estado do Firebase Auth
    const unsubscribe = AuthService.subscribeToAuthState((user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password?: string): Promise<Usuario> => {
    setIsLoading(true);
    try {
      const user = await AuthService.login(email, password);
      setCurrentUser(user);
      return user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string, 
    password: string, 
    nomeCompleto?: string, 
    nomeEmpresa?: string
  ): Promise<Usuario> => {
    setIsLoading(true);
    try {
      const user = await AuthService.register(email, password, nomeCompleto, nomeEmpresa);
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
    register,
    loginWithGoogle,
    logout,
    sendPasswordResetEmail,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export { AuthContext };
