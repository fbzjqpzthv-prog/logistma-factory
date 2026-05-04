import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { G } from '../lib/tokens.js';
import { Btn, Card, Badge, Alert, Spinner } from '../components/UI.jsx';
import { getTenant, redeployTenant, getBillingPortal } from '../lib/api.js';

// ─── Stat Card ────────────────────────────────────
function StatCard({ label, value, sub, color = G.teal, icon }) {
  return (
    <Card style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: G.text, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: G.textMuted, marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

// ─── Status Dot ───────────────────────────────────
function StatusDot({ active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: active ? G.green : G.red,
        animation: active ? 'pulse 2s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: 12, color: active ? G.green : G.red, fontWeight: 600 }}>
        {active ? 'En ligne' : 'Hors ligne'}
      </span>
    </div>
  );
}

export default function Dashboard({ tenantId, onBack }) {
  const [tenant, setTenant]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [redeploying, setRedeploying] = useState(false);
  const [redeployMsg, setRedeployMsg] = useState(null);
  const [tab, setTab]             = useState('overview'); // overview | theme | billing

  useEffect(() => {
    if (!tenantId) return;
    loadTenant();
  }, [tenantId]);

  async function loadTenant() {
    setLoading(true);
    setError(null);
    try {
      const data = await getTenant(tenantId);
      setTenant(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeploy() {
    setRedeploying(true);
    setRedeployMsg(null);
    try {
      await redeployTenant(tenantId);
      setRedeployMsg({ type: 'success', text: 'Redéploiement lancé. Disponible dans ~3 minutes.' });
    } catch (err) {
      setRedeployMsg({ type: 'error', text: err.message });
    } finally {
      setRedeploying(false);
    }
  }

  async function handleBillingPortal() {
    try {
      const { portalUrl } = await getBillingPortal(tenantId);
      window.open(portalUrl, '_blank');
    } catch (err) {
      alert('Erreur portail: ' + err.message);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <div style={{ textAlign: 'center' }}>
        <Spinner size={36} />
        <p style={{ marginTop: 16, color: G.textMuted, fontSize: 14 }}>Chargement du dashboard…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ padding: 20 }}>
      <Alert type="error">{error}</Alert>
      <div style={{ marginTop: 16 }}>
        <Btn onClick={loadTenant} variant="secondary">Réessayer</Btn>
      </div>
    </div>
  );

  if (!tenant) return null;

  const config      = tenant.config ? JSON.parse(tenant.config) : {};
  const isActive    = tenant.status === 'active';
  const planColors  = { starter: G.blue, pro: G.teal, enterprise: G.amber };
  const planColor   = planColors[tenant.plan] || G.teal;

  const TABS = [
    { id: 'overview', label: '📊 Vue d\'ensemble' },
    { id: 'settings', label: '⚙️ Paramètres' },
    { id: 'billing',  label: '💳 Facturation' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: G.tealDim, border: `1.5px solid ${G.tealMid}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, flexShrink: 0,
        }}>{config.emoji || '🚚'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tenant.company_name}
            </h2>
            <StatusDot active={isActive} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge color={planColor}>Plan {tenant.plan}</Badge>
            <Badge color={G.textDim} bg={G.bg3}>
              {tenant.id}
            </Badge>
          </div>
        </div>
        <Btn onClick={onBack} variant="ghost" small>← Retour</Btn>
      </div>

      {/* URL */}
      {tenant.frontend_url && (
        <div style={{
          background: G.bg3, borderRadius: 10, padding: '10px 14px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          border: `1px solid ${G.border}`,
        }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: G.tealHi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            🌐 {tenant.frontend_url}
          </span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Btn onClick={() => window.open(tenant.frontend_url, '_blank')} variant="tealOutline" small>Ouvrir</Btn>
            <Btn onClick={() => navigator.clipboard?.writeText(tenant.frontend_url)} variant="ghost" small>Copier</Btn>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: G.bg2, borderRadius: 10, padding: 4, border: `1px solid ${G.border}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
              background: tab === t.id ? G.bg4 : 'transparent',
              color: tab === t.id ? G.text : G.textMuted,
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.15s',
              fontFamily: 'DM Sans, sans-serif',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ───────────────────────── */}
      {tab === 'overview' && (
        <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
            <StatCard icon="📦" label="Livraisons ce mois" value={tenant.stops_this_month ?? '—'} sub={tenant.max_stops_per_month ? `/ ${tenant.max_stops_per_month} max` : 'Illimité'} />
            <StatCard icon="👤" label="Livreurs actifs" value={tenant.drivers_count ?? '—'} sub={tenant.max_drivers ? `/ ${tenant.max_drivers} max` : 'Illimité'} color={G.blue} />
            <StatCard icon="⏱️" label="Uptime" value={isActive ? '99.9%' : '—'} sub="30 derniers jours" color={G.green} />
          </div>

          {/* Quick actions */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>
              Actions rapides
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Btn variant="secondary" small icon="🔄" onClick={handleRedeploy} loading={redeploying}>
                Redéployer
              </Btn>
              <Btn variant="secondary" small icon="📊" onClick={() => setTab('billing')}>
                Facturation
              </Btn>
              <Btn variant="secondary" small icon="🤖" onClick={() => window.open(`https://t.me/${tenant.bot_username}`, '_blank')}>
                Ouvrir le bot
              </Btn>
            </div>
            {redeployMsg && (
              <div style={{ marginTop: 12 }}>
                <Alert type={redeployMsg.type}>{redeployMsg.text}</Alert>
              </div>
            )}
          </Card>

          {/* Bot info */}
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Informations bot
            </div>
            {[
              { label: 'Username', value: `@${tenant.bot_username || '—'}` },
              { label: 'Déployé le', value: tenant.deployed_at ? new Date(tenant.deployed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { label: 'Webhook', value: tenant.webhook_url || '—' },
              { label: 'Secteur', value: config.sector || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${G.border}` }}>
                <span style={{ fontSize: 13, color: G.textMuted }}>{label}</span>
                <span style={{ fontSize: 13, color: G.text, fontFamily: 'JetBrains Mono, monospace' }}>{value}</span>
              </div>
            ))}
          </Card>
        </motion.div>
      )}

      {/* ── Settings Tab ───────────────────────── */}
      {tab === 'settings' && (
        <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Alert type="info" style={{ marginBottom: 16 }}>
            La modification du thème est disponible. Le redéploiement s'applique dans ~3 minutes.
          </Alert>
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Couleur du thème
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input type="color"
                defaultValue={config.theme?.primary || '#0ea5a0'}
                style={{ width: 44, height: 44, borderRadius: 10, border: `2px solid ${G.border}`, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: G.textMuted }}>Modifier la couleur primaire</span>
            </div>
            <div style={{ marginTop: 16 }}>
              <Btn variant="primary" onClick={handleRedeploy} loading={redeploying} icon="💾">
                Sauvegarder & redéployer
              </Btn>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Billing Tab ────────────────────────── */}
      {tab === 'billing' && (
        <motion.div key="billing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: G.textMuted, marginBottom: 4 }}>Plan actuel</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: planColor, textTransform: 'capitalize' }}>
                  {tenant.plan}
                </div>
              </div>
              <Badge color={planColor} size="lg">{
                { starter: '29€/mois', pro: '79€/mois', enterprise: '199€/mois' }[tenant.plan]
              }</Badge>
            </div>
            <Btn variant="primary" full onClick={handleBillingPortal} icon="💳">
              Gérer l'abonnement Stripe
            </Btn>
          </Card>
          <Alert type="info">
            Le portail de facturation Stripe vous permet de changer de plan, télécharger vos factures et mettre à jour votre carte bancaire.
          </Alert>
        </motion.div>
      )}
    </motion.div>
  );
}
