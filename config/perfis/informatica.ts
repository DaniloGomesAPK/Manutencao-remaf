/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PerfilConfig } from './types';

const informatica: PerfilConfig = {
  perfil: "informatica",
  nome: "Informática",
  labels: {
    equipamento: "Equipamento",
    identificacao: "Patrimônio / Nº Série",
    ordemServico: "Ordem de Serviço",
    cliente: "Cliente",
    tecnico: "Técnico de TI",
    servico: "Serviço / Reparo",
    peca: "Componente / Peça",
    patrimonio: "Patrimônio",
    numeroSerie: "Número de Série",
    fabricante: "Fabricante",
    modelo: "Modelo"
  },
  campos: {
    cliente: true,
    equipamento: true,
    patrimonio: true,
    numeroSerie: true,
    fabricante: true,
    modelo: true,
    placa: false,
    chassi: false,
    quilometragem: false,
    horimetro: false,
    ano: false,
    localObra: false,
    responsavelObra: false,
    setor: false,
    linhaProducao: false
  },
  camposObrigatorios: {
    cliente: true,
    equipamento: true,
    patrimonio: true,
    numeroSerie: false,
    fabricante: false,
    modelo: false,
    placa: false,
    chassi: false,
    quilometragem: false,
    horimetro: false,
    ano: false,
    localObra: false,
    responsavelObra: false,
    setor: false,
    linhaProducao: false
  },
  layout: ['cliente', 'equipamento', 'patrimonio', 'numeroSerie', 'fabricante', 'modelo'],
  placeholders: {
    equipamento: "Ex: Notebook Dell Vostro",
    patrimonio: "Ex: PAT-2024-001",
    numeroSerie: "Ex: CN-0123456789",
    fabricante: "Ex: Dell",
    modelo: "Ex: Vostro 3510"
  }
};

export default informatica;
