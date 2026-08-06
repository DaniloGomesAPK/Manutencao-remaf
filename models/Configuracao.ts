/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Configuracao {
  id: string;
  empresaId: string;
  customTheme: string;
  allowAutoFill: boolean;
  pdfHeaderTemplate?: string;
  notificacoesAtivas: boolean;
  limiteFotosPorRelatorio: number;
  versaoApp: string;
  updatedAt: string;
}
