/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PerfilConfig } from './types';

const energiaSolar: PerfilConfig = {
  perfil: "energia_solar",
  nome: "Energia Solar",
  labels: {
    equipamento: "Sistema",
    identificacao: "Número de Série / Inversor",
    ordemServico: "Ordem de Serviço / Instalação",
    cliente: "Cliente / Unidade Consumidora",
    tecnico: "Engenheiro / Instalador Solar",
    servico: "Serviço / Instalação / Manutenção",
    peca: "Módulo / Inversor / Componente",
    numeroSerie: "Número de Série",
    localObra: "Local da Instalação",
    fabricante: "Fabricante",
    modelo: "Modelo"
  },
  campos: {
    cliente: true,
    equipamento: true,
    numeroSerie: true,
    localObra: true,
    fabricante: true,
    modelo: true,
    placa: false,
    chassi: false,
    quilometragem: false,
    horimetro: false,
    ano: false,
    patrimonio: false,
    responsavelObra: false,
    setor: false,
    linhaProducao: false
  },
  camposObrigatorios: {
    cliente: true,
    equipamento: true,
    localObra: true,
    numeroSerie: false,
    fabricante: false,
    modelo: false,
    placa: false,
    chassi: false,
    quilometragem: false,
    horimetro: false,
    ano: false,
    patrimonio: false,
    responsavelObra: false,
    setor: false,
    linhaProducao: false
  },
  layout: ['cliente', 'equipamento', 'numeroSerie', 'localObra', 'fabricante', 'modelo'],
  placeholders: {
    equipamento: "Ex: Gerador Fotovoltaico 10kWp",
    numeroSerie: "Ex: INV-8820192",
    localObra: "Ex: Av. Principal, Telhado Residencial, Bloco A",
    fabricante: "Ex: WEG / Canadian Solar",
    modelo: "Ex: SIW200 10K"
  }
};

export default energiaSolar;
