/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PerfilConfig } from './types';

const autonomo: PerfilConfig = {
  perfil: "autonomo",
  nome: "Autônomo",
  labels: {
    equipamento: "Item / Serviço",
    identificacao: "Identificador",
    ordemServico: "Orçamento / Ordem de Serviço",
    cliente: "Cliente",
    tecnico: "Responsável",
    servico: "Serviço",
    peca: "Item / Material",
    protocolo: "Nº do Orçamento",
    numeroOS: "Nº do Orçamento",
    placa: "Identificador",
    chassi: "Chassi",
    quilometragem: "Quilometragem (KM)",
    horimetro: "Horímetro",
    modelo: "Modelo",
    fabricante: "Fabricante",
    numeroSerie: "Número de Série",
    patrimonio: "Patrimônio",
    localObra: "Local",
    responsavelObra: "Responsável",
    setor: "Setor",
    linhaProducao: "Linha de Produção"
  },
  campos: {
    cliente: true,
    equipamento: false,
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
  camposObrigatorios: {
    cliente: true,
    equipamento: false,
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
    'cliente'
  ],
  placeholders: {
    cliente: "Nome do cliente ou empresa atendida..."
  },
  validationMessages: {
    cliente: "Por favor, informe o Cliente para continuar."
  }
};

export default autonomo;
