/**
 * LogisTMA Factory — routes/tenants.js
 */

import { Router } from 'express';
import { tenantQueries, deploymentQueries, billingQueries, auditQueries } from '../../db/factory-db.js';
import { generateThemeCSS } from '../../services/themeBuilder.js';
import { sendPaymentInvoice, getPlansForAPI } from '../../services/billingService.js';
import logger from '../../utils/logger.js';

export const tenantsRouter = Router();

// GET /tenants — Liste des tenants de l'admin connecté
tenantsRouter.get('/', (req, res) => {
  const adminId = req.user.telegramId;
  const tenants = tenantQueries.findByAdminId(adminId);
  res.json({ tenants });
});

// GET /tenants/:id — Détail d'un tenant
tenantsRouter.get('/:id', (req, res) => {
  const { id } = req.params;
  const adminId = req.user.telegramId;
  const tenant = tenantQueries.findById(id);
  if (!tenant) return res.status(404).json({ error: 'Tenant non trouvé' });
  if (tenant.admin_tg_id !== adminId) return res.status(403).json({ error: 'Accès refusé' });
  res.json(tenant);
});

// PATCH /tenants/:id/theme — Mise à jour du thème
tenantsRouter.patch('/:id/theme', async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.telegramId;
  const tenant = tenantQueries.findById(id);
  if (!tenant) return res.status(404).json({ error: 'Tenant non trouvé' });
  if (tenant.admin_tg_id !== adminId) return res.status(403).json({ error: 'Accès refusé' });

  const { theme } = req.body;
  if (!theme) return res.status(400).json({ error: 'theme requis' });

  try {
    const css = generateThemeCSS(theme);
    tenantQueries.update(id, { config: JSON.stringify({ ...JSON.parse(tenant.config || '{}'), theme }) });
    res.json({ success: true, css });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /tenants/:id/plan — Changer de plan via Telegram Payments
tenantsRouter.post('/:id/plan', async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.telegramId;
  const tenant = tenantQueries.findById(id);
  if (!tenant) return res.status(404).json({ error: 'Tenant non trouvé' });
  if (tenant.admin_tg_id !== adminId) return res.status(403).json({ error: 'Accès refusé' });

  const { plan } = req.body;
  if (!plan) return res.status(400).json({ error: 'plan requis' });

  try {
    // Envoie une invoice Telegram en MP — le bot doit être initialisé
    const { getBot } = await import('../../bot/factoryBot.js');
    const bot = getBot();
    if (bot) {
      await sendPaymentInvoice(bot, adminId, id, plan);
      res.json({ success: true, message: 'Invoice envoyée en message privé Telegram' });
    } else {
      res.status(503).json({ error: 'Bot non initialisé' });
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Erreur envoi invoice');
    res.status(500).json({ error: err.message });
  }
});

// POST /tenants/:id/redeploy — Redéploiement
tenantsRouter.post('/:id/redeploy', async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.telegramId;
  const tenant = tenantQueries.findById(id);
  if (!tenant) return res.status(404).json({ error: 'Tenant non trouvé' });
  if (tenant.admin_tg_id !== adminId) return res.status(403).json({ error: 'Accès refusé' });

  res.json({ success: true, message: 'Redéploiement lancé' });
});

// GET /tenants/:id/audit — Logs d'audit
tenantsRouter.get('/:id/audit', (req, res) => {
  const { id } = req.params;
  const adminId = req.user.telegramId;
  const tenant = tenantQueries.findById(id);
  if (!tenant) return res.status(404).json({ error: 'Tenant non trouvé' });
  if (tenant.admin_tg_id !== adminId) return res.status(403).json({ error: 'Accès refusé' });

  try {
    const logs = auditQueries.findByTenant(id);
    res.json({ logs });
  } catch (_) {
    res.json({ logs: [] });
  }
});

// GET /tenants/:id/billing/portal — Info facturation
tenantsRouter.get('/:id/billing/portal', (req, res) => {
  const { id } = req.params;
  const adminId = req.user.telegramId;
  const tenant = tenantQueries.findById(id);
  if (!tenant) return res.status(404).json({ error: 'Tenant non trouvé' });
  if (tenant.admin_tg_id !== adminId) return res.status(403).json({ error: 'Accès refusé' });

  // Avec Telegram Payments, pas de portail externe — on retourne les infos du plan
  res.json({
    portalUrl: null,
    plan: tenant.plan,
    billingStatus: tenant.billing_status,
    message: 'Les paiements se font directement via Telegram. Envoyez /pay dans le bot pour changer de plan.',
  });
});
