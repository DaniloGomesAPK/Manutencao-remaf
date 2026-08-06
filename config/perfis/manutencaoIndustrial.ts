/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PerfilConfig } from './types';

const manutencaoIndustrial: PerfilConfig = {
  perfil: "manutencao_industrial",
  nome: "Manutenção Industrial",
  labels: {
    equipamento: "Equipamento",
    identificacao: "Patrimônio / Nº Série",
    ordemServico: "Ordem de Serviço Industrial",
    cliente: "Cliente",
    tecnico: "Técnico / Engenheiro de Manutenção",
    servico: "Serviço / Intervenção Técnica",
    peca: "Peça Industrial / Sobressalente",
    patrimonio: "Patrimônio",
    numeroSerie: "Número de Série",
    setor: "Setor",
    linhaProducao: "Linha de Produção",
    fabricante: "Fabricante",
    modelo: "Modelo"
  },
  campos: {
    cliente: true,
    equipamento: true,
    patrimonio: true,
    numeroSerie: true,
    setor: true,
    linhaProducao: true,
    modelo: true,
    fabricante: true,
    placa: false,
    chassi: false,
    quilometragem: false,
    horimetro: false,
    ano: false,
    localObra: false,
    responsavelObra: false
  },
  camposObrigatorios: {
    cliente: true,
    equipamento: true,
    patrimonio: true,
    setor: true,
    numeroSerie: false,
    linhaProducao: false,
    modelo: false,
    fabricante: false,
    placa: false,
    chassi: false,
    quilometragem: false,
    horimetro: false,
    ano: false,
    localObra: false,
    responsavelObra: false
  },
  layout: ['cliente', 'equipamento', 'patrimonio', 'numeroSerie', 'setor', 'linhaProducao', 'fabricante', 'modelo'],
  placeholders: {
    equipamento: "Ex: Torno CNC Indústrias Nardini",
    patrimonio: "Ex: IND-PAT-9011",
    setor: "Ex: Usinagem / Caldeiraria",
    linhaProducao: "Ex: Linha A - Estamparia",
    numeroSerie: "Ex: SN-88201",
    fabricante: "Ex: Nardini"
  }
};

export default manutencaoIndustrial;
