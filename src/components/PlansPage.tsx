/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckoutService } from '../services/CheckoutService';
import { Check, ArrowLeft, Zap, Sparkles, ShieldCheck } from 'lucide-react';

interface PlansPageProps {
  onBack?: () => void;
}

export const PlansPage: React.FC<PlansPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-[#003366]/30 rounded-full blur-[140px] pointer-events-none" />

      {/* Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#003366] text-white flex items-center justify-center font-black text-xl shadow-lg border border-sky-400/20">
            dG
          </div>
          <span className="font-black text-lg tracking-tight text-white">
            DG <span className="text-sky-400 font-normal">Gestão Automotiva</span>
          </span>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span>Voltar</span>
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="w-full max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col items-center z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-500/30 text-sky-300 text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Planos Transparentes e Sem Surpresas</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Escolha o plano ideal para sua oficina
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Acesso completo a todos os recursos do sistema. Sem limitações de funcionalidades.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl items-stretch">
          
          {/* PLANO MENSAL */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between relative hover:border-slate-700 transition shadow-xl">
            <div>
              <div className="text-xs font-black tracking-widest text-slate-400 uppercase mb-2">
                PLANO MENSAL
              </div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black text-white">R$ 50,00</span>
                <span className="text-xs text-slate-400 font-medium">/ mês</span>
              </div>

              <div className="border-t border-slate-800/80 pt-6 mb-8">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
                  Inclui:
                </p>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Ordem de Serviço</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Clientes</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Equipamentos</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Financeiro</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Relatórios Inteligentes</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Atualizações</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Suporte</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => CheckoutService.openMonthlyCheckout()}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-6 rounded-2xl text-xs tracking-wider uppercase border border-slate-700 transition cursor-pointer"
            >
              Assinar Plano Mensal
            </button>
          </div>

          {/* PLANO ANUAL (MAIS VANTAJOSO) */}
          <div className="bg-slate-900 border-2 border-sky-500/80 rounded-3xl p-8 flex flex-col justify-between relative shadow-2xl shadow-sky-950/40 relative overflow-hidden">
            {/* Highlight Tag */}
            <div className="absolute top-0 right-0 bg-sky-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
              MAIS VANTAJOSO
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-black tracking-widest text-sky-400 uppercase mb-2">
                <Zap className="w-4 h-4 text-sky-400" />
                <span>PLANO ANUAL</span>
                <span className="bg-sky-950 border border-sky-500/40 text-sky-300 text-[10px] px-2 py-0.5 rounded-md">PIX</span>
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-black text-white">R$ 550,00</span>
                <span className="text-xs text-slate-400 font-medium">/ ano</span>
              </div>
              <p className="text-xs text-emerald-400 font-bold mb-6">
                Ganhe 1 mês grátis.
              </p>

              <div className="border-t border-slate-800 pt-6 mb-8">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
                  Benefícios Exclusivos:
                </p>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-center gap-3 font-semibold text-white">
                    <Check className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Todos os recursos do sistema</span>
                  </li>
                  <li className="flex items-center gap-3 font-semibold text-emerald-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Economia de R$ 50,00 no ano</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Prioridade em novidades e recursos</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-400">
                    <Check className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Pagamento único simplificado por PIX</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => CheckoutService.openAnnualCheckout()}
              className="w-full bg-[#003366] hover:bg-[#002244] text-white font-black py-4 px-6 rounded-2xl text-xs tracking-widest uppercase shadow-lg shadow-[#003366]/30 border border-sky-400/30 transition cursor-pointer"
            >
              Assinar Plano Anual
            </button>
          </div>

        </div>

        {/* Security Note */}
        <div className="mt-12 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Garantia de segurança e suporte prioritário para sua empresa</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 px-6 py-6 text-center text-xs text-slate-500 z-10">
        © {new Date().getFullYear()} DG Gestão Automotiva.
      </footer>
    </div>
  );
};
