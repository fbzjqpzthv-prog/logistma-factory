import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db;

export function getDb() {
  if (db) return db;
  const dbPath = process.env.FACTORY_DB_PATH || './data/factory.sqlite';
  db = createClient({ url: `file:${dbPath}` });
  initSchema();
  return db;
}

async function initSchema() {
  const schema = readFileSync(join(__dirname, 'factory-schema.sql'), 'utf8');
  const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try { await db.execute(stmt); } catch (_) {}
  }
}

// ── Tenant queries ────────────────────────────────
export const tenantQueries = {
  findById: async (id) => {
    const r = await getDb().execute({ sql: 'SELECT * FROM tenants WHERE id = ?', args: [id] });
    return r.rows[0] || null;
  },
  findByAdminId: async (adminId) => {
    const r = await getDb().execute({ sql: 'SELECT * FROM tenants WHERE admin_tg_id = ?', args: [adminId] });
    return r.rows;
  },
  create: async (data) => {
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO tenants (id, company_name, admin_tg_id, bot_token_encrypted, plan, status, config)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [data.id, data.company_name, data.admin_tg_id, data.bot_token_encrypted || '', data.plan || 'starter', data.status || 'pending', data.config || '{}']
    });
    return tenantQueries.findById(data.id);
  },
  update: async (id, data) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), id];
    await getDb().execute({ sql: `UPDATE tenants SET ${fields} WHERE id = ?`, args: values });
    return tenantQueries.findById(id);
  },
};

// ── Deployment queries ────────────────────────────
export const deploymentQueries = {
  findById: async (id) => {
    const r = await getDb().execute({ sql: 'SELECT * FROM deployments WHERE id = ?', args: [id] });
    return r.rows[0] || null;
  },
  create: async (data) => {
    await getDb().execute({
      sql: `INSERT INTO deployments (id, tenant_id, status, current_step, steps_completed, error_message)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [data.id, data.tenant_id || 'pending', data.status || 'pending', data.current_step || 'init', '[]', data.error_message || null]
    });
    return deploymentQueries.findById(data.id);
  },
  update: async (id, data) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    await getDb().execute({ sql: `UPDATE deployments SET ${fields} WHERE id = ?`, args: [...Object.values(data), id] });
  },
};

// ── Billing queries ───────────────────────────────
export const billingQueries = {
  upsert: async (data) => {
    try {
      await getDb().execute({
        sql: `INSERT OR REPLACE INTO billing (tenant_id, plan, status, amount_eur, charge_id, provider)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [data.tenant_id, data.plan, data.status, data.amount_eur, data.charge_id, data.provider || 'telegram']
      });
    } catch (_) {}
  },
};

// ── Audit queries ─────────────────────────────────
export const auditQueries = {
  log: async (tenantId, adminId, action, meta = {}) => {
    try {
      await getDb().execute({
        sql: `INSERT INTO audit_log (tenant_id, admin_id, action, meta) VALUES (?, ?, ?, ?)`,
        args: [tenantId, adminId, action, JSON.stringify(meta)]
      });
    } catch (_) {}
  },
  findByTenant: async (tenantId) => {
    try {
      const r = await getDb().execute({ sql: 'SELECT * FROM audit_log WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50', args: [tenantId] });
      return r.rows;
    } catch (_) { return []; }
  },
};

// ── Rate limit queries ────────────────────────────
export const rateLimitQueries = {
  check: async (key, maxRequests, windowSeconds) => {
    try {
      const db = getDb();
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - windowSeconds;
      await db.execute({ sql: `DELETE FROM rate_limits WHERE key = ? AND window_start < ?`, args: [key, windowStart] });
      const r = await db.execute({ sql: `SELECT count FROM rate_limits WHERE key = ?`, args: [key] });
      const current = r.rows[0]?.count || 0;
      if (current >= maxRequests) return { allowed: false };
      await db.execute({
        sql: `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1`,
        args: [key, now]
      });
      return { allowed: true };
    } catch (_) { return { allowed: true }; }
  },
};

export function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function now() {
  return new Date().toISOString();
}
export function getFeaturesForPlan(plan) {
  const features = {
    starter: { gps_tracking: true, notifications: true },
    pro: { gps_tracking: true, notifications: true, multi_drivers: true, photo_delivery: true, signature: true, csv_import: true },
    enterprise: { gps_tracking: true, notifications: true, multi_drivers: true, photo_delivery: true, signature: true, csv_import: true, analytics: true, api_webhooks: true, custom_domain: true, white_label: true },
  };
  return features[plan] || features.starter;
}