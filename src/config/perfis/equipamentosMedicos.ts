/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PerfilConfig } from './types';

const equipamentosMedicos: PerfilConfig = {
  perfil: "equipamentos_medicos",
  nome: "Equipamentos Médicos",
  labels: {
    equipamento: "Equipamento Médico",
    identificacao: "Patrimônio / Nº Série",
    ordemServico: "Ordem de Serviço",
    cliente: "Hospital / Clínica / Cliente",
    tecnico: "Engenheiro Clínico / Técnico",
    servico: "Serviço / Calibração / Manutenção",
    peca: "Peça / Acessório Médico",
    patrimonio: "Patrimônio",
    numeroSerie: "Número de Série",
    setor: "Setor Hospitalar",
    fabricante: "Fabricante",
    modelo: "Modelo"
  },
  campos: {
    cliente: true,
    equipamento: true,
    patrimonio: true,
    numeroSerie: true,
    setor: true,
    modelo: true,
    fabricante: true,
    placa: false,
    chassi: false,
    quilometragem: false,
    horimetro: false,
    ano: false,
    localObra: false,
    responsavelObra: false,
    linhaProducao: false
  },
  camposObrigatorios: {
    cliente: true,
    equipamento: true,
    patrimonio: true,
    numeroSerie: false,
    setor: false,
    modelo: false,
    fabricante: false,
    placa: false,
    chassi: false,
    quilometragem: false,
    horimetro: false,
    ano: false,
    localObra: false,
    responsavelObra: false,
    linhaProducao: false
  },
  layout: ['cliente', 'equipamento', 'patrimonio', 'numeroSerie', 'setor', 'fabricante', 'modelo'],
  placeholders: {
    equipamento: "Ex: Monitor Multiparamétrico / Electrocardiógrafo",
    patrimonio: "Ex: HOSP-PAT-3012",
    setor: "Ex: UTI Adulto / Centro Cirúrgico / Bloco B",
    numeroSerie: "Ex: SN-90182",
    fabricante: "Ex: Philips / GE Healthcare"
  }
};

export default equipamentosMedicos;
