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

## صفحات المحتوى المستقلة + تصحيح حالة (2026-11-17)
- **مسارات جديدة حقيقية**: `/careers` (وظائفنا) · `/partners` (شركاؤنا) · `/privacy` (الخصوصية).
  ملفاتها: `src/pages/CareersPage.jsx`, `PartnersPage.jsx`, `PrivacyPage.jsx`، وبياناتها المشتركة
  في `src/data/infoPages.js`، وتنسيقها في `src/styles/info-pages.css` (مستورد في `main.jsx`).
  كلها **نصّ للقراءة فقط** — لا أزرار ولا روابط تنقّل، والاستثناء الوحيد `mailto:`/`tel:`.
  محميّة بـ`ProtectedRoute` مثل `/about` و`/terms` (لم تُمسّ سياسة المصادقة).
- **روابط التذييل كانت خاطئة**: «وظائفنا» → `/contact`، «شركاؤنا» → `/branches`، «الخصوصية» → `/terms`.
  صُحّحت إلى مساراتها الحقيقية. لا تكرار: كل مسار مرة في الراوتر ومرة في التذييل فقط (لا في الترويسة/الدرج).
- **نص قانوني في التذييل** (`NovHomePage.jsx`): أمان/خصوصية + الأنظمة السعودية + «موقعنا : حفر الباطن» + الحقوق،
  كل جملة في سطر، محاذاة يمين (`.rz-footer-legal` في `NovHome.css`).
- **الجوال** يُشتق من `CONTACT_INFO.PHONE_1` ويُعرض بصيغة محلية `0536667222` (لا `05XXXXXXXX`).
- اختبارات: `src/pages/infoPages.test.jsx` (11) · `src/components/RoyalHome/NovHomeFooter.test.jsx` (3).

### تصحيح حالة مهم (تجنّب الاعتماد على تقارير قديمة)
- **PR #24 `fix/reviews-privacy` = CLOSED (غير مدموج)**. الفرع باقٍ (`origin/fix/reviews-privacy`).
  لكن **معمارية الخصوصية موجودة فعلاً على `main`**: `review_private`/`comment_private` + `hasNoPublicPII`
  في `firestore.rules` (يُستخدم `publicSafe` على الفرع القديم فقط — **0 مرجع على `main`**).
- **لا يوجد `scripts/backfill-public-safe.mjs` على `main`** (موجود على الفرع القديم فقط).
  أداة `main` الحقيقية: `scripts/legacy-privacy-report.mjs` (**قراءة فقط، بلا `--apply`**) +
  لوحة داخل التطبيق `src/components/owner/PrivacyAuditPanel.jsx` (تبويب «تدقيق الخصوصية» في غرفة المالك)
  التي تُصنّف وتُنظّف/تُرحّل/تحذف مع أرشفة وتدقيق.
- **ثغرة list-level قائمة**: قاعدة `list` على `reviews`/`comments` لا تفحص `hasNoPublicPII`
  (فحص الاستعلام لا لكل مستند) → سجل قديم يحمل بريداً يظهر عبر استعلام المجموعة حتى يُنظَّف.
  الفحص `get` يحجبه. الإصلاح = ترحيل السجلات القديمة من لوحة المالك.
- **PR #25 `fix/login-page-design` = MERGED**: مواصفات صفحة الدخول (اسم أسود `#000000`، العبارة العريضة،
  السطر النحيف الواحد، بطاقة المالك الأكبر، «⚜️ دخول صاحب الموقع ⚜️» بثلاث ضغطات، زر «موقع حراج أونلاين»،
  تصغير أزرار إنشاء الحساب/النسيان/Google/الزائر) **منفَّذة على `main`**.
- **مصدر الحقيقة هو المستودع الحالي** — لا تقرير سابق؛ بعضه وصف حالة لا تطابق `main`.

## جولة «استكشف الموقع» + تحسين الترويسة (2026-11-17)
- **نُقلت روابط «روابط الموقع»** من أسفل الرئيسية إلى قائمة الثلاث شرطات باسم **«استكشف الموقع»**
  (`src/data/royalMenu.js` — المجموعة `explore`) وتحتوي الروابط الثلاثة غير المكرّرة فقط:
  `/careers` · `/partners` · `/privacy` (فتح/إغلاق بزر **+/−**).
- **حُذف قسم «روابط الموقع» بالكامل** من تذييل `NovHomePage.jsx` (بقي النص القانوني الأربعة أسطر فقط،
  نص قراءة محاذاة يمين). حُذف أيضاً `FOOTER_LINKS` + `footerLinks` + `footerOpen` + `goToPath`
  والأيقونات غير المستخدمة، وقائمة `home.footer_links` الميتة من `contentRegistry.js`.
- **صفر تكرار داخل الدرج**: حُذفت مجموعة «خدمات سريعة» (كل مساراتها موجودة في مجموعات أخرى)،
  وأُزيل تكرار `/catalog/electronics` (بقي في «إلكترونيات» فقط). تحقق آلي في `navAndAdsFixes.test.jsx`.
- **البريد الرسمي**: `src/data/infoPages.js` → `kal6667222@gmail.com` للثلاث صفحات (نفس بريد «تواصل معنا»).
  أسماء الشركاء في `PartnersPage.jsx`: stc · علم (Elm) · سبل (البريد السعودي) · AWS.
- **تحسين محافظ للترويسة** في `rooz-royal.css`: أهداف لمس ≥44px (أيقونات/درج/روابط جوال)،
  مسافات جوال، شريط تنقل بتمرير أفقي بلا scrollbar — **بلا تغيير أي زر/مسار/سلوك**.
- **مصدر الجوال** يبقى `CONTACT_INFO.PHONE_1` → يُعرض `0536667222`.
- **حالة**: 253 اختباراً · lint 0 · build ✓. الصفحات الثلاث تبقى محميّة بعد تسجيل الدخول (لا تغيير).

## جولة جلسة الزائر + روابط tel (PR #49، 2026-11-19) — غير مدموج
- **جلسة الزائر (دقيقتان)**: `expireGuestSession` + `acknowledgeGuestExpired` في `useStore.js`،
  وعدّاد/لافتة/تحويل في `App.jsx`. لافتة تتحول للأحمر في آخر 10 ثوان (`rgba(179,38,30,.96)`)
  ثم `/login` مع `guestExpiredMsg` في `sessionStorage` تُقرأ في `Login.jsx`.
  **إصلاح**: `get().guestSession.active` كان يرمي TypeError إذا كانت الجلسة `null` → `?.`.
- **درس اختبار**: `getGuestRemaining()` يُرجع **مللي ثانية** لا ثوانٍ.
- **`tel:` المزدوج**: `INFO_PHONE_TEL` في `src/data/infoPages.js` صار `tel:+966…` كاملاً،
  والصفحات تستخدمه مباشرة بلا `"tel:" +`. `toTelHref()` يوحّد 05…/966…/00966….
- **`.rl-eye`**: كان بلا تنسيق (18×18) → صار 44×44.
- **درس تصميم**: المالك طلب أزرار الدخول **أصغر** — لا تُكبّرها إلى 44px.

## تصحيح مهم: لا يوجد ترحيل `publicSafe` على `main`
- `scripts/backfill-public-safe.mjs` **غير موجود على `main`** — فقط على الفرع المُغلق
  `fix/reviews-privacy`. و`publicSafe` **لا وجود له في `firestore.rules`** (0 نتيجة).
- نموذج `main` الفعلي: `reviews` عام إذا `hidden == false` · `comments` عام إذا
  `status == 'approved'` · الحماية عبر `hasNoPublicPII` تمنع كتابة حقول الهوية من المصدر.
- **لذلك لا backfill لإعادة الإظهار** — السجلات القديمة تبقى ظاهرة كما هي. الخطر محصور
  في سجلات قديمة تحمل حقول هوية.
- **الأدوات الجاهزة**: `PrivacyAuditPanel` (غرفة المالك → «تدقيق الخصوصية») يعرض 4 فئات
  ويُصلح/يحذف مع أرشفة + تدقيق. و`scripts/legacy-privacy-report.mjs` قراءة فقط
  (fetch واحد بلا `method`، لا `--apply`).
- **بيئة العمل**: لا Java ولا محاكي Firestore → `npm run test:rules` غير قابل للتشغيل هنا.
