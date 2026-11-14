# AGENTS.md — rooz-nova

## المشروع (Project)
- منصة **المسيمير | ALMUSAYMIR** — متجر شامل عربي + حراج إعلانات (كانت: أناقة ROOZ / fahad-chic).
- المستودع القديم: `fahad-chic/fahad-chic`. المستودع الجديد: `fahad-chic/rooz-nova` (لا يُدمج إلا بموافقة المستخدم الصريحة).
- التقنيات: React + Vite + Firebase (auth/firestore) + react-router-dom.

## أوامر (Commands)
- `npm run build` — بناء Vite (يجب أن ينجح + eslint exit 0).
- `npm run lint` — فحص ESLint.

## الهوية البصرية (Visual identity) — مهم
- الألوان المعتمدة حالياً: **كريمي** `#FDFBF7` (60% خلفية)، نص `#1F1116`، **عنابي/ثانوي** `#6B1D2F`، **وردي مغبّر/أكسنت** `#D4A5A5`، وذهبي للتركيز `#C9A24B`.
- الخط: **Tajawal** (وزن **900 للعناوين العريضة** / **300 للنصوص النحيفة**). لا تستخدم Cairo.
- النصوص: **داكنة** على خلفيات فاتحة احترافية.
- الطبقات: `src/styles/contour-theme.css` (هوية عامة)، `src/styles/LoginNova.css` (صفحة الدخول)، `src/styles/logo-clean.css` (تنظيف الشعارات)، `src/styles/NovHome.css` (الرئيسية الجديدة).
- ملاحظة: ذُكر سابقاً «أزرق كهربائي #2563eb» — هذه هوية قديمة ملغاة، لا تعتمدها.

## قيود يجب عدم كسرها (Must keep)
- نفس **اسم الموقع** (المسيمير | ALMUSAYMIR). مصدر الاسم الوحيد: `src/data/brand.js` (`BRAND.AR/EN/FULL/LOGO/LOGO_WIDE/EMBED/ASSISTANT`).
- نفس **المسارات** في `src/App.jsx` (تحقق بمقارنة `path="..."` مع main).
- نفس **الصلاحيات**: غرفة المالك + المراقبة.
- **حراج يعمل فعلاً** وروابطه سليمة.
- عدم لمس `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json` دون طلب صريح.

## ملاحظة تشغيل
- النسخة المخدومة على المنفذ 12000 تُقدّم من مجلد `dist/` (نتيجة `npm run build`)، لذا أعد البناء بعد أي تعديل.
- أدوات المتصفح تنتهي مهلتها على صفحات الأنيميشن الثقيلة؛ اعتمد على فحص CSS المبني + محتوى DOM.

## الأمن والأسرار (Secrets) — مهم جداً
- **لا تُخزَّن أي أسرار في `wrangler.toml`** ولا في أي ملف متعقَّب في Git. أُزيلت منه: مفتاح Firebase، بريد المالك/المشرف، الرمز السري، أرقام الهواتف/الواتساب، البريد، وحسابات البنوك (IBAN/أرقام الحسابات).
- تُضبط الأسرار في **Cloudflare Pages → Settings → Environment variables** (Production):
  `VITE_FIREBASE_API_KEY`, `VITE_OWNER_EMAILS`, `VITE_ADMIN_EMAILS`, `VITE_OWNER_SECRET_CODE`,
  `VITE_PHONE_1/2`, `VITE_CONTACT_WHATSAPP_1/2`, `VITE_CONTACT_EMAIL`, `VITE_ALIAA_CONTACTS`,
  `VITE_BANK_RAJHI_NAME/IBAN/ACCOUNT`, `VITE_BANK_ARABI_NAME/IBAN/ACCOUNT`,
  `GROQ_API_KEY` (سري)، `RESEND_API_KEY` (سري).
- `wrangler.toml` يُبقي فقط المعرّفات العامة لـ Firebase (authDomain/projectId/...) وإعدادات غير حسّاسة وربط D1.
- **تحذير**: بيانات البنوك (IBAN) وأرقام الهواتف والبريد ما زالت **مكتوبة كمُرتجع (fallback) داخل الكود** في
  `src/utils/constants.js`, `src/components/RoyalHome/ContactPage.jsx`, `RoyalHarajPage.jsx`,
  `src/pages/AdDetailsPage.jsx`, `src/components/WhatsAppFloat.jsx`, `src/firebase/index.js`, `functions/api/ai.js`.
  هذه بيانات عامة معروضة للعملاء (وليست أسراراً)، لكنها تُبنى في حزمة الواجهة. إن أراد المالك جعلها قابلة للتغيير فقط عبر env vars، يجب إزالة قيم الـ fallback (يتطلب طلباً صريحاً — المستخدم طلب الإبقاء عليها حالياً).
- `dist/` و`.env` و`e2e/report/` متجاهلة في `.gitignore`.

## الدخول والتوثيق (Auth) — إلزامي
- **لا دخول إلا بحساب Firebase Email/Password مُوثّق** (`emailVerified === true`) و**ممنوع** الدخول المجهول/الزائر.
- `signInAnonymously` مُزال من `src/utils/firebaseSession.js`؛ لا مسار زائر ولا بوابة OTP.
- `src/components/VerifyEmailGate.jsx` (مستورد في `App.jsx`) يعرض شاشة «تحقق من بريدك» مع
  إعادة إرسال الرسالة وتسجيل خروج، ويمنع فتح أي صفحة قبل التوثيق.
- اختبار حيّ مؤكَّد: إنشاء حساب → وصول رسالة Firebase من
  `noreply@anaqa-chic-4e437.firebaseapp.com` → التوثيق → `emailVerified = true` → الموقع يُفتح.
- مكوّنات OTP القديمة (`OtpModal.jsx`, `functions/api/otp`, `sendOtp`/`verifyOtp`) **مُبقاة غير مستخدمة** بقرار المالك.

## صفحة الدخول (Login) — ملاحظات
- ملف `src/styles/logo-clean.css` (مستورد في `main.jsx`) يزيل أي خلفية/إطار/حلقة عن كل الشعارات (الشعارات PNG شفافة أصلاً).
- لوحة التشخيص وإصدار الواجهة أُزيلا من الواجهة ويُطبعان في الـ Console فقط.
- أزرار الدخول: (نسيت كلمة المرور | إنشاء حساب) ثم (Google | دخول). زر «دخول الزوار المؤقت» **أُزيل**.
- **الزائر مطرود الآن**: أي مسار محمي (بما فيه `/` و`/haraj`) يوجّه غير الموثّق إلى `/login`. لا شريط عدّاد ولا جلسة مؤقتة.
- **`/haraj` مسار محمي**: زر «حراج» في صفحة الدخول يوجّه لغير الموثّق إلى `/login`.

## الاختبار الآلي
- `npx vitest run` — 115 اختبار (15 ملفاً) يجب أن تمرّ.
- `BASE_URL=http://localhost:12000 node e2e/full-audit.mjs` — تدقيق شامل (مصفوفة صلاحيات + تفاعل صفحة الدخول + تجاوز أفقي). يجب أن ينتهي بـ `OVERALL: PASS`.

## الهوية الملكية الجديدة (rooz-royal) — الواجهة فقط
- **قاعدة صارمة**: هذه التغييرات واجهة فقط. لم تُمسّ Routes/Firebase/Firestore/Functions/APIs/الصلاحيات/Rules.
- ملف النظام البصري: `src/styles/rooz-royal.css` (يُستورد **أخيراً** في `main.jsx` ليتقدّم على أي هوية سابقة).
  - الألوان: Royal Burgundy `#541426` · Deep Burgundy `#2A0B15` · Royal Gold `#C9A24D` · Champagne `#E3C878` · Ivory `#F7F1E6` · Warm White `#FFFDF8` · Dark `#181316` · Muted `#766D72`.
  - يعرّف جسراً (`--co-*`, `--nv-*`, `--ch-*`, `--rh-*`) يحوّل بقية الصفحات تلقائياً للهوية الجديدة دون تعديلها.
- الترويسة الملكية: `src/components/RoyalHeader.jsx` — طبقتان (بحث كبير + أيقونات Lucide + شريط تنقل مختصر) + درج جانبي بزر (+) الذكي.
  - تُدمج داخل `Navigation.jsx` (استُبدلت كتلة `<nav className="navbar">` القديمة بالكامل) وتستقبل الحالة/الدوال جاهزة — لا منطق داخلها.
- بيانات القائمة الملكية: `src/data/royalMenu.js` (كل مسار فيها موجود فعلاً في `App.jsx` — لا روابط ميتة).
- الصفحة الرئيسية: `src/components/RoyalHome/NovHomePage.jsx` — هيرو ملكي + نقاط ثقة (rz-trust) + «اكتشفي ROOZ» (rz-discover) + FAQ (rz-faq) + فوتر ملكي (rz-footer).
- عند تعديل الهوية مستقبلاً: عدّل `rooz-royal.css` فقط؛ لا تعدّل ملفات الصفحات لهذا الغرض.

## توحيد الألوان (theme.css) — المصدر الوحيد
- **ملف الألوان الوحيد**: `src/styles/theme.css` — كل ألوان الموقع كمتغيّرات داخل `:root` فقط.
  - يُستورد **أخيراً** في `src/main.jsx` (بعد `rooz-royal.css` و`rooz-pearl.css`).
  - **لتغيير اللون الأساسي**: عدّل سطراً واحداً: `--rz-primary-rgb: R, G, B;` فيتبدّل الموقع كامل.
  - رموز الأساس: `--rz-primary(-rgb)`, `--rz-ink(-rgb)`, `--rz-gold(-rgb)`, `--rz-ivory(-rgb)`, `--rz-muted(-rgb)`, `--rz-success(-rgb)`, `--rz-error(-rgb)`, والظلال `--rz-shadow*`.
- **قاعدة صارمة**: لا تكتب ألواناً ثابتة (hex/rgb/rgba) في أي ملف آخر — استخدم `var(--rz-*)`.
- لدمج لون مع شفافية داخل JSX استخدم `colorAlpha(color, 0.13)` من `src/utils/color.js` بدل `${color}20`.
- كتل `:root` القديمة أُزيلت من `contour-theme.css`, `nova-theme.css`, `rooz-pearl.css`, `rooz-royal.css`, `global.css`, `index.css`؛ جسر التوافق (`--co-*`, `--nv-*`, `--ch-*`, `--rh-*`, `--rzp-*`, والمتغيّرات القديمة) موجود في `theme.css` بقيم مطابقة تماماً للأصل (بلا أي تغيير بصري).
- عند تعديل الهوية مستقبلاً: عدّل `theme.css` فقط.

## تدقيق الملفات غير المستخدمة (Cleanup audit) — نتائج مثبتة
تم بناء رسم استيراد كامل (`src/main.jsx` كمدخل + كل الاستيرادات الساكنة والديناميكية).
- **ملفات يتيمة فعلاً** (غير مستوردة إطلاقاً، ولا يدخل أي منها حزمة الإنتاج):
  - `src/permissions/requirePerm.js` — الوحيد من `permissions/*` الذي لا يُستورد. المكوّنات تستورد
    `requirePerm` من `rbacService.js` مباشرة. (نفس الملف موجود في `HEAD`، ليس من إعادة العلامة.)
  - `src/utils/wcag.js` — لا يُستورد من كود الإنتاج؛ يستورده `src/utils/wcag.test.js` فقط
    (`npm run test:contrast-unit`) ولا يستخدمه `e2e/contrast-audit.mjs`.
- **ليست يتيمة (تحذير)**: `src/firebase/{auth,firestore,storage}.js` تظهر "يتيمة" في التحليل
  الساذج لكنها تُصدَّر عبر `src/firebase/index.js` (`export * from './auth'` …) — لا تحذفها.
- **تصديرات ميتة** داخل `src/components/RoyalHome/sectionsData.js`: `HARAJ_BANNERS`,
  `ROYAL_KINGS`, `PREDEFINED_COMMENTS`, `CATALOG_ITEMS` — لا مستورد لها (بعضها يشير لصور
  `royal-*` غير موجودة). **مثبت بالفحص: الأربعة tree-shaken** (نصوصها غير موجودة في `dist`) →
  حذفها مصدر-فقط بلا أي مكسب أداء. حذفها يحتاج موافقة صريحة.
- **كود ميت داخل `src/components/Navigation.jsx`**: `SECTION_ICONS`، `expandedSection`،
  `storeMenuOpen`، `visiblePages`، `catalogSections`، و10 أيقونات Lucide مستوردة بلا استخدام
  (أيقونات lucide شجرية-tree-shaken → 0 بايت في الحزمة).
- **أصول غير مستدعاة**: `public/assets/logo.png`، `public/assets/og-image.jpg`،
  و4 أيقونات PWA (`icon-128/144/152/384`).
- **نسخ مكررة**: كتلة `VITE_*` و`ALIAA_*`/`STORE_*` مكرّرة حرفياً في `wrangler.toml`
  (تُبنى في الواجهة عبر `VITE_*`، والنسخة بلا `VITE_` للخادم فقط — ليست زائدة).

## تنظيف CSS مُثبَت (Verified CSS prune) — تنفيذ آمن
طريقة التحقق المستخدمة: استخراج كل أصناف `className` (ساكنة + قوالب + شرطية + `classList`)
من `src/**/*.{js,jsx}` و`index.html`، ثم حذف كل قاعدة CSS لا يُشارك صنفها أي استخدام.
**الإثبات البصري**: لقطة `fullPage` قبل/بعد بنفس الـhash بايت-بايت (تطابق تام) للصفحات المتأثرة.
- `src/styles/RoyalHome.css`: 908 → ~272 سطراً (21.5KB → 7.5KB). 55 قاعدة ميتة (من بقايا
  `RoyalHomePage` القديمة: `rh-header/rh-brand/rh-hero/rh-card/rh-owner/rh-contest/…`).
  المُبقي: `.rh-root` (الأساس + الأزرار + العناوين)، `.rh-bg`، `.rh-topline` (مستخدمة فعلاً في
  `CatalogPage.jsx` و`RoyalHarajPage.jsx`)، وقواعد `rh-card-*` القديمة التي لا تُستخدم الآن.
- `src/styles/NovHome.css`: 733 → ~428 سطراً (16.7KB → 10.2KB). 35 قاعدة ميتة
  (`nov-features/nov-feature*/nov-tiles/nov-tile*/nov-branch-*/nov-haraj/nov-sec-head/nov-btn-*`).
- `src/styles/LoginNova.css`: 4 قواعد ميتة (`rl-alert--error/success`, `rl-footer-note`, `rl-copy`).
- **`public/manifest.json`**: أُزيلت 4 مراجع أيقونات PWA غير موجودة (`icon-128/144/152/384`)
  كانت تُنتج 404 في كل تثبيت PWA. المتبقي 4 أيقونات موجودة فعلاً فقط.
- **ما زال ميتاً ولم يُحذف بعد** (يحتاج موافقة صريحة، ~19.6KB مصدر): `src/index.css` (45 قاعدة:
  `.btn-*`, `.badge-*`, `.alert-*`, `.card-body/header`, `.grid-*`, `.flex-*`, `.text-muted/soft/gold`,
  `.skeleton`, `.spinner`, `.owner-alert`, `.royal-owner-bar`, `.bg-gray-900/700`, `.border-gray-700`)
  و`rooz-royal.css` (27)، `nova-theme.css` (18)، `global.css` (9)، `contour-theme.css` (4)،
  `rooz-luxury-3d.css` (4). احذر: `.rz-btn/.rz-card/.rz-glass/.rz-discover/.nv-*` تُستخدم كأسماء
  في طبقات أخرى — راجع قبل الحذف.
- **ملاحظة تحقق**: فحص `e2e/full-audit.mjs` فيه خطأ قائم مسبقاً `[login/bg] rgba(0,0,0,0)`
  (`.rl-root` بلا `background-color`) — **موجود قبل هذه التغييرات**، ليس ناتجاً عن التنظيف.

## تنظيف التبعيات والإعدادات (Dependency & config cleanup) — منفَّذ
- **`react-hot-toast` أُزيل** من `dependencies`: صفر استيراد في `src/` و`functions/` (المتغيّر
  `toast` في `OwnerPrivateRoom.jsx` هو حالة محلية للرسائل، وليس مكتبة). لم يكن في الحزمة أصلاً
  (`grep` على `dist/assets/*.js` = 0). لا شيء يعتمد عليه (`npm ls` = فارغ).
- **`vite.perf.config.js` + سكربت `build:perf` أُزيلا**: إعداد بناء موازٍ لا يستخدمه CI
  (`.github/workflows/ci.yml` يشغّل lint/test/build/contrast فقط) ولا النشر (Cloudflare يستخدم
  `npm run build` → `vite.config.js`). وكان **ناقصاً** `define.__BUILD_STAMP__` الموجود في
  `vite.config.js`، أي أنه نسخة قديمة متفرّعة. `analyze` يبقى في `vite.config.js`.
- **`scripts/generate-icons.cjs` أُعيدت كتابته لهوية «المسيمير | ALMUSAYMIR»**: كان يولّد
  أيقونات بهوية «اناقة ROOZ» القديمة (SVG نصّي بخلفية كحلية) — تشغيله كان سيُفسد أيقونات الموقع.
  الآن: يقرأ `public/assets/emblem.png` (الشعار الفعلي)، يركّبه على خلفية كريمية `#FDFBF7`
  (نفس `background_color` في manifest) بنسبة 72% (هامش 14%)، ويصدّر PNG بجدول ألوان 256 لوناً.
  المقاسات `[72, 96, 192, 512]` **مطابقة تماماً** لما يشير إليه `public/manifest.json`.
  الناتج أصغر من الأصل: 512 = 33KB (كان 36KB) و72 = 2.2KB (كان 2.6KB) — نفس الشكل.
- **أُبقي بطلب المالك**: `src/permissions/requirePerm.js`، `src/utils/wcag.js` + `wcag.test.js`，
  `public/favicon.ico`، `public/assets/og-image.jpg`، `src/data/saudiCities.js`.

## تدقيق الكود الميت — نتيجة الفحص الدقيق (2026-10-22) + قرارات المالك
منهجية الفحص: **رسم استيراد حقيقي** (يشمل `import` + `export … from` + `import()` الديناميكي
لأن `React.lazy` يستخدمه) — لا تعتمد على `grep` ساذج باسم الملف: يُنتج ~88 نتيجة خاطئة.
النتيجة: **118 من 120 ملف مصدر مستخدم فعلاً**. الفحص الساذج كان سيُظهر
`firebase/{auth,firestore,storage}.js` وكل صفحات `RoyalHome/*` و`pages/*` "يتيمة" وهي ليست كذلك.
- **الوحيد غير المستخدم فعلاً**: `src/permissions/requirePerm.js` (4K) — كل المكوّنات تستورد
  `requirePerm` من `rbacService` مباشرة. **قرار المالك: أُبقي** — لا تحذفه.
- **حُذف بموافقة المالك (PR #16)**: 6 سكربتات Capacitor معطّلة من `package.json`
  (`cap:init/add:android/add:ios/sync/android/ios`) — لا `capacitor.config.*`، ولا حزمة
  `@capacitor` مثبّتة، ولا أي استيراد. التبعيات لم تُمس.
- **قرار المالك: لا تحذف**: `public/assets/og-image.jpg`، `public/favicon.ico`، `public/sw.js`.
- **مؤجّل بطلب المالك**: تنظيف CSS الكبير (~35K مصدر: 105 قاعدة بأصناف لا تظهر في JSX) — يحتاج
  إثبات لقطات بايت-بايت لكل مسار قبل التنفيذ. **وتصديرات `sectionsData.js` الميتة**
  (`HARAJ_BANNERS`, `ROYAL_KINGS`, `PREDEFINED_COMMENTS`, `CATALOG_ITEMS` — مثبتة tree-shaken).
- **تحذير تحليل ساذج**: `@testing-library/dom` يبدو "غير مستخدم" لكنه **peer dependency**؛
  `sharp`/`wrangler`/`eslint`/`postcss`/`autoprefixer` أدوات CLI لا تُستورَد — **لا تحذفها**.

## صفحة الدخول — قياسات الهوية (مُثبَتة على الموقع الحي، جوال 390px)
- الشعار: `logo-almusaymir.png` (549×576 مصدر) يُعرض **117×123px**، بخلفية **شفافة تماماً**
  (`rgba(0,0,0,0)`، بلا إطار) — لا صندوق أسود.
- حد الشعار الكحلي: `drop-shadow(rgba(15,23,42,.92) …)` 4 اتجاهات → التباين الفعلي على الخلفية
  **4.16** (كان **1.07** قبل الإصلاح).
- بطاقة المالك: تدرّج كحلي (`rgb(27,37,55)` → `rgb(15,23,42)`) + برواز ذهبي
  `rgba(201,162,39,.62)`.
- **فرق الحجم مقصود**: العرض **1.07×** فقط (362 مقابل 337px — "أكبر قليلاً")، لكن المساحة
  **1.67×** لأن بطاقة المالك تحمل 3 عناصر إضافية لا وجود لها عند المشرفين:
  `rl-card-phrase` + `rl-owner-badge` (®️ المالك الرئيسي ®️) + زر `rl-contact-owner`.
  **لا تُضِف هذه العناصر لبطاقة المشرفين لتقليل الفرق** — الفرق ناتج عن المحتوى لا عن التنسيق.

## جلسة التحقق الشامل (2026-10-21) — نتائج مُثبَتة
- **تدقيق الكود الميت أُعيد بمُحلِّل استيراد دقيق** (corpus = js/jsx/css + index.html + e2e + configs،
  مع استثناء ملفات الاختبار من البحث لتمييز "يُستورد في الإنتاج" من "يُستورد في الاختبار فقط").
  النتيجة تطابق قرارات المالك أعلاه حرفياً — **لا يوجد ملف جديد آمن للحذف بلا موافقة**:
  `requirePerm.js` (مُبقى)، `wcag.js` (اختبار وحدة فقط — مُبقى)، `firebase/index.js`
  (يُستورَد عبر `'../firebase'` المجرَّد — ليس ميتاً).
- **أُصلح حجب خلفية الرياض في الحراج**: الترويسة الداخلية في `RoyalHarajPage.jsx` (سطر ~1215)
  كانت `linear-gradient(180deg, C.darkBg, var(--rz-ivory))` و`C.darkBg = var(--rz-ivory)` —
  أي **عاجي معتم 100%** بارتفاع ~289px يمحو المدينة. صارت حجاباً شبه شفاف
  `rgba(var(--rz-ivory-rgb), 0.88 → 0.62)`. القياس بعد الإصلاح: انحراف معياري للبكسل 56
  (كان مسطحاً) → المدينة ظاهرة، والنص الداكن ما زال مقروءاً.
- **أُصلح تباين زر «روابط سريعة»** في فوتر الرئيسية: `var(--rz-gold)` كان 4.44:1 (أقل من 4.5)
  → صار `var(--rz-champagne)` (#E3C878). فحص التباين: **0 مخالفة** (كان FAIL على `/`).
- **أُزيل `aliyaConfig` من `getStoreConfig()`**: كود ميت غير مستورد إطلاقاً وكان المصدر الوحيد
  لبقايا `VITE_ALIAA_*` (7 متغيّرات). الآن عدد مراجع `VITE_ALIAA` في المستودع = **0**.
- **شريط العروض**: أُضيف `HomeOffersSlider.test.jsx` (7 اختبارات حقيقية، تُبدّل `useAuth` فقط):
  6 شرائح + 6 نقاط، اسم بديل في المواضع الفارغة، زر الإدارة **محجوب عن الزائر/العضو** وظاهر
  **للمالك** فقط مع نافذة 6 مواضع (إضافة/استبدال/حذف). الحركة مُثبَتة بالقياس: دخول من اليمين
  (+881→0) ← ثبات ~5 ثوان ← خروج لليسار (0→−1094) ← التالي، حلقة لا نهائية.
- **لا تكرار روابط**: تقاطع روابط الترويسة والفوتر = ∅.
- **البوابات**: BUILD OK · LINT exit 0 · VITEST **15 ملفاً/113 اختباراً** · CONTRAST PASS ·
  FULL AUDIT **69 فحصاً OVERALL PASS**.
- **المانع الوحيد المتبقّي**: الدفع إلى `fahad-chic/rooz-nova` (ثم نشر Cloudflare) —
  لا توجد بيانات اعتماد كتابة في هذه البيئة (`git push --dry-run` يفشل بطلب اسم المستخدم).
  **الموقع الحي `rooz-store.pages.dev` لا يزال بلا شريط العروض ولا خلفية الحراج المُصلَحة**
  لأن العمل غير مدفوع. يلزم: موافقة المالك + رمز دفع، أو تنفيذ `git commit && git push` من جهته.

## جولة إصلاح تقرير الفحص (fix/audit-report-repairs) — 2026-10-22
**سياق**: تقرير فحص ثابت (قراءة 177 ملفاً) ادّعى أخطاء. تحقّق حيّ + قراءة كود أظهر أن
**عدة بنود غير دقيقة**، وبعضها صحيح فعلاً. لم يُحذف أي ملف (قاعدة المالك سارية).

### أُصلح فعلاً (7 بنود)
- **كاش الشعارات (`public/_headers`)**: كانت كل `/assets/*` بـ `max-age=31536000, immutable`
  — لكن ملفات العلامة **بلا بصمة اسم** (`logo-almusaymir.png`, `logo-almusaymir-wide.png`,
  `emblem.png`, `og-image.jpg`, `bg-riyadh-night.jpg`). أي تحديث للشعار كان يبقى سنة في كاش
  المتصفح. أُضيف لكل ملف قاعدة `! Cache-Control` + `max-age=0, must-revalidate`
  (صيغة إلغاء الترويسة الموثّقة في Cloudflare). الأصول المُبصَّمة (`dist/assets/*-[hash].js`)
  تبقى `immutable` كما هي.
- **`og:image`/Twitter مفقودة**: `index.html` لم يكن فيه أي وسم Open Graph، و`og-image.jpg`
  (37KB) مُخدَّم بلا مرجع → صورة مشاركة فارغة في واتساب/تويتر. أُضيفت 11 وسمًا (og:* + twitter:*)
  مع `og:image:width/height` و`og:locale=ar_SA`.
- **`favicon.ico` غير مربوط**: الملف موجود (96KB، مُبقى بقرار المالك) و`/favicon.ico` يعمل،
  لكن لا `<link>` يشير إليه — أُضيف.
- **`App.jsx` لا يسقط على `VITE_ADMIN_EMAILS`**: بقية الملفات (`useStore`, `firebase/index.js`,
  `AuthContext`) تقرأ `VITE_OWNER_EMAILS || VITE_ADMIN_EMAILS`؛ `App.jsx` كان يقرأ الأول فقط.
  أُضيف السقوط — يمنع طرد المالك لو ضُبط `VITE_ADMIN_EMAILS` وحده.
- **تعارض إصدار Node**: `.nvmrc`=22 · `package.json engines` >=20 · CI `node-version: '20'` ·
  README=22. وُحّد الكل على **22** (4 وظائف في CI + engines).
- **كود ميت حقيقي أُزيل** (بلا مكسب بايت — tree-shaken، لكنه تنظيف مصدر):
  `initAuthListener` (useStore.js — لا مستدعي)، وتبعها `apiCall` (صار بلا مستدعي؛ `API_BASE`
  **بقي** لأن OTP يستخدمه)، و`LOGO_SRC`+استيراد `BRAND` في `RoyalHarajPage.jsx` (غير مستخدمين)،
  ونموذج اشتراك بريد وهمي في `NovHomePage.jsx` (`email`/`emailStatus`/`handleSubscribe` —
  **لم يكن مُصيَّراً في JSX إطلاقاً**، فلا `<form>` ولا `<input>`؛ أُزيل بدل ربطه بـ Firestore).
- **`robots.txt`**: كان يحجب مسارات وهمية (`/owner-panel` كانت `Disallow` وهي المسار الصحيح
  للمالك، و`/owner` مذكور بلا مسار فعلي). أُعيد كتابته: منع `/owner-panel`, `/owner-room`,
  `/owner-private-room`, `/settings`, `/api/` + سماح صريح لروبوتات الذكاء + Sitemap.
- **`sitemap.xml`**: كان 12 رابطاً فيهم أقسام قديمة. أُعيد بناؤه بـ **20 رابطاً** كلها مسارات
  فعلية في `App.jsx` (13 قسم كتالوج + haraj + branches + advertisements + about/faq/contact/
  terms + wanted-dress) — XML صالح مُتحقَّق بـ ElementTree.
- **`.env.example`**: كان ناقصاً 8 متغيرات مستخدمة فعلاً (`VITE_SHIPPING_FEE`,
  `VITE_FREE_SHIPPING_MIN`, `VITE_AI_NAME`, `VITE_RETURN_POLICY_DAYS`, `VITE_SNAPCHAT_URL/USERNAME`,
  `VITE_PHONE_*_DISPLAY`, `VITE_STORE_NAME/DESCRIPTION`, `VITE_OWNER_SOUND_URL`,
  `VITE_SOUND_DURATION_SECONDS`) + أسرار الخادم (`GROQ_API_KEY`, `RESEND_API_KEY`,
  `OTP_FROM_EMAIL`, `FIREBASE_WEB_API_KEY`) + شرح ربط D1. أُضيف تحذير أن `VITE_OWNER_SECRET_CODE`
  **يظهر في حزمة المتصفح** (ليس سراً حقيقياً؛ الحماية من `/api/owner-pin`).

### بنود التقرير التي ثبت أنها **غير صحيحة** (لم تُعدَّل)
- **`public/_redirects` مفقود ≠ عطل**: كل الروابط العميقة تعمل حيًّا HTTP 200 مع بنية SPA
  (`/haraj`, `/about`, `/faq`, `/terms`, `/catalog/*`, `/owner-room`, `/owner-panel`, وحتى
  `/foo/bar/baz`). Cloudflare Pages يقدّم SPA fallback تلقائياً لمشروع Vite. إضافة `/* /index.html 200`
  قد **تعترض** `/api/*` (الدوال تُخدَم من `functions/`) وتكسر OTP/المساعد. أُنشئ الملف ثم **حُذف**
  لأنه بلا قاعدة = بلا أثر؛ القرار: لا `_redirects`.
- **الحراج لا يُقرأ للزائر**: كاذب. فحص حيّ بجلسة زائر: **كل** طلبات Firestore = 200، وشبكة
  `.ads-grid` موجودة. الحراج يعمل.
- **أصول يتيمة** (`logo.png`, `icon-128/144/152/384`): **غير موجودة أصلاً** في الشجرة
  (أُزيلت سابقاً + نُظّف `manifest.json`). لا شيء ليُحذف.
- **أيقونات PWA 404**: الموجود 4 أيقونات فقط (72/96/192/512) وكلها مُشار إليها في `manifest.json`.
- **مكوّنات غير مربوطة / مسارات ميتة**: 118/120 ملف مصدر مستخدم (رسم استيراد دقيق، لا `grep` ساذج).

### قرارات المالك — لا تحذف
`src/permissions/requirePerm.js` · `src/utils/wcag.js` (+ اختباره) · `public/assets/og-image.jpg`
· `public/favicon.ico` · `public/sw.js`. (og-image.jpg الآن **مستخدم فعلاً** في وسوم OG.)

### البوابات بعد الجولة
BUILD ✓ · LINT exit 0 ✓ · VITEST **15 ملفاً/113 اختباراً** ✓ · CONTRAST OVERALL PASS ✓ ·
FULL AUDIT **66/66 (0 أخطاء، 0 تحذيرات)** ✓ · XML sitemap صالح ✓ · كل مسارات preview = 200 ✓.
### النتيجة النهائية (منفَّذ ومنشور)
- **الالتزام `3c91959`** مدموج في `main` ومدفوع → Cloudflare Pages نشر تلقائياً.
- **CI على `main`: 4/4 خضراء** (build · lint · test · contrast). الفرع `fix/audit-report-repairs` **حُذف** بعد الدمج.
- **تحقق حيّ من الموقع المنشور**: HTTP 200 · OG tags منشورة (5) · `robots.txt` محدّث ·
  `sitemap.xml` (11 قسم كتالوج) · كاش الشعارات `max-age=0` · الأصول المُبصَّمة `immutable` ·
  `/api/*` = 405 على GET (سليمة) · كل المسارات الحرجة 200 · **FULL AUDIT حيّ: OVERALL PASS**.
- **`og-image.jpg` قياس فعلي = 1200×630** → مطابق للأبعاد المعلنة في `og:image:width/height`.
- **لا ملف حُذف** (`--diff-filter=D` = 0 ملف).
- **تحذير 400 حيّ** على `/catalog/*`: من `identitytoolkit.googleapis.com/accounts:signUp`
  (Firebase anonymous auth) — **قائم مسبقاً**، لا علاقة له بهذه الجولة.
- **مرشّحو حذف ينتظرون موافقة المالك** (لم تُمسّ): تصديرات `sectionsData.js` الأربعة
  (`HARAJ_BANNERS`/`ROYAL_KINGS`/`PREDEFINED_COMMENTS`/`CATALOG_ITEMS` — مثبتة tree-shaken،
  0 في `src` و0 في `dist`) · `src/permissions/requirePerm.js` (4K) · `src/utils/wcag.js` (4K،
  اختبار وحدة فقط) · `public/favicon.ico` (96K، مُبقى بقرار المالك — `favicon.png` 7.4K يكفي
  للمتصفحات الحديثة).

## جولة الافتتاح (بنود ب1–ب10 + ج) — 2026-10-24
**سياق**: بعد دمج PR #19 (`f66578a`)، نُفِّذت بنود القسم (ب) و(ج) من طلب المالك مباشرة على
`main` في الالتزام **`1e1bca4`** (مدفوع → Cloudflare نشر تلقائياً).

### ما نُفِّذ فعلاً (مُتحقَّق منه حيًّا)
- **ب1 `OwnerTextEdit.jsx`**: صار يقرأ `useAuth()` ويظهر الزر فقط إذا
  `isAuthenticated === true && userRole === 'owner'` — لم يعد يعتمد على `can('INLINE_TEXT_EDIT')`.
  لا يراه الزائر ولا المشرف. + ملف اختبار جديد `src/components/OwnerTextEdit.test.jsx` (5 اختبارات).
- **ب2 `CatalogPage.jsx`**: `isOwner = userRole === 'owner'` — كل أزرار الإضافة/التعديل/الحذف
  والإعدادات محجوبة على `isOwner` فقط (لا `isAdmin`).
- **ب3 `NovHomePage.jsx`**: `OwnerTextEdit` لنص الهيرو (`home.hero_sub`) ووسم التذييل
  (`home.footer_tag`)؛ القيم الافتراضية عربية سليمة من `BRAND`؛ شريط العروض `HomeOffersSlider`
  وزر إدارته للمالك **لم يُكسَرا** (كما كانا).
- **ب4 `FAQ.jsx`**: العنوان من `texts['faq.page_title']` + `OwnerTextEdit`.
- **ب5 `ContactPage.jsx`**: جملة التواصل من `contact.hero_subtitle` + البنوك من `BANK_ACCOUNTS`
  في `src/utils/constants.js` (لا قيم ثابتة في JSX).
- **ب6 `TermsPage.jsx`**: `OwnerTextEdit` لـ `terms.page_title` بلا مساس بفقرات الشروط.
- **ب7 `AdDetailsPage.jsx`** (أهم تغيير):
  - أي **عضو موثّق (uid)** يراسل المعلن مباشرة — أُزيل إجبار «سجّل في منصة الحراج».
    زر الحجب الآن يوجّه لـ `/login` بدل `/haraj`.
  - هوية المحادثة بالـ **uid**: `buyerKey = memberUid`، `buyerUid`،
    `participantUids = arrayUnion(memberUid)`، و`senderUid` في كل رسالة.
  - `isSeller` يتحقق أولاً بمطابقة `ad.userId === uid` ثم بالهاتف.
  - زر **«حذف إعلاني»** للمعلن فقط (`isSeller && !isOwner`)؛ زر المشرف لأصحاب
    `HARAJ_POST_DELETE` أو المالك فقط.
- **ب8 `AdFormPage.jsx`**: تأكيد أن `publisherName`/`publisherPhone` إلزاميان، التحقق 9–15 رقمًا،
  و`userPhone` من النموذج فقط (لا سقوط على أرقام المالك). رسائل الخطأ كلها معروضة أسفل الحقول.
- **ب9 `ProductCard.jsx`**: تأكيد رسالة الشراء الحقيقية (`store_purchase_inquiry` في `messages`
  إلى owner باسم المنتج والسعر) + البنوك من `BANK_ACCOUNTS` (لا `IBAN: —`).
- **ب10 `LoginNova.css`**: شعار بطاقة المالك في الدخول 42px (أكبر من بطاقة المشرفين 36px).
- **ج**:
  - لا أثر ظاهر لـ«أناقة ROOZ» أو «علياء» (المراجع المتبقية أسماء ملفات/`localStorage`/مفاتيح
    داخلية فقط، و`VITE_ALIAA_*` في `wrangler.toml` **غير مستخدمة في الكود** = 0 مرجع في `src`).
  - اسم المساعد من `import.meta.env.VITE_AI_NAME || BRAND.ASSISTANT` («فهد») ونص الترحيب من
    `BRAND.FULL` في `AIChatWidget.jsx`.
  - مراسلة صاحب الموقع متاحة لكل عضو غير المالك (`RoyalHeader` + `ContactOwnerModal`).
  - الحراج يُنشر `status: 'active'` فوراً.
  - لا `signInAnonymously` (مذكور في تعليق توثيقي فقط).

### البوابات (كلها خضراء)
LINT exit 0 · BUILD OK · VITEST **16 ملفًا/120 اختبارًا** · CONTRAST **OVERALL PASS**
(933 عنصرًا، 0 مخالفة) · FULL AUDIT محليًا **65 فحصًا، 0 أخطاء، OVERALL PASS** ·
FULL AUDIT على الموقع الحي **OVERALL PASS**.
**CI على `main` للالتزام `1e1bca4`: 4/4 خضراء** (lint · test · build · contrast).

### تحقق حيّ من النشر
- الموقع الحي يحمل البناء الجديد: `index-Bhfy93jy.js` **لم يتغيّر اسمه** (المدخل ثابت)، لكن
  المقاطع الكسولة تغيّرت فعلاً وتحمل التعديلات: `AdDetailsPage-DxT4-ibk.js` (يحتوي «حذف إعلاني»
  و`participantUids` و**لا** يحتوي «سجّل في منصة الحراج»)، و`NovHomePage-DhQNZWim.js` (يحتوي
  `home.hero_sub`/`home.footer_tag`)، و`ContactPage-C1exEph8.js` (`contact.hero_subtitle`)،
  و`TermsPage-D4F8Eqrp.js` (`terms.page_title`)، و`CatalogPage-UGZErIBx.js` (`store_purchase_inquiry`).
- **درس مهم**: `index-*.js` قد لا تتغيّر بصمته بين بناءين (الأسماء ثابتة للمقاطع المشتركة)؛
  تحقّق من محتوى **المقاطع الكسولة** (`AdDetailsPage-*.js` …) لا من اسم المدخل وحده.

### ما لم يُنفَّذ (يحتاج بيانات اعتماد)
- **`firebase deploy --only firestore:rules`**: لا يوجد Firebase CLI مثبّت ولا
  `FIREBASE_TOKEN`/حساب خدمة في هذه البيئة. المالك ينفّذه من جهازه:
  `npx firebase-tools deploy --only firestore:rules`

## RBAC المرحلة الأولى (Phase 1) — فرض حقيقي مُتحقَّق منه 2026-10-31
**سياق**: طلب المالك إنشاء نظام RBAC حقيقي على `rbac/{uid}` لـ24 صلاحية، بفرض فعلي
+ قواعد Firebase + تسجيل كل إجراء (actor/timestamp/target/result) + منع تصعيد الصلاحيات.
المرحلة الأولى فقط — لا تُنفَّذ صلاحيات مراحل لاحقة بلا طلب صريح.

### ما كان موجوداً (لم يُعَد إنشاؤه — تجنّب التكرار)
- كتالوج 47 صلاحية في `src/permissions/catalog.js` يشمل كل مفاتيح المرحلة الأولى.
- منطق الحساب في `src/permissions/logic.js` + خطاف `usePermissions.js`.
- **فرض خادمي قائم فعلاً** في `firestore.rules` عبر `hasPerm(key)` على مجموعات حقيقية
  (haraj_ads, users, employees, settings, logs, deleted_archive…) — أي أنه لم يكن
  «واجهة فقط» لمعظم الصلاحيات.

### الثغرات الحقيقية التي أُصلحت (مُتحقَّق منها على محاكي Firestore)
1. **الحظر كان وهمياً**: `banned:true` يُكتب في users لكن لا قاعدة تقرأه → المحظور يبقى
   قادراً على القراءة/الكتابة. الآن `isSignedIn()` = موثّق + غير محظور، مع `isBannedUid`.
2. **حظر مؤقت ≠ دائم**: أُضيف `banExpiresAt`، والحظر المؤقت المنتهي يُرفع تلقائياً في القواعد.
3. **أقل صلاحية في haraj_ads**: كانت `hasPerm(...)` تفتح تعديل أي حقل. الآن كل صلاحية
   مقيّدة بحقولها فقط (اعتماد=status، استعادة=status، نقل ملكية=userId، تعديل=محتوى، تمييز=featured).
4. **users update**: كان `hasUserAdminPerm()` يفتح كل الحقول. الآن صلاحية الحظر ≠ صلاحية التوثيق،
   وكلاهما لا يمسّ `role` (منع تصعيد).
5. **دفاع في العمق**: `hasPerm` يرفض مفاتيح OWNER_ONLY حتى لو كُتبت في الوثيقة.
6. **سجل تدقيق موحّد**: مجموعة `audit_logs` + `src/permissions/audit.js`
   (`writeAuditLog`/`buildAuditEvent`) تسجّل actor/timestamp/target/result لكل إجراء
   (نجاح/رفض/خطأ) من `rbacService` و`OwnerPrivateRoom` و`AdDetailsPage` و`EmployeesPage`.

### الاختبار (فرض حقيقي، لا محاكاة وهمية)
- `npm run test:rules` → `e2e/rules-audit.mjs` على محاكي Firestore الحقيقي:
  **104/104 PASS، OVERALL: PASS** — يغطي المصفوفة الرباعية (مالك/مصرّح/غير مصرّح/زائر/محظور)
  + إنهاء الجلسة + الجلسات + الأرشيف + الصيانة + منع التلاعب بالسجل.
- يتطلب Java (openjdk-21 مثبّت في هذه البيئة) و`firebase-tools` (يُجلب بـnpx).
- ملفات الاختبار: `firebase.rules-test.json` (إعداد المحاكي فقط، لا يمسّ `firebase.json`).
- `npm test` = 21 ملفاً/142 اختباراً · `npm run lint` exit 0 · `npm run build` ✓.

### إضافات هذه الجولة (فرض حقيقي مُتحقَّق منه)
- **`FORCE_LOGOUT_SESSION`** (فرض فعلي): كتابة `forceLogoutAt` في users/{uid}، وقاعدة
  `isBlockedUid` تُبطل كل رمز هوية صدر قبل اللحظة عبر `auth_time` — إعادة الدخول تُصدر
  رمزاً أحدث فيعود العمل. زر «إنهاء الجلسة» في تبويب المستخدمين.
- **`RECOVER_DELETED_ITEMS_ARCHIVE` + `HARAJ_POST_RESTORE`**: `src/utils/archive.js`
  (`archiveAndDelete`/`restoreArchived`) يكتب في `deleted_archive` عند الحذف الفعلي
  (OwnerPrivateRoom + AdDetailsPage)، ولوحة «المراقبة والتدقيق» تستعرض وتستعيد.
- **`TRACK_EMPLOYEE_LIVE_SESSIONS`**: `src/store/useSessionTracking.js` نبضة كل دقيقة إلى
  `sessions/{uid}` (مربوطة في App.jsx)، وقراءتها في لوحة المراقبة.
- **`TRACK_FAILED_LOGINS` + `VIEW_USER_IP_HISTORY`**: `functions/api/auth-events.js` (D1)
  + `src/utils/authEvents.js`؛ محاولات الدخول الفاشلة تُسجَّل خادمياً مع IP الحقيقي
  (cf-connecting-ip)، وسجل IP يُسجَّل عند نجاح الدخول (بريد مُشتق من الرمز لا من العميل).
  القراءة: المالك أو من يملك `VIEW_USER_IP_HISTORY` (يُتحقق منها بقراءة rbac خادمياً).
- **`VIEW_SYSTEM_AUDIT_LOGS` + `FIREBASE_MUTATION_LOGS`**: `audit_logs` للإلحاق فقط
  (create-only؛ لا تعديل من غير المالك)، وكل الإجراءات تُسجَّل actor/timestamp/target/result.
- **`TOGGLE_MAINTENANCE_MODE`**: تبويب «وضع الصيانة» يكتب `settings/maintenance{enabled}`،
  و`canWriteDuringMaintenance()` تُجمّد إنشاء المحتوى لغير المالك (القراءة تبقى متاحة).
- **`UPDATE_GLOBAL_SETTINGS`**: مفروض بقواعد `settings`/`branches` (لوحة الإعدادات القديمة).

### صلاحيات المرحلة الأولى — حالة الفرض
- `BLOCK_USER_REGISTRATION`: **مفروض فعلاً (عضوية الموقع، لا حساب Firebase Auth)**.
  بوابته `settings/registrationGate {blocked, reason}` — **الافتراضي مفتوح** (الغياب أو
  `blocked=false` = التسجيل يعمل)، والمالك لا يُقفل نفسه. عند `blocked=true` ترفض قواعد
  Firestore كتابة وثيقة العضوية `users/{uid}`، و`isSignedIn()` تشترط وجودها — فالحساب
  الجديد لا يقرأ/يكتب أي شيء. زر الطوارئ في غرفة المالك (تبويب «بوابة التسجيل») مع سبب
  إلزامي + سجل أمني + تنبيه. **القيد المتبقّي**: لا يمكن منع إنشاء كائن حساب Firebase Auth
  نفسه (REST عام) — يُمنع **العضوية والوصول للبيانات** فقط، وهذا أقصى فرض ممكن دون خادم
  خدمة/Identity Blocking Functions.
- `VIEW_EMPLOYEE_SALARIES`: لا حقل/واجهة رواتب في المشروع أصلاً. القاعدة تسمح بالقراءة
  لصاحب الصلاحية، لكن لا شاشة تعرض الرواتب (لا بيانات). **غير منفَّذ وظيفياً**.
- `GRANT_SUB_ADMIN_PERMISSIONS`: إجراء الواجهة (تغيير `role`) مرفوض بقاعدة users لأي غير
  مالك — فيبقى فعّالاً للمالك فقط (وهذا هو المقصود الأمني). تغيير مصفوفة rbac نفسه للمالك
  فقط في القواعد، فلا يستطيع مشرف منح صلاحيات. **لا تصعيد ممكن**.
- **لم تُضَف أي قاعدة تصف «من يملك الحق» فقط لتبدو مكتملة** — القاعدة غير القابلة للفرض لم تُكتب.

## RBAC المرحلة الثانية (Phase 2) — صلاحيات المحتوى والتواصل والتقارير
**النطاق**: إضافة 14 مفتاحاً جديداً (61 إجمالاً، 9 أقسام). لا صلاحية بلا عملية حقيقية +
قاعدة خادم + سجل تدقيق + اختبار allow/deny (في `e2e/rules-audit.mjs` قسمان 20 و21).

### مُنفَّذ فعلاً (عملية + قاعدة + تدقيق)
- **`MANAGE_CATEGORIES`**: `categories` write. واجهة حقيقية (`CategoriesManager`) عبر
  `requirePerm` + `writeAuditLog` في غرفة المالك وغرفة المشرف.
- **`MANAGE_SITE_BANNERS`**: `banners` write (كان مربوطاً خطأً بـ`MANAGE_NAVIGATION_MENU`).
  واجهة حقيقية `BannersManager` + `BannerForm` عبر `requirePerm` + تدقيق.
- **`MANAGE_REPORTS`**: `reports` read/update(حقول المعالجة فقط)/delete. `ReportsPanel`
  في غرفة المالك وغرفة المشرف (تغيير حالة + ملاحظة معالجة + تدقيق).
- **`MANAGE_NOTIFICATIONS`**: `notifications` read/update/delete (الإنشاء العام مقيّد بحقول
  غير إدارية: يجب `title`، وممنوع `audience/publishAt/expiresAt`). `NotificationsManager`.
- **`MANAGE_REVIEWS`**: `reviews` update(حقول الإشراف فقط)/delete. `ReviewsPanel` في غرفة
  المالك وغرفة المشرف (إخفاء/إعادة إظهار + سبب + تدقيق).
- **`EDIT_EMPLOYEE_PROFILE`**: `employees` update. شاشة تعديل ملف موظف فعلية في
  `EmployeesPage.jsx` (نموذج تعديل الاسم/الوظيفة/الفرع) عبر `requirePerm` + `writeAuditLog`.
- **`EXPORT_AUDIT_REPORTS`**: **مؤجّل** — لا عملية تصدير فعلية (لا CSV/تنزيل)؛ قراءة
  `audit_logs` مالك-فقط في القواعد، فلا قدرة مستقلة.

### إصلاح تصعيد صلاحيات حقيقي (مُثبَت بقاعدة)
- `UPDATE_GLOBAL_SETTINGS` كان catch-all يسمح بكتابة `settings/snippets` فيتجاوز
  `CODE_SNIPPET_INJECTION`. الآن `isReservedSettingsDoc(docId)` يستثني الوثائق المخصّصة
  (`siteTexts/inlineStyles/maintenance/registrationGate/cacheBuster/navigation/snippets`)،
  فلا يمنح UPDATE_GLOBAL_SETTINGS أي قدرة على وثيقة يملكها مفتاح آخر.
- **`inlineStyleAllowed()`**: وثيقة `settings/inlineStyles` تُعلن المفتاح في حقل `perm`
  والقاعدة تتحقق من امتلاك ذلك المفتاح بالذات — لا يفتح مفتاح INLINE واحد بقية المفاتيح.
- **فصل الكتالوج**: `products` صار `create`=`CREATE_NEW_CATALOG`، `delete`=`DELETE_MAIN_CATALOG`،
  و`update` مقيّد بحقول السعر/الوسوم فقط (لا صلاحية تمنح الأخرى).
- **`isDisabledPerm()`**: `BYPASS_FIREBASE_RULES` و`CODE_SNIPPET_INJECTION` معطّلتان نهائياً —
  لا تُمنح حتى لو كُتبتا في وثيقة rbac (دفاع في العمق).
- `rbac/{uid}` write = `isOwner()` فقط => **لا صلاحية تمنح نفسها** ولا تصعيد ممكن.

### مؤجّل (لا عملية حقيقية — لا يُمنح ولا يُنفَّذ)
`MANAGE_FEATURED_CONTENT`, `MANAGE_MEDIA_LIBRARY`, `MANAGE_FAQ_CONTENT`,
`MANAGE_SUPPORT_TICKETS`, `MANAGE_CONTACT_MESSAGES`, `MANAGE_HOMEPAGE_SECTIONS`,
`MANAGE_REDIRECTS`, `VIEW_SYSTEM_HEALTH`, `MONITOR_USER_TRAFFIC_LIVE`,
`CUSTOMIZE_CATALOG_LAYOUT`, `VIEW_EMPLOYEE_SALARIES`.
معطّلة نهائياً: `BYPASS_FIREBASE_RULES`, `CODE_SNIPPET_INJECTION`.
كلها في `DEFERRED_PERMISSION_KEYS`/`DISABLED_PERMISSION_KEYS` — تُسقَط في
`sanitizeGrants` ولا تُمنح من الواجهة.

### البوابات
LINT exit 0 · BUILD OK · VITEST 22 ملفاً/155 اختباراً · RULES AUDIT **279/279 OVERALL PASS**.

### جولة المتابعة (Follow-up) — إكمال ما كان ناقصاً + غرفة المشرف + تنظيم الأقسام
**1) تصحيح صادق**: `EXPORT_AUDIT_REPORTS` كان مُعلناً «مالك-فقط» لكن **بلا عملية تصدير
فعلية** (لا CSV ولا تنزيل) — نُقل إلى `DEFERRED_PERMISSION_KEYS`. قراءة `audit_logs`
تبقى مالك-فقط في القواعد، فلا قدرة مستقلة له.
**2) واجهات حقيقية جديدة** (كانت القواعد موجودة بلا شاشة):
- `src/components/owner/ModerationPanels.jsx` — `ReportsPanel` + `ReviewsPanel` (مشتركة،
  كانتا مُعرَّفتين داخل `OwnerPrivateRoom.jsx` — نُقلتا بلا تكرار).
- `src/components/admin/ContentPanels.jsx` — `CategoriesManager` + `BannersManager` +
  `NotificationsManager` (مشتركة، نُقلت من `AdminDashboard.jsx`) مع `requirePerm` + تدقيق
  لكل عملية. الآن `MANAGE_CATEGORIES`/`MANAGE_SITE_BANNERS`/`MANAGE_NOTIFICATIONS` لها
  واجهة حقيقية في غرفة المالك (`content`/`comms`) وفي غرفة المشرف.
- `src/pages/AdminRoom.jsx` — **غرفة مشرف مستقلة** على مسار `/admin-room` (لا تفتح غرفة
  المالك): تعرض فقط الأقسام التي يملك المشرف صلاحيتها (بلاغات/تقييمات/تنبيهات/تصنيفات/
  بنرات)، ومن لا يملك أي صلاحية يُحوَّل لـ`/unauthorized`. الفرض خادمي بالكامل.
- `src/styles/console-shell.css` — أصناف `royal-*` اللازمة للوحات المشتركة داخل حاوية
  `.console-room` (بلا تكرار هوية غرفة المالك ولا تعديل عليها). مُستورد في `main.jsx`.
**3) تنظيم الأقسام**: غرفة المالك صارت **8 أقسام** واضحة (`tabGroups`):
المركز الرئيسي · المستخدمون والأمان · الحراج · الكتالوج والمحتوى · البلاغات والتقييمات ·
التنبيهات والتواصل · المراقبة والسجلات · الموظفون والصلاحيات. أُضيف تبويبان حقيقيان
(`categories`, `banners`) إلى غرفة المالك.

### ما لم يُنفَّذ ولماذا (يحتاج قرار المالك — لا تنفيذ بلا backend حقيقي)
- `MANAGE_FAQ_CONTENT`: الأسئلة مثبّتة في `src/pages/FAQ.jsx` (لا مجموعة بيانات).
- `MANAGE_CONTACT_MESSAGES`: «تواصل معنا» يفتح واتساب — لا نموذج يكتب رسائل.
- `MANAGE_SUPPORT_TICKETS` / `VIEW_SYSTEM_HEALTH` / `MANAGE_HOMEPAGE_SECTIONS` /
  `MANAGE_REDIRECTS` / `MANAGE_MEDIA_LIBRARY` / `MANAGE_FEATURED_CONTENT`: لا بيانات
  ولا واجهة فعلية في المشروع.
- `VIEW_EMPLOYEE_SALARIES`: لا نظام رواتب (لا حقول راتب ولا شاشة).
- `MONITOR_USER_TRAFFIC_LIVE` / `CUSTOMIZE_CATALOG_LAYOUT`: يحتاجان متتبّع زوار/تفضيل عرض
  لم يُبنَ بعد.
كل هذه في `DEFERRED_PERMISSION_KEYS` (12 مفتاحاً) — لا تُمنح من الواجهة ولا تُنفَّذ.

### البوابات بعد جولة المتابعة
LINT exit 0 · BUILD OK · VITEST 22 ملفاً/155 اختباراً · RULES AUDIT **279/279 OVERALL PASS**.

## تدقيق الموقع الكامل (Full-site audit) — 2026-11-06 (فرع `fix/asset-metadata-audit`)
**سياق**: تدقيق ملف-بملف للمستودع على `main` @ `7be2537` (لا تغيير إنتاجي في التدقيق).
PR #25 (`fix/login-page-design`) **مدموج فعلاً** (`8248f4e`) — مواصفات صفحة الدخول مُنفَّذة.
PR #24 (`fix/reviews-privacy`) **مفتوح وغير مدموج** — معمارية `publicSafe` **متضاربة** مع
`main` (`hidden`-based) ولا يجوز دمجه بلا قرار المالك.

### عيوب مؤكدة أُصلحت (فرع `fix/asset-metadata-audit` → PR #34)
1. **`index.html` يربط `/favicon.png` غير موجود** (حُذف في `30ea242`). Cloudflare SPA fallback
   يخدم `index.html` بنوع `text/html` → أيقونة مكسورة. الإصلاح: `/favicon-96x96.png`
   (موجود، 96×96، نفس شعار `emblem.png` — تحقق تشابه 8×8).
2. **`og:image:width/height` = `1179×340`** بينما `logo-almusaymir-wide.png` = **`2160×1080`**
   → بطاقة مشاركة مقصوصة. الإصلاح: الأبعاد الصحيحة.
3. **`public/assets/og-image.jpg` يحوي بايتات PNG** (`89504e47`) بامتداد `.jpg` → يُخدَم
   `image/jpeg` وهو PNG. الإصلاح: إعادة ترميز JPEG حقيقي (775KB→63KB، 1168×784 كما هو).
- اختبار `src/assetMetadata.test.js` (3) يعيد إنتاج الثلاثة: **تفشل قبل، تنجح بعد**.
- البوابات: LINT 0 · BUILD ✓ · VITEST **24 ملفاً/163 اختباراً** ✓ · CI **8/8 أخضر**.

### ثغرة كامنة حقيقية (لم تُصلح — تحتاج موافقة المالك + نشر قواعد)
**عدم تماثل `list` مقابل `get`** في `reviews` و`comments`: قاعدة `get` تحجب الوثيقة التي
تحمل PII (`hasNoPublicPII` / `email == ''`)، لكن قاعدة `list` تكتفي بالحالة
(`hidden == false` / `status == 'approved'`). التطبيق يستخدم **`list`** (`getReviews`,
`CommentsSection`) → سجل قديم `hidden:false` مع `userEmail` **يُقرأ علناً عبر list**.
- **مُثبَت على المحاكي**: `reviews get legacy-pii → DENIED` بينما
  `reviews list hidden==false → ALLOWED` وأعاد `userEmail`. نفس الأمر للتعليقات.
- **حالة الإنتاج الحالية (قراءة عامة، 2026-11-06)**: `reviews` = **0 وثيقة**،
  `comments` = **52 معتمد، كلها `email == ''`** → **لا تسريب فعلي الآن**، لكن أي سجل قديم
  يُضاف/يُستعاد بهذا الشكل سيُسرّب. الإصلاح المقترح: أضف شرط PII لقاعدة `list` أيضاً —
  لكن اختبار المحاكي أثبت أن **`resource.data.get('email','') == ''` في قاعدة list يرفض
  الاستعلام بالكامل** لأن Firestore يشترط أن يعكس الاستعلام شرط القاعدة. الحل الوحيد
  الآمن: **ترحيل البيانات القديمة** (تعيين `email: ''`/`hidden`) بدل تشديد القاعدة،
  أو تغيير استعلام التطبيق. يحتاج قرار المالك.
- سكربت `scripts/backfill-public-safe.mjs` **موجود فقط على فرع PR #24** وغير موجود على
  `main` — لا معنى لتشغيله على `main`.

### عيوب غير حقيقية (تحقق سلبي)
- `e2e/full-audit.mjs` يفشل محلياً بـ4 بنود **لكنها توقعات قديمة في السكربت**، ليست عيوب
  موقع: يتوقع 3 أزرار في `.rl-actions` بينما التصميم الحالي فيه **4** (بإضافة زر الزائر
  الذي طلبه المالك)، ويتوقع لون تركيز `rgb(201,162,39)` بينما الهوية الحالية `#c9a45c`
  (`rgb(201,164,92)`). السكربت ليس في CI.
- لا `console.log` ولا `catch` فارغ ولا `dangerouslySetInnerHTML` ولا `eval` في `src/`.
- كل `target="_blank"` مصحوب بـ`rel="noopener noreferrer"`.
- `Firestore/Write/channel :: ERR_ABORTED` عند التنقل = سلوك طبيعي لقناة SDK، ليس خطأ.

## جولة التدقيق الشامل + الإصلاح (fix/asset-metadata-audit → PR #34) — 2026-11-10
**سياق**: متابعة بعد ملاحظة أن `main` صار نظيفاً (CI أخضر) وأن PR #24 (publicSafe) تجاوزه
الواقع. هذه الجولة أصلحت عيوباً موثّقة بدليل حيّ، وحدّثت PR #34.

### حقائق مصحّحة (تصحيح تقرير سابق)
- **PR #24 (publicSafe + backfill) متجاوَز**: `main` صار يقيّد القراءة العامة لـ`reviews`
  بـ`hidden == false` ولـ`comments` بـ`status == 'approved'` — كلاهما **قابل للفرض في
  الاستعلام**، فتشمل القاعدة السجلات القديمة فوراً بلا أي ترحيل. عدد `publicSafe` في قواعد
  `main` = **0**، وفي `src` = **0**. `scripts/backfill-public-safe.mjs` **غير موجود على
  `main`** (على فرع PR #24 فقط) → **لا حاجة لـ`--apply` إطلاقاً**.
- **بيانات الإنتاج (قراءة حية بلا مصادقة، مشروع `anaqa-chic-4e437`)**:
  `comments status=approved` = **52**؛ `status=pending/rejected` = **مرفوض 403** (محمي)؛
  `reviews hidden=false` = **0**؛ `hidden=true` = **403**. **لا تعليق معتمد يحمل بريداً
  غير فارغ** (0 من 52) → لا تسريب بريد قائم. استعلام بلا فلتر = **403** (سليم).
- **«توجيه كل الزوار إلى /login» مقصود** وموثّق في هذا الملف (الزائر مطرود؛ كل مسار محمي
  يوجّه غير الموثّق لـ`/login`). ليس عطلاً.
- **CI على `main` أخضر** (4/4) — عطل ترويسة `ci.yml` القديم لم يعد قائماً.

### عيوب أُصلحت (بدليل)
1. **نطاق قديم**: `public/robots.txt` + `public/sitemap.xml` على `rooz-store.pages.dev`
   بينما `canonical`/`og:url` على `almusaymir.pages.dev` → أُعيد كتابتهما (20 رابطاً، XML صالح).
2. **بوابة الزائر بعد إعادة التحميل**: مستخدم Firebase مجهول بلا جلسة زائر نشطة (تُصفَّر عند
   أي إعادة تحميل) كان يرى شاشة «تفعيل البريد» ببريد فارغ. الآن `ProtectedRoute` يعيده لـ`/login`.
   (اختبار انحدار في `src/loginRouteRedirect.test.jsx`.)
3. **`<button>` داخل `<a>`** في `WhatsAppFloat.jsx` (HTML غير صالح) → غلاف `<div>` + رابط شقيق.
4. **متغيّرات ميتة**: `VITE_AI_GREETING`/`VITE_RIBBON_DURATION_SECONDS`/`VITE_THROTTLE_WINDOW_SECONDS`
   (0 مرجع في `src` و`functions`) أُزيلت من `wrangler.toml` و`DEPLOYMENT-FREE.md`.
5. **`e2e/full-audit.mjs` كان متقادماً**: توقّع 3 أزرار فقط، ولون تركيز `rgb(201,162,39)`
   (الفعلي `#c9a45c`)، وحد أدنى 12.5px (المواصفة تقلّص الخط عمداً). صار يقرأ النص المرئي فقط
   (يتجاهل الأيقونات/العلامة الزخرفية `aria-hidden`)، ويتوقّع 4 أزرار، وحدّ 9.5px.
   **قبل الإصلاح كان `OVERALL: FAIL`؛ بعده `PASS` (65 فحصاً، 0 أخطاء).**

### مواصفة صفحة الدخول — مؤكَّدة حيّاً (360/390/414/1440)
اسم واحد «متجر المسيمير | ALMUSAYMIR» · «بوابتك نحو تجارة ذكية» عريض · «نجمع فيها بين رقي
المتاجر الفاخرة ومرونة الأسواق الحرة.» **سطر واحد** في كل المقاسات · بطاقة المالك **أكبر**
(202px مقابل 124px) · «⚜️ دخول صاحب الموقع ⚜️» زر واحد (ثلاث ضغطات = المسار المخفي) ·
بطاقة المشرفين «يحسمون التفاصيل لتظل تجربة زوارنا مثالية بلا عيوب.» · زر الحراج
«موقع حراج أونلاين» بخط 10.88px. **مطابق للمواصفة.**

### البوابات (محلية، هذه الجولة)
LINT exit 0 · BUILD ✓ · VITEST **24 ملفاً/164 اختباراً** · CONTRAST **PASS** (1017 عنصراً، 0 مخالفة) ·
BUTTONS 23 مساراً/237 عنصراً **0 خطأ** · FULL AUDIT **65 فحصاً/0 أخطاء/PASS** ·
RULES (محاكي Firestore) **342/342 PASS**. **CI على PR #34: 6/6 خضراء** (`90ad726`).
**تحذير**: اختبار المحاكي ليس اختبار إنتاج.

### ما لم يُنفَّذ (يحتاج المالك)
- لا دمج في `main` · لا نشر Cloudflare · لا نشر قواعد Firebase · لا ترحيل بيانات · لا حذف بيانات.
- PR #24 (`fix/reviews-privacy`) ما زال **مفتوحاً/مسودة/`DIRTY`** — **مُوصى بإغلاقه** لأنه
  متجاوَز (فكرته `publicSafe` غير مستخدمة في `main`). يحتاج موافقة المالك على الإغلاق.

## جولة تثبيت الحالة + حسم PR #24 + ترحيل أداة الفهارس — 2026-11-06 (فرع `fix/port-index-tooling`)
**سياق**: متابعة على `main` @ `90e6866` (نفس `origin/main`، شجرة نظيفة). تدقيق حيّ + قراءة
كود + استعلام إنتاج (قراءة فقط) لتثبيت الحالة وحسم PR #24. **لا دمج ولا نشر ولا ترحيل.**

### تثبيت الحالة (مُتحقَّق حيّاً)
- `HEAD = 90e6866` = `origin/main`. PR مفتوح وحيد: **#24** (مسودة، `fix/reviews-privacy`).
- CI على `main` أخضر (run `42962436125`، headSha `90e6866`). عطل ترويسة `ci.yml` لم يعد قائماً.
- `almusaymir.pages.dev` و`rooz-store.pages.dev` = 200. كل الأصول (`/favicon.ico`, `/sw.js`,
  `/manifest.json`, `/robots.txt`, `/sitemap.xml`, `/assets/og-image.jpg`, الأيقونات، الصوت) = 200.
- `og:image` = `logo-almusaymir-wide.png` بأبعاد `2160×1080` مطابقة للوسوم. لا انحراف محتوى:
  اختلاف بصمة `index-*.js` بين الحيّ والمحلي = **طابع البناء الزمني** (`__BUILD_STAMP__`) فقط.

### حسم PR #24 — التوصية: **إغلاق** (متجاوَز بالكامل)
كل تعديلات الفرع إما موجودة في `main` أو مقيّدة بمعمارية `publicSafe` المرفوضة:
- `firestore.rules`: `hasNoPublicPII` في `main` يشمل كل مفاتيح الفرع **و`moderatedBy`**.
  `main` يقفل الكتابة من المصدر (لا حقل بريد) فتصبح قاعدة `list` آمنة بلا علامة `publicSafe`.
- `src/firebase/firestore.js` + `ModerationPanels.jsx`: تعديلات الفرع `publicSafe` فقط.
- `scripts/{index-audit,preflight-indexes,compare-indexes}.mjs`: `validateRequiredPrivacyIndexes`
  **مقيّدة حرفياً بـ`publicSafe`** (سطرا 136–137) → غير قابلة للنقل كما هي.
- `scripts/backfill-public-safe.mjs` + `firestore.rules.transitional` + `firebase.barrier.json`:
  بلا معنى على `main` (0 مرجع لـ`publicSafe` في `src` والقواعد).

### الثغرة الكامنة — **لم تُثبت في الإنتاج، والإصلاح ليس تشديد القاعدة**
عدم تماثل `get`/`list` (`hasNoPublicPII` على `get` فقط) يبقى نظرياً لأن `main` يقفل الكتابة
من المصدر. **قياس إنتاج حيّ (قراءة فقط، بلا مصادقة، `anaqa-chic-4e437`)**:
- `reviews` list بلا فلتر = **403** · `reviews hidden=false` = **0 وثيقة**.
- `comments status=approved` = **52**، وكلها بلا بريد (لا حقل بريد في نموذج الإنشاء أصلاً).
- `get` على تعليق معتمد = **200** (سليم).
- استعلام `getReviews` الفعلي (productId + hidden + orderBy createdAt) على الإنتاج = **200** (الفهرس سليم).
- **الخلاصة**: لا تسريب قائم. تشديد قاعدة `list` بشرط «غياب حقل» يرفض الاستعلام بالكامل
  (Firestore يشترط أن يعكس الاستعلام شرط القاعدة)، فالفرع `publicSafe` يحاول حل مشكلة غير قائمة.

### المُنجَز هذه الجولة (أداة فهارس read-only قابلة للنقل)
نُقلت الأجزاء **المستقلة عن `publicSafe`** من PR #24 إلى الفرع الجديد:
- `scripts/index-audit.mjs` — معايرة `__name__` الضمني + `compareIndexFiles` (fail-closed على
  أي حذف محتمل) + `findUnnecessarySingleFieldIndexes` + `validateRequiredPrivacyIndexes`
  **مُعاد ضبطها على `main`**: `reviews[hidden,productId,createdAt]` و`comments[status,createdAt]`.
- `scripts/compare-indexes.mjs` — مقارنة ملف الإعداد بتصدير إنتاج **قراءة فقط** (يطبع هوية
  الفرع/الالتزام، ولا يحذف شيئاً). طريقة المالك الآمنة:
  `npx firebase-tools firestore:indexes --project anaqa-chic-4e437 > /tmp/prod-indexes.json`
  ثم `npm run compare:indexes -- firestore.indexes.json /tmp/prod-indexes.json` (بلا أسرار في المحادثة).
- `scripts/index-audit.test.js` (16 اختباراً) — وُصل بـ`test:indexes` في `package.json`،
  ويُشغّله تلقائياً `npm test` (وظيفة CI «Unit tests»). لا خطوة CI منفصلة: وظيفة `indexes`
  بلا `npm ci` فلا يستطيع تشغيل vitest.
- البوابات: LINT 0 · VITEST **25 ملفاً/180 اختباراً** · `validate:indexes` OK (15 فهرساً) ·
  `compare:indexes` على الملف نفسه = safe.

### البنود المتبقية (تحتاج موافقة المالك)
- **إغلاق PR #24** (موصى به) — لا دمج: `publicSafe` غير مستخدم في `main`.
- **نشر قواعد Firebase**: `main` يحمل قواعد نظيفة؛ النشر عبر
  `npx firebase-tools deploy --only firestore:rules` من جهاز المالك (لا Firebase CLI هنا).
- لا ترحيل بيانات ولا `--apply` ولا حذف بيانات — لا حاجة إليها (0 وثيقة متأثرة).

## الإغلاق النهائي + بدء التشغيل — 2026-11-12
- **PR #24 مُغلق بلا دمج** (موافقة المالك). السبب: متجاوَز بالكامل (`publicSafe` غير مستخدم في `main`).
- **PR #35 مدموج في `main`** (squash، التزام `317f0fb`) وحُذف الفرع `fix/port-index-tooling`.
  CI على `main` **6/6 أخضر** (run `43290457558`: lint · unit tests · rules · indexes · build · contrast).
- **لا ترحيل بيانات** (مؤكَّد: 0 وثيقة متأثرة).
- **نشر Firebase لم يُنفَّذ**: لا Firebase CLI مُصادَق في هذه البيئة (لا `FIREBASE_TOKEN`،
  ولا حساب خدمة، ولا gcloud؛ `~/.config/configstore/firebase-tools.json` يحوي MOTD فقط).
  الأمر `firebase deploy` يتوقف عند مرحلة المصادقة بلا TTY. **يتولّاه المالك من جهازه**:
  `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project anaqa-chic-4e437`
  (أو `firebase login --no-localhost` ثم إعادة الأمر).
- لم يُمسّ `firestore.rules` ولا `firestore.indexes.json` (الشجرة نظيفة).

## جولة التنظيف والإشعارات (fix/audit-cleanup-toast) — 2026-11-12
**سياق**: تنفيذ ملاحظات المالك الثلاث (حذف فهارس publicSafe، إزالة إيميلات المالك المكتوبة،
استبدال alert بـToast). PR **#36** مفتوح (لم يُدمج، لم يُنشر).

### ما نُفِّذ
- **`firestore.indexes.json`**: حُذف فهرسان مركّبان ميتان على `reviews` و`comments` يستخدمان
  `publicSafe` (18 سطراً محذوفة، بلا إعادة تنسيق). المتبقي 13 فهرساً صالحاً
  (`npm run validate:indexes` → OK). الكود والقواعد لا تشير إلى `publicSafe` إطلاقاً.
- **إيميلات المالك**: مصدر واحد `src/utils/ownerEmails.js` (`OWNER_EMAILS`/`OWNER_EMAIL_SET`/
  `isOwnerEmail`) يقرأ `VITE_OWNER_EMAILS || VITE_ADMIN_EMAILS` **فقط** بلا قيمة احتياطية.
  حُذفت القيم الصريحة من `App.jsx`, `Login.jsx`, `AuthContext.jsx`, `firebase/auth.js`,
  `firebase/index.js`, `useStore.js`, `OwnerPrivateRoom.jsx`, `owner/PermissionsPanel.jsx`.
  `constants.js`: `EMAIL` = `''` عند غياب المتغير (الهواتف/الآيبان تُركت بقرار المالك).
  `ContactPage.jsx`: ملخص التواصل يُبنى من `constants` (مصدر واحد).
- **نظام Toast**: `src/utils/toast.js` (مخزن `useSyncExternalStore`) + `src/components/ToastHost.jsx`
  (يُركّب في `App.jsx`). استُبدلت **كل** نداءات `alert()` الـ55 في 13 ملفاً بـ`toast.success/error`
  (التصنيف حسب بداية الرسالة: «تم…» = success، غير ذلك = error). 0 `alert()` متبقٍ.

### تحقق هذه الجولة
LINT exit 0 · VITEST **26 ملفاً/188 اختباراً** ✓ (منها `src/utils/toast.test.jsx` 8 اختبارات) ·
BUILD ✓ · CONTRAST OVERALL PASS (1017 عنصر، 0 مخالفة) · FULL AUDIT 65 فحصاً 0 أخطاء PASS ·
BUTTON AUDIT 237 عنصراً 0 خطأ · RULES AUDIT على المحاكي **342/342 PASS** · CI على PR #36 **كله أخضر** ·
0 خطأ console على `/login`.

### صفحة الدخول — مُثبَتة حيًّا (لم تُعدَّل)
`متجر المسيمير|ALMUSAYMIR` أسود `rgb(0,0,0)` · `بوابتك نحو تجارة ذكية` وزن 900 ·
`نجمع فيها…` وزن 300 سطر واحد (`nowrap`) · بطاقة المالك (202px) > المشرفين (124px) ·
`⚜️ دخول صاحب الموقع ⚜️` (3 ضغطات) يمر بـFirebase Auth + PIN خادمي فقط — لا تجاوز ·
زر الحراج `موقع حراج أونلاين`.

### لا يزال مطلوباً من المالك
دمج PR #36 ثم نشر يدوي: `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project anaqa-chic-4e437`.

## جولة «تحكم المالك الكامل بالمحتوى» + تثبيت الحالة — 2026-11-06 (فرع `feat/owner-full-content-control` → PR #37)
**سياق**: متابعة بعد تقرير قديم ادّعى أن PR #24 (`fix/reviews-privacy`) وPR #25 (`fix/login-page-design`)
مسودّتان مفتوحتان. **التحقق الحيّ أظهر أن التقرير متقادم بالكامل** (التفاصيل أدناه)، ثم نُفِّذ البند
الرئيسي: تعديل/حذف **حقيقي** لأي نص أو عنصر في كل الموقع من صاحب الموقع.

### تصحيح التقرير القديم (مُتحقَّق حيّاً عبر GitHub API)
- **لا يوجد أي PR مفتوح** على المستودع. #24 **CLOSED** (بلا دمج)، #25 **MERGED**، #36 **MERGED**.
- `main` @ `53e829a` (ليس `7104bb1`/`3282245`). CI على `main` أخضر (4 وظائف).
- **`publicSafe` غير موجود** في `main` (لا في `src` ولا في القواعد). المعمارية الحيّة تقيّد القراءة
  العامة بـ`reviews.hidden == false` و`comments.status == 'approved'` — كلاهما **قابل للفرض في
  الاستعلام** فيشمل السجلات القديمة **بلا أي ترحيل**.
- **`scripts/backfill-public-safe.mjs` غير موجود على `main`** (على فرع #24 فقط) → **لا حاجة لـ`--apply`**.
- **قياس إنتاج حيّ (قراءة فقط، بلا مصادقة، `anaqa-chic-4e437`)**: `comments status=approved` = 200
  (وبريدها فارغ `email:""`)، `reviews hidden=false` = **0 وثيقة**. **لا تسريب قائم، ولا ترحيل مطلوب.**
- **صفحة الدخول على `main` مطابقة للمواصفة حرفياً** (مُقاس حيّاً 390px):
  الاسم `rgb(0,0,0)` · «بوابتك نحو تجارة ذكية» عريض · العبارة الثانية سطر واحد ·
  بطاقة المالك 202×125 مقابل المشرفين 124×102 · «⚜️ دخول صاحب الموقع ⚜️» زر واحد (3 ضغطات) ·
  «دخول المشرفين والمراقبين» `rgb(118,80,11)` · «يحسمون التفاصيل…» أسود · «موقع حراج أونلاين».

### البند الرئيسي — تحكم المالك الكامل بالمحتوى (منفَّذ فعلاً)
- **`src/store/useSiteContent.js`**: مخزن zustand مربوط بـ`settings/siteContent` (قراءة عامة/كتابة
  مالك). البنية `{ texts, hidden, lists }`. المزامنة اللحظية عبر `onSnapshot` → كل الزوار على كل
  الأجهزة. دوال الحفظ الحقيقية: `setSiteText` / `clearSiteText` / `hideSiteItem` / `showSiteItem` /
  `setSiteList` (+ `addSiteListItem`/`updateSiteListItem`/`deleteSiteListItem`).
- **`src/data/contentRegistry.js`**: سجل الحقول (مصدر واحد) — 17 نصاً + 3 قوائم في 6 مجموعات.
- **`src/hooks/useIsOwner.js`**: البوابة الوحيدة `isAuthenticated && userRole==='owner'`.
- **`src/components/Editable.jsx`**: للزائر نص فقط بلا أزرار؛ للمالك زرّا تعديل+حذف، ومودال تعديل،
  وشارة «عنصر محذوف» قابلة للاسترجاع. يدعم `controlsOnly` (أزرار فقط بجانب نص يُصيَّر خارجياً،
  مثل شريط Marquee المتحرك).
- **`src/pages/ContentManager.jsx`**: المدير المركزي (`/owner/content` + تبويب «مدير المحتوى» في
  غرفة المالك) — تعديل/حذف/استرجاع كل نص، ومحرر قوائم كامل (إضافة/تعديل/حذف/ترتيب).
- **الأسطح المربوطة**: الترويسة (عناصر القائمة + حقل البحث)، الرئيسية (عنوان/وصف الهيرو، زر الحراج،
  نقاط الثقة، وسم التذييل، روابط التذييل، سطر الحقوق)، FAQ (عنوان+وصف+كل سؤال/جواب)، تواصل معنا،
  الشروط، الشريط الإعلاني.
- **`firestore.rules`**: `settings/siteContent` كتابة للمالك فقط، قراءة عامة، وأُضيف إلى
  `isReservedSettingsDoc` (فلا تتجاوزه `UPDATE_GLOBAL_SETTINGS`).

### الأدلة (هذه الجولة)
LINT exit 0 · BUILD ✓ · VITEST **27 ملفاً/200 اختباراً** ✓ (منها `Editable.test.jsx` 12 اختباراً) ·
CONTRAST PASS (1017 عنصراً، 0 مخالفة) · BUTTON AUDIT 237 عنصراً/0 خطأ · FULL AUDIT 65 فحصاً/0 أخطاء/PASS ·
RULES (محاكي Firestore، Java 21) **348/348 PASS** (منها 6 فحوص `siteContent`).
⚠️ **اختبار المحاكي ليس اختبار إنتاج.**

### ما لم يُنفَّذ (يحتاج المالك)
- **PR #37 مفتوح (مسودة)** — لا دمج في `main`، لا نشر Cloudflare، لا نشر قواعد Firebase.
- **قبل الاستخدام الحيّ**: نشر القواعد أولاً من جهاز المالك:
  `npx firebase-tools deploy --only firestore:rules --project anaqa-chic-4e437`.
- **لا ترحيل بيانات مطلوب** (مؤكَّد بالقياس: 0 وثيقة متأثرة).

## جولة متابعة — شريط ترحيب المالك + التحقق من ترحيل reviews/comments (2026-11-14)
**سياق**: طلب المالك أن يظهر شريط ترحيب المالك مرة واحدة فقط لا ثلاث مرات، مع عدم كسر أي مسار/ربط.

### ما نُفِّذ فعلاً (مُتحقَّق منه)
- **`src/App.jsx`**: `animation: 'ownerGlobalTicker 32s linear 3'` → `... linear 1`
  (الشريط كان يمرّ 3 مرات). ومؤقّت الإخفاء التلقائي صار `33000ms` (دورة واحدة) بدل `300000ms`
  (كان غير مطابق لمدة الحركة أصلاً). صفر تغيير في المسارات/الروابط/Firebase/المصادقة/Rules.
- **تأكيد عدم الكسر**: فرق المسارات `main` مقابل الفرع = `path="/owner/content"` فقط (من PR #37).
  BUILD ✓ · LINT exit 0 · VITEST **27 ملفاً/200 اختباراً** ✓ · CONTRAST PASS · FULL AUDIT
  **65 فحصاً/0 أخطاء/PASS**. CI على الفرع: **6/6 أخضر**.

### تصحيح مهم لادّعاء سابق (ترحيل `publicSafe`)
- **الواقع على `main` (والقواعد المنشورة إنتاجياً) يستخدم نهج `hidden`/`status` — لا `publicSafe`.**
  الالتزام `aab85cf` («hidden-based, PII-separated») هو المدموج. نهج `publicSafe` وبريده
  `scripts/backfill-public-safe.mjs` موجودان فقط في فرع **مغلق** `fix/reviews-privacy` (PR #24 = CLOSED،
  غير مدموج). أي أن **لا ترحيل مطلوب إنتاجياً**: لا يوجد شرط `publicSafe: true` منشور ليُسقط السجلات القديمة.
- **قياس إنتاجي حيّ (قراءة فقط عبر REST، بلا أسرار)**:
  - `reviews`: **0 وثيقة** (سواء `hidden==true` أو `==false`).
  - `comments`: **52 معتمدة**، 0 معلّقة، 0 مرفوضة — و**0 منها تحمل بريداً غير فارغ** (كلها `email: ''`).
  - `review_private` / `comment_private`: القراءة العامة مرفوضة (PERMISSION_DENIED) — الفصل يعمل.
  - القراءة العامة غير المرشّحة على `comments`/`reviews` = PERMISSION_DENIED (لا تسريب).
- **الخلاصة**: القواعد المنشورة آمنة، والبيانات خالية من PII المتبقّي، ولا حاجة لأي `--apply`.
- **طريقة dry-run الآمنة للمالك** (على فرض أنه يريد ترحيل نهج `publicSafe` لاحقاً من فرع آخر):
  لا يُشارَك أي سر في المحادثة؛ ينفّذها على جهازه:
  `export FIREBASE_PROJECT_ID=anaqa-chic-4e437` ثم
  `export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"` ثم
  `node scripts/backfill-public-safe.mjs` (افتراضياً dry-run بلا كتابة؛ يتطلب `--apply` + `CONFIRM_APPLY=yes`
  + `--backup-dir=` معاً للكتابة). السكربت **غير موجود على `main`** — موجود فقط في فرع `fix/reviews-privacy`.

### ملفات هذه الجولة
`src/App.jsx` (5 أسطر) · `AGENTS.md`. الالتزام `d99c221` مدفوع إلى `feat/owner-full-content-control`
ويحدّث PR #37 (ما زال مسودة). **لا دمج، لا نشر.**
⚠️ **اختبار المحاكي ليس اختبار إنتاج.**

