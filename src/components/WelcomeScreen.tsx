/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Rocket, CreditCard, Sparkles, LogIn } from 'lucide-react';
import homemBanner from '../assets/images/homembanner.png';

interface WelcomeScreenProps {
  onRegisterTrial: () => void;
  onOpenPlans: () => void;
  onOpenLogin: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onRegisterTrial,
  onOpenPlans,
  onOpenLogin
}) => {
  return (
    <div className="min-h-screen bg-[#031533] text-white flex flex-col justify-between relative overflow-x-hidden font-sans select-none">
      {/* Background Radial Light Glow Effects */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          background: 'radial-gradient(circle at 80% 40%, rgba(13, 71, 140, 0.45) 0%, rgba(3, 21, 51, 0.95) 70%, #031533 100%)'
        }}
      />
      <div className="absolute top-1/4 right-10 w-[450px] h-[450px] bg-sky-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 pt-4 pb-2 flex items-center justify-end z-20">
        <button
          onClick={onOpenLogin}
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-950/60 border border-sky-500/30 text-xs sm:text-sm font-bold text-sky-200 hover:text-white hover:bg-sky-900/80 hover:border-sky-400 transition duration-200 shadow-md backdrop-blur-md cursor-pointer"
        >
          <LogIn className="w-4 h-4 text-sky-400" />
          <span>Já sou Cliente</span>
        </button>
      </header>

      {/* Main Hero Container */}
      <main className="w-full max-w-7xl mx-auto px-6 pt-1 md:pt-2 pb-6 md:pb-8 flex-1 flex flex-col justify-center z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 md:gap-12">
          
          {/* MOBILE ONLY TOP HERO IMAGE (<768px) */}
          <div className="block md:hidden w-full flex flex-col items-center justify-center relative mb-2">
            <div className="relative w-64 sm:w-72 h-64 sm:h-72 flex items-center justify-center">
              {/* Soft Radial Glow behind the man */}
              <div className="absolute inset-0 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />
              <img
                src={homemBanner}
                alt="DG Orçamentos - Especialista em Gestão de Orçamentos"
                className="w-full h-full object-contain object-top drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] relative z-10 bg-transparent border-none"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Sparkle Decoration Mobile */}
            <div className="absolute bottom-1 right-12 text-sky-300 animate-pulse z-20">
              <Sparkles className="w-6 h-6 text-sky-200" />
            </div>
          </div>

          {/* LEFT CONTENT COLUMN (Desktop aligned left, Mobile centered) */}
          <div className="w-full md:w-[55%] lg:w-[53%] flex flex-col items-center md:items-start text-center md:text-left space-y-6 lg:space-y-7">
            
            {/* Main App Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.25rem] font-extrabold text-white tracking-tight leading-[1.05]">
              DG Orçamentos
            </h1>

            {/* Subtitle Pill Badge with 4-pointed Sparkle Star Icon */}
            <div className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full border border-sky-400/35 bg-sky-950/40 text-sky-200 text-xs sm:text-base md:text-lg font-medium tracking-wide backdrop-blur-md shadow-inner">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-sky-300 shrink-0" />
              <span>Orçamentos inteligentes. Gestão completa.</span>
            </div>

            {/* Main Description Text */}
            <p className="text-base sm:text-xl md:text-2xl lg:text-[1.75rem] text-slate-200 font-normal leading-relaxed max-w-xl lg:max-w-2xl">
              A plataforma para gestão eficiente de orçamentos e serviços.
            </p>

            {/* Action Buttons Stack */}
            <div className="w-full max-w-md lg:max-w-lg space-y-4 pt-2">
              {/* Button 1: Experimentar Gratuitamente */}
              <button
                onClick={onRegisterTrial}
                type="button"
                className="w-full bg-[#1db954] hover:bg-[#189e47] active:bg-[#14833b] text-white font-bold py-3.5 sm:py-4.5 px-6 sm:px-8 rounded-2xl shadow-lg shadow-emerald-950/50 flex items-center justify-center relative transition duration-200 text-base sm:text-xl tracking-wide border border-emerald-400/30 cursor-pointer group"
              >
                <Rocket className="w-6 h-6 sm:w-7 sm:h-7 text-white absolute left-5 sm:left-7 shrink-0 group-hover:scale-110 transition duration-200" />
                <span className="text-center w-full pl-8 pr-2">Experimentar Gratuitamente</span>
              </button>

              {/* Button 2: Assinar Agora */}
              <button
                onClick={onOpenPlans}
                type="button"
                className="w-full bg-[#1db954] hover:bg-[#189e47] active:bg-[#14833b] text-white font-bold py-3.5 sm:py-4.5 px-6 sm:px-8 rounded-2xl shadow-lg shadow-emerald-950/50 flex items-center justify-center relative transition duration-200 text-base sm:text-xl tracking-wide border border-emerald-400/30 cursor-pointer group"
              >
                <CreditCard className="w-6 h-6 sm:w-7 sm:h-7 text-white absolute left-5 sm:left-7 shrink-0 group-hover:scale-110 transition duration-200" />
                <span className="text-center w-full pl-8 pr-2">Assinar Agora</span>
              </button>
            </div>

          </div>

          {/* DESKTOP RIGHT COLUMN - HERO MAN IMAGE (HIDDEN ON MOBILE >=768px) */}
          <div className="hidden md:flex md:w-[45%] lg:w-[47%] justify-end items-end relative min-h-[560px] lg:min-h-[660px] xl:min-h-[720px] pointer-events-none">
            {/* Soft Radial Lighting Effect behind the man */}
            <div className="absolute bottom-10 right-10 w-[420px] h-[420px] bg-sky-500/25 rounded-full blur-[120px]" />
            
            <div className="relative z-10 w-full max-w-xl h-full flex items-end justify-end">
              <img
                src={homemBanner}
                alt="DG Orçamentos - Especialista em Gestão de Orçamentos"
                className="w-auto h-[560px] lg:h-[660px] xl:h-[720px] object-contain object-top drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] bg-transparent border-none"
                referrerPolicy="no-referrer"
              />
              
              {/* Sparkle 4-point Diamond Flare at bottom right of coat */}
              <div className="absolute bottom-12 right-6 text-sky-200/90 animate-pulse">
                <Sparkles className="w-7 h-7 text-sky-200" />
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Bar */}
      <footer className="w-full border-t border-sky-950/60 py-4 px-6 text-center text-xs text-sky-300/60 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} DG Orçamentos. Todos os direitos reservados.</span>
          <button
            onClick={onOpenLogin}
            type="button"
            className="hover:text-white transition underline cursor-pointer"
          >
            Acessar Área do Cliente
          </button>
        </div>
      </footer>
    </div>
  );
};
