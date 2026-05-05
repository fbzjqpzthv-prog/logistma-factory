import { createHmac } from 'crypto';
import logger from '../../utils/logger.js';

const FACTORY_BOT_TOKEN = process.env.FACTORY_BOT_TOKEN;
const FACTORY_ADMIN_ID = process.env.FACTORY_ADMIN_ID;

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
    if (computedHash !== hash) return null;
    const user = JSON.parse(params.get('user') || 'null');
    return user;
  } catch {
    return null;
  }
}

export function factoryAuth(req, res, next) {
  if (req.path === '/billing/webhook') return next();

  // DEV_MODE — bypass auth complet
  if (process.env.DEV_MODE === 'true') {
    req.user = {
      telegramId: FACTORY_ADMIN_ID || '123456789',
      username: 'dev_user',
      firstName: 'Developer',
      isAdmin: true,
    };
    return next();
  }

  // Telegram WebApp auth
  const initData = req.headers['x-telegram-init-data'];
  if (initData) {
    const user = validateTelegramInitData(initData);
    if (!user) {
      return res.status(401).json({ error: 'Authentification Telegram invalide ou expirée' });
    }
    req.user = {
      telegramId: user.id.toString(),
      username: user.username,
      firstName: user.first_name,
      isAdmin: user.id.toString() === FACTORY_ADMIN_ID,
    };
    return next();
  }

  // Bearer token admin
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
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

  res.status(401).json({ error: 'Authentification requise. Fournissez X-Telegram-Init-Data.' });
}

export function adminOnly(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}

export function rateLimit() {
  return (req, res, next) => next();
}

export default { factoryAuth, adminOnly, rateLimit };