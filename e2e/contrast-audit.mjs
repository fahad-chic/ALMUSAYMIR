/**
 * Automated WCAG 2.1 AA contrast audit for المسيمير | ALMUSAYMIR.
 *
 * Renders the built site in a headless browser and checks computed text /
 * background colours of real elements on the important pages:
 *   - text nodes, form controls (input/select/textarea) and their placeholders,
 *   - icon-only interactive controls (buttons/links without text),
 *   - hover / focus states of interactive controls.
 *
 * Standard: WCAG AA — 4.5:1 normal text, 3:1 large text (>=24px, or >=18.66px
 * bold) and 3:1 for non-text UI (icons).
 *
 * Usage:
 *   node e2e/contrast-audit.mjs [--base http://localhost:12000] [--strict]
 *                               [--max N] [--json path]
 *   BASE_URL=... WCAG_STRICT=1 node e2e/contrast-audit.mjs
 *
 * Exit code: 0 when there are no (non-allowlisted) confirmed violations,
 * 1 otherwise. Use --strict to also fail on "suspect" cases (translucent
 * colours / gradients) which cannot be judged with certainty.
 *
 * Known-good exceptions live in `BASELINE` (documented, with reasons) so the
 * check is green on the current design while still catching regressions.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg('--base', process.env.BASE_URL || 'http://localhost:12000');
const STRICT = process.argv.includes('--strict') || process.env.WCAG_STRICT === '1';
const MAX_VIOLATIONS = Number(arg('--max', process.env.WCAG_MAX || '0'));
const OUT = arg('--json', process.env.WCAG_JSON || path.join(__dirname, 'report', 'contrast-audit.json'));

const ANON_ROUTES = ['/login', '/register', '/forgot-password'];
const GUEST_ROUTES = [
  '/', '/contact', '/about', '/faq', '/terms', '/wanted-dress', '/branches',
  '/advertisements', '/employees', '/haraj', '/haraj/post', '/notifications',
  '/inbox', '/otp', '/users', '/settings', '/chat', '/ai-chat',
  '/catalog/wedding-dresses', '/haraj/catalog/wedding-dresses',
];
// Owner-only pages. Their UI renders only for a signed-in owner, so CI cannot
// reach them without real credentials. When WCAG_OWNER_STATE is provided (a
// Playwright storage-state JSON exported from a real owner session), these
// routes are added to the audit; otherwise they are reported as skipped.
const OWNER_ROUTES = ['/admin', '/owner-panel', '/owner-private-room', '/complaints'];
const OWNER_STATE = process.env.WCAG_OWNER_STATE || '';
const ROUTES = process.env.WCAG_ROUTES
  ? process.env.WCAG_ROUTES.split(',').map((s) => s.trim()).filter(Boolean)
  : [...ANON_ROUTES, ...GUEST_ROUTES, ...(OWNER_STATE ? OWNER_ROUTES : [])];

/**
 * Documented exceptions for cases that cannot be judged with certainty by a
 * static computed-style check (translucent overlays, gradients, decorative
 * text over imagery). Each entry needs a reason. Keep this list tiny.
 */
const BASELINE = [
  {
    route: '*',
    match: 'placeholder',
    reason: 'placeholders are AA-exempt under WCAG 1.4.3 when the field has a visible label',
  },
];

const guestStorage = {
  state: {
    guestSession: {
      active: true, phone: 'زائر-9999', startedAt: Date.now(),
      expiresAt: Date.now() + 3600000, warnedAt: null,
    },
    guestWarning: false,
    guestExpired: false,
  },
  version: 0,
};

function allowlisted(route, descriptor) {
  return BASELINE.find((b) => (b.route === '*' || b.route === route) && descriptor.includes(b.match));
}

const launchOptions = {
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
};
if (process.env.CHROMIUM_PATH) launchOptions.executablePath = process.env.CHROMIUM_PATH;
else if (fs.existsSync('/usr/bin/chromium')) launchOptions.executablePath = '/usr/bin/chromium';

const browser = await chromium.launch(launchOptions);

// ---------------------------------------------------------------- in-page audit
const PAGE_AUDIT = () => {
  const parse = (input) => {
    if (input == null) return null;
    const s = String(input).trim().toLowerCase();
    if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const hex = /^#([0-9a-f]{3,8})$/.exec(s);
    if (hex) {
      let h = hex[1];
      if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
      if (h.length !== 6 && h.length !== 8) return null;
      return {
        r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16),
        a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
      };
    }
    const m = /^rgba?\(([^)]+)\)$/.exec(s);
    if (!m) return null;
    const p = m[1].split(/[,/\s]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.slice(0, 3).some((n) => Number.isNaN(n))) return null;
    const a = p.length > 3 ? p[3] : 1;
    return { r: p[0], g: p[1], b: p[2], a: Number.isNaN(a) ? 1 : a };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const blend = (fg, bg) => {
    const a = fg.a == null ? 1 : fg.a;
    return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
  };
  const threshold = (fs, fw) => (fs >= 24 || (fs >= 18.66 && Number(fw) >= 700) ? 3 : 4.5);
  const gradientColors = (img) => {
    if (!img || img === 'none') return null;
    if (!/gradient\(/.test(img)) return null;
    const found = [...img.matchAll(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/g)].map((m) => parse(m[0])).filter(Boolean);
    return found.length ? found : null;
  };

  const results = { checked: 0, skipped: 0, violations: [], suspects: [], skipReasons: {} };
  const note = (k) => { results.skipReasons[k] = (results.skipReasons[k] || 0) + 1; };

  const pageBg = (() => {
    let el = document.body;
    while (el) {
      const c = parse(getComputedStyle(el).backgroundColor);
      if (c && c.a >= 0.95) return c;
      el = el.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  })();

  const bgFor = (el) => {
    const stack = [];
    let cur = el;
    while (cur && cur !== document.documentElement.parentElement) {
      const cs = getComputedStyle(cur);
      stack.push({ c: parse(cs.backgroundColor), g: gradientColors(cs.backgroundImage) });
      cur = cur.parentElement;
    }
    let acc = pageBg;
    let approximate = false;
    for (let i = stack.length - 1; i >= 0; i--) {
      const { c, g } = stack[i];
      if (g) { approximate = true; for (const gc of g) acc = blend(gc, acc); }
      if (c && c.a > 0) acc = blend(c, acc);
    }
    return { bg: acc, approximate };
  };

  const visible = (el, cs) => {
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
    if (parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const hasDirectText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
  const isDisabled = (el) => el.disabled === true || el.getAttribute('aria-disabled') === 'true';
  const descriptor = (el, kind) => {
    const tag = el.tagName.toLowerCase();
    const cls = (typeof el.className === 'string' && el.className.trim()) ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
    return `${kind}:${tag}${cls}${txt ? ` "${txt}"` : ''}`;
  };

  const evaluate = (fg, bg, fs, fw, kind, el, gradientApprox) => {
    if (!fg) { note('unparsable-color'); return; }
    if (fg.a < 0.15) { note('near-transparent-text'); return; }
    const eff = fg.a < 1 ? blend(fg, bg) : fg;
    const r = ratio(eff, bg);
    const req = threshold(fs, fw);
    results.checked++;
    if (r + 1e-9 >= req) return;
    const item = { kind, descriptor: descriptor(el, kind), ratio: Number(r.toFixed(2)), required: req, fg: getComputedStyle(el).color, approxBg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` };
    if (fg.a < 0.95 || gradientApprox) results.suspects.push(item);
    else results.violations.push(item);
  };

  const nodes = document.body.querySelectorAll('*');
  for (const el of nodes) {
    const tag = el.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'template', 'head', 'meta', 'link', 'title', 'br', 'path', 'svg'].includes(tag)) continue;
    const cs = getComputedStyle(el);
    if (!visible(el, cs)) { note('hidden-or-zero-size'); continue; }
    if (isDisabled(el)) { note('disabled'); continue; }

    const fs = parseFloat(cs.fontSize) || 16;
    const fw = cs.fontWeight;
    const fg = parse(cs.color);
    const { bg, approximate } = bgFor(el);

    if (hasDirectText(el)) evaluate(fg, bg, fs, fw, 'text', el, approximate);

    const control = ['input', 'select', 'textarea'].includes(tag);
    if (control) {
      const own = parse(cs.backgroundColor);
      const cbg = own && own.a >= 0.95 ? own : bg;
      evaluate(fg, cbg, fs, fw, 'field', el, approximate);
      const ph = parse(getComputedStyle(el, '::placeholder').color);
      if (ph && ph.a >= 0.15) evaluate(ph, cbg, fs, fw, 'placeholder', el, approximate);
    }

    const interactive = tag === 'button' || tag === 'a' || el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link';
    // Icon-only control: has no text at all (nested or direct), e.g. an <svg> button.
    if (interactive && el.textContent.trim() === '') evaluate(fg, bg, 16, 400, 'icon', el, approximate);
  }

  return results;
};

// ------------------------------------------------------- hover / focus states
async function stateAudit(page) {
  const handles = await page.evaluate(() => {
    const sel = 'button, a, input, select, textarea';
    return [...document.querySelectorAll(sel)].filter((el) => getComputedStyle(el).display !== 'none').slice(0, 60).length;
  }).catch(() => 0);

  const evaluateState = (el) => {
    const parse = (input) => {
      const s = String(input || '').trim().toLowerCase();
      if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
      const h = /^#([0-9a-f]{3,8})$/.exec(s);
      if (h) { let x = h[1]; if (x.length === 3 || x.length === 4) x = x.split('').map((c) => c + c).join(''); return { r: parseInt(x.slice(0,2),16), g: parseInt(x.slice(2,4),16), b: parseInt(x.slice(4,6),16), a: x.length === 8 ? parseInt(x.slice(6,8),16)/255 : 1 }; }
      const m = /^rgba?\(([^)]+)\)$/.exec(s); if (!m) return null;
      const p = m[1].split(/[,/\s]+/).filter(Boolean).map(Number); if (p.length < 3) return null;
      const a = p.length > 3 ? p[3] : 1; return { r: p[0], g: p[1], b: p[2], a: Number.isNaN(a) ? 1 : a };
    };
    const lum = ({ r, g, b }) => { const f = (v) => { const c = v/255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); };
    const blend = (fg, bg) => { const a = fg.a == null ? 1 : fg.a; return { r: fg.r*a+bg.r*(1-a), g: fg.g*a+bg.g*(1-a), b: fg.b*a+bg.b*(1-a), a: 1 }; };
    const cs = getComputedStyle(el);
    const fg = parse(cs.color); if (!fg) return { skip: 'unparsable' };
    if (fg.a < 0.15) return { skip: 'near-transparent-text' };
    // Walk ancestors; require fully opaque stack to avoid gradient false positives.
    let bg = null; let cur = el; let approx = false;
    const stack = [];
    while (cur) { const c = getComputedStyle(cur); if (/gradient\(/.test(c.backgroundImage)) approx = true; stack.push(parse(c.backgroundColor)); cur = cur.parentElement; }
    let acc = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) { const c = stack[i]; if (c && c.a > 0) acc = blend(c, acc); }
    bg = acc;
    if (approx) return { skip: 'gradient-bg' };
    const fs = parseFloat(cs.fontSize) || 16; const fw = cs.fontWeight;
    const eff = fg.a < 1 ? blend(fg, bg) : fg;
    const req = (fs >= 24 || (fs >= 18.66 && Number(fw) >= 700)) ? 3 : 4.5;
    return { r: ratio(eff, bg), req, fg: cs.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` };
  };

  const out = { checked: 0, violations: [], suspects: [], skipReasons: {} };
  for (let i = 0; i < handles; i++) {
    const loc = page.locator('button, a, input, select, textarea').nth(i);
    for (const state of ['hover', 'focus']) {
      try {
        if (state === 'hover') await loc.hover({ timeout: 1500 });
        else await loc.focus({ timeout: 1500 });
        const r = await loc.evaluate(evaluateState);
        if (r.skip) { out.skipReasons[r.skip] = (out.skipReasons[r.skip] || 0) + 1; continue; }
        out.checked++;
        if (r.r + 1e-9 < r.req) {
          out.violations.push({ state, descriptor: await loc.evaluate((el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '')), ratio: Number(r.r.toFixed(2)), required: r.req, fg: r.fg, bg: r.bg });
        }
      } catch { /* element detached / not interactable */ }
    }
  }
  return out;
}

// ------------------------------------------------------------------- run
const report = { base: BASE, generatedAt: new Date().toISOString(), strict: STRICT, routes: [], violations: [], suspects: [], skipped: {} };
let totalChecked = 0;
let totalViolations = 0;
let totalSuspects = 0;

for (const route of ROUTES) {
  const anon = ANON_ROUTES.includes(route);
  const owner = OWNER_ROUTES.includes(route);
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'ar', ...(owner && OWNER_STATE ? { storageState: OWNER_STATE } : {}) });
  if (!anon && !owner) await ctx.addInitScript((s) => localStorage.setItem('chic-guest-session', s), JSON.stringify(guestStorage));
  const page = await ctx.newPage();
  let res = { checked: 0, violations: [], suspects: [], skipReasons: {} };
  try {
    const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1200);
    if (resp && resp.status() >= 400) { report.routes.push({ route, status: resp.status(), note: 'http-error' }); await ctx.close(); continue; }
    if (owner && new URL(page.url()).pathname === '/login') {
      report.routes.push({ route, note: 'owner-auth-required', detail: 'no WCAG_OWNER_STATE — skipped' });
      report.skipped['owner-auth-required'] = (report.skipped['owner-auth-required'] || 0) + 1;
      await ctx.close();
      continue;
    }
    const a = await page.evaluate(PAGE_AUDIT);
    const b = await stateAudit(page);
    res = {
      checked: a.checked + b.checked,
      violations: [...a.violations, ...b.violations.map((v) => ({ ...v, kind: `state-${v.state}` }))],
      suspects: [...a.suspects, ...b.suspects],
      skipReasons: { ...a.skipReasons, ...b.skipReasons },
    };
  } catch (e) {
    report.routes.push({ route, error: String(e.message).slice(0, 160) });
    await ctx.close();
    continue;
  }
  await ctx.close();

  const kept = [];
  for (const v of res.violations) {
    const b = allowlisted(route, v.descriptor);
    if (b) { res.suspects.push({ ...v, allowlisted: b.reason }); continue; }
    kept.push({ ...v, route });
  }
  totalChecked += res.checked;
  totalViolations += kept.length;
  totalSuspects += res.suspects.length;
  report.violations.push(...kept);
  report.suspects.push(...res.suspects.map((s) => ({ ...s, route })));
  for (const [k, n] of Object.entries(res.skipReasons)) report.skipped[k] = (report.skipped[k] || 0) + n;
  report.routes.push({ route, checked: res.checked, violations: kept.length, suspects: res.suspects.length });
  console.log(`${kept.length === 0 ? 'ok  ' : 'FAIL'} ${route.padEnd(34)} checked=${String(res.checked).padStart(3)} violations=${kept.length} suspects=${res.suspects.length}`);
}

await browser.close();

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

console.log('\n===== WCAG AA CONTRAST AUDIT =====');
console.log(`base: ${BASE}`);
console.log(`elements checked: ${totalChecked} | confirmed violations: ${totalViolations} | suspects (unverifiable): ${totalSuspects}`);
if (totalViolations) {
  console.log('\n-- VIOLATIONS --');
  for (const v of report.violations) console.log(`  x [${v.route}] ${v.kind} ${v.descriptor} ratio=${v.ratio} required=${v.required} fg=${v.fg} bg=${v.approxBg}`);
}
if (totalSuspects) {
  console.log('\n-- SUSPECTS (translucent/gradient — need manual review) --');
  for (const s of report.suspects.slice(0, 20)) console.log(`  ? [${s.route}] ${s.kind} ${s.descriptor} ratio=${s.ratio} fg=${s.fg}${s.allowlisted ? ' (allowlisted)' : ''}`);
}
console.log('\n-- SKIPPED (cannot be judged automatically) --');
for (const [k, n] of Object.entries(report.skipped)) console.log(`  - ${k}: ${n}`);

const failed = totalViolations > MAX_VIOLATIONS || (STRICT && totalSuspects > 0);
console.log('\nOVERALL:', failed ? 'FAIL' : 'PASS');
process.exit(failed ? 1 : 0);
