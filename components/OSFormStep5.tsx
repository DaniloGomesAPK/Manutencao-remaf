/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, Save, FileText, Clipboard, CheckCircle2, Info, Calendar, Clock } from 'lucide-react';
import { OrdemDeServico, ItemOrcamento } from '../types';
import { useEmpresa } from '../contexts/EmpresaContext';
import { isCampoVisivel, getCampoLabel, getProtocoloLabel } from '../config/perfis';

interface OSFormStep5Props {
  initialData: Partial<OrdemDeServico>;
  onSave: (data: Partial<OrdemDeServico>) => void;
  onBack: () => void;
  onCancel?: () => void;
  onSaveDraftAndPDF?: (data: Partial<OrdemDeServico>) => void;
  isSaving?: boolean;
  onSaveProgress?: (data: Partial<OrdemDeServico>) => void;
}

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function OSFormStep5({ initialData, onSave, onBack, onCancel, onSaveDraftAndPDF, isSaving = false, onSaveProgress }: OSFormStep5Props) {
  const { perfilConfig } = useEmpresa();
  const [status, setStatus] = useState<'Pendente' | 'Concluído'>(initialData.status === 'Concluído' ? 'Concluído' : 'Pendente');
  const [descricaoAvaria, setDescricaoAvaria] = useState(initialData.descricaoAvaria || '');
  const [servicoExecutado, setServicoExecutado] = useState(initialData.servicoExecutado || '');
  const [observacoesFinais, setObservacoesFinais] = useState(initialData.observacoesFinais || '');
  const [dataConclusao, setDataConclusao] = useState<string>(initialData.dataConclusao || getTodayDateString());

  const getCurrentStep5Data = (): Partial<OrdemDeServico> => {
    return {
      descricaoAvaria: descricaoAvaria.trim(),
      servicoExecutado: servicoExecutado.trim(),
      observacoesFinais: observacoesFinais.trim(),
      status,
      dataConclusao: status === 'Concluído' ? (dataConclusao || getTodayDateString()) : undefined,
      horaConclusao: undefined,
      faseAtual: 5,
    };
  };

  const handleSaveClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onSaveProgress) {
      onSaveProgress(getCurrentStep5Data());
    }
  };

  const formatBudgetItemsText = (itemsList: ItemOrcamento[], includeQty: boolean = true) => {
    if (!itemsList || itemsList.length === 0) return '';
    return itemsList.map(item => includeQty ? `• ${item.quantidade}x ${item.descricao}` : `• ${item.descricao}`).join('\n');
  };

  const handleStatusChange = (newStatus: 'Pendente' | 'Concluído') => {
    setStatus(newStatus);

    if (newStatus === 'Concluído' && !dataConclusao) {
      setDataConclusao(getTodayDateString());
    }

    const budgetItems = initialData.orcamento || [];
    if (budgetItems.length === 0) return;

    if (newStatus === 'Pendente') {
      const formattedText = formatBudgetItemsText(budgetItems, false);
      if (descricaoAvaria.trim()) {
        if (window.confirm("Você já possui informações digitadas em 'Serviços Necessários'. Deseja sobrescrever com a lista de itens do orçamento?")) {
          setDescricaoAvaria(formattedText);
        }
      } else {
        setDescricaoAvaria(formattedText);
      }
    } else if (newStatus === 'Concluído') {
      const formattedText = formatBudgetItemsText(budgetItems, true);
      if (servicoExecutado.trim()) {
        if (window.confirm("Você já possui informações digitadas em 'Serviço Executado'. Deseja sobrescrever com a lista de itens do orçamento?")) {
          setServicoExecutado(formattedText);
        }
      } else {
        setServicoExecutado(formattedText);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      descricaoAvaria: descricaoAvaria.trim(),
      servicoExecutado: servicoExecutado.trim(),
      observacoesFinais: observacoesFinais.trim(),
      status,
      dataConclusao: status === 'Concluído' ? (dataConclusao || getTodayDateString()) : undefined,
      horaConclusao: undefined,
    });
  };

  const handleGeneratePDFDraft = () => {
    if (onSaveDraftAndPDF) {
      onSaveDraftAndPDF({
        descricaoAvaria: descricaoAvaria.trim(),
        servicoExecutado: servicoExecutado.trim(),
        observacoesFinais: observacoesFinais.trim(),
        status,
        dataConclusao: status === 'Concluído' ? (dataConclusao || getTodayDateString()) : undefined,
        horaConclusao: undefined,
      });
    }
  };

  const budgetCount = initialData.orcamento?.length || 0;

  return (
    <form id="step-5-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Short Context Grid */}
      <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
        {isCampoVisivel(perfilConfig, 'equipamento') && (
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">{getCampoLabel(perfilConfig, 'equipamento')}:</span>
            <span className="font-bold text-slate-800 text-sm truncate block">{initialData.equipamento || 'Não informado'}</span>
          </div>
        )}
        {isCampoVisivel(perfilConfig, 'placa') && (
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">{getCampoLabel(perfilConfig, 'placa', 'Placa')}:</span>
            <span className="font-bold text-slate-800 font-mono text-sm uppercase">{initialData.placa || 'Sem placa'}</span>
          </div>
        )}
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">{getProtocoloLabel(perfilConfig, 'Protocolo')}:</span>
          <span className="font-bold text-[#003366] font-mono text-sm">{initialData.numeroOS}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">{getCampoLabel(perfilConfig, 'cliente', 'Cliente')}:</span>
          <span className="font-bold text-slate-800 text-sm truncate block">{initialData.clienteNome || 'Não informado'}</span>
        </div>
      </div>

      {/* OS Status Selection Card */}
      <div className="bg-[#003366]/5 rounded-2xl p-5 border border-[#003366]/10 space-y-4">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-[#003366]" />
          <div>
            <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">Status do {getProtocoloLabel(perfilConfig, 'Protocolo')}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Escolha o status atual e defina a data de conclusão quando finalizado</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Status option Pendente */}
          <button
            id="btn-status-pendente"
            type="button"
            onClick={() => handleStatusChange('Pendente')}
            className={`p-4 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
              status === 'Pendente'
                ? 'bg-[#FF6600]/5 border-[#FF6600] ring-2 ring-[#FF6600]/10'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className={`p-1.5 rounded-full mt-0.5 ${status === 'Pendente' ? 'bg-[#FF6600] text-white' : 'bg-slate-100 text-slate-400'}`}>
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm block text-slate-800">Pendente</span>
              <span className="text-[10px] text-slate-500 mt-1 block leading-relaxed">
                Manutenção em andamento ou aguardando peças. A OS continuará aberta.
              </span>
            </div>
          </button>

          {/* Status option Concluído */}
          <button
            id="btn-status-concluido"
            type="button"
            onClick={() => handleStatusChange('Concluído')}
            className={`p-4 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
              status === 'Concluído'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/10'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className={`p-1.5 rounded-full mt-0.5 ${status === 'Concluído' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm block text-slate-800">Concluído</span>
              <span className="text-[10px] text-slate-500 mt-1 block leading-relaxed">
                Manutenção finalizada. Permite informar a data exata em que o serviço foi concluído.
              </span>
            </div>
          </button>
        </div>

        {/* Date Selection for Concluído status ONLY */}
        {status === 'Concluído' && (
          <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label htmlFor="input-data-conclusao" className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Data de Conclusão do Serviço</span>
              </label>
              <button
                type="button"
                onClick={() => setDataConclusao(getTodayDateString())}
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition cursor-pointer active:scale-95"
              >
                Definir Data de Hoje
              </button>
            </div>
            <div className="relative">
              <input
                type="date"
                id="input-data-conclusao"
                required={status === 'Concluído'}
                value={dataConclusao}
                onChange={(e) => setDataConclusao(e.target.value)}
                className="w-full sm:w-64 bg-slate-50 text-slate-800 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              * Escolha o dia em que o serviço foi finalizado (caso a manutenção tenha iniciado em uma data e terminado dias depois).
            </p>
          </div>
        )}
      </div>

      {/* Textareas row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Services Needed */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
            <Clipboard className="w-3.5 h-3.5 text-[#003366]" />
            Serviços Necessários
          </label>
          <textarea
            id="textarea-servicos-necessarios-step5"
            rows={5}
            placeholder="Descreva os serviços necessários, defeitos e problemas apresentados..."
            value={descricaoAvaria}
            onChange={(e) => setDescricaoAvaria(e.target.value)}
            className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
          />
          <p className="text-[9px] text-slate-400">
            {budgetCount > 0 
              ? `* Você pode preencher este campo automaticamente alterando o status para "Pendente"`
              : '* Adicione itens ao orçamento na Etapa 3 para habilitar o preenchimento automático.'}
          </p>
        </div>

        {/* Service Executed */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Serviço Executado
          </label>
          <textarea
            id="textarea-servico-executado-step5"
            rows={5}
            placeholder="Descreva detalhadamente o reparo que foi executado no equipamento..."
            value={servicoExecutado}
            onChange={(e) => setServicoExecutado(e.target.value)}
            className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition duration-200"
          />
          <p className="text-[9px] text-slate-400">
            {budgetCount > 0 
              ? `* Você pode preencher este campo automaticamente alterando o status para "Concluído"`
              : '* Adicione itens ao orçamento na Etapa 3 para habilitar o preenchimento automático.'}
          </p>
        </div>
      </div>

      {/* Observations finals */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-500 tracking-wider uppercase block">
          Observações Finais / Recomendações Técnicas
        </label>
        <textarea
          id="textarea-observacoes-finais-step5"
          rows={3}
          placeholder="Adicione observações adicionais ou recomendações de uso para o cliente..."
          value={observacoesFinais}
          onChange={(e) => setObservacoesFinais(e.target.value)}
          className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
        />
      </div>

      {/* Actions and navigation buttons */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 pt-6 border-t border-slate-200">
        {onCancel && (
          <button
            id="btn-cancel-step-5"
            type="button"
            disabled={isSaving}
            onClick={() => onCancel()}
            className="w-full sm:w-auto px-4 border border-rose-200 text-rose-600 bg-transparent rounded-xl py-2.5 font-bold tracking-wider text-xs uppercase hover:bg-rose-50 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>Cancelar</span>
          </button>
        )}

        <button
          id="btn-back-step-5"
          type="button"
          disabled={isSaving}
          onClick={onBack}
          className="w-full sm:w-auto px-4 border border-slate-200 text-slate-600 bg-transparent rounded-xl py-2.5 font-bold tracking-wider text-xs uppercase hover:bg-slate-50 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Voltar</span>
        </button>

        <div className="flex-1 hidden sm:block"></div>

        {onSaveProgress && (
          <button
            type="button"
            id="btn-save-progress-step5"
            onClick={handleSaveClick}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
        )}

        <button
          id="btn-generate-pdf-final"
          type="button"
          disabled={isSaving}
          onClick={handleGeneratePDFDraft}
          className="w-full sm:w-auto border border-[#003366] text-[#003366] bg-white rounded-xl py-2.5 px-4 font-bold tracking-wider text-xs uppercase hover:bg-[#003366]/5 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-[#003366] border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <FileText className="w-4 h-4 text-[#003366]" />
          )}
          <span>{isSaving ? 'Salvando...' : 'Gerar PDF Relatório'}</span>
        </button>

        <button
          id="btn-save-step-5"
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto bg-[#FF6600] text-white rounded-xl py-2.5 px-6 font-bold tracking-wider text-xs uppercase shadow-md hover:bg-[#E05500] flex items-center justify-center gap-2 transition duration-200 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{status === 'Concluído' ? 'Concluir OS' : 'Salvar OS (Pendente)'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
