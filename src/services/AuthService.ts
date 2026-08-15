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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Usuario } from '../models/Usuario';
import { EmpresaService } from './EmpresaService';
import { LogService } from './LogService';
import { safeStorage } from '../utils/safeStorage';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

const SESSION_USER_KEY = 'remaf_saas_user';

export const AuthService = {
  /**
   * Obtém o usuário atualmente autenticado a partir do cache local.
   */
  async getCurrentUser(): Promise<Usuario | null> {
    try {
      const stored = safeStorage.getItem(SESSION_USER_KEY);
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
    // 1. Forçar atualização do token com getIdToken(true) para garantir dados e Custom Claims atualizados
    if (typeof fbUser.getIdToken === 'function') {
      try {
        await fbUser.getIdToken(true);
      } catch (tokenErr) {
        console.warn('[AuthService] Aviso ao atualizar token ID:', tokenErr);
      }
    }

    // 2. Consultar o Firestore em emailsAutorizados/{email} ou empresas/{empresaId} para suporte a Trial
    const email = fbUser.email?.trim().toLowerCase();
    const uid = fbUser.uid;
    let empresaId = '';
    let statusConta: Usuario['statusConta'] = 'active';

    if (email) {
      const emailDocRef = doc(db, 'emailsAutorizados', email);
      try {
        const emailSnap = await getDoc(emailDocRef);
        if (emailSnap.exists()) {
          const emailData = emailSnap.data();
          empresaId = emailData.empresaId || '';
          const rawStatus = emailData.status || 'active';
          const rawAtivo = emailData.ativo ?? true;
          const rawCriadoEm = emailData.criadoEm || emailData.createdAt || emailData.trialInicio;

          const isPago = rawStatus === 'pago';

          let isTrialExpired = false;
          if (!isPago && rawStatus === 'trial' && rawCriadoEm) {
            let d: Date | null = null;
            if (typeof rawCriadoEm.toDate === 'function') d = rawCriadoEm.toDate();
            else if (typeof rawCriadoEm === 'object' && typeof rawCriadoEm.seconds === 'number') d = new Date(rawCriadoEm.seconds * 1000);
            else if (typeof rawCriadoEm === 'string' || typeof rawCriadoEm === 'number') d = new Date(rawCriadoEm);

            if (d && !isNaN(d.getTime())) {
              const diffMs = Date.now() - d.getTime();
              const diffDays = diffMs / (1000 * 60 * 60 * 24);
              if (diffDays > 7) {
                isTrialExpired = true;
              }
            }
          }

          if (!isPago && emailData.trialFim) {
            const trialFimMs = new Date(emailData.trialFim).getTime();
            if (!isNaN(trialFimMs) && Date.now() > trialFimMs) {
              isTrialExpired = true;
            }
          }

          if (!isPago && (rawStatus === 'expired' || isTrialExpired || rawAtivo === false || emailData.bloqueado === true)) {
            statusConta = 'expired';
          } else {
            statusConta = (rawStatus as Usuario['statusConta']) || 'active';
          }
        }
      } catch (e: any) {
        console.warn('[AuthService] Erro ao consultar emailsAutorizados no Firestore:', e);
      }
    }

    // Se não encontrou em emailsAutorizados, verifica a coleção empresas/{empresaId} (Empresa Trial)
    if (!empresaId) {
      const storedEmpresaId = localStorage.getItem('empresaId') || `emp_${uid}`;
      const empresaDocRef = doc(db, 'empresas', storedEmpresaId);

      try {
        const empresaSnap = await getDoc(empresaDocRef);
        if (empresaSnap.exists()) {
          const empData = empresaSnap.data();
          empresaId = storedEmpresaId;
          statusConta = empData.status === 'trial' ? 'active' : (empData.status || 'active');
        }
      } catch (e: any) {
        console.warn('[AuthService] Leitura de empresas capturada:', e);
        if (
          e?.code === 'permission-denied' ||
          e?.message?.toLowerCase().includes('permission-denied') ||
          e?.message?.toLowerCase().includes('insufficient permissions') ||
          e?.message?.toLowerCase().includes('permissão')
        ) {
          throw new Error('TRIAL_EXPIRADO');
        }
      }
    }

    const userDocRef = doc(db, 'users', uid);
    let userSnap;
    try {
      userSnap = await getDoc(userDocRef);
    } catch (e) {
      console.warn('[AuthService] Falha ao consultar users/{uid} no Firestore:', e);
    }

    let dataCadastro = new Date().toISOString();
    let nomeExistente = '';

    if (userSnap && userSnap.exists()) {
      const uData = userSnap.data();
      if (!empresaId) empresaId = uData.empresaId || '';
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

    // Salva a sessão no safeStorage para persistência rápida e segura contra QuotaExceeded
    safeStorage.setItem(SESSION_USER_KEY, JSON.stringify(usuario));

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
    safeStorage.removeItem(SESSION_USER_KEY);

    const emailNormalizado = email.trim().toLowerCase();
    if (!emailNormalizado || !password) {
      throw new Error('Por favor, informe seu e-mail e senha para entrar.');
    }

    let fbUser: User;

    try {
      // 2. Autenticação estrita via Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, emailNormalizado, password);
      fbUser = userCredential.user;
    } catch (error: any) {
      // Em qualquer caso de erro de credenciais ou usuário não encontrado
      await signOut(auth);
      safeStorage.removeItem(SESSION_USER_KEY);
      throw new Error(getFriendlyErrorMessage(error, 'E-mail ou senha incorretos. Verifique os dados digitados.'));
    }

    // 3. Processa e valida a sessão associada ao uid do Firebase
    try {
      return await this.processUserSession(fbUser);
    } catch (err: any) {
      await signOut(auth);
      safeStorage.removeItem(SESSION_USER_KEY);
      throw new Error(getFriendlyErrorMessage(err, 'Não foi possível carregar as informações do seu perfil.'));
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

    // 1. Autenticação via Firebase Auth (Criação de usuário)
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
    const nomeDigitado = nomeCompleto?.trim() || fbUser.displayName || emailNormalizado.split('@')[0] || 'Usuário';
    const oficinaDigitada = nomeEmpresa?.trim() || 'DG Gestão em Orçamentos';
    const now = new Date().toISOString();

    // 2. Envia imediatamente o documento com a estrutura estrita de segurança para 'emailsAutorizados/{email}'
    const emailAuthorizedDocRef = doc(db, 'emailsAutorizados', emailNormalizado);
    try {
      await setDoc(emailAuthorizedDocRef, {
        email: emailNormalizado,
        status: 'pending',        // Garante que nasce pendente
        ativo: false,             // Garante que nasce desativado administrativamente
        bloqueado: false,
        validade: now,            // Nasce com validade zerada/passada
        nomeCompleto: nomeDigitado,
        nomeEmpresa: oficinaDigitada,
        empresaId
      }, { merge: true });
    } catch (e) {
      console.warn('[AuthService] Falha ao criar documento em emailsAutorizados:', e);
    }

    const usuario: Usuario = {
      id: uid,
      nome: nomeDigitado,
      email: emailNormalizado,
      empresaId,
      statusConta: 'pending',
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
    await EmpresaService.saveEmpresa({
      id: empresaId,
      nomeFantasia: oficinaDigitada,
      razaoSocial: oficinaDigitada,
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

    safeStorage.setItem(SESSION_USER_KEY, JSON.stringify(usuario));
    return usuario;
  },

  /**
   * Realiza login por Google Sign-In com Firebase Auth.
   */
  async loginWithGoogle(): Promise<Usuario> {
    try {
      await signOut(auth);
    } catch (_) {}
    safeStorage.removeItem(SESSION_USER_KEY);

    const provider = new GoogleAuthProvider();
    let fbUser: User;

    try {
      const userCredential = await signInWithPopup(auth, provider);
      fbUser = userCredential.user;
    } catch (error: any) {
      throw new Error(getFriendlyErrorMessage(error, 'Falha ao autenticar com o Google. Tente novamente.'));
    }

    try {
      return await this.processUserSession(fbUser);
    } catch (err: any) {
      await signOut(auth);
      safeStorage.removeItem(SESSION_USER_KEY);
      throw new Error(getFriendlyErrorMessage(err, 'Falha ao processar login com o Google.'));
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
      throw new Error(getFriendlyErrorMessage(error, 'Erro ao enviar e-mail de redefinição de senha.'));
    }
  },

  /**
   * Consulta o perfil de autorização e verifica a expiração do trial de 7 dias e status ativo
   */
  async checkEmailAuthorized(email: string): Promise<{
    exists: boolean;
    data: any | null;
    status: string;
    ativo: boolean;
    criadoEm: any;
    isTrialExpired: boolean;
    isAccessBlocked: boolean;
    diasRestantes: number;
  }> {
    const emailClean = email?.trim().toLowerCase();
    if (!emailClean) {
      return {
        exists: false,
        data: null,
        status: 'pending',
        ativo: false,
        criadoEm: null,
        isTrialExpired: false,
        isAccessBlocked: true,
        diasRestantes: 0
      };
    }

    try {
      const emailDocRef = doc(db, 'emailsAutorizados', emailClean);
      const emailSnap = await getDoc(emailDocRef);

      if (emailSnap.exists()) {
        const data = emailSnap.data();
        const status = data.status || 'trial';
        const ativo = data.ativo ?? true;
        const criadoEm = data.criadoEm || data.createdAt || data.trialInicio;

        // Converter criadoEm para Date
        let criadoEmDate: Date | null = null;
        if (criadoEm) {
          if (typeof criadoEm.toDate === 'function') {
            criadoEmDate = criadoEm.toDate();
          } else if (typeof criadoEm === 'object' && typeof criadoEm.seconds === 'number') {
            criadoEmDate = new Date(criadoEm.seconds * 1000);
          } else if (typeof criadoEm === 'string' || typeof criadoEm === 'number') {
            const d = new Date(criadoEm);
            if (!isNaN(d.getTime())) criadoEmDate = d;
          }
        }

        const isPago = status === 'pago';
        const now = Date.now();
        let isTrialExpired = false;
        let diasRestantes = isPago ? 9999 : 7;

        if (!isPago && status === 'trial') {
          if (criadoEmDate) {
            const diffMs = now - criadoEmDate.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (diffDays > 7) {
              isTrialExpired = true;
              diasRestantes = 0;
            } else {
              diasRestantes = Math.max(0, Math.ceil(7 - diffDays));
            }
          }

          if (data.trialFim) {
            const trialFimMs = new Date(data.trialFim).getTime();
            if (!isNaN(trialFimMs) && now > trialFimMs) {
              isTrialExpired = true;
              diasRestantes = 0;
            }
          }
        } else if (!isPago && status === 'expired') {
          isTrialExpired = true;
          diasRestantes = 0;
        }

        const isAccessBlocked = isPago ? (ativo === false || data.bloqueado === true) : (ativo === false || data.bloqueado === true || isTrialExpired);

        return {
          exists: true,
          data,
          status,
          ativo,
          criadoEm,
          isTrialExpired,
          isAccessBlocked,
          diasRestantes
        };
      }
    } catch (e) {
      console.warn('[AuthService] Erro ao verificar emailsAutorizados:', e);
    }

    return {
      exists: false,
      data: null,
      status: 'pending',
      ativo: false,
      criadoEm: null,
      isTrialExpired: false,
      isAccessBlocked: false,
      diasRestantes: 7
    };
  },

  /**
   * Finaliza a sessão do usuário no cliente e no Firebase.
   */
  async logout(): Promise<void> {
    await signOut(auth);
    safeStorage.removeItem(SESSION_USER_KEY);
  },

  /**
   * Atualiza os dados de perfil do usuário logado na sessão ativa.
   */
  async updateSessionUser(usuario: Usuario): Promise<void> {
    safeStorage.setItem(SESSION_USER_KEY, JSON.stringify(usuario));
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
          console.error('[AuthService] Acesso negado ou erro ao sincronizar estado de autenticação:', error);
          await signOut(auth);
          safeStorage.removeItem(SESSION_USER_KEY);
          onUserChanged(null);
        }
      } else {
        safeStorage.removeItem(SESSION_USER_KEY);
        onUserChanged(null);
      }
    });
  }
};
