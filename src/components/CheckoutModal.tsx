/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CheckoutService } from '../services/CheckoutService';
import { CheckCircle2, Zap, X, MessageSquare } from 'lucide-react';

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

  const handleOpenWhatsApp = () => {
    if (isMensal) {
      CheckoutService.openMonthlyCheckout();
    } else {
      CheckoutService.openAnnualCheckout();
    }
  };

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
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <MessageSquare className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <span className="text-[10px] font-black tracking-widest text-emerald-800 uppercase bg-emerald-100 px-2.5 py-1 rounded-md">
              Atendimento via WhatsApp
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
              <span>Ativação rápida pelo número (73) 99986-8104</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleOpenWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 px-6 rounded-2xl font-bold text-xs tracking-wider uppercase shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Enviar mensagem no WhatsApp (73 999868104)</span>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 px-6 rounded-2xl font-semibold text-xs transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
