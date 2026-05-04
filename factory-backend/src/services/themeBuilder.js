/**
 * LogisTMA Factory — themeBuilder.js
 * Génère un CSS complet à partir d'une couleur primaire en HSL.
 * Toutes les variables dérivées (alphas, shadows, variants) sont calculées automatiquement.
 */

import logger from '../utils/logger.js';

// ═══════════════════════════════════════
// POLICES DISPONIBLES
// ═══════════════════════════════════════

const FONT_IMPORTS = {
  Sora: "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap",
  Outfit: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap",
  Poppins: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap",
  "Space Grotesk": "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap",
  "DM Serif": "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap",
};

// ═══════════════════════════════════════
// CONVERSIONS COULEURS
// ═══════════════════════════════════════

/**
 * Convertit une couleur HEX en HSL {h, s, l}
 */
export function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / delta + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / delta + 2) / 6; break;
      case b: h = ((r - g) / delta + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convertit HSL en HEX
 */
export function hslToHex(h, s, l) {
  const hNorm = h / 360;
  const sNorm = s / 100;
  const lNorm = l / 100;

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (sNorm === 0) {
    r = g = b = lNorm;
  } else {
    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;
    r = hue2rgb(p, q, hNorm + 1/3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1/3);
  }

  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Ajuste la luminosité d'une couleur HSL
 */
function adjustL(hsl, delta) {
  return { ...hsl, l: Math.max(0, Math.min(100, hsl.l + delta)) };
}

/**
 * Ajuste la saturation
 */
function adjustS(hsl, delta) {
  return { ...hsl, s: Math.max(0, Math.min(100, hsl.s + delta)) };
}

/**
 * Génère une couleur complémentaire (hue +180°)
 */
function complementary(hsl) {
  return { ...hsl, h: (hsl.h + 180) % 360 };
}

/**
 * Génère une couleur analogique (hue +/-30°)
 */
function analogic(hsl, degrees = 30) {
  return { ...hsl, h: (hsl.h + degrees + 360) % 360 };
}

// ═══════════════════════════════════════
// CONFIGURATIONS DES STYLES
// ═══════════════════════════════════════

const STYLE_CONFIGS = {
  dark: {
    bg: { h: 0, s: 0, l: 4 },         // Noir profond
    bgCard: { h: 0, s: 0, l: 8 },
    bgElevated: { h: 0, s: 0, l: 12 },
    surface: { h: 0, s: 0, l: 16 },
    border: { h: 0, s: 0, l: 20 },
    textPrimary: { h: 0, s: 0, l: 98 },
    textSecondary: { h: 0, s: 0, l: 65 },
    textMuted: { h: 0, s: 0, l: 40 },
    shadowBase: '0 1px 3px rgba(0,0,0,0.5)',
    shadowMd: '0 4px 16px rgba(0,0,0,0.6)',
    shadowLg: '0 8px 32px rgba(0,0,0,0.7)',
    glassBlur: 'blur(12px)',
    glassBg: 'rgba(255,255,255,0.04)',
    glassBorder: 'rgba(255,255,255,0.08)',
  },
  light: {
    bg: { h: 0, s: 0, l: 97 },
    bgCard: { h: 0, s: 0, l: 100 },
    bgElevated: { h: 0, s: 0, l: 100 },
    surface: { h: 0, s: 0, l: 95 },
    border: { h: 0, s: 0, l: 88 },
    textPrimary: { h: 0, s: 0, l: 8 },
    textSecondary: { h: 0, s: 0, l: 40 },
    textMuted: { h: 0, s: 0, l: 60 },
    shadowBase: '0 1px 3px rgba(0,0,0,0.08)',
    shadowMd: '0 4px 16px rgba(0,0,0,0.12)',
    shadowLg: '0 8px 32px rgba(0,0,0,0.16)',
    glassBlur: 'blur(12px)',
    glassBg: 'rgba(255,255,255,0.8)',
    glassBorder: 'rgba(0,0,0,0.08)',
  },
  vibrant: {
    bg: { h: 240, s: 15, l: 6 },
    bgCard: { h: 240, s: 12, l: 10 },
    bgElevated: { h: 240, s: 10, l: 14 },
    surface: { h: 240, s: 8, l: 18 },
    border: { h: 240, s: 15, l: 22 },
    textPrimary: { h: 0, s: 0, l: 98 },
    textSecondary: { h: 240, s: 20, l: 75 },
    textMuted: { h: 240, s: 10, l: 55 },
    shadowBase: '0 1px 3px rgba(0,0,50,0.5)',
    shadowMd: '0 4px 16px rgba(0,0,50,0.6)',
    shadowLg: '0 8px 32px rgba(0,0,50,0.7)',
    glassBlur: 'blur(16px)',
    glassBg: 'rgba(255,255,255,0.06)',
    glassBorder: 'rgba(255,255,255,0.12)',
  },
};

// ═══════════════════════════════════════
// GÉNÉRATEUR PRINCIPAL
// ═══════════════════════════════════════

/**
 * Génère un fichier CSS complet avec toutes les variables custom.
 * 
 * @param {Object} config
 * @param {string} config.primary    - Couleur primaire hex (#e63946)
 * @param {string} config.secondary  - Couleur secondaire hex (#f59e0b)
 * @param {string} config.style      - 'dark' | 'light' | 'vibrant'
 * @param {string} config.font       - Nom de la police
 * @param {string} config.tenantId   - ID du tenant
 * @param {string} config.companyName - Nom de l'entreprise
 * @returns {string} CSS complet
 */
export function generateThemeCSS(config) {
  const {
    primary = '#0d9488',
    secondary = '#f59e0b',
    style = 'dark',
    font = 'Sora',
    tenantId = 'tenant',
    companyName = 'LogisTMA',
  } = config;

  const p = hexToHsl(primary);
  const s = hexToHsl(secondary);
  const styleConfig = STYLE_CONFIGS[style] || STYLE_CONFIGS.dark;
  const fontImport = FONT_IMPORTS[font] || FONT_IMPORTS.Sora;
  const fontFamily = font === 'DM Serif' ? "'DM Serif Display', 'DM Sans', sans-serif" : `'${font}', sans-serif`;

  // Dérivés de la couleur primaire
  const p1 = hslToHex(p.h, p.s, p.l);                              // Couleur de base
  const p1_light = hslToHex(p.h, adjustS(p, -10).s, adjustL(p, 15).l);  // Variante claire
  const p1_dark = hslToHex(p.h, adjustS(p, 5).s, adjustL(p, -12).l);    // Variante sombre
  const p1_muted = hslToHex(p.h, Math.max(20, p.s - 30), adjustL(p, 20).l);  // Variante atténuée

  // Dérivés couleur secondaire
  const s1 = hslToHex(s.h, s.s, s.l);
  const s1_light = hslToHex(s.h, adjustS(s, -10).s, adjustL(s, 15).l);
  const s1_dark = hslToHex(s.h, adjustS(s, 5).s, adjustL(s, -12).l);

  // Couleur de succès (vert dérivé)
  const successHue = (p.h + 120) % 360;
  const success = hslToHex(successHue, 60, 45);
  const successLight = hslToHex(successHue, 50, 35);

  // Couleur danger (rouge)
  const danger = '#ef4444';
  const dangerLight = '#fca5a5';

  // Couleur warning (orange)
  const warning = '#f97316';
  const warningLight = '#fed7aa';

  // Backgrounds & surfaces from style config
  const bg = hslToHex(styleConfig.bg.h, styleConfig.bg.s, styleConfig.bg.l);
  const bgCard = hslToHex(styleConfig.bgCard.h, styleConfig.bgCard.s, styleConfig.bgCard.l);
  const bgElevated = hslToHex(styleConfig.bgElevated.h, styleConfig.bgElevated.s, styleConfig.bgElevated.l);
  const surface = hslToHex(styleConfig.surface.h, styleConfig.surface.s, styleConfig.surface.l);
  const border = hslToHex(styleConfig.border.h, styleConfig.border.s, styleConfig.border.l);
  const textPrimary = hslToHex(styleConfig.textPrimary.h, styleConfig.textPrimary.s, styleConfig.textPrimary.l);
  const textSecondary = hslToHex(styleConfig.textSecondary.h, styleConfig.textSecondary.s, styleConfig.textSecondary.l);
  const textMuted = hslToHex(styleConfig.textMuted.h, styleConfig.textMuted.s, styleConfig.textMuted.l);

  // Alphas de la couleur primaire (pour backgrounds, borders)
  const alpha = (hex, opacity) => {
    const h = hexToHsl(hex);
    return `hsla(${h.h}, ${h.s}%, ${h.l}%, ${opacity})`;
  };

  logger.info({ tenantId, style, font, primary, secondary }, 'Generating theme CSS');

  return `/* ═══════════════════════════════════════════════════════════════
 * LogisTMA Theme — Tenant: ${tenantId}
 * Company: ${companyName}
 * Generated: ${new Date().toISOString()}
 * Style: ${style} | Font: ${font}
 * Primary: ${primary} | Secondary: ${secondary}
 * ═══════════════════════════════════════════════════════════════ */

@import url('${fontImport}');

/* ─── Root Variables ─────────────────────────────────────────── */
:root {
  /* Couleurs primaires */
  --p1: ${p1};
  --p1-h: ${p.h};
  --p1-s: ${p.s}%;
  --p1-l: ${p.l}%;
  --p1b: ${alpha(p1, 0.07)};        /* Alpha 7% — backgrounds très légers */
  --p1br: ${alpha(p1, 0.20)};       /* Alpha 20% — hover states */
  --p1gl: ${alpha(p1, 0.40)};       /* Alpha 40% — glows */
  --p1-light: ${p1_light};          /* Variant clair */
  --p1-dark: ${p1_dark};            /* Variant sombre */
  --p1-muted: ${p1_muted};          /* Variant atténué */
  --p1-text: ${style === 'light' ? p1_dark : (p.l > 60 ? '#111111' : '#ffffff')};  /* Texte sur fond primaire */

  /* Couleurs secondaires */
  --s1: ${s1};
  --s1-h: ${s.h};
  --s1-s: ${s.s}%;
  --s1-l: ${s.l}%;
  --s1b: ${alpha(s1, 0.08)};
  --s1br: ${alpha(s1, 0.20)};
  --s1gl: ${alpha(s1, 0.35)};
  --s1-light: ${s1_light};
  --s1-dark: ${s1_dark};
  --s1-text: ${s.l > 55 ? '#111111' : '#ffffff'};

  /* Sémantiques */
  --success: ${success};
  --success-light: ${successLight};
  --success-bg: ${alpha(success, 0.10)};
  --success-border: ${alpha(success, 0.25)};
  --danger: ${danger};
  --danger-light: ${dangerLight};
  --danger-bg: ${alpha(danger, 0.10)};
  --danger-border: ${alpha(danger, 0.25)};
  --warning: ${warning};
  --warning-light: ${warningLight};
  --warning-bg: ${alpha(warning, 0.10)};
  --warning-border: ${alpha(warning, 0.25)};

  /* Backgrounds & Surfaces */
  --bg: ${bg};
  --bg-card: ${bgCard};
  --bg-elevated: ${bgElevated};
  --surface: ${surface};
  --border: ${border};
  --border-subtle: ${alpha(border, 0.5)};

  /* Typographie */
  --text-primary: ${textPrimary};
  --text-secondary: ${textSecondary};
  --text-muted: ${textMuted};
  --font: ${fontFamily};

  /* Ombres */
  --shadow-sm: ${styleConfig.shadowBase};
  --shadow-md: ${styleConfig.shadowMd};
  --shadow-lg: ${styleConfig.shadowLg};
  --shadow-primary: 0 4px 20px ${alpha(p1, 0.35)};
  --shadow-primary-lg: 0 8px 40px ${alpha(p1, 0.45)};

  /* Glass morphism */
  --glass-blur: ${styleConfig.glassBlur};
  --glass-bg: ${styleConfig.glassBg};
  --glass-border: ${styleConfig.glassBorder};

  /* Rayons */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Transitions */
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-spring: 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ─── Reset & Base ───────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font);
  background-color: var(--bg);
  color: var(--text-primary);
  min-height: 100vh;
  min-height: 100dvh;
  line-height: 1.6;
  overflow-x: hidden;
}

/* ─── Scrollbar ──────────────────────────────────────────────── */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: var(--radius-full); }
::-webkit-scrollbar-thumb:hover { background: var(--p1-muted); }

/* ─── Typographie ────────────────────────────────────────────── */
h1 { font-size: clamp(1.75rem, 5vw, 2.5rem); font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; }
h2 { font-size: clamp(1.35rem, 3.5vw, 1.875rem); font-weight: 600; line-height: 1.2; letter-spacing: -0.015em; }
h3 { font-size: clamp(1.1rem, 2.5vw, 1.375rem); font-weight: 600; line-height: 1.3; }
h4 { font-size: 1rem; font-weight: 600; }
p  { color: var(--text-secondary); line-height: 1.7; }
small { font-size: 0.8125rem; color: var(--text-muted); }

/* ─── Composants — Boutons ───────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-family: var(--font); font-size: 0.9375rem; font-weight: 600;
  border: none; border-radius: var(--radius-md); cursor: pointer;
  transition: all var(--transition);
  text-decoration: none; white-space: nowrap;
  position: relative; overflow: hidden;
}

.btn::after {
  content: ''; position: absolute; inset: 0;
  background: white; opacity: 0; transition: opacity var(--transition);
}
.btn:hover::after { opacity: 0.06; }
.btn:active { transform: scale(0.97); }

.btn-primary {
  background: var(--p1);
  color: var(--p1-text);
  box-shadow: var(--shadow-primary);
}
.btn-primary:hover { background: var(--p1-light); box-shadow: var(--shadow-primary-lg); }

.btn-secondary {
  background: var(--s1);
  color: var(--s1-text);
  box-shadow: 0 4px 16px ${alpha(s1, 0.3)};
}
.btn-secondary:hover { background: var(--s1-light); }

.btn-ghost {
  background: var(--p1b);
  color: var(--p1);
  border: 1px solid var(--p1br);
}
.btn-ghost:hover { background: var(--p1br); }

.btn-surface {
  background: var(--surface);
  color: var(--text-primary);
  border: 1px solid var(--border);
}
.btn-surface:hover { background: var(--bg-elevated); }

.btn-danger {
  background: var(--danger);
  color: #ffffff;
  box-shadow: 0 4px 16px ${alpha(danger, 0.3)};
}

.btn-lg { padding: 0.875rem 1.75rem; font-size: 1.0625rem; border-radius: var(--radius-lg); }
.btn-sm { padding: 0.4rem 0.875rem; font-size: 0.8125rem; border-radius: var(--radius-sm); }
.btn-full { width: 100%; }

.btn:disabled {
  opacity: 0.45; cursor: not-allowed; pointer-events: none;
}

/* ─── Composants — Cards ─────────────────────────────────────── */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
  transition: border-color var(--transition), box-shadow var(--transition);
}

.card:hover {
  border-color: var(--p1br);
  box-shadow: var(--shadow-md);
}

.card-elevated {
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md);
}

.card-glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
}

.card-primary {
  background: var(--p1b);
  border-color: var(--p1br);
}

/* ─── Composants — Inputs ────────────────────────────────────── */
.input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-family: var(--font); font-size: 0.9375rem;
  background: var(--surface);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
}

.input::placeholder { color: var(--text-muted); }

.input:focus {
  border-color: var(--p1);
  box-shadow: 0 0 0 3px var(--p1b);
}

.input:disabled {
  opacity: 0.5; cursor: not-allowed;
}

/* ─── Composants — Badges ────────────────────────────────────── */
.badge {
  display: inline-flex; align-items: center; gap: 0.25rem;
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem; font-weight: 600;
  border-radius: var(--radius-full);
}

.badge-primary { background: var(--p1b); color: var(--p1); border: 1px solid var(--p1br); }
.badge-secondary { background: var(--s1b); color: var(--s1); border: 1px solid var(--s1br); }
.badge-success { background: var(--success-bg); color: var(--success); border: 1px solid var(--success-border); }
.badge-danger { background: var(--danger-bg); color: var(--danger); border: 1px solid var(--danger-border); }
.badge-warning { background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning-border); }
.badge-muted { background: var(--surface); color: var(--text-muted); border: 1px solid var(--border); }

/* ─── Composants — Toggle ────────────────────────────────────── */
.toggle {
  position: relative; display: inline-block;
  width: 44px; height: 24px;
}
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; inset: 0; cursor: pointer;
  background: var(--border); border-radius: var(--radius-full);
  transition: all var(--transition);
}
.toggle-slider::before {
  content: ''; position: absolute;
  height: 18px; width: 18px;
  left: 3px; bottom: 3px;
  background: white; border-radius: 50%;
  transition: all var(--transition-spring);
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.toggle input:checked + .toggle-slider { background: var(--p1); }
.toggle input:checked + .toggle-slider::before { transform: translateX(20px); }

/* ─── Composants — Progress ──────────────────────────────────── */
.progress {
  height: 6px; background: var(--surface);
  border-radius: var(--radius-full); overflow: hidden;
}
.progress-bar {
  height: 100%; background: var(--p1);
  border-radius: var(--radius-full);
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 12px ${alpha(p1, 0.5)};
}

/* ─── Composants — Loader ────────────────────────────────────── */
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.spinner {
  width: 20px; height: 20px;
  border: 2px solid var(--p1b);
  border-top-color: var(--p1);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface) 25%,
    var(--bg-elevated) 50%,
    var(--surface) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

/* ─── Composants — Glow Effects ──────────────────────────────── */
.glow-primary { box-shadow: 0 0 20px ${alpha(p1, 0.3)}, 0 0 60px ${alpha(p1, 0.15)}; }
.glow-secondary { box-shadow: 0 0 20px ${alpha(s1, 0.3)}, 0 0 60px ${alpha(s1, 0.15)}; }
.text-glow-primary { text-shadow: 0 0 20px ${alpha(p1, 0.6)}; }

/* ─── Utilitaires ────────────────────────────────────────────── */
.text-primary { color: var(--p1); }
.text-secondary-color { color: var(--s1); }
.text-success { color: var(--success); }
.text-danger { color: var(--danger); }
.text-warning { color: var(--warning); }
.text-muted { color: var(--text-muted); }
.text-center { text-align: center; }

.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.gap-1 { gap: 0.25rem; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }

.w-full { width: 100%; }
.h-full { height: 100%; }
.hidden { display: none; }

/* ─── Animations ─────────────────────────────────────────────── */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes checkmark {
  0% { stroke-dashoffset: 48; }
  100% { stroke-dashoffset: 0; }
}

.animate-fadeIn { animation: fadeIn 0.4s ease forwards; }
.animate-slideUp { animation: slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
.animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

/* Delays pour animations échelonnées */
.delay-1 { animation-delay: 0.05s; }
.delay-2 { animation-delay: 0.10s; }
.delay-3 { animation-delay: 0.15s; }
.delay-4 { animation-delay: 0.20s; }
.delay-5 { animation-delay: 0.25s; }

/* ─── Responsive Mobile (Telegram Mini App) ───────────────────── */
@media (max-width: 480px) {
  html { font-size: 15px; }
  .btn { padding: 0.6rem 1rem; }
  .card { padding: 1rem; border-radius: var(--radius-md); }
  .btn-lg { padding: 0.75rem 1.5rem; }
}

/* ─── Safe Areas iOS ────────────────────────────────────────── */
.safe-top    { padding-top: env(safe-area-inset-top); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
.safe-x      { padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right); }

/* ─── Tenant Identity ───────────────────────────────────────── */
[data-tenant="${tenantId}"] {
  --tenant-id: "${tenantId}";
  --tenant-name: "${companyName}";
}
`;
}

/**
 * Génère un aperçu CSS minimal pour la preview temps réel
 */
export function generatePreviewVars(primary, secondary, style = 'dark') {
  try {
    const p = hexToHsl(primary);
    const s = hexToHsl(secondary);
    const styleConfig = STYLE_CONFIGS[style] || STYLE_CONFIGS.dark;
    return {
      '--p1': primary,
      '--p1b': `hsla(${p.h}, ${p.s}%, ${p.l}%, 0.07)`,
      '--p1br': `hsla(${p.h}, ${p.s}%, ${p.l}%, 0.20)`,
      '--s1': secondary,
      '--bg': hslToHex(styleConfig.bg.h, styleConfig.bg.s, styleConfig.bg.l),
      '--bg-card': hslToHex(styleConfig.bgCard.h, styleConfig.bgCard.s, styleConfig.bgCard.l),
      '--text-primary': hslToHex(styleConfig.textPrimary.h, styleConfig.textPrimary.s, styleConfig.textPrimary.l),
      '--text-secondary': hslToHex(styleConfig.textSecondary.h, styleConfig.textSecondary.s, styleConfig.textSecondary.l),
      '--border': hslToHex(styleConfig.border.h, styleConfig.border.s, styleConfig.border.l),
    };
  } catch (err) {
    logger.warn({ err }, 'Failed to generate preview vars');
    return {};
  }
}

/**
 * Valide une couleur hex
 */
export function isValidHex(hex) {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

export default { generateThemeCSS, generatePreviewVars, hexToHsl, hslToHex, isValidHex };
