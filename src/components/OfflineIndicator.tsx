/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useContext, useRef, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, WifiOff, Cloud, Clock, Database, Download, X } from 'lucide-react';
import { SyncContext } from '../contexts/SyncContext';

export default function OfflineIndicator() {
  const sync = useContext(SyncContext);
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  if (!sync) return null;

  const { isOnline, isSyncing, lastSyncedAt, pendingCount, syncAll } = sync;

  // Formatação amigável da data de sincronização
  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return 'Nunca sincronizado';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (_) {
      return isoString;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <div className="flex items-center gap-2">
        {/* PWA Install Button (se disponível) */}
        {installPrompt && (
          <button
            onClick={handleInstallClick}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#003366] text-white hover:bg-[#002244] text-xs font-semibold rounded-md shadow-xs transition"
            title="Instalar aplicativo PWA"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar PWA</span>
          </button>
        )}

        {/* Indicador de Status Discreto de Sincronização */}
        <button
          onClick={() => setShowPopover(!showPopover)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition border shadow-xs cursor-pointer ${
            !isOnline
              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              : isSyncing || pendingCount > 0
              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
          }`}
          title="Clique para ver detalhes da sincronização em nuvem"
        >
          {!isOnline ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
              </span>
              <span className="flex items-center gap-1">
                <span>🔴</span>
                <span>Offline</span>
              </span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span className="flex items-center gap-1">
                <span>🟡</span>
                <span>Sincronizando...</span>
              </span>
            </>
          ) : pendingCount > 0 ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="flex items-center gap-1">
                <span>🟡</span>
                <span>{pendingCount} Pendente{pendingCount > 1 ? 's' : ''}</span>
              </span>
            </>
          ) : (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span className="flex items-center gap-1">
                <span>🟢</span>
                <span>Sincronizado</span>
              </span>
            </>
          )}
        </button>
      </div>

      {/* Popover de Detalhes da Sincronização e Ações */}
      {showPopover && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-[#003366]" />
              <h4 className="font-bold text-sm text-slate-900">Status do Firestore Nuvem</h4>
            </div>
            <button
              onClick={() => setShowPopover(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Status do Estado Atual */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-medium">Estado da Conexão:</span>
              <span className="font-bold flex items-center gap-1.5">
                {!isOnline ? (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                    <span className="text-rose-700">Sem Internet</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Online (Conectado)</span>
                  </>
                )}
              </span>
            </div>

            {/* Última Sincronização */}
            <div className="flex items-start justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Última sincronização:</span>
              </div>
              <span className="font-semibold text-slate-800 text-right ml-2">
                {formatSyncTime(lastSyncedAt)}
              </span>
            </div>

            {/* Registros Pendentes */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span>Registros pendentes:</span>
              </div>
              <span className={`font-bold ${pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {pendingCount} registro{pendingCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Descrição Educativa de Arquitetura Híbrida */}
            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
              💡 Os dados estruturados são salvos simultaneamente no Firestore e no dispositivo local. Fotos, assinaturas e PDFs são mantidos no banco local para economia de banda.
            </p>

            {/* Botão Sincronizar Agora */}
            <button
              onClick={async () => {
                await syncAll();
              }}
              disabled={isSyncing || !isOnline}
              className={`w-[#100%] w-full py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                !isOnline
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : isSyncing
                  ? 'bg-amber-500 text-white cursor-wait'
                  : 'bg-[#003366] hover:bg-[#002244] text-white'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
