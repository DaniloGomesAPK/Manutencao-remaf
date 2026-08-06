/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext } from 'react';
import { 
  RotateCcw, 
  Trash2, 
  Search, 
  Filter, 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ShieldAlert, 
  RefreshCw, 
  FileText, 
  Users, 
  Wrench, 
  DollarSign, 
  Layers, 
  Eye, 
  X,
  Building2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { RecuperacaoService, RegistroLixeira, TipoRegistroLixeira, DependencyCheckResult } from '../services/RecuperacaoService';
import { EmpresaContext } from '../contexts/EmpresaContext';
import { UICard, UIButton, UIBadge, UIAlert, UIInput, UISelect } from './ui/UIComponents';

export default function CentralRecuperacaoSection() {
  const empresaCtx = useContext(EmpresaContext);
  const empresaId = empresaCtx?.empresa?.id || '';

  const [registros, setRegistros] = useState<RegistroLixeira[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('Todos');

  // Feedback notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null);

  // Modal State: Details & Active Dependencies
  const [detailsModalItem, setDetailsModalItem] = useState<{ item: RegistroLixeira; depInfo: DependencyCheckResult } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Modal State: Intelligent Restore (Cascade / Single)
  const [restoreModalData, setRestoreModalData] = useState<{ item: RegistroLixeira; depCheck: DependencyCheckResult } | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Modal State: Permanent Delete Confirmation ("EXCLUIR")
  const [deleteModalItem, setDeleteModalItem] = useState<RegistroLixeira | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Load records from Lixeira
  const loadRegistros = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const items = await RecuperacaoService.getRegistrosLixeira(empresaId);
      // Ordena pelos mais recentemente excluídos
      items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
      setRegistros(items);
    } catch (err) {
      console.error('Erro ao carregar registros da Central de Recuperação:', err);
      setNotification({
        type: 'error',
        title: 'Erro de Carregamento',
        message: 'Não foi possível buscar os registros na lixeira.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistros();
  }, [empresaId]);

  // Filtered records
  const filteredRegistros = registros.filter(r => {
    // Type Filter
    if (selectedType !== 'Todos' && r.tipo !== selectedType) {
      return false;
    }

    // Search Term Filter
    if (searchTerm.trim()) {
      const norm = searchTerm.toLowerCase().trim();
      const matchNome = (r.nome || '').toLowerCase().includes(norm);
      const matchIdent = (r.identificacao || '').toLowerCase().includes(norm);
      const matchUser = (r.deletedBy || '').toLowerCase().includes(norm);
      const matchTipo = (r.tipo || '').toLowerCase().includes(norm);
      const matchColecao = (r.colecaoOrigem || '').toLowerCase().includes(norm);
      return matchNome || matchIdent || matchUser || matchTipo || matchColecao;
    }

    return true;
  });

  // Handle Initiate Restore Flow
  const handleInitiateRestore = async (item: RegistroLixeira) => {
    setRestoring(true);
    try {
      const depCheck = await RecuperacaoService.checkRestoreDependencies(item, empresaId);

      if (depCheck.hasDependencies) {
        // Se houver dependências na lixeira, exibe o modal de Restauração Inteligente
        setRestoreModalData({ item, depCheck });
      } else {
        // Restauração direta se não houver dependências na lixeira
        await RecuperacaoService.restoreRecord(item, empresaId, false);
        setNotification({
          type: 'success',
          title: 'Registro Restaurado',
          message: `${item.tipo} "${item.nome}" foi restaurado com sucesso para o sistema.`,
        });
        await loadRegistros();
      }
    } catch (err: any) {
      console.error('Erro ao restaurar registro:', err);
      setNotification({
        type: 'error',
        title: 'Erro na Restauração',
        message: err.message || 'Ocorreu um erro ao tentar restaurar o registro.',
      });
    } finally {
      setRestoring(false);
    }
  };

  // Confirm Restore (Cascade or Single)
  const handleConfirmRestore = async (cascade: boolean) => {
    if (!restoreModalData) return;
    setRestoring(true);
    try {
      await RecuperacaoService.restoreRecord(restoreModalData.item, empresaId, cascade);
      setNotification({
        type: 'success',
        title: 'Restauração Concluída',
        message: cascade 
          ? `Registro "${restoreModalData.item.nome}" e todas as suas dependências foram restaurados em lote!`
          : `Registro "${restoreModalData.item.nome}" foi restaurado.`,
      });
      setRestoreModalData(null);
      await loadRegistros();
    } catch (err: any) {
      console.error('Erro na restauração confirmada:', err);
      setNotification({
        type: 'error',
        title: 'Falha na Restauração',
        message: err.message || 'Não foi possível completar a restauração.',
      });
    } finally {
      setRestoring(false);
    }
  };

  // Open Details Modal
  const handleOpenDetails = async (item: RegistroLixeira) => {
    setLoadingDetails(true);
    try {
      const depInfo = await RecuperacaoService.checkRestoreDependencies(item, empresaId);
      setDetailsModalItem({ item, depInfo });
    } catch (err) {
      console.error('Erro ao buscar detalhes do registro:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Confirm Permanent Hard Delete ("EXCLUIR")
  const handleConfirmHardDelete = async () => {
    if (!deleteModalItem) return;
    if (confirmInput.trim().toUpperCase() !== 'EXCLUIR') return;

    setDeleting(true);
    try {
      await RecuperacaoService.hardDeleteRecord(deleteModalItem, empresaId);
      setNotification({
        type: 'info',
        title: 'Exclusão Definitiva Efetuada',
        message: `O registro "${deleteModalItem.nome}" foi permanentemente removido do banco de dados.`,
      });
      setDeleteModalItem(null);
      setConfirmInput('');
      await loadRegistros();
    } catch (err: any) {
      console.error('Erro na exclusão definitiva:', err);
      setNotification({
        type: 'error',
        title: 'Erro na Exclusão Definitiva',
        message: err.message || 'Falha ao remover o registro permanentemente.',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Helper for Type Icons
  const getTypeIcon = (tipo: TipoRegistroLixeira) => {
    switch (tipo) {
      case 'Cliente': return <Users className="w-4 h-4 text-blue-600" />;
      case 'Equipamento': return <Wrench className="w-4 h-4 text-purple-600" />;
      case 'Orçamento': return <FileText className="w-4 h-4 text-amber-600" />;
      case 'Ordem de Serviço': return <FileText className="w-4 h-4 text-emerald-600" />;
      case 'Financeiro': return <DollarSign className="w-4 h-4 text-teal-600" />;
      case 'Serviço': return <Layers className="w-4 h-4 text-indigo-600" />;
      case 'Técnico': return <User className="w-4 h-4 text-cyan-600" />;
      case 'Categoria': return <Filter className="w-4 h-4 text-slate-600" />;
      default: return <RotateCcw className="w-4 h-4 text-slate-600" />;
    }
  };

  // Helper for Type Badges
  const getTypeBadgeStyle = (tipo: TipoRegistroLixeira) => {
    switch (tipo) {
      case 'Cliente': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Equipamento': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Orçamento': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Ordem de Serviço': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Financeiro': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Serviço': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Técnico': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Categoria': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formattedDate = (isoStr: string) => {
    if (!isoStr) return 'Data N/D';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Intro Header Banner */}
      <div id="recuperacao-header-banner" className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl shrink-0 border border-blue-500/30">
              <RotateCcw className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">Central de Recuperação</h2>
                <UIBadge status="info" label="30 DIAS RETENÇÃO" />
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed font-medium">
                Consulte, restaure e gerencie registros excluídos com total integridade relacional e prevenção contra dados órfãos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadRegistros}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition border border-slate-700 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Feedback Notification */}
      {notification && (
        <UIAlert
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Global Search and Type Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          
          {/* Global Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisa global: nome, cliente, OS, código..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-transparent transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Select */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-500 shrink-0 hidden sm:inline-block" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full md:w-56 px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003366]"
            >
              <option value="Todos">Todos os Tipos ({registros.length})</option>
              <option value="Cliente">Clientes</option>
              <option value="Equipamento">Equipamentos</option>
              <option value="Orçamento">Orçamentos</option>
              <option value="Ordem de Serviço">Ordens de Serviço</option>
              <option value="Financeiro">Lançamentos Financeiros</option>
              <option value="Serviço">Serviços</option>
              <option value="Técnico">Técnicos</option>
              <option value="Categoria">Categorias</option>
            </select>
          </div>

        </div>

        {/* Quick Filter Pill Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-none text-[11px]">
          {['Todos', 'Cliente', 'Equipamento', 'Orçamento', 'Ordem de Serviço', 'Financeiro', 'Serviço', 'Técnico', 'Categoria'].map((t) => {
            const count = t === 'Todos' ? registros.length : registros.filter(r => r.tipo === t).length;
            const isSelected = selectedType === t;
            return (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-lg font-bold tracking-tight whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#003366] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{t === 'Todos' ? 'Todos' : t}</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main List of Soft Deleted Records */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-3">
          <div className="w-8 h-8 border-3 border-[#003366] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Consultando Lixeira do Sistema...</p>
        </div>
      ) : filteredRegistros.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 text-center px-4 space-y-3">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-full border border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Nenhum Registro na Lixeira</h3>
          <p className="text-xs text-slate-500 max-w-md leading-relaxed">
            {searchTerm || selectedType !== 'Todos'
              ? 'Nenhum registro atendeu aos critérios de busca/filtro selecionados.'
              : 'Todos os dados da empresa estão ativos e em perfeita integridade.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRegistros.map((item) => {
            const daysRemaining = RecuperacaoService.calculateDaysRemaining(item.deletedAt, item.expiresAt);

            // Retention Badge Style
            let daysBadgeStatus: 'error' | 'warning' | 'info' = 'info';
            if (daysRemaining <= 5) daysBadgeStatus = 'error';
            else if (daysRemaining <= 10) daysBadgeStatus = 'warning';

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between space-y-4"
              >
                {/* Header Row: Type Badge + Days Remaining */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border ${getTypeBadgeStyle(item.tipo)}`}>
                    {getTypeIcon(item.tipo)}
                    <span>{item.tipo}</span>
                  </span>

                  <UIBadge
                    status={daysBadgeStatus}
                    label={`Restam ${daysRemaining} dias`}
                  />
                </div>

                {/* Body Details */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-snug line-clamp-2">
                    {item.nome}
                  </h3>
                  
                  {item.identificacao && (
                    <p className="text-xs text-slate-500 font-mono bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60 inline-block">
                      ID/Ref: {item.identificacao}
                    </p>
                  )}

                  <div className="pt-2 text-[11px] text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Excluído em: <strong>{formattedDate(item.deletedAt)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Por: <strong className="text-slate-700">{item.deletedBy}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  
                  <button
                    type="button"
                    onClick={() => handleOpenDetails(item)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-[#003366] transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detalhes</span>
                  </button>

                  <div className="flex items-center gap-2">
                    
                    {/* Hard Delete Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteModalItem(item);
                        setConfirmInput('');
                      }}
                      className="px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer"
                      title="Excluir Permanentemente"
                    >
                      Excluir Definitivo
                    </button>

                    {/* Restore Button */}
                    <button
                      type="button"
                      onClick={() => handleInitiateRestore(item)}
                      disabled={restoring}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold bg-[#003366] hover:bg-[#002244] text-white rounded-lg transition shadow-xs cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restaurar</span>
                    </button>

                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Details & Dependency Analysis */}
      {detailsModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Detalhes do Registro na Lixeira</h3>
                  <p className="text-xs text-slate-500">Informações e análise de vínculos de integridade</p>
                </div>
              </div>
              <button onClick={() => setDetailsModalItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div><span className="text-slate-500">Tipo:</span> <strong className="text-slate-900">{detailsModalItem.item.tipo}</strong></div>
                <div><span className="text-slate-500">Nome/Descrição:</span> <strong className="text-slate-900">{detailsModalItem.item.nome}</strong></div>
                <div><span className="text-slate-500">Identificação:</span> <code className="bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-800">{detailsModalItem.item.identificacao}</code></div>
                <div><span className="text-slate-500">Data de Exclusão:</span> <strong>{formattedDate(detailsModalItem.item.deletedAt)}</strong></div>
                <div><span className="text-slate-500">Excluído por:</span> <strong>{detailsModalItem.item.deletedBy}</strong></div>
                <div><span className="text-slate-500">Coleção de Origem:</span> <code className="text-blue-700">{detailsModalItem.item.colecaoOrigem}</code></div>
              </div>

              {/* Dependency Breakdown Box */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-blue-50/50 space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Análise de Dependências Ativas no Sistema</span>
                </h4>
                <p className="text-[11px] text-slate-600">
                  {detailsModalItem.depInfo.summaryText}
                </p>

                {detailsModalItem.depInfo.activeDependenciesCount > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    {detailsModalItem.depInfo.activeDependenciesBreakdown.ordensServico > 0 && (
                      <div className="bg-white p-2 rounded border border-slate-200 font-medium">
                        OSs Ativas: <strong>{detailsModalItem.depInfo.activeDependenciesBreakdown.ordensServico}</strong>
                      </div>
                    )}
                    {detailsModalItem.depInfo.activeDependenciesBreakdown.orcamentos > 0 && (
                      <div className="bg-white p-2 rounded border border-slate-200 font-medium">
                        Orçamentos: <strong>{detailsModalItem.depInfo.activeDependenciesBreakdown.orcamentos}</strong>
                      </div>
                    )}
                    {detailsModalItem.depInfo.activeDependenciesBreakdown.financeiro > 0 && (
                      <div className="bg-white p-2 rounded border border-slate-200 font-medium">
                        Lançamentos: <strong>{detailsModalItem.depInfo.activeDependenciesBreakdown.financeiro}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <UIButton variant="secondary" onClick={() => setDetailsModalItem(null)}>
                Fechar
              </UIButton>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: Intelligent Restore Cascade Prompt */}
      {restoreModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center gap-3 border-b border-amber-100 pb-3">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Restauração Inteligente com Dependências</h3>
                <p className="text-xs text-amber-700 font-medium">Dependências deste registro também estão na lixeira</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                O registro <strong>"{restoreModalData.item.nome}"</strong> ({restoreModalData.item.tipo}) refere-se a outros dados que também foram excluídos anteriormente:
              </p>

              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <span className="font-bold text-amber-900 uppercase tracking-widest text-[10px] block">
                  Registros Vinculados Encontrados na Lixeira:
                </span>
                <ul className="space-y-1.5 pl-1">
                  {restoreModalData.depCheck.dependentItemsInTrash.map((dep) => (
                    <li key={dep.id} className="flex items-center gap-2 font-semibold text-amber-900">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{dep.tipo}: <strong>{dep.nome}</strong> ({dep.identificacao})</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="font-medium text-slate-700">
                Como deseja proceder com a restauração?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRestoreModalData(null)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              
              <button
                type="button"
                onClick={() => handleConfirmRestore(false)}
                disabled={restoring}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition cursor-pointer"
              >
                Restaurar Apenas Este Registro
              </button>

              <button
                type="button"
                onClick={() => handleConfirmRestore(true)}
                disabled={restoring}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-[#002244] rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Todos (Em Lote)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: Permanent Delete Confirmation ("EXCLUIR") */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center gap-3 border-b border-rose-100 pb-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900 uppercase tracking-tight">Exclusão Definitiva Irreversível</h3>
                <p className="text-xs text-rose-600 font-medium">Confirmação de Segurança Requerida</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Você está prestes a apagar permanentemente o registro de <strong>{deleteModalItem.tipo}</strong>:
              </p>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-900 font-bold space-y-0.5">
                <div>{deleteModalItem.nome}</div>
                <div className="text-[10px] font-mono text-rose-700 font-normal">ID/Ref: {deleteModalItem.identificacao}</div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-[11px] font-medium leading-normal">
                ⚠️ <strong>Atenção:</strong> Esta ação é permanente e NÃO poderá ser desfeita. Todos os metadados do documento serão removidos do banco de dados.
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block text-slate-700 font-bold text-[11px]">
                  Para confirmar, digite <span className="text-rose-600 uppercase font-black">EXCLUIR</span> abaixo:
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Digite EXCLUIR para confirmar"
                  className="w-full px-3.5 py-2.5 text-xs border border-rose-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono tracking-widest uppercase font-bold text-rose-900 bg-rose-50/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalItem(null);
                  setConfirmInput('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmHardDelete}
                disabled={confirmInput.trim().toUpperCase() !== 'EXCLUIR' || deleting}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  confirmInput.trim().toUpperCase() === 'EXCLUIR' && !deleting
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Excluindo...' : 'Confirmar Exclusão Definitiva'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
