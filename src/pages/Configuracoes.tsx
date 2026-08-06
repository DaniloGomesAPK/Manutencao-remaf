/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext, useState, useEffect } from 'react';
import { 
  Settings, 
  RefreshCw, 
  Database, 
  Trash2, 
  Wifi, 
  WifiOff, 
  Sparkles,
  HelpCircle,
  Check,
  Terminal,
  CloudLightning
} from 'lucide-react';
import { SyncContext } from '../contexts/SyncContext';
import { AuthContext } from '../contexts/AuthContext';
import { LogService, ErrorLog } from '../services/LogService';
import { UIHeader, UICard, UIButton, UIBadge } from '../components/ui/UIComponents';

interface ConfiguracoesProps {
  onBack?: () => void;
}

export default function Configuracoes({ onBack }: ConfiguracoesProps) {
  const syncCtx = useContext(SyncContext);
  const auth = useContext(AuthContext);
  const activeUser = auth?.currentUser;

  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [syncingLogs, setSyncingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

  useEffect(() => {
    setLogs(LogService.getLogs());
  }, []);

  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('remaf_active_draft_v1');
    } catch (_) {
      return false;
    }
  });

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  React.useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const handleSync = async () => {
    try {
      if (syncCtx?.syncAll) {
        await syncCtx.syncAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearDraft = () => {
    if (window.confirm("Deseja mesmo descartar todos os rascunhos de ordens de serviço salvos localmente neste navegador? Esta ação não pode ser desfeita.")) {
      try {
        localStorage.removeItem('remaf_active_draft_v1');
        setHasDraft(false);
        alert("Rascunhos descartados com sucesso.");
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleClearLogs = () => {
    if (window.confirm("Deseja mesmo limpar todos os registros de erros salvos localmente? Esta ação não pode ser desfeita.")) {
      try {
        LogService.clearLogs();
        setLogs([]);
        alert("Logs de erro limpos com sucesso.");
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSyncLogs = async () => {
    setSyncingLogs(true);
    try {
      const res = await LogService.syncWithFirebase();
      if (res.success) {
        alert(`Sincronização de logs concluída! ${res.count} registros sincronizados com sucesso.`);
        setLogs(LogService.getLogs());
      } else {
        alert("Falha ao sincronizar logs com a nuvem.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingLogs(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-5">
      
      {/* Standardized Page Header */}
      <UIHeader
        title="Configurações do Sistema"
        subtitle="Gerencie conexões na nuvem, logs do banco de dados local, sincronizações offline e cache de rascunhos."
        icon={Settings}
        onBack={onBack}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Sync & Connectivity Card */}
        <UICard className="flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#003366] uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#FF6600]" />
              Sincronização de Dados
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              O sistema sincroniza suas Ordens de Serviço, Clientes e Equipamentos automaticamente com a nuvem SaaS quando há conexão ativa. Você também pode forçar uma sincronia manual.
            </p>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Conectividade:</span>
                <span className={`font-bold flex items-center gap-1.5 uppercase tracking-wider text-[10px] ${isOnline ? 'text-emerald-600' : 'text-rose-500 animate-pulse'}`}>
                  {isOnline ? (
                    <>
                      <Wifi className="w-3.5 h-3.5" />
                      <span>Online (Disponível)</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5" />
                      <span>Offline (Modo de Voo)</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Última Sincronização:</span>
                <span className="font-mono text-slate-700 font-bold">Automatizada (Tempo Real)</span>
              </div>
            </div>
          </div>

          <UIButton
            onClick={handleSync}
            loading={syncCtx?.isSyncing}
            className="w-full mt-4"
            icon={RefreshCw}
          >
            {syncCtx?.isSyncing ? 'Sincronizando...' : 'Sincronizar com Nuvem Agora'}
          </UIButton>
        </UICard>

        {/* Database & Tenant Isolation Card */}
        <UICard className="flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#003366] uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              Isolamento e Segurança (IndexedDB)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Sua oficina opera dentro de um ambiente de dados segregado. Todas as informações do banco local IndexedDB são criptografadas e vinculadas exclusivamente à sua empresa.
            </p>

            <div className="bg-emerald-50 border border-emerald-200/80 p-4 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Seu ID de Empresa (Inquilino):</span>
                <span className="font-mono text-[#003366] font-bold">{activeUser?.empresaId || 'Sem Inquilino'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Nome do Técnico:</span>
                <span className="text-slate-700 font-bold">{activeUser?.nome || 'Operador Padrão'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Isolamento Multi-Tenant:</span>
                <UIBadge status="success" label="Ativo" />
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-semibold leading-normal flex items-start gap-1.5 mt-4">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            Em conformidade com as diretrizes de segurança SaaS empresarial para resiliência offline completa.
          </div>
        </UICard>

        {/* Saved Draft Cache Controller */}
        <UICard className="md:col-span-2">
          <h3 className="text-xs font-bold text-[#003366] uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Rascunhos e Cache Local do Preenchimento
          </h3>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200/80 rounded-xl">
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-900 uppercase">
                {hasDraft ? "Existe um rascunho ativo salvo no seu navegador" : "Nenhum rascunho de preenchimento ativo"}
              </p>
              <p className="text-xs text-amber-800/90 font-medium max-w-xl leading-relaxed">
                O preenchimento do wizard de Ordem de Serviço possui salvamento em tempo real resiliente. Se a aba for fechada sem querer, o formulário recupera o progresso automaticamente.
              </p>
            </div>

            {hasDraft && (
              <UIButton
                variant="danger"
                size="sm"
                onClick={handleClearDraft}
                icon={Trash2}
                className="shrink-0"
              >
                Descartar Rascunho
              </UIButton>
            )}
          </div>
        </UICard>

        {/* Diagnostic Logs Panel */}
        <UICard className="md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-[#003366] uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#FF6600]" />
                Logs de Erros e Diagnósticos de Sistema (PWA Offline)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Registra incidentes e falhas de runtime detectadas pelas barreiras de erro (ErrorBoundary) para auditoria e manutenção técnica.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {logs.length > 0 && (
                <UIButton
                  variant="danger"
                  size="sm"
                  onClick={handleClearLogs}
                  icon={Trash2}
                >
                  Limpar Logs
                </UIButton>
              )}
              <UIButton
                variant="primary"
                size="sm"
                onClick={handleSyncLogs}
                loading={syncingLogs}
                icon={CloudLightning}
              >
                {syncingLogs ? 'Sincronizando...' : 'Sincronizar Cloud'}
              </UIButton>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col items-center justify-center space-y-2">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-full">
                <Check className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800">Sistema 100% Saudável</p>
                <p className="text-xs text-slate-500 font-medium max-w-sm">
                  Nenhum erro de execução ou falha foi detectada nas últimas sessões. Todas as leituras e gravações ocorreram perfeitamente.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {logs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                return (
                  <div 
                    key={log.id} 
                    className={`p-3.5 rounded-xl border transition text-left cursor-pointer ${
                      isSelected 
                        ? 'bg-[#003366]/5 border-[#003366]' 
                        : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200'
                    }`}
                    onClick={() => setSelectedLog(isSelected ? null : log)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <UIBadge status="error" label={log.modulo || 'Geral'} />
                        <span className="text-xs font-bold text-slate-700">
                          {log.componente || 'Desconhecido'}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">
                        {log.data} às {log.hora}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-mono mt-2 bg-white/75 p-2 rounded-lg border border-slate-200">
                      {log.mensagem}
                    </p>

                    {log.acaoUsuario && (
                      <p className="text-[10px] text-slate-500 font-medium mt-1.5 flex items-center gap-1">
                        <span className="font-bold text-slate-400">Ação do Usuário:</span>
                        {log.acaoUsuario}
                      </p>
                    )}

                    {isSelected && log.stackTrace && (
                      <div className="mt-3 p-3 bg-slate-900 text-rose-400 font-mono text-[10px] rounded-lg overflow-x-auto border border-slate-800 max-h-48 leading-relaxed whitespace-pre-wrap">
                        {log.stackTrace}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </UICard>

      </div>

    </div>
  );
}

