/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LicenseService } from '../services/LicenseService';
import { Clock, Zap, ArrowRight, ShieldAlert } from 'lucide-react';

interface TrialBannerProps {
  trialFim: string | null;
  onActivate: () => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ trialFim, onActivate }) => {
  const [tempo, setTempo] = useState(() => LicenseService.getTempoRestanteTrial(trialFim));

  useEffect(() => {
    const updateCountdown = () => {
      setTempo(LicenseService.getTempoRestanteTrial(trialFim));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [trialFim]);

  if (tempo.expirou) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-[#003366] via-slate-900 to-[#002244] border border-sky-400/30 rounded-2xl p-4 sm:p-5 shadow-lg text-white mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
      {/* Background Subtle Sparkle */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-sky-400/10 rounded-full blur-xl pointer-events-none" />

      {/* Info Left */}
      <div className="flex items-center gap-3.5 z-10">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-400/30 text-sky-400 flex items-center justify-center font-black shrink-0">
          <Clock className="w-5 h-5 text-sky-400 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest bg-sky-400 text-slate-950 px-2 py-0.5 rounded-md">
              TESTE GRATUITO
            </span>
            <span className="text-xs text-sky-200 font-medium hidden sm:inline">
              Aproveite todos os recursos liberados
            </span>
          </div>
          
          <div className="flex items-center gap-2 mt-1.5 text-sm font-bold text-white">
            <span className="text-slate-300 font-medium">Restam:</span>
            <div className="flex items-center gap-1.5 font-mono text-sky-300">
              <span className="bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 text-xs sm:text-sm font-bold text-white">
                {tempo.dias}d
              </span>
              <span>:</span>
              <span className="bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 text-xs sm:text-sm font-bold text-white">
                {String(tempo.horas).padStart(2, '0')}h
              </span>
              <span>:</span>
              <span className="bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 text-xs sm:text-sm font-bold text-white">
                {String(tempo.minutos).padStart(2, '0')}m
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Button Right */}
      <button
        onClick={onActivate}
        className="w-full sm:w-auto bg-sky-400 hover:bg-sky-300 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition cursor-pointer shrink-0 z-10"
      >
        <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
        <span>ATIVAR LICENÇA</span>
        <ArrowRight className="w-4 h-4 text-slate-950" />
      </button>
    </div>
  );
};
