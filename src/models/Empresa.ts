/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Usuario } from './Usuario';

export interface EmpresaRecursos {
  fotosAntesDepois?: boolean; // 'Registro Fotográfico Antes e Depois' - Padrão: false
  [key: string]: any;
}

export interface EmpresaConfiguracoes {
  customTheme?: string;
  pdfHeaderTemplate?: string;
  recursos?: EmpresaRecursos;
  [key: string]: any;
}

export interface Empresa {
  id: string;               // EmpresaID (identificador único UUID)
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  whatsapp: string;
  email: string;
  site?: string;
  slogan?: string;
  logomarca?: string;       // base64 representation of the logo
  
  perfilEmpresa?: string;   // Ex: 'Oficina Mecânica', 'Lava Jato', etc.
  configuracaoInicialConcluida?: boolean; // Flag de conclusão do assistente inicial
  
  regimeTributario?: string; // 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real' | 'Isento' | 'Outro'
  aliquotaImposto?: number;  // Alíquota efetiva de imposto em porcentagem (ex: 6.00 para 6%)
  
  configuracoes?: EmpresaConfiguracoes; // Configurações da empresa
  
  // Dados Financeiros
  tipoChavePix?: string;      // 'CPF' | 'CNPJ' | 'E-mail' | 'Celular' | 'Chave Aleatória'
  chavePix?: string;
  favorecidoPix?: string;
  
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: string;         // 'Corrente' | 'Poupança'
  favorecidoConta?: string;
  cpfCnpjConta?: string;
  
  observacoesComerciaisPadrao?: string; // Observações Comerciais Padrão (multilinhas)

  usuarioProprietario?: Usuario; // Usuário Proprietário

  createdAt?: string;
  updatedAt?: string;
}

