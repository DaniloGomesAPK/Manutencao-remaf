/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Sparkles, User, Building2, Mail, Phone, CheckCircle2, Loader2, ArrowRight, Briefcase, ChevronDown } from 'lucide-react';
import { TrialService } from '../services/TrialService';
import { PERFIL_EMPRESA_OPCOES } from '../constants/perfilEmpresa';

interface TrialRegistrationScreenProps {
  onBack: () => void;
  onOpenLogin?: () => void;
  onAccessGranted?: (empresaId: string) => void;
  onTrialExpired?: () => void;
}

export const TrialRegistrationScreen: React.FC<TrialRegistrationScreenProps> = ({
  onBack,
  onOpenLogin,
  onAccessGranted,
  onTrialExpired
}) => {
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [nomeOficina, setNomeOficina] = useState('');
  const [perfilEmpresa, setPerfilEmpresa] = useState('Oficina Mecânica');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const handleCadastrarTrialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!nomeResponsavel.trim()) {
      setErro('Por favor, informe o Nome do Responsável.');
      return;
    }
    if (!nomeOficina.trim()) {
      setErro('Por favor, informe o Nome da Empresa.');
      return;
    }
    if (!perfilEmpresa) {
      setErro('Por favor, selecione o Perfil da Empresa.');
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

    setCarregando(true);

    try {
      const { empresaId } = await TrialService.cadastrarEmpresaTrial({
        nomeResponsavel: nomeResponsavel.trim(),
        nomeEmpresa: nomeOficina.trim(),
        perfilEmpresa: perfilEmpresa,
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.trim()
      });

      if (onAccessGranted) {
        onAccessGranted(empresaId);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error('[TrialRegistrationScreen] Erro no cadastro:', err);
      if (err.message === 'TRIAL_EXPIRADO' && onTrialExpired) {
        onTrialExpired();
        return;
      }
      setErro(err.message || 'Erro ao realizar o cadastro. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const handleAtivarTrialWhatsApp = () => {
    const targetPhone = '5573999868104';
    const mensagem = `Olá! Gostaria de suporte para ativar meus 7 dias grátis no DG Orçamentos.

*Dados:*
• *Nome:* ${nomeResponsavel.trim() || 'Não informado'}
• *Empresa:* ${nomeOficina.trim() || 'Não informada'}
• *E-mail:* ${email.trim() || 'Não informado'}
• *WhatsApp:* ${whatsapp.trim() || 'Não informado'}`;

    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-sky-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#003366]/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 pt-safe-header flex items-center justify-between z-10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-sky-400" />
          <span>Voltar ao Início</span>
        </button>

        <div className="flex items-center gap-3">
          <img 
            src="/icon/icon_256x256.png" 
            alt="DG Logo" 
            className="w-9 h-9 rounded-xl object-contain shadow-lg border border-sky-400/20" 
          />
          <span className="font-black text-base tracking-tight text-white hidden sm:inline">
            DG <span className="text-sky-400 font-normal">Orçamentos</span>
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
            <span>7 Dias Grátis • Sem Compromisso</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Ativar Teste Gratuito
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
            Preencha os dados abaixo para ativarmos seu período de testes de 7 dias no sistema.
          </p>

          {erro && (
            <div className="mb-5 p-3.5 bg-rose-950/80 border border-rose-800/80 rounded-2xl text-xs text-rose-300 font-medium animate-in fade-in">
              {erro}
            </div>
          )}

          <form onSubmit={handleCadastrarTrialSubmit} className="space-y-4">
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

            {/* Campo 2: Nome da Empresa */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Nome da Empresa *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={nomeOficina}
                  onChange={(e) => setNomeOficina(e.target.value)}
                  placeholder="Ex: Empresa Modelo LTDA"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>
            </div>

            {/* Campo 3: Perfil da Empresa */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Perfil da Empresa *
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  required
                  value={perfilEmpresa}
                  onChange={(e) => setPerfilEmpresa(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-10 py-3 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition appearance-none cursor-pointer"
                >
                  <option value="" disabled className="bg-slate-900 text-slate-500">
                    Selecione o Perfil da Empresa...
                  </option>
                  {PERFIL_EMPRESA_OPCOES.map((opcao) => (
                    <option key={opcao} value={opcao} className="bg-slate-900 text-white">
                      {opcao}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  placeholder="Ex: contato@empresa.com"
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

            {/* Botão de Ativação Automática Imediata */}
            <button
              type="submit"
              disabled={carregando}
              className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-4 px-6 rounded-2xl text-xs sm:text-sm tracking-wider uppercase shadow-xl shadow-emerald-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30 disabled:opacity-60"
            >
              {carregando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Ativando Período de Testes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-emerald-300" />
                  <span>Ativar 7 Dias Grátis Agora</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300 ml-auto" />
                </>
              )}
            </button>
          </form>

          {/* Link secundário opcional WhatsApp */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleAtivarTrialWhatsApp}
              className="text-xs text-slate-400 hover:text-emerald-400 flex items-center justify-center gap-1.5 mx-auto transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>Dúvidas? Ativar via Suporte no WhatsApp</span>
            </button>
          </div>

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
        © {new Date().getFullYear()} DG Gestão em Orçamentos. Todos os direitos reservados.
      </footer>
    </div>
  );
};
