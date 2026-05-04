import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { G } from './lib/tokens.js';
import StepBar from './components/StepBar.jsx';
import Dashboard from './components/Dashboard.jsx';

import Step1 from './steps/Step1Identity.jsx';
import Step2 from './steps/Step2Bot.jsx';
import Step3 from './steps/Step3Theme.jsx';
import Step4 from './steps/Step4Features.jsx';
import Step5 from './steps/Step5Plan.jsx';
import Step6 from './steps/Step6Deploy.jsx';

const INITIAL_DATA = {
  companyName: '',
  sector:      'colis',
  emoji:       '🚚',
  botToken:    '',
  botInfo:     null,
  theme:       { primary: '#0ea5a0', style: 'dark', font: 'Sora' },
  features:    { gps_tracking: true, notifications: true },
  plan:        'pro',
};

function TrustBar() {
  const items = [
    { icon: '🔒', text: 'Token chiffré AES-256' },
    { icon: '⚡', text: 'Déploiement < 5 min' },
    { icon: '🇪🇺', text: 'Hébergé en Europe' },
    { icon: '🔄', text: 'Sans engagement' },
  ];
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginTop: 20 }}>
      {items.map(b => (
        <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 13 }}>{b.icon}</span>
          <span style={{ fontSize: 11, color: G.textDim }}>{b.text}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(INITIAL_DATA);
  // Post-deploy dashboard
  const [dashboardTenantId, setDashboardTenantId] = useState(null);

  function reset() {
    setData(INITIAL_DATA);
    setStep(0);
    setDashboardTenantId(null);
  }

  const isDeploying = step === 5;

  // If showing post-deploy dashboard
  if (dashboardTenantId) {
    return (
      <AppShell step={step} isDeploying={isDeploying}>
        <Dashboard tenantId={dashboardTenantId} onBack={reset} />
      </AppShell>
    );
  }

  return (
    <AppShell step={step} isDeploying={isDeploying}>
      {/* Step bar — hidden during deploy */}
      {!isDeploying && <StepBar current={step} />}

      <AnimatePresence mode="wait">
        {step === 0 && <Step1 key="s1" data={data} setData={setData} onNext={() => setStep(1)} />}
        {step === 1 && <Step2 key="s2" data={data} setData={setData} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <Step3 key="s3" data={data} setData={setData} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <Step4 key="s4" data={data} setData={setData} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <Step5 key="s5" data={data} setData={setData} onNext={() => setStep(5)} onBack={() => setStep(3)} />}
        {step === 5 && <Step6 key="s6" data={data} onReset={reset} />}
      </AnimatePresence>

      {/* Trust bar — only on wizard steps (not deploy) */}
      {!isDeploying && <TrustBar />}
    </AppShell>
  );
}

// ─── App Shell (header + footer) ─────────────────
function AppShell({ children, step, isDeploying }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', minHeight: '100dvh' }}>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(${G.border} 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%)',
          opacity: 0.6,
        }} />
        {/* Teal blob */}
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: 700, height: 700, borderRadius: '50%',
          background: `radial-gradient(circle, ${G.teal}14 0%, transparent 60%)`,
          animation: 'blobPulse 8s ease-in-out infinite',
        }} />
        {/* Amber blob */}
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-8%',
          width: 550, height: 550, borderRadius: '50%',
          background: `radial-gradient(circle, ${G.amber}0e 0%, transparent 60%)`,
          animation: 'blobPulse 10s ease-in-out infinite reverse',
        }} />
      </div>

      {/* HEADER */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        background: `${G.bg0}e0`,
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${G.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: `linear-gradient(135deg, ${G.teal}, ${G.tealLo})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: `0 3px 12px ${G.teal}50`,
          }}>🏭</div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 14, letterSpacing: '0.02em' }}>
            Logis<span style={{ color: G.tealHi }}>TMA</span>
            <span style={{ color: G.textDim }}> Factory</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {step > 0 && step < 6 && (
            <span style={{ fontSize: 11, color: G.textDim, fontFamily: 'JetBrains Mono, monospace' }}>
              {step} / 5
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: G.green, animation: 'pulse 2.5s ease-in-out infinite' }} />
            <span style={{ fontSize: 10, color: G.textDim, fontFamily: 'JetBrains Mono, monospace' }}>v1.0.0</span>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main style={{
        flex: 1, position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'center',
        padding: '36px 16px 60px',
      }}>
        <div style={{ width: '100%', maxWidth: isDeploying ? 640 : 700 }}>
          {/* Wizard card */}
          <div style={{
            background: `${G.bg1}f2`,
            border: `1.5px solid ${G.border}`,
            borderRadius: 20,
            padding: '32px 32px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
          }}>
            {children}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer style={{
        position: 'relative', zIndex: 1,
        padding: '14px 20px',
        borderTop: `1px solid ${G.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: `${G.bg0}cc`,
      }}>
        <span style={{ fontSize: 11, color: G.textDim, fontFamily: 'JetBrains Mono, monospace' }}>
          © 2025 LogisTMA · Mini App Factory
        </span>
        <div style={{ display: 'flex', gap: 18 }}>
          {['Tarifs', 'Docs', 'Support', 'CGU'].map(l => (
            <a key={l} href="#" style={{ fontSize: 11, color: G.textDim, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = G.textMuted}
              onMouseLeave={e => e.currentTarget.style.color = G.textDim}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
