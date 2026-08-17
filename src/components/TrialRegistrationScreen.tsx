/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MessageSquare, 
  Sparkles, 
  User, 
  Building2, 
  Mail, 
  Phone, 
  CheckCircle2, 
  Loader2, 
  ArrowRight, 
  Briefcase, 
  ChevronDown, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  Circle,
  RefreshCw,
  Send,
  AlertCircle,
  Clock
} from 'lucide-react';
import { TrialService, validarForcaSenha, RegistroAuthPendente } from '../services/TrialService';
import { PERFIL_EMPRESA_OPCOES } from '../constants/perfilEmpresa';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

interface TrialRegistrationScreenProps {
  onBack: () => void;
  onOpenLogin?: () => void;
  onAccessGranted?: (empresaId: string) => void;
  onTrialExpired?: () => void;
  usuarioPendenteVerificacao?: any;
}

export const TrialRegistrationScreen: React.FC<TrialRegistrationScreenProps> = ({
  onBack,
  onOpenLogin,
  onAccessGranted,
  onTrialExpired,
  usuarioPendenteVerificacao
}) => {
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [nomeOficina, setNomeOficina] = useState('');
  const [perfilEmpresa, setPerfilEmpresa] = useState('Oficina Mecânica');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // Estado da etapa de Verificação de E-mail
  const [aguardandoVerificacao, setAguardandoVerificacao] = useState(false);
  const [registroPendente, setRegistroPendente] = useState<RegistroAuthPendente | null>(null);
  const [verificandoEmail, setVerificandoEmail] = useState(false);
  const [reenviandoEmail, setReenviandoEmail] = useState(false);
  const [emailReenviadoSucesso, setEmailReenviadoSucesso] = useState(false);
  const [cooldownReenvio, setCooldownReenvio] = useState(0);

  // Inicializa se veio direcionado do login como usuário pendente de verificação
  useEffect(() => {
    if (usuarioPendenteVerificacao) {
      setRegistroPendente({
        user: usuarioPendenteVerificacao,
        email: (usuarioPendenteVerificacao.email || '').trim().toLowerCase(),
        nomeResponsavel: usuarioPendenteVerificacao.displayName || 'Administrador',
        nomeEmpresa: 'Minha Empresa',
        perfilEmpresa: 'Oficina Mecânica',
        whatsapp: ''
      });
      setEmail(usuarioPendenteVerificacao.email || '');
      setAguardandoVerificacao(true);
    }
  }, [usuarioPendenteVerificacao]);

  // Contador de cooldown para reenviar e-mail (30 segundos)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldownReenvio > 0) {
      timer = setTimeout(() => {
        setCooldownReenvio(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldownReenvio]);

  // Verificações individuais de força de senha para o indicador visual
  const reqMinimo8 = senha.length >= 8;
  const reqMaiusculaMinuscula = /[A-Z]/.test(senha) && /[a-z]/.test(senha);
  const reqNumero = /[0-9]/.test(senha);
  const reqEspecial = /[^A-Za-z0-9]/.test(senha);

  // ETAPA 1: Cadastrar no Firebase Auth e enviar e-mail de verificação
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
    if (!senha) {
      setErro('Por favor, crie uma senha.');
      return;
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    const validacaoForca = validarForcaSenha(senha);
    if (!validacaoForca.valida) {
      setErro(validacaoForca.mensagem || 'A senha não atende aos requisitos de segurança.');
      return;
    }

    setCarregando(true);

    try {
      // Cria a conta e dispara sendEmailVerification
      const pendente = await TrialService.iniciarCadastroTrial({
        nomeResponsavel: nomeResponsavel.trim(),
        nomeEmpresa: nomeOficina.trim(),
        perfilEmpresa: perfilEmpresa,
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.trim(),
        senha: senha
      });

      setRegistroPendente(pendente);
      setAguardandoVerificacao(true);
      setCooldownReenvio(30); // 30s de cooldown inicial
    } catch (err: any) {
      console.error('[TrialRegistrationScreen] Erro no cadastro:', err);
      setErro(getFriendlyErrorMessage(err, 'Não foi possível concluir seu cadastro no momento. Por favor, tente novamente.'));
    } finally {
      setCarregando(false);
    }
  };

  // ETAPA 2: "Já verifiquei meu e-mail" -> recarrega e ativa trial
  const handleVerificarEmailConfirmado = async () => {
    if (!registroPendente) return;
    setVerificandoEmail(true);
    setErro('');

    try {
      const { empresaId } = await TrialService.confirmarEmailEAtivarTrial(
        registroPendente.user,
        {
          nomeResponsavel: registroPendente.nomeResponsavel,
          nomeEmpresa: registroPendente.nomeEmpresa,
          perfilEmpresa: registroPendente.perfilEmpresa,
          whatsapp: registroPendente.whatsapp
        }
      );

      if (onAccessGranted) {
        onAccessGranted(empresaId);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error('[TrialRegistrationScreen] Erro na confirmação de e-mail:', err);
      if (err.message === 'EMAIL_NAO_CONFIRMADO' || err.message?.includes('EMAIL_NAO_VERIFICADO')) {
        setErro('Seu e-mail ainda não foi confirmado. Abra a caixa de entrada (ou pasta de spam/lixo eletrônico) e clique no link de confirmação enviado.');
      } else if (err.message === 'TRIAL_EXPIRADO' && onTrialExpired) {
        onTrialExpired();
      } else {
        setErro(getFriendlyErrorMessage(err, 'Não foi possível validar o e-mail no momento. Tente novamente em alguns segundos.'));
      }
    } finally {
      setVerificandoEmail(false);
    }
  };

  // Reenviar e-mail de confirmação
  const handleReenviarEmail = async () => {
    if (cooldownReenvio > 0 || reenviandoEmail || !registroPendente) return;
    setReenviandoEmail(true);
    setEmailReenviadoSucesso(false);
    setErro('');

    try {
      await TrialService.reenviarEmailVerificacao(registroPendente.user);
      setEmailReenviadoSucesso(true);
      setCooldownReenvio(60); // 60s cooldown para reenvios subsequentes
    } catch (err: any) {
      console.error('[TrialRegistrationScreen] Erro ao reenviar e-mail:', err);
      setErro('Limite de tentativas excedido ou falha no envio. Aguarde alguns instantes antes de tentar novamente.');
    } finally {
      setReenviandoEmail(false);
    }
  };

  const handleAtivarTrialWhatsApp = () => {
    const targetPhone = '5573999868104';
    const mensagem = `Olá! Gostaria de suporte para ativar meus 7 dias grátis no DG Orçamentos.

*Dados:*
• *Nome:* ${nomeResponsavel.trim() || registroPendente?.nomeResponsavel || 'Não informado'}
• *Empresa:* ${nomeOficina.trim() || registroPendente?.nomeEmpresa || 'Não informada'}
• *E-mail:* ${email.trim() || registroPendente?.email || 'Não informado'}
• *WhatsApp:* ${whatsapp.trim() || registroPendente?.whatsapp || 'Não informado'}`;

    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans pt-safe pb-safe pl-safe pr-safe">
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

      {/* Main Container */}
      <main className="w-full max-w-lg mx-auto px-6 py-8 flex-1 flex flex-col justify-center z-10">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          
          {aguardandoVerificacao ? (
            /* ========================================================================= */
            /* TELA DE VERIFICAÇÃO DE E-MAIL OBRIGATÓRIA (PASSOS 4 e 5)                  */
            /* ========================================================================= */
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto mb-2">
                  <Mail className="w-8 h-8 animate-bounce" />
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-500/30 text-sky-300 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Confirmação de Segurança Obrigatória</span>
                </div>

                <h2 className="text-2xl font-black text-white tracking-tight">
                  Confirme seu E-mail
                </h2>
                
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                  Enviamos um link de confirmação para o endereço:
                </p>
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl font-mono text-sm font-bold text-sky-300 break-all select-all">
                  {registroPendente?.email || email}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Abra sua caixa de entrada (ou pasta de spam/lixo eletrônico) e clique no link de validação para liberar seus 7 dias de avaliação.
                </p>
              </div>

              {erro && (
                <div className="p-3.5 bg-rose-950/80 border border-rose-800/80 rounded-2xl text-xs text-rose-300 font-medium flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{erro}</span>
                </div>
              )}

              {emailReenviadoSucesso && (
                <div className="p-3.5 bg-emerald-950/80 border border-emerald-800/80 rounded-2xl text-xs text-emerald-300 font-medium flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Novo e-mail de confirmação enviado com sucesso! Verifique sua caixa.</span>
                </div>
              )}

              {/* Ações */}
              <div className="space-y-3 pt-2">
                {/* Botão Principal: Já verifiquei meu e-mail */}
                <button
                  type="button"
                  onClick={handleVerificarEmailConfirmado}
                  disabled={verificandoEmail}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-4 px-6 rounded-2xl text-xs sm:text-sm tracking-wider uppercase shadow-xl shadow-emerald-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30 disabled:opacity-60"
                >
                  {verificandoEmail ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Checando Validação...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                      <span>Já verifiquei meu e-mail</span>
                      <ArrowRight className="w-4 h-4 text-emerald-300 ml-auto" />
                    </>
                  )}
                </button>

                {/* Botão Secundário: Reenviar e-mail de verificação com cooldown */}
                <button
                  type="button"
                  onClick={handleReenviarEmail}
                  disabled={cooldownReenvio > 0 || reenviandoEmail}
                  className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold py-3 px-4 rounded-2xl text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {reenviandoEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                      <span>Reenviando...</span>
                    </>
                  ) : cooldownReenvio > 0 ? (
                    <>
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span>Reenviar em {cooldownReenvio}s</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-sky-400" />
                      <span>Reenviar e-mail de verificação</span>
                    </>
                  )}
                </button>
              </div>

              {/* Suporte WhatsApp */}
              <div className="pt-4 border-t border-slate-800/80 text-center">
                <button
                  type="button"
                  onClick={handleAtivarTrialWhatsApp}
                  className="text-xs text-slate-400 hover:text-emerald-400 flex items-center justify-center gap-1.5 mx-auto transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Problemas com a verificação? Fale no WhatsApp</span>
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* FORMULÁRIO DE CADASTRO ORIGINAL                                           */
            /* ========================================================================= */
            <>
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

                {/* Campo 4: E-mail */}
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

                {/* Campo 5: WhatsApp de Contato */}
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

                {/* Campo 6: Crie sua Senha */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Crie sua Senha *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      required
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Sua senha de acesso"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer p-1"
                      tabIndex={-1}
                      aria-label={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {mostrarSenha ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Indicador Visual dos Requisitos de Senha */}
                  {senha.length > 0 && (
                    <div className="mt-2.5 p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2 text-[11px]">
                        {reqMinimo8 ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-3 h-3 text-slate-600 shrink-0" />
                        )}
                        <span className={reqMinimo8 ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                          Mínimo de 8 caracteres
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        {reqMaiusculaMinuscula ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-3 h-3 text-slate-600 shrink-0" />
                        )}
                        <span className={reqMaiusculaMinuscula ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                          Letra maiúscula e minúscula
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        {reqNumero ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-3 h-3 text-slate-600 shrink-0" />
                        )}
                        <span className={reqNumero ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                          Pelo menos um número
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        {reqEspecial ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-3 h-3 text-slate-600 shrink-0" />
                        )}
                        <span className={reqEspecial ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                          Caractere especial (ex: @, #, $, %)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Campo 7: Confirme sua Senha */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirme sua Senha *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={mostrarConfirmarSenha ? 'text' : 'password'}
                      required
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Repita sua senha"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer p-1"
                      tabIndex={-1}
                      aria-label={mostrarConfirmarSenha ? 'Ocultar confirmação de senha' : 'Exibir confirmação de senha'}
                    >
                      {mostrarConfirmarSenha ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {confirmarSenha.length > 0 && senha !== confirmarSenha && (
                    <p className="text-[11px] text-rose-400 font-medium mt-1">
                      As senhas não coincidem.
                    </p>
                  )}
                </div>

                {/* Botão de Cadastro */}
                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-4 px-6 rounded-2xl text-xs sm:text-sm tracking-wider uppercase shadow-xl shadow-emerald-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30 disabled:opacity-60"
                >
                  {carregando ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Cadastrando e enviando confirmação...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-emerald-300" />
                      <span>Criar Conta e Ativar 7 Dias Grátis</span>
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
                  <span>Acesso completo a todas as funcionalidades da plataforma</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Validação segura por e-mail com suporte direto</span>
                </div>
              </div>
            </>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 px-6 py-6 pb-safe text-center text-xs text-slate-500 z-10">
        © {new Date().getFullYear()} DG Gestão em Orçamentos. Todos os direitos reservados.
      </footer>
    </div>
  );
};
