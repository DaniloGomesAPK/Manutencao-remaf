/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StatusLicenca = 'pending' | 'trial' | 'active' | 'pago' | 'expired' | 'cancelled' | 'overdue' | 'blocked';

export interface EmailAutorizado {
  email: string;
  empresaId: string;
  status: StatusLicenca;
  plano: string | null;
  trialInicio: string | null;
  trialFim: string | null;
  validade: string | null;
  ativo: boolean;
  bloqueado: boolean;
  criadoEm?: any;
  createdAt?: any;
  ultimaAtualizacao?: string;
}

export interface LicencaAtual extends EmailAutorizado {
  id?: string;
  inicio?: string;
  fim?: string;
  trialUtilizado?: boolean;
  origem?: 'manual' | 'cakto';
}

export interface License extends LicencaAtual {
  // Propriedades mantidas para retrocompatibilidade
  trialAtivo?: boolean;
  trialDias?: number;
  dataAtivacao?: string;
  dataExpiracao?: string;
  ultimaVerificacao?: string;
  ultimaSincronizacao?: string;
  isActive?: boolean;
}


