import { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { G, FONTS, RADII } from '../lib/tokens.js';

// ─── Spinner ──────────────────────────────────────
export function Spinner({ size = 20, color = G.teal, thickness = 2 }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      border: `${thickness}px solid ${color}25`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.65s linear infinite',
    }} />
  );
}

// ─── CheckIcon (animé) ────────────────────────────
export function CheckIcon({ size = 20, color = G.green }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" stroke={color} strokeWidth="1.5" />
      <polyline
        points="7,12 11,16 17,8"
        stroke={color} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: 'checkDraw 0.4s ease forwards' }}
      />
    </svg>
  );
}

// ─── Badge / Tag ─────────────────────────────────
export function Badge({ children, color = G.teal, bg, size = 'md' }) {
  const sizes = { sm: { fontSize: 9, padding: '2px 6px' }, md: { fontSize: 10, padding: '3px 8px' }, lg: { fontSize: 12, padding: '4px 10px' } };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: bg || `${color}18`,
      color, border: `1px solid ${color}30`,
      borderRadius: RADII.sm,
      fontFamily: FONTS.mono,
      fontWeight: 700,
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      ...sizes[size],
    }}>
      {children}
    </span>
  );
}

// ─── Alert ───────────────────────────────────────
export function Alert({ type = 'info', children, onClose }) {
  const variants = {
    info:    { bg: G.blueDim,   border: `${G.blue}35`,   color: G.blue,   icon: 'ℹ' },
    success: { bg: G.greenDim,  border: `${G.green}35`,  color: G.green,  icon: '✓' },
    error:   { bg: G.redDim,    border: `${G.red}35`,    color: G.red,    icon: '✕' },
    warning: { bg: G.amberDim,  border: `${G.amber}35`,  color: G.amber,  icon: '⚠' },
  };
  const v = variants[type];
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        background: v.bg,
        border: `1.5px solid ${v.border}`,
        borderRadius: RADII.md,
        padding: '12px 14px',
      }}
    >
      <span style={{ color: v.color, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{v.icon}</span>
      <div style={{ fontSize: 13, color: G.text, lineHeight: 1.55, flex: 1 }}>{children}</div>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: G.textDim, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
      )}
    </motion.div>
  );
}

// ─── Input ───────────────────────────────────────
export function Input({ label, value, onChange, placeholder, type = 'text', hint, error, mono, disabled, right, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{
          fontSize: 11, fontWeight: 600,
          color: focused ? G.tealHi : G.textMuted,
          letterSpacing: '0.07em', textTransform: 'uppercase',
          transition: 'color 0.2s',
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            background: focused ? G.bg3 : G.bg2,
            border: `1.5px solid ${error ? G.red : focused ? G.teal : G.border}`,
            borderRadius: RADII.md,
            padding: right ? '11px 44px 11px 14px' : '11px 14px',
            color: disabled ? G.textMuted : G.text,
            fontSize: 14,
            fontFamily: mono ? FONTS.mono : FONTS.sans,
            outline: 'none',
            transition: 'all 0.2s',
            opacity: disabled ? 0.6 : 1,
          }}
        />
        {right && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
            {right}
          </div>
        )}
      </div>
      <AnimatePresence>
        {(hint || error) && (
          <motion.span
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ fontSize: 12, color: error ? G.red : G.textDim, overflow: 'hidden' }}
          >
            {error ? '⚠ ' : ''}{error || hint}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Select ──────────────────────────────────────
export function Select({ label, value, onChange, options, disabled }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{
          fontSize: 11, fontWeight: 600,
          color: focused ? G.tealHi : G.textMuted,
          letterSpacing: '0.07em', textTransform: 'uppercase',
          transition: 'color 0.2s',
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            background: focused ? G.bg3 : G.bg2,
            border: `1.5px solid ${focused ? G.teal : G.border}`,
            borderRadius: RADII.md,
            padding: '11px 36px 11px 14px',
            color: G.text,
            fontSize: 14,
            outline: 'none',
            cursor: disabled ? 'default' : 'pointer',
            appearance: 'none',
            transition: 'all 0.2s',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {options.map(o => (
            <option key={o.value} value={o.value} style={{ background: G.bg2 }}>{o.label}</option>
          ))}
        </select>
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: G.textMuted, pointerEvents: 'none', fontSize: 10 }}>▼</span>
      </div>
    </div>
  );
}

// ─── Button ──────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', disabled, loading, small, full, icon, type = 'button' }) {
  const [pressed, setPressed] = useState(false);

  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${G.teal} 0%, ${G.tealLo} 100%)`,
      color: '#fff',
      border: 'none',
      shadow: `0 4px 16px ${G.teal}45`,
    },
    secondary: {
      background: G.bg3,
      color: G.text,
      border: `1.5px solid ${G.border}`,
      shadow: 'none',
    },
    ghost: {
      background: 'transparent',
      color: G.textMuted,
      border: 'none',
      shadow: 'none',
    },
    danger: {
      background: G.redDim,
      color: G.red,
      border: `1.5px solid ${G.red}40`,
      shadow: 'none',
    },
    amber: {
      background: `linear-gradient(135deg, ${G.amber}, #d97706)`,
      color: '#000',
      border: 'none',
      shadow: `0 4px 16px ${G.amber}45`,
    },
    tealOutline: {
      background: G.tealDim,
      color: G.tealHi,
      border: `1.5px solid ${G.tealMid}`,
      shadow: 'none',
    },
  };

  const v = variants[variant] || variants.primary;
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      whileTap={isDisabled ? {} : { scale: 0.97 }}
      whileHover={isDisabled ? {} : { filter: 'brightness(1.08)' }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: 8,
        padding: small ? '8px 16px' : '12px 24px',
        fontSize: small ? 13 : 14,
        fontWeight: 600,
        fontFamily: FONTS.sans,
        letterSpacing: '0.01em',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        width: full ? '100%' : undefined,
        background: v.background,
        color: v.color,
        border: v.border || 'none',
        borderRadius: RADII.md,
        boxShadow: v.shadow,
        transition: 'opacity 0.15s, box-shadow 0.15s',
        userSelect: 'none',
      }}
    >
      {loading && <Spinner size={14} color={v.color === '#fff' || v.color === '#000' ? v.color : G.teal} thickness={2} />}
      {!loading && icon && <span style={{ fontSize: 15 }}>{icon}</span>}
      {children}
    </motion.button>
  );
}

// ─── Card ────────────────────────────────────────
export function Card({ children, style, glow, glowColor, onClick, hoverable }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hoverable ? { y: -2, boxShadow: '0 8px 28px rgba(0,0,0,0.4)' } : {}}
      style={{
        background: G.bg2,
        border: `1.5px solid ${glow ? (glowColor || G.tealMid) : G.border}`,
        borderRadius: RADII.lg,
        padding: 20,
        boxShadow: glow ? `0 0 28px ${glowColor || G.teal}20` : 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Divider ─────────────────────────────────────
export function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: G.border }} />
      {label && <span style={{ fontSize: 11, color: G.textDim, whiteSpace: 'nowrap' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: G.border }} />
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────
export function Toggle({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: value ? G.teal : G.bg4,
        border: `1.5px solid ${value ? G.teal : G.border}`,
        position: 'relative', cursor: disabled ? 'default' : 'pointer',
        flexShrink: 0, transition: 'all 0.25s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <motion.div
        animate={{ x: value ? 19 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute', top: 2,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  );
}

// ─── Progress Bar ─────────────────────────────────
export function ProgressBar({ value, color = G.teal, height = 8, showLabel = false }) {
  return (
    <div>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: G.textMuted, fontFamily: FONTS.mono }}>Progression</span>
          <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: FONTS.mono }}>{value}%</span>
        </div>
      )}
      <div style={{ height, background: G.bg3, borderRadius: height / 2, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            borderRadius: height / 2,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────
export function StepHeader({ step, total, title, subtitle, badge }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Badge>{badge || `Étape ${step} / ${total}`}</Badge>
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.25, marginBottom: 6 }}>{title}</h2>
      {subtitle && <p style={{ color: G.textMuted, fontSize: 14, lineHeight: 1.6 }}>{subtitle}</p>}
    </div>
  );
}
