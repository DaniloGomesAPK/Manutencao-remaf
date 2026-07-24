/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StatusLicenca = 'pending' | 'trial' | 'active' | 'expired' | 'cancelled' | 'overdue' | 'blocked';

export interface LicencaAtual {
  id?: string;
  empresaId: string;
  status: StatusLicenca;
  plano: string | null;            // 'trial_3dias' | 'mensal' | 'anual' | null
  inicio: string;                  // ISO Date string
  fim: string;                     // ISO Date string
  trialInicio: string | null;      // ISO Date string
  trialFim: string | null;         // ISO Date string
  trialUtilizado: boolean;
  ultimaAtualizacao: string;       // ISO Date string
  origem: 'manual' | 'cakto';
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

