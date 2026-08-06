/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  DollarSign, 
  Clock, 
  Percent, 
  TrendingUp, 
  Layers, 
  Check, 
  AlertCircle, 
  Briefcase, 
  Info,
  Sparkles,
  Save,
  Pencil
} from 'lucide-react';
import { PrecificacaoContext } from '../contexts/PrecificacaoContext';
import { ServicoContext } from '../contexts/ServicoContext';
import { EmpresaContext } from '../contexts/EmpresaContext';
import { Insumo, Precificacao, Servico } from '../types';

interface AssistentePrecificacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (precificacao: Precificacao, servicoSaved: Servico) => void;
  initialData?: Precificacao | Servico | null;
}

export default function AssistentePrecificacaoModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialData 
}: AssistentePrecificacaoModalProps) {
  const precificacaoCtx = useContext(PrecificacaoContext);
  const servicoCtx = useContext(ServicoContext);
  const empresaCtx = useContext(EmpresaContext);
  const company = empresaCtx?.empresa;
  const aliquotaEfetiva = company?.aliquotaImposto !== undefined ? company.aliquotaImposto : 6.00;

  const { calcularValores, savePrecificacao } = precificacaoCtx || {
    calcularValores: () => ({}),
    savePrecificacao: async () => ({} as Precificacao)
  };

  const { saveServico } = servicoCtx || {
    saveServico: async () => ({} as Servico)
  };

  // Step state
  const [step, setStep] = useState<number>(1);

  // Form states
  const [nomeServico, setNomeServico] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  
  // Insumos states
  const [materiais, setMateriais] = useState<Insumo[]>([]);
  const [matDesc, setMatDesc] = useState('');
  const [matQtd, setMatQtd] = useState('');
  const [matUnit, setMatUnit] = useState('UN');
  const [matCusto, setMatCusto] = useState('');

  // Editing Insumo states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editQtd, setEditQtd] = useState('');
  const [editUnit, setEditUnit] = useState('UN');
  const [editCusto, setEditCusto] = useState('');

  // Mao de Obra states
  const [tempoMedioExecucao, setTempoMedioExecucao] = useState<string>('2'); // default 2h
  const [valorHora, setValorHora] = useState<string>('50'); // default R$ 50/h

  // Custos Fixos e Impostos states
  const [custosFixos, setCustosFixos] = useState<string>('0');
  const [impostos, setImpostos] = useState<string>('15'); // default 15%

  // Margem de Lucro states
  const [margemUtilizada, setMargemUtilizada] = useState<number>(25); // default 25%

  // Resultado & Cálculo states
  const [calculated, setCalculated] = useState<any>(null);

  // Modalidade de preço selecionada
  const [modalidadePreco, setModalidadePreco] = useState<'minimo' | 'recomendado' | 'premium'>('recomendado');

  // Preços customizados / manuais
  const [customPrecoMinimo, setCustomPrecoMinimo] = useState<string>('');
  const [customPrecoRecomendado, setCustomPrecoRecomendado] = useState<string>('');
  const [customPrecoPremium, setCustomPrecoPremium] = useState<string>('');

  // Load initial data for Recalcular / Edit memory of calculation
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setNomeServico((initialData as any).nomeServico || (initialData as any).nome || '');
        setCategoria(initialData.categoria || '');
        setDescricao(initialData.descricao || '');
        setMateriais(initialData.materiais || []);
        setTempoMedioExecucao(String(initialData.tempoMedioExecucao ?? '2'));
        setValorHora(String(initialData.valorHora ?? '50'));
        setCustosFixos(String(initialData.custosFixos ?? '0'));
        setImpostos(String(initialData.impostos ?? '15'));
        setMargemUtilizada(initialData.margemUtilizada ?? 25);
        const initialMod = (initialData as any).modalidadePreco || 'recomendado';
        setModalidadePreco(initialMod === 'premium' ? 'recomendado' : initialMod);
        setCustomPrecoMinimo(initialData.precoMinimo ? String(initialData.precoMinimo) : '');
        setCustomPrecoRecomendado(initialData.precoRecomendado ? String(initialData.precoRecomendado) : '');
        setCustomPrecoPremium(initialData.precoPremium ? String(initialData.precoPremium) : '');
        setStep(1);
      } else {
        // Reset to defaults
        setNomeServico('');
        setCategoria('Manutenção');
        setDescricao('');
        setMateriais([]);
        setMatDesc('');
        setMatQtd('');
        setMatUnit('UN');
        setMatCusto('');
        setTempoMedioExecucao('2');
        setValorHora('50');
        setCustosFixos('0');
        setImpostos('15');
        setMargemUtilizada(25);
        setModalidadePreco('recomendado');
        setCustomPrecoMinimo('');
        setCustomPrecoRecomendado('');
        setCustomPrecoPremium('');
        setStep(1);
      }
    }
  }, [isOpen, initialData]);

  // Recalculate values whenever relevant states change
  useEffect(() => {
    if (calcularValores) {
      const vals = calcularValores({
        materiais,
        tempoMedioExecucao: Number(tempoMedioExecucao) || 0,
        valorHora: Number(valorHora) || 0,
        custosFixos: Number(custosFixos) || 0,
        impostos: aliquotaEfetiva,
        margemUtilizada: Number(margemUtilizada) || 0
      });
      setCalculated(vals);

      // Auto-populate custom prices only if they are not already manually edited or if we are creating a new service
      if (vals) {
        if (!initialData) {
          setCustomPrecoMinimo(String(vals.precoMinimo?.toFixed(2) || ''));
          setCustomPrecoRecomendado(String(vals.precoRecomendado?.toFixed(2) || ''));
          setCustomPrecoPremium(String(vals.precoPremium?.toFixed(2) || ''));
        } else {
          // Editing: only update if the fields are currently empty
          setCustomPrecoMinimo(prev => prev || String(vals.precoMinimo?.toFixed(2) || ''));
          setCustomPrecoRecomendado(prev => prev || String(vals.precoRecomendado?.toFixed(2) || ''));
          setCustomPrecoPremium(prev => prev || String(vals.precoPremium?.toFixed(2) || ''));
        }
      }
    }
  }, [materiais, tempoMedioExecucao, valorHora, custosFixos, aliquotaEfetiva, margemUtilizada]);

  if (!isOpen) return null;

  // Step metadata
  const stepsMetadata = [
    { n: 1, title: 'Identificação' },
    { n: 2, title: 'Insumos' },
    { n: 3, title: 'Mão de Obra' },
    { n: 4, title: 'Custos Fixos' },
    { n: 5, title: 'Margem' },
    { n: 6, title: 'Resultado' },
    { n: 7, title: 'Resumo' },
    { n: 8, title: 'Salvar' }
  ];

  // Add material item
  const handleAddMaterial = () => {
    if (!matDesc.trim()) return;
    const qty = Number(matQtd) || 1;
    const price = Number(matCusto) || 0;
    const newItem: Insumo = {
      id: 'ins_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      descricao: matDesc.trim(),
      quantidade: qty,
      unidade: matUnit,
      custoUnitario: price,
      custoTotal: qty * price
    };
    setMateriais([...materiais, newItem]);
    setMatDesc('');
    setMatQtd('');
    setMatCusto('');
  };

  const handleRemoveMaterial = (id: string) => {
    setMateriais(materiais.filter(m => m.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const startEditMaterial = (item: Insumo) => {
    setEditingId(item.id);
    setEditDesc(item.descricao);
    setEditQtd(String(item.quantidade));
    setEditUnit(item.unidade);
    setEditCusto(String(item.custoUnitario));
  };

  const handleSaveEditMaterial = () => {
    if (!editDesc.trim()) return;
    const qty = Number(editQtd) || 1;
    const price = Number(editCusto) || 0;

    setMateriais(prev => prev.map(m => m.id === editingId ? {
      ...m,
      descricao: editDesc.trim(),
      quantidade: qty,
      unidade: editUnit,
      custoUnitario: price,
      custoTotal: qty * price
    } : m));

    setEditingId(null);
  };

  const handleCancelEditMaterial = () => {
    setEditingId(null);
  };

  const handleNext = () => {
    if (step === 1 && !nomeServico.trim()) {
      alert('Por favor, informe o nome do serviço para prosseguir.');
      return;
    }
    if (step < 8) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  // Save Pricing calculation + create/update active service in catalog
  const handleFinalSave = async () => {
    try {
      if (!calculated) return;

      const finalPrecoMinimo = customPrecoMinimo !== '' ? Number(customPrecoMinimo) : calculated.precoMinimo;
      const finalPrecoRecomendado = customPrecoRecomendado !== '' ? Number(customPrecoRecomendado) : calculated.precoRecomendado;
      const finalPrecoPremium = customPrecoPremium !== '' ? Number(customPrecoPremium) : calculated.precoPremium;

      const precoSelecionado = modalidadePreco === 'minimo'
        ? finalPrecoMinimo
        : modalidadePreco === 'premium'
        ? finalPrecoPremium
        : finalPrecoRecomendado;

      const savedMarkup = calculated.custoTotalSemImpostos > 0
        ? precoSelecionado / calculated.custoTotalSemImpostos
        : calculated.markupFinal;

      // 1. Save Pricing calculation to history
      const prec: Precificacao = {
        id: 'prc_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
        empresaId: '', // Filled in by provider
        servicoId: (initialData as any)?.id?.startsWith('srv_') ? (initialData as any).id : undefined,
        nomeServico,
        categoria,
        descricao,
        materiais,
        tempoMedioExecucao: Number(tempoMedioExecucao) || 0,
        valorHora: Number(valorHora) || 0,
        custosFixos: Number(custosFixos) || 0,
        impostos: aliquotaEfetiva,
        margemUtilizada,
        markup: savedMarkup,
        precoMinimo: finalPrecoMinimo,
        precoRecomendado: finalPrecoRecomendado,
        precoPremium: finalPrecoPremium,
        precoSelecionado,
        modalidadePreco,
        custoTotalMateriais: calculated.custoTotalMateriais,
        custoTotalMaoDeObra: calculated.custoTotalMaoDeObra,
        custoTotalFixos: calculated.custoTotalFixos,
        custoTotalImpostos: calculated.custoTotalImpostos,
        lucroEsperado: calculated.lucroEsperado,
        createdAt: new Date().toISOString()
      };

      const savedPrec = await savePrecificacao(prec);

      // 2. Save/Update Service in Banco Inteligente
      const srv: Servico = {
        id: (initialData as any)?.id?.startsWith('srv_') ? (initialData as any).id : 'srv_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
        empresaId: '', // Filled in by provider
        nome: nomeServico,
        categoria,
        descricao,
        materiais,
        tempoMedioExecucao: Number(tempoMedioExecucao) || 0,
        valorHora: Number(valorHora) || 0,
        custosFixos: Number(custosFixos) || 0,
        impostos: aliquotaEfetiva,
        margemUtilizada,
        markup: savedMarkup,
        precoMinimo: finalPrecoMinimo,
        precoRecomendado: finalPrecoRecomendado,
        precoPremium: finalPrecoPremium,
        precoSelecionado,
        modalidadePreco,
        tipoCadastro: 'Assistente de Precificação',
        dataCriacao: (initialData as any)?.dataCriacao || new Date().toISOString(),
        ultimaAtualizacao: new Date().toISOString(),
        quantidadeUtilizacoes: (initialData as any)?.quantidadeUtilizacoes || 0,
        ultimaUtilizacao: (initialData as any)?.ultimaUtilizacao,
        status: 'Ativo'
      };

      const savedSrv = await saveServico(srv);

      if (onSuccess) {
        onSuccess(savedPrec, savedSrv);
      }
      onClose();
    } catch (err) {
      console.error('Erro ao salvar precificação:', err);
      alert('Ocorreu um erro ao salvar o serviço precificado.');
    }
  };

  // Calculate chart & stat metrics safely and dynamically based on selected modality and any user custom edits
  const activePreco = !calculated ? 0 : (
    modalidadePreco === 'minimo'
      ? (customPrecoMinimo !== '' ? Number(customPrecoMinimo) : calculated.precoMinimo)
      : modalidadePreco === 'premium'
      ? (customPrecoPremium !== '' ? Number(customPrecoPremium) : calculated.precoPremium)
      : (customPrecoRecomendado !== '' ? Number(customPrecoRecomendado) : calculated.precoRecomendado)
  );

  const materialsCost = calculated?.custoTotalMateriais || 0;
  const laborCost = calculated?.custoTotalMaoDeObra || 0;
  const fixedCost = calculated?.custoTotalFixos || 0;
  const taxCost = activePreco * (aliquotaEfetiva / 100);
  const profitCost = activePreco - taxCost - (materialsCost + laborCost + fixedCost);
  const totalCalculated = activePreco || 1;

  const matPct = (materialsCost / totalCalculated) * 100;
  const labPct = (laborCost / totalCalculated) * 100;
  const fixPct = (fixedCost / totalCalculated) * 100;
  const taxPct = (taxCost / totalCalculated) * 100;
  const prfPct = (profitCost / totalCalculated) * 100;

  // Markup dynamically calculated as Price / Cost sem impostos
  const markupFinal = calculated && calculated.custoTotalSemImpostos > 0 
    ? activePreco / calculated.custoTotalSemImpostos 
    : (calculated?.markupFinal || 1);

  const activeMargem = modalidadePreco === 'minimo'
    ? 0
    : modalidadePreco === 'premium'
    ? 40
    : margemUtilizada;

  // Custom high precision round for display
  const f = (v: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#FF6600]/10 rounded-xl text-[#FF6600]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
                {initialData ? 'Recalcular Precificação' : 'Assistente de Precificação Inteligente'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Formação matemática de preço de venda e margens de lucro</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-200 rounded-full transition text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indicator visual de progresso */}
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {stepsMetadata.map((s) => {
              const isActive = step === s.n;
              const isCompleted = s.n < step;
              return (
                <div key={s.n} className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition ${
                      isActive 
                        ? 'bg-[#FF6600] text-white shadow-xs scale-110' 
                        : isCompleted 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.n}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                      isActive 
                        ? 'text-[#FF6600]' 
                        : isCompleted 
                        ? 'text-emerald-600' 
                        : 'text-slate-400'
                    }`}>
                      {s.title}
                    </span>
                  </div>
                  {s.n < 8 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          
          {/* STEP 1: IDENTIFICATION */}
          {step === 1 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="text-center mb-6">
                <span className="bg-[#003366]/5 text-[#003366] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">Etapa 1 de 8</span>
                <h4 className="text-base font-black text-[#003366] mt-2">Identificação do Serviço</h4>
                <p className="text-xs text-slate-500">Defina o nome de referência, descrição e categoria no banco.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nome do Serviço <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  value={nomeServico}
                  onChange={(e) => setNomeServico(e.target.value)}
                  placeholder="Ex: Reforma Geral de Motor de Partida" 
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Categoria</label>
                <select 
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition"
                >
                  <option value="Manutenção">Manutenção Preventiva / Corretiva</option>
                  <option value="Elétrica">Elétrica e Eletrônica</option>
                  <option value="Hidráulica">Sistema Hidráulico</option>
                  <option value="Motor">Reparo de Motores</option>
                  <option value="Transmissão">Transmissão e Câmbio</option>
                  <option value="Pintura/Funilaria">Pintura e Chaparia</option>
                  <option value="Usinagem">Torno e Solda</option>
                  <option value="Outros">Outros Serviços</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Descrição Detalhada do Escopo</label>
                <textarea 
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o escopo, tarefas inclusas e termos do serviço..." 
                  rows={4}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: INSUMOS (MATERIAIS) */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <span className="bg-[#003366]/5 text-[#003366] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">Etapa 2 de 8</span>
                <h4 className="text-base font-black text-[#003366] mt-2">Materiais, Peças e Insumos</h4>
                <p className="text-xs text-slate-500">Adicione todas as peças e insumos que serão diretamente gastos na execução do serviço.</p>
              </div>

              {/* Insumo Form */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Descrição da Peça / Insumo</label>
                  <input 
                    type="text" 
                    value={matDesc}
                    onChange={(e) => setMatDesc(e.target.value)}
                    placeholder="Ex: Kit de Reparo Trator Carter"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#003366] transition"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Qtd</label>
                  <input 
                    type="number" 
                    value={matQtd}
                    onChange={(e) => setMatQtd(e.target.value)}
                    placeholder="1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#003366] transition"
                  />
                </div>
                <div className="md:col-span-1 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Unid</label>
                  <select 
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#003366] transition"
                  >
                    <option value="UN">UN</option>
                    <option value="PC">PC</option>
                    <option value="KG">KG</option>
                    <option value="LT">LT</option>
                    <option value="MT">MT</option>
                    <option value="JG">JG</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Custo Unit (R$)</label>
                  <input 
                    type="number" 
                    value={matCusto}
                    onChange={(e) => setMatCusto(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#003366] transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <button 
                    type="button" 
                    onClick={handleAddMaterial}
                    className="w-full bg-[#003366] hover:bg-[#002244] text-white rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Inserir
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-150 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Lista de Materiais Inseridos</span>
                  <span className="bg-[#FF6600]/10 text-[#FF6600] text-[10px] font-black px-2 py-0.5 rounded-md">
                    Total: {f(materialsCost)}
                  </span>
                </div>
                {materiais.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-semibold">Nenhum material adicionado a esta precificação.</p>
                    <p className="text-[10px] opacity-70">Opcional. Se o serviço consistir apenas de mão de obra, pode prosseguir direto.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100/50 border-b border-slate-150 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                          <th className="px-4 py-2">Insumo</th>
                          <th className="px-4 py-2 text-center">Quant</th>
                          <th className="px-4 py-2 text-right">Unitário</th>
                          <th className="px-4 py-2 text-right">Total</th>
                          <th className="px-4 py-2 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {materiais.map((item) => {
                          const isEditing = editingId === item.id;
                          return (
                            <tr key={item.id} className={`${isEditing ? 'bg-[#FF6600]/5' : 'hover:bg-slate-50/50'} transition`}>
                              {isEditing ? (
                                <>
                                  <td className="px-4 py-2">
                                    <input
                                      type="text"
                                      value={editDesc}
                                      onChange={(e) => setEditDesc(e.target.value)}
                                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800"
                                      placeholder="Descrição"
                                    />
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <div className="flex items-center gap-1 justify-center">
                                      <input
                                        type="number"
                                        value={editQtd}
                                        onChange={(e) => setEditQtd(e.target.value)}
                                        className="w-16 bg-white border border-slate-300 rounded px-1 py-1 text-center font-mono font-bold"
                                        placeholder="Qtd"
                                      />
                                      <select
                                        value={editUnit}
                                        onChange={(e) => setEditUnit(e.target.value)}
                                        className="bg-white border border-slate-300 rounded px-1 py-1 text-xs"
                                      >
                                        <option value="UN">UN</option>
                                        <option value="PC">PC</option>
                                        <option value="KG">KG</option>
                                        <option value="LT">LT</option>
                                        <option value="MT">MT</option>
                                        <option value="JG">JG</option>
                                      </select>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <div className="inline-flex items-center gap-1">
                                      <span className="text-[10px] text-slate-400 font-bold font-mono">R$</span>
                                      <input
                                        type="number"
                                        value={editCusto}
                                        onChange={(e) => setEditCusto(e.target.value)}
                                        className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono"
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-right font-mono text-[#003366] font-bold">
                                    {f((Number(editQtd) || 0) * (Number(editCusto) || 0))}
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={handleSaveEditMaterial}
                                        className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md cursor-pointer transition shadow-xs"
                                        title="Salvar"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleCancelEditMaterial}
                                        className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-md cursor-pointer transition"
                                        title="Cancelar"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-2.5 font-bold text-slate-800">{item.descricao}</td>
                                  <td className="px-4 py-2.5 text-center">{item.quantidade} {item.unidade}</td>
                                  <td className="px-4 py-2.5 text-right font-mono text-slate-600">{f(item.custoUnitario)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono text-[#003366] font-bold">{f(item.custoTotal)}</td>
                                  <td className="px-4 py-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button 
                                        type="button" 
                                        onClick={() => startEditMaterial(item)}
                                        className="p-1 text-slate-400 hover:text-[#003366] rounded-full hover:bg-slate-100 cursor-pointer transition"
                                        title="Editar item"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        type="button" 
                                        onClick={() => handleRemoveMaterial(item.id)}
                                        className="p-1 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 cursor-pointer transition"
                                        title="Remover item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: MÃO DE OBRA */}
          {step === 3 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="text-center mb-6">
                <span className="bg-[#003366]/5 text-[#003366] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">Etapa 3 de 8</span>
                <h4 className="text-base font-black text-[#003366] mt-2">Mão de Obra e Alocação técnica</h4>
                <p className="text-xs text-slate-500">Defina o tempo médio em horas e o valor da hora produtiva técnica.</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Tempo Estimado (Horas)
                    </label>
                    <span className="text-xs font-black text-[#003366]">{tempoMedioExecucao} h</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="50" 
                    step="0.5"
                    value={tempoMedioExecucao}
                    onChange={(e) => setTempoMedioExecucao(e.target.value)}
                    className="w-full accent-[#FF6600] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                    <span>0.5h</span>
                    <span>10h</span>
                    <span>20h</span>
                    <span>30h</span>
                    <span>50h</span>
                  </div>
                  <div className="mt-1">
                    <input 
                      type="number"
                      step="0.1"
                      value={tempoMedioExecucao}
                      onChange={(e) => setTempoMedioExecucao(e.target.value)}
                      className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none"
                    />
                    <span className="text-xs text-slate-400 ml-1.5 font-semibold">ajuste direto</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      Valor Hora do Técnico (R$)
                    </label>
                    <span className="text-xs font-black text-[#003366]">{f(Number(valorHora))}</span>
                  </div>
                  <input 
                    type="number" 
                    value={valorHora}
                    onChange={(e) => setValorHora(e.target.value)}
                    placeholder="50" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">Informe o custo cobrado por hora produtiva. Ex: R$ 50,00 ou R$ 120,00.</p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Subtotal Mão de Obra</span>
                  <span className="text-lg font-black text-[#FF6600] font-mono">{f(laborCost)}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CUSTOS FIXOS */}
          {step === 4 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="text-center mb-6">
                <span className="bg-[#003366]/5 text-[#003366] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">Etapa 4 de 8</span>
                <h4 className="text-base font-black text-[#003366] mt-2">Custos Fixos</h4>
                <p className="text-xs text-slate-500">Defina os rateios de custos indiretos alocados especificamente a este serviço.</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Custos Fixos Alocados (R$ absoluto)
                  </label>
                  <input 
                    type="number" 
                    value={custosFixos}
                    onChange={(e) => setCustosFixos(e.target.value)}
                    placeholder="0" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">Custo indireto de aluguel, energia, ferramentas ou deslocamento alocado especificamente a esta ordem de serviço.</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2.5 text-slate-500 text-xs font-medium">
                  <Percent className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Alíquota de imposto de <strong className="text-emerald-600 font-mono font-bold">{aliquotaEfetiva}%</strong> ({company?.regimeTributario || 'Simples Nacional'}) aplicada automaticamente a partir da configuração de sua empresa.</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: MARGEM DE LUCRO */}
          {step === 5 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="text-center mb-6">
                <span className="bg-[#003366]/5 text-[#003366] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">Etapa 5 de 8</span>
                <h4 className="text-base font-black text-[#003366] mt-2">Margem de Lucro Esperada</h4>
                <p className="text-xs text-slate-500">Defina qual a margem líquida líquida que sua empresa deseja obter sobre o preço de venda final.</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-6">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Margem Desejada (%)</span>
                    <span className="text-sm font-black text-[#FF6600]">{margemUtilizada}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="80" 
                    value={margemUtilizada}
                    onChange={(e) => setMargemUtilizada(Number(e.target.value))}
                    className="w-full accent-[#FF6600] h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>1%</span>
                    <span>15%</span>
                    <span>25% (Recomendado)</span>
                    <span>40% (Premium)</span>
                    <span>80%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setMargemUtilizada(25)}
                    className="p-3 border-2 border-slate-150 hover:border-[#003366] hover:bg-slate-50/50 rounded-2xl text-center cursor-pointer transition"
                  >
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Recomendado</p>
                    <p className="text-base font-black text-[#003366] mt-0.5">25%</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Margem padrão de mercado</p>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setMargemUtilizada(40)}
                    className="p-3 border-2 border-slate-150 hover:border-[#003366] hover:bg-slate-50/50 rounded-2xl text-center cursor-pointer transition"
                  >
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Serviço Premium</p>
                    <p className="text-base font-black text-[#003366] mt-0.5">40%</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Alta complexidade ou urgência</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: RESULTADO (DASHBOARD + CHARTS) */}
          {step === 6 && calculated && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <span className="bg-[#003366]/5 text-[#003366] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">Etapa 6 de 8</span>
                <h4 className="text-base font-black text-[#003366] mt-2">Resultado da Precificação Inteligente</h4>
                <p className="text-xs text-slate-500">Compare os preços e ajuste as margens líquidas interativamente.</p>
              </div>

              {/* Price Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Minimo */}
                <button 
                  type="button"
                  id="btn-preco-minimo"
                  onClick={() => setModalidadePreco('minimo')}
                  className={`text-left p-5 rounded-3xl relative overflow-hidden border-2 cursor-pointer transition duration-200 ${
                    modalidadePreco === 'minimo'
                      ? 'bg-slate-100 border-[#003366] ring-2 ring-[#003366]/20'
                      : 'bg-white border-slate-200 hover:border-slate-350 shadow-sm'
                  }`}
                >
                  <div className="absolute right-3 top-3 text-[9px] font-black uppercase text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-md">Margem 0%</div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Preço Mínimo</h5>
                    {modalidadePreco === 'minimo' && <Check className="w-4 h-4 text-slate-700" />}
                  </div>
                  
                  {/* Editable input field */}
                  <div className="mt-3 mb-3 bg-white rounded-xl border border-slate-200 px-3 py-2 flex items-center gap-1 shadow-xs" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs font-bold text-slate-400 font-mono">R$</span>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder={calculated ? calculated.precoMinimo.toFixed(2) : '0.00'}
                      value={customPrecoMinimo}
                      onChange={(e) => setCustomPrecoMinimo(e.target.value)}
                      className="w-full bg-transparent font-mono font-black text-slate-700 text-sm focus:outline-none"
                    />
                  </div>
                  
                  <p className="text-xs text-slate-600 font-medium mt-1">Cobre todos os custos e mantém a operação sustentável.</p>
                </button>

                {/* Recomendado */}
                <button 
                  type="button"
                  id="btn-preco-recomendado"
                  onClick={() => setModalidadePreco('recomendado')}
                  className={`text-left p-5 rounded-3xl relative overflow-hidden border-2 cursor-pointer transition duration-200 ${
                    modalidadePreco === 'recomendado'
                      ? 'bg-[#003366]/10 border-[#003366] ring-2 ring-[#003366]/20'
                      : 'bg-[#003366]/5 border-slate-200 hover:border-[#003366]/30 shadow-sm'
                  }`}
                >
                  <div className="absolute right-3 top-3 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">Margem {margemUtilizada}%</div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <h5 className="text-[11px] font-black text-[#003366] uppercase tracking-wider">Preço Recomendado</h5>
                    {modalidadePreco === 'recomendado' && <Check className="w-4 h-4 text-[#003366]" />}
                  </div>
                  
                  {/* Editable input field */}
                  <div className="mt-3 mb-3 bg-white rounded-xl border border-slate-200 px-3 py-2 flex items-center gap-1 shadow-xs" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs font-bold text-[#003366] font-mono">R$</span>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder={calculated ? calculated.precoRecomendado.toFixed(2) : '0.00'}
                      value={customPrecoRecomendado}
                      onChange={(e) => setCustomPrecoRecomendado(e.target.value)}
                      className="w-full bg-transparent font-mono font-black text-[#003366] text-base focus:outline-none"
                    />
                  </div>
                  
                  <p className="text-xs text-slate-600 font-medium mt-1">Preço sugerido para maior equilíbrio entre competitividade e lucratividade.</p>
                </button>
              </div>

              {/* Dashboard stats */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Custos Totais</p>
                  <p className="text-sm font-black text-slate-700 font-mono mt-0.5">{f(calculated.custoTotalSemImpostos)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Impostos Devidos</p>
                  <p className="text-sm font-black text-slate-700 font-mono mt-0.5">{f(taxCost)}</p>
                </div>
                <div>
                  <p className={`text-[9px] font-bold uppercase tracking-wider ${profitCost >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Lucro Líquido</p>
                  <p className={`text-sm font-black font-mono mt-0.5 ${profitCost >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{f(profitCost)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Fator Markup</p>
                  <p className="text-sm font-black text-[#FF6600] font-mono mt-0.5">{markupFinal.toFixed(3)}x</p>
                </div>
              </div>

              {/* Graphic charts: Pie and Bar charts (Beautiful Custom Responsive SVG) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Pie Chart */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <h5 className="text-[11px] font-black text-[#003366] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-[#FF6600] rounded-full inline-block"></span>
                    Gráfico de Pizza: Composição de Custos e Margem
                  </h5>
                  <div className="flex flex-col items-center justify-center py-2 relative">
                    {/* Perfect responsive SVG Donut Pie chart */}
                    <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
                      {/* We will render circles with strokeDasharray to make slices */}
                      {(() => {
                        const radius = 65;
                        const circumference = 2 * Math.PI * radius; // ~408.4
                        
                        // Percentages: matPct, labPct, fixPct, taxPct, prfPct
                        const slices = [
                          { label: 'Materiais', pct: Math.max(matPct, 0), color: '#003366' },
                          { label: 'Mão de Obra', pct: Math.max(labPct, 0), color: '#FF6600' },
                          { label: 'Custos Fixos', pct: Math.max(fixPct, 0), color: '#3b82f6' },
                          { label: 'Impostos', pct: Math.max(taxPct, 0), color: '#ef4444' },
                          { label: 'Lucro Líquido', pct: Math.max(prfPct, 0), color: '#10b981' }
                        ].filter(s => s.pct > 0);

                        let currentOffset = 0;
                        return slices.map((s, idx) => {
                          const strokeDash = (s.pct / 100) * circumference;
                          const strokeOffset = circumference - currentOffset;
                          currentOffset += strokeDash;
                          return (
                            <circle
                              key={idx}
                              cx="90"
                              cy="90"
                              r={radius}
                              fill="transparent"
                              stroke={s.color}
                              strokeWidth="22"
                              strokeDasharray={`${strokeDash} ${circumference}`}
                              strokeDashoffset={strokeOffset}
                              className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                            />
                          );
                        });
                      })()}
                      <circle cx="90" cy="90" r="45" fill="white" />
                    </svg>
                    
                    {/* Pie Legends */}
                    <div className="w-full mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[10px] font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#003366] inline-block shrink-0"></span>
                        <span className="text-slate-600">Peças: {matPct.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF6600] inline-block shrink-0"></span>
                        <span className="text-slate-600">M. Obra: {labPct.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] inline-block shrink-0"></span>
                        <span className="text-slate-600">Fixo: {fixPct.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block shrink-0"></span>
                        <span className="text-slate-600">Imp: {taxPct.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block shrink-0"></span>
                        <span className="text-emerald-700 font-extrabold">Lucro: {prfPct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <h5 className="text-[11px] font-black text-[#003366] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-[#FF6600] rounded-full inline-block"></span>
                    Gráfico de Barras: Participação no Preço de Venda
                  </h5>
                  <div className="space-y-4 py-1.5">
                    {[
                      { label: 'Materiais / Peças', cost: materialsCost, color: 'bg-[#003366]' },
                      { label: 'Mão de Obra', cost: laborCost, color: 'bg-[#FF6600]' },
                      { label: 'Custos Fixos', cost: fixedCost, color: 'bg-blue-500' },
                      { label: 'Impostos', cost: taxCost, color: 'bg-rose-500' },
                      { label: 'Lucro Líquido', cost: profitCost, color: 'bg-emerald-500' }
                    ].map((bar, idx) => {
                      const percent = (bar.cost / totalCalculated) * 100;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                            <span>{bar.label}</span>
                            <span className="font-mono text-slate-800">{f(bar.cost)} ({percent.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className={`${bar.color} h-2.5 rounded-full transition-all duration-300`} 
                              style={{ width: `${Math.max(percent, 0.5)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: RESUMO (MEMÓRIA DE CÁLCULO) */}
          {step === 7 && calculated && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="text-center mb-4">
                <span className="bg-[#003366]/5 text-[#003366] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">Etapa 7 de 8</span>
                <h4 className="text-base font-black text-[#003366] mt-2">Memória de Cálculo Detalhada</h4>
                <p className="text-xs text-slate-500">Valide os componentes e o racional matemático de precificação antes de consolidar.</p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                {/* Header info */}
                <div className="p-4 bg-slate-50 border-b border-slate-150">
                  <h5 className="text-xs font-black text-[#003366] uppercase tracking-wide">{nomeServico}</h5>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">CATEGORIA: {categoria}</p>
                </div>

                <div className="p-5 space-y-4 text-xs font-medium text-slate-700">
                  {/* Materiais summary */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">1. Insumos e Peças</p>
                    <div className="bg-slate-50 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1.5 border border-slate-100">
                      {materiais.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Nenhum material cadastrado.</p>
                      ) : (
                        materiais.map((m) => (
                          <div key={m.id} className="flex justify-between text-[11px]">
                            <span>{m.descricao} (x{m.quantidade} {m.unidade})</span>
                            <span className="font-mono font-bold text-[#003366]">{f(m.custoTotal)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Pricing components calculation */}
                  <div className="border-t border-slate-100 pt-4 space-y-2.5 font-semibold">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">2. Demonstração de Cálculo</p>
                    
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Total Materiais (a)</span>
                      <span className="font-mono">{f(calculated.custoTotalMateriais)}</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Mão de Obra ({tempoMedioExecucao}h x {f(Number(valorHora))}/h) (b)</span>
                      <span className="font-mono">{f(calculated.custoTotalMaoDeObra)}</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Custos Fixos Alocados (c)</span>
                      <span className="font-mono">{f(calculated.custoTotalFixos)}</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] bg-[#003366]/5 px-2.5 py-1.5 rounded-lg text-[#003366] font-bold">
                      <span>Custo de Serviço Total (a + b + c)</span>
                      <span className="font-mono">{f(calculated.custoTotalSemImpostos)}</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Impostos ({aliquotaEfetiva}%)</span>
                      <span className="font-mono text-rose-600">+{f(taxCost)}</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Lucro Líquido Esperado ({activeMargem}%)</span>
                      <span className="font-mono text-emerald-600">+{f(profitCost)}</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Fator de Markup Aplicado</span>
                      <span className="font-bold text-[#FF6600]">{markupFinal.toFixed(3)}x</span>
                    </div>

                    <div className={`flex justify-between items-center text-sm px-3 py-2 rounded-xl font-black mt-2 border ${
                      modalidadePreco === 'minimo'
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : modalidadePreco === 'premium'
                        ? 'bg-[#FF6600]/10 text-[#FF6600] border-[#FF6600]/20'
                        : 'bg-emerald-500/10 text-emerald-800 border-emerald-500/10'
                    }`}>
                      <span>PREÇO FINAL SELECIONADO ({modalidadePreco.toUpperCase()})</span>
                      <span className="font-mono">
                        {f(
                          modalidadePreco === 'minimo'
                            ? (customPrecoMinimo !== '' ? Number(customPrecoMinimo) : calculated.precoMinimo)
                            : modalidadePreco === 'premium'
                            ? (customPrecoPremium !== '' ? Number(customPrecoPremium) : calculated.precoPremium)
                            : (customPrecoRecomendado !== '' ? Number(customPrecoRecomendado) : calculated.precoRecomendado)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: CRIAR SERVIÇO */}
          {step === 8 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="text-center mb-6">
                <span className="bg-[#003366]/5 text-[#003366] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">Etapa 8 de 8</span>
                <h4 className="text-base font-black text-[#003366] mt-2">Conclusão e Registro no Banco</h4>
                <p className="text-xs text-slate-500">Isso salvará a memória de cálculo e registrará o serviço no Banco Inteligente.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
                  <Check className="w-8 h-8 font-bold" />
                </div>
                <div>
                  <h5 className="font-black text-slate-800 text-sm">Tudo pronto para salvar!</h5>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Ao confirmar, o serviço <strong className="text-[#003366]">"{nomeServico}"</strong> estará disponível para seleção imediata na criação de qualquer Ordem de Serviço, preenchendo automaticamente preços e insumos.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2 border border-slate-100 max-w-sm mx-auto">
                  <div className={`flex justify-between px-2 py-1.5 rounded-lg ${modalidadePreco === 'minimo' ? 'bg-slate-200 text-slate-800 border border-slate-350' : ''}`}>
                    <span>Preço Mínimo:</span>
                    <span className="font-bold font-mono">
                      {f(customPrecoMinimo !== '' ? Number(customPrecoMinimo) : (calculated?.precoMinimo || 0))}
                    </span>
                  </div>
                  <div className={`flex justify-between border-t border-slate-100 px-2 py-1.5 rounded-lg ${modalidadePreco === 'recomendado' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/50' : ''}`}>
                    <span className="text-[#003366] font-bold">Preço Recomendado:</span>
                    <strong className="font-mono">
                      {f(customPrecoRecomendado !== '' ? Number(customPrecoRecomendado) : (calculated?.precoRecomendado || 0))}
                    </strong>
                  </div>
                  <div className={`flex justify-between border-t border-slate-100 px-2 py-1.5 rounded-lg ${modalidadePreco === 'premium' ? 'bg-[#FF6600]/10 text-[#FF6600] border border-[#FF6600]/20' : ''}`}>
                    <span className="text-[#FF6600] font-bold">Preço Premium:</span>
                    <strong className="font-mono">
                      {f(customPrecoPremium !== '' ? Number(customPrecoPremium) : (calculated?.precoPremium || 0))}
                    </strong>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="button" 
                    onClick={handleFinalSave}
                    className="w-full sm:w-auto px-10 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md inline-flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Confirmar e Salvar Serviço
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer controls */}
        <div className="p-4.5 bg-slate-50 border-t border-slate-150 flex items-center justify-between shrink-0">
          <button 
            type="button" 
            onClick={handlePrev}
            disabled={step === 1}
            className="px-4 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer border border-slate-200 flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>

          {step < 8 ? (
            <button 
              type="button" 
              onClick={handleNext}
              className="px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
            >
              Avançar
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-20" /> // Empty space for layout balance
          )}
        </div>

      </div>
    </div>
  );
}
