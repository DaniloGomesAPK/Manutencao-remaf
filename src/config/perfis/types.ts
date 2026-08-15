/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PerfilLabels {
  equipamento: string;
  identificacao: string;
  ordemServico: string;
  cliente: string;
  tecnico: string;
  servico: string;
  peca: string;

  // Rótulos de documento e protocolo
  protocolo?: string;
  numeroOS?: string;

  // Rótulos específicos de campos
  placa?: string;
  chassi?: string;
  quilometragem?: string;
  horimetro?: string;
  modelo?: string;
  fabricante?: string;
  ano?: string;
  numeroSerie?: string;
  patrimonio?: string;
  localObra?: string;
  responsavelObra?: string;
  setor?: string;
  linhaProducao?: string;
}

export type CampoKey =
  | 'cliente'
  | 'equipamento'
  | 'placa'
  | 'chassi'
  | 'quilometragem'
  | 'horimetro'
  | 'modelo'
  | 'fabricante'
  | 'ano'
  | 'numeroSerie'
  | 'patrimonio'
  | 'localObra'
  | 'responsavelObra'
  | 'setor'
  | 'linhaProducao';

export type PerfilCampos = Record<CampoKey, boolean>;
export type PerfilCamposObrigatorios = Record<CampoKey, boolean>;

export type PerfilPlaceholders = Partial<Record<CampoKey, string>>;
export type PerfilTooltips = Partial<Record<CampoKey, string>>;
export type PerfilValidationMessages = Partial<Record<CampoKey, string>>;

export interface PerfilConfig {
  perfil: string;
  nome: string;
  labels: PerfilLabels;
  campos: PerfilCampos;
  camposObrigatorios: PerfilCamposObrigatorios;
  layout: CampoKey[];
  placeholders?: PerfilPlaceholders;
  tooltips?: PerfilTooltips;
  validationMessages?: PerfilValidationMessages;
}
