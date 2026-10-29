------------------------------
------ button-audit.mjs ------
------------------------------
// تدقيق الأزرار والروابط والتكرار في الموقع.
// الاستخدام: BASE_URL=http://localhost:5173 npm run buttons
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/',
  '/contact',
  '/about',
  '/faq',
  '/terms',
  '/wanted-dress',
  '/branches',
  '/advertisements',
  '/employees',
  '/haraj',
  '/haraj/post',
  '/notifications',
  '/inbox',
  '/otp',
  '/users',
  '/settings',
  '/chat',
  '/ai-chat',
  '/catalog/electronics',
  '/haraj/catalog/wedding-dresses',
];

const normalise = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const result = {
  checkedRoutes: 0,
  checkedInteractive: 0,
  errors: [],
  duplicates: [],
  skipped: [],
};

const browser = await chromium.launch({ headless: true });
try {
  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(250);
      const audit = await page.evaluate(() => {
        const visible = (element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none'
            && style.visibility !== 'hidden'
            && Number(style.opacity || 1) > 0
            && rect.width > 0
            && rect.height > 0;
        };

        const nodes = [...document.querySelectorAll('button, a, [role="button"], [role="link"]')]
          .filter(visible)
          .filter((element) => !element.disabled && element.getAttribute('aria-disabled') !== 'true');
        const errors = [];
        const records = [];

        for (const element of nodes) {
          const name = (element.getAttribute('aria-label') || element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
          const tag = element.tagName.toLowerCase();
          const href = tag === 'a' ? (element.getAttribute('href') || '').trim() : '';
          const role = element.getAttribute('role') || tag;
          const selector = `${tag}.${[...element.classList].slice(0, 2).join('.')}`;

          if (!name) errors.push({ type: 'missing-accessible-name', tag, selector });
          if (tag === 'a' && (!href || href === '#' || href.toLowerCase().startsWith('javascript:'))) {
            errors.push({ type: 'empty-or-placeholder-link', name: name || '(بدون اسم)', href, selector });
          }

          records.push({ key: `${role}|${name}|${href}`, name, href, selector });
        }

        const counts = new Map();
        records.forEach((record) => counts.set(record.key, (counts.get(record.key) || 0) + 1));
        const duplicates = [...counts.entries()]
          .filter(([, count]) => count > 1)
          .map(([key, count]) => ({ key, count }));

        return { checked: nodes.length, errors, duplicates };
      });

      result.checkedRoutes += 1;
      result.checkedInteractive += audit.checked;
      audit.errors.forEach((error) => result.errors.push({ route, ...error }));
      audit.duplicates.forEach((duplicate) => result.duplicates.push({ route, ...duplicate }));
      console.log(`${audit.errors.length ? 'FAIL' : 'ok  '} ${route.padEnd(34)} checked=${String(audit.checked).padStart(3)} errors=${audit.errors.length} duplicates=${audit.duplicates.length}`);
    } catch (error) {
      result.skipped.push({ route, reason: error.message });
      console.log(`SKIP ${route.padEnd(34)} ${error.message}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

console.log('\n===== BUTTON / LINK AUDIT =====');
console.log(`routes checked: ${result.checkedRoutes}`);
console.log(`interactive elements checked: ${result.checkedInteractive}`);
console.log(`confirmed errors: ${result.errors.length}`);
console.log(`duplicates for review: ${result.duplicates.length}`);
console.log(`skipped routes: ${result.skipped.length}`);

if (result.errors.length) {
  console.log('\n-- ERRORS --');
  result.errors.slice(0, 100).forEach((error) => console.log(JSON.stringify(error)));
}

if (result.duplicates.length) {
  console.log('\n-- DUPLICATES FOR MANUAL REVIEW --');
  result.duplicates.slice(0, 100).forEach((duplicate) => console.log(JSON.stringify(duplicate)));
}

if (result.skipped.length) {
  console.log('\n-- SKIPPED --');
  result.skipped.forEach((item) => console.log(JSON.stringify(item)));
}

process.exitCode = result.errors.length ? 1 : 0;

------------------------------
-------- package.json --------
------------------------------
{
  "name": "fahad-chic",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24.12.0"
  },
  "scripts": {
    "dev": "vite --port 5173 --host",
    "build": "vite build",
    "lint": "eslint . --ext .js,.jsx --quiet",
    "test": "vitest run",
    "test:contrast-unit": "vitest run src/utils/wcag.test.js",
    "contrast": "node e2e/contrast-audit.mjs",
    "contrast:strict": "node e2e/contrast-audit.mjs --strict",
    "buttons": "node e2e/button-audit.mjs",
    "preview": "vite preview --port 4173 --host",
    "analyze": "vite build --mode analyze",
    "icons": "node scripts/generate-icons.cjs"
  },
  "dependencies": {
    "firebase": "^13.1.0",
    "lucide-react": "^0.469.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.1",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@aklinker1/rollup-plugin-visualizer": "^5.12.0",
    "@eslint/js": "^9.16.0",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.5.4",
    "eslint": "^9.16.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.26",
    "globals": "^15.8.0",
    "jsdom": "^26.0.0",
    "playwright": "^1.49.1",
    "postcss": "^8.5.26",
    "sharp": "^0.35.3",
    "tailwindcss": "^3.4.19",
    "vite": "^6.0.7",
    "vitest": "^2.1.4",
    "wrangler": "^4.119.0"
  },
  "overrides": {
    "@grpc/grpc-js": "^1.13.6"
  }
}
