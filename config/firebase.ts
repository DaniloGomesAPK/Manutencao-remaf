import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (process.env || {});

// Função para sanitizar e remover aspas externas (duplas ou simples) e espaços
const cleanEnvVar = (val: unknown): string => {
  if (typeof val !== 'string') return '';
  let trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

// Lista de variáveis públicas obrigatórias para o Firebase Web SDK
const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID'
] as const;

export const missingFirebaseEnvKeys = requiredKeys.filter(key => {
  const val = cleanEnvVar(env[key]);
  return !val;
});

export const isFirebaseConfigured = missingFirebaseEnvKeys.length === 0;

// Configurações do Firebase com normalização automática de aspas externas
const firebaseConfig = {
  apiKey: cleanEnvVar(env.VITE_FIREBASE_API_KEY),
  authDomain: cleanEnvVar(env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnvVar(env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnvVar(env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnvVar(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnvVar(env.VITE_FIREBASE_APP_ID),
  measurementId: cleanEnvVar(env.VITE_FIREBASE_MEASUREMENT_ID),
};

let appInstance: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let analyticsInstance: Analytics | null = null;

if (isFirebaseConfigured) {
  // Evita múltiplas inicializações em desenvolvimento (HMR/re-renders)
  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  authInstance = getAuth(appInstance);
  
  // Inicializa o Firestore com a opção global ignoreUndefinedProperties: true
  try {
    dbInstance = initializeFirestore(appInstance, {
      ignoreUndefinedProperties: true,
    });
  } catch (_) {
    dbInstance = getFirestore(appInstance);
  }

  // Inicializa o Analytics se suportado pelo ambiente/navegador
  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported) {
        analyticsInstance = getAnalytics(appInstance);
      }
    }).catch(() => {
      // Ignora em ambientes sem suporte
    });
  }
} else {
  // Configuração ausente: loga aviso claro no console
  console.warn(
    `[Firebase Config] Variáveis de ambiente ausentes ou inválidas: ${missingFirebaseEnvKeys.join(', ')}. ` +
    `Defina as variáveis VITE_FIREBASE_* no seu ambiente (.env ou Vercel) para inicializar o Firebase Web SDK.`
  );
  // Placeholders tipados para evitar crashes em módulos que importam auth/db antes de renderizar a tela de erro
  appInstance = (getApps().length > 0 ? getApp() : null) as any;
  authInstance = (appInstance ? getAuth(appInstance) : {}) as any;
  dbInstance = (appInstance ? getFirestore(appInstance) : {}) as any;
}

export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const analytics = analyticsInstance;

export default app;
