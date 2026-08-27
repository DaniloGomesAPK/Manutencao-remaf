/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PerfilConfig, CampoKey } from './types';
import oficinaMecanica from './oficinaMecanica';
import lavaJato from './lavaJato';
import refrigeracao from './refrigeracao';
import informatica from './informatica';
import eletronica from './eletronica';
import energiaSolar from './energiaSolar';
import construcaoCivil from './construcaoCivil';
import manutencaoIndustrial from './manutencaoIndustrial';
import equipamentosMedicos from './equipamentosMedicos';
import autonomo from './autonomo';
import outro from './outro';

export * from './types';

const PERFIS_MAP: Record<string, PerfilConfig> = {
  'autonomo': autonomo,
  'autônomo': autonomo,

  'oficina mecanica': oficinaMecanica,
  'oficina mecânica': oficinaMecanica,
  'oficina_mecanica': oficinaMecanica,
  'oficinamecanica': oficinaMecanica,

  'lava jato': lavaJato,
  'lava_jato': lavaJato,
  'lavajato': lavaJato,

  'refrigeracao': refrigeracao,
  'refrigeração': refrigeracao,

  'informatica': informatica,
  'informática': informatica,

  'eletronica': eletronica,
  'eletrônica': eletronica,

  'energia solar': energiaSolar,
  'energia_solar': energiaSolar,
  'energiasolar': energiaSolar,

  'construcao civil': construcaoCivil,
  'construção civil': construcaoCivil,
  'construcao_civil': construcaoCivil,

  'manutencao industrial': manutencaoIndustrial,
  'manutenção industrial': manutencaoIndustrial,
  'manutencao_industrial': manutencaoIndustrial,

  'equipamentos medicos': equipamentosMedicos,
  'equipamentos médicos': equipamentosMedicos,
  'equipamentos_medicos': equipamentosMedicos,

  'outro': outro
};

/**
 * Retorna o termo no plural de forma inteligente e adaptada ao português.
 */
export function toPlural(label: string): string {
  if (!label) return '';
  if (label.toLowerCase().includes('ordem de serviço')) {
    return label.replace(/Ordem de Serviço/i, 'Ordens de Serviço').replace(/ordem de serviço/i, 'ordens de serviço');
  }
  if (label.toLowerCase().includes('ordem de')) {
    return label.replace(/Ordem de/i, 'Ordens de').replace(/ordem de/i, 'ordens de');
  }
  if (label.toLowerCase().includes('ficha de')) {
    return label.replace(/Ficha de/i, 'Fichas de').replace(/ficha de/i, 'fichas de');
  }
  if (label.endsWith('o') || label.endsWith('a') || label.endsWith('e') || label.endsWith('u') || label.endsWith('i')) {
    return label + 's';
  }
  if (label.endsWith('r') || label.endsWith('z') || label.endsWith('n')) {
    return label + 'es';
  }
  if (label.endsWith('l')) {
    return label.slice(0, -1) + 'is';
  }
  return label + 's';
}

/**
 * Retorna automaticamente a configuração referente ao perfilEmpresa.
 * Caso o perfilEmpresa seja nulo, vazio ou desconhecido, retorna a configuração 'outro' como fallback.
 */
export function getPerfilConfig(perfilEmpresa?: string | null): PerfilConfig {
  if (!perfilEmpresa || typeof perfilEmpresa !== 'string') {
    return outro;
  }

  const key = perfilEmpresa.trim().toLowerCase();
  return PERFIS_MAP[key] || outro;
}

/**
 * Verifica se um determinado campo é visível no perfil fornecido.
 */
export function isCampoVisivel(config: PerfilConfig | undefined, campo: CampoKey): boolean {
  if (!config || !config.campos) return true;
  return config.campos[campo] !== false;
}

/**
 * Verifica se um determinado campo é de preenchimento obrigatório no perfil fornecido.
 */
export function isCampoObrigatorio(config: PerfilConfig | undefined, campo: CampoKey): boolean {
  if (!config || !config.camposObrigatorios) return false;
  return config.camposObrigatorios[campo] === true;
}

/**
 * Retorna o rótulo do campo com base no perfil ativo.
 */
export function getCampoLabel(config: PerfilConfig | undefined, campo: CampoKey, fallback?: string): string {
  if (!config || !config.labels) return fallback || campo;
  
  if (campo === 'cliente') return config.labels.cliente || fallback || 'Cliente';
  if (campo === 'equipamento') return config.labels.equipamento || fallback || 'Equipamento';
  if (campo === 'placa') return config.labels.placa || config.labels.identificacao || fallback || 'Placa';
  if (campo === 'chassi') return config.labels.chassi || fallback || 'Chassi';
  if (campo === 'quilometragem') return config.labels.quilometragem || fallback || 'Quilometragem (KM)';
  if (campo === 'horimetro') return config.labels.horimetro || fallback || 'Horímetro';
  if (campo === 'modelo') return config.labels.modelo || fallback || 'Modelo';
  if (campo === 'fabricante') return config.labels.fabricante || fallback || 'Fabricante';
  if (campo === 'ano') return config.labels.ano || fallback || 'Ano';
  if (campo === 'numeroSerie') return config.labels.numeroSerie || config.labels.identificacao || fallback || 'Número de Série';
  if (campo === 'patrimonio') return config.labels.patrimonio || fallback || 'Patrimônio';
  if (campo === 'localObra') return config.labels.localObra || config.labels.identificacao || fallback || 'Local da Obra';
  if (campo === 'responsavelObra') return config.labels.responsavelObra || fallback || 'Responsável pela Obra';
  if (campo === 'setor') return config.labels.setor || fallback || 'Setor';
  if (campo === 'linhaProducao') return config.labels.linhaProducao || fallback || 'Linha de Produção';

  return fallback || campo;
}

/**
 * Retorna o placeholder do campo com base no perfil ativo.
 */
export function getCampoPlaceholder(config: PerfilConfig | undefined, campo: CampoKey, fallback?: string): string {
  if (!config) return fallback || '';
  if (config.placeholders && config.placeholders[campo]) {
    return config.placeholders[campo]!;
  }
  return fallback || `Digite o ${getCampoLabel(config, campo)}...`;
}

/**
 * Retorna o tooltip do campo com base no perfil ativo.
 */
export function getCampoTooltip(config: PerfilConfig | undefined, campo: CampoKey): string | undefined {
  if (!config || !config.tooltips) return undefined;
  return config.tooltips[campo];
}

/**
 * Retorna a mensagem de validação customizada para um campo obrigatório.
 */
export function getCampoValidationMessage(config: PerfilConfig | undefined, campo: CampoKey): string {
  if (config?.validationMessages && config.validationMessages[campo]) {
    return config.validationMessages[campo]!;
  }
  const label = getCampoLabel(config, campo);
  return `O campo "${label}" é de preenchimento obrigatório.`;
}

/**
 * Retorna os campos visíveis ordenados conforme a definição do layout no perfil.
 */
export function getOrderedCamposVisiveis(config: PerfilConfig | undefined): CampoKey[] {
  if (!config) return ['cliente', 'equipamento', 'placa', 'modelo', 'fabricante'];
  const layout = config.layout || (Object.keys(config.campos) as CampoKey[]);
  return layout.filter(key => isCampoVisivel(config, key));
}

/**
 * Retorna o rótulo de protocolo ou número de documento com base no perfil ativo.
 */
export function getProtocoloLabel(config: PerfilConfig | undefined, fallback: string = 'Protocolo'): string {
  if (!config || !config.labels) return fallback;
  return config.labels.protocolo || config.labels.numeroOS || fallback;
}

export {
  oficinaMecanica,
  autonomo,
  lavaJato,
  refrigeracao,
  informatica,
  eletronica,
  energiaSolar,
  construcaoCivil,
  manutencaoIndustrial,
  equipamentosMedicos,
  outro
};
