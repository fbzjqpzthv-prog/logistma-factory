/**
 * LogisTMA Factory — billingService.js
 * Paiements via Telegram Payments (MP direct dans le bot)
 */

import { tenantQueries, billingQueries, auditQueries } from '../db/factory-db.js';
import logger from '../utils/logger.js';

export const PLANS = {
  starter: {
    id: 'starter', name: 'Starter', priceEur: 29, priceCents: 2900,
    title: 'LogisTMA Starter — 29€/mois',
    description: 'Mini App Telegram livraison · 1 livreur · 50 stops/mois',
    maxDrivers: 1, maxStops: 50,
  },
  pro: {
    id: 'pro', name: 'Pro', priceEur: 79, priceCents: 7900,
    title: 'LogisTMA Pro — 79€/mois',
    description: 'Mini App Telegram · 5 livreurs · 500 stops/mois · Photos · Signature',
    maxDrivers: 5, maxStops: 500,
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', priceEur: 199, priceCents: 19900,
    title: 'LogisTMA Enterprise — 199€/mois',
    description: 'Mini App Telegram · Illimité · Analytics · API · Domaine perso',
    maxDrivers: null, maxStops: null,
  },
};

export async function sendPaymentInvoice(bot, chatId, tenantId, plan) {
  const p = PLANS[plan];
  if (!p) throw new Error(`Plan inconnu : ${plan}`);
  const providerToken = process.env.TELEGRAM_PAYMENT_TOKEN;
  if (!providerToken) throw new Error('TELEGRAM_PAYMENT_TOKEN manquant');

  await bot.telegram.sendInvoice(chatId, {
    title: p.title,
    description: p.description,
    payload: JSON.stringify({ tenantId, plan, ts: Date.now() }),
    provider_token: providerToken,
    currency: 'EUR',
    prices: [{ label: p.name, amount: p.priceCents }],
    start_parameter: `pay-${tenantId}`,
    need_name: false, need_email: true, need_phone: false,
    need_shipping_address: false, is_flexible: false, protect_content: true,
  });
  logger.info({ tenantId, plan, chatId }, 'Invoice Telegram envoyée');
}

export async function handlePreCheckout(ctx) {
  try {
    const { tenantId, plan } = JSON.parse(ctx.preCheckoutQuery.invoice_payload);
    if (!PLANS[plan]) return ctx.answerPreCheckoutQuery(false, 'Plan invalide');
    const tenant = tenantQueries.findById(tenantId);
    if (!tenant) return ctx.answerPreCheckoutQuery(false, 'Tenant introuvable');
    await ctx.answerPreCheckoutQuery(true);
  } catch (err) {
    logger.error({ err: err.message }, 'Erreur pre_checkout');
    await ctx.answerPreCheckoutQuery(false, 'Erreur de validation');
  }
}

export async function handleSuccessfulPayment(ctx) {
  const payment = ctx.message.successful_payment;
  const adminId = String(ctx.from.id);
  const { tenantId, plan } = JSON.parse(payment.invoice_payload);
  const p = PLANS[plan];

  tenantQueries.update(tenantId, {
    plan, status: 'active', billing_status: 'paid',
    stripe_subscription_id: payment.telegram_payment_charge_id,
  });

  try { auditQueries.log(tenantId, adminId, 'payment_received', { plan, amount: p.priceEur }); } catch (_) {}

  const tenant = tenantQueries.findById(tenantId);
  await ctx.reply(
    `🎉 *Paiement reçu ! Merci.*\n\n` +
    `✅ Plan *${p.name}* activé pour *${tenant?.company_name || tenantId}*\n\n` +
    `🚀 Votre Mini App : ${tenant?.frontend_url || 'Déploiement en cours...'}\n` +
    `🤖 Bot : @${tenant?.bot_username || '—'}\n\n` +
    `💡 Envoyez /dashboard pour gérer votre app.`,
    { parse_mode: 'Markdown' }
  );
  logger.info({ tenantId, plan }, 'Paiement Telegram activé');
  return { tenantId, plan };
}

export function getPlansForAPI() {
  return {
    plans: Object.values(PLANS).map(p => ({
      id: p.id, name: p.name, priceEur: p.priceEur,
      priceMonthly: `${p.priceEur}€/mois`, description: p.description,
      maxDrivers: p.maxDrivers, maxStopsPerMonth: p.maxStops,
      badge: p.id === 'pro' ? 'Populaire' : p.id === 'enterprise' ? 'Enterprise' : null,
      highlighted: p.id === 'pro',
    })),
  };
}

export function checkQuota(tenant, metric) {
  const limits = { starter: { drivers: 1, stops: 50 }, pro: { drivers: 5, stops: 500 }, enterprise: { drivers: null, stops: null } };
  const limit = limits[tenant.plan]?.[metric];
  if (limit === null || limit === undefined) return { allowed: true };
  const current = tenant[`${metric}_count`] || 0;
  return { allowed: current < limit, current, limit };
}
