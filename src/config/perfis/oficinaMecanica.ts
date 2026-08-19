/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PerfilConfig } from './types';

const oficinaMecanica: PerfilConfig = {
  perfil: "oficina_mecanica",
  nome: "Oficina Mecânica",
  labels: {
    equipamento: "Veículo",
    identificacao: "Placa",
    ordemServico: "Ordem de Serviço",
    cliente: "Cliente",
    tecnico: "Mecânico / Técnico",
    servico: "Serviço / Mão de Obra",
    peca: "Peça / Componente",
    placa: "Placa do Veículo",
    chassi: "Chassi",
    quilometragem: "Quilometragem (KM)",
    horimetro: "Horímetro (Horas)",
    modelo: "Modelo",
    fabricante: "Fabricante / Marca",
    ano: "Ano de Fabricação"
  },
  campos: {
    cliente: true,
    equipamento: true,
    placa: true,
    chassi: true,
    quilometragem: true,
    modelo: true,
    fabricante: true,
    ano: true,
    horimetro: true,
    numeroSerie: false,
    patrimonio: false,
    localObra: false,
    responsavelObra: false,
    setor: false,
    linhaProducao: false
  },
  camposObrigatorios: {
    cliente: true,
    equipamento: true,
    placa: false,
    chassi: false,
    quilometragem: false,
    horimetro: false,
    modelo: false,
    fabricante: false,
    ano: false,
    numeroSerie: false,
    patrimonio: false,
    localObra: false,
    responsavelObra: false,
    setor: false,
    linhaProducao: false
  },
  layout: [
    'cliente',
    'equipamento',
    'placa',
    'chassi',
    'quilometragem',
    'horimetro',
    'fabricante',
    'modelo',
    'ano'
  ],
  placeholders: {
    equipamento: "Ex: Fiat Uno Mille 1.0",
    placa: "Ex: ABC-1234 / ABC1D23",
    chassi: "Ex: 9BWZZZ377...",
    quilometragem: "Ex: 85000",
    horimetro: "Ex: 1200",
    modelo: "Ex: Mille Way",
    fabricante: "Ex: Fiat"
  }
};

export default oficinaMecanica;
