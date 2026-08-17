/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth } from '../../config/firebase';
import { EmailAutorizado, LicencaAtual, License } from '../../models/License';
import { LicenseService } from '../LicenseService';

export type AdminPlan = 'mensal' | 'anual';

export interface AdminLicenseResponse {
  success: boolean;
  action: string;
  targetEmail: string;
  empresaId: string;
  status: string;
  plano: string | null;
  validade: string | null;
  message: string;
  auditId: string;
}

/**
 * Cliente seguro para o endpoint administrativo server-side (/api/admin/license).
 * 
 * Envia estritamente:
 * - action
 * - email
 * - plano (quando aplicável: 'mensal' ou 'anual')
 * 
 * NUNCA envia: dias, accessUntil, validade calculada, empresaId, uid ou role.
 */
export const AdminLicenseService = {
  /**
   * Obtém o ID Token do administrador atualmente autenticado
   */
  async getAdminToken(): Promise<string> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Administrador não autenticado. Faça login para continuar.');
    }
    return await currentUser.getIdToken();
  },

  /**
   * Executa uma requisição segura para o backend administrativo
   */
  async executeAdminAction(
    action: 'activate' | 'renew' | 'block' | 'revoke',
    email: string,
    plano?: AdminPlan
  ): Promise<AdminLicenseResponse> {
    const idToken = await this.getAdminToken();

    const response = await fetch('/api/admin/license', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        action,
        email: email.trim().toLowerCase(),
        ...(plano ? { plano } : {}),
      }),
    });

    let result: any;
    try {
      result = await response.json();
    } catch (_) {
      throw new Error('Resposta inválida do servidor administrativo.');
    }

    if (!response.ok || !result.success) {
      throw new Error(result?.error || 'Falha ao executar a operação administrativa.');
    }

    return result as AdminLicenseResponse;
  },

  /**
   * Ativa a licença pós-pagamento via Pix ou liberação administrativa
   * O backend calcula automaticamente 30 dias (mensal) ou 365 dias (anual).
   */
  async ativarLicenca(email: string, plano: AdminPlan): Promise<LicencaAtual> {
    const result = await this.executeAdminAction('activate', email, plano);
    const mockEmailDoc: EmailAutorizado = {
      email: result.targetEmail,
      empresaId: result.empresaId,
      status: 'pago',
      plano: result.plano,
      validade: result.validade,
      accessUntil: result.validade,
      trialInicio: null,
      trialFim: null,
      ativo: true,
      bloqueado: false,
      ultimaAtualizacao: new Date().toISOString(),
    };
    return LicenseService.mapDocToLicencaAtual(mockEmailDoc, result.targetEmail);
  },

  /**
   * Renova/estende explicitamente a licença de um cliente
   * O backend calcula automaticamente +30 dias (mensal) ou +365 dias (anual).
   */
  async renovarLicenca(email: string, plano: AdminPlan): Promise<LicencaAtual> {
    const result = await this.executeAdminAction('renew', email, plano);
    const mockEmailDoc: EmailAutorizado = {
      email: result.targetEmail,
      empresaId: result.empresaId,
      status: 'pago',
      plano: result.plano,
      validade: result.validade,
      accessUntil: result.validade,
      trialInicio: null,
      trialFim: null,
      ativo: true,
      bloqueado: false,
      ultimaAtualizacao: new Date().toISOString(),
    };
    return LicenseService.mapDocToLicencaAtual(mockEmailDoc, result.targetEmail);
  },

  /**
   * Bloqueia administrativamente uma licença
   */
  async bloquearLicenca(email: string): Promise<License> {
    const result = await this.executeAdminAction('block', email);
    const mockEmailDoc: EmailAutorizado = {
      email: result.targetEmail,
      empresaId: result.empresaId,
      status: 'blocked',
      plano: result.plano,
      validade: result.validade,
      trialInicio: null,
      trialFim: null,
      ativo: false,
      bloqueado: true,
      ultimaAtualizacao: new Date().toISOString(),
    };
    const lic = LicenseService.mapDocToLicencaAtual(mockEmailDoc, result.targetEmail);
    return LicenseService.mapToLicenseObject(lic);
  },

  /**
   * Revoga administrativamente uma licença
   */
  async revogarLicenca(email: string): Promise<License> {
    const result = await this.executeAdminAction('revoke', email);
    const mockEmailDoc: EmailAutorizado = {
      email: result.targetEmail,
      empresaId: result.empresaId,
      status: 'cancelled',
      plano: result.plano,
      validade: result.validade,
      trialInicio: null,
      trialFim: null,
      ativo: false,
      bloqueado: false,
      ultimaAtualizacao: new Date().toISOString(),
    };
    const lic = LicenseService.mapDocToLicencaAtual(mockEmailDoc, result.targetEmail);
    return LicenseService.mapToLicenseObject(lic);
  },

  /**
   * Ativa a licença pós-pagamento (plano deve ser explicitamente informado)
   */
  async liberarLicenca(email: string, plano: AdminPlan): Promise<License> {
    const lic = await this.ativarLicenca(email, plano);
    return LicenseService.mapToLicenseObject(lic);
  },

  /**
   * Encerra administrativamente o período de teste
   */
  async encerrarPeriodoTeste(email: string): Promise<License> {
    return await this.revogarLicenca(email);
  },
};
