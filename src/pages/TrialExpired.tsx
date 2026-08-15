/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Sparkles, 
  CreditCard, 
  MessageSquare, 
  Lock, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  LogOut, 
  Zap, 
  FileText, 
  Clock, 
  HeartHandshake 
} from 'lucide-react';

export interface TrialExpiredProps {
  onOpenPlans?: () => void;
  onSubscribeLink?: string;
  onContactSupport?: () => void;
  onLogout?: () => void;
  userEmail?: string;
}

export const TrialExpired: React.FC<TrialExpiredProps> = ({
  onOpenPlans,
  onSubscribeLink = '',
  onContactSupport,
  onLogout,
  userEmail
}) => {
  const handleSubscribe = () => {
    if (onSubscribeLink && onSubscribeLink.trim() !== '') {
      window.open(onSubscribeLink, '_blank');
      return;
    }
    if (onOpenPlans) {
      onOpenPlans();
      return;
    }
  };

  const handleWhatsAppSupport = () => {
    if (onContactSupport) {
      onContactSupport();
      return;
    }
    const targetPhone = '5573999868104';
    const mensagem = `Olá! Meu período de testes de 7 dias do DG Orçamentos chegou ao fim (${userEmail ? `Conta: ${userEmail}` : ''}) e gostaria de assinar o Plano Mensal para continuar aproveitando a plataforma!`;
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#FF6600]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#003366]/30 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-5xl mx-auto px-6 py-5 pt-safe-header flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-sky-400/20 flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-lg tracking-tight">DG</span>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-base sm:text-lg tracking-tight text-white">
              DG <span className="text-[#FF6600]">Orçamentos</span>
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Gestão de Orçamentos & Ordens de Serviço
            </span>
          </div>
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            id="btn-trial-expired-logout-header"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-700/50 text-xs font-bold text-slate-300 hover:text-rose-300 transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
            title="Encerrar sessão"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-400" />
            <span>Sair</span>
          </button>
        )}
      </header>

      {/* Main Center Container */}
      <main className="w-full max-w-xl mx-auto px-4 sm:px-6 py-4 flex-1 flex flex-col items-center justify-center text-center z-10">
        <div className="w-full bg-slate-900/95 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          
          {/* Header Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6600]/25 via-amber-500/20 to-orange-500/10 border border-[#FF6600]/40 text-[#FF6600] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#FF6600]/15">
            <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-300 text-xs font-black tracking-wide uppercase mb-3">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Período de 7 Dias Concluído</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Que bom ter você aqui! 🚀
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed mb-4 max-w-md mx-auto">
            Seus <strong>7 dias de teste gratuito</strong> chegaram ao fim. Esperamos que tenha tido uma ótima experiência organizando seus orçamentos e facilitando seu dia a dia!
          </p>

          {userEmail && (
            <div className="inline-block bg-slate-950/70 border border-slate-800/80 px-3 py-1 rounded-lg text-[11px] font-semibold text-slate-400 mb-5">
              Conta: <span className="text-slate-200">{userEmail}</span>
            </div>
          )}

          {/* Card Convite para o Plano Mensal */}
          <div className="bg-gradient-to-b from-slate-950/90 to-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 text-left mb-6 space-y-3 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FF6600]/20 flex items-center justify-center text-[#FF6600]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Assine o Plano Mensal</h3>
                  <p className="text-[11px] text-slate-400">Continue usando todas as ferramentas sem interrupções</p>
                </div>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                Acesso Total
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Ordens de Serviço e Orçamentos ilimitados</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Relatórios em PDF personalizados com sua marca</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Assistente inteligente de precificação</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Suporte dedicado direto no WhatsApp</span>
              </div>
            </div>

            {/* Aviso de Dados Seguros */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-slate-300 mt-2">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span><strong>Fique tranquilo:</strong> Todos os seus clientes, equipamentos e orçamentos cadastrados continuam 100% salvos e seguros. Ao assinar, tudo é reativado na hora!</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Botão Principal: Assinar Plano Mensal */}
            <button
              type="button"
              id="btn-assinar-plano-mensal"
              onClick={handleSubscribe}
              className="w-full bg-gradient-to-r from-[#FF6600] to-[#e05a00] hover:from-[#e05a00] hover:to-[#cc5200] text-white font-black py-4 px-6 rounded-2xl text-xs sm:text-sm tracking-wider uppercase shadow-xl shadow-[#FF6600]/25 flex items-center justify-center gap-2.5 transition-all duration-150 cursor-pointer active:scale-[0.98]"
            >
              <CreditCard className="w-4 h-4 text-white" />
              <span>Assinar Plano Mensal & Continuar</span>
              <ArrowRight className="w-4 h-4 ml-auto text-white/90" />
            </button>

            {/* Suporte WhatsApp */}
            <button
              type="button"
              id="btn-whatsapp-suporte-plano"
              onClick={handleWhatsAppSupport}
              className="w-full bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 font-bold py-3 px-4 rounded-2xl text-xs border border-emerald-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Dúvidas? Conversar com um consultor no WhatsApp</span>
            </button>

            {/* Botão de Sair (Logout) */}
            {onLogout && (
              <button
                type="button"
                id="btn-trial-expired-logout"
                onClick={onLogout}
                className="w-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white font-bold py-3 px-4 rounded-2xl text-xs border border-slate-800 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span>Sair da Conta</span>
              </button>
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900/80 px-6 py-4 text-center text-[11px] text-slate-500 z-10">
        © {new Date().getFullYear()} DG Gestão em Orçamentos. Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default TrialExpired;
