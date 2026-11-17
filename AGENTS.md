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

## المساعد الذكي «فهد» — المعمارية والسلوك (مُتحقَّق منه)
- الملفات: الخادم `functions/api/ai.js` (Cloudflare Function على `/api/ai`)، والواجهات
  `src/components/RoyalHome/AIChatWidget.jsx` (النافذة الرئيسية، للموثّقين) و
  `src/components/AIChat.jsx` (مسار `/ai-chat`).
- النموذج: `openai/gpt-oss-120b` عبر Groq. **نموذج استدلالي**: بلا `max_completion_tokens`
  قد يستهلك الميزانية كلها في الاستدلال ويعيد `content` فارغاً → 502 → رد احتياطي.
  لذلك السقف `max_completion_tokens: 2048` موجود — لا تحذفه.
- **قاعدة التحية**: التحية تُردّ **فقط** إذا بدأ المستخدم رسالته بتحية. الفرض على طبقتين:
  (1) الموجّه يأمر بذلك صراحةً، (2) حاجز حتمي `stripUnsolicitedGreeting()` في الكود
  يزيل أي تحية افتتاحية إن لم يسلّم المستخدم. لا تعتمد على النموذج وحده.
- **الإجابة على كل شيء**: الموجّه يأمر بالإجابة على أي سؤال (علم/معرفة/حياة) بلا استثناء.
  لا تُعد كلمة «تقريباً» أو «ما أعرف» إلى الموجّه، ولا تجعل الردود الاحتياطية مراوغة.
- تصنيف الجنس: قائمتا `femaleNames`/`maleNames` تُفحَص الأنثى أولاً، فلا يجوز أن يوجد اسم
  في القائمتين معاً (كان `'ماجد'` كذلك فيُخاطَب الرجل بصيغة أنثى).
- **الفرض خادمي**: `checkAiRateLimit` يفشل مغلقاً (fail-closed) — إن غاب ربط D1 (`DB`)
  تُرفض كل الطلبات. ربط D1 في `wrangler.toml` تحت `[env.production.d1_databases]`.
- اختبارات: `functions/api/ai.test.js` + `src/components/AIChat.test.jsx` +
  `src/components/RoyalHome/AIChatWidget.test.jsx`. تستبدل نداء Groq وطبقة D1 فقط،
  وتختبر منطق `onRequest` الحقيقي.
