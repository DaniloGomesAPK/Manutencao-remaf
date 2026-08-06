/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const PERFIL_EMPRESA_OPCOES = [
  'Oficina Mecânica',
  'Lava Jato',
  'Refrigeração',
  'Informática',
  'Eletrônica',
  'Energia Solar',
  'Construção Civil',
  'Manutenção Industrial',
  'Equipamentos Médicos',
  'Outro'
] as const;

export type PerfilEmpresaType = typeof PERFIL_EMPRESA_OPCOES[number];
