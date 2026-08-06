import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle, Sparkles } from 'lucide-react';

export default function PWAInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (already installed & opened from home screen)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Detect iOS devices
    const ua = window.navigator.userAgent;
    const iosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(iosDevice);

    // Check if user previously dismissed banner in current session
    const isDismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
    }

    // Capture beforeinstallprompt event for Android, Chrome, Edge & Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalledSuccessfully(true);
      setInstallPrompt(null);
      setTimeout(() => {
        setDismissed(true);
      }, 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalledSuccessfully(true);
        setInstallPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  // If already running inside installed standalone app, or dismissed, do not render banner
  if (isStandalone || dismissed) {
    return null;
  }

  // Show installation notification if installPrompt is available OR if on iOS/Mobile
  if (!installPrompt && !isIOS && !showIOSGuide && !installedSuccessfully) {
    return null;
  }

  return (
    <div className="fixed bottom-3 left-3 right-3 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[9999] animate-in slide-in-from-bottom duration-300">
      <div className="bg-[#002244] text-white rounded-2xl p-4 shadow-2xl border border-sky-500/30 backdrop-blur-md relative overflow-hidden">
        {/* Background glow effect */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#FF6600]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Success message after installation */}
        {installedSuccessfully ? (
          <div className="flex items-center gap-3 py-1">
            <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-white">Aplicativo Instalado com Sucesso!</h4>
              <p className="text-xs text-slate-300">
                Você já pode acessar o DG Orçamentos direto da sua tela inicial offline.
              </p>
            </div>
          </div>
        ) : showIOSGuide ? (
          /* iOS Step-by-Step Installation Modal/Guide */
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-[#FF6600] font-bold text-sm">
                <Smartphone className="w-5 h-5" />
                <span>Instalar no iPhone / iPad</span>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">
              Siga os passos do Safari para adicionar à sua tela inicial:
            </p>

            <div className="space-y-2 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="w-5 h-5 rounded-full bg-[#FF6600] text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                <span>Toque no botão <strong className="text-sky-300 inline-flex items-center gap-1"><Share className="w-3.5 h-3.5 inline" /> Compartilhar</strong> na barra do Safari.</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="w-5 h-5 rounded-full bg-[#FF6600] text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                <span>Role para baixo e selecione <strong className="text-sky-300 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline" /> Adicionar à Tela de Início</strong>.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200"
            >
              Entendido
            </button>
          </div>
        ) : (
          /* Main Prominent Installation Banner */
          <div className="flex flex-col space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#003366] to-[#001f3f] border border-sky-400/30 p-1 shrink-0 flex items-center justify-center shadow-md">
                  <img
                    src="/icon/icon_256x256.png"
                    alt="DG Gestão em Orçamentos"
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => {
                      // Fallback icon if image fails
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <Sparkles className="w-6 h-6 text-[#FF6600] hidden" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-black text-sm text-white tracking-tight">
                      Instalar DG Orçamentos
                    </h4>
                    <span className="px-1.5 py-0.5 bg-[#FF6600] text-white text-[9px] font-bold uppercase rounded-md tracking-wider">
                      App
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    Instale direto no celular ou PC para usar rápido e sem internet.
                  </p>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
                title="Fechar aviso de instalação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleInstallClick}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#FF6600] to-[#ff8533] hover:from-[#e65c00] hover:to-[#ff771c] text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Aplicativo Agora</span>
              </button>

              <button
                onClick={handleDismiss}
                className="py-2.5 px-3 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Depois
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
