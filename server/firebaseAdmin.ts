import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import crypto from 'crypto';

let adminApp: App | null = null;

/**
 * Normaliza o e-mail (lowercase e trim) e calcula o hash SHA-256 para busca na coleção accessGrants.
 */
export function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

/**
 * Retorna a instância inicializada do Firebase Admin SDK utilizando singleton
 * e inicialização tardia (lazy) para evitar travamentos em inicialização.
 */
export function getFirebaseAdmin(): App {
  if (adminApp) {
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Corrige eventuais quebras de linha em chaves privadas vindas de variáveis de ambiente
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      '⚠️ Credenciais do Firebase Admin SDK não estão totalmente configuradas (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).'
    );
    throw new Error('Credenciais do Firebase Admin ausentes nas variáveis de ambiente.');
  }

  try {
    const apps = getApps();
    if (apps.length === 0) {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      adminApp = apps[0]!;
    }
    return adminApp;
  } catch (error) {
    console.error('Falha ao inicializar o Firebase Admin SDK:', error);
    throw error;
  }
}
