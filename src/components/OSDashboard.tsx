/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Settings, FileText, ChevronRight, PenTool, CheckCircle, AlertTriangle, AlertCircle, Calendar, Plus, Clipboard, Smartphone, Copy, Check, QrCode, Calculator, Trash2, ArrowLeft } from 'lucide-react';
import { OrdemDeServico } from '../types';
import { formatToBrazilianDate } from '../utils/dateFormatter';

interface OSDashboardProps {
  orders: OrdemDeServico[];
  onNewOS: () => void;
  onEditOS: (os: OrdemDeServico) => void;
  onViewPDF: (os: OrdemDeServico) => void;
  onDeleteOS?: (id: string) => void;
  onDuplicateOS?: (os: OrdemDeServico) => void;
  onBack?: () => void;
}

export default function OSDashboard({ orders, onNewOS, onEditOS, onViewPDF, onDeleteOS, onDuplicateOS, onBack }: OSDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCopyLink = () => {
    try {
      const currentUrl = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(currentUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = currentUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.warn("Failed to copy link:", err);
    }
  };

  const currentUrlStr = window.location.href;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(currentUrlStr)}`;

  // Search filtering
  const filteredOrders = orders.filter(o => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      o.numeroOS.toLowerCase().includes(term) ||
      o.equipamento.toLowerCase().includes(term) ||
      o.placa.toLowerCase().includes(term) ||
      o.tecnico.toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'Concluído':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          text: 'Concluído',
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        };
      case 'Pendente':
      default:
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          text: 'Pendente',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
        };
    }
  };

  return (
    <div id="os-dashboard-component" className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              id="btn-back-from-reports"
              type="button"
              onClick={onBack}
              className="p-2 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer text-slate-500"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-black text-[#003366] uppercase tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#FF6600]" />
              Relatórios e Ordens de Serviço
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Histórico completo de atendimentos, ordens de serviço e exportações em PDF.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Registros</span>
          <span className="text-2xl font-black text-[#003366] mt-0.5 block">{orders.length}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Concluídos</span>
          <span className="text-2xl font-black text-emerald-600 mt-0.5 block">
            {orders.filter(o => o.status === 'Concluído').length}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block">Pendentes</span>
          <span className="text-2xl font-black text-rose-600 mt-0.5 block">
            {orders.filter(o => !o.status || o.status === 'Pendente').length}
          </span>
        </div>
      </div>

      {/* Main launch bar CTA - Giant button for field technicians */}
      <button
        id="btn-new-os-cta"
        onClick={onNewOS}
        className="w-full h-16 flex items-center justify-center gap-3 bg-[#FF6600] hover:bg-[#E05500] text-white rounded-full font-black text-sm tracking-[0.12em] uppercase shadow-xl shadow-[#FF6600]/25 hover:shadow-2xl transition duration-200 cursor-pointer animate-in fade-in slide-in-from-top-4 duration-200"
      >
        <Plus className="w-5.5 h-5.5 text-white" />
        <span>Abrir Nova ordem de Serviço</span>
      </button>

      {/* Mobile Access QR & Link card */}
      <div className="bg-[#003366]/5 border border-[#003366]/15 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-center justify-between shadow-xs">
        <div className="flex items-start gap-4 flex-1">
          <div className="bg-[#003366] text-white p-3 rounded-full shrink-0">
            <Smartphone className="w-6 h-6 animate-bounce" style={{ animationDuration: '3s' }} />
          </div>
          <div className="space-y-1 text-left">
            <h4 className="font-bold text-[#003366] text-sm sm:text-base flex items-center gap-2">
              <span>Usando o Aplicativo no Celular</span>
              <span className="bg-[#FF6600] text-white text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide">
                Recomendado
              </span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              Abra este sistema no celular para tirar fotos diretamente pela câmera do celular do técnico, preencher vistorias em campo e fechar relatórios na hora de forma ágil!
            </p>
            
            {/* Action buttons list */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-350 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 active:scale-95 transition cursor-pointer shadow-xs"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowQR(!showQR)}
                className="flex items-center gap-1.5 bg-[#FF6600]/10 hover:bg-[#FF6600]/15 text-[#FF6600] border border-[#FF6600]/20 px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition cursor-pointer shadow-xs"
              >
                <QrCode className="w-3.5 h-3.5 text-[#FF6600]" />
                <span>{showQR ? 'Ocultar QR Code' : 'Escanear QR Code'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* QR Code reveal area */}
        {showQR && (
          <div className="flex flex-col items-center bg-white border border-slate-200 p-3 rounded-xl shadow-md animate-in fade-in zoom-in-95 duration-150 shrink-0">
            <img 
              src={qrCodeUrl} 
              alt="Acesso via QR Code" 
              className="w-[120px] h-[120px]"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">
              Aponte a Câmera
            </span>
          </div>
        )}
      </div>

      {/* Search and filter controls panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search trigger */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              id="search-orders-input"
              type="text"
              placeholder="Buscar por Protocolo, Equipamento, Placa ou Técnico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366]/40 transition duration-150"
            />
          </div>

          {/* Filter trigger */}
          <select
            id="filter-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#003366]/10 cursor-pointer"
          >
            <option value="All">Status: Todos</option>
            <option value="Concluído">Status: Concluídos</option>
            <option value="Pendente">Status: Pendentes</option>
          </select>
        </div>
      </div>

      {/* Service orders collection list */}
      <div className="space-y-3.5">
        <h3 className="text-[11px] font-black text-[#003366] tracking-widest uppercase mb-1">Histórico de Atendimentos</h3>
        
        {filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((os) => {
              const badge = getStatusStyle(os.status);
              
              return (
                <div 
                  id={`os-card-${os.id}`} 
                  key={os.id} 
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-[#003366]/35 transition duration-200 flex flex-col sm:flex-row justify-between gap-4"
                >
                  {/* Left block Info description */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#003366] leading-none tracking-tight">
                        {os.numeroOS}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 leading-none ${badge.bg}`}>
                        {badge.icon}
                        <span>{badge.text}</span>
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-base text-slate-800 leading-tight">
                        {os.equipamento}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Placa: <span className="font-mono text-slate-700 font-bold tracking-wider">{os.placa}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <PenTool className="w-3.5 h-3.5 text-slate-400" />
                        Téc: <span className="text-slate-600 font-medium">{os.tecnico}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatToBrazilianDate(os.dataAbertura)} às {os.horaAbertura}
                      </span>
                    </div>

                    {os.valorTotalOrcamento !== undefined && os.valorTotalOrcamento > 0 && (
                      <div className="pt-1.5">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-150 px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider">
                          <Calculator className="w-3 h-3 text-emerald-600" />
                          <span>Orçamento: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.valorTotalOrcamento)}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right block: Action elements */}
                  <div className="flex sm:flex-col justify-end gap-2.5 sm:self-center shrink-0 w-full sm:w-auto">
                    {/* View/Regenerate PDF */}
                    <button
                      id={`btn-view-pdf-${os.id}`}
                      onClick={() => onViewPDF(os)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#003366]/5 hover:bg-[#003366]/10 text-[#003366] py-2.5 px-5 rounded-full text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Ver Relatório</span>
                    </button>

                    {/* Edit/Continue OS */}
                    <button
                      id={`btn-edit-os-${os.id}`}
                      onClick={() => onEditOS(os)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#FF6600] hover:bg-[#E05500] text-white py-2.5 px-5 rounded-full text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer shadow-sm shadow-[#FF6600]/15"
                    >
                      <Settings className="w-4 h-4 text-white" />
                      <span>{os.status === 'Concluído' ? 'Editar OS' : 'Continuar Ficha'}</span>
                    </button>

                    {/* Duplicate OS */}
                    {onDuplicateOS && (
                      <button
                        id={`btn-duplicate-os-${os.id}`}
                        onClick={() => onDuplicateOS(os)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2.5 px-5 rounded-full text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer"
                        title="Duplicar esta OS (copiar orçamento para outro equipamento)"
                      >
                        <Copy className="w-4 h-4 text-slate-600" />
                        <span>Duplicar OS</span>
                      </button>
                    )}

                    {/* Delete OS */}
                    {onDeleteOS && (
                      <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                        {deletingId === os.id ? (
                          <>
                            <button
                              id={`btn-confirm-delete-${os.id}`}
                              onClick={() => {
                                onDeleteOS(os.id);
                                setDeletingId(null);
                              }}
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white py-2.5 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer shadow-xs border border-rose-600"
                            >
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>Sim, Excluir</span>
                            </button>
                            <button
                              id={`btn-cancel-delete-${os.id}`}
                              onClick={() => setDeletingId(null)}
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer border border-slate-200"
                            >
                              <span>Cancelar</span>
                            </button>
                          </>
                        ) : (
                          <button
                            id={`btn-delete-os-${os.id}`}
                            onClick={() => setDeletingId(os.id)}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 py-2.5 px-5 rounded-full text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer border border-rose-200"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Excluir</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-slate-200 border-dashed rounded-xl p-10 text-center text-slate-400 bg-white/50">
            <Clipboard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-500">Nenhum registro encontrado.</p>
            <p className="text-xs text-slate-400 mt-1">Refine seus filtros de busca ou clique no botão acima para abrir uma nova ordem de serviço.</p>
          </div>
        )}
      </div>

    </div>
  );
}
