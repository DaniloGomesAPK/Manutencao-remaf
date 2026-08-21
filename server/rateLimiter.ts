/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
  lastSeen: number;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTimeMs: number;
  retryAfterSeconds: number;
}

// Armazenamento em memória com limpeza periódica para compatibilidade com Express e Serverless
const rateLimitStore = new Map<string, RateLimitRecord>();

// Limpeza de chaves inativas a cada 5 minutos
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function purgeExpiredKeys() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.lastSeen > 60 * 60 * 1000) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Extrai com segurança o IP do cliente tanto em Express quanto em Serverless (Vercel)
 */
export function getClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  
  if (typeof req.headers?.['x-real-ip'] === 'string') {
    return req.headers['x-real-ip'].trim();
  }

  if (typeof req.ip === 'string') {
    return req.ip;
  }

  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }

  return '127.0.0.1';
}

/**
 * Avalia se uma chave excedeu o limite em uma janela de tempo deslizante (Sliding Window)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  purgeExpiredKeys();
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [], lastSeen: now };
    rateLimitStore.set(key, record);
  }

  // Remove timestamps fora da janela deslizante
  record.timestamps = record.timestamps.filter((t) => t > windowStart);
  record.lastSeen = now;

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0] || now;
    const resetTimeMs = oldest + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetTimeMs,
      retryAfterSeconds,
    };
  }

  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);
  const resetTimeMs = now + windowMs;

  return {
    allowed: true,
    limit,
    remaining,
    resetTimeMs,
    retryAfterSeconds: 0,
  };
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  prefix?: string;
  message?: string;
  keyGenerator?: (req: any) => string;
}

/**
 * Função utilitária para aplicar Rate Limiting diretamente em Serverless Functions (Vercel) ou Handlers
 * Retorna `false` se a requisição foi bloqueada (HTTP 429 já enviado), ou `true` se permitida.
 */
export function applyRateLimit(
  req: any,
  res: any,
  options: RateLimitOptions
): boolean {
  const prefix = options.prefix || 'rl';
  const identifier = options.keyGenerator ? options.keyGenerator(req) : getClientIp(req);
  const key = `${prefix}:${identifier}`;

  const result = checkRateLimit(key, options.max, options.windowMs);

  if (res.setHeader) {
    res.setHeader('X-RateLimit-Limit', String(result.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetTimeMs / 1000)));
  }

  if (!result.allowed) {
    if (res.setHeader) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
    }
    const defaultMsg = 'Limite de requisições excedido. Por favor, aguarde alguns instantes antes de tentar novamente.';
    res.status(429).json({
      success: false,
      error: options.message || defaultMsg,
      retryAfterSeconds: result.retryAfterSeconds,
    });
    return false;
  }

  return true;
}

/**
 * Cria um middleware Express de Rate Limiting
 */
export function createRateLimiterMiddleware(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const isAllowed = applyRateLimit(req, res, options);
    if (isAllowed) {
      next();
    }
  };
}

// Limitadores pré-configurados por contexto
export const trialRateLimiter = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15, // Máximo 15 requisições por IP na janela
  prefix: 'trial',
  message: 'Muitas tentativas de inicialização/avaliação. Por favor, tente novamente em alguns minutos.',
};

export const adminRateLimiter = {
  windowMs: 60 * 1000, // 1 minuto
  max: 40, // Máximo 40 operações por minuto
  prefix: 'admin',
  message: 'Limite de requisições administrativas excedido. Por favor, aguarde um momento.',
};

export const caktoWebhookRateLimiter = {
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // Máximo 100 requisições por minuto por IP
  prefix: 'cakto_webhook',
  message: 'Limite de requisições para o webhook excedido.',
};
