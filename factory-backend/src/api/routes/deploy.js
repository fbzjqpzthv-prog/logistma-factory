/**
 * LogisTMA Factory — routes/deploy.js + status + billing
 */

import { Router } from 'express';
import { rateLimitQueries, deploymentQueries, tenantQueries } from '../../db/factory-db.js';
import { startProvisioningAsync, validateTelegramBot } from '../../services/provisioner.js';
import { getPlansForAPI, sendPaymentInvoice } from '../../services/billingService.js';
import { generatePreviewVars } from '../../services/themeBuilder.js';
import logger from '../../utils/logger.js';

// ── DEPLOY ────────────────────────────────────────
export const deployRouter = Router();

deployRouter.post('/', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const adminId = req.user?.telegramId;

  // Rate limiting
  try {
    const rl = rateLimitQueries.check(`deploy:ip:${ip}`, 3, 3600);
    if (!rl.allowed) {
      return res.status(429).json({ error: 'Trop de déploiements. Maximum 3 par heure.' });
    }
  } catch (_) {}

  const { companyName, botToken, sector, emoji, theme, features, plan, adminId: bodyAdminId } = req.body;

  if (!companyName?.trim()) return res.status(400).json({ error: "Nom d'entreprise requis" });
  if (!botToken) return res.status(400).json({ error: 'Token bot Telegram requis' });

  const effectiveAdminId = adminId || bodyAdminId;
  if (!effectiveAdminId) return res.status(401).json({ error: 'Authentification requise' });

  try {
    let botInfo;
    try {
      botInfo = await validateTelegramBot(botToken);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const deployment = await startProvisioningAsync({
      companyName: companyName.trim(),
      botToken,
      adminId: effectiveAdminId,
      sector: sector || 'colis',
      emoji: emoji || '🚚',
      theme: theme || { primary: '#0ea5a0', style: 'dark', font: 'Sora' },
      features: features || {},
      plan: plan || 'starter',
    }, effectiveAdminId);

    res.status(202).json({
      deploymentId: deployment.id,
      botUsername: botInfo.username,
      message: 'Déploiement démarré',
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Deploy route error');
    res.status(500).json({ error: err.message });
  }
});

deployRouter.post('/validate-bot', async (req, res) => {
  const { botToken } = req.body;
  if (!botToken) return res.status(400).json({ error: 'Token requis' });
  try {
    const botInfo = await validateTelegramBot(botToken);
    res.json({ valid: true, username: botInfo.username, name: botInfo.first_name, id: botInfo.id });
  } catch (err) {
    res.status(400).json({ valid: false, error: err.message });
  }
});

deployRouter.post('/preview-theme', (req, res) => {
  const { primary, secondary, style } = req.body;
  if (!primary) return res.status(400).json({ error: 'Couleur primaire requise' });
  try {
    const vars = generatePreviewVars(primary, secondary || primary, style || 'dark');
    res.json({ cssVars: vars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── STATUS ────────────────────────────────────────
export const statusRouter = Router();

const STEP_LABELS = {
  init: 'Initialisation',
  generating_id: "Génération de l'identifiant",
  validating_bot: 'Validation du bot Telegram',
  creating_tenant: 'Création du tenant',
  cloning_template: 'Clonage du template',
  injecting_config: 'Injection de la configuration',
  building: 'Build du frontend',
  deploying_railway: 'Déploiement',
  configuring_dns: 'Configuration DNS',
  configuring_webhook: 'Webhook Telegram',
  running_tests: 'Tests automatiques',
  saving: 'Finalisation',
  notifying: 'Notification',
};

const STEP_ORDER = Object.keys(STEP_LABELS);

statusRouter.get('/:deploymentId', (req, res) => {
  const { deploymentId } = req.params;
  try {
    const deployment = deploymentQueries.findById(deploymentId);
    if (!deployment) return res.status(404).json({ error: 'Déploiement non trouvé' });

    const stepsCompleted = JSON.parse(deployment.steps_completed || '[]');
    const currentStepIndex = STEP_ORDER.indexOf(deployment.current_step);
    const progress = Math.round(((currentStepIndex + 1) / STEP_ORDER.length) * 100);

    const steps = STEP_ORDER.map(step => ({
      id: step,
      label: STEP_LABELS[step],
      status: stepsCompleted.includes(step) ? 'done'
        : step === deployment.current_step
          ? (deployment.status === 'failed' ? 'error' : 'running')
          : 'pending',
    }));

    res.json({
      id: deployment.id,
      tenantId: deployment.tenant_id,
      status: deployment.status,
      currentStep: deployment.current_step,
      currentStepLabel: STEP_LABELS[deployment.current_step] || deployment.current_step,
      progress,
      steps,
      frontendUrl: deployment.frontend_url,
      backendUrl: deployment.backend_url,
      errorMessage: deployment.error_message,
      deployedAt: deployment.deployed_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── BILLING (Telegram Payments) ───────────────────
export const billingRouter = Router();

billingRouter.post('/invoice', async (req, res) => {
  const { tenantId, plan } = req.body;
  const adminId = req.user?.telegramId;
  if (!tenantId || !plan) return res.status(400).json({ error: 'tenantId et plan requis' });

  try {
    const { getBot } = await import('../../bot/factoryBot.js');
    const bot = getBot();
    if (!bot) return res.status(503).json({ error: 'Bot non disponible' });
    await sendPaymentInvoice(bot, adminId, tenantId, plan);
    res.json({ success: true, message: 'Invoice envoyée en MP Telegram' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

billingRouter.get('/plans', (req, res) => {
  res.json(getPlansForAPI());
});
