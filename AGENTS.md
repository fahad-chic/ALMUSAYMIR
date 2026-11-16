# AGENTS.md — ALMUSAYMIR

ذاكرة المستودع للوكلاء. تُقرأ في كل جلسة.

## المشروع
- منصة **المسيمير | ALMUSAYMIR** — متجر شامل عربي + حراج.
- التقنيات: React + Vite + Firebase (auth/firestore) + react-router-dom.
- Firebase project: `anaqa-chic-4e437` · النشر: Cloudflare Pages (`almusaymir.pages.dev`).

## أوامر (Commands)
- `npm run lint` — ESLint (يجب أن ينتهي بـ exit 0).
- `npm run build` — بناء Vite.
- `npm test` — Vitest (الوحدات).
- `npm run contrast` — تدقيق تباين WCAG AA (يحتاج خادم preview على `BASE_URL`).
- `npm run test:rules` — قواعد Firestore على المحاكي (يتطلب Java 21).

## درس مهم — علامة ❌ في GitHub Actions قد تكون **إلغاءً** لا **فشلًا**
- ملف CI (`.github/workflows/ci.yml`) فيه:
  ```yaml
  concurrency:
    group: ci-${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: true
  ```
- معنى ذلك: أي دفع جديد على نفس الفرع (خصوصًا `main`) **يُلغي** التشغيل الجاري قبله.
- عند دفع عدة التزامات (commits) بسرعة على `main`، تظهر ❌ على الالتزامات القديمة بسبب `cancelled` — وليس لأن الكود خطأ.
- **قبل وصف أي ❌ بأنه فشل**:
  1. `gh run list --repo fahad-chic/ALMUSAYMIR --limit 10` واقرأ عمود الحالة (`cancelled` ≠ `failure`).
  2. `gh api repos/fahad-chic/ALMUSAYMIR/actions/runs/<ID>/jobs --jq '.jobs[]|"\(.conclusion)  \(.name)"'`.
  3. تحقق فعليًا محليًا: `npm run lint` + `npm run build` + `npm test`.
- **إصلاح الإلغاء**: `gh run rerun <RUN_ID> --repo fahad-chic/ALMUSAYMIR`.
  - تحذير: إعادة تشغيل أكثر من تشغيل في وقت واحد على نفس الفرع تُلغي بعضها (نفس مجموعة الـconcurrency) → **أعد تشغيل تشغيل واحد فقط** وانتظر انتهاءه قبل التالي.
- لتجنّب الإلغاء من الأصل: ارفع ملفًا واحدًا وانتظر ~3 دقائق قبل التالي.
