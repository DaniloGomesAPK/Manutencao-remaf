/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PerfilConfig } from './types';

const outro: PerfilConfig = {
  perfil: "outro",
  nome: "Outro Segmento",
  labels: {
    equipamento: "Equipamento / Ativo",
    identificacao: "Identificação / Placa / Série",
    ordemServico: "Ordem de Serviço",
    cliente: "Cliente",
    tecnico: "Técnico Responsável",
    servico: "Serviço / Mão de Obra",
    peca: "Peça / Componente",
    placa: "Placa / Identificador",
    chassi: "Chassi",
    quilometragem: "Quilometragem (KM)",
    horimetro: "Horímetro",
    modelo: "Modelo",
    fabricante: "Fabricante",
    numeroSerie: "Número de Série",
    patrimonio: "Patrimônio",
    localObra: "Local / Endereço",
    responsavelObra: "Responsável",
    setor: "Setor",
    linhaProducao: "Linha de Produção"
  },
  campos: {
    cliente: true,
    equipamento: true,
    placa: true,
    chassi: true,
    quilometragem: true,
    horimetro: true,
    modelo: true,
    fabricante: true,
    ano: true,
    numeroSerie: true,
    patrimonio: true,
    localObra: true,
    responsavelObra: true,
    setor: true,
    linhaProducao: true
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
    'numeroSerie',
    'patrimonio',
    'localObra',
    'responsavelObra',
    'setor',
    'linhaProducao',
    'fabricante',
    'modelo',
    'ano'
  ]
};

export default outro;
