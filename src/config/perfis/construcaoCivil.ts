/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PerfilConfig } from './types';

const construcaoCivil: PerfilConfig = {
  perfil: "construcao_civil",
  nome: "Construção Civil",
  labels: {
    equipamento: "Equipamento / Máquina",
    identificacao: "Local da Obra",
    ordemServico: "Ordem de Serviço / Obra",
    cliente: "Cliente",
    tecnico: "Engenheiro / Mestre de Obras",
    servico: "Serviço / Etapa da Obra",
    peca: "Material de Construção",
    modelo: "Modelo",
    fabricante: "Fabricante",
    localObra: "Local da Obra",
    responsavelObra: "Responsável pela Obra"
  },
  campos: {
    cliente: true,
    equipamento: true,
    modelo: true,
    fabricante: true,
    localObra: true,
    responsavelObra: true,
    placa: false,
    chassi: false,
    quilometragem: false,
    horimetro: false,
    ano: false,
    patrimonio: false,
    numeroSerie: false,
    setor: false,
    linhaProducao: false
  },
  camposObrigatorios: {
    cliente: true,
    localObra: true,
    responsavelObra: true,
    equipamento: false,
    modelo: false,
    fabricante: false,
    placa: false,
    chassi: false,
    quilometragem: false,
    horimetro: false,
    ano: false,
    patrimonio: false,
    numeroSerie: false,
    setor: false,
    linhaProducao: false
  },
  layout: ['cliente', 'equipamento', 'localObra', 'responsavelObra', 'modelo', 'fabricante'],
  placeholders: {
    equipamento: "Ex: Betoneira 400L / Escavadeira",
    localObra: "Ex: Residencial Alphaville - Lote 14 Quadra B",
    responsavelObra: "Ex: Eng. Carlos Eduardo / Mestre João",
    modelo: "Ex: CS 400",
    fabricante: "Ex: Menegotti"
  },
  tooltips: {
    localObra: "Endereço ou identificação da obra onde o serviço é executado",
    responsavelObra: "Nome do engenheiro, mestre de obras ou encarregado local"
  },
  validationMessages: {
    cliente: "O cliente contratante é obrigatório.",
    localObra: "O local da obra é obrigatório para o perfil de Construção Civil.",
    responsavelObra: "O responsável pela obra é obrigatório."
  }
};

export default construcaoCivil;
