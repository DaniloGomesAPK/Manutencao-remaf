/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirebaseAdmin } from './firebaseAdmin';

export interface AuthenticatedAdminRequest extends Request {
  adminUser?: {
    uid: string;
    email: string;
    emailVerified: boolean;
    decodedToken: DecodedIdToken;
  };
}

/**
 * Middleware Server-Side para autenticação e autorização estrita de rotas administrativas.
 * 
 * Regras:
 * 1. Exige cabeçalho Authorization: Bearer <Firebase ID Token>. Retorna 401 se ausente ou mal formatado.
 * 2. Valida o ID Token exclusivamente via Firebase Admin SDK (server-side).
 * 3. Valida se o e-mail do usuário autenticado pertence à lista restrita de SYSTEM_ADMIN_EMAILS.
 * 4. Valida se o e-mail do administrador está verificado (email_verified == true).
 * 5. Se o usuário estiver autenticado porém não for administrador, retorna HTTP 403 (Forbidden).
 * 6. Falha fechada (Fail-Closed): Se SYSTEM_ADMIN_EMAILS não estiver configurada no servidor, rejeita com 403.
 */
export async function requireAdminAuth(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Cabeçalho de autorização ausente ou inválido. Bearer <Firebase ID Token> é obrigatório.',
    });
  }

  const idToken = authHeader.substring(7).trim();
  if (!idToken) {
    return res.status(401).json({
      success: false,
      error: 'Token de autenticação não fornecido no cabeçalho Bearer.',
    });
  }

  try {
    const adminApp = getFirebaseAdmin();
    const auth = getAuth(adminApp);
    
    // 1. Validação criptográfica do token pelo Firebase Admin SDK
    const decodedToken = await auth.verifyIdToken(idToken);
    const userEmail = decodedToken.email?.trim().toLowerCase();

    if (!userEmail) {
      return res.status(401).json({
        success: false,
        error: 'O token de autenticação não possui e-mail associado.',
      });
    }

    // 2. Validação da lista de administradores autorizados do sistema
    const systemAdminEnv = process.env.SYSTEM_ADMIN_EMAILS || '';
    const systemAdmins = systemAdminEnv
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (systemAdmins.length === 0) {
      console.error('[Admin Auth] CRÍTICO: SYSTEM_ADMIN_EMAILS não configurada. Rejeitando acesso administrativo (Fail-Closed).');
      return res.status(403).json({
        success: false,
        error: 'Acesso administrativo não configurado no servidor. Operação negada por segurança.',
      });
    }

    if (!systemAdmins.includes(userEmail)) {
      console.warn(`[Admin Auth] ACESSO NEGADO (403): Usuário autenticado ${userEmail} (${decodedToken.uid}) não possui permissão de administrador.`);
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Usuário autenticado não possui privilégios de administrador do sistema.',
      });
    }

    // 3. Validação de e-mail verificado
    if (decodedToken.email_verified !== true) {
      console.warn(`[Admin Auth] ACESSO NEGADO (403): Administrador ${userEmail} não possui e-mail verificado.`);
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. O e-mail do administrador precisa estar verificado para executar ações no sistema.',
      });
    }

    // Injeta dados do administrador no request para uso seguro nos handlers
    req.adminUser = {
      uid: decodedToken.uid,
      email: userEmail,
      emailVerified: decodedToken.email_verified === true,
      decodedToken,
    };

    next();
  } catch (error: any) {
    console.error('[Admin Auth] Falha na validação do token administrativo:', error?.message || error);
    return res.status(401).json({
      success: false,
      error: 'Sessão expirada ou token de autenticação administrativo inválido.',
    });
  }
}
