/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CheckoutService } from '../services/CheckoutService';
import { Sparkles, CheckCircle2, Zap, Clock, ShieldCheck, LogOut } from 'lucide-react';

interface ActivationScreenProps {
  userEmail?: string;
  userName?: string;
  onStartTrial: () => Promise<void>;
  onLogout: () => void;
}

export const ActivationScreen: React.FC<ActivationScreenProps> = ({
  userEmail,
  userName,
  onStartTrial,
  onLogout
}) => {
  const [startingTrial, setStartingTrial] = useState(false);

  const handleTrial = async () => {
    setStartingTrial(true);
    try {
      await onStartTrial();
    } finally {
      setStartingTrial(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#003366]/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#003366] text-white flex items-center justify-center font-black text-xl shadow-lg border border-sky-400/20">
            dG
          </div>
          <span className="font-black text-lg tracking-tight text-white">
            DG <span className="text-sky-400 font-normal">Gestão Automotiva</span>
          </span>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          <span>Sair</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-4xl mx-auto px-6 py-10 flex-1 flex flex-col items-center justify-center z-10">
        {/* Success Header Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-6">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Conta criada com sucesso ({userEmail})</span>
        </div>

        {/* Titles */}
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight text-center mb-3">
          Sua conta foi criada.
        </h1>
        <p className="text-slate-300 text-sm sm:text-base font-normal text-center max-w-xl mb-10 leading-relaxed">
          Agora escolha como deseja utilizar o DG Gestão Automotiva.
        </p>

        {/* 3 Options Grid (ETAPA 6) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          
          {/* Opção 1: Teste Gratuito */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition shadow-xl relative">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sky-950 border border-sky-800/60 text-sky-400 flex items-center justify-center font-bold text-2xl mb-4">
                🧪
              </div>
              <h3 className="text-lg font-black text-white tracking-tight mb-1">
                Teste Gratuito
              </h3>
              <div className="inline-block bg-sky-950 text-sky-300 text-xs font-bold px-2.5 py-1 rounded-md mb-4 border border-sky-800/40">
                3 dias de acesso total
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Avalie todas as funcionalidades sem compromisso e sem necessidade de cartão de crédito.
              </p>
            </div>

            <button
              onClick={handleTrial}
              disabled={startingTrial}
              className="w-full bg-sky-600 hover:bg-sky-500 text-slate-950 font-black py-3.5 px-4 rounded-2xl text-xs tracking-wider uppercase transition cursor-pointer disabled:opacity-50"
            >
              {startingTrial ? 'Iniciando...' : 'Iniciar Teste'}
            </button>
          </div>

          {/* Opção 2: Plano Mensal */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition shadow-xl relative">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-950 border border-indigo-800/60 text-indigo-400 flex items-center justify-center font-bold text-xl mb-4">
                💳
              </div>
              <h3 className="text-lg font-black text-white tracking-tight mb-1">
                Plano Mensal
              </h3>
              <div className="text-2xl font-black text-white mb-2">
                R$ 50 <span className="text-xs font-normal text-slate-400">/mês</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Acesso completo sem fidelidade, cancele ou renove quando quiser.
              </p>
            </div>

            <button
              onClick={() => CheckoutService.openMonthlyCheckout()}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-4 rounded-2xl text-xs tracking-wider uppercase border border-slate-700 transition cursor-pointer"
            >
              Assinar
            </button>
          </div>

          {/* Opção 3: Plano Anual (PIX) */}
          <div className="bg-slate-900 border-2 border-sky-500/80 rounded-3xl p-6 flex flex-col justify-between shadow-2xl relative">
            <div className="absolute top-0 right-0 bg-sky-500 text-slate-950 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl">
              1 MÊS GRÁTIS
            </div>

            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800/60 text-emerald-400 flex items-center justify-center font-bold text-xl mb-4">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-black text-white tracking-tight mb-1">
                Plano Anual
              </h3>
              <div className="text-2xl font-black text-white mb-1">
                PIX R$ 550
              </div>
              <div className="text-xs font-bold text-emerald-400 mb-4">
                Ganhe 1 mês grátis
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Economia máxima e prioridade total na plataforma.
              </p>
            </div>

            <button
              onClick={() => CheckoutService.openAnnualCheckout()}
              className="w-full bg-[#003366] hover:bg-[#002244] text-white font-black py-3.5 px-4 rounded-2xl text-xs tracking-wider uppercase border border-sky-400/30 transition cursor-pointer"
            >
              Assinar
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 px-6 py-6 text-center text-xs text-slate-500 z-10">
        © {new Date().getFullYear()} DG Gestão Automotiva.
      </footer>
    </div>
  );
};
