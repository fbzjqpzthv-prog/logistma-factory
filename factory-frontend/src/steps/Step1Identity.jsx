import { motion, AnimatePresence } from 'framer-motion';
import { G } from '../lib/tokens.js';
import { Input, Select, Btn, Card, StepHeader } from '../components/UI.jsx';

const SECTORS = [
  { value: 'colis',    label: '📦  Livraison de colis' },
  { value: 'repas',    label: '🍔  Restauration / repas' },
  { value: 'courses',  label: '🛒  Courses & épicerie' },
  { value: 'medical',  label: '💊  Médical / pharmacie' },
  { value: 'express',  label: '⚡  Courrier express' },
  { value: 'mobilier', label: '🛋️  Mobilier / gros colis' },
  { value: 'fleurs',   label: '💐  Fleurs & cadeaux' },
  { value: 'autre',    label: '🚚  Autre activité' },
];

const EMOJIS = ['🚚', '📦', '🛵', '🏍️', '⚡', '🚀', '🌟', '🔥', '📫', '🎁', '🛺', '🚴'];

const SECTOR_LABELS = Object.fromEntries(SECTORS.map(s => [s.value, s.label]));

export default function Step1({ data, setData, onNext }) {
  const valid = data.companyName?.trim().length >= 2;

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <StepHeader
        step={1} total={6}
        title="Identité de votre entreprise"
        subtitle="Ces informations apparaîtront dans votre Mini App Telegram."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Input
          label="Nom de l'entreprise *"
          value={data.companyName}
          onChange={v => setData(d => ({ ...d, companyName: v }))}
          placeholder="Ex: Rapidex Livraison"
          autoFocus
          error={data.companyName?.length > 0 && data.companyName.trim().length < 2
            ? 'Minimum 2 caractères' : ''}
        />

        <Select
          label="Secteur d'activité"
          value={data.sector}
          onChange={v => setData(d => ({ ...d, sector: v }))}
          options={SECTORS}
        />

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: G.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
            Emoji représentatif
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {EMOJIS.map(e => (
              <motion.button
                key={e}
                whileTap={{ scale: 0.88 }}
                onClick={() => setData(d => ({ ...d, emoji: e }))}
                style={{
                  width: 44, height: 44, borderRadius: 10,
                  border: `2px solid ${data.emoji === e ? G.teal : G.border}`,
                  background: data.emoji === e ? G.tealDim : G.bg3,
                  fontSize: 20, cursor: 'pointer',
                  boxShadow: data.emoji === e ? `0 0 0 3px ${G.tealDim}` : 'none',
                  transition: 'all 0.15s',
                }}
              >{e}</motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Live preview card */}
      <AnimatePresence>
        {valid && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{ marginTop: 24 }}
          >
            <Card style={{ background: G.bg3, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: G.tealDim, border: `1.5px solid ${G.tealMid}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0,
              }}>{data.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3 }}>{data.companyName}</div>
                <div style={{ fontSize: 12, color: G.textMuted }}>
                  {SECTOR_LABELS[data.sector]}
                </div>
              </div>
              <div style={{
                fontSize: 9, fontWeight: 700, color: G.green,
                background: G.greenDim, border: `1px solid ${G.green}30`,
                padding: '3px 8px', borderRadius: 6,
                letterSpacing: '0.07em', textTransform: 'uppercase',
              }}>Aperçu</div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginTop: 28 }}>
        <Btn onClick={onNext} disabled={!valid} full icon="→">Continuer</Btn>
      </div>
    </motion.div>
  );
}
