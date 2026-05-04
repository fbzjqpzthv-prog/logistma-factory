/**
 * LogisTMA Factory — factory-db.js
 * Module de base de données SQLite pour la plateforme factory.
 * Utilise better-sqlite3 (synchrone, performant, idéal pour SQLite).
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, 'factory-schema.sql');
const DB_PATH = process.env.FACTORY_DB_PATH || './data/factory.db';

let _db = null;

/**
 * Initialise et retourne l'instance SQLite singleton.
 * Crée le répertoire de données si nécessaire, applique le schema.
 */
export function getDb() {
  if (_db) return _db;

  // Créer le répertoire data/ si nécessaire
  const dir = dirname(DB_PATH);
  mkdirSync(dir, { recursive: true });

  _db = new Database(DB_PATH, {
    // verbose: process.env.NODE_ENV === 'development' ? console.log : null,
  });

  // Optimisations SQLite
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('cache_size = -32000'); // 32MB cache
  _db.pragma('temp_store = MEMORY');

  // Appliquer le schema
  const schema = readFileSync(SCHEMA_PATH, 'utf8');
  _db.exec(schema);

  logger.info({ db: DB_PATH }, 'Factory database initialized');

  // Fermeture propre
  process.on('exit', () => _db?.close());
  process.on('SIGINT', () => { _db?.close(); process.exit(0); });
  process.on('SIGTERM', () => { _db?.close(); process.exit(0); });

  return _db;
}

// ═══════════════════════════════════════
// HELPERS GÉNÉRIQUES
// ═══════════════════════════════════════

/** Génère un ID unique avec préfixe optionnel */
export function newId(prefix = '') {
  const uuid = randomUUID().replace(/-/g, '').slice(0, 16);
  return prefix ? `${prefix}_${uuid}` : uuid;
}

/** Timestamp Unix courant */
export function now() {
  return Math.floor(Date.now() / 1000);
}

// ═══════════════════════════════════════
// TENANTS
// ═══════════════════════════════════════

export const tenantQueries = {
  /** Créer un tenant */
  create(data) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO tenants (
        id, name, slug, sector, emoji, logo_base64,
        bot_token_encrypted, bot_token_iv, bot_token_tag,
        bot_username, admin_tg_id, plan, status,
        theme_primary, theme_secondary, theme_style, theme_font,
        features_json, domain, trial_ends_at
      ) VALUES (
        @id, @name, @slug, @sector, @emoji, @logo_base64,
        @bot_token_encrypted, @bot_token_iv, @bot_token_tag,
        @bot_username, @admin_tg_id, @plan, @status,
        @theme_primary, @theme_secondary, @theme_style, @theme_font,
        @features_json, @domain, @trial_ends_at
      )
    `);
    stmt.run({
      id: data.id,
      name: data.name,
      slug: data.slug,
      sector: data.sector || 'colis',
      emoji: data.emoji || '🚚',
      logo_base64: data.logo_base64 || null,
      bot_token_encrypted: data.bot_token_encrypted,
      bot_token_iv: data.bot_token_iv,
      bot_token_tag: data.bot_token_tag,
      bot_username: data.bot_username || null,
      admin_tg_id: data.admin_tg_id,
      plan: data.plan || 'starter',
      status: data.status || 'pending',
      theme_primary: data.theme_primary || '#0d9488',
      theme_secondary: data.theme_secondary || '#f59e0b',
      theme_style: data.theme_style || 'dark',
      theme_font: data.theme_font || 'Sora',
      features_json: JSON.stringify(data.features || {}),
      domain: data.domain || null,
      trial_ends_at: data.trial_ends_at || null,
    });
    return this.findById(data.id);
  },

  findById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
  },

  findBySlug(slug) {
    const db = getDb();
    return db.prepare('SELECT * FROM tenants WHERE slug = ?').get(slug);
  },

  findByAdminId(adminTgId) {
    const db = getDb();
    return db.prepare('SELECT * FROM tenants WHERE admin_tg_id = ?').all(adminTgId);
  },

  findByBotUsername(botUsername) {
    const db = getDb();
    return db.prepare('SELECT * FROM tenants WHERE bot_username = ?').get(botUsername);
  },

  updateStatus(id, status) {
    const db = getDb();
    db.prepare('UPDATE tenants SET status = ? WHERE id = ?').run(status, id);
  },

  updatePlan(id, plan) {
    const db = getDb();
    db.prepare('UPDATE tenants SET plan = ?, features_json = ? WHERE id = ?')
      .run(plan, JSON.stringify(getFeaturesForPlan(plan)), id);
  },

  updateTheme(id, theme) {
    const db = getDb();
    db.prepare(`
      UPDATE tenants 
      SET theme_primary = @primary, theme_secondary = @secondary,
          theme_style = @style, theme_font = @font
      WHERE id = @id
    `).run({ id, primary: theme.primary, secondary: theme.secondary, style: theme.style, font: theme.font });
  },

  updateDomain(id, domain) {
    const db = getDb();
    db.prepare('UPDATE tenants SET domain = ? WHERE id = ?').run(domain, id);
  },

  list(options = {}) {
    const db = getDb();
    const { status, plan, limit = 100, offset = 0 } = options;
    let query = 'SELECT * FROM tenants WHERE 1=1';
    const params = [];
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (plan) { query += ' AND plan = ?'; params.push(plan); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    return db.prepare(query).all(...params);
  },

  count() {
    const db = getDb();
    return db.prepare('SELECT COUNT(*) as n FROM tenants').get().n;
  },
};

// ═══════════════════════════════════════
// DEPLOYMENTS
// ═══════════════════════════════════════

export const deploymentQueries = {
  create(data) {
    const db = getDb();
    const id = newId('dep');
    db.prepare(`
      INSERT INTO deployments (id, tenant_id, status, current_step, webhook_secret)
      VALUES (?, ?, 'pending', 'init', ?)
    `).run(id, data.tenant_id, data.webhook_secret || randomUUID());
    return this.findById(id);
  },

  findById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM deployments WHERE id = ?').get(id);
  },

  findLatestByTenant(tenantId) {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM deployments WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(tenantId);
  },

  findActiveByTenant(tenantId) {
    const db = getDb();
    return db.prepare(
      "SELECT * FROM deployments WHERE tenant_id = ? AND status = 'active'"
    ).get(tenantId);
  },

  updateStep(id, step, status) {
    const db = getDb();
    const dep = this.findById(id);
    if (!dep) return;
    const steps = JSON.parse(dep.steps_completed || '[]');
    if (!steps.includes(step)) steps.push(step);
    db.prepare(`
      UPDATE deployments 
      SET current_step = ?, steps_completed = ?, status = ?
      WHERE id = ?
    `).run(step, JSON.stringify(steps), status || dep.status, id);
  },

  updateUrls(id, { backendUrl, frontendUrl, railwayProjectId, railwayBackendId, railwayFrontendId }) {
    const db = getDb();
    db.prepare(`
      UPDATE deployments 
      SET backend_url = ?, frontend_url = ?,
          railway_project_id = ?, railway_service_backend_id = ?,
          railway_service_frontend_id = ?, status = 'active',
          deployed_at = unixepoch()
      WHERE id = ?
    `).run(backendUrl, frontendUrl, railwayProjectId, railwayBackendId, railwayFrontendId, id);
  },

  setFailed(id, errorMessage) {
    const db = getDb();
    db.prepare("UPDATE deployments SET status = 'failed', error_message = ? WHERE id = ?")
      .run(errorMessage, id);
  },
};

// ═══════════════════════════════════════
// BILLING
// ═══════════════════════════════════════

export const billingQueries = {
  create(data) {
    const db = getDb();
    const id = newId('bil');
    db.prepare(`
      INSERT INTO billing (id, tenant_id, stripe_customer_id, stripe_subscription_id, plan, status, amount_cents)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.tenant_id, data.stripe_customer_id || null,
      data.stripe_subscription_id || null,
      data.plan || 'starter', data.status || 'trialing',
      data.amount_cents || 2900
    );
    return this.findByTenant(data.tenant_id);
  },

  findByTenant(tenantId) {
    const db = getDb();
    return db.prepare('SELECT * FROM billing WHERE tenant_id = ?').get(tenantId);
  },

  findByStripeCustomer(customerId) {
    const db = getDb();
    return db.prepare('SELECT * FROM billing WHERE stripe_customer_id = ?').get(customerId);
  },

  findByStripeSubscription(subId) {
    const db = getDb();
    return db.prepare('SELECT * FROM billing WHERE stripe_subscription_id = ?').get(subId);
  },

  updateSubscription(tenantId, data) {
    const db = getDb();
    db.prepare(`
      UPDATE billing 
      SET stripe_subscription_id = @subId, plan = @plan, status = @status,
          current_period_start = @periodStart, current_period_end = @periodEnd,
          cancel_at_period_end = @cancelAtPeriodEnd, amount_cents = @amountCents
      WHERE tenant_id = @tenantId
    `).run({
      tenantId,
      subId: data.stripe_subscription_id,
      plan: data.plan,
      status: data.status,
      periodStart: data.current_period_start,
      periodEnd: data.current_period_end,
      cancelAtPeriodEnd: data.cancel_at_period_end ? 1 : 0,
      amountCents: data.amount_cents,
    });
  },

  /** Retourne les abonnements expirant dans les 3 prochains jours */
  findExpiringSoon() {
    const db = getDb();
    const inThreeDays = now() + 3 * 86400;
    return db.prepare(
      "SELECT b.*, t.admin_tg_id, t.name FROM billing b JOIN tenants t ON t.id = b.tenant_id WHERE b.current_period_end <= ? AND b.status = 'active'"
    ).all(inThreeDays);
  },
};

// ═══════════════════════════════════════
// USAGE METRICS
// ═══════════════════════════════════════

export const usageQueries = {
  increment(tenantId, field, amount = 1) {
    const db = getDb();
    const month = new Date().toISOString().slice(0, 7); // '2025-01'
    const id = newId('uso');
    db.prepare(`
      INSERT INTO usage_metrics (id, tenant_id, month, ${field})
      VALUES (?, ?, ?, ?)
      ON CONFLICT(tenant_id, month)
      DO UPDATE SET ${field} = ${field} + excluded.${field}
    `).run(id, tenantId, month, amount);
  },

  findByMonth(tenantId, month) {
    const db = getDb();
    return db.prepare('SELECT * FROM usage_metrics WHERE tenant_id = ? AND month = ?').get(tenantId, month);
  },

  findCurrentMonth(tenantId) {
    const month = new Date().toISOString().slice(0, 7);
    return this.findByMonth(tenantId, month);
  },

  findHistory(tenantId, limit = 12) {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM usage_metrics WHERE tenant_id = ? ORDER BY month DESC LIMIT ?'
    ).all(tenantId, limit);
  },
};

// ═══════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════

export const auditQueries = {
  log(data) {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_log (id, tenant_id, action, actor_id, actor_type, payload, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId('aud'),
      data.tenant_id || null,
      data.action,
      data.actor_id || 'system',
      data.actor_type || 'system',
      JSON.stringify(data.payload || {}),
      data.ip_address || null,
      data.user_agent || null
    );
  },

  findByTenant(tenantId, limit = 50) {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM audit_log WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(tenantId, limit);
  },

  findByAction(action, limit = 100) {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM audit_log WHERE action = ? ORDER BY created_at DESC LIMIT ?'
    ).all(action, limit);
  },
};

// ═══════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════

export const rateLimitQueries = {
  /** Vérifie et incrémente le compteur. Retourne true si autorisé. */
  check(key, maxCount, windowSeconds) {
    const db = getDb();
    const current = now();

    // Nettoyage des fenêtres expirées
    db.prepare('DELETE FROM rate_limits WHERE window_end < ?').run(current);

    const existing = db.prepare('SELECT * FROM rate_limits WHERE key = ?').get(key);

    if (!existing) {
      db.prepare(
        'INSERT INTO rate_limits (key, count, window_end) VALUES (?, 1, ?)'
      ).run(key, current + windowSeconds);
      return { allowed: true, count: 1, remaining: maxCount - 1 };
    }

    if (existing.count >= maxCount) {
      return {
        allowed: false,
        count: existing.count,
        remaining: 0,
        resetAt: existing.window_end,
      };
    }

    db.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').run(key);
    return {
      allowed: true,
      count: existing.count + 1,
      remaining: maxCount - existing.count - 1,
    };
  },

  reset(key) {
    const db = getDb();
    db.prepare('DELETE FROM rate_limits WHERE key = ?').run(key);
  },
};

// ═══════════════════════════════════════
// DOMAIN VERIFICATIONS
// ═══════════════════════════════════════

export const domainQueries = {
  create(tenantId, domain, txtRecord) {
    const db = getDb();
    const id = newId('dom');
    db.prepare(`
      INSERT INTO domain_verifications (id, tenant_id, domain, txt_record)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(tenant_id, domain) DO UPDATE SET txt_record = excluded.txt_record
    `).run(id, tenantId, domain, txtRecord);
    return this.findByTenantAndDomain(tenantId, domain);
  },

  findByTenantAndDomain(tenantId, domain) {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM domain_verifications WHERE tenant_id = ? AND domain = ?'
    ).get(tenantId, domain);
  },

  markVerified(tenantId, domain, cfRecordId) {
    const db = getDb();
    db.prepare(`
      UPDATE domain_verifications 
      SET verified = 1, verified_at = unixepoch(), cf_record_id = ?
      WHERE tenant_id = ? AND domain = ?
    `).run(cfRecordId || null, tenantId, domain);
  },
};

// ═══════════════════════════════════════
// UTILS INTERNES
// ═══════════════════════════════════════

function getFeaturesForPlan(plan) {
  const FEATURES = {
    starter: {
      gps_tracking: true,
      client_notifications: true,
      multi_driver: false,
      delivery_photos: false,
      signature: false,
      csv_import: false,
      analytics: false,
      api_webhooks: false,
      white_label: false,
      custom_domain: false,
    },
    pro: {
      gps_tracking: true,
      client_notifications: true,
      multi_driver: true,
      delivery_photos: true,
      signature: true,
      csv_import: true,
      analytics: false,
      api_webhooks: false,
      white_label: false,
      custom_domain: false,
    },
    enterprise: {
      gps_tracking: true,
      client_notifications: true,
      multi_driver: true,
      delivery_photos: true,
      signature: true,
      csv_import: true,
      analytics: true,
      api_webhooks: true,
      white_label: true,
      custom_domain: true,
    },
  };
  return FEATURES[plan] || FEATURES.starter;
}

export { getFeaturesForPlan };
export default { getDb, tenantQueries, deploymentQueries, billingQueries, usageQueries, auditQueries, rateLimitQueries, domainQueries };
