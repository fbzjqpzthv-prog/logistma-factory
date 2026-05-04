import { motion } from 'framer-motion';
import { G } from '../lib/tokens.js';
import { Btn, Badge, StepHeader } from '../components/UI.jsx';

const FEATURES = [
  { id: 'gps_tracking',   label: 'GPS Tracking',         icon: '📍', desc: 'Position livreur temps réel',        plans: ['starter','pro','enterprise'], always: true },
  { id: 'notifications',  label: 'Notifications client',  icon: '📲', desc: 'SMS & Telegram automatiques',         plans: ['starter','pro','enterprise'], always: true },
  { id: 'multi_drivers',  label: 'Multi-livreurs',        icon: '👥', desc: "Jusqu'à 5 tournées simultanées",      plans: ['pro','enterprise'] },
  { id: 'photo_delivery', label: 'Photo de livraison',    icon: '📷', desc: 'Preuve photo à chaque stop',          plans: ['pro','enterprise'] },
  { id: 'signature',      label: 'Signature électronique',icon: '✍️', desc: 'Signature client sur écran tactile',  plans: ['pro','enterprise'] },
  { id: 'csv_import',     label: 'Import CSV',            icon: '📊', desc: 'Tournées importées en masse',         plans: ['pro','enterprise'] },
  { id: 'analytics',      label: 'Analytics Dashboard',   icon: '📈', desc: 'KPIs, rapports & exports',           plans: ['enterprise'] },
  { id: 'api_webhooks',   label: 'API & Webhooks',        icon: '🔌', desc: 'Intégration ERP / WMS',              plans: ['enterprise'] },
  { id: 'custom_domain',  label: 'Domaine personnalisé',  icon: '🌐', desc: 'livraison.votre-marque.com',          plans: ['enterprise'] },
  { id: 'white_label',    label: 'Marque blanche',        icon: '🏷️', desc: 'Sans branding LogisTMA',            plans: ['enterprise'] },
];

const PLAN_LEVEL = { starter: 0, pro: 1, enterprise: 2 };

function FeatureCard({ feature, active, locked, onToggle }) {
  const canToggle = !feature.always && !locked;
  return (
    <motion.button
      whileTap={canToggle ? { scale: 0.97 } : {}}
      onClick={() => canToggle && onToggle()}
      style={{
        background: active ? G.tealDim : G.bg3,
        border: `1.5px solid ${active ? G.tealMid : locked ? G.border : G.borderHi}`,
        borderRadius: 12, padding: '12px 14px',
        cursor: locked || feature.always ? 'default' : 'pointer',
        textAlign: 'left',
        opacity: locked ? 0.45 : 1,
        position: 'relative',
        transition: 'all 0.2s',
      }}
    >
      {/* Lock badge */}
      {locked && (
        <span style={{
          position: 'absolute', top: 8, right: 8,
          background: G.amberDim, color: G.amber,
          fontSize: 9, fontWeight: 700,
          padding: '2px 6px', borderRadius: 4,
          letterSpacing: '0.07em', textTransform: 'uppercase',
          fontFamily: 'JetBrains Mono, monospace',
          border: `1px solid ${G.amber}30`,
        }}>
          {feature.plans[0] === 'enterprise' ? 'Enterprise' : 'Pro'}
        </span>
      )}

      {/* Included badge */}
      {feature.always && (
        <span style={{
          position: 'absolute', top: 8, right: 8,
          background: G.tealDim, color: G.tealHi,
          fontSize: 9, fontWeight: 700,
          padding: '2px 6px', borderRadius: 4,
          letterSpacing: '0.07em', textTransform: 'uppercase',
          fontFamily: 'JetBrains Mono, monospace',
        }}>Inclus</span>
      )}

      {/* Checkbox */}
      {!locked && !feature.always && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 18, height: 18, borderRadius: 5,
          background: active ? G.teal : G.bg4,
          border: `2px solid ${active ? G.teal : G.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#fff', transition: 'all 0.2s',
        }}>
          {active && '✓'}
        </div>
      )}

      <div style={{ fontSize: 20, marginBottom: 6 }}>{feature.icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: active ? G.tealHi : G.text, marginBottom: 3 }}>
        {feature.label}
      </div>
      <div style={{ fontSize: 11, color: G.textMuted, lineHeight: 1.4 }}>{feature.desc}</div>
    </motion.button>
  );
}

export default function Step4({ data, setData, onNext, onBack }) {
  const currentLevel = PLAN_LEVEL[data.plan] ?? 1;

  function toggle(id) {
    setData(d => ({ ...d, features: { ...d.features, [id]: !d.features[id] } }));
  }

  const activeCount = FEATURES.filter(f => f.always || data.features[f.id]).length;

  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <StepHeader
        step={4} total={6}
        title="Fonctionnalités"
        subtitle="Activez les modules de votre app. Les fonctionnalités verrouillées nécessitent un plan supérieur."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {FEATURES.map(f => {
          const locked = PLAN_LEVEL[f.plans[0]] > currentLevel;
          const active = f.always || (!locked && !!data.features[f.id]);
          return (
            <FeatureCard
              key={f.id}
              feature={f}
              active={active}
              locked={locked}
              onToggle={() => toggle(f.id)}
            />
          );
        })}
      </div>

      {/* Summary bar */}
      <div style={{
        padding: '10px 14px', background: G.bg3, borderRadius: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        border: `1px solid ${G.border}`, marginBottom: 20,
      }}>
        <span style={{ fontSize: 12, color: G.textMuted }}>
          {activeCount} module{activeCount > 1 ? 's' : ''} activé{activeCount > 1 ? 's' : ''}
        </span>
        <Badge>Plan {data.plan}</Badge>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <Btn onClick={onBack} variant="secondary">← Retour</Btn>
        <Btn onClick={onNext} full>Continuer →</Btn>
      </div>
    </motion.div>
  );
}
