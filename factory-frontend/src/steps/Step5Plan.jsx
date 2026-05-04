import { motion } from 'framer-motion';
import { G } from '../lib/tokens.js';
import { Btn, Alert, Badge, StepHeader } from '../components/UI.jsx';

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: '29',
    color: G.blue, colorDim: G.blueDim,
    badge: null,
    tagline: 'Pour démarrer votre activité',
    features: ['1 livreur actif', '50 stops/mois', 'GPS tracking', 'Notifications Telegram', 'Sous-domaine *.logistma.app', 'Support email'],
  },
  {
    id: 'pro', name: 'Pro', price: '79',
    color: G.teal, colorDim: G.tealDim,
    badge: 'Populaire',
    tagline: 'Pour les équipes en croissance',
    features: ['5 livreurs simultanés', '500 stops/mois', 'Tout Starter +', 'Photos livraison', 'Signature électronique', 'Import CSV', 'Support prioritaire'],
  },
  {
    id: 'enterprise', name: 'Enterprise', price: '199',
    color: G.amber, colorDim: G.amberDim,
    badge: 'Illimité',
    tagline: 'Pour les opérations à grande échelle',
    features: ['Livreurs illimités', 'Stops illimités', 'Tout Pro +', 'Analytics avancés', 'API & Webhooks', 'Domaine personnalisé + SSL', 'Marque blanche', 'SLA 4h garanti'],
  },
];

function PlanCard({ plan, selected, onSelect }) {
  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      style={{
        background: selected ? plan.colorDim : G.bg2,
        border: `2px solid ${selected ? plan.color : G.border}`,
        borderRadius: 14, padding: '16px 18px',
        cursor: 'pointer', textAlign: 'left', width: '100%',
        position: 'relative',
        boxShadow: selected ? `0 0 24px ${plan.color}18` : 'none',
        transition: 'all 0.2s',
      }}
    >
      {plan.badge && (
        <span style={{
          position: 'absolute', top: -10, left: 18,
          background: plan.color,
          color: plan.id === 'enterprise' ? '#000' : '#fff',
          fontSize: 9, fontWeight: 800,
          padding: '3px 10px', borderRadius: 8,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          fontFamily: 'JetBrains Mono, monospace',
        }}>{plan.badge}</span>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: selected ? plan.color : G.text, marginBottom: 2 }}>
            {plan.name}
          </div>
          <div style={{ fontSize: 12, color: G.textMuted }}>{plan.tagline}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: plan.color }}>
            {plan.price}€
            <span style={{ fontSize: 12, fontWeight: 400, color: G.textMuted }}>/mois</span>
          </div>
          <div style={{ fontSize: 10, color: G.textDim, marginTop: 2 }}>14j gratuit</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {plan.features.slice(0, 4).map(f => (
          <span key={f} style={{
            fontSize: 11,
            color: selected ? G.text : G.textMuted,
            background: selected ? `${plan.color}15` : G.bg3,
            padding: '3px 8px', borderRadius: 5,
            transition: 'all 0.2s',
          }}>✓ {f}</span>
        ))}
        {plan.features.length > 4 && (
          <span style={{ fontSize: 11, color: G.textDim, padding: '3px 4px' }}>
            +{plan.features.length - 4} autres…
          </span>
        )}
      </div>

      {/* Radio */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        width: 22, height: 22, borderRadius: '50%',
        border: `2px solid ${selected ? plan.color : G.border}`,
        background: selected ? plan.color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}>
        {selected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{ color: plan.id === 'enterprise' ? '#000' : '#fff', fontSize: 11, fontWeight: 800 }}
          >✓</motion.span>
        )}
      </div>
    </motion.button>
  );
}

export default function Step5({ data, setData, onNext, onBack }) {
  return (
    <motion.div
      key="step5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <StepHeader
        step={5} total={6}
        title="Choisissez votre plan"
        subtitle="14 jours d'essai gratuit sur tous les plans · Sans engagement · Résiliable à tout moment"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {PLANS.map(p => (
          <PlanCard
            key={p.id}
            plan={p}
            selected={data.plan === p.id}
            onSelect={() => setData(d => ({ ...d, plan: p.id }))}
          />
        ))}
      </div>

      <Alert type="info">
        Votre app est déployée <strong>immédiatement</strong>.
        La facturation Stripe démarre automatiquement après les 14 jours d'essai.
        Aucune carte bancaire requise pour démarrer.
      </Alert>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <Btn onClick={onBack} variant="secondary">← Retour</Btn>
        <Btn onClick={onNext} disabled={!data.plan} full icon="🚀">Déployer maintenant</Btn>
      </div>
    </motion.div>
  );
}
