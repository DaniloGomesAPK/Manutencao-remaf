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
  onAuthStateChanged,
  sendPasswordResetEmail as fbSendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, app } from '../config/firebase';
import { Usuario } from '../models/Usuario';
import { EmpresaService } from './EmpresaService';

const SESSION_USER_KEY = 'remaf_saas_user';
const db = getFirestore(app);

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
   * Processa e sincroniza a sessão do usuário diretamente com o Firestore (users/{uid}).
   * Garante que o uid autenticado no Firebase Auth seja a única autoridade.
   */
  async processUserSession(fbUser: User, nomeCompleto?: string): Promise<Usuario> {
    const uid = fbUser.uid;
    const userDocRef = doc(db, 'users', uid);
    
    let userSnap;
    try {
      userSnap = await getDoc(userDocRef);
    } catch (e) {
      console.warn('[AuthService] Falha ao consultar users/{uid} no Firestore:', e);
    }

    let empresaId = '';
    let statusConta: Usuario['statusConta'] = 'active';
    let dataCadastro = new Date().toISOString();
    let nomeExistente = '';

    if (userSnap && userSnap.exists()) {
      const uData = userSnap.data();
      empresaId = uData.empresaId || '';
      statusConta = uData.statusConta || 'active';
      dataCadastro = uData.dataCadastro || dataCadastro;
      nomeExistente = uData.nome || '';
    }

    // Se não encontrou no Firestore (ou falhou a leitura), tenta recuperar do cache de sessão
    if (!empresaId) {
      try {
        const cached = await this.getCurrentUser();
        if (cached && cached.id === uid) {
          if (cached.empresaId) empresaId = cached.empresaId;
        }
      } catch (_) {}
    }

    // Se o usuário não possui um empresaId registrado, utiliza um ID determinístico derivado do UID do usuário
    if (!empresaId) {
      const cleanUid = uid.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 20);
      empresaId = `emp_${cleanUid}`;
    }

    // Valida a licença existente para sincronizar o statusConta do usuário
    if (empresaId) {
      try {
        const LicenseService = (await import('./LicenseService')).LicenseService;
        const lic = await LicenseService.getLicenca(empresaId, uid);
        if (lic && lic.status && lic.status !== 'pending') {
          statusConta = lic.status as Usuario['statusConta'];
        }
      } catch (e) {
        console.warn('[AuthService] Não foi possível verificar licença em processUserSession:', e);
      }
    }

    const finalNome = nomeCompleto || fbUser.displayName || nomeExistente || fbUser.email?.split('@')[0] || 'Usuário';

    const usuario: Usuario = {
      id: uid,
      nome: finalNome,
      email: fbUser.email?.trim().toLowerCase() || '',
      empresaId,
      statusConta,
      dataCadastro,
      ultimoAcesso: new Date().toISOString()
    };

    // Atualiza/Cria o documento do usuário em users/{uid}
    try {
      await setDoc(userDocRef, {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        empresaId: usuario.empresaId,
        statusConta: usuario.statusConta,
        dataCadastro: usuario.dataCadastro,
        ultimoAcesso: usuario.ultimoAcesso
      }, { merge: true });
    } catch (e) {
      console.warn('[AuthService] Não foi possível salvar dados em users/{uid}:', e);
    }

    // Salva a sessão no localStorage para persistência rápida
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(usuario));

    // Garante que a empresa exista
    await EmpresaService.ensureEmpresaExists(usuario.empresaId, usuario);

    return usuario;
  },

  /**
   * Realiza o login utilizando EXCLUSIVAMENTE e-mail e senha cadastrados via Firebase Auth.
   * Cancela qualquer sessão ativa anterior antes de autenticar.
   */
  async login(email: string, password?: string): Promise<Usuario> {
    // 1. Limpa rigorosamente qualquer sessão e cache anteriores antes do novo login
    try {
      await signOut(auth);
    } catch (_) {}
    localStorage.removeItem(SESSION_USER_KEY);

    const emailNormalizado = email.trim().toLowerCase();
    if (!emailNormalizado || !password) {
      throw new Error('E-mail e senha são obrigatórios.');
    }

    let fbUser: User;

    try {
      // 2. Autenticação estrita via Firebase Auth (NUNCA recria conta nem aceita senhas de terceiros)
      const userCredential = await signInWithEmailAndPassword(auth, emailNormalizado, password);
      fbUser = userCredential.user;
    } catch (error: any) {
      // Em qualquer caso de erro de credenciais ou usuário não encontrado
      await signOut(auth);
      localStorage.removeItem(SESSION_USER_KEY);
      throw new Error('E-mail ou senha inválidos.');
    }

    // 3. Processa e valida a sessão associada ao uid do Firebase
    try {
      return await this.processUserSession(fbUser);
    } catch (err: any) {
      await signOut(auth);
      localStorage.removeItem(SESSION_USER_KEY);
      throw err;
    }
  },

  /**
   * Realiza o cadastro de uma nova conta utilizando e-mail e senha com Firebase Auth.
   */
  async register(
    email: string, 
    password: string, 
    nomeCompleto?: string, 
    nomeEmpresa?: string
  ): Promise<Usuario> {
    try {
      await signOut(auth);
    } catch (_) {}
    localStorage.removeItem(SESSION_USER_KEY);

    const emailNormalizado = email.trim().toLowerCase();
    if (!emailNormalizado || !password) {
      throw new Error('E-mail e senha são obrigatórios para cadastro.');
    }

    let fbUser: User;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailNormalizado, password);
      fbUser = userCredential.user;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este e-mail já está cadastrado no sistema.');
      }
      if (error.code === 'auth/weak-password') {
        throw new Error('A senha deve ter no mínimo 6 caracteres.');
      }
      throw new Error('Falha ao cadastrar usuário. Verifique os dados informados.');
    }

    const uid = fbUser.uid;
    const cleanUid = uid.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 20);
    const empresaId = `emp_${cleanUid}`;
    const finalNome = nomeCompleto?.trim() || fbUser.displayName || emailNormalizado.split('@')[0] || 'Usuário';
    const now = new Date().toISOString();

    const usuario: Usuario = {
      id: uid,
      nome: finalNome,
      email: emailNormalizado,
      empresaId,
      statusConta: 'active',
      dataCadastro: now,
      ultimoAcesso: now
    };

    // Salva em users/{uid}
    try {
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        empresaId: usuario.empresaId,
        statusConta: usuario.statusConta,
        dataCadastro: usuario.dataCadastro,
        ultimoAcesso: usuario.ultimoAcesso
      }, { merge: true });
    } catch (e) {
      console.warn('[AuthService] Erro ao salvar novo usuário em users/{uid}:', e);
    }

    // Salva perfil da empresa
    const nomeEmpresaFinal = nomeEmpresa?.trim() || 'DG Gestão Automotiva';
    await EmpresaService.saveEmpresa({
      id: empresaId,
      nomeFantasia: nomeEmpresaFinal,
      razaoSocial: nomeEmpresaFinal,
      cnpj: '00.000.000/0001-00',
      inscricaoEstadual: 'Isento',
      endereco: 'Rua Principal',
      numero: '100',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01000-000',
      telefone: '(11) 99999-9999',
      whatsapp: '(11) 99999-9999',
      email: emailNormalizado,
      usuarioProprietario: usuario,
      createdAt: now,
      updatedAt: now
    }, emailNormalizado);

    // Salva licença inicial pendente em empresas/{empresaId}/licenca/licencaAtual
    const LicenseService = (await import('./LicenseService')).LicenseService;
    await LicenseService.saveLicenca(empresaId, {
      empresaId,
      status: 'pending',
      plano: null,
      inicio: now,
      fim: now,
      trialInicio: null,
      trialFim: null,
      trialUtilizado: false,
      ultimaAtualizacao: now,
      origem: 'manual'
    });

    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(usuario));
    return usuario;
  },

  /**
   * Realiza login por Google Sign-In com Firebase Auth.
   */
  async loginWithGoogle(): Promise<Usuario> {
    try {
      await signOut(auth);
    } catch (_) {}
    localStorage.removeItem(SESSION_USER_KEY);

    const provider = new GoogleAuthProvider();
    let fbUser: User;

    try {
      const userCredential = await signInWithPopup(auth, provider);
      fbUser = userCredential.user;
    } catch (error: any) {
      throw new Error(error.message || 'Falha ao autenticar com o Google.');
    }

    try {
      return await this.processUserSession(fbUser);
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
    const emailNormalizado = email.trim().toLowerCase();
    if (!emailNormalizado) {
      throw new Error('Informe um e-mail válido para redefinir sua senha.');
    }

    try {
      await fbSendPasswordResetEmail(auth, emailNormalizado);
      console.log(`[AuthService] Link de recuperação de senha enviado para: ${emailNormalizado}`);
    } catch (error: any) {
      console.error('[AuthService] Erro ao enviar e-mail de recuperação:', error);
      if (error.code === 'auth/user-not-found') {
        throw new Error('Nenhuma conta foi encontrada com este e-mail.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('O formato do e-mail digitado é inválido.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Muitas tentativas. Aguarde alguns instantes e tente novamente.');
      } else {
        throw new Error(error.message || 'Erro ao enviar e-mail de redefinição de senha.');
      }
    }
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
          const validatedUser = await this.processUserSession(fbUser);
          onUserChanged(validatedUser);
        } catch (error) {
          console.error('[AuthService] Erro ao sincronizar estado de autenticação:', error);
          const cachedUser = await this.getCurrentUser();
          if (cachedUser && cachedUser.id === fbUser.uid && cachedUser.empresaId) {
            onUserChanged(cachedUser);
          } else {
            await signOut(auth);
            localStorage.removeItem(SESSION_USER_KEY);
            onUserChanged(null);
          }
        }
      } else {
        localStorage.removeItem(SESSION_USER_KEY);
        onUserChanged(null);
      }
    });
  }
};
