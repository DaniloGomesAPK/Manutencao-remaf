/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const AppConfig = {
  nomeAplicativo: 'DG Gestão Automotiva',
  versao: '2.0.0-SaaS',
  ambiente: typeof process !== 'undefined' && process.env ? process.env.NODE_ENV || 'production' : 'production',
  offline: true,
  firebaseHabilitado: false,
  sincronizacaoHabilitada: true,
  licenciamentoHabilitado: true,
  trialHabilitado: true,
  diasTrial: 15,
  apiBaseUrl: 'https://api.dggestaoautomotiva.com.br/v1',
  versaoMinimaSuportada: '1.0.0'
};
