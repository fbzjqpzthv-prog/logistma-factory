/**
 * LogisTMA Factory — server.js
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';

import { getDb } from './db/factory-db.js';
import { tenantsRouter } from './api/routes/tenants.js';
import { deployRouter, statusRouter, billingRouter } from './api/routes/deploy.js';
import { factoryAuth } from './api/middleware/factoryAuth.js';
import { createFactoryBot, registerBotActions } from './bot/factoryBot.js';
import logger from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: [
    process.env.FACTORY_FRONTEND_URL || 'http://localhost:5173',
    'https://web.telegram.org',
    'https://telegram.org',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ── Health check ──────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', ts: new Date().toISOString() });
});

// ── Routes publiques ──────────────────────────────
app.get('/billing/plans', async (req, res) => {
  const { getPlansForAPI } = await import('./services/billingService.js');
  res.json(getPlansForAPI());
});

// ── Routes protégées ─────────────────────────────
app.use('/deploy', factoryAuth, deployRouter);
app.use('/status', statusRouter);
app.use('/tenants', factoryAuth, tenantsRouter);
app.use('/billing', factoryAuth, billingRouter);

// ── Bot webhook ───────────────────────────────────
app.post('/bot-webhook', express.json(), async (req, res) => {
  try {
    const { getBot } = await import('./bot/factoryBot.js');
    const bot = getBot();
    if (bot) {
      await bot.handleUpdate(req.body);
    }
    res.sendStatus(200);
  } catch (err) {
    logger.error({ err: err.message }, 'Bot webhook error');
    res.sendStatus(200);
  }
});

// ── Init DB + Bot + Server ────────────────────────
async function start() {
  try {
    // Init DB
    getDb();
    logger.info('Database initialisée');

    // Init Bot
    if (process.env.FACTORY_BOT_TOKEN) {
      const bot = createFactoryBot();
      registerBotActions(bot);

      if (process.env.NODE_ENV === 'production') {
        logger.info('Bot en mode webhook (production)');
      } else {
        bot.launch().catch(err => logger.warn({ err: err.message }, 'Bot launch warning'));
        logger.info('Bot en mode polling (dev)');
      }
    } else {
      logger.warn('FACTORY_BOT_TOKEN manquant — bot désactivé');
    }

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      logger.info({ port: PORT }, `Server démarré sur le port ${PORT}`);
    });

  } catch (err) {
    logger.error({ err: err.message }, 'Erreur au démarrage');
    process.exit(1);
  }
}

start();

export default app;
