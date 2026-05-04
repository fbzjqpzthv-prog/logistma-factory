import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { G } from '../lib/tokens.js';
import { Btn, Alert, Badge, Card, Spinner, CheckIcon, ProgressBar, StepHeader } from '../components/UI.jsx';
import { useDeployment } from '../hooks/useDeployment.js';

const STEP_META = {
  init:               { label: 'Initialisation',                 emoji: '⚡' },
  generating_id:      { label: "Génération de l'identifiant",    emoji: '🔑' },
  validating_bot:     { label: 'Validation du bot Telegram',     emoji: '🤖' },
  creating_tenant:    { label: 'Création du tenant isolé',       emoji: '🏗️' },
  cloning_template:   { label: 'Clonage du template',            emoji: '📋' },
  injecting_config:   { label: 'Injection de la configuration',  emoji: '⚙️' },
  building:           { label: 'Build du frontend React',        emoji: '🔨' },
  deploying_railway:  { label: 'Déploiement Railway',            emoji: '🚂' },
  configuring_dns:    { label: 'Configuration DNS & SSL',        emoji: '🌐' },
  configuring_webhook:{ label: 'Webhook Telegram actif',         emoji: '🔗' },
  running_tests:      { label: 'Tests automatiques',             emoji: '✅' },
  saving:             { label: 'Finalisation',                   emoji: '💾' },
  notifying:          { label: 'Notification Telegram',          emoji: '📨' },
};

function DeployStep({ step }) {
  const meta = STEP_META[step.id] || { emoji: '●', label: step.label };
  const isDone    = step.status === 'done';
  const isRunning = step.status === 'running';
  const isError   = step.status === 'error';

  return (
    <motion.div
      layout
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 12px', borderRadius: 8,
        background: isRunning ? G.tealDim : isError ? G.redDim : 'transparent',
        transition: 'background 0.3s',
      }}
    >
      <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {isDone
          ? <CheckIcon size={18} color={G.green} />
          : isRunning
          ? <Spinner size={16} />
          : isError
          ? <span style={{ color: G.red, fontWeight: 700 }}>✕</span>
          : <div style={{ width: 6, height: 6, borderRadius: '50%', background: G.textDim }} />
        }
      </div>
      <span style={{ fontSize: 13 }}>{meta.emoji}</span>
      <span style={{
        fontSize: 13,
        color: isDone ? G.text : isRunning ? G.tealHi : isError ? G.red : G.textDim,
        fontWeight: isRunning ? 600 : 400,
        transition: 'color 0.3s',
      }}>{step.label || meta.label}</span>
      {isDone && (
        <span style={{ marginLeft: 'auto', fontSize: 10, color: G.textDim, fontFamily: 'JetBrains Mono, monospace' }}>✓</span>
      )}
    </motion.div>
  );
}

export default function Step6Deploy({ data, onReset }) {
  const { phase, deploymentId, status, error, deploy, retry } = useDeployment();

  // Lance le déploiement au montage
  useEffect(() => {
    deploy({
      companyName: data.companyName,
      botToken:    data.botToken,
      sector:      data.sector,
      emoji:       data.emoji,
      theme:       data.theme,
      features:    data.features,
      plan:        data.plan,
      adminId:     window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
    });
  }, []);

  const steps       = status?.steps || Object.keys(STEP_META).map(id => ({ id, status: 'pending', label: STEP_META[id].label }));
  const progress    = status?.progress ?? (phase === 'deploying' ? 2 : 0);
  const frontendUrl = status?.frontendUrl;
  const currentLabel = status?.currentStepLabel || 'Connexion au serveur…';

  const isDeploying = phase === 'deploying' || phase === 'polling';
  const isSuccess   = phase === 'success';
  const isError     = phase === 'error';

  return (
    <motion.div
      key="step6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div style={{ marginBottom: 24 }}>
        <Badge
          color={isSuccess ? G.green : isError ? G.red : G.teal}
          bg={isSuccess ? G.greenDim : isError ? G.redDim : G.tealDim}
        >
          {isSuccess ? 'Déployé ✓' : isError ? 'Erreur' : 'Déploiement en cours'}
        </Badge>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginTop: 10, marginBottom: 6 }}>
          {isSuccess
            ? `${data.companyName} est en ligne ! 🎉`
            : isError
            ? 'Déploiement échoué'
            : `Déploiement de ${data.companyName}…`}
        </h2>
        <p style={{ color: G.textMuted, fontSize: 14 }}>
          {isSuccess
            ? 'Votre Mini App est opérationnelle. Le bot Telegram répond aux commandes.'
            : isError
            ? 'Une erreur est survenue. Vos données sont préservées.'
            : currentLabel}
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <ProgressBar
          value={isSuccess ? 100 : progress}
          color={isSuccess ? G.green : isError ? G.red : G.teal}
          height={8}
          showLabel
        />
        {deploymentId && (
          <div style={{ marginTop: 6, fontSize: 11, color: G.textDim, fontFamily: 'JetBrains Mono, monospace' }}>
            ID: {deploymentId}
          </div>
        )}
      </div>

      {/* Steps */}
      <Card style={{ marginBottom: 20, padding: '6px 4px' }}>
        {steps.map(s => <DeployStep key={s.id} step={s} />)}
      </Card>

      {/* SUCCESS */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card
              glow
              glowColor={G.green}
              style={{ background: G.greenDim, border: `1.5px solid ${G.green}40`, marginBottom: 16 }}
            >
              <div style={{ fontSize: 40, marginBottom: 12, animation: 'float 3s ease-in-out infinite' }}>🚀</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Votre app est en ligne !</h3>

              {frontendUrl && (
                <div style={{
                  background: G.bg2, borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: G.tealHi,
                  border: `1.5px solid ${G.border}`, wordBreak: 'break-all',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                }}>
                  <span>{frontendUrl}</span>
                  <button
                    onClick={() => navigator.clipboard?.writeText(frontendUrl)}
                    style={{
                      background: G.tealDim, border: 'none', borderRadius: 6,
                      padding: '4px 10px', color: G.tealHi, cursor: 'pointer',
                      fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, flexShrink: 0,
                    }}
                  >Copier</button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {frontendUrl && (
                  <Btn variant="primary" onClick={() => window.open(frontendUrl, '_blank')} icon="🌐">
                    Ouvrir l'app
                  </Btn>
                )}
                <Btn variant="secondary" icon="📊" onClick={() => {}}>Dashboard</Btn>
              </div>
            </Card>

            <Alert type="info">
              Votre bot <strong>@{data.botInfo?.username}</strong> est prêt.
              Envoyez{' '}
              <code style={{ fontFamily: 'JetBrains Mono, monospace', background: G.bg3, padding: '1px 6px', borderRadius: 4 }}>
                /start
              </code>{' '}
              pour lancer l'expérience client.
            </Alert>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Btn variant="ghost" onClick={onReset} small>+ Créer une autre app</Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ERROR */}
      <AnimatePresence>
        {isError && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Alert type="error">
              <strong>Erreur :</strong> {error}
            </Alert>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <Btn variant="secondary" onClick={onReset}>← Recommencer</Btn>
              <Btn variant="primary" icon="↻" onClick={() => retry({
                companyName: data.companyName, botToken: data.botToken,
                sector: data.sector, emoji: data.emoji,
                theme: data.theme, features: data.features, plan: data.plan,
                adminId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
              })}>
                Réessayer
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
