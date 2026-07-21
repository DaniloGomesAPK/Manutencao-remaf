/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  History, 
  Download, 
  FileCheck, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  Database
} from 'lucide-react';
import { Servico } from '../types';
import { ImportExportService, ImportPreviewResult, ImportSummary } from '../services/ImportExportService';
import { runAutomatedDiagnostics, TestResult } from '../utils/testSuite';

interface ImportExportManagerProps {
  isOpen: boolean;
  onClose: () => void;
  servicos: Servico[];
  aliquotaEfetiva: number;
  saveServico: (s: Servico) => Promise<Servico>;
  reloadServicos: () => Promise<void>;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  userName: string;
  empresaId: string;
}

export default function ImportExportManager({
  isOpen,
  onClose,
  servicos,
  aliquotaEfetiva,
  saveServico,
  reloadServicos,
  showNotification,
  userName,
  empresaId
}: ImportExportManagerProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [duplicateDecision, setDuplicateDecision] = useState<'update' | 'ignore' | 'create_new'>('update');
  const [applyToAll, setApplyToAll] = useState(true);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportSummary[]>([]);
  const [diagnostics, setDiagnostics] = useState<TestResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const HISTORY_KEY = `remaf_import_history_${empresaId}`;

  // Load history from localStorage on mount/activeTab change
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setImportHistory(JSON.parse(stored));
      } else {
        setImportHistory([]);
      }
    } catch (_) {
      setImportHistory([]);
    }
  }, [isOpen, activeTab, empresaId]);

  if (!isOpen) return null;

  // --- File Drag and Drop handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.xlsx')) {
      await handleFileSelected(droppedFile);
    } else {
      showNotification('Por favor, envie apenas arquivos de planilha Excel (.xlsx)', 'error');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await handleFileSelected(selectedFile);
    }
  };

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);
    setPreviewResult(null);
    try {
      const result = await ImportExportService.processarUploadExcel(selectedFile, servicos);
      setPreviewResult(result);
      showNotification('Planilha analisada com sucesso! Prossiga com a validação.', 'success');
    } catch (err: any) {
      setFile(null);
      showNotification(err.message || 'Erro ao processar planilha Excel.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Trigger actual saving ---
  const handleConfirmImport = async () => {
    if (!previewResult || !file) return;

    setIsImporting(true);
    setImportProgress(10); // Simulated baseline progress

    try {
      // Create a function wrapper with progress logging/updating
      const totalToProcess = previewResult.validRecords.length;
      let processed = 0;

      const progressInterval = setInterval(() => {
        setImportProgress((p) => {
          if (p >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return p + 10;
        });
      }, 150);

      const trackingSave = async (s: Servico) => {
        const saved = await saveServico(s);
        processed++;
        const calcPercent = Math.min(10 + Math.floor((processed / totalToProcess) * 80), 90);
        setImportProgress(calcPercent);
        return saved;
      };

      const result = await ImportExportService.salvarImportacao(
        previewResult.validRecords,
        duplicateDecision,
        aliquotaEfetiva,
        servicos,
        trackingSave
      );

      clearInterval(progressInterval);
      setImportProgress(100);

      // Save to import history
      const now = new Date();
      const newHistoryItem: ImportSummary = {
        date: now.toLocaleDateString('pt-BR'),
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        user: userName,
        filename: file.name,
        imported: result.imported,
        updated: result.updated,
        errorsCount: previewResult.invalidCount
      };

      const updatedHistory = [newHistoryItem, ...importHistory];
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      setImportHistory(updatedHistory);

      await reloadServicos();

      showNotification(
        `Sucesso: ${result.imported} criados, ${result.updated} atualizados, ${previewResult.invalidCount} erros ignorados.`,
        'success'
      );

      // Clean up states
      setFile(null);
      setPreviewResult(null);
      setActiveTab('history'); // View history to confirm results
    } catch (err: any) {
      showNotification('Falha durante a importação física dos registros: ' + err.message, 'error');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      ImportExportService.downloadModeloExcel();
      showNotification('Modelo Excel oficial baixado com sucesso!', 'success');
    } catch (_) {
      showNotification('Erro ao gerar modelo Excel.', 'error');
    }
  };

  const handleExportData = () => {
    try {
      if (servicos.length === 0) {
        showNotification('O banco de serviços está vazio. Não há nada para exportar.', 'info');
        return;
      }
      ImportExportService.exportarServicos(servicos);
      showNotification(`Exportado ${servicos.length} serviços para Excel com sucesso!`, 'success');
    } catch (_) {
      showNotification('Erro ao exportar banco de serviços.', 'error');
    }
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    setDiagnostics(null);
    try {
      const res = await runAutomatedDiagnostics();
      setDiagnostics(res);
      showNotification('Todos os testes de conformidade foram executados!', 'success');
    } catch (_) {
      showNotification('Erro ao executar testes automáticos.', 'error');
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#003366] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Database className="w-5 h-5 text-[#FF6600]" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight">Gerenciador de Importação & Exportação</h3>
              <p className="text-[10px] text-slate-200 font-medium">Cadastre centenas de serviços em massa, exporte planilhas e analise logs</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action and Tab bar */}
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex gap-1 bg-slate-200/60 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'import' ? 'bg-[#003366] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Importar / Exportar
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'history' ? 'bg-[#003366] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Histórico
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-[10px] uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Baixar Modelo Excel
            </button>
            <button
              onClick={handleExportData}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5 text-slate-500" />
              Exportar Serviços
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'import' ? (
            <div className="space-y-6">
              {!previewResult ? (
                /* FILE CHOOSE SCREEN */
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-10 text-center transition flex flex-col items-center justify-center min-h-[250px] cursor-pointer ${
                    isDragging 
                      ? 'border-[#FF6600] bg-[#FF6600]/5 text-[#FF6600]' 
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50 text-slate-500'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx"
                    className="hidden" 
                  />
                  {isLoading ? (
                    <div className="animate-in fade-in duration-200">
                      <RefreshCw className="w-12 h-12 text-[#003366] animate-spin mx-auto mb-4" />
                      <h4 className="text-sm font-extrabold text-slate-700">Analisando Arquivo...</h4>
                      <p className="text-xs text-slate-400 mt-1">Carregando linhas e mapeando colunas inteligentes de precificação</p>
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-300">
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm w-fit mx-auto mb-4">
                        <Upload className="w-8 h-8 text-[#FF6600]" />
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-700">Arraste a planilha de serviços para cá</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        Ou clique para buscar no seu computador. Aceitamos apenas arquivos de planilhas Excel formatados no padrão .xlsx.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* PREVIEW SCREEN */
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-indigo-500" />
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-700">Visualização prévia do arquivo</h4>
                        <p className="text-[10px] text-slate-400 font-bold">{file?.name} ({file ? (file.size / 1024).toFixed(1) : 0} KB)</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreviewResult(null);
                      }}
                      className="text-xs font-bold text-rose-500 hover:text-rose-700 border border-rose-100 bg-rose-50 px-2.5 py-1.5 rounded-lg transition"
                    >
                      Remover Arquivo
                    </button>
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Linhas Encontradas</span>
                      <p className="text-lg font-black text-slate-700 mt-0.5">{previewResult.totalRows}</p>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Serviços Novos</span>
                      <p className="text-lg font-black text-emerald-700 mt-0.5">{previewResult.newCount}</p>
                    </div>
                    <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-2xl">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 font-semibold">Já Existentes (Duplicados)</span>
                      <p className="text-lg font-black text-indigo-700 mt-0.5">{previewResult.duplicateCount}</p>
                    </div>
                    <div className={`p-3.5 rounded-2xl border ${
                      previewResult.invalidCount > 0 
                        ? 'bg-rose-50 border-rose-200 text-rose-700' 
                        : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}>
                      <span className="text-[9px] font-bold uppercase tracking-wider">Registros Inválidos</span>
                      <p className="text-lg font-black mt-0.5">{previewResult.invalidCount}</p>
                    </div>
                  </div>

                  {/* DUPLICATE HANDLING PANEL (if there are duplicate entries) */}
                  {previewResult.duplicateCount > 0 && (
                    <div className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <div className="space-y-2">
                          <h5 className="text-xs font-extrabold text-indigo-900 uppercase tracking-tight">Detectamos duplicidades de serviços</h5>
                          <p className="text-[11px] text-indigo-700">
                            Encontramos {previewResult.duplicateCount} nomes de serviços que já constam no seu banco de dados atual. Como deseja processá-los?
                          </p>
                          
                          <div className="flex flex-col sm:flex-row gap-3 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                              <input 
                                type="radio" 
                                name="duplicate" 
                                checked={duplicateDecision === 'update'} 
                                onChange={() => setDuplicateDecision('update')}
                                className="accent-[#003366] w-4 h-4" 
                              />
                              Atualizar serviço existente
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                              <input 
                                type="radio" 
                                name="duplicate" 
                                checked={duplicateDecision === 'ignore'} 
                                onChange={() => setDuplicateDecision('ignore')}
                                className="accent-[#003366] w-4 h-4" 
                              />
                              Ignorar este registro
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                              <input 
                                type="radio" 
                                name="duplicate" 
                                checked={duplicateDecision === 'create_new'} 
                                onChange={() => setDuplicateDecision('create_new')}
                                className="accent-[#003366] w-4 h-4" 
                              />
                              Criar como novo serviço
                            </label>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-indigo-100/60 mt-2">
                            <input 
                              type="checkbox" 
                              id="applyAll" 
                              checked={applyToAll} 
                              onChange={(e) => setApplyToAll(e.target.checked)}
                              className="accent-[#003366] rounded-xs"
                            />
                            <label htmlFor="applyAll" className="text-[10px] text-indigo-900 font-extrabold cursor-pointer">
                              Aplicar esta decisão para todos os serviços duplicados
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VALIDATION ERRORS PANEL (if there are validation errors) */}
                  {previewResult.errors.length > 0 && (
                    <div className="border border-rose-200 rounded-2xl bg-white overflow-hidden">
                      <div className="bg-rose-50 px-4 py-2.5 border-b border-rose-100 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <h5 className="text-[11px] font-black uppercase tracking-wider text-rose-800">
                          Inconsistências encontradas ({previewResult.errors.length}) - Registros inválidos serão ignorados
                        </h5>
                      </div>
                      <div className="max-h-[160px] overflow-y-auto divide-y divide-rose-100 text-[11px]">
                        {previewResult.errors.map((err, i) => (
                          <div key={i} className="px-4 py-2 flex items-start gap-4 text-slate-600">
                            <span className="font-mono font-bold bg-rose-50 text-rose-600 border border-rose-100 rounded-sm px-1.5 py-0.2 shrink-0">
                              Linha {err.row}
                            </span>
                            <span className="font-extrabold text-slate-800 shrink-0 max-w-[140px] truncate">{err.column}:</span>
                            <p className="flex-1 text-rose-700 font-medium">{err.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PREVIEW RECORDS DATA TABLE */}
                  {previewResult.validRecords.length > 0 && (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                        <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                          Serviços Prontos para Importação ({previewResult.validRecords.length})
                        </h5>
                      </div>
                      <div className="max-h-[220px] overflow-y-auto overflow-x-auto text-left">
                        <table className="w-full text-xs font-semibold">
                          <thead>
                            <tr className="bg-slate-50/50 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-100">
                              <th className="px-4 py-2">Nome</th>
                              <th className="px-4 py-2">Categoria</th>
                              <th className="px-4 py-2 text-center">Insumos</th>
                              <th className="px-4 py-2 text-right">M.O</th>
                              <th className="px-4 py-2 text-right">Fixo</th>
                              <th className="px-4 py-2 text-center">Situação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-600">
                            {previewResult.validRecords.map((rec, i) => (
                              <tr key={i} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 font-bold text-slate-800 truncate max-w-[200px]">{rec.nome}</td>
                                <td className="px-4 py-2.5">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded-sm uppercase text-[9px] font-black text-slate-500">
                                    {rec.categoria}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-center font-mono">
                                  {rec.materiais.length} {rec.materiais.length === 1 ? 'item' : 'itens'}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono">
                                  {rec.tempoMedioExecucao}h à R$ {rec.valorHora.toFixed(2)}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono">
                                  R$ {rec.custosFixos.toFixed(2)}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  {rec.isDuplicate ? (
                                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[9px] font-black">
                                      {duplicateDecision === 'update' ? 'Atualizar' : duplicateDecision === 'ignore' ? 'Ignorar' : 'Novo Clone'}
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-black">
                                      Novo Registro
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* PROGRESS BAR (Importing phase) */}
                  {isImporting && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-[#003366] animate-spin" />
                          Gravando serviços no banco IndexedDB offline...
                        </span>
                        <span className="font-mono text-[#003366]">{importProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-[#FF6600] to-[#003366] h-full rounded-full transition-all duration-300"
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions buttons */}
                  {!isImporting && (
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={() => {
                          setFile(null);
                          setPreviewResult(null);
                        }}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirmImport}
                        disabled={previewResult.validRecords.length === 0}
                        className="px-6 py-2.5 bg-[#FF6600] hover:bg-[#E05500] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer disabled:opacity-40 flex items-center gap-2"
                      >
                        <FileCheck className="w-4 h-4" />
                        Confirmar Importação ({previewResult.validRecords.length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* HISTORY TAB SCREEN */
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <History className="w-5 h-5 text-[#FF6600]" />
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-700">Histórico de importações locais</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">Toda alteração em massa é auditada localmente</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Deseja realmente limpar todo o histórico de logs de importações? Os serviços cadastrados continuarão no banco.')) {
                      localStorage.removeItem(HISTORY_KEY);
                      setImportHistory([]);
                      showNotification('Logs de importação esvaziados.', 'success');
                    }
                  }}
                  className="px-3 py-1 text-[9px] font-black uppercase tracking-wider text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-100 rounded-lg transition"
                >
                  Limpar Logs
                </button>
              </div>

              {importHistory.length === 0 ? (
                <div className="py-16 text-center text-slate-400 max-w-sm mx-auto">
                  <History className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-600">Nenhum registro encontrado</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Todas as importações de planilhas realizadas na oficina aparecerão aqui para verificação.</p>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                  <div className="max-h-[350px] overflow-y-auto">
                    <table className="w-full text-left text-xs font-semibold border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-100 font-black">
                          <th className="px-4 py-2.5">Data / Hora</th>
                          <th className="px-4 py-2.5">Usuário</th>
                          <th className="px-4 py-2.5">Arquivo</th>
                          <th className="px-4 py-2.5 text-center">Novos</th>
                          <th className="px-4 py-2.5 text-center font-bold">Atualizados</th>
                          <th className="px-4 py-2.5 text-center font-bold text-rose-500">Erros</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        {importHistory.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                              {item.date} <span className="block text-[9px] font-sans font-medium text-slate-400 mt-0.5">{item.time}</span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">{item.user}</td>
                            <td className="px-4 py-3 font-mono text-[10px] max-w-[180px] truncate" title={item.filename}>
                              {item.filename}
                            </td>
                            <td className="px-4 py-3 text-center text-emerald-600 font-extrabold">{item.imported}</td>
                            <td className="px-4 py-3 text-center text-indigo-600 font-extrabold">{item.updated}</td>
                            <td className={`px-4 py-3 text-center font-bold ${item.errorsCount > 0 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-400'}`}>
                              {item.errorsCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DIAGNOSTICS SUITE SECTION (PART 11) */}
              <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FF6600]" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#003366]">Testes de Conformidade (Parte 11)</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Validar cálculos, duplicidades e reimportação programática</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRunTests}
                    disabled={isRunningTests}
                    className="px-4 py-1.5 bg-[#003366] hover:bg-[#002244] text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    {isRunningTests ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Executando...
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-3.5 h-3.5" />
                        Executar Testes Automáticos
                      </>
                    )}
                  </button>
                </div>

                {diagnostics && (
                  <div className="grid grid-cols-1 gap-2.5 pt-2 border-t border-slate-200/60 animate-in fade-in duration-300">
                    {diagnostics.map((res, i) => (
                      <div key={i} className="flex items-start gap-3 bg-white border border-slate-100 p-3 rounded-xl">
                        {res.success ? (
                          <span className="p-1 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 mt-0.5">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="p-1 bg-rose-50 text-rose-600 rounded-lg shrink-0 mt-0.5">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <div className="text-[11px] leading-tight">
                          <p className="font-extrabold text-slate-700">{res.name}</p>
                          <p className="text-slate-500 font-medium mt-0.5">{res.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info banner */}
        <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex items-center justify-between text-[10px] text-slate-400 font-medium shrink-0">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6600]" />
            <span>Alíquota tributária ativa de sua empresa: <strong className="text-slate-600 font-extrabold">{aliquotaEfetiva}%</strong></span>
          </div>
          <span className="font-mono">Remaf Local IndexedDB Sandbox active</span>
        </div>

      </div>
    </div>
  );
}
