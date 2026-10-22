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

## صفحة الدخول (Login) — ملاحظات
- ملف `src/styles/logo-clean.css` (مستورد في `main.jsx`) يزيل أي خلفية/إطار/حلقة عن كل الشعارات (الشعارات PNG شفافة أصلاً).
- لوحة التشخيص وإصدار الواجهة أُزيلا من الواجهة ويُطبعان في الـ Console فقط.
- أزرار الدخول شبكة 2×2: (نسيت كلمة المرور | إنشاء حساب) ثم (Google | دخول الزوار المؤقت).
- **سلوك `/` مع الزائر مقصود**: المسار يحمل `blockGuest` لكن التطبيق يعرض للزائر الرئيسية مع شريط عدّاد مؤقّت (وليس طرداً). لا تعتبره خطأ.
- **`/haraj` مسار محمي**: زر «حراج» في صفحة الدخول يوجّه لغير الموثّق إلى `/login`. سلوك قائم؛ تغييره لقرار المالك.

## الاختبار الآلي
- `npx vitest run` — 100 اختبار (13 ملفاً) يجب أن تمرّ.
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
- **أُبقي بطلب المالك**: `src/permissions/requirePerm.js`، `src/utils/wcag.js` + `wcag.test.js`،
  `public/favicon.ico`، `public/assets/og-image.jpg`، `src/data/saudiCities.js`.
