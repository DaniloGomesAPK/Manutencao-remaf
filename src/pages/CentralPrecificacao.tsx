/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useContext, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  Layers, 
  TrendingUp, 
  Info,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  ChevronRight,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Copy,
  X,
  Check,
  ArrowLeft,
  Upload,
  Download,
  FileSpreadsheet,
  Database,
  Filter
} from 'lucide-react';
import { ServicoContext } from '../contexts/ServicoContext';
import { PrecificacaoContext } from '../contexts/PrecificacaoContext';
import { EmpresaContext } from '../contexts/EmpresaContext';
import { AuthContext } from '../contexts/AuthContext';
import { Servico } from '../types';
import { PrecificacaoService } from '../services/PrecificacaoService';
import { ImportExportService, ImportPreviewResult } from '../services/ImportExportService';
import AssistentePrecificacaoModal from '../components/AssistentePrecificacaoModal';

interface CentralPrecificacaoProps {
  onBack?: () => void;
}

export default function CentralPrecificacao({ onBack }: CentralPrecificacaoProps) {
  const servicoCtx = useContext(ServicoContext);
  const precificacaoCtx = useContext(PrecificacaoContext);
  const empresaCtx = useContext(EmpresaContext);
  const authCtx = useContext(AuthContext);

  const company = empresaCtx?.empresa;
  const aliquotaEfetiva = company?.aliquotaImposto !== undefined ? company.aliquotaImposto : 6.00;

  const currentUser = authCtx?.currentUser;
  const empresaId = currentUser?.empresaId || 'emp_daniloempreendimentos';

  const { servicos, isLoadingServicos, saveServico, deleteServico, reloadServicos } = servicoCtx || {
    servicos: [],
    isLoadingServicos: false,
    saveServico: async () => ({} as Servico),
    deleteServico: async () => {},
    reloadServicos: async () => {}
  };

  const { precificacoes } = precificacaoCtx || { precificacoes: [] };

  // Mobile Tabs
  const [activeMobileTab, setActiveMobileTab] = useState<'rapido' | 'assistente' | 'import_export' | 'banco'>('banco');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedOrigin, setSelectedOrigin] = useState<'Todas' | 'Cadastro Rápido' | 'Assistente de Precificação'>('Todas');
  const [filteredServicos, setFilteredServicos] = useState<Servico[]>([]);

  // Cadastro Rápido States
  const [quickNome, setQuickNome] = useState('');
  const [quickCategoria, setQuickCategoria] = useState('Manutenção');
  const [quickValor, setQuickValor] = useState('');
  const [isSavingQuick, setIsSavingQuick] = useState(false);

  // Import Export Inline States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [duplicateDecision, setDuplicateDecision] = useState<'update' | 'ignore' | 'create_new'>('update');
  const [applyToAll, setApplyToAll] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [exportCategory, setExportCategory] = useState('Todas');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assistente Modal Control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<any | null>(null);

  // Recalculating state
  const [isRecalculatingAll, setIsRecalculatingAll] = useState(false);

  // Delete & Toast States
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((current) => {
        if (current?.message === message) return null;
        return current;
      });
    }, 4000);
  };

  // Search, Filter & Apply
  useEffect(() => {
    let result = servicos;

    if (selectedCategory !== 'Todas') {
      result = result.filter(s => s.categoria === selectedCategory);
    }

    if (selectedOrigin !== 'Todas') {
      result = result.filter(s => {
        // If a service has no tipoCadastro, default to Assistente de Precificação (or if quick is not set)
        const origin = s.tipoCadastro || 'Assistente de Precificação';
        return origin === selectedOrigin;
      });
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.nome.toLowerCase().includes(term) ||
        s.descricao?.toLowerCase().includes(term) ||
        s.categoria.toLowerCase().includes(term)
      );
    }

    setFilteredServicos(result);
  }, [searchTerm, selectedCategory, selectedOrigin, servicos]);

  // Cadastro Rápido Save Logic
  const handleQuickSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNome.trim()) {
      showNotification('O nome do serviço é obrigatório.', 'error');
      return;
    }
    const valorNum = parseFloat(quickValor);
    if (isNaN(valorNum) || valorNum <= 0) {
      showNotification('O valor total do serviço deve ser maior que zero.', 'error');
      return;
    }

    setIsSavingQuick(true);
    try {
      const newSrv: Servico = {
        id: 'srv_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
        empresaId: empresaId,
        nome: quickNome.trim(),
        categoria: quickCategoria,
        descricao: 'Serviço cadastrado via Cadastro Rápido',
        materiais: [],
        tempoMedioExecucao: 0,
        valorHora: 0,
        custosFixos: 0,
        impostos: 0,
        margemUtilizada: 0,
        markup: 1,
        precoMinimo: valorNum,
        precoRecomendado: valorNum,
        precoPremium: valorNum,
        precoSelecionado: valorNum,
        modalidadePreco: 'recomendado',
        tipoCadastro: 'Cadastro Rápido',
        dataCriacao: new Date().toISOString(),
        ultimaAtualizacao: new Date().toISOString(),
        quantidadeUtilizacoes: 0,
        status: 'Ativo'
      };

      await saveServico(newSrv);
      if (reloadServicos) {
        await reloadServicos();
      }
      showNotification(`Serviço "${newSrv.nome}" cadastrado com sucesso via Cadastro Rápido!`, 'success');
      setQuickNome('');
      setQuickValor('');
    } catch (err) {
      console.error(err);
      showNotification('Erro ao salvar serviço rápido.', 'error');
    } finally {
      setIsSavingQuick(false);
    }
  };

  // Import Action Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx')) {
        showNotification('Por favor, selecione uma planilha Excel (.xlsx)', 'error');
        return;
      }
      setImportFile(file);
      setIsAnalyzing(true);
      setPreviewResult(null);
      try {
        const preview = await ImportExportService.processarUploadExcel(file, servicos);
        setPreviewResult(preview);
        showNotification('Planilha analisada com sucesso! Verifique o relatório abaixo antes de importar.', 'success');
      } catch (err: any) {
        setImportFile(null);
        showNotification(err.message || 'Erro ao processar planilha.', 'error');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!previewResult || !importFile) return;
    setIsImporting(true);
    setImportProgress(15);
    try {
      const trackingSave = async (s: Servico) => {
        const withEmp = { ...s, empresaId };
        return await saveServico(withEmp);
      };

      const progressInterval = setInterval(() => {
        setImportProgress(p => (p >= 85 ? 85 : p + 10));
      }, 100);

      const result = await ImportExportService.salvarImportacao(
        previewResult.validRecords,
        duplicateDecision,
        aliquotaEfetiva,
        servicos,
        trackingSave
      );

      clearInterval(progressInterval);
      setImportProgress(100);

      await reloadServicos();
      showNotification(
        `Importação finalizada! Criados: ${result.imported} | Atualizados: ${result.updated} | Ignorados: ${result.ignored}`,
        'success'
      );

      // Reset
      setImportFile(null);
      setPreviewResult(null);
    } catch (err: any) {
      showNotification('Erro ao processar importação: ' + err.message, 'error');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleCancelImport = () => {
    setImportFile(null);
    setPreviewResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Recalculations & Actions
  const handleOpenCreate = () => {
    setModalInitialData(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (servico: Servico) => {
    setModalInitialData(servico);
    setIsModalOpen(true);
  };

  const handleDuplicate = async (servico: Servico) => {
    const clone: Servico = {
      ...servico,
      id: 'srv_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
      nome: `${servico.nome} - Cópia`,
      quantidadeUtilizacoes: 0,
      ultimaUtilizacao: undefined,
      dataCriacao: new Date().toISOString(),
      ultimaAtualizacao: new Date().toISOString()
    };
    try {
      await saveServico(clone);
      if (reloadServicos) {
        await reloadServicos();
      }
      showNotification(`Serviço "${servico.nome}" duplicado com sucesso!`, 'success');
    } catch (err) {
      showNotification('Erro ao duplicar serviço.', 'error');
    }
  };

  const handleInstantRecalculateSingle = async (servico: Servico) => {
    // Cadastro Rápido services do not have labor/materials/fees, they are direct totals.
    if (servico.tipoCadastro === 'Cadastro Rápido') {
      showNotification(`O serviço "${servico.nome}" foi cadastrado de forma Rápida. O valor total já está fixado.`, 'info');
      return;
    }

    try {
      const vals = PrecificacaoService.calcularValores({
        materiais: servico.materiais || [],
        tempoMedioExecucao: Number(servico.tempoMedioExecucao) || 0,
        valorHora: Number(servico.valorHora) || 0,
        custosFixos: Number(servico.custosFixos) || 0,
        impostos: aliquotaEfetiva,
        margemUtilizada: Number(servico.margemUtilizada) || 25
      });

      const modalidade = servico.modalidadePreco || 'recomendado';
      const precoSelecionado = modalidade === 'minimo'
        ? vals.precoMinimo
        : modalidade === 'premium'
        ? vals.precoPremium
        : vals.precoRecomendado;

      const updatedSrv: Servico = {
        ...servico,
        impostos: aliquotaEfetiva,
        markup: vals.markupFinal,
        precoMinimo: vals.precoMinimo,
        precoRecomendado: vals.precoRecomendado,
        precoPremium: vals.precoPremium,
        precoSelecionado,
        ultimaAtualizacao: new Date().toISOString()
      };

      await saveServico(updatedSrv);
      if (reloadServicos) {
        await reloadServicos();
      }
      showNotification(`Preço de "${servico.nome}" recalculado com sucesso! Novo Recomendado: ${f(vals.precoRecomendado)}`, "success");
    } catch (err) {
      console.error(err);
      showNotification("Erro ao recalcular serviço.", "error");
    }
  };

  const handleRecalculateAll = async () => {
    const calculableServices = servicos.filter(s => s.tipoCadastro !== 'Cadastro Rápido');
    if (calculableServices.length === 0) {
      showNotification('Não há serviços baseados em custos/horas cadastrados no banco para recalcular.', 'info');
      return;
    }

    if (!window.confirm(`Deseja realmente recalcular instantaneamente os preços de todos os ${calculableServices.length} serviços baseados no Assistente de acordo com as taxas de impostos atuais de ${aliquotaEfetiva}%?`)) {
      return;
    }

    setIsRecalculatingAll(true);
    try {
      let count = 0;
      for (const s of calculableServices) {
        const vals = PrecificacaoService.calcularValores({
          materiais: s.materiais || [],
          tempoMedioExecucao: Number(s.tempoMedioExecucao) || 0,
          valorHora: Number(s.valorHora) || 0,
          custosFixos: Number(s.custosFixos) || 0,
          impostos: aliquotaEfetiva,
          margemUtilizada: Number(s.margemUtilizada) || 25
        });

        const modalidade = s.modalidadePreco || 'recomendado';
        const precoSelecionado = modalidade === 'minimo'
          ? vals.precoMinimo
          : modalidade === 'premium'
          ? vals.precoPremium
          : vals.precoRecomendado;

        const updatedSrv: Servico = {
          ...s,
          impostos: aliquotaEfetiva,
          markup: vals.markupFinal,
          precoMinimo: vals.precoMinimo,
          precoRecomendado: vals.precoRecomendado,
          precoPremium: vals.precoPremium,
          precoSelecionado,
          ultimaAtualizacao: new Date().toISOString()
        };

        await saveServico(updatedSrv);
        count++;
      }
      if (reloadServicos) {
        await reloadServicos();
      }
      showNotification(`Sucesso! ${count} serviços do Assistente foram recalculados e atualizados instantaneamente no banco.`, "success");
    } catch (err) {
      console.error(err);
      showNotification("Erro ao realizar recálculo em lote.", "error");
    } finally {
      setIsRecalculatingAll(false);
    }
  };

  const handleDeleteConfirmed = async (id: string) => {
    if (!id) return;
    try {
      setFilteredServicos(prev => prev.filter(s => s.id !== id));
      await deleteServico(id);
      if (reloadServicos) {
        await reloadServicos();
      }
      showNotification("Serviço excluído com sucesso!", "success");
    } catch (err) {
      showNotification("Erro ao excluir serviço.", "error");
    }
  };

  // Formatter helpers
  const f = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const fd = (dateStr?: string) => {
    if (!dateStr) return 'Nunca';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const categories = ['Todas', ...Array.from(new Set(servicos.map(s => s.categoria))).filter(Boolean)];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 relative">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 p-4 rounded-xl border shadow-lg max-w-sm animate-in slide-in-from-bottom-5 duration-300 ${
          notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : notification.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
          {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
          {notification.type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0" />}
          <p className="text-xs font-semibold">{notification.message}</p>
        </div>
      )}
      
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              id="btn-back-from-precificacao"
              type="button"
              onClick={onBack}
              className="p-2 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer text-slate-500"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="p-3 bg-[#FF6600]/10 rounded-2xl text-[#FF6600]">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#003366] uppercase tracking-tight flex items-center gap-2">
              Central de Precificação 2.0
              <span className="text-[10px] bg-[#FF6600] text-white font-black px-2 py-0.5 rounded-full tracking-wider">OFFLINE-FIRST</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Formulação de preços rápida, assistentes detalhados de custos e importador inteligente via planilhas Excel.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRecalculateAll}
            disabled={isRecalculatingAll || servicos.filter(s => s.tipoCadastro !== 'Cadastro Rápido').length === 0}
            className="border border-[#FF6600] text-[#FF6600] hover:bg-[#FF6600]/5 disabled:opacity-50 font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isRecalculatingAll ? 'animate-spin' : ''}`} />
            Recalcular Custos ({servicos.filter(s => s.tipoCadastro !== 'Cadastro Rápido').length})
          </button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total de Serviços</p>
          <p className="text-lg font-black text-[#003366] mt-0.5">{servicos.length}</p>
          <p className="text-[8px] text-slate-500 mt-0.5">no banco de serviços único</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">⚡ Cadastros Rápidos</p>
          <p className="text-lg font-black text-[#003366] mt-0.5">{servicos.filter(s => s.tipoCadastro === 'Cadastro Rápido').length}</p>
          <p className="text-[8px] text-slate-500 mt-0.5">unidades simplificadas</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">🤖 Serviços do Assistente</p>
          <p className="text-lg font-black text-[#003366] mt-0.5">{servicos.filter(s => s.tipoCadastro !== 'Cadastro Rápido').length}</p>
          <p className="text-[8px] text-slate-500 mt-0.5">baseados em custos científicos</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs bg-[#FF6600]/5 border-[#FF6600]/10">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Alíquota de Impostos</p>
          <p className="text-lg font-black text-[#FF6600] mt-0.5">{aliquotaEfetiva.toFixed(2)}%</p>
          <p className="text-[8px] text-slate-500 mt-0.5">configurada em Minha Empresa</p>
        </div>
      </div>

      {/* MOBILE TABS MENU switcher */}
      <div className="lg:hidden flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveMobileTab('rapido')}
          className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition ${activeMobileTab === 'rapido' ? 'bg-white text-[#FF6600] shadow-xs' : 'text-slate-500'}`}
        >
          ⚡ Rápido
        </button>
        <button
          onClick={() => setActiveMobileTab('assistente')}
          className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition ${activeMobileTab === 'assistente' ? 'bg-white text-[#003366] shadow-xs' : 'text-slate-500'}`}
        >
          🤖 Assistente
        </button>
        <button
          onClick={() => setActiveMobileTab('import_export')}
          className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition ${activeMobileTab === 'import_export' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'}`}
        >
          📥 Imp/Exp
        </button>
        <button
          onClick={() => setActiveMobileTab('banco')}
          className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition ${activeMobileTab === 'banco' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'}`}
        >
          📋 Banco ({filteredServicos.length})
        </button>
      </div>

      {/* RESPONSIVE LAYOUT WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SIDEBAR OPERAÇÕES (Desktop sidebar columns, on Mobile rendered only when matching activeMobileTab) */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          
          {/* CARD 1: CADASTRO RÁPIDO */}
          <div className={`${activeMobileTab === 'rapido' ? 'block' : 'hidden lg:block'} bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden`}>
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center gap-2">
              <div className="p-1.5 bg-[#FF6600]/10 rounded-lg text-[#FF6600]">
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">⚡ Cadastro Rápido</h3>
                <p className="text-[10px] text-slate-500">Adicione um preço fixado instantaneamente</p>
              </div>
            </div>
            <form onSubmit={handleQuickSave} className="p-4 space-y-3.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Nome do Serviço *</label>
                <input
                  type="text"
                  placeholder="Ex: Alinhamento e Balanceamento Simples"
                  value={quickNome}
                  onChange={e => setQuickNome(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6600]/10 focus:border-[#FF6600]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Categoria</label>
                  <select
                    value={quickCategoria}
                    onChange={e => setQuickCategoria(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value="Manutenção">Manutenção</option>
                    <option value="Elétrica">Elétrica</option>
                    <option value="Hidráulica">Hidráulica</option>
                    <option value="Motor">Motor</option>
                    <option value="Transmissão">Transmissão</option>
                    <option value="Pintura/Funilaria">Pintura/Chaparia</option>
                    <option value="Usinagem">Torno e Solda</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Valor Total (R$) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="250,00"
                    value={quickValor}
                    onChange={e => setQuickValor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold font-mono text-slate-800 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingQuick}
                className="w-full py-2.5 bg-[#FF6600] hover:bg-[#dd5500] text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSavingQuick ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    Salvar Serviço Rápido
                  </>
                )}
              </button>
            </form>
          </div>

          {/* CARD 2: ASSISTENTE DE PRECIFICAÇÃO */}
          <div className={`${activeMobileTab === 'assistente' ? 'block' : 'hidden lg:block'} bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden`}>
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center gap-2">
              <div className="p-1.5 bg-[#003366]/5 rounded-lg text-[#003366]">
                <Sparkles className="w-4 h-4 text-[#FF6600]" />
              </div>
              <div>
                <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">🤖 Assistente de Precificação</h3>
                <p className="text-[10px] text-slate-500">Cálculo científico de margem e lucro</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Estime o preço sugerido do serviço de forma científica calculando detalhadamente os insumos alocados, horas de mão de obra técnica e rateio de custos de funcionamento da sua oficina.
              </p>
              
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 space-y-1.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">✔ Custos de Materiais</span>
                  <span className="text-slate-800 font-black">Markup</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">✔ Mão de Obra</span>
                  <span className="text-slate-800 font-black">Horas Trabalhadas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">✔ Custos Operacionais</span>
                  <span className="text-slate-800 font-black">Rateio Fixo</span>
                </div>
              </div>

              <button
                onClick={handleOpenCreate}
                className="w-full py-2.5 bg-[#003366] hover:bg-[#002244] text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Iniciar Novo Assistente
              </button>
            </div>
          </div>

          {/* CARD 3: IMPORTAÇÃO & EXPORTAÇÃO */}
          <div className={`${activeMobileTab === 'import_export' ? 'block' : 'hidden lg:block'} bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden`}>
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-700">
                <Database className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">📥 Importar / Exportar Excel</h3>
                <p className="text-[10px] text-slate-500">Cargas e descargas em lote offline-first</p>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              
              {/* IMPORTAÇÃO BOX */}
              <div className="space-y-2 pb-3 border-b border-slate-100">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">1. Importar Planilha de Serviços</label>
                
                {/* File picker dropzone */}
                {!previewResult ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        try {
                          ImportExportService.downloadModeloExcel();
                          showNotification('Modelo oficial baixado para o seu dispositivo!', 'success');
                        } catch (_) {
                          showNotification('Erro ao baixar modelo.', 'error');
                        }
                      }}
                      className="w-full py-2 border border-slate-250 bg-slate-50 hover:bg-slate-100 text-[#003366] rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#FF6600]" />
                      Baixar Modelo Oficial
                    </button>

                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition relative">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".xlsx"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <Upload className="w-5 h-5 mx-auto text-indigo-500 mb-1.5" />
                      <p className="text-[10px] font-bold text-slate-700">Selecionar arquivo .xlsx</p>
                      <p className="text-[8px] text-slate-400 mt-0.5">Clique para buscar o Excel oficial</p>
                    </div>
                  </div>
                ) : (
                  // INTERACTIVE VALIDATION RELATÓRIO PREVIEW (Parts 7, 8, 9, 10)
                  <div className="space-y-3.5 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <span className="font-extrabold text-[10px] text-slate-700 truncate max-w-[150px]">{importFile?.name}</span>
                      <button onClick={handleCancelImport} className="text-rose-500 hover:text-rose-700 text-[9px] font-black uppercase tracking-wider cursor-pointer">
                        Cancelar
                      </button>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Relatório Inteligente:</p>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div className="bg-white p-1.5 rounded border border-slate-150 flex flex-col">
                          <span className="text-[8px] text-slate-400 uppercase font-bold">Total Lidos</span>
                          <span className="font-black text-slate-800">{previewResult.totalRows}</span>
                        </div>
                        <div className="bg-emerald-50 p-1.5 rounded border border-emerald-100 flex flex-col">
                          <span className="text-[8px] text-emerald-600 uppercase font-bold">Novos Serviços</span>
                          <span className="font-black text-emerald-800">{previewResult.newCount}</span>
                        </div>
                        <div className="bg-amber-50 p-1.5 rounded border border-amber-100 flex flex-col">
                          <span className="text-[8px] text-amber-600 uppercase font-bold">Duplicados</span>
                          <span className="font-black text-amber-800">{previewResult.duplicateCount}</span>
                        </div>
                        <div className={`p-1.5 rounded border flex flex-col ${previewResult.invalidCount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-150'}`}>
                          <span className={`text-[8px] uppercase font-bold ${previewResult.invalidCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>Incompletos</span>
                          <span className={`font-black ${previewResult.invalidCount > 0 ? 'text-rose-800' : 'text-slate-800'}`}>{previewResult.invalidCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* DUPLICATE STRATEGY (Part 8) */}
                    {previewResult.duplicateCount > 0 && (
                      <div className="space-y-1.5 bg-white border border-slate-200 rounded-lg p-2.5">
                        <label className="text-[9px] font-black text-amber-700 uppercase tracking-wider block">Ação para Duplicados:</label>
                        <select
                          value={duplicateDecision}
                          onChange={e => setDuplicateDecision(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-250 rounded-lg py-1 px-1.5 text-[10px] font-bold focus:outline-none"
                        >
                          <option value="update">Atualizar Serviços Existentes</option>
                          <option value="ignore">Ignorar Novos Dados (Manter Atuais)</option>
                          <option value="create_new">Criar Novos como Cópias</option>
                        </select>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <input
                            type="checkbox"
                            id="apply_all_chk"
                            checked={applyToAll}
                            onChange={e => setApplyToAll(e.target.checked)}
                            className="w-3 h-3 text-[#FF6600]"
                          />
                          <label htmlFor="apply_all_chk" className="text-[8px] font-bold text-slate-500 uppercase cursor-pointer">
                            Aplicar decisão para todos
                          </label>
                        </div>
                      </div>
                    )}

                    {/* ERROS SHEET DOWNLOADING (Part 10) */}
                    {previewResult.invalidCount > 0 && previewResult.invalidRowsWithReason && (
                      <div className="bg-rose-50 border border-rose-150 rounded-lg p-2.5 space-y-1.5">
                        <div className="flex items-center gap-1 text-rose-800">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[9px] font-black uppercase">Erros de Validação Encontrados</span>
                        </div>
                        <p className="text-[8px] text-slate-500">
                          {previewResult.invalidCount} linha(s) continham dados incorretos ou faltantes no Excel.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (previewResult.invalidRowsWithReason) {
                              ImportExportService.baixarPlanilhaDeErros(previewResult.invalidRowsWithReason);
                              showNotification('Baixando planilha de erros para correção!', 'success');
                            }
                          }}
                          className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[8px] font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Baixar Planilha de Erros
                        </button>
                      </div>
                    )}

                    {/* CONFIRM BUTTON (Part 9) */}
                    <button
                      onClick={handleConfirmImport}
                      disabled={isImporting || (previewResult.newCount === 0 && previewResult.duplicateCount === 0)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Gravando ({importProgress}%)</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          Confirmar Importação
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* EXPORTAÇÃO BOX (Part 5) */}
              <div className="space-y-2.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">2. Exportação Inteligente</label>
                
                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      if (servicos.length === 0) {
                        showNotification('Banco de serviços está vazio.', 'info');
                        return;
                      }
                      ImportExportService.exportarServicos(servicos, 'all');
                      showNotification('Todos os serviços foram exportados!', 'success');
                    }}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#003366]" />
                    Exportar Todos ({servicos.length})
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        const count = servicos.filter(s => s.tipoCadastro === 'Cadastro Rápido').length;
                        if (count === 0) {
                          showNotification('Não há serviços de Cadastro Rápido para exportar.', 'info');
                          return;
                        }
                        ImportExportService.exportarServicos(servicos, 'rapido');
                        showNotification('Exportando Cadastros Rápidos!', 'success');
                      }}
                      className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-lg transition text-center cursor-pointer"
                    >
                      Apenas Rápido
                    </button>
                    <button
                      onClick={() => {
                        const count = servicos.filter(s => s.tipoCadastro !== 'Cadastro Rápido').length;
                        if (count === 0) {
                          showNotification('Não há serviços de Assistente para exportar.', 'info');
                          return;
                        }
                        ImportExportService.exportarServicos(servicos, 'assistente');
                        showNotification('Exportando Serviços do Assistente!', 'success');
                      }}
                      className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-lg transition text-center cursor-pointer"
                    >
                      Apenas Assistente
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Filtrar Categoria para Exportar:</span>
                  <div className="flex gap-1">
                    <select
                      value={exportCategory}
                      onChange={e => setExportCategory(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-lg text-[9px] font-bold py-1 px-1.5 focus:outline-none"
                    >
                      {categories.map(c => (
                        <option key={c} value={c}>{c === 'Todas' ? 'Selecionar Categoria' : c}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (exportCategory === 'Todas') {
                          showNotification('Por favor, selecione uma categoria válida para exportar.', 'info');
                          return;
                        }
                        const count = servicos.filter(s => s.categoria === exportCategory).length;
                        if (count === 0) {
                          showNotification(`Não há serviços cadastrados na categoria "${exportCategory}".`, 'info');
                          return;
                        }
                        ImportExportService.exportarServicos(servicos, 'all', exportCategory);
                        showNotification(`Exportado ${count} serviços de "${exportCategory}"!`, 'success');
                      }}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase rounded-lg transition cursor-pointer"
                    >
                      Exportar
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* COLUNA BANCO DE SERVIÇOS (Desktop takes remaining 8 grid columns, on Mobile rendered only on 'banco' tab) */}
        <div className={`${activeMobileTab === 'banco' ? 'block' : 'hidden lg:block'} lg:col-span-8 space-y-4`}>
          
          {/* BARRA DE PESQUISA, CATEGORIA E FILTRO DE ORIGEM (Part 4) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, escopo ou categoria..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#003366] transition"
                />
              </div>

              {/* Origin filter (Part 4 requirement) */}
              <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[8px] font-black text-slate-400 uppercase">Origem:</span>
                <select
                  value={selectedOrigin}
                  onChange={e => setSelectedOrigin(e.target.value as any)}
                  className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="Todas">Todas</option>
                  <option value="Cadastro Rápido">⚡ Cadastro Rápido</option>
                  <option value="Assistente de Precificação">🤖 Assistente</option>
                </select>
              </div>
            </div>

            {/* Category horizontal filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#003366] border-[#003366] text-white'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* BANCO DE SERVIÇOS LIST (Part 4) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 bg-[#003366]/5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#003366]" />
                <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">📋 Banco de Serviços Inteligente</h3>
              </div>
              <span className="text-[10px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full uppercase">
                {filteredServicos.length} Serviços
              </span>
            </div>

            {isLoadingServicos ? (
              <div className="p-16 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#003366] mb-2" />
                <p className="text-xs font-bold">Acessando banco de dados...</p>
              </div>
            ) : filteredServicos.length === 0 ? (
              <div className="p-16 text-center text-slate-400 max-w-sm mx-auto space-y-3">
                <Layers className="w-10 h-10 text-slate-300 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-slate-700">Nenhum serviço localizado</p>
                  <p className="text-[10px] text-slate-500 mt-1">Experimente remover os termos de busca ou filtros ativos de categoria e origem.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                      <th className="px-4 py-3">Serviço / Categoria</th>
                      <th className="px-4 py-3">Origem</th>
                      <th className="px-4 py-3">Estrutura de Custos</th>
                      <th className="px-4 py-3">Preço Recomendado</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredServicos.map((s) => {
                      const origin = s.tipoCadastro || 'Assistente de Precificação';
                      const totalInsumos = s.materiais?.reduce((sum, m) => sum + (m.custoTotal || 0), 0) || 0;
                      const totalMaoDeObra = (s.tempoMedioExecucao || 0) * (s.valorHora || 0);
                      const totalCustos = totalInsumos + totalMaoDeObra + (s.custosFixos || 0);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/30">
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-slate-800 text-xs">{s.nome}</p>
                            <span className="inline-block bg-slate-100 text-slate-500 font-extrabold text-[8px] px-1.5 py-0.5 rounded uppercase mt-1">
                              {s.categoria}
                            </span>
                            {s.descricao && (
                              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 max-w-[200px]">{s.descricao}</p>
                            )}
                          </td>
                          
                          {/* Origin Type Column Badge (Part 4 requirement) */}
                          <td className="px-4 py-3.5">
                            {origin === 'Cadastro Rápido' ? (
                              <span className="inline-flex items-center gap-0.5 bg-amber-50 border border-amber-100 text-amber-800 font-black text-[9px] px-2 py-0.5 rounded-full">
                                <span>⚡ Rápido</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 bg-blue-50 border border-blue-100 text-blue-800 font-black text-[9px] px-2 py-0.5 rounded-full">
                                <span>🤖 Assistente</span>
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 font-mono text-[10px] text-slate-500">
                            {origin === 'Cadastro Rápido' ? (
                              <span className="text-slate-400 font-medium italic">Preço direto fixado</span>
                            ) : (
                              <div>
                                <span className="font-bold text-slate-600 block">{f(totalCustos)}</span>
                                <span className="text-[9px] text-slate-400">Insumos: {f(totalInsumos)} • Horas: {s.tempoMedioExecucao}h</span>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <p className="font-mono font-extrabold text-[#003366] text-xs">{f(s.precoRecomendado)}</p>
                            {origin !== 'Cadastro Rápido' && (
                              <span className="text-[9px] text-slate-400 block font-semibold">Markup: {s.markup?.toFixed(2)}</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {deletingId === s.id ? (
                                <div className="flex items-center gap-1 bg-rose-50 border border-rose-150 rounded-lg p-0.5">
                                  <span className="text-[8px] font-black text-rose-700 uppercase px-1">Excluir?</span>
                                  <button
                                    onClick={() => {
                                      handleDeleteConfirmed(s.id);
                                      setDeletingId(null);
                                    }}
                                    className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded cursor-pointer"
                                  >
                                    <Check className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingId(null)}
                                    className="p-1 bg-slate-150 hover:bg-slate-200 text-slate-500 rounded cursor-pointer"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    title="Editar serviço"
                                    onClick={() => handleOpenEdit(s)}
                                    className="p-1 hover:bg-slate-100 text-[#003366] rounded cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    title="Duplicar serviço"
                                    onClick={() => handleDuplicate(s)}
                                    className="p-1 hover:bg-slate-100 text-slate-500 rounded cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  {origin !== 'Cadastro Rápido' && (
                                    <button
                                      title="Recalcular custos"
                                      onClick={() => handleInstantRecalculateSingle(s)}
                                      className="p-1 hover:bg-slate-100 text-amber-600 rounded cursor-pointer"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    title="Excluir"
                                    onClick={() => setDeletingId(s.id)}
                                    className="p-1 hover:bg-rose-50 text-rose-500 rounded cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Assistente de Precificação Modal integration */}
      <AssistentePrecificacaoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalInitialData(null);
        }}
        onSuccess={() => {
          if (reloadServicos) reloadServicos();
          showNotification('Cálculo de precificação salvo com sucesso no Banco de Serviços!', 'success');
        }}
        initialData={modalInitialData}
      />

    </div>
  );
}
