/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PerfilConfig } from './types';

const refrigeracao: PerfilConfig = {
  perfil: "refrigeracao",
  nome: "Refrigeração",
  labels: {
    equipamento: "Equipamento",
    identificacao: "Número de Série",
    ordemServico: "Ordem de Serviço",
    cliente: "Cliente",
    tecnico: "Técnico em Refrigeração",
    servico: "Serviço / Manutenção",
    peca: "Peça / Gás / Componente",
    modelo: "Modelo",
    fabricante: "Fabricante",
    numeroSerie: "Número de Série"
  },
  campos: {
    cliente: true,
    equipamento: true,
    modelo: true,
    fabricante: true,
    numeroSerie: true,
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
    fabricante: false,
    numeroSerie: false,
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
  layout: ['cliente', 'equipamento', 'modelo', 'fabricante', 'numeroSerie'],
  placeholders: {
    equipamento: "Ex: Ar Condicionado Split 12000 BTUs",
    modelo: "Ex: Inverter HW",
    fabricante: "Ex: Elgin, Springer, Carrier",
    numeroSerie: "Ex: SN-998822"
  }
};

export default refrigeracao;
