/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
 * e inicialização tardia (lazy) para evitar travamentos em inicialização de Serverless Functions.
 */
export function getFirebaseAdmin(): App {
  if (adminApp) {
    return adminApp;
  }

  const projectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT)?.trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL)?.trim();
  
  let rawPrivateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY)?.trim();
  if (rawPrivateKey) {
    if ((rawPrivateKey.startsWith('"') && rawPrivateKey.endsWith('"')) ||
        (rawPrivateKey.startsWith("'") && rawPrivateKey.endsWith("'"))) {
      rawPrivateKey = rawPrivateKey.substring(1, rawPrivateKey.length - 1);
    }
    rawPrivateKey = rawPrivateKey.replace(/\\r/g, '').replace(/\\n/g, '\n');
  }

  if (!projectId || !clientEmail || !rawPrivateKey) {
    const missing: string[] = [];
    if (!projectId) missing.push('FIREBASE_PROJECT_ID');
    if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
    if (!rawPrivateKey) missing.push('FIREBASE_PRIVATE_KEY');

    console.error(`[FIREBASE ADMIN ERROR] Credenciais ausentes no ambiente: ${missing.join(', ')}`);
    throw new Error(`Credenciais do Firebase Admin ausentes: ${missing.join(', ')}`);
  }

  try {
    const apps = getApps();
    if (apps.length === 0) {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: rawPrivateKey,
        }),
      });
      console.log(`[FIREBASE ADMIN] SDK inicializado com sucesso para o projeto: ${projectId}`);
    } else {
      adminApp = apps[0]!;
    }
    return adminApp;
  } catch (error: any) {
    console.error('[FIREBASE ADMIN ERROR] Falha ao inicializar o Firebase Admin SDK:', {
      name: error?.name,
      code: error?.code,
      message: error?.message,
    });
    throw error;
  }
}
