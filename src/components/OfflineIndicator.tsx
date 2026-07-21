/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Info, Download } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capture standard install prompt to let user install App as PWA
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted PWA installation');
      setInstallPrompt(null);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-b border-rose-500/10 divide-y sm:divide-y-0 divide-slate-100">
      {/* Connection Status Badge */}
      <div 
        className={`flex-1 py-2 px-4 flex items-center justify-between text-xs font-semibold transition-all duration-300 ${
          isOnline 
            ? 'bg-emerald-500/10 text-emerald-800' 
            : 'bg-rose-500/10 text-rose-800 animate-pulse'
        }`}
      >
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Cloud className="w-4 h-4 text-emerald-600" />
          ) : (
            <CloudOff className="w-4 h-4 text-rose-600 animate-pulse" />
          )}
          <span>
            {isOnline 
              ? 'Modo Offline Ativo (Banco Local IndexedDB)' 
              : 'Modo Offline Ativo (Sem Internet)'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 opacity-90">
          <Info className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            Todos os seus dados estão salvos de forma segura neste dispositivo.
          </span>
        </div>
      </div>

      {/* PWA Install Promo Badge */}
      {installPrompt && (
        <button
          onClick={handleInstallClick}
          className="bg-[#003366] hover:bg-[#002244] text-white py-2 px-4 text-xs font-bold flex items-center justify-center gap-2 transition duration-150 cursor-pointer text-center"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar Aplicativo (PWA)</span>
        </button>
      )}
    </div>
  );
}
