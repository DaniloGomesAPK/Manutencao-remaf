/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, ShieldCheck, Terminal, Copy, Check } from 'lucide-react';

interface FirebaseConfigErrorProps {
  missingKeys: string[];
}

export const FirebaseConfigError: React.FC<FirebaseConfigErrorProps> = ({ missingKeys }) => {
  const [copied, setCopied] = React.useState(false);

  const envSample = missingKeys.map(k => `${k}=seu_valor_aqui`).join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(envSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-slate-800 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
              Configuração Firebase Necessária
            </h1>
            <p className="text-xs text-amber-400 font-semibold">
              Variáveis públicas de ambiente ausentes no ambiente de execução
            </p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4 text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            Por motivos de segurança, nenhuma chave de API ou credencial está fixa no código-fonte.
            Para conectar o aplicativo ao Firebase no Preview ou na Vercel, configure as variáveis públicas com prefixo <code className="text-amber-300 font-mono font-bold">VITE_</code>.
          </p>
          
          <div className="flex items-start gap-2 bg-emerald-950/40 border border-emerald-500/20 rounded-lg p-2.5 text-[11px] text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Segurança Garantida:</strong> As chaves com <code className="font-mono">VITE_FIREBASE_*</code> são públicas do Web SDK. As credenciais administrativas privadas (<code className="font-mono">FIREBASE_PRIVATE_KEY</code>) permanecem restritas ao backend.
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              Variáveis pendentes ({missingKeys.length})
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copiar Modelo</span>
                </>
              )}
            </button>
          </div>

          <pre className="bg-slate-950 border border-slate-700 rounded-lg p-3.5 text-[11px] font-mono text-amber-200 overflow-x-auto select-all">
            {missingKeys.map(k => (
              <div key={k} className="py-0.5">
                <span className="text-rose-400 font-bold">{k}</span>
                <span className="text-slate-500">=</span>
                <span className="text-slate-400 italic">&lt;obrigatorio&gt;</span>
              </div>
            ))}
          </pre>
        </div>

        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>Consulte o arquivo <code className="text-slate-200 font-mono">.env.example</code> para detalhes</span>
          <button
            onClick={() => window.location.reload()}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition text-xs"
          >
            Recarregar
          </button>
        </div>
      </div>
    </div>
  );
};
