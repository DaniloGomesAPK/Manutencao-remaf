import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Configurações reais do Firebase dG Gestão Automotiva
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDN92LsNMxpQ2CrHaaobzmgEpw2kE4_fL8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dg-gestao-automotiva.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dg-gestao-automotiva',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'dg-gestao-automotiva.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '208666446129',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:208666446129:web:84565da49425255b350810',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-WEDLRFTE0J',
};

// Evita múltiplas inicializações em desenvolvimento (HMR/re-renders)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export { app };

// Inicializa o Analytics se suportado pelo ambiente/navegador
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Ignora em ambientes sem suporte
  });
}

export default app;
