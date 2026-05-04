/**
 * LogisTMA Factory — middleware/factoryAuth.js
 * Authentification des requêtes à l'API factory.
 * Utilise les données Telegram WebApp (initData) ou un token Bearer.
 */

import { createHmac } from 'crypto';
import logger from '../../utils/logger.js';

const FACTORY_BOT_TOKEN = process.env.FACTORY_BOT_TOKEN;
const FACTORY_ADMIN_ID = process.env.FACTORY_ADMIN_ID;

/**
 * Valide les données Telegram WebApp initData.
 * Vérifie la signature HMAC-SHA256.
 */
function validateTelegramInitData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');

    const checkString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData')
      .update(FACTORY_BOT_TOKEN || '')
      .digest();

    const computedHash = createHmac('sha256', secretKey)
      .update(checkString)
      .digest('hex');

    if (computedHash !== hash) {
      return null;
    }

    // Vérifier la fraîcheur (1 heure max)
    const authDate = parseInt(params.get('auth_date') || '0');
    if (Date.now() / 1000 - authDate > 3600) {
      return null;
    }

    const user = JSON.parse(params.get('user') || 'null');
    return user;
  } catch {
    return null;
  }
}

/**
 * Middleware d'authentification principal.
 * Accepte :
 *   1. Header X-Telegram-Init-Data (depuis la Mini App WebApp)
 *   2. Header Authorization: Bearer <token> (pour dev/admin)
 */
export function factoryAuth(req, res, next) {
  // Route publique : webhook Stripe (auth via signature Stripe)
  if (req.path === '/billing/webhook') return next();

  // 1. Authentification Telegram WebApp
  const initData = req.headers['x-telegram-init-data'];
  if (initData) {
    const user = validateTelegramInitData(initData);
    if (!user) {
      return res.status(401).json({
        error: 'Authentification Telegram invalide ou expirée',
        code: 'INVALID_TELEGRAM_AUTH',
      });
    }

    req.user = {
      telegramId: user.id.toString(),
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      isAdmin: user.id.toString() === FACTORY_ADMIN_ID,
    };

    logger.debug({ userId: req.user.telegramId }, 'Telegram WebApp auth OK');
    return next();
  }

  // 2. Token Bearer (development / admin)
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    // Vérifier contre la clé admin (pour les tests)
    if (process.env.ADMIN_API_KEY && token === process.env.ADMIN_API_KEY) {
      req.user = {
        telegramId: FACTORY_ADMIN_ID || 'admin',
        username: 'admin',
        firstName: 'Admin',
        isAdmin: true,
      };
      return next();
    }
  }

  // 3. Mode développement sans auth (si NODE_ENV=development et pas de bot token)
  if (process.env.NODE_ENV === 'development' && !FACTORY_BOT_TOKEN) {
    const userId = req.headers['x-dev-user-id'] || '123456789';
    logger.warn({ userId }, 'DEV MODE: Auth bypassed');
    req.user = {
      telegramId: userId,
      username: 'dev_user',
      firstName: 'Developer',
      isAdmin: userId === FACTORY_ADMIN_ID,
    };
    return next();
  }

  res.status(401).json({
    error: 'Authentification requise. Fournissez X-Telegram-Init-Data.',
    code: 'UNAUTHORIZED',
  });
}

/**
 * Middleware admin seulement (pour les routes de gestion de la factory).
 */
export function adminOnly(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs', code: 'FORBIDDEN' });
  }
  next();
}

/**
 * Rate limiting middleware générique.
 */
export function rateLimit(key, maxCount, windowSeconds) {
  return (req, res, next) => {
    const { rateLimitQueries } = require('../../db/factory-db.js');
    const ip = req.ip || req.connection.remoteAddress;
    const limitKey = typeof key === 'function' ? key(req) : `${key}:${ip}`;

    const result = rateLimitQueries.check(limitKey, maxCount, windowSeconds);

    res.setHeader('X-RateLimit-Limit', maxCount);
    res.setHeader('X-RateLimit-Remaining', result.remaining || 0);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.resetAt - Math.floor(Date.now() / 1000));
      return res.status(429).json({
        error: 'Trop de requêtes',
        code: 'RATE_LIMITED',
        resetAt: new Date(result.resetAt * 1000).toISOString(),
      });
    }

    next();
  };
}

export default { factoryAuth, adminOnly, rateLimit };
