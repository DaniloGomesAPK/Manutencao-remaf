/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, CreditCard, MessageSquare, Lock, CheckCircle2, ShieldCheck, ArrowRight, LogOut } from 'lucide-react';

interface TrialExpiradoScreenProps {
  onOpenPlans: () => void;
  onContactSupport?: () => void;
  onLogout?: () => void;
}

export const TrialExpiradoScreen: React.FC<TrialExpiradoScreenProps> = ({
  onOpenPlans,
  onContactSupport,
  onLogout
}) => {
  const handleWhatsAppSupport = () => {
    if (onContactSupport) {
      onContactSupport();
      return;
    }
    const targetPhone = '5573999868104';
    const mensagem = 'Olá! Meu período de testes de 7 dias do DG Orçamentos expirou e gostaria de tirar dúvidas sobre a assinatura dos planos.';
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#003366]/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#003366] text-white flex items-center justify-center font-black text-xl shadow-lg border border-sky-400/20">
            dG
          </div>
          <span className="font-black text-lg tracking-tight text-white">
            DG <span className="text-sky-400 font-normal">Orçamentos</span>
          </span>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        )}
      </header>

      {/* Main Container - PWA & Mobile First Design */}
      <main className="w-full max-w-md mx-auto px-6 py-8 flex-1 flex flex-col items-center justify-center text-center z-10">
        <div className="w-full bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
          {/* Top Lock Badge */}
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/5">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-400 text-[11px] font-bold mb-4">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Período de Testes Finalizado</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
            Seus 7 dias de teste grátis expiraram
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed mb-6">
            Esperamos que tenha aproveitado o período de avaliação! Seus clientes, ordens de serviço, orçamentos e relatórios continuam <strong className="text-emerald-400 font-bold">100% salvos e seguros</strong> no banco de dados.
          </p>

          {/* Garantias dos Dados Salvos */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-left mb-6 space-y-2.5">
            <div className="flex items-start gap-2.5 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Dados Protegidos:</strong> Todo o seu histórico e cadastros permanecem intactos.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span><strong>Acesso Imediato:</strong> Ao assinar, seu acesso é liberado no mesmo instante.</span>
            </div>
          </div>

          {/* CTA Principal */}
          <button
            onClick={onOpenPlans}
            className="w-full bg-gradient-to-r from-[#003366] to-[#002244] hover:from-[#002244] hover:to-[#001122] text-white font-black py-4 px-6 rounded-2xl text-xs sm:text-sm tracking-wider uppercase border border-sky-400/40 shadow-xl shadow-[#003366]/40 flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99] mb-4"
          >
            <CreditCard className="w-4 h-4 text-sky-400" />
            <span>Escolher Plano e Liberar Acesso</span>
            <ArrowRight className="w-4 h-4 text-sky-400 ml-auto" />
          </button>

          {/* Botão Secundário - Suporte WhatsApp */}
          <button
            onClick={handleWhatsAppSupport}
            className="w-full bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 font-bold py-3.5 px-6 rounded-2xl text-xs border border-emerald-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Dúvidas ou Ajuda? Falar no WhatsApp</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 px-6 py-6 text-center text-xs text-slate-500 z-10">
        © {new Date().getFullYear()} DG Gestão em Orçamentos. Todos os direitos reservados.
      </footer>
    </div>
  );
};
