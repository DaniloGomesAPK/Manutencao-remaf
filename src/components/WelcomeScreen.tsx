/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Wrench, Shield, CheckCircle2, ChevronRight, Sparkles, CreditCard, LogIn, Award } from 'lucide-react';

interface WelcomeScreenProps {
  onRegisterTrial: () => void;
  onOpenPlans: () => void;
  onOpenLogin: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onRegisterTrial,
  onOpenPlans,
  onOpenLogin
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-sky-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#003366]/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#003366] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-[#003366]/30 border border-sky-400/20">
            dG
          </div>
          <span className="font-black text-lg tracking-tight text-white">
            DG <span className="text-sky-400 font-normal">Gestão Automotiva</span>
          </span>
        </div>

        <button
          onClick={onOpenLogin}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
        >
          <LogIn className="w-4 h-4 text-sky-400" />
          <span>Já sou Cliente</span>
        </button>
      </header>

      {/* Hero Content */}
      <main className="w-full max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-950/80 border border-sky-500/30 text-sky-300 text-xs font-bold mb-6 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>Gestão Eficiente & Inteligente para sua Oficina</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
          DG Gestão Automotiva
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-slate-300 max-w-3xl font-normal leading-relaxed mb-10">
          A plataforma completa para gestão de oficinas mecânicas. Organize Ordens de Serviço, Clientes, Equipamentos, Financeiro e Relatórios Inteligentes em um único lugar.
        </p>

        {/* Action Buttons Grid (3 Botões das especificações) */}
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {/* Botão Principal: Experimentar Gratuitamente */}
          <button
            onClick={onRegisterTrial}
            className="group relative bg-[#003366] hover:bg-[#002244] border border-sky-400/30 text-white rounded-2xl p-5 text-left transition duration-200 shadow-xl shadow-[#003366]/20 flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">🚀</span>
              <ChevronRight className="w-5 h-5 text-sky-400 group-hover:translate-x-1 transition" />
            </div>
            <div>
              <div className="font-black text-base text-white tracking-tight">
                Experimentar Gratuitamente
              </div>
              <div className="text-xs text-sky-200 mt-1">
                Teste gratuitamente durante 3 dias.
              </div>
            </div>
          </button>

          {/* Botão Secundário: Assinar Agora */}
          <button
            onClick={onOpenPlans}
            className="group bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white rounded-2xl p-5 text-left transition duration-200 shadow-lg flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="w-5 h-5 text-sky-400" />
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition" />
            </div>
            <div>
              <div className="font-black text-base text-white tracking-tight">
                💳 Assinar Agora
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Conheça os planos.
              </div>
            </div>
          </button>
        </div>

        {/* Botão Discreto: Já sou Cliente */}
        <button
          onClick={onOpenLogin}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition py-2 px-4 rounded-xl hover:bg-slate-900/60"
        >
          <span>🔐 Já sou Cliente</span>
        </button>

        {/* Feature Highlights Bar */}
        <div className="mt-16 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-left w-full">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-300 font-medium">Ordens de Serviço</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-300 font-medium">Controle de Clientes</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-300 font-medium">Gestão Financeira</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-300 font-medium">Relatórios & Gráficos</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 px-6 py-6 text-center text-xs text-slate-500 z-10">
        © {new Date().getFullYear()} DG Gestão Automotiva. Todos os direitos reservados.
      </footer>
    </div>
  );
};
