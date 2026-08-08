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
  ChevronDown,
  ChevronUp,
  Eye,
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
  Filter,
  Package,
  Box
} from 'lucide-react';
import { ServicoContext } from '../contexts/ServicoContext';
import { PrecificacaoContext } from '../contexts/PrecificacaoContext';
import { EmpresaContext } from '../contexts/EmpresaContext';
import { AuthContext } from '../contexts/AuthContext';
import { Servico } from '../types';
import { PrecificacaoService } from '../services/PrecificacaoService';
import { ImportExportService, ImportPreviewResult } from '../services/ImportExportService';
import AssistentePrecificacaoModal from '../components/AssistentePrecificacaoModal';
import { saveModuleState, getModuleState, applySmartFocus } from '../utils/navigationState';
import { UIHeader, UICard, UIButton, UIBadge } from '../components/ui/UIComponents';

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

  const initialNavState = getModuleState('central_precificacao');

  // Mobile Tabs
  const [activeMobileTab, setActiveMobileTab] = useState<'rapido' | 'assistente' | 'import_export' | 'banco'>(
    (initialNavState.activeTab as any) || 'banco'
  );

  // Table Visibility Toggle State (Default false - hidden)
  const [showTable, setShowTable] = useState<boolean>(initialNavState.showTable || false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>(initialNavState.searchTerm || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialNavState.category || 'Todas');
  const [selectedOrigin, setSelectedOrigin] = useState<'Todas' | 'Cadastro Rápido' | 'Assistente de Precificação'>(
    (initialNavState.filterStatus as any) || 'Todas'
  );
  const [filteredServicos, setFilteredServicos] = useState<Servico[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-expand table when user types a search query
  useEffect(() => {
    if (searchTerm.trim() !== '') {
      setShowTable(true);
    }
  }, [searchTerm]);

  // State persistence
  useEffect(() => {
    saveModuleState('central_precificacao', {
      searchTerm,
      category: selectedCategory,
      filterStatus: selectedOrigin,
      showTable,
    });
  }, [searchTerm, selectedCategory, selectedOrigin, showTable]);

  // Scroll restoration
  useEffect(() => {
    const savedScroll = initialNavState.scrollPos;
    if (savedScroll && savedScroll > 0) {
      setTimeout(() => window.scrollTo({ top: savedScroll, behavior: 'instant' as ScrollBehavior }), 50);
    }

    const onScroll = () => {
      saveModuleState('central_precificacao', { scrollPos: window.scrollY });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Smart focus
  useEffect(() => {
    if (activeMobileTab === 'banco') {
      applySmartFocus(searchInputRef.current);
    }
  }, [activeMobileTab]);

  // Cadastro Rápido States (Serviços e Peças)
  const [quickType, setQuickType] = useState<'servico' | 'peca'>('servico');
  const [quickNome, setQuickNome] = useState('');
  const [quickCategoria, setQuickCategoria] = useState('Manutenção');
  const [quickUnidade, setQuickUnidade] = useState('UN');
  const [quickValor, setQuickValor] = useState('');
  const [quickObservacoes, setQuickObservacoes] = useState('');
  const [isSavingQuick, setIsSavingQuick] = useState(false);
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);

  // Helper to parse monetary decimal values in Brazilian/global format (e.g. 0,01, 0,50, 125,80)
  const parseMonetaryValue = (val: string | number): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    
    let cleaned = val.toString().trim();
    if (cleaned.includes(',')) {
      if (cleaned.includes('.')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        cleaned = cleaned.replace(',', '.');
      }
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

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
        const origin = s.tipoCadastro || 'Assistente de Precificação';
        return origin === selectedOrigin;
      });
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.nome.toLowerCase().includes(term) ||
        s.descricao?.toLowerCase().includes(term) ||
        s.categoria.toLowerCase().includes(term) ||
        s.unidade?.toLowerCase().includes(term) ||
        s.observacoes?.toLowerCase().includes(term)
      );
    }

    setFilteredServicos(result);
  }, [searchTerm, selectedCategory, selectedOrigin, servicos]);

  // Cadastro Rápido Save Logic
  const handleQuickSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const isPeca = quickType === 'peca';
    const nomeTrimmed = quickNome.trim();

    if (!nomeTrimmed) {
      showNotification(isPeca ? 'O nome da peça é obrigatório.' : 'O nome do serviço é obrigatório.', 'error');
      return;
    }
    const valorNum = parseMonetaryValue(quickValor);
    if (valorNum <= 0) {
      showNotification('O valor deve ser maior que zero (ex: 0,01, 0,50, 125,80).', 'error');
      return;
    }

    setIsSavingQuick(true);
    try {
      const newSrv: Servico = {
        id: 'srv_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
        empresaId: empresaId,
        nome: nomeTrimmed,
        categoria: quickCategoria || (isPeca ? 'Peças / Componentes' : 'Manutenção'),
        descricao: quickObservacoes.trim() || (isPeca ? 'Peça cadastrada via Cadastro Rápido' : 'Serviço cadastrado via Cadastro Rápido'),
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
        tipoItem: isPeca ? 'peca' : 'servico',
        unidade: isPeca ? (quickUnidade || 'UN') : undefined,
        observacoes: quickObservacoes.trim(),
        dataCriacao: new Date().toISOString(),
        ultimaAtualizacao: new Date().toISOString(),
        quantidadeUtilizacoes: 0,
        status: 'Ativo'
      };

      await saveServico(newSrv);

      // Immediate state update
      setFilteredServicos(prev => [newSrv, ...prev.filter(s => s.id !== newSrv.id)]);

      if (reloadServicos) {
        await reloadServicos();
      }
      showNotification(
        isPeca 
          ? `Peça "${newSrv.nome}" cadastrada com sucesso via Cadastro Rápido!` 
          : `Serviço "${newSrv.nome}" cadastrado com sucesso via Cadastro Rápido!`, 
        'success'
      );
      setQuickNome('');
      setQuickValor('');
      setQuickObservacoes('');
      setIsQuickModalOpen(false);
    } catch (err) {
      console.error(err);
      showNotification('Erro ao salvar no banco.', 'error');
    } finally {
      setIsSavingQuick(false);
    }
  };

  const handleOpenQuickModal = (type: 'servico' | 'peca') => {
    setQuickType(type);
    if (type === 'peca') {
      setQuickCategoria('Peças / Componentes');
    } else {
      setQuickCategoria('Manutenção');
    }
    setIsQuickModalOpen(true);
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
      await deleteServico(id);
      setFilteredServicos(prev => prev.filter(s => s.id !== id));
      if (reloadServicos) {
        await reloadServicos();
      }
      showNotification("Serviço excluído com sucesso!", "success");
    } catch (err: any) {
      console.error(err);
      if (reloadServicos) {
        await reloadServicos();
      }
      showNotification(err.message || "Erro ao excluir serviço.", "error");
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
      
      {/* Standardized Page Header */}
      <UIHeader
        title="Central de Precificação 2.0"
        subtitle="Formulação de preços rápida, assistentes detalhados de custos e importador inteligente via planilhas Excel."
        icon={Calculator}
        onBack={onBack}
        badge={<UIBadge status="warning" label="OFFLINE-FIRST" />}
      />

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
        <button
          type="button"
          onClick={handleRecalculateAll}
          disabled={isRecalculatingAll || servicos.filter(s => s.tipoCadastro !== 'Cadastro Rápido').length === 0}
          className={`p-4 rounded-2xl border shadow-xs transition cursor-pointer flex flex-col justify-between text-left group ${
            isRecalculatingAll || servicos.filter(s => s.tipoCadastro !== 'Cadastro Rápido').length === 0
              ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
              : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-[#003366]'
          }`}
          title="Recalcular custos de todos os serviços do assistente com base nas alíquotas e insumos atuais"
        >
          <div className="flex items-center justify-between w-full">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-[#003366] transition">Recalcular Custos</p>
            <RefreshCw className={`w-3.5 h-3.5 text-[#003366] shrink-0 ${isRecalculatingAll ? 'animate-spin' : ''}`} />
          </div>
          <p className="text-lg font-black text-[#003366] mt-0.5">
            {servicos.filter(s => s.tipoCadastro !== 'Cadastro Rápido').length}
          </p>
          <p className="text-[8px] text-slate-500 mt-0.5">
            {isRecalculatingAll ? 'Recalculando...' : 'serviços para recalcular'}
          </p>
        </button>
      </div>

      {/* TOP SECTION: 3 ACTION CARDS SIDE-BY-SIDE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* CARD 1: CADASTRO RÁPIDO */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#FF6600]/10 rounded-lg text-[#FF6600]">
                {quickType === 'peca' ? <Package className="w-4 h-4 stroke-[2.5]" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
              </div>
              <div>
                <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">⚡ Cadastro Rápido</h3>
                <p className="text-[10px] text-slate-500">Adicione peças ou serviços com preço fixo</p>
              </div>
            </div>
          </div>

          <div className="p-4 pt-3 space-y-3.5 flex-1 flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* Type Switcher Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setQuickType('servico');
                    setQuickCategoria('Manutenção');
                  }}
                  className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                    quickType === 'servico' ? 'bg-white text-[#FF6600] shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Serviço
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickType('peca');
                    setQuickCategoria('Peças / Componentes');
                  }}
                  className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                    quickType === 'peca' ? 'bg-white text-[#003366] shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Package className="w-3 h-3" />
                  Peça
                </button>
              </div>

              <form id="quick-save-form" onSubmit={handleQuickSave} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                    {quickType === 'peca' ? 'Nome da Peça *' : 'Nome do Serviço *'}
                  </label>
                  <input
                    type="text"
                    placeholder={quickType === 'peca' ? 'Ex: Filtro de Óleo Mann HU 711/51' : 'Ex: Alinhamento e Balanceamento Simples'}
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
                      {quickType === 'peca' ? (
                        <>
                          <option value="Peças / Componentes">Peças / Componentes</option>
                          <option value="Filtros">Filtros</option>
                          <option value="Óleos / Fluidos">Óleos / Fluidos</option>
                          <option value="Freios">Freios</option>
                          <option value="Suspensão">Suspensão</option>
                          <option value="Motor">Motor</option>
                          <option value="Elétrica">Elétrica</option>
                          <option value="Transmissão">Transmissão</option>
                          <option value="Pneus">Pneus</option>
                          <option value="Geral">Geral</option>
                          <option value="Outros">Outros</option>
                        </>
                      ) : (
                        <>
                          <option value="Manutenção">Manutenção</option>
                          <option value="Elétrica">Elétrica</option>
                          <option value="Hidráulica">Hidráulica</option>
                          <option value="Motor">Motor</option>
                          <option value="Transmissão">Transmissão</option>
                          <option value="Pintura/Chaparia">Pintura/Chaparia</option>
                          <option value="Torno e Solda">Torno e Solda</option>
                          <option value="Outros">Outros</option>
                        </>
                      )}
                    </select>
                  </div>

                  {quickType === 'peca' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Unidade</label>
                      <select
                        value={quickUnidade}
                        onChange={e => setQuickUnidade(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                      >
                        <option value="UN">Unidade (UN)</option>
                        <option value="KG">Quilograma (KG)</option>
                        <option value="L">Litro (L)</option>
                        <option value="M">Metro (M)</option>
                        <option value="JOGO">Jogo (JOGO)</option>
                        <option value="PAR">Par (PAR)</option>
                        <option value="CX">Caixa (CX)</option>
                        <option value="GALAO">Galão (GALAO)</option>
                        <option value="KT">Kit (KT)</option>
                      </select>
                    </div>
                  )}

                  <div className={`space-y-1 ${quickType === 'peca' ? 'col-span-1' : ''}`}>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                      {quickType === 'peca' ? 'Valor Unitário (R$) *' : 'Valor Total (R$) *'}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,01 | 0,50 | 125,80"
                      value={quickValor}
                      onChange={e => setQuickValor(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold font-mono text-slate-800 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Observações (Opcional)</label>
                  <input
                    type="text"
                    placeholder={quickType === 'peca' ? 'Ex: Código OEM, especificação...' : 'Ex: Detalhes adicionais...'}
                    value={quickObservacoes}
                    onChange={e => setQuickObservacoes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </form>
            </div>

            <button
              type="submit"
              form="quick-save-form"
              disabled={isSavingQuick}
              className="w-full mt-4 py-2.5 bg-[#FF6600] hover:bg-[#dd5500] text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSavingQuick ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  {quickType === 'peca' ? 'Salvar Peça Rápida' : 'Salvar Serviço Rápido'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* CARD 2: ASSISTENTE DE PRECIFICAÇÃO */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
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
              
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 space-y-2 text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-bold">✔ Custos de Materiais</span>
                  <span className="text-slate-800 font-black bg-white px-2 py-0.5 rounded border border-slate-200">Markup</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-bold">✔ Mão de Obra Técnica</span>
                  <span className="text-slate-800 font-black bg-white px-2 py-0.5 rounded border border-slate-200">Horas Reais</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-bold">✔ Custos Operacionais</span>
                  <span className="text-slate-800 font-black bg-white px-2 py-0.5 rounded border border-slate-200">Rateio Fixo</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 pt-0">
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
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
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

                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center hover:bg-slate-50 transition relative">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".xlsx"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <Upload className="w-4 h-4 mx-auto text-indigo-500 mb-1" />
                      <p className="text-[10px] font-bold text-slate-700">Selecionar arquivo .xlsx</p>
                      <p className="text-[8px] text-slate-400 mt-0.5">Clique para buscar o Excel oficial</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
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

                    {previewResult.duplicateCount > 0 && (
                      <div className="space-y-1 bg-white border border-slate-200 rounded-lg p-2">
                        <label className="text-[9px] font-black text-amber-700 uppercase tracking-wider block">Ação para Duplicados:</label>
                        <select
                          value={duplicateDecision}
                          onChange={e => setDuplicateDecision(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-250 rounded-lg py-1 px-1.5 text-[10px] font-bold focus:outline-none"
                        >
                          <option value="update">Atualizar Existentes</option>
                          <option value="ignore">Ignorar Novos</option>
                          <option value="create_new">Criar Cópias</option>
                        </select>
                      </div>
                    )}

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

              {/* EXPORTAÇÃO BOX */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">2. Exportação Inteligente</label>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (servicos.length === 0) {
                        showNotification('Banco de serviços está vazio.', 'info');
                        return;
                      }
                      ImportExportService.exportarServicos(servicos, 'all');
                      showNotification('Todos os serviços foram exportados!', 'success');
                    }}
                    className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#003366]" />
                    Exportar Todos ({servicos.length})
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* SEARCH BAR & TOGGLEABLE BANCO DE ITENS TABLE */}
      <div className="space-y-4 pt-2">
        
        {/* BARRA DE PESQUISA, FILTROS E BOTÃO DE TOGGLE */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Pesquisar por nome, escopo ou categoria..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#003366] transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Limpar pesquisa"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Origin Filter */}
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[8px] font-black text-slate-400 uppercase">Origem:</span>
              </div>
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

            {/* TOGGLE BUTTON: Ver Banco de Itens */}
            <button
              type="button"
              onClick={() => setShowTable(prev => !prev)}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 border shadow-xs cursor-pointer shrink-0 ${
                showTable
                  ? 'bg-[#003366] text-white border-[#003366] hover:bg-[#002244]'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
              }`}
            >
              <Database className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>{showTable ? 'Ocultar Banco de Itens' : 'Ver Banco de Itens'}</span>
              <span className="px-2 py-0.5 bg-white/20 text-white rounded-full text-[10px] font-black">
                {filteredServicos.length}
              </span>
              {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
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

        {/* BANCO DE SERVIÇOS LIST TABLE (TOGGLEABLE) */}
        {showTable && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden animate-in fade-in duration-200">
            <div className="px-5 py-4 bg-[#003366]/5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#003366]" />
                <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">📋 Banco de Itens & Serviços</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenQuickModal('peca')}
                  className="px-2.5 py-1 bg-[#003366] hover:bg-[#002244] text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Package className="w-3 h-3 text-[#FF6600]" />
                  + Nova Peça
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenQuickModal('servico')}
                  className="px-2.5 py-1 bg-white border border-slate-200 text-[#003366] hover:bg-slate-50 font-black text-[9px] uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3 h-3 text-[#FF6600]" />
                  + Novo Serviço
                </button>
                <span className="text-[10px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full uppercase">
                  {filteredServicos.length} Itens
                </span>
              </div>
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
                  <p className="text-xs font-bold text-slate-700">Nenhum item ou serviço localizado</p>
                  <p className="text-[10px] text-slate-500 mt-1">Experimente remover os termos de busca ou filtros ativos de categoria e origem.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                      <th className="px-4 py-3">Item / Serviço</th>
                      <th className="px-4 py-3">Origem</th>
                      <th className="px-4 py-3">Estrutura de Custos</th>
                      <th className="px-4 py-3">Preço Recomendado</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredServicos.map((s) => {
                      const origin = s.tipoCadastro || 'Assistente de Precificação';
                      const isPeca = s.tipoItem === 'peca' || s.categoria?.toLowerCase().includes('peça') || s.categoria?.toLowerCase().includes('filtro') || s.categoria?.toLowerCase().includes('óleo');
                      const totalInsumos = s.materiais?.reduce((sum, m) => sum + (m.custoTotal || 0), 0) || 0;
                      const totalMaoDeObra = (s.tempoMedioExecucao || 0) * (s.valorHora || 0);
                      const totalCustos = totalInsumos + totalMaoDeObra + (s.custosFixos || 0);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/30">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-slate-800 text-xs">{s.nome}</p>
                              {isPeca && (
                                <span className="bg-amber-100 text-amber-900 font-extrabold text-[8px] px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                                  <Package className="w-2.5 h-2.5" />
                                  Peça {s.unidade ? `(${s.unidade})` : ''}
                                </span>
                              )}
                            </div>
                            <span className="inline-block bg-slate-100 text-slate-500 font-extrabold text-[8px] px-1.5 py-0.5 rounded uppercase mt-1">
                              {s.categoria}
                            </span>
                            {s.descricao && (
                              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 max-w-[200px]">{s.descricao}</p>
                            )}
                          </td>
                          
                          {/* Origin Type Column Badge */}
                          <td className="px-4 py-3.5">
                            {isPeca ? (
                              <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-800 font-black text-[9px] px-2 py-0.5 rounded-full">
                                <Package className="w-3 h-3 text-[#FF6600]" />
                                <span>Peça Rápida</span>
                              </span>
                            ) : origin === 'Cadastro Rápido' ? (
                              <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-800 font-black text-[9px] px-2 py-0.5 rounded-full">
                                <span>⚡ Rápido</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-800 font-black text-[9px] px-2 py-0.5 rounded-full">
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
        )}

      </div>

      {/* Cadastro Rápido Modal (Peça ou Serviço) */}
      {isQuickModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#FF6600]/10 rounded-xl text-[#FF6600]">
                  {quickType === 'peca' ? <Package className="w-5 h-5 stroke-[2.5]" /> : <Plus className="w-5 h-5 stroke-[2.5]" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
                    {quickType === 'peca' ? 'Cadastro Rápido de Peça' : 'Cadastro Rápido de Serviço'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {quickType === 'peca' ? 'Cadastre uma nova peça no banco de precificação' : 'Cadastre um novo serviço direto no banco'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-150 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickSave} className="p-5 space-y-4">
              {/* Type Switcher inside Modal */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setQuickType('servico');
                    setQuickCategoria('Manutenção');
                  }}
                  className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    quickType === 'servico' ? 'bg-white text-[#FF6600] shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Serviço
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickType('peca');
                    setQuickCategoria('Peças / Componentes');
                  }}
                  className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    quickType === 'peca' ? 'bg-white text-[#003366] shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Peça
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  {quickType === 'peca' ? 'Nome da Peça *' : 'Nome do Serviço *'}
                </label>
                <input
                  type="text"
                  placeholder={quickType === 'peca' ? 'Ex: Filtro de Óleo Mann HU 711/51' : 'Ex: Alinhamento e Balanceamento Simples'}
                  value={quickNome}
                  onChange={e => setQuickNome(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Categoria</label>
                  <select
                    value={quickCategoria}
                    onChange={e => setQuickCategoria(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    {quickType === 'peca' ? (
                      <>
                        <option value="Peças / Componentes">Peças / Componentes</option>
                        <option value="Filtros">Filtros</option>
                        <option value="Óleos / Fluidos">Óleos / Fluidos</option>
                        <option value="Freios">Freios</option>
                        <option value="Suspensão">Suspensão</option>
                        <option value="Motor">Motor</option>
                        <option value="Elétrica">Elétrica</option>
                        <option value="Transmissão">Transmissão</option>
                        <option value="Pneus">Pneus</option>
                        <option value="Geral">Geral</option>
                        <option value="Outros">Outros</option>
                      </>
                    ) : (
                      <>
                        <option value="Manutenção">Manutenção</option>
                        <option value="Elétrica">Elétrica</option>
                        <option value="Hidráulica">Hidráulica</option>
                        <option value="Motor">Motor</option>
                        <option value="Transmissão">Transmissão</option>
                        <option value="Pintura/Chaparia">Pintura/Chaparia</option>
                        <option value="Torno e Solda">Torno e Solda</option>
                        <option value="Outros">Outros</option>
                      </>
                    )}
                  </select>
                </div>

                {quickType === 'peca' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Unidade</label>
                    <select
                      value={quickUnidade}
                      onChange={e => setQuickUnidade(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                    >
                      <option value="UN">Unidade (UN)</option>
                      <option value="KG">Quilograma (KG)</option>
                      <option value="L">Litro (L)</option>
                      <option value="M">Metro (M)</option>
                      <option value="JOGO">Jogo (JOGO)</option>
                      <option value="PAR">Par (PAR)</option>
                      <option value="CX">Caixa (CX)</option>
                      <option value="GALAO">Galão (GALAO)</option>
                      <option value="KT">Kit (KT)</option>
                    </select>
                  </div>
                )}

                <div className={`space-y-1 ${quickType === 'peca' ? 'col-span-1' : ''}`}>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    {quickType === 'peca' ? 'Valor Unitário (R$) *' : 'Valor Total (R$) *'}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,01 | 0,50 | 125,80"
                    value={quickValor}
                    onChange={e => setQuickValor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold font-mono text-slate-800 focus:outline-none focus:border-[#FF6600]"
                    required
                  />
                  <p className="text-[9px] text-slate-400">Aceita centavos (ex: 0,01 ou 0.50)</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Observações / Código (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder={quickType === 'peca' ? 'Ex: Código OEM 123456, aplicação VW Gol 1.0...' : 'Ex: Descrição do escopo do serviço...'}
                  value={quickObservacoes}
                  onChange={e => setQuickObservacoes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuick}
                  className="px-5 py-2 bg-[#FF6600] hover:bg-[#dd5500] text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingQuick ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      {quickType === 'peca' ? 'Salvar Peça' : 'Salvar Serviço'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
