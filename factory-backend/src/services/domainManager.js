/**
 * LogisTMA Factory — domainManager.js
 * Gestion des sous-domaines *.logistma.app via l'API Cloudflare.
 * Support domaines custom (Enterprise) avec vérification TXT.
 */

import axios from 'axios';
import { randomUUID } from 'crypto';
import { domainQueries, tenantQueries } from '../db/factory-db.js';
import logger from '../utils/logger.js';

const CF_API_URL = 'https://api.cloudflare.com/client/v4';
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const BASE_DOMAIN = 'logistma.app';

// ═══════════════════════════════════════
// CLIENT CLOUDFLARE
// ═══════════════════════════════════════

const cfClient = axios.create({
  baseURL: CF_API_URL,
  headers: {
    'Authorization': `Bearer ${CF_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

async function cfRequest(method, path, data = null) {
  if (!CF_API_TOKEN || CF_API_TOKEN === 'mock') {
    logger.warn({ path }, 'Cloudflare mock mode — no API token');
    return { success: true, result: { id: `mock-record-${Date.now()}` } };
  }

  try {
    const response = await cfClient({ method, url: path, data });
    if (!response.data.success) {
      const errors = response.data.errors?.map(e => e.message).join('; ');
      throw new Error(`Cloudflare API: ${errors}`);
    }
    return response.data;
  } catch (err) {
    logger.error({ err: err.message, path }, 'Cloudflare API error');
    throw err;
  }
}

// ═══════════════════════════════════════
// SOUS-DOMAINES AUTOMATIQUES
// ═══════════════════════════════════════

/**
 * Crée un enregistrement CNAME pour {tenantId}.logistma.app
 * pointant vers l'URL Railway.
 *
 * @param {string} tenantId
 * @param {string} railwayUrl - URL Railway (ex: app-tenant.up.railway.app)
 * @returns {string} L'URL finale du sous-domaine
 */
export async function assignSubdomain(tenantId, railwayUrl) {
  const subdomain = tenantId;
  const fullDomain = `${subdomain}.${BASE_DOMAIN}`;

  // Extraire le hostname de l'URL Railway
  let cnameTarget;
  try {
    cnameTarget = new URL(railwayUrl).hostname;
  } catch {
    cnameTarget = railwayUrl.replace(/^https?:\/\//, '');
  }

  logger.info({ tenantId, fullDomain, cnameTarget }, 'Creating Cloudflare CNAME record');

  // Vérifier si un enregistrement existe déjà
  const listResult = await cfRequest('GET', `/zones/${CF_ZONE_ID}/dns_records?type=CNAME&name=${fullDomain}`);
  const existing = listResult.result?.[0];

  let recordId;
  if (existing) {
    // Mettre à jour l'enregistrement existant
    await cfRequest('PUT', `/zones/${CF_ZONE_ID}/dns_records/${existing.id}`, {
      type: 'CNAME',
      name: fullDomain,
      content: cnameTarget,
      ttl: 1,      // Auto TTL
      proxied: true, // Cloudflare proxy pour HTTPS automatique
    });
    recordId = existing.id;
    logger.info({ tenantId, fullDomain, recordId }, 'CNAME record updated');
  } else {
    // Créer un nouvel enregistrement
    const createResult = await cfRequest('POST', `/zones/${CF_ZONE_ID}/dns_records`, {
      type: 'CNAME',
      name: fullDomain,
      content: cnameTarget,
      ttl: 1,
      proxied: true,
    });
    recordId = createResult.result.id;
    logger.info({ tenantId, fullDomain, recordId }, 'CNAME record created');
  }

  return `https://${fullDomain}`;
}

/**
 * Supprime l'enregistrement DNS d'un tenant
 */
export async function removeSubdomain(tenantId) {
  const fullDomain = `${tenantId}.${BASE_DOMAIN}`;

  const listResult = await cfRequest('GET', `/zones/${CF_ZONE_ID}/dns_records?name=${fullDomain}`);
  const records = listResult.result || [];

  for (const record of records) {
    await cfRequest('DELETE', `/zones/${CF_ZONE_ID}/dns_records/${record.id}`);
    logger.info({ tenantId, fullDomain, recordId: record.id }, 'DNS record deleted');
  }
}

// ═══════════════════════════════════════
// DOMAINES CUSTOM (ENTERPRISE)
// ═══════════════════════════════════════

/**
 * Initie la vérification d'un domaine custom.
 * Génère un enregistrement TXT que le client doit ajouter.
 *
 * @param {string} tenantId
 * @param {string} domain - Le domaine custom (ex: livraison.monentreprise.fr)
 * @returns {Object} { txtRecord, verificationValue }
 */
export async function initiateCustomDomainVerification(tenantId, domain) {
  // Générer une valeur de vérification unique
  const verificationValue = `logistma-verify=${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const txtRecord = `_logistma-verify.${domain}`;

  // Enregistrer en base
  domainQueries.create(tenantId, domain, verificationValue);

  logger.info({ tenantId, domain, txtRecord, verificationValue }, 'Domain verification initiated');

  return {
    domain,
    txtRecord,
    verificationValue,
    instructions: `Ajoutez cet enregistrement TXT dans votre DNS :\n\nNom: ${txtRecord}\nValeur: ${verificationValue}\n\nLa propagation DNS peut prendre jusqu'à 48h.`,
  };
}

/**
 * Vérifie qu'un domaine custom a bien l'enregistrement TXT attendu.
 * Si valide, configure le CNAME et le certificat SSL via Cloudflare.
 *
 * @param {string} tenantId
 * @param {string} domain
 * @returns {boolean} Vérifié ou non
 */
export async function verifyCustomDomain(tenantId, domain) {
  const verification = domainQueries.findByTenantAndDomain(tenantId, domain);
  if (!verification) {
    throw new Error(`Aucune vérification initiée pour ${domain}`);
  }

  const txtRecord = `_logistma-verify.${domain}`;

  // Vérifier l'enregistrement TXT via DNS-over-HTTPS (Cloudflare)
  try {
    const response = await axios.get('https://cloudflare-dns.com/dns-query', {
      params: { name: txtRecord, type: 'TXT' },
      headers: { 'Accept': 'application/dns-json' },
      timeout: 10000,
    });

    const answers = response.data.Answer || [];
    const hasRecord = answers.some(a =>
      a.data?.replace(/"/g, '') === verification.txt_record
    );

    if (!hasRecord) {
      logger.info({ tenantId, domain, txtRecord }, 'TXT record not found yet');
      return false;
    }
  } catch (err) {
    logger.warn({ err: err.message, domain }, 'DNS verification check failed');
    return false;
  }

  // DNS validé — Configurer sur Cloudflare
  logger.info({ tenantId, domain }, 'Domain TXT verified, configuring Cloudflare');

  // Obtenir l'URL Railway/backend du tenant
  const tenant = tenantQueries.findById(tenantId);

  // Créer un Custom Hostname sur Cloudflare (SSL universel)
  let cfRecordId = null;
  try {
    const customHostnameResult = await cfRequest('POST', `/zones/${CF_ZONE_ID}/custom_hostnames`, {
      hostname: domain,
      ssl: {
        method: 'http',
        type: 'dv',
        settings: { min_tls_version: '1.2', ciphers: ['ECDHE-RSA-AES128-GCM-SHA256'] },
        wildcard: false,
        custom_certificate: null,
        custom_key: null,
      },
      custom_metadata: { tenant_id: tenantId },
    });
    cfRecordId = customHostnameResult.result?.id;
    logger.info({ tenantId, domain, cfRecordId }, 'Custom hostname created on Cloudflare');
  } catch (err) {
    logger.warn({ err: err.message, domain }, 'Custom hostname creation failed (may already exist)');
  }

  // Créer l'enregistrement CNAME pour le domaine custom
  const cnameTarget = `${tenantId}.${BASE_DOMAIN}`;
  try {
    await cfRequest('POST', `/zones/${CF_ZONE_ID}/dns_records`, {
      type: 'CNAME',
      name: domain,
      content: cnameTarget,
      ttl: 3600,
      proxied: false, // Le domaine est externe, on ne peut pas proxier directement
    });
  } catch {
    // Peut déjà exister
  }

  // Marquer comme vérifié en base
  domainQueries.markVerified(tenantId, domain, cfRecordId);

  // Mettre à jour le tenant
  tenantQueries.updateDomain(tenantId, domain);
  const db = (await import('../db/factory-db.js')).getDb();
  db.prepare('UPDATE tenants SET custom_domain = ?, custom_domain_verified = 1 WHERE id = ?')
    .run(domain, tenantId);

  logger.info({ tenantId, domain }, 'Custom domain verified and configured');
  return true;
}

/**
 * Vérifie périodiquement les domaines en attente (appelé par cron)
 */
export async function checkPendingDomainVerifications() {
  const db = (await import('../db/factory-db.js')).getDb();
  const pending = db.prepare(`
    SELECT dv.*, t.id as tenant_id 
    FROM domain_verifications dv
    JOIN tenants t ON t.id = dv.tenant_id
    WHERE dv.verified = 0
    AND dv.created_at > unixepoch() - 86400 * 7  -- Max 7 jours
  `).all();

  logger.info({ count: pending.length }, 'Checking pending domain verifications');

  for (const verification of pending) {
    try {
      const verified = await verifyCustomDomain(verification.tenant_id, verification.domain);
      if (verified) {
        logger.info({ tenantId: verification.tenant_id, domain: verification.domain }, 'Domain auto-verified');
      }
    } catch (err) {
      logger.warn({ err: err.message, domain: verification.domain }, 'Domain verification check error');
    }

    // Pause entre vérifications pour éviter rate limiting DNS
    await new Promise(r => setTimeout(r, 500));
  }
}

/**
 * Liste les sous-domaines actifs (pour diagnostics)
 */
export async function listActiveDNSRecords() {
  const result = await cfRequest('GET', `/zones/${CF_ZONE_ID}/dns_records?per_page=100`);
  return result.result || [];
}

export default {
  assignSubdomain,
  removeSubdomain,
  initiateCustomDomainVerification,
  verifyCustomDomain,
  checkPendingDomainVerifications,
  listActiveDNSRecords,
};
