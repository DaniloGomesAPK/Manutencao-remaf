/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Sparkles, User, Building2, Mail, Phone, CheckCircle2 } from 'lucide-react';

interface TrialRegistrationScreenProps {
  onBack: () => void;
  onOpenLogin?: () => void;
}

export const TrialRegistrationScreen: React.FC<TrialRegistrationScreenProps> = ({
  onBack,
  onOpenLogin
}) => {
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [nomeOficina, setNomeOficina] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [erro, setErro] = useState('');

  const handleAtivarTrialWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!nomeResponsavel.trim()) {
      setErro('Por favor, informe o Nome do Responsável.');
      return;
    }
    if (!nomeOficina.trim()) {
      setErro('Por favor, informe o Nome da Oficina.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErro('Por favor, informe um E-mail válido.');
      return;
    }
    if (!whatsapp.trim()) {
      setErro('Por favor, informe o WhatsApp de Contato.');
      return;
    }

    const targetPhone = '5573999868104';
    const mensagem = `Olá! Gostaria de ativar meus 3 dias grátis no DG Gestão Automotiva.

*Dados para Ativação:*
• *Nome do Responsável:* ${nomeResponsavel.trim()}
• *Nome da Oficina:* ${nomeOficina.trim()}
• *E-mail:* ${email.trim().toLowerCase()}
• *WhatsApp de Contato:* ${whatsapp.trim()}`;

    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-sky-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#003366]/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-sky-400" />
          <span>Voltar ao Início</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#003366] text-white flex items-center justify-center font-black text-lg shadow-lg shadow-[#003366]/30 border border-sky-400/20">
            dG
          </div>
          <span className="font-black text-base tracking-tight text-white hidden sm:inline">
            DG <span className="text-sky-400 font-normal">Gestão Automotiva</span>
          </span>
        </div>

        {onOpenLogin ? (
          <button
            type="button"
            onClick={onOpenLogin}
            className="text-xs font-bold text-slate-400 hover:text-white transition py-2 px-3 rounded-xl hover:bg-slate-900 cursor-pointer"
          >
            Já sou Cliente
          </button>
        ) : (
          <div className="w-20" />
        )}
      </header>

      {/* Form Container */}
      <main className="w-full max-w-lg mx-auto px-6 py-8 flex-1 flex flex-col justify-center z-10">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>3 Dias Grátis • Sem Compromisso</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Ativar Teste Gratuito
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
            Preencha os dados abaixo para ativarmos seu período de testes de 3 dias no sistema.
          </p>

          {erro && (
            <div className="mb-5 p-3.5 bg-rose-950/80 border border-rose-800/80 rounded-2xl text-xs text-rose-300 font-medium animate-in fade-in">
              {erro}
            </div>
          )}

          <form onSubmit={handleAtivarTrialWhatsApp} className="space-y-4">
            {/* Campo 1: Nome do Responsável */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Nome do Responsável *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={nomeResponsavel}
                  onChange={(e) => setNomeResponsavel(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>
            </div>

            {/* Campo 2: Nome da Oficina */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Nome da Oficina *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={nomeOficina}
                  onChange={(e) => setNomeOficina(e.target.value)}
                  placeholder="Ex: Auto Mecânica Silva"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>
            </div>

            {/* Campo 3: E-mail */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                E-mail *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: contato@oficina.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>
            </div>

            {/* Campo 4: WhatsApp de Contato */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                WhatsApp de Contato *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ex: (73) 99999-9999"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>
            </div>

            {/* Botão Final */}
            <button
              type="submit"
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-6 rounded-2xl text-xs sm:text-sm tracking-wider uppercase shadow-xl shadow-emerald-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30"
            >
              <MessageSquare className="w-5 h-5 shrink-0" />
              <span>Ativar meus 3 dias grátis via WhatsApp</span>
            </button>
          </form>

          {/* Benefits list */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Acesso imediato a todas as funcionalidades da plataforma</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Ativação simplificada com suporte humano direto</span>
            </div>
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
