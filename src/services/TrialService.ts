/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { Usuario } from '../models/Usuario';

export interface DadosCadastroTrial {
  nomeResponsavel: string;
  nomeEmpresa: string;
  email: string;
  whatsapp: string;
}

export async function cadastrarEmpresaTrial(dados: DadosCadastroTrial): Promise<{ empresaId: string; usuario: Usuario }> {
  try {
    let fbUser = auth.currentUser;
    let uid = fbUser?.uid;

    // 1. Tenta autenticar no Firebase Auth se não estiver logado
    if (!fbUser) {
      try {
        const userCredential = await signInAnonymously(auth);
        fbUser = userCredential.user;
        uid = fbUser.uid;
      } catch (anonErr: any) {
        console.warn('[TrialService] Login anônimo indisponível no Firebase Console, usando autenticação via e-mail:', anonErr?.code || anonErr?.message);
        
        const emailClean = dados.email.trim().toLowerCase();
        const tempPassword = `Trial@${dados.whatsapp.replace(/\D/g, '') || '2026'}`;

        try {
          const userCred = await createUserWithEmailAndPassword(auth, emailClean, tempPassword);
          fbUser = userCred.user;
          uid = fbUser.uid;
        } catch (createErr: any) {
          if (createErr?.code === 'auth/email-already-in-use') {
            try {
              const loginCred = await signInWithEmailAndPassword(auth, emailClean, tempPassword);
              fbUser = loginCred.user;
              uid = fbUser.uid;
            } catch (_) {
              uid = `usr_${emailClean.replace(/[^a-z0-9]/g, '')}`;
            }
          } else {
            uid = `usr_${emailClean.replace(/[^a-z0-9]/g, '')}_${Date.now()}`;
          }
        }
      }
    }

    const emailClean = dados.email.trim().toLowerCase();
    const finalUid = uid || `usr_trial_${Date.now()}`;
    
    // Cria referência dos documentos
    const empresaRef = doc(collection(db, 'empresas'));
    const empresaId = empresaRef.id || `emp_${finalUid}`;
    const emailDocRef = doc(db, 'emailsAutorizados', emailClean);

    // Usamos um BATCH para garantir que ou grava nos dois locais ou não grava em nenhum
    const batch = writeBatch(db);

    // 1. Grava na coleção 'empresas'
    batch.set(empresaRef, {
      id: empresaId,
      nomeResponsavel: dados.nomeResponsavel.trim(),
      nomeEmpresa: dados.nomeEmpresa.trim(),
      email: emailClean,
      whatsapp: dados.whatsapp.trim(),
      status: 'trial',
      criadoEm: serverTimestamp() // Seguro: Horário do servidor
    });

    // 2. Grava na coleção 'emailsAutorizados' (O que o sistema de licença busca)
    batch.set(emailDocRef, {
      email: emailClean,
      empresaId: empresaId,
      status: 'trial',
      ativo: true,
      criadoEm: serverTimestamp() // Seguro: Horário do servidor
    });

    // Executa as duas gravações simultaneamente
    await batch.commit();

    // Salva no localStorage para controle do PWA
    localStorage.setItem('empresaId', empresaId);
    localStorage.setItem('remaf_empresa_id', empresaId);
    localStorage.setItem('empresaNome', dados.nomeEmpresa.trim());

    // Perfil da sessão ativa
    const usuario: Usuario = {
      id: finalUid,
      nome: dados.nomeResponsavel.trim(),
      email: emailClean,
      empresaId: empresaId,
      statusConta: 'active',
      dataCadastro: new Date().toISOString(),
      ultimoAcesso: new Date().toISOString(),
    };

    localStorage.setItem('remaf_saas_user', JSON.stringify(usuario));

    return { empresaId, usuario };
  } catch (error: any) {
    console.error('[TrialService] Erro ao cadastrar trial:', error);

    if (
      error?.code === 'permission-denied' ||
      error?.message?.toLowerCase().includes('permission-denied') ||
      error?.message?.toLowerCase().includes('insufficient permissions')
    ) {
      throw new Error('TRIAL_EXPIRADO');
    }

    throw new Error(error.message || 'Falha ao realizar o cadastro do teste gratuito no sistema.');
  }
}

export const TrialService = {
  cadastrarEmpresaTrial,

  /**
   * Tenta ler os dados da empresa no Firestore para verificar a validade das regras de 7 dias.
   * Se o Firestore retornar 'permission-denied', o trial expirou no servidor do Firebase.
   */
  async verificarAcessoEmpresa(empresaId: string): Promise<boolean> {
    if (!empresaId) return false;

    try {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (_) {}
      }

      const empresaDocRef = doc(db, 'empresas', empresaId);
      const snapshot = await getDoc(empresaDocRef);

      if (!snapshot.exists()) {
        console.warn(`[TrialService] Empresa ${empresaId} não foi encontrada no Firestore.`);
        return false;
      }

      return true;
    } catch (error: any) {
      console.warn('[TrialService] Verificação de acesso capturada:', error);

      if (
        error?.code === 'permission-denied' ||
        error?.message?.toLowerCase().includes('permission-denied') ||
        error?.message?.toLowerCase().includes('insufficient permissions') ||
        error?.message?.toLowerCase().includes('permissão')
      ) {
        throw new Error('TRIAL_EXPIRADO');
      }

      throw error;
    }
  },
};
