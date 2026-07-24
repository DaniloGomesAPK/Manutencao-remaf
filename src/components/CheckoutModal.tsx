/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CheckoutService } from '../services/CheckoutService';
import { CheckCircle2, ShieldCheck, Zap, X } from 'lucide-react';

export const CheckoutModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'mensal' | 'anual'>('mensal');

  useEffect(() => {
    const unsubscribe = CheckoutService.subscribe((plan) => {
      setSelectedPlan(plan);
      setIsOpen(true);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const isMensal = selectedPlan === 'mensal';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative overflow-hidden">
        {/* Subtle Background Deco */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-[#003366]/5 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-100"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#003366]/10 text-[#003366] flex items-center justify-center font-bold">
            <Zap className="w-6 h-6 text-[#003366]" />
          </div>
          <div>
            <span className="text-[10px] font-black tracking-widest text-[#003366] uppercase bg-[#003366]/5 px-2.5 py-1 rounded-md">
              Processamento Cakto
            </span>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">
              {isMensal ? 'Plano Mensal - R$ 50,00' : 'Plano Anual - R$ 550,00 (PIX)'}
            </h3>
          </div>
        </div>

        {/* Plan Description */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 text-sm text-slate-600 space-y-2">
          <p className="font-medium text-slate-800">
            {isMensal
              ? 'Acesso irrestrito a todos os módulos do DG Gestão Automotiva cobrado mensalmente.'
              : 'Assinatura anual via PIX com desconto especial (1 mês grátis inclusos).'}
          </p>
          <ul className="space-y-1.5 pt-2 text-xs text-slate-700">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Ordem de Serviço, Clientes, Equipamentos & Financeiro</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Relatórios Inteligentes & Suporte Técnico Prioritário</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Atualizações contínuas sem custo adicional</span>
            </li>
          </ul>
        </div>

        {/* Status Message */}
        <div className="p-4 bg-amber-50/80 border border-amber-200/60 rounded-2xl mb-6 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-bold">Integração com Plataforma de Pagamentos</p>
            <p className="mt-0.5 text-amber-800/90">
              O checkout direto via Cakto estará disponível em breve. Sua conta e empresa já foram reservadas e serão ativadas automaticamente assim que o pagamento for confirmado.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="w-full bg-[#003366] text-white py-3.5 px-6 rounded-2xl font-bold text-xs tracking-wider uppercase shadow-lg shadow-[#003366]/15 hover:bg-[#002244] active:scale-[0.99] transition"
        >
          Entendido, Prosseguir
        </button>
      </div>
    </div>
  );
};
