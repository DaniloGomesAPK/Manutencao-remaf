import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './providers/AuthProvider.tsx';
import { EmpresaProvider } from './providers/EmpresaProvider.tsx';
import { LicenseProvider } from './providers/LicenseProvider.tsx';
import { SyncProvider } from './providers/SyncProvider.tsx';
import { ClienteProvider } from './providers/ClienteProvider.tsx';
import { EquipamentoProvider } from './providers/EquipamentoProvider.tsx';
import { ServicoProvider } from './providers/ServicoProvider.tsx';
import { PrecificacaoProvider } from './providers/PrecificacaoProvider.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Register Service Worker for offline PWA compliance
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('PWA Service Worker registrado com sucesso:', registration.scope);
      })
      .catch((error) => {
        console.warn('Falha ao registrar o Service Worker:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <EmpresaProvider>
        <LicenseProvider>
          <SyncProvider>
            <ClienteProvider>
              <EquipamentoProvider>
                <ServicoProvider>
                  <PrecificacaoProvider>
                    <ErrorBoundary modulo="Inicialização" componente="App">
                      <App />
                    </ErrorBoundary>
                  </PrecificacaoProvider>
                </ServicoProvider>
              </EquipamentoProvider>
            </ClienteProvider>
          </SyncProvider>
        </LicenseProvider>
      </EmpresaProvider>
    </AuthProvider>
  </StrictMode>,
);
