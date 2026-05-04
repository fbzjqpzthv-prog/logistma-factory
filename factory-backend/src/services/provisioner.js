/**
 * LogisTMA Factory — provisioner.js
 * Cœur du système : orchestre la création complète d'un tenant.
 * Chaque étape est loggée et peut être reprise en cas d'échec.
 */

import { randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import simpleGit from 'simple-git';
import axios from 'axios';
import { execSync } from 'child_process';

import { tenantQueries, deploymentQueries, auditQueries, billingQueries, newId, now } from '../db/factory-db.js';
import { generateThemeCSS, isValidHex } from './themeBuilder.js';
import { deployToRailway } from './deployer.js';
import { assignSubdomain } from './domainManager.js';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TENANTS_DIR = join(__dirname, '../../tenants');
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || randomBytes(32).toString('hex'), 'hex');
const TEMPLATE_REPO_URL = process.env.TEMPLATE_REPO_URL || 'https://github.com/logistma/template';

// ═══════════════════════════════════════
// CHIFFREMENT AES-256-GCM
// ═══════════════════════════════════════

export function encryptToken(plaintext) {
  const iv = randomBytes(12); // 96 bits pour GCM
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

export function decryptToken(encryptedHex, ivHex, tagHex) {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// ═══════════════════════════════════════
// GÉNÉRATION ID TENANT
// ═══════════════════════════════════════

/**
 * Génère un tenant ID lisible et unique.
 * Format : "rapid-courses-fr-a3f2"
 */
export function generateTenantId(companyName) {
  const slug = companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Supprimer accents
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30)
    .replace(/^-|-$/g, '');

  const suffix = randomBytes(2).toString('hex'); // 4 chars hex
  return `${slug}-${suffix}`;
}

// ═══════════════════════════════════════
// VALIDATION BOT TELEGRAM
// ═══════════════════════════════════════

/**
 * Valide un token bot Telegram et retourne les infos du bot.
 * @throws Error si le token est invalide ou déjà utilisé
 */
export async function validateTelegramBot(botToken) {
  // Appel à l'API Telegram
  let botInfo;
  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${botToken}/getMe`,
      { timeout: 8000 }
    );
    if (!response.data.ok) {
      throw new Error('Token Telegram invalide (api.telegram.org: ok=false)');
    }
    botInfo = response.data.result;
  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error('Token Telegram invalide ou révoqué.');
    }
    throw new Error(`Impossible de contacter l'API Telegram : ${err.message}`);
  }

  // Vérifier que ce bot n'est pas déjà enregistré
  const existing = tenantQueries.findByBotUsername(botInfo.username);
  if (existing && existing.status !== 'deleted') {
    throw new Error(`Le bot @${botInfo.username} est déjà utilisé par un autre tenant.`);
  }

  logger.info({ botUsername: botInfo.username, botId: botInfo.id }, 'Bot Telegram validé');
  return botInfo;
}

// ═══════════════════════════════════════
// CLONAGE DU TEMPLATE
// ═══════════════════════════════════════

async function cloneTemplate(tenantId) {
  mkdirSync(TENANTS_DIR, { recursive: true });
  const repoPath = join(TENANTS_DIR, tenantId);

  if (existsSync(repoPath)) {
    logger.warn({ tenantId, repoPath }, 'Tenant directory already exists, removing');
    rmSync(repoPath, { recursive: true, force: true });
  }

  logger.info({ tenantId, template: TEMPLATE_REPO_URL }, 'Cloning template repository');

  const git = simpleGit();
  await git.clone(TEMPLATE_REPO_URL, repoPath, ['--depth', '1']);

  // Supprimer le .git pour éviter de pousser accidentellement
  rmSync(join(repoPath, '.git'), { recursive: true, force: true });

  logger.info({ tenantId, repoPath }, 'Template cloned successfully');
  return repoPath;
}

// ═══════════════════════════════════════
// INJECTION DE CONFIGURATION
// ═══════════════════════════════════════

async function injectConfig(repoPath, config) {
  const {
    tenantId, botToken, adminTelegramId, companyName,
    theme, features, dbPath, sector, emoji,
  } = config;

  // 1. Générer le .env
  const envTemplatePath = join(repoPath, '.env.template');
  let envContent;

  if (existsSync(envTemplatePath)) {
    envContent = readFileSync(envTemplatePath, 'utf8');
  } else {
    // Template par défaut si non présent
    envContent = `BOT_TOKEN=\nADMIN_TELEGRAM_ID=\nTENANT_ID=\nDB_PATH=\nWEBHOOK_URL=\nMINI_APP_URL=\nTHEME_PRIMARY=\nTHEME_SECONDARY=\nTHEME_STYLE=\nTHEME_FONT=\nFEATURES_JSON=\nPLAN=\nCOMPANY_NAME=\nSECTOR=\nEMOJI=\nNODE_ENV=production\n`;
  }

  const envVariables = {
    BOT_TOKEN: botToken,
    ADMIN_TELEGRAM_ID: adminTelegramId,
    TENANT_ID: tenantId,
    DB_PATH: dbPath || `./data/${tenantId}.db`,
    WEBHOOK_URL: '',          // Sera mis à jour après déploiement
    MINI_APP_URL: '',         // Sera mis à jour après déploiement
    THEME_PRIMARY: theme.primary || '#0d9488',
    THEME_SECONDARY: theme.secondary || '#f59e0b',
    THEME_STYLE: theme.style || 'dark',
    THEME_FONT: theme.font || 'Sora',
    FEATURES_JSON: JSON.stringify(features || {}),
    PLAN: features.plan || 'starter',
    COMPANY_NAME: companyName,
    SECTOR: sector || 'colis',
    EMOJI: emoji || '🚚',
    NODE_ENV: 'production',
  };

  // Remplacer les variables dans le template
  let finalEnv = envContent;
  for (const [key, value] of Object.entries(envVariables)) {
    finalEnv = finalEnv.replace(
      new RegExp(`^${key}=.*$`, 'm'),
      `${key}=${value}`
    );
    // Ajouter si non présent
    if (!finalEnv.includes(`${key}=`)) {
      finalEnv += `\n${key}=${value}`;
    }
  }
  writeFileSync(join(repoPath, 'backend', '.env'), finalEnv);

  // 2. Générer le fichier de config tenant
  const tenantConfigContent = `/**
 * Tenant Configuration — Auto-generated
 * Tenant: ${tenantId}
 * Generated: ${new Date().toISOString()}
 */
export const TENANT_CONFIG = ${JSON.stringify({
    tenantId,
    companyName,
    sector,
    emoji,
    theme,
    features,
    plan: features.plan || 'starter',
  }, null, 2)};

export default TENANT_CONFIG;
`;
  const configDir = join(repoPath, 'backend', 'src', 'config');
  mkdirSync(configDir, { recursive: true });
  writeFileSync(join(configDir, 'tenant.js'), tenantConfigContent);

  // 3. Générer le CSS de thème
  const themeCSS = generateThemeCSS({
    primary: theme.primary,
    secondary: theme.secondary,
    style: theme.style,
    font: theme.font,
    tenantId,
    companyName,
  });

  const themeDir = join(repoPath, 'frontend', 'src', 'theme');
  mkdirSync(themeDir, { recursive: true });
  writeFileSync(join(themeDir, 'generated.css'), themeCSS);

  // 4. Générer la config features frontend
  const featuresConfigContent = `/**
 * Features Configuration — Auto-generated
 * Plan: ${features.plan || 'starter'}
 */
export const FEATURES = ${JSON.stringify(features, null, 2)};

export const PLAN = '${features.plan || 'starter'}';

export function isFeatureEnabled(featureKey) {
  return FEATURES[featureKey] === true;
}

export default FEATURES;
`;
  const frontendConfigDir = join(repoPath, 'frontend', 'src', 'config');
  mkdirSync(frontendConfigDir, { recursive: true });
  writeFileSync(join(frontendConfigDir, 'features.js'), featuresConfigContent);

  // 5. Package.json avec le nom du tenant
  const packagePath = join(repoPath, 'frontend', 'package.json');
  if (existsSync(packagePath)) {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    pkg.name = `logistma-${tenantId}`;
    writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
  }

  logger.info({ tenantId, repoPath }, 'Configuration injected');
}

// ═══════════════════════════════════════
// BUILD DU FRONTEND
// ═══════════════════════════════════════

async function buildFrontend(repoPath, tenantId) {
  const frontendPath = join(repoPath, 'frontend');

  if (!existsSync(frontendPath)) {
    logger.warn({ tenantId }, 'No frontend directory found, skipping build');
    return;
  }

  logger.info({ tenantId }, 'Building frontend');

  try {
    execSync('npm install --legacy-peer-deps', {
      cwd: frontendPath,
      stdio: 'pipe',
      timeout: 300000, // 5 min
    });

    execSync('npm run build', {
      cwd: frontendPath,
      stdio: 'pipe',
      timeout: 300000,
      env: { ...process.env, NODE_ENV: 'production' },
    });

    logger.info({ tenantId }, 'Frontend built successfully');
  } catch (err) {
    logger.error({ tenantId, err: err.message }, 'Frontend build failed');
    throw new Error(`Build frontend échoué : ${err.message}`);
  }
}

// ═══════════════════════════════════════
// WEBHOOK TELEGRAM
// ═══════════════════════════════════════

export async function setTelegramWebhook(botToken, webhookUrl, secret) {
  const response = await axios.post(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    {
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ['message', 'callback_query', 'inline_query', 'my_chat_member'],
      drop_pending_updates: true,
    },
    { timeout: 10000 }
  );

  if (!response.data.ok) {
    throw new Error(`Webhook Telegram: ${response.data.description}`);
  }

  logger.info({ webhookUrl }, 'Telegram webhook configured');
  return response.data;
}

// ═══════════════════════════════════════
// NOTIFICATION CLIENT
// ═══════════════════════════════════════

async function notifyClient(adminTelegramId, botToken, deployment, tenantConfig) {
  const factoryBotToken = process.env.FACTORY_BOT_TOKEN;
  if (!factoryBotToken) {
    logger.warn('FACTORY_BOT_TOKEN not set, skipping notification');
    return;
  }

  const message = `🎉 *Votre Mini App est prête !*

✅ Déploiement terminé avec succès.

📱 *Mini App Telegram :*
${deployment.frontendUrl}

⚙️ *API Backend :*
${deployment.backendUrl}

🤖 *Votre bot :* @${tenantConfig.botUsername}

*Prochaines étapes :*
1. Ouvrez votre bot sur Telegram
2. Configurez vos livreurs avec /adddriver
3. Créez votre première tournée avec /newroute

💡 _Gérez votre abonnement et vos paramètres depuis le panel Factory._

---
_LogisTMA Factory • ${new Date().toLocaleDateString('fr-FR')}_`;

  try {
    await axios.post(
      `https://api.telegram.org/bot${factoryBotToken}/sendMessage`,
      {
        chat_id: adminTelegramId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📱 Ouvrir la Mini App', url: deployment.frontendUrl },
            ],
            [
              { text: '⚙️ Panel de gestion', web_app: { url: process.env.FACTORY_FRONTEND_URL } },
            ],
          ],
        },
      },
      { timeout: 10000 }
    );
    logger.info({ adminTelegramId }, 'Client notified via factory bot');
  } catch (err) {
    logger.error({ err: err.message, adminTelegramId }, 'Failed to notify client');
    // Non-fatal : le déploiement est réussi même si la notification échoue
  }
}

// ═══════════════════════════════════════
// FONCTION PRINCIPALE DE PROVISIONNEMENT
// ═══════════════════════════════════════

/**
 * @param {Object} tenantConfig
 * @param {string} tenantConfig.companyName
 * @param {string} tenantConfig.botToken
 * @param {string} tenantConfig.adminId
 * @param {string} tenantConfig.sector
 * @param {string} tenantConfig.emoji
 * @param {string} tenantConfig.logo_base64
 * @param {Object} tenantConfig.theme - { primary, secondary, style, font }
 * @param {Object} tenantConfig.features - Map des features activées
 * @param {string} tenantConfig.plan - 'starter' | 'pro' | 'enterprise'
 * @param {string} deploymentId - ID du deployment existant pour polling
 */
export async function provisionTenant(tenantConfig, deploymentId) {
  const startTime = Date.now();
  let tenantId;
  let repoPath;

  const updateStep = async (step, status = 'deploying') => {
    if (deploymentId) {
      deploymentQueries.updateStep(deploymentId, step, status);
    }
    logger.info({ step, tenantId, deploymentId }, `Provisioning step: ${step}`);
  };

  const failDeployment = async (err, step) => {
    logger.error({ err: err.message, tenantId, step, deploymentId }, 'Provisioning failed');
    if (deploymentId) {
      deploymentQueries.setFailed(deploymentId, `[${step}] ${err.message}`);
    }
    if (tenantId) {
      tenantQueries.updateStatus(tenantId, 'suspended');
      auditQueries.log({
        tenant_id: tenantId,
        action: 'PROVISION_FAILED',
        actor_id: tenantConfig.adminId,
        actor_type: 'user',
        payload: { step, error: err.message },
      });
    }
    // Nettoyage du répertoire cloné
    if (repoPath && existsSync(repoPath)) {
      rmSync(repoPath, { recursive: true, force: true });
    }
    throw err;
  };

  try {
    // ─── ÉTAPE 1 : Générer Tenant ID ─────────────────────────────
    await updateStep('generating_id');
    tenantId = generateTenantId(tenantConfig.companyName);
    logger.info({ tenantId }, 'Tenant ID generated');

    // ─── ÉTAPE 2 : Valider le bot Telegram ──────────────────────
    await updateStep('validating_bot');
    let botInfo;
    try {
      botInfo = await validateTelegramBot(tenantConfig.botToken);
    } catch (err) {
      await failDeployment(err, 'validating_bot');
    }

    // ─── ÉTAPE 3 : Chiffrer le token & créer le tenant en BDD ───
    await updateStep('creating_tenant');
    const encrypted = encryptToken(tenantConfig.botToken);
    const webhookSecret = randomUUID();

    const tenant = tenantQueries.create({
      id: tenantId,
      name: tenantConfig.companyName,
      slug: tenantId,
      sector: tenantConfig.sector || 'colis',
      emoji: tenantConfig.emoji || '🚚',
      logo_base64: tenantConfig.logo_base64 || null,
      bot_token_encrypted: encrypted.encrypted,
      bot_token_iv: encrypted.iv,
      bot_token_tag: encrypted.tag,
      bot_username: botInfo.username,
      admin_tg_id: tenantConfig.adminId,
      plan: tenantConfig.plan || 'starter',
      status: 'deploying',
      theme_primary: tenantConfig.theme?.primary || '#0d9488',
      theme_secondary: tenantConfig.theme?.secondary || '#f59e0b',
      theme_style: tenantConfig.theme?.style || 'dark',
      theme_font: tenantConfig.theme?.font || 'Sora',
      features: tenantConfig.features || {},
      trial_ends_at: now() + 14 * 86400, // 14 jours d'essai
    });

    // Lier au deployment
    if (deploymentId) {
      const dep = deploymentQueries.findById(deploymentId);
      if (dep) {
        // Mettre à jour le tenant_id si pas encore associé
      }
    }

    // Créer l'entrée billing (essai gratuit)
    billingQueries.create({
      tenant_id: tenantId,
      plan: tenantConfig.plan || 'starter',
      status: 'trialing',
      amount_cents: { starter: 2900, pro: 7900, enterprise: 19900 }[tenantConfig.plan] || 2900,
    });

    auditQueries.log({
      tenant_id: tenantId,
      action: 'PROVISION_START',
      actor_id: tenantConfig.adminId,
      actor_type: 'user',
      payload: {
        companyName: tenantConfig.companyName,
        plan: tenantConfig.plan,
        botUsername: botInfo.username,
      },
    });

    // ─── ÉTAPE 4 : Cloner le template ────────────────────────────
    await updateStep('cloning_template');
    try {
      repoPath = await cloneTemplate(tenantId);
    } catch (err) {
      await failDeployment(err, 'cloning_template');
    }

    // ─── ÉTAPE 5 : Injecter la configuration ─────────────────────
    await updateStep('injecting_config');
    try {
      await injectConfig(repoPath, {
        tenantId,
        botToken: tenantConfig.botToken,
        adminTelegramId: tenantConfig.adminId,
        companyName: tenantConfig.companyName,
        theme: tenantConfig.theme || {},
        features: { ...(tenantConfig.features || {}), plan: tenantConfig.plan || 'starter' },
        dbPath: `./data/${tenantId}.db`,
        sector: tenantConfig.sector,
        emoji: tenantConfig.emoji,
      });
    } catch (err) {
      await failDeployment(err, 'injecting_config');
    }

    // ─── ÉTAPE 6 : Build frontend ─────────────────────────────────
    await updateStep('building');
    try {
      await buildFrontend(repoPath, tenantId);
    } catch (err) {
      // Non-fatal si le build échoue : Railway peut builder lui-même
      logger.warn({ err: err.message, tenantId }, 'Local frontend build failed, Railway will build');
    }

    // ─── ÉTAPE 7 : Déployer sur Railway ──────────────────────────
    await updateStep('deploying_railway');
    let railwayDeployment;
    try {
      railwayDeployment = await deployToRailway(repoPath, tenantId, {
        BOT_TOKEN: tenantConfig.botToken,
        ADMIN_TELEGRAM_ID: tenantConfig.adminId,
        TENANT_ID: tenantId,
        DB_PATH: `./data/${tenantId}.db`,
        WEBHOOK_URL: '', // Rempli après déploiement
        MINI_APP_URL: '',
        THEME_PRIMARY: tenantConfig.theme?.primary || '#0d9488',
        THEME_SECONDARY: tenantConfig.theme?.secondary || '#f59e0b',
        THEME_STYLE: tenantConfig.theme?.style || 'dark',
        THEME_FONT: tenantConfig.theme?.font || 'Sora',
        FEATURES_JSON: JSON.stringify(tenantConfig.features || {}),
        PLAN: tenantConfig.plan || 'starter',
        COMPANY_NAME: tenantConfig.companyName,
        WEBHOOK_SECRET: webhookSecret,
        NODE_ENV: 'production',
      });
    } catch (err) {
      await failDeployment(err, 'deploying_railway');
    }

    // ─── ÉTAPE 8 : Assigner sous-domaine ─────────────────────────
    await updateStep('configuring_dns');
    let domain = `${tenantId}.logistma.app`;
    try {
      await assignSubdomain(tenantId, railwayDeployment.frontendUrl);
      tenantQueries.updateDomain(tenantId, domain);
    } catch (err) {
      logger.warn({ err: err.message, tenantId }, 'Domain assignment failed, using Railway URL');
      domain = railwayDeployment.frontendUrl;
    }

    const finalFrontendUrl = `https://${domain}`;
    const finalBackendUrl = railwayDeployment.backendUrl;

    // ─── ÉTAPE 9 : Configurer webhook Telegram ───────────────────
    await updateStep('configuring_webhook');
    const webhookUrl = `${finalBackendUrl}/webhook/${tenantId}`;
    try {
      await setTelegramWebhook(tenantConfig.botToken, webhookUrl, webhookSecret);
    } catch (err) {
      logger.warn({ err: err.message, tenantId }, 'Webhook setup failed (non-fatal)');
    }

    // ─── ÉTAPE 10 : Tests automatiques ───────────────────────────
    await updateStep('running_tests');
    try {
      // Ping health check du backend
      await axios.get(`${finalBackendUrl}/health`, { timeout: 15000 });
      logger.info({ tenantId }, 'Backend health check passed');
    } catch (err) {
      logger.warn({ err: err.message, tenantId }, 'Health check failed (deployment may still be starting)');
    }

    // ─── ÉTAPE 11 : Sauvegarder le deployment ────────────────────
    await updateStep('saving', 'active');
    if (deploymentId) {
      deploymentQueries.updateUrls(deploymentId, {
        backendUrl: finalBackendUrl,
        frontendUrl: finalFrontendUrl,
        railwayProjectId: railwayDeployment.projectId,
        railwayBackendId: railwayDeployment.backendServiceId,
        railwayFrontendId: railwayDeployment.frontendServiceId,
      });
    }
    tenantQueries.updateStatus(tenantId, 'active');

    // ─── ÉTAPE 12 : Notifier le client ───────────────────────────
    await updateStep('notifying', 'active');
    await notifyClient(
      tenantConfig.adminId,
      tenantConfig.botToken,
      { frontendUrl: finalFrontendUrl, backendUrl: finalBackendUrl },
      { botUsername: botInfo.username }
    );

    // Nettoyage du répertoire local (les fichiers sont sur Railway)
    try {
      rmSync(repoPath, { recursive: true, force: true });
    } catch { /* Non-fatal */ }

    const duration = Math.round((Date.now() - startTime) / 1000);
    auditQueries.log({
      tenant_id: tenantId,
      action: 'PROVISION_COMPLETE',
      actor_id: tenantConfig.adminId,
      actor_type: 'user',
      payload: { duration, frontendUrl: finalFrontendUrl, backendUrl: finalBackendUrl },
    });

    logger.info({ tenantId, duration, frontendUrl: finalFrontendUrl }, 'Provisioning completed');

    return {
      tenantId,
      frontendUrl: finalFrontendUrl,
      backendUrl: finalBackendUrl,
      botUsername: botInfo.username,
      domain,
      duration,
    };

  } catch (err) {
    // Erreur non catchée par failDeployment (peu probable)
    logger.error({ err: err.message, tenantId, deploymentId }, 'Unexpected provisioning error');
    if (deploymentId) {
      deploymentQueries.setFailed(deploymentId, err.message);
    }
    throw err;
  }
}

/**
 * Lance le provisionnement en arrière-plan et retourne immédiatement.
 * Le statut peut être suivi via GET /status/:deploymentId
 */
export async function startProvisioningAsync(tenantConfig, adminTgId) {
  // Créer le deployment tracking record
  const deployment = deploymentQueries.create({
    tenant_id: 'pending', // Sera mis à jour
    webhook_secret: randomUUID(),
  });

  // Démarrer en arrière-plan (sans await)
  setImmediate(async () => {
    try {
      await provisionTenant(tenantConfig, deployment.id);
    } catch (err) {
      logger.error({ err: err.message, deploymentId: deployment.id }, 'Background provisioning error');
    }
  });

  return deployment;
}

export default { provisionTenant, startProvisioningAsync, validateTelegramBot, generateTenantId, encryptToken, decryptToken };
