import { motion } from 'framer-motion';
import { G } from '../lib/tokens.js';
import { Select, Btn, StepHeader } from '../components/UI.jsx';

const STYLE_OPTS = [
  { id: 'dark',    label: 'Dark',    icon: '🌙', desc: 'Pro & moderne' },
  { id: 'light',   label: 'Light',   icon: '☀️', desc: 'Épuré & clair' },
  { id: 'vibrant', label: 'Vibrant', icon: '✨', desc: 'Dynamique' },
];

const FONTS = ['Sora', 'Plus Jakarta Sans', 'Nunito', 'Lexend', 'Outfit', 'Raleway'];

const PRESETS = [
  '#0ea5a0', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f59e0b', '#10b981', '#ef4444', '#f97316',
  '#06b6d4', '#84cc16',
];

// Mini App Preview — rendu exact du thème
function MiniAppPreview({ theme, companyName, emoji }) {
  const dark   = theme.style !== 'light';
  const pbg    = dark ? '#0f172a' : '#f1f5f9';
  const pcard  = dark ? '#1e293b' : '#ffffff';
  const ptext  = dark ? '#f1f5f9' : '#0f172a';
  const pmuted = dark ? '#94a3b8' : '#64748b';
  const psub   = dark ? '#ffffff10' : '#00000008';

  return (
    <div style={{ background: G.bg4, borderRadius: 14, padding: 3, border: `2px solid ${G.borderHi}` }}>
      <div style={{
        background: pbg, borderRadius: 12, overflow: 'hidden',
        fontFamily: `'${theme.font}', sans-serif`,
        transition: 'all 0.35s ease',
      }}>
        {/* Header */}
        <div style={{ background: theme.primary, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
          }}>{emoji || '🚚'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {companyName || 'Mon Entreprise'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>Suivi en temps réel</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '2px 7px', fontSize: 9, color: '#fff', fontWeight: 700 }}>En ligne</div>
        </div>

        {/* Content */}
        <div style={{ padding: 12 }}>
          {/* Tracking card */}
          <div style={{ background: pcard, borderRadius: 10, padding: 12, marginBottom: 10, boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: theme.primary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>En cours</span>
              <span style={{ fontSize: 9, color: pmuted }}>ETA 14:32</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: ptext }}>Colis #LG-2024-042</div>
            <div style={{ fontSize: 10, color: pmuted, marginTop: 3 }}>📍 Quartier Nord — 2.3 km</div>
            <div style={{ marginTop: 8, height: 4, background: psub, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: '68%', height: '100%', background: theme.primary, borderRadius: 2, transition: 'background 0.3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 9, color: pmuted }}>68% du trajet</span>
              <span style={{ fontSize: 9, color: theme.primary, fontWeight: 700 }}>→ En route</span>
            </div>
          </div>

          {/* Driver card */}
          <div style={{ background: pcard, borderRadius: 10, padding: 10, marginBottom: 10, boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${theme.primary}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: ptext }}>Jean-Marc D.</div>
              <div style={{ fontSize: 9, color: pmuted }}>Livreur assigné</div>
            </div>
            <div style={{ background: '#34d39920', color: '#34d399', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5 }}>GPS ●</div>
          </div>

          {/* CTA */}
          <div style={{
            width: '100%', padding: '9px', borderRadius: 8, border: 'none',
            background: theme.primary, color: '#fff',
            fontFamily: `'${theme.font}', sans-serif`,
            fontWeight: 700, fontSize: 11, textAlign: 'center',
            cursor: 'default', transition: 'all 0.3s',
          }}>
            📍 Suivre sur la carte
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Step3({ data, setData, onNext, onBack }) {
  const { theme } = data;

  function setTheme(patch) {
    setData(d => ({ ...d, theme: { ...d.theme, ...patch } }));
  }

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <StepHeader
        step={3} total={6}
        title="Thème visuel"
        subtitle="Personnalisez l'apparence de votre Mini App. L'aperçu se met à jour en temps réel."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* ── Controls ─────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Color picker */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: G.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
              Couleur primaire
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <input
                type="color"
                value={theme.primary}
                onChange={e => setTheme({ primary: e.target.value })}
                style={{ width: 44, height: 44, borderRadius: 10, border: `2px solid ${G.border}`, cursor: 'pointer', flexShrink: 0 }}
              />
              <div style={{
                flex: 1, height: 44, borderRadius: 10,
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}88)`,
                display: 'flex', alignItems: 'center', paddingLeft: 12,
              }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#fff', fontWeight: 600, letterSpacing: '0.05em' }}>
                  {theme.primary.toUpperCase()}
                </span>
              </div>
            </div>
            {/* Presets */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRESETS.map(c => (
                <motion.button
                  key={c}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setTheme({ primary: c })}
                  style={{
                    width: 26, height: 26, borderRadius: 6, background: c,
                    cursor: 'pointer', border: 'none',
                    outline: theme.primary === c ? `3px solid ${c}` : '3px solid transparent',
                    outlineOffset: 2,
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: G.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
              Style
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {STYLE_OPTS.map(s => (
                <motion.button
                  key={s.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setTheme({ style: s.id })}
                  style={{
                    flex: 1, padding: '10px 6px', borderRadius: 10, textAlign: 'center',
                    border: `1.5px solid ${theme.style === s.id ? G.teal : G.border}`,
                    background: theme.style === s.id ? G.tealDim : G.bg3,
                    color: theme.style === s.id ? G.tealHi : G.textMuted,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{s.label}</div>
                  <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>{s.desc}</div>
                </motion.button>
              ))}
            </div>
          </div>

          <Select
            label="Police d'écriture"
            value={theme.font}
            onChange={v => setTheme({ font: v })}
            options={FONTS.map(f => ({ value: f, label: f }))}
          />
        </div>

        {/* ── Live Preview ──────────────────────────── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: G.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
            Aperçu temps réel
          </div>
          <MiniAppPreview theme={theme} companyName={data.companyName} emoji={data.emoji} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
        <Btn onClick={onBack} variant="secondary">← Retour</Btn>
        <Btn onClick={onNext} full>Continuer →</Btn>
      </div>
    </motion.div>
  );
}
