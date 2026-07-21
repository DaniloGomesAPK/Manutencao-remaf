/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useContext, useEffect } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  ArrowLeft, 
  Check, 
  CheckCircle2, 
  Clipboard, 
  Cog, 
  Eye, 
  Save, 
  FileText, 
  Plus, 
  Trash2, 
  Calculator, 
  Search, 
  Sparkles,
  Wallet,
  CreditCard,
  Landmark,
  Coins
} from 'lucide-react';
import { OrdemDeServico, ItemOrcamento, Servico } from '../types';
import { formatToBrazilianDate } from '../utils/dateFormatter';
import { ServicoContext } from '../contexts/ServicoContext';
import { EmpresaContext } from '../contexts/EmpresaContext';
import { ServicoInteligenteService } from '../services/ServicoInteligenteService';
import AssistentePrecificacaoModal from './AssistentePrecificacaoModal';

interface OSFormStep3Props {
  initialData: Partial<OrdemDeServico>;
  onNext: (data: Partial<OrdemDeServico>) => void;
  onBack: () => void;
  onCancel?: () => void;
}

export default function OSFormStep3({ initialData, onNext, onBack, onCancel }: OSFormStep3Props) {
  const servicoCtx = useContext(ServicoContext);
  const { servicos } = servicoCtx || { servicos: [] };

  const empresaCtx = useContext(EmpresaContext);
  const company = empresaCtx?.empresa;

  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchSrvTerm, setSearchSrvTerm] = useState('');
  const [activeSmartService, setActiveSmartService] = useState<Servico | null>(initialData.rentabilidade ? { nome: initialData.rentabilidade.servicoExecutado, precoRecomendado: initialData.rentabilidade.precoRecomendado } as any : null);

  // New states for smart search and configured insertion
  const [isFullServiceListModalOpen, setIsFullServiceListModalOpen] = useState(false);
  const [isInsertionConfigOpen, setIsInsertionConfigOpen] = useState(false);
  const [selectedServiceForInsertion, setSelectedServiceForInsertion] = useState<Servico | null>(null);
  const [insertionType, setInsertionType] = useState<'detalhada' | 'resumida'>('detalhada');
  const [selectedPriceModal, setSelectedPriceModal] = useState<'minimo' | 'recomendado' | 'premium'>('recomendado');
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalCategory, setModalCategory] = useState('Todas');

  const [items, setItems] = useState<ItemOrcamento[]>(initialData.orcamento || []);
  const [orcamentoFinalizado, setOrcamentoFinalizado] = useState<boolean>(initialData.orcamento && initialData.orcamento.length > 0 ? true : false);
  const [orcamentoError, setOrcamentoError] = useState<string>('');

  // Commercial conditions states
  const [formaPagamento, setFormaPagamento] = useState<string>(initialData.formaPagamento || 'PIX');
  
  // PIX details
  const [tipoChavePix, setTipoChavePix] = useState<string>(initialData.tipoChavePix || company?.tipoChavePix || 'Chave Aleatória');
  const [chavePix, setChavePix] = useState<string>(initialData.chavePix || company?.chavePix || '');
  const [favorecidoPix, setFavorecidoPix] = useState<string>(initialData.favorecidoPix || company?.favorecidoPix || '');

  // Bank details
  const [banco, setBanco] = useState<string>(initialData.banco || company?.banco || '');
  const [agencia, setAgencia] = useState<string>(initialData.agencia || company?.agencia || '');
  const [conta, setConta] = useState<string>(initialData.conta || company?.conta || '');
  const [tipoConta, setTipoConta] = useState<string>(initialData.tipoConta || company?.tipoConta || 'Corrente');
  const [favorecidoConta, setFavorecidoConta] = useState<string>(initialData.favorecidoConta || company?.favorecidoConta || '');
  const [cpfCnpjConta, setCpfCnpjConta] = useState<string>(initialData.cpfCnpjConta || company?.cpfCnpjConta || '');

  // Custom details per payment method
  const [parcelamento, setParcelamento] = useState<string>(initialData.parcelamento || 'À vista');
  const [numeroPedidoCompra, setNumeroPedidoCompra] = useState<string>(initialData.numeroPedidoCompra || '');
  const [observacoesCheque, setObservacoesCheque] = useState<string>(initialData.observacoesCheque || '');
  const [observacoesComerciais, setObservacoesComerciais] = useState<string>(
    initialData.observacoesComerciais || company?.observacoesComerciaisPadrao || ''
  );

  useEffect(() => {
    if (company) {
      if (!initialData.observacoesComerciais && !observacoesComerciais) {
        setObservacoesComerciais(company.observacoesComerciaisPadrao || '');
      }
      if (!initialData.tipoChavePix && !tipoChavePix) {
        setTipoChavePix(company.tipoChavePix || 'Chave Aleatória');
      }
      if (!initialData.chavePix && !chavePix) {
        setChavePix(company.chavePix || '');
      }
      if (!initialData.favorecidoPix && !favorecidoPix) {
        setFavorecidoPix(company.favorecidoPix || '');
      }
      if (!initialData.banco && !banco) {
        setBanco(company.banco || '');
      }
      if (!initialData.agencia && !agencia) {
        setAgencia(company.agencia || '');
      }
      if (!initialData.conta && !conta) {
        setConta(company.conta || '');
      }
      if (!initialData.tipoConta && !tipoConta) {
        setTipoConta(company.tipoConta || 'Corrente');
      }
      if (!initialData.favorecidoConta && !favorecidoConta) {
        setFavorecidoConta(company.favorecidoConta || '');
      }
      if (!initialData.cpfCnpjConta && !cpfCnpjConta) {
        setCpfCnpjConta(company.cpfCnpjConta || '');
      }
    }
  }, [company]);

  const formasPagamentoList = [
    { id: 'PIX', label: 'PIX', icon: Coins },
    { id: 'Dinheiro', label: 'Dinheiro', icon: Wallet },
    { id: 'Cartão de Crédito', label: 'C. Crédito', icon: CreditCard },
    { id: 'Cartão de Débito', label: 'C. Débito', icon: CreditCard },
    { id: 'Boleto Bancário', label: 'Boleto', icon: FileText },
    { id: 'Pedido de Compra', label: 'Ped. Compra', icon: Clipboard },
    { id: 'Transferência Bancária', label: 'Transf. Banc.', icon: Landmark },
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const calculateTotalOrcamento = (itemsList: ItemOrcamento[]) => {
    return itemsList.reduce((sum, item) => sum + (item.quantidade * (item.valorUnitario || 0)), 0);
  };

  const handleItemChange = (index: number, field: keyof ItemOrcamento, value: any) => {
    setOrcamentoFinalizado(false);
    setOrcamentoError('');
    
    const updated = [...items];
    const item = { ...updated[index] };
    
    if (field === 'quantidade') {
      const q = value === '' ? 0 : Number(value);
      item.quantidade = q;
      item.valorTotal = q * (item.valorUnitario || 0);
    } else if (field === 'valorUnitario') {
      const u = value === '' ? 0 : Number(value);
      item.valorUnitario = u;
      item.valorTotal = (item.quantidade || 0) * u;
    } else if (field === 'descricao') {
      item.descricao = value;
    }
    
    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = () => {
    setOrcamentoFinalizado(false);
    setOrcamentoError('');
    const newItem: ItemOrcamento = {
      id: 'item_' + Math.random().toString(36).substring(2, 11),
      quantidade: 1,
      descricao: '',
      valorUnitario: 0,
      valorTotal: 0
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setOrcamentoFinalizado(false);
    setOrcamentoError('');
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleFinalizarOrcamento = () => {
    setOrcamentoError('');
    if (items.length === 0) {
      setOrcamentoError('Por favor, adicione pelo menos um item para finalizar o orçamento.');
      setOrcamentoFinalizado(false);
      return;
    }

    // Validate empty line fields
    const hasIncomplete = items.some(item => !item.descricao.trim() || item.quantidade <= 0 || item.valorUnitario < 0);
    if (hasIncomplete) {
      setOrcamentoError('Por favor, certifique-se de que todos os itens possuem descrição válida, quantidade maior que 0 e preço válido.');
      setOrcamentoFinalizado(false);
      return;
    }

    setOrcamentoFinalizado(true);
  };

  const injectServiceIntoOrcamento = async (srv: Servico, type: 'detalhada' | 'resumida' = 'detalhada', priceModal: 'minimo' | 'recomendado' | 'premium' = 'recomendado') => {
    setActiveSmartService(srv);
    try {
      await ServicoInteligenteService.registrarUtilizacao(srv.id, initialData.empresaId || 'emp_daniloempreendimentos');
      if (servicoCtx?.reloadServicos) {
        await servicoCtx.reloadServicos();
      }
    } catch (err) {
      console.warn("Erro ao registrar utilização do serviço inteligente:", err);
    }

    let priceToUse = srv.precoRecomendado;
    if (priceModal === 'minimo') priceToUse = srv.precoMinimo || srv.precoRecomendado;
    if (priceModal === 'premium') priceToUse = srv.precoPremium || srv.precoRecomendado;

    const newItems: ItemOrcamento[] = [];

    if (type === 'resumida') {
      newItems.push({
        id: 'item_srv_res_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        quantidade: 1,
        descricao: `${srv.nome}`,
        valorUnitario: priceToUse,
        valorTotal: priceToUse
      });
    } else {
      // Detailed: Lança materiais, mão de obra e custos operacionais
      const defaultPrice = srv.precoRecomendado;
      const adjustmentFactor = defaultPrice > 0 ? (priceToUse / defaultPrice) : 1;
      const markup = (srv.markup || 1) * adjustmentFactor;

      // 1. Add materials marked up
      if (srv.materiais && srv.materiais.length > 0) {
        srv.materiais.forEach((mat) => {
          const retailPrice = Number((mat.custoUnitario * markup).toFixed(2));
          newItems.push({
            id: 'item_mat_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
            quantidade: mat.quantidade,
            descricao: `[Peça] ${mat.descricao}`,
            valorUnitario: retailPrice,
            valorTotal: mat.quantidade * retailPrice
          });
        });
      }

      // 2. Add labor marked up
      const laborCost = (srv.tempoMedioExecucao || 0) * (srv.valorHora || 0);
      if (laborCost > 0) {
        const retailLabor = Number((laborCost * markup).toFixed(2));
        newItems.push({
          id: 'item_lab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
          quantidade: 1,
          descricao: `[Mão de Obra] ${srv.nome} (${srv.tempoMedioExecucao}h)`,
          valorUnitario: retailLabor,
          valorTotal: retailLabor
        });
      }

      // 3. Add fixed costs marked up
      if (srv.custosFixos && srv.custosFixos > 0) {
        const retailFixed = Number((srv.custosFixos * markup).toFixed(2));
        newItems.push({
          id: 'item_fix_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
          quantidade: 1,
          descricao: `[Rateio Operacional] Deslocamento / Custos Indiretos`,
          valorUnitario: retailFixed,
          valorTotal: retailFixed
        });
      }
    }

    if (items.length === 0) {
      setItems(newItems);
    } else {
      if (window.confirm("Deseja substituir o orçamento atual pelos itens do serviço inteligente? (Caso contrário, serão adicionados ao final)")) {
        setItems(newItems);
      } else {
        setItems([...items, ...newItems]);
      }
    }

    setOrcamentoFinalizado(false);
    setIsSearchOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length > 0 && !orcamentoFinalizado) {
      setOrcamentoError('Por favor, clique em "Finalizar Orçamento" para confirmar os cálculos.');
      return;
    }

    const total = calculateTotalOrcamento(items);

    // Calculate profitability metrics for final save
    let rentabilidade: any = undefined;
    if (activeSmartService) {
      const matCost = activeSmartService.materiais?.reduce((sum, m) => sum + (m.custoTotal || 0), 0) || 0;
      const labCost = (activeSmartService.tempoMedioExecucao || 0) * (activeSmartService.valorHora || 0);
      const fixCost = activeSmartService.custosFixos || 0;
      const totalCost = matCost + labCost + fixCost;
      
      const impCost = total * ((activeSmartService.impostos || 15) / 100);
      const profit = total - totalCost - impCost;
      const margin = total > 0 ? (profit / total) * 100 : 0;
      
      let res: 'Excelente' | 'Atencao' | 'Critica' = 'Excelente';
      if (total < (activeSmartService.precoMinimo || 0)) {
        res = 'Critica';
      } else if (total < (activeSmartService.precoRecomendado || 0)) {
        res = 'Atencao';
      }

      rentabilidade = {
        servicoExecutado: activeSmartService.nome,
        data: new Date().toISOString().split('T')[0],
        cliente: initialData.clienteNome || 'Cliente Geral',
        equipamento: initialData.equipamento || 'Equipamento Geral',
        precoCalculado: activeSmartService.precoRecomendado,
        precoCobrado: total,
        diferencaValor: total - activeSmartService.precoRecomendado,
        diferencaPercentual: activeSmartService.precoRecomendado > 0 ? ((total - activeSmartService.precoRecomendado) / activeSmartService.precoRecomendado) * 100 : 0,
        lucroEstimado: profit,
        margemObtida: margin,
        markupAplicado: totalCost > 0 ? total / totalCost : 1,
        resultado: res,
        precoMinimo: activeSmartService.precoMinimo || 0,
        precoRecomendado: activeSmartService.precoRecomendado || 0,
        precoPremium: activeSmartService.precoPremium || 0
      };
    }

    onNext({
      orcamento: items,
      valorTotalOrcamento: total,
      rentabilidade: rentabilidade || initialData.rentabilidade,
      
      // Commercial Conditions
      formaPagamento,
      tipoChavePix,
      chavePix,
      favorecidoPix,
      banco,
      agencia,
      conta,
      tipoConta,
      favorecidoConta,
      cpfCnpjConta,
      parcelamento,
      numeroPedidoCompra,
      observacoesCheque,
      observacoesComerciais
    });
  };

  // Pre-fill smart service quick lists based on database
  const smartTopServices = servicos
    .filter(s => s.quantidadeUtilizacoes && s.quantidadeUtilizacoes > 0)
    .sort((a, b) => (b.quantidadeUtilizacoes || 0) - (a.quantidadeUtilizacoes || 0))
    .slice(0, 3);

  return (
    <form id="step-3-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Short Context Grid */}
      <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Equipamento:</span>
          <span className="font-bold text-slate-800 text-sm truncate block">{initialData.equipamento}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Placa:</span>
          <span className="font-bold text-slate-800 font-mono text-sm uppercase">{initialData.placa || 'Sem placa'}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Protocolo:</span>
          <span className="font-bold text-[#003366] font-mono text-sm">{initialData.numeroOS}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Cliente:</span>
          <span className="font-bold text-slate-800 text-sm truncate block">{initialData.clienteNome || 'Não informado'}</span>
        </div>
      </div>

      {/* Módulo Orçamento (Substitui Peças Substituídas) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#003366]/5">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#003366]" />
            <div>
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">Itens e Serviços do Orçamento</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Adicione as peças, insumos de manutenção, fluidos e a mão de obra cobrada</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Quick Pricing Tool trigger */}
            <button
              id="btn-open-pricing-assistant"
              type="button"
              onClick={() => setIsPricingModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Calculadora Precificação
            </button>

            {/* Smart Library query trigger */}
            <button
              id="btn-open-smart-services"
              type="button"
              onClick={() => setIsFullServiceListModalOpen(true)}
              className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-3.5 py-2 rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              Pesquisar Banco Inteligente
            </button>
          </div>
        </div>

        {/* Smart top lists recommendation rails */}
        {smartTopServices.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
            <span className="font-bold text-[#003366] text-[10px] uppercase tracking-wider shrink-0">💡 Serviços mais Utilizados:</span>
            <div className="flex flex-wrap gap-2">
              {smartTopServices.map(srv => (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => {
                    setSelectedServiceForInsertion(srv);
                    setInsertionType('detalhada');
                    setSelectedPriceModal(srv.modalidadePreco || 'recomendado');
                    setIsInsertionConfigOpen(true);
                  }}
                  className="bg-white border border-slate-200 hover:border-[#003366]/40 text-slate-700 font-semibold px-2.5 py-1 rounded-md text-[10px] flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-[#FF6600]" />
                  <span>{srv.nome}</span>
                  <span className="text-emerald-600 font-mono font-bold">({formatCurrency(srv.precoRecomendado)})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Budget list input form rows */}
        <div className="p-5 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-3">
              <Clipboard className="w-8 h-8 mx-auto text-slate-300" />
              <div>
                <p className="text-xs font-bold">Nenhum item adicionado ao orçamento ainda.</p>
                <p className="text-[10px] text-slate-400 mt-1">Use os assistentes do banco inteligente acima ou lance manualmente novas linhas abaixo.</p>
              </div>
              <button
                id="btn-add-item-empty"
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 border-2 border-slate-200 text-[#003366] hover:bg-white bg-transparent font-black px-4 py-2 rounded-full text-[10px] uppercase tracking-wider cursor-pointer transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                Lançar Linha Manual
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop Headers */}
              <div className="hidden sm:grid grid-cols-12 gap-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100">
                <div className="col-span-2">Qtd</div>
                <div className="col-span-6">Descrição do Item / Peça / Serviço</div>
                <div className="col-span-2 text-right">Preço Unitário (R$)</div>
                <div className="col-span-1 text-right">Total</div>
                <div className="col-span-1"></div>
              </div>

              {/* Rows List */}
              <div className="space-y-2 max-h-[350px] overflow-y-auto divide-y divide-slate-100/50 pr-1">
                {items.map((item, index) => (
                  <div 
                    id={`orcamento-item-row-${index}`}
                    key={item.id} 
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 sm:pt-0 sm:items-center bg-slate-50/30 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-slate-100 sm:border-none"
                  >
                    {/* Qtd */}
                    <div className="col-span-2">
                      <label className="sm:hidden block text-[9px] font-black text-slate-400 uppercase mb-1">Qtd</label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        value={item.quantidade === 0 ? '' : item.quantidade}
                        onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                        className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#003366] font-mono text-center"
                        placeholder="1"
                      />
                    </div>

                    {/* Descricao */}
                    <div className="col-span-6">
                      <label className="sm:hidden block text-[9px] font-black text-slate-400 uppercase mb-1">Descrição</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Óleo Hidráulico Shell Tellus S2 V46, Coxim do Motor, Mão de obra..."
                        value={item.descricao}
                        onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
                        className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#003366] font-semibold"
                      />
                    </div>

                    {/* Preço Unitário */}
                    <div className="col-span-2 text-right">
                      <label className="sm:hidden block text-[9px] font-black text-slate-400 uppercase mb-1 text-left">Valor Unitário (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.valorUnitario === 0 ? '' : item.valorUnitario}
                        onChange={(e) => handleItemChange(index, 'valorUnitario', e.target.value)}
                        className="w-full sm:text-right bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#003366] font-mono"
                        placeholder="0,00"
                      />
                    </div>

                    {/* Preço Total (Read-only) */}
                    <div className="col-span-1 text-right">
                      <label className="sm:hidden block text-[9px] font-black text-slate-400 uppercase mb-1 text-left">Total</label>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        {formatCurrency((item.quantidade || 0) * (item.valorUnitario || 0))}
                      </span>
                    </div>

                    {/* Remove */}
                    <div className="col-span-1 text-right sm:text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
                        title="Remover Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add and Actions strip row */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  id="btn-add-item-row"
                  type="button"
                  onClick={handleAddItem}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1 border border-dashed border-slate-300 text-slate-500 hover:text-[#003366] hover:bg-slate-50 font-bold px-4 py-2 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Lançar Novo Item
                </button>

                <button
                  id="btn-finalizar-orcamento"
                  type="button"
                  onClick={handleFinalizarOrcamento}
                  className={`w-full sm:w-auto font-black text-[10px] uppercase tracking-widest px-6 py-2.5 rounded-full transition cursor-pointer flex items-center justify-center gap-2 ${
                    orcamentoFinalizado 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  }`}
                >
                  {orcamentoFinalizado ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Orçamento Calculado
                    </>
                  ) : (
                    <>
                      <Calculator className="w-3.5 h-3.5" />
                      Calcular e Finalizar Orçamento
                    </>
                  )}
                </button>
              </div>

              {/* Total Display summary Card */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Valor Consolidado Final</p>
                  <h4 className="text-2xl font-black text-[#003366] font-mono leading-none">
                    {formatCurrency(calculateTotalOrcamento(items))}
                  </h4>
                </div>
                
                {orcamentoFinalizado && activeSmartService && (
                  <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-150 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <span className="font-bold block text-[10px] uppercase">Análise de Rentabilidade Ativa</span>
                      Compare no resumo os custos e a margem obtida sobre este serviço inteligente.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Real-time status / warnings */}
          {orcamentoFinalizado && (
            <div className="bg-emerald-50 border border-emerald-150 rounded-lg p-3 flex items-start gap-2 text-emerald-800 text-xs">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Orçamento calculado e validado com sucesso!</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">O total de <strong className="font-mono">{formatCurrency(calculateTotalOrcamento(items))}</strong> foi salvo na Ordem de Serviço.</p>
              </div>
            </div>
          )}
        </div>

        {orcamentoError && (
          <div className="bg-rose-50 border border-rose-150 rounded-lg p-3 flex items-start gap-2 text-rose-800 text-xs text-left mx-5 mb-5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="font-semibold">{orcamentoError}</span>
          </div>
        )}
      </div>

      {/* SEÇÃO: CONDIÇÕES COMERCIAIS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-[#003366]/5 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[#003366]" />
          <div>
            <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">Condições Comerciais</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Selecione as condições de pagamento e dados de faturamento para o cliente</p>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Forma de Pagamento */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Forma de Pagamento</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {formasPagamentoList.map((item) => {
                const IconComponent = item.icon;
                const isSelected = formaPagamento === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormaPagamento(item.id)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#003366]/5 border-[#003366] text-[#003366] ring-2 ring-[#003366]/10 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <IconComponent className={`w-5 h-5 ${isSelected ? 'text-[#FF6600]' : 'text-slate-400'}`} />
                    <span className="text-[10px] uppercase font-black leading-tight tracking-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dinâmico por Tipo Selecionado */}
          {formaPagamento === 'PIX' && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-[#003366]">
                <Coins className="w-4 h-4 text-[#FF6600]" />
                <span className="text-[10px] uppercase font-black tracking-wider">Dados de Transferência PIX</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Tipo da Chave</label>
                  <select
                    value={tipoChavePix}
                    onChange={(e) => setTipoChavePix(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#003366]"
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Celular">Celular</option>
                    <option value="Chave Aleatória">Chave Aleatória</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Chave PIX</label>
                  <input
                    type="text"
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    placeholder="Chave para receber o PIX"
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#003366] font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Favorecido (Titular)</label>
                  <input
                    type="text"
                    value={favorecidoPix}
                    onChange={(e) => setFavorecidoPix(e.target.value)}
                    placeholder="Nome completo do titular"
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>
            </div>
          )}

          {(formaPagamento === 'Transferência Bancária' || formaPagamento === 'Boleto Bancário') && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-[#003366]">
                <Landmark className="w-4 h-4 text-[#003366]" />
                <span className="text-[10px] uppercase font-black tracking-wider">Dados Bancários para Recebimento</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Banco</label>
                  <input
                    type="text"
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    placeholder="Ex: Itaú, Bradesco"
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Agência</label>
                  <input
                    type="text"
                    value={agencia}
                    onChange={(e) => setAgencia(e.target.value)}
                    placeholder="Ex: 0001"
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#003366] font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Conta</label>
                  <input
                    type="text"
                    value={conta}
                    onChange={(e) => setConta(e.target.value)}
                    placeholder="Ex: 12345-6"
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#003366] font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Tipo de Conta</label>
                  <select
                    value={tipoConta}
                    onChange={(e) => setTipoConta(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#003366]"
                  >
                    <option value="Corrente">Corrente</option>
                    <option value="Poupança">Poupança</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Favorecido (Titular)</label>
                  <input
                    type="text"
                    value={favorecidoConta}
                    onChange={(e) => setFavorecidoConta(e.target.value)}
                    placeholder="Nome do titular"
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">CPF/CNPJ do Favorecido</label>
                  <input
                    type="text"
                    value={cpfCnpjConta}
                    onChange={(e) => setCpfCnpjConta(e.target.value)}
                    placeholder="Documento"
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#003366] font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {formaPagamento === 'Cartão de Crédito' && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-[#003366]">
                <CreditCard className="w-4 h-4 text-[#003366]" />
                <span className="text-[10px] uppercase font-black tracking-wider">Parcelamento do Cartão de Crédito</span>
              </div>
              <div className="space-y-1.5 max-w-xs">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Opções de Parcelamento</label>
                <select
                  value={parcelamento}
                  onChange={(e) => setParcelamento(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#003366]"
                >
                  <option value="À vista">À vista</option>
                  <option value="2x">2x sem juros</option>
                  <option value="3x">3x sem juros</option>
                  <option value="4x">4x sem juros</option>
                  <option value="5x">5x sem juros</option>
                  <option value="6x">6x sem juros</option>
                  <option value="10x">10x</option>
                  <option value="12x">12x</option>
                </select>
              </div>
            </div>
          )}

          {formaPagamento === 'Pedido de Compra' && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-[#003366]">
                <Clipboard className="w-4 h-4 text-[#003366]" />
                <span className="text-[10px] uppercase font-black tracking-wider">Pedido de Compra do Cliente</span>
              </div>
              <div className="space-y-1.5 max-w-sm">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Número do Pedido / Autorização</label>
                <input
                  type="text"
                  value={numeroPedidoCompra}
                  onChange={(e) => setNumeroPedidoCompra(e.target.value)}
                  placeholder="Insira o número do pedido de compra"
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#003366] font-mono"
                />
              </div>
            </div>
          )}

          {/* Observações Comerciais da OS */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Observações Comerciais para este Orçamento</label>
            <textarea
              rows={3}
              value={observacoesComerciais}
              onChange={(e) => setObservacoesComerciais(e.target.value)}
              placeholder="Ex: Condições de garantia, prazo de entrega..."
              className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg p-3 text-xs focus:outline-none focus:border-[#003366]"
            />
          </div>
        </div>
      </div>

      {/* Actions and navigation buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6">
        {onCancel && (
          <button
            id="btn-cancel-step-3"
            type="button"
            onClick={() => onCancel()}
            className="w-full sm:w-1/4 border-2 border-rose-200 text-rose-600 bg-transparent rounded-full py-3.5 font-bold tracking-widest text-[10px] uppercase hover:bg-rose-50 active:scale-98 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Cancelar</span>
          </button>
        )}

        <button
          id="btn-back-step-3"
          type="button"
          onClick={onBack}
          className="w-full sm:w-1/4 border-2 border-slate-200 text-slate-500 bg-transparent rounded-full py-3.5 font-bold tracking-widest text-[10px] uppercase hover:bg-slate-50 active:scale-98 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Voltar</span>
        </button>

        <button
          id="btn-save-step-3"
          type="submit"
          className="w-full sm:w-2/4 bg-[#FF6600] text-white rounded-full py-3.5 px-6 font-bold tracking-[0.12em] text-[10px] uppercase shadow-lg shadow-[#FF6600]/25 hover:bg-[#E05500] hover:shadow-xl active:scale-[0.99] flex items-center justify-center gap-2 transition duration-200 cursor-pointer"
        >
          <span>Salvar e Continuar</span>
          <ArrowLeft className="w-4 h-4 text-white rotate-180" />
        </button>
      </div>

      <AssistentePrecificacaoModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        onSuccess={(prec, srvSaved) => {
          injectServiceIntoOrcamento(srvSaved);
        }}
      />

      {/* Modal - Lista Inteira de Serviços */}
      {isFullServiceListModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#003366] text-white">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider">Lista de Serviços Inteligentes</h3>
                <p className="text-[10px] text-slate-200 mt-1">Selecione qualquer serviço do banco inteligente para a ordem de serviço</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFullServiceListModalOpen(false)}
                className="text-white/80 hover:text-white text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-lg transition cursor-pointer"
              >
                Fechar
              </button>
            </div>

            {/* Modal search and category bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Pesquisar por nome ou categoria..."
                value={modalSearchTerm}
                onChange={(e) => setModalSearchTerm(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#003366]"
              />
              <select
                value={modalCategory}
                onChange={(e) => setModalCategory(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="Todas">Todas as Categorias</option>
                {Array.from(new Set(servicos.map(s => s.categoria))).filter(Boolean).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Modal list of services */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {(() => {
                const filtered = servicos.filter(s => {
                  const matchSearch = s.nome.toLowerCase().includes(modalSearchTerm.toLowerCase()) || 
                                      (s.categoria && s.categoria.toLowerCase().includes(modalSearchTerm.toLowerCase()));
                  const matchCat = modalCategory === 'Todas' || s.categoria === modalCategory;
                  return matchSearch && matchCat;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-xs font-bold">Nenhum serviço encontrado no banco inteligente.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 gap-2">
                    {filtered.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedServiceForInsertion(s);
                          setInsertionType('detalhada');
                          setSelectedPriceModal(s.modalidadePreco || 'recomendado');
                          setIsInsertionConfigOpen(true);
                        }}
                        className="p-3.5 bg-white hover:bg-[#003366]/5 border border-slate-200 hover:border-[#003366]/30 rounded-2xl text-left transition flex items-center justify-between cursor-pointer shadow-xs"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#003366]">{s.nome}</p>
                          <span className="inline-block bg-slate-100 text-slate-500 font-extrabold text-[8px] px-1.5 py-0.5 rounded-md uppercase mt-1">
                            {s.categoria}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-emerald-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.precoRecomendado)}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{s.quantidadeUtilizacoes || 0} util.</p>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal - Configuração de Inserção */}
      {isInsertionConfigOpen && selectedServiceForInsertion && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">Configurar Lançamento</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{selectedServiceForInsertion.nome}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsInsertionConfigOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                Voltar
              </button>
            </div>

            {/* Modalidade de Preço Escolha */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Escolha o Preço a Praticar</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPriceModal('minimo')}
                  className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col justify-between ${
                    selectedPriceModal === 'minimo'
                      ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[8px] font-bold uppercase">Mínimo</span>
                  <span className="text-xs font-mono font-black mt-1 text-amber-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedServiceForInsertion.precoMinimo || selectedServiceForInsertion.precoRecomendado)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPriceModal('recomendado')}
                  className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col justify-between ${
                    selectedPriceModal === 'recomendado'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[8px] font-bold uppercase">Recomendado</span>
                  <span className="text-xs font-mono font-black mt-1 text-emerald-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedServiceForInsertion.precoRecomendado)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPriceModal('premium')}
                  className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col justify-between ${
                    selectedPriceModal === 'premium'
                      ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[8px] font-bold uppercase">Premium</span>
                  <span className="text-xs font-mono font-black mt-1 text-purple-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedServiceForInsertion.precoPremium || selectedServiceForInsertion.precoRecomendado)}
                  </span>
                </button>
              </div>
            </div>

            {/* Tipo de Inserção Escolha */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Método de Inserção</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setInsertionType('detalhada')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                    insertionType === 'detalhada'
                      ? 'bg-[#003366]/5 border-[#003366] text-[#003366] ring-2 ring-[#003366]/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-1 rounded-full mt-0.5 ${insertionType === 'detalhada' ? 'bg-[#003366] text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Inserção Detalhada</span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">
                      Lança peças, insumos, mão de obra e custos separadamente de forma discriminada no orçamento (como itens de orçamento individuais).
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInsertionType('resumida')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                    insertionType === 'resumida'
                      ? 'bg-[#FF6600]/5 border-[#FF6600] text-[#FF6600] ring-2 ring-[#FF6600]/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-1 rounded-full mt-0.5 ${insertionType === 'resumida' ? 'bg-[#FF6600] text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Inserção Resumida</span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">
                      Lança apenas uma única linha consolidada no orçamento contendo o nome do serviço e o preço total de venda selecionado.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsInsertionConfigOpen(false)}
                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  injectServiceIntoOrcamento(selectedServiceForInsertion, insertionType, selectedPriceModal);
                  setIsInsertionConfigOpen(false);
                  setIsFullServiceListModalOpen(false);
                }}
                className="flex-1 bg-[#FF6600] hover:bg-[#dd5500] text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md shadow-[#FF6600]/25 cursor-pointer"
              >
                Confirmar Lançamento
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
