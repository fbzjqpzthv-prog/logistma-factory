/**
 * LogisTMA Factory — factoryBot.js
 * Bot Telegram factory — onboarding + paiements Telegram
 */

import { Telegraf, Markup } from 'telegraf';
import { createHmac } from 'crypto';

import { tenantQueries, deploymentQueries } from '../db/factory-db.js';
import { validateTelegramBot, startProvisioningAsync } from '../services/provisioner.js';
import { sendPaymentInvoice, handlePreCheckout, handleSuccessfulPayment, PLANS } from '../services/billingService.js';
import { isValidHex } from '../services/themeBuilder.js';
import logger from '../utils/logger.js';

const FACTORY_BOT_TOKEN = process.env.FACTORY_BOT_TOKEN;
const FACTORY_FRONTEND_URL = process.env.FACTORY_FRONTEND_URL || 'https://logistma-factory.vercel.app';

// Session en mémoire
const userSessions = new Map();

// Instance bot (singleton)
let botInstance = null;

export function getBot() {
  return botInstance;
}

export function createFactoryBot() {
  if (!FACTORY_BOT_TOKEN) {
    logger.warn('FACTORY_BOT_TOKEN non configuré — bot désactivé');
    return null;
  }

  const bot = new Telegraf(FACTORY_BOT_TOKEN, { handlerTimeout: 90_000 });
  botInstance = bot;

  // Session middleware
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id?.toString();
    if (userId && !userSessions.has(userId)) {
      userSessions.set(userId, { step: 'idle', data: {} });
    }
    ctx.session = userId ? userSessions.get(userId) : { step: 'idle', data: {} };
    await next();
  });

  // ── /start ──────────────────────────────────────
  bot.start(async (ctx) => {
    ctx.session.step = 'idle';
    ctx.session.data = {};

    await ctx.reply(
      `🏭 *Bienvenue sur LogisTMA Factory !*\n\n` +
      `Déployez votre Mini App Telegram de livraison en quelques minutes.\n\n` +
      `Commandes disponibles :\n` +
      `• /creer — Créer une nouvelle app\n` +
      `• /mes_apps — Voir mes apps déployées\n` +
      `• /plans — Voir les tarifs\n` +
      `• /aide — Aide`,
      { parse_mode: 'Markdown' }
    );
  });

  // ── /plans ──────────────────────────────────────
  bot.command('plans', async (ctx) => {
    const text = Object.values(PLANS).map(p =>
      `*${p.name}* — ${p.priceEur}€/mois\n${p.description}`
    ).join('\n\n');

    await ctx.reply(
      `💳 *Nos plans :*\n\n${text}\n\n` +
      `Démarrez avec /creer — 14 jours gratuits sur tous les plans !`,
      { parse_mode: 'Markdown' }
    );
  });

  // ── /mes_apps ───────────────────────────────────
  bot.command('mes_apps', async (ctx) => {
    const adminId = ctx.from.id.toString();
    try {
      const tenants = tenantQueries.findByAdminId(adminId);
      if (!tenants || tenants.length === 0) {
        return ctx.reply('Vous n\'avez pas encore d\'app. Utilisez /creer pour en créer une !');
      }
      const list = tenants.map(t =>
        `• *${t.company_name}* — Plan ${t.plan} — ${t.status === 'active' ? '🟢 Actif' : '🔴 Inactif'}\n  ${t.frontend_url || 'En cours de déploiement'}`
      ).join('\n\n');
      await ctx.reply(`📱 *Vos apps :*\n\n${list}`, { parse_mode: 'Markdown' });
    } catch (err) {
      await ctx.reply('Erreur lors de la récupération de vos apps.');
    }
  });

  // ── /creer — Démarre l'onboarding ───────────────
  bot.command('creer', async (ctx) => {
    ctx.session.step = 'ask_company_name';
    ctx.session.data = {};
    await ctx.reply(
      `🚀 *Création de votre Mini App*\n\n` +
      `Étape 1/4 — Quel est le nom de votre entreprise ?`,
      { parse_mode: 'Markdown' }
    );
  });

  // ── /aide ────────────────────────────────────────
  bot.command('aide', async (ctx) => {
    await ctx.reply(
      `ℹ️ *Aide LogisTMA Factory*\n\n` +
      `*Comment créer votre app :*\n` +
      `1. Tapez /creer\n` +
      `2. Suivez les instructions\n` +
      `3. Votre app est déployée automatiquement\n\n` +
      `*Vous avez besoin d\'un bot Telegram :*\n` +
      `→ Allez sur @BotFather\n` +
      `→ Tapez /newbot\n` +
      `→ Copiez le token\n\n` +
      `Support : @LogisTMASupport`,
      { parse_mode: 'Markdown' }
    );
  });

  // ── Gestion des messages texte (onboarding) ──────
  bot.on('text', async (ctx) => {
    const userId = ctx.from.id.toString();
    const text = ctx.message.text;
    const session = ctx.session;

    if (text.startsWith('/')) return;

    try {
      switch (session.step) {

        case 'ask_company_name':
          if (text.trim().length < 2) {
            return ctx.reply('⚠️ Nom trop court. Minimum 2 caractères.');
          }
          session.data.companyName = text.trim();
          session.step = 'ask_bot_token';
          await ctx.reply(
            `✅ *${session.data.companyName}* — Parfait !\n\n` +
            `Étape 2/4 — Collez le token de votre bot Telegram.\n` +
            `_(Créez un bot via @BotFather si vous n\'en avez pas)_`,
            { parse_mode: 'Markdown' }
          );
          break;

        case 'ask_bot_token':
          const tokenRegex = /^\d{8,12}:[A-Za-z0-9_-]{35,}$/;
          if (!tokenRegex.test(text.trim())) {
            return ctx.reply('⚠️ Format de token invalide. Il doit ressembler à : 123456789:ABCdef...');
          }
          try {
            const botInfo = await validateTelegramBot(text.trim());
            session.data.botToken = text.trim();
            session.data.botUsername = botInfo.username;
            session.step = 'ask_plan';
            await ctx.reply(
              `✅ Bot *@${botInfo.username}* validé !\n\n` +
              `Étape 3/4 — Choisissez votre plan :`,
              {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                  [Markup.button.callback('Starter — 29€/mois', 'plan_starter')],
                  [Markup.button.callback('Pro — 79€/mois ⭐', 'plan_pro')],
                  [Markup.button.callback('Enterprise — 199€/mois', 'plan_enterprise')],
                ])
              }
            );
          } catch (err) {
            await ctx.reply(`❌ Token invalide : ${err.message}\nVérifiez le token depuis @BotFather.`);
          }
          break;

        default:
          if (session.step === 'idle') {
            await ctx.reply('Tapez /creer pour créer votre app ou /aide pour de l\'aide.');
          }
      }
    } catch (err) {
      logger.error({ err: err.message, userId }, 'Bot message handler error');
      await ctx.reply('Une erreur est survenue. Recommencez avec /creer');
    }
  });

  // ── Callbacks plan ───────────────────────────────
  bot.action(/^plan_(.+)$/, async (ctx) => {
    const plan = ctx.match[1];
    const session = ctx.session;

    if (!session.data.botToken) {
      await ctx.answerCbQuery('Session expirée. Recommencez avec /creer');
      return;
    }

    session.data.plan = plan;
    session.step = 'deploying';

    await ctx.answerCbQuery(`Plan ${plan} sélectionné !`);
    await ctx.editMessageText(
      `✅ Plan *${PLANS[plan]?.name}* sélectionné.\n\n` +
      `🚀 Déploiement en cours... Cela prend 3-5 minutes.\n` +
      `Vous recevrez une notification quand votre app sera prête.`,
      { parse_mode: 'Markdown' }
    );

    // Lance le déploiement
    try {
      const deployment = await startProvisioningAsync({
        companyName: session.data.companyName,
        botToken: session.data.botToken,
        adminId: ctx.from.id.toString(),
        sector: 'colis',
        emoji: '🚚',
        theme: { primary: '#0ea5a0', style: 'dark', font: 'Sora' },
        features: { gps_tracking: true, notifications: true },
        plan,
      }, ctx.from.id.toString());

      session.data.deploymentId = deployment.id;
      session.data.tenantId = deployment.tenantId;

      // Envoie l'invoice de paiement après déploiement
      setTimeout(async () => {
        try {
          await sendPaymentInvoice(bot, ctx.from.id, deployment.tenantId || deployment.id, plan);
        } catch (err) {
          logger.error({ err: err.message }, 'Erreur envoi invoice post-deploy');
        }
      }, 5000);

    } catch (err) {
      logger.error({ err: err.message }, 'Erreur déploiement bot');
      await ctx.reply(`❌ Erreur lors du déploiement : ${err.message}\nContactez @LogisTMASupport`);
    }
  });

  // ── Paiements Telegram ───────────────────────────
  bot.on('pre_checkout_query', handlePreCheckout);
  bot.on('message', async (ctx, next) => {
    if (ctx.message?.successful_payment) {
      await handleSuccessfulPayment(ctx);
    } else {
      await next();
    }
  });

  // ── Erreurs globales ─────────────────────────────
  bot.catch((err, ctx) => {
    logger.error({ err: err.message, updateType: ctx.updateType }, 'Bot error');
  });

  return bot;
}

export function registerBotActions(bot) {
  // Actions supplémentaires si nécessaire
}

export function validateTelegramAuth(initData) {
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(process.env.FACTORY_BOT_TOKEN || '')
      .digest();
    const expectedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    if (expectedHash !== hash) return null;
    const user = JSON.parse(params.get('user') || '{}');
    return { telegramId: user.id?.toString(), username: user.username, firstName: user.first_name };
  } catch {
    return null;
  }
}

export default { createFactoryBot, registerBotActions, validateTelegramAuth, getBot };
