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
