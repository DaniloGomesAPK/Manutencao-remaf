/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth, db } from '../config/firebase';
import { 
  createUserWithEmailAndPassword,
  updateProfile,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { Usuario } from '../models/Usuario';
import { AuthService } from './AuthService';

export interface DadosCadastroTrial {
  nome?: string;
  nomeResponsavel?: string;
  email: string;
  whatsapp: string;
  nomeEmpresa: string;
  perfilEmpresa?: string;
  senha?: string;
}

export interface ResultadoCadastroTrial {
  user: User;
  empresaId: string;
  usuario: Usuario;
  email: string;
  nomeResponsavel: string;
  nomeEmpresa: string;
  perfilEmpresa: string;
  whatsapp: string;
}

/**
 * Validação de requisitos de segurança para senha forte:
 * - Mínimo 8 caracteres
 * - Pelo menos uma letra maiúscula
 * - Pelo menos uma letra minúscula
 * - Pelo menos um número
 * - Pelo menos um caractere especial
 */
export function validarForcaSenha(senha: string): { valida: boolean; mensagem?: string } {
  if (!senha || senha.length < 8) {
    return { valida: false, mensagem: 'A senha deve conter no mínimo 8 caracteres.' };
  }
  if (!/[A-Z]/.test(senha)) {
    return { valida: false, mensagem: 'A senha deve conter pelo menos uma letra maiúscula.' };
  }
  if (!/[a-z]/.test(senha)) {
    return { valida: false, mensagem: 'A senha deve conter pelo menos uma letra minúscula.' };
  }
  if (!/[0-9]/.test(senha)) {
    return { valida: false, mensagem: 'A senha deve conter pelo menos um número.' };
  }
  if (!/[^A-Za-z0-9]/.test(senha)) {
    return { valida: false, mensagem: 'A senha deve conter pelo menos um caractere especial (ex: @, #, $, %, etc).' };
  }
  return { valida: true };
}

/**
 * Solicita o ID Token do usuário autenticado e chama /api/onboarding/trial
 * para criar/vincular empresa, user e emailsAutorizados e liberar os 7 dias.
 */
export async function confirmarEmailEAtivarTrial(
  fbUser: User,
  dadosCadastro: {
    nomeResponsavel: string;
    nomeEmpresa: string;
    perfilEmpresa: string;
    whatsapp: string;
  }
): Promise<{ empresaId: string; usuario: Usuario }> {
  const emailClean = (fbUser.email || '').trim().toLowerCase();
  const uid = fbUser.uid;

  // 1. Obtenção do Firebase ID Token do usuário
  const idToken = await fbUser.getIdToken(true);

  // 2. Solicitação Server-Authoritative de criação de Tenant e Período Trial
  const response = await fetch('/api/onboarding/trial', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({
      nomeResponsavel: dadosCadastro.nomeResponsavel,
      nomeEmpresa: dadosCadastro.nomeEmpresa,
      perfilEmpresa: dadosCadastro.perfilEmpresa,
      whatsapp: dadosCadastro.whatsapp
    })
  });

  if (!response.ok) {
    let erroDetalhe = 'Falha ao processar cadastro no servidor.';
    try {
      const errorJson = await response.json();
      if (errorJson?.error) erroDetalhe = errorJson.error;
    } catch (_) {}
    throw new Error(erroDetalhe);
  }

  let serverResult: any;
  try {
    serverResult = await response.json();
  } catch (_) {
    throw new Error('Resposta inválida do servidor de cadastro.');
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
    throw new Error('Resposta incompleta do servidor de cadastro. Operação abortada.');
  }

  // 3. Executa processUserSession() após o sucesso do endpoint e confirma que empresaId existe
  let usuario: Usuario;
  try {
    usuario = await AuthService.processUserSession(fbUser, dadosCadastro.nomeResponsavel);
  } catch (sessErr: any) {
    console.warn('[TrialService] Aviso ao sincronizar processUserSession após onboarding:', sessErr);
    usuario = {
      id: uid,
      nome: serverResult.usuario.nome || dadosCadastro.nomeResponsavel,
      email: emailClean,
      empresaId: serverResult.empresaId,
      statusConta: serverResult.usuario.statusConta as any,
      dataCadastro: new Date().toISOString(),
      ultimoAcesso: new Date().toISOString()
    };
  }

  const empresaId: string = usuario.empresaId || serverResult.empresaId;
  if (!empresaId || !empresaId.trim()) {
    throw new Error('Erro ao validar vínculo da empresa com o usuário.');
  }

  const dataExpiracaoTrial: string = serverResult.dataExpiracaoTrial;
  const userRole: string = serverResult.usuario.role;
  const trialAtivo: boolean = serverResult.trialAtivo;

  // 4. Atualiza o armazenamento local para persistência de sessão e cache não privilegiado de UI
  localStorage.setItem('empresaId', empresaId);
  localStorage.setItem('userEmail', emailClean);
  localStorage.setItem('userName', usuario.nome);
  localStorage.setItem('userRole', userRole);
  localStorage.setItem('trial_active', trialAtivo ? 'true' : 'false');
  localStorage.setItem('trial_expiration', dataExpiracaoTrial);
  localStorage.setItem('perfilEmpresa', dadosCadastro.perfilEmpresa);

  return {
    empresaId,
    usuario
  };
}

/**
 * Cria a conta de autenticação no Firebase Auth com e-mail e senha
 * e aciona imediatamente /api/onboarding/trial para liberar os 7 dias e concluir a sessão.
 */
export async function iniciarCadastroTrial(dados: DadosCadastroTrial): Promise<ResultadoCadastroTrial> {
  const emailClean = dados.email.trim().toLowerCase();
  const nomeFinal = dados.nomeResponsavel?.trim() || dados.nome?.trim() || 'Administrador';
  const perfilEmpresaFinal = dados.perfilEmpresa || 'mecanica_pesada';
  const nomeEmpresaFinal = dados.nomeEmpresa?.trim() || 'Minha Empresa';
  const whatsappFinal = dados.whatsapp?.trim() || '';

  // 1. Validação estrita de senha forte no cliente
  const senhaInformada = dados.senha?.trim() || '';
  const validacaoSenha = validarForcaSenha(senhaInformada);
  if (!validacaoSenha.valida) {
    throw new Error(validacaoSenha.mensagem || 'Senha inválida.');
  }

  let fbUser: User;

  // 2. Criação do usuário no Firebase Auth
  try {
    const userCred = await createUserWithEmailAndPassword(auth, emailClean, senhaInformada);
    fbUser = userCred.user;

    await updateProfile(fbUser, {
      displayName: nomeFinal
    });
  } catch (createErr: any) {
    if (createErr?.code === 'auth/email-already-in-use') {
      const err: any = new Error('Sua conta já foi criada. Entre com seu e-mail e senha para concluirmos automaticamente a ativação dos seus 7 dias gratuitos.');
      err.code = 'auth/email-already-in-use';
      throw err;
    }
    throw new Error(`Falha ao registrar credenciais de autenticação: ${createErr?.message || 'Erro desconhecido'}`);
  }

  // 3. Ativação imediata do onboarding/trial e conclusão da sessão
  const { empresaId, usuario } = await confirmarEmailEAtivarTrial(fbUser, {
    nomeResponsavel: nomeFinal,
    nomeEmpresa: nomeEmpresaFinal,
    perfilEmpresa: perfilEmpresaFinal,
    whatsapp: whatsappFinal
  });

  return {
    user: fbUser,
    empresaId,
    usuario,
    email: emailClean,
    nomeResponsavel: nomeFinal,
    nomeEmpresa: nomeEmpresaFinal,
    perfilEmpresa: perfilEmpresaFinal,
    whatsapp: whatsappFinal
  };
}

export async function verificarAcessoTrial(empresaId: string): Promise<{ ativo: boolean; diasRestantes: number; expirado: boolean }> {
  try {
    if (!empresaId || !empresaId.trim()) {
      return { ativo: false, diasRestantes: 0, expirado: true };
    }

    const docRef = doc(db, 'empresas', empresaId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn(`[TrialService] Empresa ${empresaId} não foi encontrada no Firestore.`);
      return { ativo: false, diasRestantes: 0, expirado: true };
    }

    const data = docSnap.data();

    // Se a empresa estiver bloqueada ou inativa -> Acesso negado
    if (data.ativo === false || data.bloqueado === true) {
      return { ativo: false, diasRestantes: 0, expirado: true };
    }
    
    // Obter data de expiração oficial
    const rawExpiration = data.dataExpiracaoTrial || data.dataExpiracaoLicenca || data.validade || data.accessUntil;
    if (!rawExpiration) {
      return { ativo: false, diasRestantes: 0, expirado: true };
    }

    let expMs: number | null = null;
    if (typeof rawExpiration.toMillis === 'function') expMs = rawExpiration.toMillis();
    else if (typeof rawExpiration.toDate === 'function') expMs = rawExpiration.toDate().getTime();
    else if (typeof rawExpiration.seconds === 'number') expMs = rawExpiration.seconds * 1000;
    else if (typeof rawExpiration === 'string' || typeof rawExpiration === 'number') {
      const d = new Date(rawExpiration);
      if (!isNaN(d.getTime())) expMs = d.getTime();
    }

    if (expMs === null || isNaN(expMs)) {
      return { ativo: false, diasRestantes: 0, expirado: true };
    }

    const agora = Date.now();
    const diffMs = expMs - agora;
    const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
      ativo: diasRestantes > 0,
      diasRestantes: Math.max(0, diasRestantes),
      expirado: diasRestantes <= 0
    };
  } catch (error) {
    console.warn('[TrialService] Verificação de acesso capturada (Fail-Closed):', error);
    return { ativo: false, diasRestantes: 0, expirado: true };
  }
}

export const TrialService = {
  iniciarCadastroTrial,
  confirmarEmailEAtivarTrial,
  verificarAcessoTrial,
  validarForcaSenha
};
