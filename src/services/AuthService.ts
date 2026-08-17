/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Usuario } from '../models/Usuario';
import { EmpresaService } from './EmpresaService';
import { safeStorage } from '../utils/safeStorage';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

/**
 * Interface estrita para cache de UI (apenas dados cosméticos e não sensíveis).
 * Nenhum token, ID de sessão sensível, senha ou permissão customizada é gravado no storage.
 */
export interface UserUICache {
  nome: string;
  email: string;
  photoURL?: string;
}

const SESSION_UI_KEY = 'remaf_saas_user_ui';
const LEGACY_SESSION_KEY = 'remaf_saas_user';

export const AuthService = {
  /**
   * Obtém o usuário atualmente autenticado a partir do Firebase Auth nativo (fonte primária de autoridade).
   * Nunca confia no localStorage para concessão de acesso ou validação de segurança.
   */
  async getCurrentUser(): Promise<Usuario | null> {
    const fbUser = auth.currentUser;
    if (fbUser) {
      try {
        return await this.processUserSession(fbUser);
      } catch (e) {
        console.warn('[AuthService] Falha ao processar sessão de auth.currentUser:', e);
      }
    }
    return null;
  },

  /**
   * Retorna exclusivamente dados visuais e não sensíveis de UI para evitar flicker durante a inicialização.
   * Não confere autenticação nem permissões administrativas.
   */
  getUserUICache(): UserUICache | null {
    try {
      const stored = safeStorage.getItem(SESSION_UI_KEY);
      if (stored) {
        return JSON.parse(stored) as UserUICache;
      }
    } catch (e) {
      console.warn('[AuthService] Erro ao ler cache de UI não sensível:', e);
    }
    return null;
  },

  /**
   * Processa e sincroniza a sessão do usuário diretamente com o Firestore (users/{uid}).
   * O estado nativo do Firebase Auth é a autoridade central.
   */
  async processUserSession(fbUser: User, nomeCompleto?: string): Promise<Usuario> {
    // 1. Forçar atualização do token com getIdToken(true) para garantir claims atualizadas
    if (typeof fbUser.getIdToken === 'function') {
      try {
        await fbUser.getIdToken(true);
      } catch (tokenErr) {
        console.warn('[AuthService] Aviso ao atualizar token ID:', tokenErr);
      }
    }

    // 2. Consultar o Firestore em emailsAutorizados/{email} ou empresas/{empresaId} para validação de licença/status
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
          const rawStatus = emailData.status || (emailData.trialAtivo ? 'trial' : 'active');
          const rawAtivo = emailData.ativo ?? true;
          const rawBloqueado = emailData.bloqueado ?? false;
          const rawCriadoEm = emailData.criadoEm || emailData.createdAt || emailData.trialInicio || emailData.dataCriacao;
          const now = Date.now();

          // Helper para parsear accessUntil / validade
          let accessUntilMs: number | null = null;
          const rawAccessField = emailData.accessUntil || emailData.validade || emailData.trialFim || emailData.dataExpiracaoTrial;
          if (rawAccessField) {
            if (typeof rawAccessField.toMillis === 'function') accessUntilMs = rawAccessField.toMillis();
            else if (typeof rawAccessField.toDate === 'function') accessUntilMs = rawAccessField.toDate().getTime();
            else if (typeof rawAccessField.seconds === 'number') accessUntilMs = rawAccessField.seconds * 1000;
            else if (typeof rawAccessField === 'string' || typeof rawAccessField === 'number') {
              const d = new Date(rawAccessField);
              if (!isNaN(d.getTime())) accessUntilMs = d.getTime();
            }
          }

          const isPago = rawStatus === 'pago' || rawStatus === 'active';

          if (rawBloqueado === true || rawAtivo === false) {
            statusConta = 'blocked';
          } else if (isPago) {
            // Plano pago só é válido se accessUntil existir e ainda estiver no futuro
            if (accessUntilMs === null || isNaN(accessUntilMs) || now >= accessUntilMs) {
              statusConta = 'expired';
            } else {
              statusConta = 'active';
            }
          } else if (rawStatus === 'trial') {
            let isTrialExpired = false;
            if (accessUntilMs !== null && now >= accessUntilMs) {
              isTrialExpired = true;
            } else if (emailData.trialFim) {
              const trialFimMs = new Date(emailData.trialFim).getTime();
              if (!isNaN(trialFimMs) && now > trialFimMs) {
                isTrialExpired = true;
              }
            } else if (rawCriadoEm) {
              let d: Date | null = null;
              if (typeof rawCriadoEm.toDate === 'function') d = rawCriadoEm.toDate();
              else if (typeof rawCriadoEm === 'object' && typeof rawCriadoEm.seconds === 'number') d = new Date(rawCriadoEm.seconds * 1000);
              else if (typeof rawCriadoEm === 'string' || typeof rawCriadoEm === 'number') d = new Date(rawCriadoEm);

              if (d && !isNaN(d.getTime())) {
                const diffMs = now - d.getTime();
                const diffDays = diffMs / (1000 * 60 * 60 * 24);
                if (diffDays > 7) {
                  isTrialExpired = true;
                }
              }
            }

            statusConta = isTrialExpired ? 'expired' : 'active';
          } else if (rawStatus === 'expired' || rawStatus === 'cancelled' || rawStatus === 'blocked' || rawStatus === 'overdue') {
            statusConta = rawStatus as Usuario['statusConta'];
          } else {
            statusConta = 'pending';
          }
        }
      } catch (e: any) {
        console.warn('[AuthService] Erro ao consultar emailsAutorizados no Firestore:', e);
      }
    }

    const userDocRef = doc(db, 'users', uid);
    let userSnap;
    let dataCadastro = new Date().toISOString();
    let nomeExistente = '';

    try {
      userSnap = await getDoc(userDocRef);
      if (userSnap && userSnap.exists()) {
        const uData = userSnap.data();
        if (!empresaId) empresaId = uData.empresaId || '';
        dataCadastro = uData.dataCadastro || dataCadastro;
        nomeExistente = uData.nome || '';
      }
    } catch (e) {
      console.warn('[AuthService] Falha ao consultar users/{uid} no Firestore:', e);
    }

    // Se ainda não encontrou em emailsAutorizados nem users, verifica a coleção empresas/{empresaId}
    if (!empresaId) {
      const storedEmpresaId = localStorage.getItem('empresaId');
      if (storedEmpresaId) {
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
        }
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

    // Atualiza apenas dados permitidos (não-administrativos) em users/{uid} no Firestore
    try {
      await setDoc(userDocRef, {
        nome: usuario.nome,
        ultimoAcesso: usuario.ultimoAcesso
      }, { merge: true });
    } catch (e) {
      console.warn('[AuthService] Não foi possível atualizar último acesso em users/{uid}:', e);
    }

    // Salva APENAS dados cosméticos não sensíveis para renderização da UI no safeStorage
    const uiCache: UserUICache = {
      nome: usuario.nome,
      email: usuario.email,
      photoURL: fbUser.photoURL || undefined,
    };
    safeStorage.setItem(SESSION_UI_KEY, JSON.stringify(uiCache));
    safeStorage.removeItem(LEGACY_SESSION_KEY);

    // Garante que a empresa exista
    await EmpresaService.ensureEmpresaExists(usuario.empresaId, usuario);

    return usuario;
  },

  /**
   * Realiza o login utilizando EXCLUSIVAMENTE credenciais validadas pelo Firebase Auth.
   * Limpa qualquer cache prévio antes de autenticar.
   */
  async login(email: string, password?: string): Promise<Usuario> {
    // 1. Limpa rigorosamente qualquer sessão e cache anteriores antes do novo login
    try {
      await signOut(auth);
    } catch (_) {}
    safeStorage.removeItem(SESSION_UI_KEY);
    safeStorage.removeItem(LEGACY_SESSION_KEY);

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
      // Em qualquer caso de erro de credenciais, limpa todo o cache
      await signOut(auth);
      safeStorage.removeItem(SESSION_UI_KEY);
      safeStorage.removeItem(LEGACY_SESSION_KEY);
      throw new Error(getFriendlyErrorMessage(error, 'E-mail ou senha incorretos. Verifique os dados digitados.'));
    }

    // 3. Processa e valida a sessão associada ao uid nativo do Firebase Auth
    try {
      // Recarrega o usuário para sincronizar emailVerified
      try {
        await fbUser.reload();
      } catch (_) {}

      // Se o usuário ainda não confirmou o e-mail E não possui empresa configurada
      if (!fbUser.emailVerified) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        let userSnap;
        try {
          userSnap = await getDoc(userDocRef);
        } catch (_) {}
        
        const hasEmpresa = userSnap?.exists() && userSnap.data()?.empresaId;
        if (!hasEmpresa) {
          const unverifiedError: any = new Error('EMAIL_NOT_VERIFIED');
          unverifiedError.code = 'EMAIL_NOT_VERIFIED';
          unverifiedError.user = fbUser;
          throw unverifiedError;
        }
      }

      // Se o e-mail está verificado, verifica se o onboarding no Firestore está ausente/incompleto
      if (fbUser.emailVerified) {
        let needsRecovery = false;
        try {
          const emailDocRef = doc(db, 'emailsAutorizados', emailNormalizado);
          const emailSnap = await getDoc(emailDocRef);
          
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (!emailSnap.exists() || !userSnap.exists() || !userSnap.data()?.empresaId) {
            needsRecovery = true;
          }
        } catch (checkErr) {
          console.warn('[AuthService] Verificação de integridade de cadastro no login:', checkErr);
        }

        if (needsRecovery) {
          console.log('[AuthService] Onboarding incompleto detectado para usuário com e-mail verificado. Recuperando via backend seguro...');
          try {
            const idToken = await fbUser.getIdToken(true);
            const response = await fetch('/api/onboarding/trial', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({
                nomeResponsavel: fbUser.displayName || emailNormalizado.split('@')[0],
                nomeEmpresa: 'Minha Empresa',
                perfilEmpresa: 'mecanica_pesada'
              })
            });

            if (!response.ok) {
              const errJson = await response.json().catch(() => ({}));
              const errMsg = errJson?.error || '';
              if (errMsg.includes('expirado') || errMsg.includes('TRIAL_EXPIRED')) {
                throw new Error('TRIAL_EXPIRADO');
              }
              if (errMsg.includes('bloqueada') || errMsg.includes('bloqueado')) {
                throw new Error('CONTA_BLOQUEADA');
              }
              if (errMsg.includes('EMAIL_NAO_VERIFICADO')) {
                const unverifiedError: any = new Error('EMAIL_NOT_VERIFIED');
                unverifiedError.code = 'EMAIL_NOT_VERIFIED';
                unverifiedError.user = fbUser;
                throw unverifiedError;
              }
            }
          } catch (recErr: any) {
            if (
              recErr?.code === 'EMAIL_NOT_VERIFIED' ||
              recErr?.message === 'EMAIL_NOT_VERIFIED' ||
              recErr?.message === 'TRIAL_EXPIRADO' ||
              recErr?.message === 'CONTA_BLOQUEADA'
            ) {
              throw recErr;
            }
            console.warn('[AuthService] Aviso na recuperação de onboarding:', recErr);
          }
        }
      }

      return await this.processUserSession(fbUser);
    } catch (err: any) {
      if (err?.code === 'EMAIL_NOT_VERIFIED' || err?.message === 'EMAIL_NOT_VERIFIED') {
        throw err;
      }
      if (err?.message === 'TRIAL_EXPIRADO') {
        throw new Error('O período de avaliação gratuito de 7 dias desta conta já expirou.');
      }
      if (err?.message === 'CONTA_BLOQUEADA') {
        throw new Error('Esta conta foi bloqueada ou revogada administrativamente.');
      }
      await signOut(auth);
      safeStorage.removeItem(SESSION_UI_KEY);
      safeStorage.removeItem(LEGACY_SESSION_KEY);
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
    safeStorage.removeItem(SESSION_UI_KEY);
    safeStorage.removeItem(LEGACY_SESSION_KEY);

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
    const nomeDigitado = nomeCompleto?.trim() || fbUser.displayName || emailNormalizado.split('@')[0] || 'Usuário';
    const oficinaDigitada = nomeEmpresa?.trim() || 'DG Gestão em Orçamentos';

    await updateProfile(fbUser, { displayName: nomeDigitado });
    // 2. Envia e-mail de verificação obrigatoriamente
    try {
      await sendEmailVerification(fbUser);
    } catch (_) {}

    // 3. Validação de e-mail verificado
    if (!fbUser.emailVerified) {
      const unverifiedError: any = new Error('EMAIL_NOT_VERIFIED');
      unverifiedError.code = 'EMAIL_NOT_VERIFIED';
      unverifiedError.user = fbUser;
      throw unverifiedError;
    }

    const idToken = await fbUser.getIdToken(true);

    // 4. Criação do tenant e autorização de forma estritamente server-authoritative no backend
    const response = await fetch('/api/onboarding/trial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        nomeResponsavel: nomeDigitado,
        nomeEmpresa: oficinaDigitada,
        perfilEmpresa: 'mecanica_pesada',
      })
    });

    if (!response.ok) {
      let erroMsg = 'Falha ao registrar tenant no servidor.';
      try {
        const errorJson = await response.json();
        if (errorJson?.error) erroMsg = errorJson.error;
      } catch (_) {}
      throw new Error(erroMsg);
    }

    let serverResult: any;
    try {
      serverResult = await response.json();
    } catch (_) {
      throw new Error('Resposta inválida ou corrompida do servidor de cadastro.');
    }

    if (
      !serverResult ||
      typeof serverResult.empresaId !== 'string' ||
      !serverResult.empresaId.trim() ||
      typeof serverResult.dataExpiracaoTrial !== 'string' ||
      !serverResult.dataExpiracaoTrial.trim() ||
      typeof serverResult.trialAtivo !== 'boolean' ||
      !serverResult.usuario ||
      typeof serverResult.usuario.role !== 'string' ||
      !serverResult.usuario.role.trim() ||
      typeof serverResult.usuario.statusConta !== 'string' ||
      !serverResult.usuario.statusConta.trim()
    ) {
      throw new Error('Dados administrativos incompletos retornados pelo servidor de cadastro.');
    }

    const empresaId: string = serverResult.empresaId;
    const dataExpiracaoTrial: string = serverResult.dataExpiracaoTrial;
    const userRole: string = serverResult.usuario.role;
    const trialAtivo: boolean = serverResult.trialAtivo;
    const statusConta: string = serverResult.usuario.statusConta;

    const now = new Date().toISOString();
    const usuario: Usuario = {
      id: uid,
      nome: serverResult.usuario.nome || nomeDigitado,
      email: emailNormalizado,
      empresaId,
      statusConta: statusConta as any,
      dataCadastro: now,
      ultimoAcesso: now
    };

    localStorage.setItem('empresaId', empresaId);
    localStorage.setItem('userEmail', emailNormalizado);
    localStorage.setItem('userName', usuario.nome);
    localStorage.setItem('userRole', userRole);
    localStorage.setItem('trial_active', trialAtivo ? 'true' : 'false');
    localStorage.setItem('trial_expiration', dataExpiracaoTrial);
    localStorage.setItem('perfilEmpresa', 'mecanica_pesada');

    const uiCache: UserUICache = {
      nome: usuario.nome,
      email: usuario.email,
      photoURL: fbUser.photoURL || undefined,
    };
    safeStorage.setItem(SESSION_UI_KEY, JSON.stringify(uiCache));
    safeStorage.removeItem(LEGACY_SESSION_KEY);

    return usuario;
  },

  /**
   * Realiza login por Google Sign-In com Firebase Auth.
   */
  async loginWithGoogle(): Promise<Usuario> {
    try {
      await signOut(auth);
    } catch (_) {}
    safeStorage.removeItem(SESSION_UI_KEY);
    safeStorage.removeItem(LEGACY_SESSION_KEY);

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
      safeStorage.removeItem(SESSION_UI_KEY);
      safeStorage.removeItem(LEGACY_SESSION_KEY);
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
        let diasRestantes = 0;

        // Parse accessUntil / validade
        let accessUntilMs: number | null = null;
        const rawAccessField = data.accessUntil || data.validade;
        if (rawAccessField) {
          if (typeof rawAccessField.toMillis === 'function') accessUntilMs = rawAccessField.toMillis();
          else if (typeof rawAccessField.toDate === 'function') accessUntilMs = rawAccessField.toDate().getTime();
          else if (typeof rawAccessField.seconds === 'number') accessUntilMs = rawAccessField.seconds * 1000;
          else if (typeof rawAccessField === 'string' || typeof rawAccessField === 'number') {
            const d = new Date(rawAccessField);
            if (!isNaN(d.getTime())) accessUntilMs = d.getTime();
          }
        }

        let isPaidExpired = false;
        if (isPago) {
          if (accessUntilMs === null || isNaN(accessUntilMs) || now >= accessUntilMs) {
            isPaidExpired = true;
            diasRestantes = 0;
          } else {
            const diffMs = accessUntilMs - now;
            diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          }
        } else if (status === 'trial') {
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

          if (accessUntilMs !== null && now >= accessUntilMs) {
            isTrialExpired = true;
            diasRestantes = 0;
          }
        } else if (status === 'expired' || status === 'cancelled' || status === 'blocked' || status === 'overdue') {
          isTrialExpired = true;
          diasRestantes = 0;
        }

        const isAccessBlocked = isPago 
          ? (ativo === false || data.bloqueado === true || isPaidExpired)
          : (ativo === false || data.bloqueado === true || isTrialExpired || status === 'expired');

        return {
          exists: true,
          data,
          status,
          ativo,
          criadoEm,
          isTrialExpired: isTrialExpired || isPaidExpired,
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
      isAccessBlocked: true,
      diasRestantes: 0
    };
  },

  /**
   * Finaliza a sessão do usuário no cliente e no Firebase Auth.
   * Remove imediatamente todos os dados de cache de UI.
   */
  async logout(): Promise<void> {
    await signOut(auth);
    safeStorage.removeItem(SESSION_UI_KEY);
    safeStorage.removeItem(LEGACY_SESSION_KEY);
  },

  /**
   * Atualiza os dados de apresentação de UI do usuário logado na sessão ativa.
   */
  async updateSessionUser(usuario: Usuario): Promise<void> {
    const uiCache: UserUICache = {
      nome: usuario.nome,
      email: usuario.email,
    };
    safeStorage.setItem(SESSION_UI_KEY, JSON.stringify(uiCache));
  },

  /**
   * Configura o ouvinte para sincronização e validação contínua da sessão ativa nativa do Firebase Auth.
   * Esta é a única fonte de verdade para o ciclo de vida da autenticação.
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
          safeStorage.removeItem(SESSION_UI_KEY);
          safeStorage.removeItem(LEGACY_SESSION_KEY);
          onUserChanged(null);
        }
      } else {
        safeStorage.removeItem(SESSION_UI_KEY);
        safeStorage.removeItem(LEGACY_SESSION_KEY);
        onUserChanged(null);
      }
    });
  }
};
