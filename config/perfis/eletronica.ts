/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PerfilConfig } from './types';

const eletronica: PerfilConfig = {
  perfil: "eletronica",
  nome: "Eletrônica",
  labels: {
    equipamento: "Equipamento",
    identificacao: "Número de Série",
    ordemServico: "Ordem de Serviço",
    cliente: "Cliente",
    tecnico: "Técnico Eletrônico",
    servico: "Serviço / Reparo",
    peca: "Componente Eletrônico",
    modelo: "Modelo",
    numeroSerie: "Número de Série",
    fabricante: "Fabricante"
  },
  campos: {
    cliente: true,
    equipamento: true,
    modelo: true,
    numeroSerie: true,
    fabricante: true,
    placa: false,
    chassi: false,
    quilometragem: false,
    horimetro: false,
    ano: false,
    patrimonio: false,
    localObra: false,
    responsavelObra: false,
    setor: false,
    linhaProducao: false
  },
  camposObrigatorios: {
    cliente: true,
    equipamento: true,
    modelo: false,
    numeroSerie: false,
    fabricante: false,
    placa: false,
    chassi: false,
    quilometragem: false,
    horimetro: false,
    ano: false,
    patrimonio: false,
    localObra: false,
    responsavelObra: false,
    setor: false,
    linhaProducao: false
  },
  layout: ['cliente', 'equipamento', 'modelo', 'numeroSerie', 'fabricante'],
  placeholders: {
    equipamento: "Ex: TV Smart 55\"",
    modelo: "Ex: UN55AU7000",
    numeroSerie: "Ex: SN-550912",
    fabricante: "Ex: Samsung"
  }
};

export default eletronica;
