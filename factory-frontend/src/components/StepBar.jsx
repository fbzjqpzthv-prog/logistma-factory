import { motion } from 'framer-motion';
import { G, FONTS } from '../lib/tokens.js';

const STEPS = [
  { label: 'Identité', icon: '🏢' },
  { label: 'Bot',      icon: '🤖' },
  { label: 'Thème',    icon: '🎨' },
  { label: 'Features', icon: '⚡' },
  { label: 'Plan',     icon: '💳' },
  { label: 'Deploy',   icon: '🚀' },
];

export default function StepBar({ current }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {STEPS.map((s, i) => {
          const done   = i < current;
          const active = i === current;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
              {/* Circle + label */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <motion.div
                  animate={{
                    background: done ? G.teal : active ? G.bg4 : G.bg2,
                    borderColor: done ? G.teal : active ? G.tealHi : G.border,
                    boxShadow: active ? `0 0 0 4px ${G.tealDim}` : 'none',
                  }}
                  transition={{ duration: 0.35 }}
                  style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    border: '2px solid',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {done ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}
                    >✓</motion.span>
                  ) : (
                    <span style={{ opacity: active ? 1 : 0.3, fontSize: 14 }}>{s.icon}</span>
                  )}
                </motion.div>
                <span style={{
                  fontSize: 9.5, fontWeight: active ? 700 : 500,
                  color: active ? G.tealHi : done ? G.textMuted : G.textDim,
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  fontFamily: FONTS.mono,
                  transition: 'color 0.3s',
                  whiteSpace: 'nowrap',
                }}>
                  {s.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 2, margin: '-16px 5px 0',
                  background: G.bg4, borderRadius: 1, overflow: 'hidden',
                }}>
                  <motion.div
                    animate={{ width: done ? '100%' : '0%' }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    style={{ height: '100%', background: G.teal, borderRadius: 1 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
