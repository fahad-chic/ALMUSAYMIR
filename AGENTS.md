# AGENTS.md — rooz-nova

## المشروع (Project)
- منصة **أناقة ROOZ / ROOZ** — تجارة أزياء عربية + حراج إعلانات.
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
- نفس **اسم الموقع** (أناقة ROOZ).
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
