/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { LogService } from '../services/LogService';
import { AlertTriangle, RefreshCw, RefreshCw as ReloadIcon } from 'lucide-react';

interface Props {
  children: ReactNode;
  modulo?: string;
  componente?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] Erro no módulo ${this.props.modulo || 'Geral'}:`, error, errorInfo);
    
    // Log no LogService
    LogService.logError(
      this.props.modulo || 'Geral',
      this.props.componente || 'Desconhecido',
      error.message || String(error),
      errorInfo.componentStack || undefined,
      'Renderização de componente'
    );
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col items-center justify-center text-center max-w-lg mx-auto my-8 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="p-3 bg-rose-100 rounded-full text-rose-600">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Ops! Ocorreu um erro neste painel</h3>
            <p className="text-xs text-slate-600 max-w-sm">
              Houve uma falha inesperada no componente <strong className="text-rose-700 font-mono text-[10px]">{this.props.componente || 'principal'}</strong>. O restante da aplicação continua seguro para uso.
            </p>
          </div>
          {this.state.error && (
            <div className="w-full bg-rose-100/30 p-2.5 rounded-xl text-left border border-rose-200 font-mono text-[9px] text-rose-800 overflow-x-auto max-h-32">
              {this.state.error.message}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 bg-[#003366] hover:bg-[#002244] text-white font-bold text-[9px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Tentar Novamente</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-[9px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition cursor-pointer"
            >
              <ReloadIcon className="w-3 h-3" />
              <span>Recarregar Página</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
