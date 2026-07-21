/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface License {
  id: string;               // LicenseID
  empresaId: string;        // EmpresaID
  plano: string;            // Plano contratado
  status: 'ativo' | 'suspenso' | 'expirado' | 'cancelado'; // Status da licença
  trialAtivo: boolean;      // Se está em período de testes
  trialDias: number;        // Dias totais ou restantes de trial
  dataAtivacao: string;     // Data de ativação
  dataExpiracao: string;    // Data de expiração
  ultimaVerificacao: string; // Última data de checagem
  ultimaSincronizacao: string; // Última sincronização com nuvem
  isActive: boolean;        // Flag rápido para acesso liberado
}
