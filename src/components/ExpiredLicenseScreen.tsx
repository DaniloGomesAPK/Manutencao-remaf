/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, CreditCard, LogOut, Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import { StatusLicenca } from '../models/License';

interface ExpiredLicenseScreenProps {
  status?: StatusLicenca | string;
  onOpenPlans: () => void;
  onLogout: () => void;
}

export const ExpiredLicenseScreen: React.FC<ExpiredLicenseScreenProps> = ({
  status = 'expired',
  onOpenPlans,
  onLogout
}) => {
  const getStatusContent = () => {
    switch (status) {
      case 'blocked':
        return {
          icon: <Lock className="w-10 h-10 text-red-400" />,
          iconBg: 'bg-red-500/10 border-red-500/30',
          title: 'Sua conta encontra-se bloqueada.',
          desc: 'O acesso da sua empresa ao sistema foi suspenso ou bloqueado. Entre em contato com nosso suporte técnico para mais informações.',
          btnText: 'Sair da Conta',
          showPlansBtn: false
        };
      case 'cancelled':
        return {
          icon: <RefreshCw className="w-10 h-10 text-amber-400" />,
          iconBg: 'bg-amber-500/10 border-amber-500/30',
          title: 'Sua assinatura foi cancelada.',
          desc: 'A licença da sua empresa foi cancelada. Escolha um plano para reativar seu acesso e continuar gerenciando sua oficina.',
          btnText: 'Renovar Assinatura',
          showPlansBtn: true
        };
      case 'overdue':
        return {
          icon: <AlertTriangle className="w-10 h-10 text-orange-400" />,
          iconBg: 'bg-orange-500/10 border-orange-500/30',
          title: 'Pagamento pendente de regularização.',
          desc: 'Existe uma pendência financeira em sua conta. Escolha um plano para regularizar seu acesso e manter seu histórico seguro.',
          btnText: 'Regularizar Acesso',
          showPlansBtn: true
        };
      case 'expired':
      default:
        return {
          icon: <ShieldAlert className="w-10 h-10 text-amber-400" />,
          iconBg: 'bg-amber-500/10 border-amber-500/30',
          title: 'Seu período de avaliação terminou.',
          desc: 'Escolha um plano para continuar utilizando todos os recursos de Ordens de Serviço, Financeiro e Gestão de Clientes da sua oficina.',
          btnText: 'Conhecer Planos',
          showPlansBtn: true
        };
    }
  };

  const content = getStatusContent();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-600/10 rounded-full blur-[140px] pointer-events-none" />

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

      {/* Main Notice Container */}
      <main className="w-full max-w-lg mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center z-10">
        {/* Warning Icon */}
        <div className={`w-20 h-20 rounded-3xl ${content.iconBg} border flex items-center justify-center mb-6 shadow-xl`}>
          {content.icon}
        </div>

        {/* Status Message */}
        <h1 className="text-3xl font-black text-white tracking-tight mb-3">
          {content.title}
        </h1>
        <p className="text-slate-300 text-sm font-normal mb-8 leading-relaxed max-w-md">
          {content.desc}
        </p>

        {/* Action Button */}
        {content.showPlansBtn ? (
          <button
            onClick={onOpenPlans}
            className="w-full bg-[#003366] hover:bg-[#002244] text-white font-black py-4 px-6 rounded-2xl text-xs tracking-wider uppercase border border-sky-400/30 shadow-xl shadow-[#003366]/30 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-sky-400" />
            <span>{content.btnText}</span>
          </button>
        ) : (
          <button
            onClick={onLogout}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-4 px-6 rounded-2xl text-xs tracking-wider uppercase border border-slate-700 shadow-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Encerrar Sessão</span>
          </button>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 px-6 py-6 text-center text-xs text-slate-500 z-10">
        © {new Date().getFullYear()} DG Gestão Automotiva. Todos os direitos reservados.
      </footer>
    </div>
  );
};
