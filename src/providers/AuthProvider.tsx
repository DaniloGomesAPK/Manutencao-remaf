/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, ReactNode, useCallback } from 'react';
import { AuthContext, AuthContextType } from '../contexts/AuthContext';
import { Usuario } from '../models/Usuario';
import { AuthService } from '../services/AuthService';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTrialExpired, setIsTrialExpired] = useState<boolean>(false);
  const [isAccessBlocked, setIsAccessBlocked] = useState<boolean>(false);
  const [trialDiasRestantes, setTrialDiasRestantes] = useState<number>(7);

  const verifyUserAccess = useCallback(async (email?: string): Promise<boolean> => {
    if (!email) {
      setIsTrialExpired(false);
      setIsAccessBlocked(false);
      setTrialDiasRestantes(7);
      return true;
    }

    try {
      const authInfo = await AuthService.checkEmailAuthorized(email);
      if (authInfo.exists) {
        setIsTrialExpired(authInfo.isTrialExpired);
        setIsAccessBlocked(authInfo.isAccessBlocked);
        setTrialDiasRestantes(authInfo.diasRestantes);
        return !authInfo.isAccessBlocked;
      }
    } catch (e) {
      console.warn('[AuthProvider] Erro ao verificar autorização do e-mail:', e);
    }
    return true;
  }, []);

  useEffect(() => {
    // 1. Restaura imediatamente o usuário do cache local para evitar "flashing" ou atrasos na UI
    const initCachedUser = async () => {
      try {
        const cached = await AuthService.getCurrentUser();
        if (cached) {
          setCurrentUser(cached);
          if (cached.statusConta === 'expired' || cached.statusConta === 'blocked') {
            setIsTrialExpired(true);
            setIsAccessBlocked(true);
          }
          await verifyUserAccess(cached.email);
        }
      } catch (err) {
        console.error('Falha ao obter cache do usuário:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initCachedUser();

    // 2. Inscreve-se na sincronização real e contínua do estado do Firebase Auth
    const unsubscribe = AuthService.subscribeToAuthState(async (user) => {
      setCurrentUser(user);
      if (user?.email) {
        await verifyUserAccess(user.email);
      } else {
        setIsTrialExpired(false);
        setIsAccessBlocked(false);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [verifyUserAccess]);

  const login = async (email: string, password?: string): Promise<Usuario> => {
    setIsLoading(true);
    try {
      const user = await AuthService.login(email, password);
      setCurrentUser(user);
      await verifyUserAccess(user.email);
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
      await verifyUserAccess(user.email);
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
      await verifyUserAccess(user.email);
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
      setIsTrialExpired(false);
      setIsAccessBlocked(false);
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
    await verifyUserAccess(usuario.email);
  };

  const checkAccessStatus = async (): Promise<boolean> => {
    if (!currentUser?.email) return false;
    return await verifyUserAccess(currentUser.email);
  };

  const value: AuthContextType = {
    currentUser,
    isAuthenticated: !!currentUser,
    isLoading,
    isTrialExpired,
    isAccessBlocked,
    trialDiasRestantes,
    login,
    register,
    loginWithGoogle,
    logout,
    sendPasswordResetEmail,
    updateUser,
    checkAccessStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export { AuthContext };
