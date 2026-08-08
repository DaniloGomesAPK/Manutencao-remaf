/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PerfilConfig } from './types';

const lavaJato: PerfilConfig = {
  perfil: "lava_jato",
  nome: "Lava Jato",
  labels: {
    equipamento: "Veículo",
    identificacao: "Placa",
    ordemServico: "Ordem de Serviço",
    cliente: "Cliente",
    tecnico: "Lavador / Atendente",
    servico: "Serviço / Lavagem",
    peca: "Produto / Adicional",
    placa: "Placa do Veículo",
    modelo: "Modelo",
    fabricante: "Marca / Fabricante"
  },
  campos: {
    cliente: true,
    equipamento: true,
    placa: true,
    modelo: true,
    fabricante: true,
    chassi: false,
    quilometragem: false,
    horimetro: false,
    ano: false,
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
    modelo: false,
    fabricante: false,
    chassi: false,
    quilometragem: false,
    horimetro: false,
    ano: false,
    numeroSerie: false,
    patrimonio: false,
    localObra: false,
    responsavelObra: false,
    setor: false,
    linhaProducao: false
  },
  layout: ['cliente', 'equipamento', 'placa', 'modelo', 'fabricante'],
  placeholders: {
    equipamento: "Ex: Honda Civic",
    placa: "Ex: ABC-1D23",
    modelo: "Ex: Civic EXL 2.0",
    fabricante: "Ex: Honda"
  }
};

export default lavaJato;
