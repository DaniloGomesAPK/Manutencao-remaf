/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  Calendar, 
  Building2, 
  CheckCircle, 
  CreditCard, 
  Users, 
  CloudLightning,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { LicenseContext } from '../contexts/LicenseContext';
import { AuthContext } from '../contexts/AuthContext';

interface LicenciamentoProps {
  onBack?: () => void;
}

export default function Licenciamento({ onBack }: LicenciamentoProps) {
  const licenseCtx = useContext(LicenseContext);
  const auth = useContext(AuthContext);

  const license = licenseCtx?.license;
  const daysRemaining = license?.dataExpiracao 
    ? Math.max(0, Math.ceil((new Date(license.dataExpiracao).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleRenew = () => {
    try {
      if (licenseCtx?.renovar) {
        licenseCtx.renovar(30);
        alert("Licença renovada com sucesso por mais 30 dias de acesso premium!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-5">
      
      {/* Page Title Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        {onBack && (
          <button
            id="btn-back-from-licensing"
            type="button"
            onClick={onBack}
            className="p-2 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer text-slate-500 mr-1"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-[#003366] uppercase tracking-tight flex items-center gap-2">
            Licenciamento & Assinatura
            <span className="text-[9px] bg-indigo-600 text-white font-black px-2 py-0.5 rounded-full tracking-wider">PREMIUM SaaS</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Gerencie o plano ativo da sua oficina, prazos de validade e recursos da conta SaaS multi-inquilino.
          </p>
        </div>
      </div>

      {/* Main License Detail Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div className="flex justify-between items-start border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Status do Plano</span>
              <h3 className="text-xl font-black text-[#003366] uppercase">
                {license?.plano || 'SaaS Versão Profissional'}
              </h3>
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Licença Ativa • Acesso Total Offline & Nuvem
              </p>
            </div>
            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 font-black text-center shrink-0">
              <span className="text-2xl block">{daysRemaining}</span>
              <span className="text-[9px] uppercase tracking-wider block font-bold text-slate-500">Dias Restantes</span>
            </div>
          </div>

          {/* Plan benefits checkmarks */}
          <div className="space-y-3.5">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recursos Inclusos no Plano</h4>
            
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
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-[11px] leading-relaxed text-slate-500">
            <span className="font-bold text-slate-700 block uppercase tracking-wider text-[9px] mb-1">Informações de Faturamento</span>
            As assinaturas deste sistema são protegidas de ponta-a-ponta. Seus dados cadastrais, informações de clientes e históricos de ordens de serviço ficam em segurança e integrados à nuvem SaaS para sincronia automatizada.
          </div>
        </div>

        {/* Sidebar Renew box */}
        <div className="bg-[#003366] text-white p-6 rounded-3xl border border-[#003366]/30 flex flex-col justify-between gap-6 shadow-md relative overflow-hidden">
          <div className="space-y-4 relative z-10">
            <div className="p-3 bg-white/10 w-fit rounded-2xl">
              <Sparkles className="w-6 h-6 text-[#FF6600]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-black text-base uppercase tracking-tight">Precisa de mais tempo?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Estenda sua licença profissional instantaneamente e continue aproveitando todos os recursos avançados sem interrupções.
              </p>
            </div>
            
            <div className="border-t border-white/10 pt-4 space-y-1">
              <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider block">Data de Expiração</span>
              <span className="font-mono text-sm font-bold text-[#FF6600]">
                {license?.dataExpiracao ? new Date(license.dataExpiracao).toLocaleDateString('pt-BR') : 'Sem dados'}
              </span>
            </div>
          </div>

          <button
            onClick={handleRenew}
            className="w-full bg-[#FF6600] hover:bg-[#E05500] text-white py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition duration-150 cursor-pointer shadow-md shadow-[#FF6600]/15 flex items-center justify-center gap-2 relative z-10"
          >
            <RefreshCw className="w-4 h-4 text-white shrink-0" />
            <span>Renovar por 30 Dias</span>
          </button>

          <div className="absolute right-0 bottom-0 top-0 w-1/2 bg-gradient-to-l from-white/5 to-transparent pointer-events-none"></div>
        </div>

      </div>

    </div>
  );
}
