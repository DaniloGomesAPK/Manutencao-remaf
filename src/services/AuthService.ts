/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider,
  User,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { Usuario } from '../models/Usuario';
import { EmpresaService } from './EmpresaService';

const SESSION_USER_KEY = 'remaf_saas_user';

export const AuthService = {
  /**
   * Obtém o usuário atualmente autenticado a partir do cache local.
   */
  async getCurrentUser(): Promise<Usuario | null> {
    try {
      const stored = localStorage.getItem(SESSION_USER_KEY);
      if (stored) {
        return JSON.parse(stored) as Usuario;
      }
    } catch (e) {
      console.error('Erro ao ler sessão do usuário:', e);
    }
    return null;
  },

  /**
   * Envia o ID Token do Firebase para validação e obtenção de autorização server-side.
   */
  async verifySessionWithServer(fbUser: User, nomeCompleto?: string): Promise<Usuario> {
    const idToken = await fbUser.getIdToken();
    
    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken,
        nome: fbUser.displayName || nomeCompleto || undefined,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Acesso não autorizado pelo servidor.');
    }

    const verifyResult = await response.json();
    
    if (!verifyResult.success) {
      throw new Error(verifyResult.error || 'Acesso não autorizado.');
    }

    // O servidor retorna todos os dados do Usuário autorizados
    const usuario: Usuario = {
      id: verifyResult.uid,
      nome: verifyResult.name || fbUser.displayName || nomeCompleto || fbUser.email?.split('@')[0] || 'Usuário',
      email: fbUser.email || '',
      empresaId: verifyResult.empresaId,
      statusConta: verifyResult.statusConta || 'active',
      dataCadastro: verifyResult.dataCadastro,
      ultimoAcesso: verifyResult.ultimoAcesso || new Date().toISOString()
    };

    // Salva o usuário na sessão (localStorage para persistência rápida)
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(usuario));

    // Garante que a empresa exista ou inicializa com os dados proprietários
    await EmpresaService.ensureEmpresaExists(usuario.empresaId, usuario);

    return usuario;
  },

  /**
   * Realiza o login utilizando e-mail e senha com Firebase Auth.
   * Se a conta do usuário não existir no Auth, tenta criá-la.
   */
  async login(email: string, password?: string, nomeCompleto?: string): Promise<Usuario> {
    const emailNormalizado = email.trim().toLowerCase();
    const senhaSegura = password || 'SenhaPadraoRemaf123!';

    let fbUser: User;

    try {
      // Tenta realizar o login com as credenciais
      const userCredential = await signInWithEmailAndPassword(auth, emailNormalizado, senhaSegura);
      fbUser = userCredential.user;
    } catch (error: any) {
      // Se o usuário não existir, cria uma conta nova no Firebase Auth automaticamente
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/cannot-find-user') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, emailNormalizado, senhaSegura);
          fbUser = userCredential.user;
        } catch (signUpError: any) {
          if (signUpError.code === 'auth/email-already-in-use') {
            throw new Error('E-mail já está cadastrado com outra senha.');
          }
          throw new Error(signUpError.message || 'Falha ao criar credencial de e-mail.');
        }
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Senha incorreta para este e-mail.');
      } else {
        throw new Error(error.message || 'Falha na autenticação por e-mail.');
      }
    }

    // Valida o acesso no backend
    try {
      return await this.verifySessionWithServer(fbUser, nomeCompleto);
    } catch (err: any) {
      // Se não for autorizado pelo backend, limpa o estado de autenticação do cliente
      await signOut(auth);
      localStorage.removeItem(SESSION_USER_KEY);
      throw err;
    }
  },

  /**
   * Realiza login por Google Sign-In com Firebase Auth.
   */
  async loginWithGoogle(): Promise<Usuario> {
    const provider = new GoogleAuthProvider();
    let fbUser: User;

    try {
      const userCredential = await signInWithPopup(auth, provider);
      fbUser = userCredential.user;
    } catch (error: any) {
      throw new Error(error.message || 'Falha ao autenticar com o Google.');
    }

    try {
      return await this.verifySessionWithServer(fbUser);
    } catch (err: any) {
      await signOut(auth);
      localStorage.removeItem(SESSION_USER_KEY);
      throw err;
    }
  },

  /**
   * Envia e-mail de recuperação de senha do Firebase Auth.
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    console.log(`[AuthService] Link de recuperação de senha enviado para: ${email}`);
    // Na V1, mantemos simulado ou podemos usar a API do Firebase se necessário
    return new Promise((resolve) => setTimeout(resolve, 500));
  },

  /**
   * Finaliza a sessão do usuário no cliente e no Firebase.
   */
  async logout(): Promise<void> {
    await signOut(auth);
    localStorage.removeItem(SESSION_USER_KEY);
  },

  /**
   * Atualiza os dados de perfil do usuário logado na sessão ativa.
   */
  async updateSessionUser(usuario: Usuario): Promise<void> {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(usuario));
  },

  /**
   * Configura o ouvinte para sincronização e validação contínua da sessão ativa.
   */
  subscribeToAuthState(onUserChanged: (user: Usuario | null) => void) {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const validatedUser = await this.verifySessionWithServer(fbUser);
          onUserChanged(validatedUser);
        } catch (error) {
          console.error('Sessão ativa revogada ou inválida no servidor:', error);
          await signOut(auth);
          localStorage.removeItem(SESSION_USER_KEY);
          onUserChanged(null);
        }
      } else {
        localStorage.removeItem(SESSION_USER_KEY);
        onUserChanged(null);
      }
    });
  }
};
