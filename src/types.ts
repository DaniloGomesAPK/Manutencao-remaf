/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ItemOrcamento {
  id: string;
  quantidade: number;
  descricao: string;
  valorUnitario: number;
  valorTotal: number;
}

export interface Cliente {
  id: string; // UUID/document ID
  empresaId: string; // Multi-Tenant SaaS isolation
  nome: string;
  documento: string; // CPF/CNPJ
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  observacoes?: string;
  sincronizado?: boolean;
  ultimaSincronizacao?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Equipamento {
  id: string; // EquipamentoID (UUID)
  empresaId: string; // Multi-Tenant SaaS isolation
  clienteId: string; // Selecionado a partir do Cadastro de Clientes
  clienteNome?: string; // Cache for display
  tipo: string; // Tipo do Equipamento
  fabricante: string;
  modelo: string;
  ano: string;
  placa: string;
  chassi: string;
  numeroSerie: string; // Número de Série / Identificação
  patrimonio?: string; // Opcional
  quilometragem?: number; // Quilometragem Atual [opcional]
  horimetro?: number; // Horímetro Atual [opcional]
  observacoes?: string;
  sincronizado?: boolean;
  ultimaSincronizacao?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrdemDeServico {
  id: string;
  empresaId?: string; // Vinculação com a Empresa Proprietária (Multi-Tenant SaaS)
  numeroOS: string;
  dataAbertura: string;
  horaAbertura: string;
  equipamento: string;
  placa: string;
  tecnico: string;
  
  // Novos campos integrados
  clienteId?: string;
  clienteNome?: string;
  quilometragem?: number;
  horimetro?: number;
  equipamentoId?: string; // Preparação para o Prontuário do Equipamento (vínculo futuro)
  
  // Etapa 2
  descricaoAvaria?: string;
  observacoesFotosAntes?: string;
  fotosAntes?: string[]; // URLs or base64 data
  fotosAntesDescricoes?: string[]; // captions for each before photo

  // Etapa 3
  servicoExecutado?: string;
  orcamento?: ItemOrcamento[];
  valorTotalOrcamento?: number;
  observacoesFinais?: string;
  status?: 'Concluído' | 'Concluído com restrições' | 'Pendente';
  fotosDepois?: string[]; // URLs or base64 data
  fotosDepoisDescricoes?: string[]; // captions for each after photo
  
  // Condições Comerciais e Dados Financeiros
  formaPagamento?: string;     // 'PIX' | 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Boleto Bancário' | 'Pedido de Compra' | 'Transferência Bancária' | 'Cheque'
  
  // Dados de PIX para a OS
  tipoChavePix?: string;
  chavePix?: string;
  favorecidoPix?: string;

  // Dados de Transferência Bancária para a OS
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: string;
  favorecidoConta?: string;
  cpfCnpjConta?: string;

  // Detalhes extras de pagamento
  parcelamento?: string;      // Ex: 'À vista', '2x', ..., '12x'
  numeroPedidoCompra?: string;
  observacoesCheque?: string;
  observacoesComerciais?: string; // Observações Comerciais da OS (com base na padrão da empresa)

  // Estrutura para futura evolução do SaaS (Parte 8)
  statusPagamento?: 'Pendente' | 'Pago' | 'Pago Parcialmente';
  valorPago?: number;
  dataPagamento?: string;
  saldoPendente?: number;
  historicoPagamentos?: Array<{
    id: string;
    data: string;
    valor: number;
    formaPagamento: string;
    observacoes?: string;
  }>;

  // Conclusão
  dataConclusao?: string;
  horaConclusao?: string;
  pdfGerado?: string; // URL or base64
  
  // Análise de Rentabilidade Integrada
  rentabilidade?: AnaliseRentabilidade;
  
  sincronizado?: boolean;
  ultimaSincronizacao?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type OSStep = 1 | 2 | 3 | 4 | 5;

// --- MODELOS DA CENTRAL DE PRECIFICAÇÃO INTELIGENTE ---

export interface Insumo {
  id: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  custoUnitario: number;
  custoTotal: number;
}

export interface Servico {
  id: string; // ServiçoID (UUID)
  empresaId: string;
  nome: string;
  categoria: string;
  descricao: string;
  materiais: Insumo[];
  tempoMedioExecucao: number; // em horas
  valorHora: number;
  custosFixos: number; // em valor absoluto
  impostos: number; // em % (ex: 15)
  margemUtilizada: number; // em % (ex: 25)
  markup: number;
  precoMinimo: number;
  precoRecomendado: number;
  precoPremium: number;
  precoSelecionado?: number;
  modalidadePreco?: 'minimo' | 'recomendado' | 'premium';
  tipoCadastro?: 'Cadastro Rápido' | 'Assistente de Precificação';
  dataCriacao: string;
  ultimaAtualizacao: string;
  quantidadeUtilizacoes: number;
  ultimaUtilizacao?: string;
  status: 'Ativo' | 'Inativo';
  sincronizado?: boolean;
  ultimaSincronizacao?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Precificacao {
  id: string;
  empresaId: string;
  servicoId?: string; // Se baseado em um serviço do banco
  nomeServico: string;
  categoria: string;
  descricao: string;
  materiais: Insumo[];
  tempoMedioExecucao: number; // horas
  valorHora: number;
  custosFixos: number; // valor absoluto
  impostos: number; // %
  margemUtilizada: number; // %
  markup: number;
  precoMinimo: number;
  precoRecomendado: number;
  precoPremium: number;
  precoSelecionado?: number;
  modalidadePreco?: 'minimo' | 'recomendado' | 'premium';
  custoTotalMateriais: number;
  custoTotalMaoDeObra: number;
  custoTotalFixos: number;
  custoTotalImpostos: number;
  lucroEsperado: number;
  sincronizado?: boolean;
  ultimaSincronizacao?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LancamentoFinanceiro {
  id: string;
  empresaId: string;
  tipo: 'receita' | 'despesa'; // Contas a Receber vs Contas a Pagar
  categoria: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';
  clienteId?: string;
  clienteNome?: string;
  osId?: string;
  osNumero?: string;
  formaPagamento?: string;
  observacoes?: string;
  sincronizado?: boolean;
  ultimaSincronizacao?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnaliseRentabilidade {
  servicoExecutado: string;
  data: string;
  cliente: string;
  equipamento: string;
  precoCalculado: number; // preço recomendado
  precoCobrado: number; // cobrado na OS
  diferencaValor: number; // cobrado - recomendado
  diferencaPercentual: number; // %
  lucroEstimado: number;
  margemObtida: number; // %
  markupAplicado: number;
  resultado: 'Excelente' | 'Atencao' | 'Critica'; // 🟢, 🟡, 🔴
  precoMinimo: number;
  precoRecomendado: number;
  precoPremium: number;
}

