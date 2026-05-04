// ═══════════════════════════════════════════════════
// API Client — LogisTMA Factory
// ═══════════════════════════════════════════════════

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Telegram WebApp init data (auth header)
function getTgInitData() {
  return window.Telegram?.WebApp?.initData || '';
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': getTgInitData(),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur ${res.status}`);
  }
  return res.json();
}

// ─── Telegram Bot Validation ──────────────────────
// Appel direct à l'API Telegram (pas de proxy nécessaire — CORS ok)
export async function validateTelegramBot(token) {
  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.description || 'Token invalide');
  if (!json.result.is_bot) throw new Error("Cet utilisateur n'est pas un bot");
  return json.result; // { id, is_bot, first_name, username, can_join_groups, ... }
}

// ─── Deployment ───────────────────────────────────
export async function startDeployment(payload) {
  return request('/deploy', { method: 'POST', body: payload });
  // Returns: { deploymentId, botUsername, message }
}

export async function getDeployStatus(deploymentId) {
  return request(`/status/${deploymentId}`);
  // Returns: { id, status, currentStep, currentStepLabel, progress, steps[], frontendUrl, backendUrl, errorMessage }
}

// ─── Theme Preview ────────────────────────────────
export async function previewTheme(primary, secondary, style) {
  return request('/deploy/preview-theme', {
    method: 'POST',
    body: { primary, secondary, style },
  });
  // Returns: { cssVars: { ... } }
}

// ─── Billing ─────────────────────────────────────
export async function getPlans() {
  return request('/billing/plans');
  // Returns: { plans: [...] }
}

export async function createCheckoutSession(tenantId, plan, email) {
  return request('/billing/checkout', {
    method: 'POST',
    body: { tenantId, plan, email },
  });
  // Returns: { checkoutUrl, sessionId }
}

// ─── Tenant Management ───────────────────────────
export async function getTenant(tenantId) {
  return request(`/tenants/${tenantId}`);
}

export async function updateTheme(tenantId, theme) {
  return request(`/tenants/${tenantId}/theme`, {
    method: 'PATCH',
    body: { theme },
  });
}

export async function redeployTenant(tenantId) {
  return request(`/tenants/${tenantId}/redeploy`, { method: 'POST' });
}

export async function getBillingPortal(tenantId) {
  return request(`/tenants/${tenantId}/billing/portal`);
  // Returns: { portalUrl }
}
