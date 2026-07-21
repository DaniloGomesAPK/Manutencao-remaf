/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Usuario } from '../models/Usuario';
import { EmpresaService } from './EmpresaService';

const SESSION_USER_KEY = 'remaf_saas_user';

export const AuthService = {
  /**
   * Obtém o usuário atualmente autenticado.
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
   * Realiza o login utilizando e-mail (simulado para SaaS V1, preparado para Firebase).
   */
  async login(email: string, nomeCompleto?: string): Promise<Usuario> {
    const emailNormalizado = email.trim().toLowerCase();
    
    // Função auxiliar para geração de UUIDv4 robusto
    const generateUUID = (): string => {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Identificador permanente utilizando UUID (SaaS Multi-Tenant)
    const mappingKey = 'remaf_saas_email_to_company_map';
    let empresaId = '';
    try {
      const mappingStr = localStorage.getItem(mappingKey);
      const mapping = mappingStr ? JSON.parse(mappingStr) : {};
      if (mapping[emailNormalizado]) {
        empresaId = mapping[emailNormalizado];
      } else {
        empresaId = generateUUID();
        mapping[emailNormalizado] = empresaId;
        localStorage.setItem(mappingKey, JSON.stringify(mapping));
      }
    } catch (_) {
      empresaId = generateUUID();
    }

    const cleanEmailPrefix = emailNormalizado.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    const userId = `usr_${cleanEmailPrefix || 'default'}_${Math.random().toString(36).substring(2, 9)}`;

    const usuario: Usuario = {
      id: userId,
      nome: nomeCompleto || 'Proprietário ' + (cleanEmailPrefix.charAt(0).toUpperCase() + cleanEmailPrefix.slice(1)),
      email: emailNormalizado,
      empresaId: empresaId,
      statusConta: 'ativo',
      dataCadastro: new Date().toISOString(),
      ultimoAcesso: new Date().toISOString()
    };

    // Salva o usuário na sessão (localStorage para persistência contínua)
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(usuario));

    // Garante que a empresa exista ou inicializa com os dados proprietários
    await EmpresaService.ensureEmpresaExists(empresaId, usuario);

    return usuario;
  },

  /**
   * Realiza login simulado por Google Sign-In.
   */
  async loginWithGoogle(): Promise<Usuario> {
    // Usando o e-mail ativo do usuário principal
    const defaultEmail = 'daniloempreendimentos@gmail.com';
    return this.login(defaultEmail, 'Danilo Empreendimentos');
  },

  /**
   * Envia e-mail de recuperação de senha (simulado).
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    console.log(`[AuthService] Link de recuperação de senha enviado para: ${email}`);
    return new Promise((resolve) => setTimeout(resolve, 500));
  },

  /**
   * Finaliza a sessão do usuário.
   */
  async logout(): Promise<void> {
    localStorage.removeItem(SESSION_USER_KEY);
  },

  /**
   * Atualiza os dados de perfil do usuário logado na sessão ativa.
   */
  async updateSessionUser(usuario: Usuario): Promise<void> {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(usuario));
  }
};
