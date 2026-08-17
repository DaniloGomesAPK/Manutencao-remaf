/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  CheckCircle, 
  CreditCard,
  Zap
} from 'lucide-react';
import { LicenseContext } from '../contexts/LicenseContext';
import { AuthContext } from '../contexts/AuthContext';
import { CheckoutService } from '../services/CheckoutService';
import { UIHeader, UICard, UIButton, UIBadge } from '../components/ui/UIComponents';

interface LicenciamentoProps {
  onBack?: () => void;
}

export default function Licenciamento({ onBack }: LicenciamentoProps) {
  const licenseCtx = useContext(LicenseContext);
  const authCtx = useContext(AuthContext);

  const license = licenseCtx?.license;
  const userEmail = authCtx?.currentUser?.email || license?.email;
  const daysRemaining = license?.dataExpiracao 
    ? Math.max(0, Math.ceil((new Date(license.dataExpiracao).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleAssinarMensal = () => {
    CheckoutService.openMonthlyCheckout(userEmail);
  };

  const handleAssinarAnual = () => {
    CheckoutService.openAnnualCheckout(userEmail);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-5">
      
      {/* Standardized Header */}
      <UIHeader
        title="Licenciamento & Assinatura"
        subtitle="Gerencie o plano ativo da sua oficina, prazos de validade e recursos da conta SaaS multi-inquilino."
        icon={ShieldCheck}
        onBack={onBack}
        badge={<UIBadge status="info" label="PREMIUM SaaS" />}
      />

      {/* Main License Detail Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <UICard className="md:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-100 pb-5 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status do Plano</span>
              <h3 className="text-xl font-bold text-[#003366] uppercase">
                {license?.plano || 'SaaS Versão Profissional'}
              </h3>
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Licença Ativa • Acesso Total Offline & Nuvem
              </p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[#003366] font-bold text-center shrink-0 w-full sm:w-auto">
              <span className="text-2xl block">{daysRemaining}</span>
              <span className="text-[10px] uppercase tracking-wider block font-bold text-slate-500">Dias Restantes</span>
            </div>
          </div>

          {/* Plan benefits checkmarks */}
          <div className="space-y-3.5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recursos Inclusos no Plano</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-slate-800 font-bold block">Ordens de Serviço Ilimitadas</strong>
                  <span className="text-slate-500">Crie, salve e exporte quantos relatórios precisar.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-slate-800 font-bold block">Banco Local Isolado</strong>
                  <span className="text-slate-500">Privacidade total com dados segregados por inquilino.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-slate-800 font-bold block">Operação 100% Offline</strong>
                  <span className="text-slate-500">Continue trabalhando mesmo em garagens sem internet.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-slate-800 font-bold block">Central de Precificação Inteligente</strong>
                  <span className="text-slate-500">Cálculo de margem de lucro e formação de preços automática.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick billing statement info */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs leading-relaxed text-slate-500 font-medium">
            <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px] mb-1">Informações de Faturamento</span>
            As assinaturas deste sistema são processadas com segurança. Após a confirmação do pagamento pelo gateway, sua licença e recursos são atualizados automaticamente na plataforma.
          </div>
        </UICard>

        {/* Sidebar Upgrade / Renewal Box */}
        <div className="bg-[#003366] text-white p-6 rounded-2xl border border-[#003366]/30 flex flex-col justify-between gap-6 shadow-xs relative overflow-hidden">
          <div className="space-y-4 relative z-10">
            <div className="p-3 bg-white/10 w-fit rounded-xl">
              <Sparkles className="w-6 h-6 text-[#FF6600]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-base uppercase tracking-tight">Assinar ou Renovar</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Garanta acesso contínuo aos recursos avançados de emissão de OS, precificação e sincronização em nuvem.
              </p>
            </div>
            
            <div className="border-t border-white/10 pt-4 space-y-1">
              <span className="text-[10px] text-white/60 uppercase font-bold tracking-wider block">Data de Expiração Atual</span>
              <span className="font-mono text-sm font-bold text-[#FF6600]">
                {license?.dataExpiracao ? new Date(license.dataExpiracao).toLocaleDateString('pt-BR') : 'Sem dados'}
              </span>
            </div>
          </div>

          <div className="space-y-3 relative z-10">
            <UIButton
              onClick={handleAssinarMensal}
              className="w-full bg-[#FF6600] hover:bg-[#E05500] text-white py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer shadow-xs flex items-center justify-center gap-2 border-none"
              icon={CreditCard}
            >
              Plano Mensal (R$ 30/mês)
            </UIButton>

            <UIButton
              onClick={handleAssinarAnual}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer shadow-xs flex items-center justify-center gap-2 border-none"
              icon={Zap}
            >
              Plano Anual (PIX R$ 300)
            </UIButton>
          </div>

          <div className="absolute right-0 bottom-0 top-0 w-1/2 bg-gradient-to-l from-white/5 to-transparent pointer-events-none"></div>
        </div>

      </div>

    </div>
  );
}
