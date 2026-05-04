import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { G } from '../lib/tokens.js';
import { Input, Btn, Card, Alert, Badge, Spinner, CheckIcon, StepHeader } from '../components/UI.jsx';
import { validateTelegramBot } from '../lib/api.js';

export default function Step2({ data, setData, onNext, onBack }) {
  const [validating, setValidating] = useState(false);
  const [botError, setBotError] = useState(null);

  // Regex token Telegram stricte
  const TOKEN_RE = /^\d{8,12}:[A-Za-z0-9_-]{35,}$/;
  const tokenFormatOk = TOKEN_RE.test(data.botToken || '');
  const botValidated = !!data.botInfo;

  function handleTokenChange(v) {
    setData(d => ({ ...d, botToken: v, botInfo: null }));
    setBotError(null);
  }

  async function handleValidate() {
    setValidating(true);
    setBotError(null);
    try {
      // ✅ Vraie API Telegram — appel direct, pas de mock
      const info = await validateTelegramBot(data.botToken);
      setData(d => ({ ...d, botInfo: info }));
    } catch (err) {
      setBotError(err.message);
    } finally {
      setValidating(false);
    }
  }

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <StepHeader
        step={2} total={6}
        title="Votre Bot Telegram"
        subtitle="Créez un bot via @BotFather, puis collez le token ci-dessous."
      />

      {/* Guide */}
      <Card style={{ background: G.bg3, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: G.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>
          Guide rapide
        </div>
        {[
          { n: '1', text: 'Ouvrez Telegram et cherchez ', link: { label: '@BotFather', href: 'https://t.me/BotFather' } },
          { n: '2', text: 'Envoyez /newbot et suivez les instructions' },
          { n: '3', text: 'Copiez le token API fourni et collez-le ci-dessous' },
        ].map(step => (
          <div key={step.n} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: G.tealDim, border: `1px solid ${G.tealMid}`,
              color: G.tealHi, fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontFamily: 'JetBrains Mono, monospace',
            }}>{step.n}</div>
            <span style={{ fontSize: 13, color: G.textMuted, paddingTop: 3, lineHeight: 1.5 }}>
              {step.text}
              {step.link && (
                <a href={step.link.href} target="_blank" rel="noopener noreferrer"
                  style={{ color: G.tealHi, fontWeight: 600 }}>
                  {step.link.label} ↗
                </a>
              )}
            </span>
          </div>
        ))}
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input
          label="Token du Bot *"
          value={data.botToken}
          onChange={handleTokenChange}
          placeholder="123456789:AABbCcDdEeFfGgHhIiJjKkLlMmNn..."
          mono
          hint={!data.botToken ? 'Format: XXXXXXXXX:YYYYYYY...' : ''}
          error={data.botToken && !tokenFormatOk && data.botToken.length > 10
            ? 'Format invalide — vérifiez le token copié depuis @BotFather' : ''}
          right={botValidated ? <CheckIcon size={18} color={G.green} /> : undefined}
        />

        <AnimatePresence mode="wait">
          {/* Bouton valider */}
          {tokenFormatOk && !botValidated && !validating && (
            <motion.div key="validate-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Btn onClick={handleValidate} variant="tealOutline" full icon="✓">Valider le token</Btn>
            </motion.div>
          )}

          {/* En cours de validation */}
          {validating && (
            <motion.div
              key="validating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', background: G.tealDim,
                border: `1.5px solid ${G.tealMid}`, borderRadius: 10,
              }}
            >
              <Spinner size={16} />
              <span style={{ fontSize: 13, color: G.tealHi }}>
                Validation via API Telegram officielle…
              </span>
            </motion.div>
          )}

          {/* Erreur */}
          {botError && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Alert type="error" onClose={() => setBotError(null)}>{botError}</Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Succès */}
        <AnimatePresence>
          {botValidated && (
            <motion.div
              key="bot-success"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: G.greenDim,
                border: `1.5px solid ${G.green}40`,
                borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: G.bg3,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                flexShrink: 0,
              }}>🤖</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.green }}>Bot validé ✓</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: G.text, marginTop: 2 }}>
                  {data.botInfo.first_name}
                </div>
                <div style={{ fontSize: 12, color: G.textMuted }}>
                  @{data.botInfo.username} · ID: {data.botInfo.id}
                </div>
              </div>
              <Badge color={G.green}>Actif</Badge>
            </motion.div>
          )}
        </AnimatePresence>

        {botValidated && (
          <Alert type="warning">
            <strong>Sécurité :</strong> Ne partagez jamais ce token. LogisTMA le chiffre
            avec AES-256-GCM avant tout stockage. Aucun accès humain.
          </Alert>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
        <Btn onClick={onBack} variant="secondary">← Retour</Btn>
        <Btn onClick={onNext} disabled={!botValidated} full>Continuer →</Btn>
      </div>
    </motion.div>
  );
}
