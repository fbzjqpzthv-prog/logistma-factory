-- LogisTMA Factory — Schema SQL complet
-- SQLite avec extensions modernes

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- ═══════════════════════════════════════
-- TABLE : tenants
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS tenants (
  id                    TEXT PRIMARY KEY,                    -- 'rapid-courses-fr-a3f2'
  name                  TEXT NOT NULL,                       -- 'Rapid Courses FR'
  slug                  TEXT NOT NULL UNIQUE,                -- 'rapid-courses-fr'
  sector                TEXT NOT NULL DEFAULT 'colis',       -- 'colis'|'alimentaire'|'pharmacie'|'fleurs'|'autre'
  emoji                 TEXT NOT NULL DEFAULT '🚚',
  logo_base64           TEXT,                                -- Logo encodé base64
  bot_token_encrypted   TEXT NOT NULL,                       -- AES-256-GCM chiffré
  bot_token_iv          TEXT NOT NULL,                       -- IV pour déchiffrement
  bot_token_tag         TEXT NOT NULL,                       -- Auth tag GCM
  bot_username          TEXT,                                -- @username du bot
  admin_tg_id           TEXT NOT NULL,                       -- Telegram ID du gérant
  plan                  TEXT NOT NULL DEFAULT 'starter',     -- 'starter'|'pro'|'enterprise'
  status                TEXT NOT NULL DEFAULT 'pending',     -- 'pending'|'deploying'|'active'|'suspended'|'deleted'
  theme_primary         TEXT NOT NULL DEFAULT '#0d9488',
  theme_secondary       TEXT NOT NULL DEFAULT '#f59e0b',
  theme_style           TEXT NOT NULL DEFAULT 'dark',        -- 'dark'|'light'|'vibrant'
  theme_font            TEXT NOT NULL DEFAULT 'Sora',
  features_json         TEXT NOT NULL DEFAULT '{}',          -- JSON des features activées
  domain                TEXT,                                -- sous-domaine assigné
  custom_domain         TEXT,                                -- domaine custom (enterprise)
  custom_domain_verified INTEGER NOT NULL DEFAULT 0,
  trial_ends_at         INTEGER,                             -- timestamp Unix
  created_at            INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at            INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_admin ON tenants(admin_tg_id);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);

-- ═══════════════════════════════════════
-- TABLE : deployments
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS deployments (
  id                    TEXT PRIMARY KEY,
  tenant_id             TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  railway_project_id    TEXT,
  railway_service_backend_id  TEXT,
  railway_service_frontend_id TEXT,
  backend_url           TEXT,
  frontend_url          TEXT,
  webhook_secret        TEXT,                                -- Secret unique pour ce tenant
  status                TEXT NOT NULL DEFAULT 'pending',    -- 'pending'|'cloning'|'building'|'deploying'|'configuring'|'testing'|'active'|'failed'
  current_step          TEXT NOT NULL DEFAULT 'init',
  steps_completed       TEXT NOT NULL DEFAULT '[]',         -- JSON array des étapes terminées
  error_message         TEXT,
  deployed_at           INTEGER,
  created_at            INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at            INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_deployments_tenant ON deployments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);

-- ═══════════════════════════════════════
-- TABLE : billing
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS billing (
  id                      TEXT PRIMARY KEY,
  tenant_id               TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  stripe_payment_method   TEXT,
  plan                    TEXT NOT NULL DEFAULT 'starter',
  status                  TEXT NOT NULL DEFAULT 'trialing', -- 'trialing'|'active'|'past_due'|'canceled'|'unpaid'
  current_period_start    INTEGER,
  current_period_end      INTEGER,
  cancel_at_period_end    INTEGER NOT NULL DEFAULT 0,
  amount_cents            INTEGER NOT NULL DEFAULT 2900,    -- En centimes
  currency                TEXT NOT NULL DEFAULT 'eur',
  created_at              INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at              INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_billing_tenant ON billing(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_stripe_customer ON billing(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_stripe_sub ON billing(stripe_subscription_id);

-- ═══════════════════════════════════════
-- TABLE : usage_metrics
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS usage_metrics (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month             TEXT NOT NULL,                          -- '2025-01'
  stops_count       INTEGER NOT NULL DEFAULT 0,
  drivers_count     INTEGER NOT NULL DEFAULT 0,
  api_calls         INTEGER NOT NULL DEFAULT 0,
  storage_bytes     INTEGER NOT NULL DEFAULT 0,
  recorded_at       INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, month)
);

CREATE INDEX IF NOT EXISTS idx_usage_tenant ON usage_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_month ON usage_metrics(month);

-- ═══════════════════════════════════════
-- TABLE : audit_log
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,   -- 'DEPLOY_START'|'DEPLOY_COMPLETE'|'PLAN_UPGRADE'|'BOT_TOKEN_UPDATED'|...
  actor_id    TEXT,            -- Telegram ID ou 'system'
  actor_type  TEXT NOT NULL DEFAULT 'user',   -- 'user'|'system'|'webhook'
  payload     TEXT NOT NULL DEFAULT '{}',     -- JSON des données associées
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- ═══════════════════════════════════════
-- TABLE : domain_verifications
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS domain_verifications (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain        TEXT NOT NULL,
  txt_record    TEXT NOT NULL,                            -- Valeur TXT à ajouter en DNS
  cf_record_id  TEXT,                                    -- ID record Cloudflare
  verified      INTEGER NOT NULL DEFAULT 0,
  verified_at   INTEGER,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, domain)
);

-- ═══════════════════════════════════════
-- TABLE : rate_limits
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS rate_limits (
  key         TEXT PRIMARY KEY,   -- 'deploy:ip:1.2.3.4' ou 'api:tenantId'
  count       INTEGER NOT NULL DEFAULT 1,
  window_end  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Trigger : updated_at automatique
CREATE TRIGGER IF NOT EXISTS tenants_updated_at
  AFTER UPDATE ON tenants
  BEGIN
    UPDATE tenants SET updated_at = unixepoch() WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS deployments_updated_at
  AFTER UPDATE ON deployments
  BEGIN
    UPDATE deployments SET updated_at = unixepoch() WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS billing_updated_at
  AFTER UPDATE ON billing
  BEGIN
    UPDATE billing SET updated_at = unixepoch() WHERE id = NEW.id;
  END;
