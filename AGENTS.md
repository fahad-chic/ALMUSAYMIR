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
- **بيئة العمل**: Java غير مثبّت افتراضياً. يُثبَّت بـ
  `sudo apt-get install -y openjdk-21-jre-headless` (openjdk-17 غير متاح) ثم يعمل
  `npm run test:rules` و`npm run test:privacy-repair`.

## تصحيح حالة المشروع (تحقّق مباشر 2026-11-19) — اقرأه قبل أي متابعة
التقارير القديمة (PR #24/#25 مفتوحتان، main بلا إصلاح خصوصية) **متجاوَزة**:
- `main` = `70985ef`. **PR #25 مدموج** (`3282245`)، و**PR #24 مغلق بلا دمج**.
- إصلاح الخصوصية الفعلي على `main` هو `aab85cf` بنموذج **`hidden`** (لا `publicSafe`):
  `reviews.list` = `resource.data.hidden == false`، و`comments.list` = `status == 'approved'`،
  والبيانات الشخصية في `review_private` / `comment_private`.
- **لا وجود لـ`publicSafe` في `src/` أو `scripts/` أو `firestore.rules` على main** (0 مرجع).
  خطاب «backfill publicSafe» يخصّ فرع PR #24 غير المدموج فقط → **مهجور، لا يُنفَّذ**.
- **الإنتاج يفرض نموذج `hidden` فعلاً** (تحقّق REST بلا مصادقة): استعلام
  `hidden == false` يُقبل، و`publicSafe == true` يُرفض 403.
- **أعداد الإنتاج الفعلية (قراءة فقط)**: `reviews` المنشورة = **0**؛ `comments` المعتمدة = **52**،
  وكلها `email: ''` (فارغ) → **لا تسريب بيانات شخصية قائم**. لا حاجة لترحيل إنتاجي.
- **صفحة الدخول مطابقة للمواصفات على الإنتاج الحي** (مُقاس بـPlaywright 390px):
  الاسم أسود `rgb(0,0,0)`، العنوان وزن 900، الوصف وزن 300 في **سطر واحد** بلا تجاوز،
  الشارة «⚜️ دخول صاحب الموقع ⚜️» **سطر واحد** غير مقصوص (320→430px)،
  وتباين: عنوان المالك 6.50 · عنوان المشرف 7.19 · وصف المشرف 21.0 · الشارة 7.61 (كلها AA).
- **الضغط الثلاثي آمن**: يفتح مودالاً يطلب بريداً وكلمة مرور ورمزاً سرياً — لا تجاوز.
- **البوابات المقاسة على `main`**: VITEST 37 ملفاً/277 اختباراً · RULES **348/348 PASS** ·
  PRIVACY-REPAIR **9/9** · LINT 0 · BUILD ✓ · CONTRAST 1017 عنصراً/0 مخالفة · CI على `70985ef` أخضر.
- **درس**: `npm run contrast` افتراضياً يقرأ `localhost:12000`؛ إن لم يكن خادماً يعمل
  يُبلّغ «0 elements checked / PASS» — **نجاح زائف**. استخدم `BASE_URL=<preview>`.

## جولة 2026-11-06 (PR #50) — بوابة غرفة القيادة + مواصفات الدخول + تباين AA
**`main` = `70985ef`. لم يُدمج شيء، ولم يُنشر Cloudflare/Firebase، ولم يُشغَّل ترحيل.**

### تصحيح حالة التقارير السابقة (مُتحقَّق بـAPI وقراءة كود)
- **PR #24 (`fix/reviews-privacy`): مغلق بلا دمج**، رأسه `6db27cff`. **PR #25: مدموج** (`3282245`).
- **`publicSafe` غير موجود في `main`** (0 مرجع في `src/`, `scripts/`, `firestore.rules`)،
  و**`scripts/backfill-public-safe.mjs` غير موجود**. نموذج الإنتاج هو `hidden`/`status`:
  `reviews.list` = `hidden == false`، `comments.list` = `status == 'approved'` + منع `email` غير فارغ.
- الاستعلامات تُطابق القواعد فعلاً (`where('hidden','==',false)` في `firestore.js`،
  `where('status','==','approved')` في `CommentsSection.jsx`) ⇒ **السجلات القديمة تبقى ظاهرة بلا ترحيل**.
  خطاب «backfill publicSafe» يخصّ فرع PR #24 غير المدموج ⇒ **مهجور**.

### أخطاء حقيقية أُصلحت في هذه الجولة
- **`OwnerPrivateRoom.jsx` — `ReferenceError` (TDZ)**: `tabs` كان يُقرأ في مصفوفة اعتماديات
  `useEffect` **قبل تعريفه** بـ86 سطراً ⇒ انهيار الغرفة لأي مالك مسجّل. ونُقل الأثران **قبل**
  `if (loading)` (احترام ترتيب الـhooks)، وأُزيلت `tabs` من الاعتماديات (مصفوفة جديدة كل render
  ⇒ حلقة تحديث لا نهائية).
- **`SettingsPage.jsx` — نص غير مقروء**: `text-gray-300`/`text-gray-400` أبيض/رمادي فاتح على خلفية
  كريمية = **1.03:1**. صار `--rz-ink`/`--rz-muted` ⇒ **17.2–20.7:1**.
- **`rooz-site-backdrop.css` — `btn-gold`**: نص أبيض على ذهبي فاتح، ونهاية تدرّج `#8F6C52`
  = **4.43:1** (تحت AA). صار نصاً أسود ونهاية `#A87D46` ⇒ **5.69–20.7:1**.
- **`theme.css` — `--rz-gold-deep` كان غير معرّف** (الموجود `--rz-gold-deep-rgb` فقط) ⇒ أي
  `var(--rz-gold-deep)` يسقط صامتاً. أُضيف التعريف (المصدر الوحيد للألوان).

### ما بُني
- `ConsoleGateScreen` داخل `ConsoleRoom.jsx`؛ `/console` صار مفتوحاً (بلا `ProtectedRoute`)
  ويعرض **حقل الرمز فقط** للزائر — صفر أقسام/بيانات قبل التحقق.
- `consoleSections.js`: `complaints` → `ownerOnly` + `/complaints` (كانت `MANAGE_CONTACT_MESSAGES`
  المؤجّلة)، وعناصر `{kind:'tab'}` تُخفى عن غير المالك (كل تبويب في `/owner-private-room` المحمي).
- اختبارات جديدة: `ConsoleRoom.test.jsx` (6) و`consoleSections.test.js` (9).

### قياسات صفحة الدخول (390px، Playwright)
اسم الشعار `rgb(0,0,0)` وزن 900 · «بوابتك نحو تجارة ذكية» وزن 900 · الوصف وزن 300 **سطر واحد** ·
بطاقة المالك 202px مقابل 124px (**1.63×**) · عنوان المالك/المشرف `rgb(118,80,11)` = **7.19:1** ·
وصف المشرف أسود **21.0:1** · الشارة «⚜️ دخول صاحب الموقع ⚜️» سطر واحد ·
زر الحراج «موقع حراج أونلاين» 10.88px · أزرار إنشاء حساب/نسيان/Google/زائر 10.88px بلا تجاوز.
**الضغط الثلاثي آمن**: يفتح مودالاً (بريد + كلمة مرور + رمز) والرمز يُتحقق **خادمياً** عبر `/api/owner-pin`.

### البوابات (محلي) وCI
LINT exit 0 · VITEST **39 ملفاً/292 اختباراً** · BUILD=0 · CONTRAST **1074 عنصراً، 0 مخالفة، PASS** ·
**CI على PR #50: 7/7 خضراء** (Lint, Unit tests, Production build, Firestore rules, Indexes, Contrast, Cloudflare Pages).
- **5 «suspects» متبقية = إيجابيات كاذبة مُتحقَّق منها بالبكسل**: أيقونة واتساب بيضاء على تدرّج داكن
  (`rgb(28,25,23)→rgb(143,108,82)`)، ومقابض Toggle بيضاء على خلفية داكنة. المفحص يقرأ `color`
  الموروث لا لون الرسم الفعلي.
- **لا اختبار إنتاج**: كل ما سبق محلي (preview + unit). اختبار المحاكي/الوحدات **ليس** اختبار إنتاج.

## جولة إصلاحات غرفة المالك (PR #52) — 2026-11-06
**سياق**: المالك أبلغ عن أخطاء على جواله. تحقّق حيّ + قراءة كود أثبت 3 أسباب جذرية حقيقية.

### الحالة الفعلية للفروع (تحقّق، لا اعتماد على تقرير سابق)
- **PR #25 `fix/login-page-design` مدموج فعلاً في `main`** (merge commit `8248f4e`, سلف لـmain).
  `main` يحمل كامل مواصفات صفحة الدخول: اسم أسود `rgb(0,0,0)`، العبارة بخط 900/300،
  بطاقة المالك 1.63× عرضاً و2.00× مساحة، ⚜️ ثلاث ضغطات، «موقع حراج أونلاين».
  **لا تُعِد تطبيق ملفات ZIP القديمة** — ستُنتج تكراراً.
- **PR #24 `fix/reviews-privacy` مغلق بلا دمج** (closed_at 2026-11-12). الفرع باقٍ.
- **`publicSafe` غير موجود في `firestore.rules` على `main` (0)**، وموجود في فرع PR #24 (17).
  ⇒ خطر إخفاء السجلات القديمة **لم يصل الإنتاج**. يصبح حقيقياً لحظة نشر قواعد ذلك الفرع.

### الأسباب الجذرية المُصلَحة (لا تخمين)
1. **الرمز يُطلب كل مرة**: `readOwnerGate()` كان يشترط `auth.currentUser.uid` وقت القراءة،
   وهو `null` أثناء استعادة Firebase ⇒ يُمسح السجل. الحل: `src/utils/ownerGate.js` تتحقق من
   صلاحية `expiresAt` فقط، وتطابق uid عند توفّره فقط. الحماية الحقيقية على الخادم.
2. **الرجوع**: `navigate(next, {replace:true})` لا يدفع مدخلاً ⇒ الرجوع يتخطّى الأقسام.
   صار `navigate(next)` + مستمع `popstate` يتبع `?tab=`. حُذف `tabHistory` نهائياً.
3. **ثغرة تصريح**: فحص صلاحيات المشرف كان **داخل** `if (!gatePassed)` ⇒ جلسة رمز سارية
   تمنح مشرفاً بلا صلاحيات دخول. الآن `if (!isOwner) { if (!allowedAdmin) → /unauthorized }`
   **قبل** البوابة. اكتشفها اختبار قائم (`ConsoleRoom.test.jsx`).

### زر ❌ (BUG-4)
`dismissedId`/`is-excluded` حُذفا من `OwnerConsoleMenu.jsx`. ❌ = `setOpen(false)` فقط:
لا يستبعد قسماً ولا يمسّ جلسة الرمز. يُثبته `OwnerPrivateRoom.close.test.jsx` (3 اختبارات).

### البوابات (الالتزام `1f3d585`)
LINT 0 · VITEST **44 ملفاً/312 اختباراً** · BUILD ✓ · CONTRAST OVERALL PASS ·
CI على PR **7/7** · معاينة Cloudflare 200 على `/`, `/login`, `/owner-private-room`.
**تحقق أمني حيّ**: ثلاث ضغطات على ⚜️ بلا مصادقة ⇒ يبقى `/login` ولا محتوى إداري؛
الدخول المباشر لـ`/owner-private-room` ⇒ يُحوَّل لـ`/login`.

### درس تحقّق
`git grep origin/main` لا يبحث في شجرة غير مسحوبة (يعطي 0 كاذباً). استخدم
`git show origin/main:<path> > /tmp/f && grep` بدلاً منه.

## جولة الإغلاق: دمج #52/#53 + فحص #24 — 2026-11-06
### مدموج ومنشور على الإنتاج (`almusaymir.pages.dev`)
- **PR #52** → squash `299add0`: رمز واحد لكل جلسة، رجوع خطوة، بطاقات إحصاء فعّالة، إغلاق ثغرة تصريح.
- **PR #53** → squash `d83ab27`: اختبارات تثبيت الترويسة + ربط الصلاحيات (5 اختبارات).
- **PR #24 أُغلق موثّقاً** (تعليق على الـPR): كل إصلاح خصوصية فيه منفَّذ فعلاً في `main` بآلية مكافئة.
- البوابات: LINT 0 · **45 ملفاً/317 اختباراً** · BUILD ✓ · CI 7/7 على الالتزامين.

### PR #24: نتيجة الفحص (لا شيء مفيد غير مدموج)
`main` يحوي حماية خصوصية **مكافئة وأبسط**: `hidden` + `review_private`/`comment_private`
+ `hasNoPublicPII()` + فهرس `reviews(hidden, productId, createdAt)` + `scripts/legacy-privacy-report.mjs`
(قراءة فقط، **بلا مسار كتابة إطلاقاً** — أأمن من `backfill-public-safe.mjs` ذي `--apply`).
المتبقي في الفرع فقط: سكربت `--apply` + `firestore.rules.transitional` + `firebase.barrier.json`
— وكلها **مؤجّلة بقرار المالك** (لا ترحيل الآن). لذلك الإغلاق صحيح لا عشوائي.

### تحقق حيّ على الإنتاج (Playwright، 5 عروض: 320/360/375/390/430)
| العرض | تجاوز أفقي | أزرار مقصوصة | لون الاسم | وزن العبارة١ | وزن العبارة٢ | نسبة بطاقة المالك/المشرفين |
|---|---|---|---|---|---|---|
| 320 | لا | 0 | `rgb(0,0,0)` | 900 | 300 | **1.90×** |
| 360 | لا | 0 | `rgb(0,0,0)` | 900 | 300 | **1.98×** |
| 375 | لا | 0 | `rgb(0,0,0)` | 900 | 300 | **2.01×** |
| 390 | لا | 0 | `rgb(0,0,0)` | 900 | 300 | **2.00×** |
| 430 | لا | 0 | `rgb(0,0,0)` | 900 | 300 | **2.00×** |
- عنوان المالك والمشرفين: `rgb(118,80,11)` ذهبي غامق، وزن 900. وصف المشرفين أسود وزن 300.
- شارة `⚜️ دخول صاحب الموقع ⚜️` موجودة، وزر `موقع حراج أونلاين` موجود.
- **أمن حيّ**: ٣ ضغطات على الشارة بلا مصادقة ⇒ يبقى `/login` (`hasAdminContent=false`).
  الدخول المباشر لـ`/owner-private-room` ⇒ يُحوَّل إلى `/login`.

### إثبات تطابق الإنتاج مع `main` (طريقة التحقق الصحيحة)
`index-*.js` **لا يُقارن بالـhash**: `vite.config.js` يحقن `__BUILD_STAMP__` = وقت البناء،
فيولّد بصمة جديدة كل بناء. المقارنة الصحيحة: تطبيع البصمات + إزالة كائن `VITE_*` المحقون
(يختلف لأن `.env` المحلي فيه متغيرات غير مضبوطة في Cloudflare) ⇒ **398,118 بايت متطابقة**.

### درس: دمج عبر API
- `gh api -X PUT .../merge-async` يحتاج **SHA كاملًا** (12 حرفاً يُرجع "head branch was modified").
- الـPR يُنشأ **مسودة** تلقائياً في هذا المستودع ⇒ `merge-async` يفشل بـ"Pull request is in draft".
  الحل: `markPullRequestReadyForReview` عبر GraphQL (لا يعمل `PATCH {draft:false}` ولا `ready_for_review`).

## جولة غرفة المالك + صفحة الدخول (PR #56) — 2026-11-06
- **غرفة المالك**: التبويب `center` («المركز الرئيسي») كان مكرراً وفارغاً بجانب `overview`.
  حُذف `CenterPanel` + كتلة تصييره، وصار `overview` المدخل الوحيد (كل السقوط على `'center'`
  → `'overview'` في 6 مواضع). إثبات في `dist`: «المركز الرئيسي» = **0**، «نظرة عامة» = 10.
- **قفل نصوص صفحة الدخول**: اختباران في `src/components/Login.test.jsx` يثبتان حرفياً:
  الاسم، «بوابتك نحو تجارة ذكية»، «نجمع فيها بين رقي المتاجر الفاخرة ومرونة الأسواق الحرة.»،
  بطاقتي الدور، «⚜️ دخول صاحب الموقع ⚜️»، «موقع حراج أونلاين»، وغياب «المالك الرئيسي»/«®».
- **`e2e/full-audit.mjs`**: `/settings` **عام بالتصميم** (إعدادات عرض محلية) → نُقل من
  `anonProtected`/`guestInjectedRoutes` إلى `anonPublic` (كان يولّد خطأين كاذبين).
  ومحدّد زر الحراج `.rl-haraj-gate` يطابق عنصرين (زر الحراج + زر الإعدادات يعيد استخدام الصنف)
  → استُخدم `getByRole('button', { name: 'موقع حراج أونلاين' })`.
- **مهم — نموذج الخصوصية على `main` هو `hidden`/`status`، لا `publicSafe`**:
  `scripts/backfill-public-safe.mjs` غير موجود على `main` (فقط في `fix/reviews-privacy` = PR #24
  **مغلق غير مدموج**). أداة المعاينة الصحيحة: `npm run report:legacy-privacy`
  (`scripts/legacy-privacy-report.mjs` — قراءة فقط، بلا مسار كتابة).
- **PR #25 (`fix/login-page-design`) مدموج فعلاً** في `main` (merged_at 2026-11-08).
- البوابات: LINT 0 · VITEST 45/320 · BUILD ✓ · CONTRAST PASS (1054 عنصر، 0 مخالفة) ·
  FULL AUDIT 64 فحصاً/0 أخطاء · RULES AUDIT (محاكي) 348 PASS · PRIVACY REPAIR (محاكي) 9/9.
  **كلها محلية/محاكي — لا شيء منها إنتاج.**

## جولة الإغلاق النهائية على الإنتاج (2026-11-20) — PR #57 + `4106ba5` + `b53e6fd`
**الحالة**: مدموج ومنشور على `almusaymir.pages.dev` (البناء `index-BlTVswYN.js`). CI أخضر على الالتزامين.
`main` = `b53e6fd`. البوابات: eslint 0 · vitest **51 ملفاً/349 اختباراً** · build ✓.

### عيب حقيقي أُصلح: قصّ أفقي عند 320–360px (لم يظهر في «عرض المستند»)
- `scrollWidth - innerWidth` كان **0** (لا تجاوز) لكن الأزرار كانت **مقصوصة** لأن الحاوية `overflow:hidden`
  تقصّها. القياس الصحيح = `getBoundingClientRect()` لكل زر مقابل `innerWidth`، **لا** `scrollWidth`.
- `CommentsSection.jsx`: «أضف تعليقك هنا» كان `left = -70px` عند 320px ⇒ `flexWrap:'wrap'` + `rowGap` + `minWidth:0`.
- `RoyalHarajPage.jsx`: زر «تواصل» في بطاقة الإعلان كان `left = -13px` ⇒ `flexWrap:'wrap'` على صف السعر/الأزرار.
- بعد الإصلاح: **0 عنصر مقصوص** في 320/360/375/390/430 (الرئيسية + الحراج + من نحن).

### عيب حقيقي أُصلح: رقم «المدراء» لا يطابق القائمة التي يفتحها
- كان يعدّ `isStaffRole` (admin/staff/editor) لكن `onClick` يفتح تبويب `permissions`
  (= `PermissionsPanel`، ويسرد **كل** المستخدمين القابلين للمنح) ⇒ رقم ≠ ما تراه.
- صار يفتح `onTab('users','admins')` — نفس المقاد `isStaffRole` المستخدم في العدّ
  (البطاقة الكبيرة **و**البطاقة المصغّرة في «ملخص سريع»).

### أهداف اللمس: القياس البصري يخالف الهدف الفعلي
- `.rz-icon-btn` بصرياً **30×30** (و34×34 عند 430px) — بأمر المالك «أزرار أصغر».
- لكن **هدف اللمس الفعلي 63px** بفضل `.rz-icon-btn::after { inset: -7px }`.
  القياس الصحيح = `elementFromPoint` خطوة بخطوة، **لا** `getBoundingClientRect` ولا `getComputedStyle(el,'::after').inset`
  (الأخير يعيد `0` في Chromium فيُضلّل).
- `.rz-burger` بصرياً 80×28 وهدفه الفعلي 55px — مقبول.

### الترويسة على الجوال (مُقاس حيّ)
| العرض | ارتفاع `.rz-topbar` | أيقونات | عناصر كاملة داخل الشاشة | تجاوز |
|---|---|---|---|---|
| 320/360/375/390/430 | **55px** | 4 | 6/6 | 0 |

### ملاحظات تحقّق مهمّة
- **جلسة الزائر تُفقد عند `page.goto` مباشر** لمسار محمي ⇒ الصفحات تُعيد التوجيه لـ`/login`
  وتبدو «فارغة». تحقّق من الصفحات المحمية بـ**تنقّل SPA** (`window.__ROOZ_NAV__(path)` أو الضغط من الدرج).
- **`/haraj/post` و`/owner-private-room` محميّان** ⇒ لا يمكن فحص مسودة الصورة أو رمز المالك
  من متصفح زائر. التحقق عبر اختبارات وحدات على المكوّنات الحقيقية (بلا mocks للسلوك).
- **الدرج «استكشف الموقع»**: مطويّ افتراضياً (روابطه `button` لا `a`) — عند فتحه يظهر
  `وظائفنا`/`شركاؤنا`/`الخصوصية` فقط، وكلها `onscreen` وتنقل للمسارات الصحيحة عند 320px.
- **`/api/owner-pin` حيّ**: بلا هوية → **401** «رمز الهوية مفقود»؛ رمز مزوّر → **401** «رمز الهوية غير صالح»؛
  إجراء مجهول → **400**. لا مقارنة رمز في العميل إطلاقاً (0 مرجع لـ`OWNER_PIN` في `src/`).

### اختبارات انحدار جديدة (كلها تفشل قبل الإصلاح — مُتحقَّق بالتعطيل اليدوي)
- `src/components/RoyalHome/commentsWrap.test.jsx` — `flexWrap` على DOM حقيقي.
- `src/components/admin/bannerDraft.test.jsx` — ❌ في نافذة البنر يُبقي مسودة الصورة، الحفظ وحده يمسحها.
- `src/pages/OwnerPrivateRoom.overview.test.jsx` — «المدراء» يفتح الطاقم وحدهم.

## إثبات قيد Firestore `list` + ربط تدقيق الخصوصية بـCI (PR #55) — 2026-11-20
**النتيجة الحاسمة (مقيسة على المحاكي، لا مفترضة):** قواعد `list` في Firestore تُقيَّم على
**الاستعلام** لا على كل مستند، ولا تستطيع إخفاء مستند واحد داخل نتيجة الاستعلام.
- `get reviews/pii` → `DENIED`، بينما `list reviews where hidden==false` → `["clean","pii"]`.
- لذلك **إضافة `hasNoPublicPII` إلى `reviews.list` بلا أثر** — وقد أُرجعت بالكامل.
  الخطر لو نُشرت: شرط PII في `list` قد يرفض الاستعلام كله (كل التعليقات تختفي).
- **الضمانة الفعلية** = منع الكتابة/التحديث الحامل لهوية + `privacyRepair` + `get` محجوب.
  لا يُوصف الترشيح عبر `list` كضمانة.
- `e2e/legacy-privacy-audit.mjs` كان يفشل بفحصين يطلبان سلوكًا **مستحيلًا**؛ صار يسجّل قيد `list`
  كـ`INFO` ويضيف فحصَي منع كتابة حقيقيين → **10/10 PASS**، ومربوط بـCI عبر `npm run test:legacy-privacy`.
  **الدرس**: سكربت تدقيق غير مربوط بـ`package.json` + CI = فشل صامت يمرّ بلا ملاحظة.
- `LoginNova.css`: قيم hex مكرّرة حرفياً صارت متغيّرات — `#000000` → `--rz-black`،
  `#8F6C52` → `--rz-navy-deep`، `#D8B98A` → `--rz-champagne` (القيم مطابقة حرفياً في `theme.css` ⇒ 0 فرق بصري).

## المساعد الذكي «فهد» — المعمارية والسلوك (PR #44) — 2026-11-20
- الملفات: الخادم `functions/api/ai.js` (Cloudflare Function على `/api/ai`)، والواجهات
  `src/components/RoyalHome/AIChatWidget.jsx` (النافذة الرئيسية) و`src/components/AIChat.jsx` (مسار `/ai-chat`).
- النموذج: `openai/gpt-oss-120b` عبر Groq. **نموذج استدلالي**: بلا `max_completion_tokens`
  قد يستهلك الميزانية كلها في الاستدلال ويعيد `content` فارغاً → 502 → رد احتياطي.
  السقف `max_completion_tokens: 2048` موجود — **لا تحذفه**.
- **قاعدة التحية**: تُردّ **فقط** إذا بدأ المستخدم رسالته بتحية. الفرض على طبقتين:
  (1) الموجّه يأمر بذلك صراحةً، (2) حاجز حتمي `stripUnsolicitedGreeting()` يزيل أي تحية
  افتتاحية إن لم يسلّم المستخدم. **لا تعتمد على النموذج وحده.**
- **الإجابة على كل شيء**: الموجّه يأمر بالإجابة على أي سؤال (علم/معرفة/حياة) بلا استثناء.
  لا تُعِد كلمة «تقريباً» أو «ما أعرف» إلى الموجّه، ولا تجعل الردود الاحتياطية مراوغة.
- تصنيف الجنس: قائمتا `femaleNames`/`maleNames` تُفحَص الأنثى أولاً، فلا يجوز أن يوجد اسم
  في القائمتين معاً (كان `'ماجد'` كذلك فيُخاطَب الرجل بصيغة أنثى).
- **الفرض خادمي**: `checkAiRateLimit` يفشل مغلقاً (fail-closed) — إن غاب ربط D1 (`DB`)
  تُرفض كل الطلبات. ربط D1 في `wrangler.toml` تحت `[env.production.d1_databases]`.
- اختبارات: `functions/api/ai.test.js` + `src/components/AIChat.test.jsx` +
  `src/components/RoyalHome/AIChatWidget.test.jsx`. تستبدل نداء Groq وطبقة D1 فقط،
  وتختبر منطق `onRequest` الحقيقي.

## جولة تنظيف الفروع + تحقق الإنتاج الستة — 2026-11-20
**`main` = `661644a` (PR #44 مدموج) · الإنتاج `almusaymir.pages.dev` مطابق.**

### دمج #55 ثم #44 (كلاهما squash)
- **#55 `fix/legacy-privacy-proof` → `74fb5e8`**: تدقيق خصوصية قديمة في CI
  (`.github/workflows/ci.yml` + `e2e/legacy-privacy-audit.mjs` + سكربت `package.json`).
- **#44 `fix/ai-assistant-fahd` → `661644a`**: `functions/api/ai.js` + `AIChat`/`AIChatWidget`.
- **حل تعارض `AGENTS.md` المتكرر**: `git checkout --ours AGENTS.md` (نسخة `main` كاملة)
  ثم `cat >> AGENTS.md` بقسم الـPR وحده. لا دمج نصي يدوي — يُنتج تكراراً وأقساماً مبتورة.
- **درس squash + إعادة الدفع**: بعد rebase قد يكون الفرع البعيد أُنزل (`reset`) فأُعيد رفعه؛
  `--force-with-lease` يرفض بـ"stale info" لأن مرجع التتبع المحلي قديم. الحل: `git fetch origin`
  ثم rebase على الرأس الحقيقي، ثم دفع fast-forward عادي.

### حالة الفروع بعد التنظيف (لا تُعِد فحص القديم)
- **بقى على البعيد**: `main` + `fix/reviews-privacy` فقط (PR #24 مغلق، فرعه محفوظ عمداً).
- **حُذف 11 فرعاً مدموجاً**: #44 #45 #46 #47 #48 #49 #50 #51 #52 #55 #57.
- **حذف مراجع التتبع المحلية**: `remote.origin.fetch` في هذا المستودع **يحصر `main` فقط**
  (`+refs/heads/main:refs/remotes/origin/main`) ⇒ `git remote prune origin` لا يحذف شيئاً
  ويعطي نجاحاً كاذباً. احذفها بـ`git branch -dr origin/<name>` بعد التأكد من `git ls-remote --heads origin`.
- **إثبات الأهلية للحذف**: لكل فرع `gh pr list --head <b> --state all` ⇒ MERGED،
  ثم `git merge-base --is-ancestor <mergeCommit> origin/main` ⇒ IN-MAIN. لا تحذف بلا الاثنين.
- **`git cherry` و`merge-tree` غير صالحين هنا**: squash يُنتج بصة مختلفة لكل التزام،
  فالفرع «يضيف محتوى» وهمياً لأنه **متأخر** عن `main` لا لأنه يحمل جديداً.

### البنود الستة — تحقق إنتاجي فعلي (لا اختبار محلي فقط)
1. **الترويسة**: في `prod` CSS — `.rz-icon-btn{width:34px}` للجوال، و`44px` **داخل**
   `@media(min-width:901px)` فقط (كان بلا استعلام فيُلغي مقاسات الجوال ويدفع الأيقونة الرابعة خارج 320px).
2. **نص الدخول**: مقيس على `prod` عند 390px — الاسم `rgb(0,0,0)` وزن 900، والعبارات الست
   موجودة حرفياً، ولا «المالك الرئيسي» ولا «®».
3. **مسودة الصورة**: `rooz_img_draft:` موجود في `index-*.js` على `prod` (sessionStorage لا localStorage).
4. **أرقام «نظرة عامة»**: «المحظورون»/«الإعلانات النشطة» موجودة في `prod`، و`OwnerPrivateRoom.overview.test.jsx` 10/10.
5. **الصلاحيات**: `GRANTABLE_PERMISSION_KEYS` (39/61) في `main`، و`access.test.js` 11/11 + `logic.test.js` 17/17.
6. **رمز واحد للجلسة**: `rooz_owner_gate_ok` في `prod` — البوابة لا تُطلب كل تنقل.

### درس قياس الإنتاج
- **الجذر `/` محمي** ⇒ Playwright على `/` يهبط على `/login`، و`.rz-header` **غير موجود**.
  لا تفسّر `found:false` كخطأ في الترويسة. تحقق من CSS المُصدَّر (`assets/index-*.css`) بدلاً من DOM.
- **الملفات مقسّمة (lazy chunks)**: نص مثل `rooz_img_draft` قد يكون في `index-*.js` لا في
  `AdFormPage-*.js`. ابحث في الـchunk الرئيسي أولاً قبل الحكم بالغياب.
- أسماء المكوّنات تُمحى (minified) ⇒ **لا تبحث بأسماء دوال** (`goToTab`, `isBannedUser`)؛
  ابحث بالنصوص العربية أو بمفاتيح التخزين.
- `npx playwright install chromium` مطلوب؛ و`waitUntil:'networkidle'` **يتجاوز المهلة** على
  هذا الموقع (Firebase يبقي اتصالات) ⇒ استخدم `domcontentloaded` + `waitForTimeout(4000)`.

### البوابات (محلي، `661644a`)
`npm run lint` = 0 · `npx vitest run` = **54 ملفاً/364 اختباراً** · `npm run build` ✓ ·
CI على `661644a` = `44803355621` **success** (6/6).

## تسمية «rooz» → «alm» — فحص وتنفيذ آمن فقط (2026-11-20)
**القاعدة الحاكمة**: لا تُعِد تسمية أي **مفتاح تخزين** (`localStorage`/`sessionStorage`)
ولا أي **عقد خارجي**. إعادة تسمية مفتاح = فقدان بيانات المستخدمين القائمة فوراً.

### أ) آمن — أُعيد تسميته (تجميلي داخلي، بلا حالة محفوظة)
| النوع | قبل | بعد |
|---|---|---|
| ملفات CSS | `rooz-royal/pearl/luxury-3d/site-backdrop.css` | `alm-*.css` |
| أصناف DOM | `rooz-has-nav`, `rooz-guest-mode`, `rooz-app-main`, `rooz-page-content`, `rooz-badge*`, `rooz-boot*`, `rooz-escrow/auction/size-matcher/verified-badge`, `rooz-users-*`, `rooz-register-animation` | `alm-*` |
| متغيرات CSS | `--rooz-top-offset`, `--rooz-scroll-distance`, `--rooz-glow`, `--rooz-header-h` | `--alm-*` |
| keyframes | `roozFadeIn/Slide/Badge*/GradientFlow/IconSparkle/TextScrollReverse/Crown3D/Star3D/UsersSpin/RegisterSpin` | `alm*` |
| خطاف تنقّل | `window.__ROOZ_NAV__` | `window.__ALM_NAV__` |
| history state | `{ roozOwnerRoom: true }` | `{ almOwnerRoom: true }` |

**لماذا آمنة**: لا شيء منها يُقرأ من تخزين دائم، ولا يُخزَّن كقيمة، ولا يُستهلك خارج الشجرة
(`e2e/`, `scripts/`, `functions/`, `public/`, CI = **0 مرجع**). تُعاد كتابتها مع كل تحميل.

### ب) خطِر — لم يُمسّ (مفاتيح تخزين تحمل حالة مستخدمين)
`rooz_owner_gate_ok` · `rooz_kick_log` · `rooz_manual_signout` · `rooz_visit_notified`
· `rooz_owner_dark` · `rooz_owner_banner` · `rooz_intrusion_<path>` · `rooz_img_draft:`
· `rooz-site-prefs` · `rooz-site-notifications`

**السبب**: تغيير المفتاح = قراءة فاشلة للبيانات القديمة ⇒ (أ) تفضيلات المستخدم (خط/تباين/صوت)
تُصفَّر، (ب) إشعار «زائر جديد» يُرسل مرة ثانية لكل مستخدم، (ج) سجل التشخيص والطرد يُفقد،
(د) مسودة الصورة تُفقد، (هـ) إعداد الوضع الداكن في غرفة المالك يُفقد.
**لو أراد المالك الترحيل**: اقرأ المفتاح القديم مرة، اكتب الجديد، احذف القديم — في نفس الإصدار.
لا تحذف القديم قبل نشر القارئ الجديد.

### بوابة التحقق بعد إعادة التسمية
`npm run lint`=0 · `npx vitest run`=**54/364** · `npm run build` ✓ ·
**مقارنة بكسل مقابل الإنتاج: 0 بكسلات مختلفة عند 320 و390** (لا انحدار بصري) ·
`__ALM_NAV__` موجود و`__ROOZ_NAV__` غائب محلياً.

## جولة «موبايل + سرعة» (2026-11-21) — PR #58
**النطاق**: UX للجوال + بنود PageSpeed. **بلا** ترحيل بيانات، **بلا** نشر قواعد Firebase،
**بلا** مساس بـprivacy/publicSafe، وبلا تغيير أي مسار أو صلاحية أو سياسة دخول.

### 1) الحزمة الأولى (أكبر مكسب)
- `src/App.jsx`: 15 صفحة/مكوّن كان **استيراداً ثابتاً** صار `safeLazy`
  (`OwnerPrivateRoom` 126KB · `AdminDashboard` 31KB · `AdFormPage` · `ComplaintsPage` ·
  `SettingsPage` · `ContentManager` · `UsersList` · `OwnerPanel` · `Register` ·
  `ForgotPassword` · `OTPPage` · `MemberInbox` · `NotificationPanel` · `FAQ` ·
  `AIChatWidget` · `WhatsAppFloat`) + `Suspense` حول عناصر الواجهة العائمة.
- **النتيجة المقيسة**: حزمة الدخول `index.js` **430KB → 130KB خام** (110 → 37KB gzip).
  إجمالي JS أول تحميل **446KB → 371KB gzip**.
- `src/firebase/config.js`: `firebase/storage` صار `import()` عند أول استخدام
  (`getStorageInstance`)، و`src/firebase/storage.js` يحلّه بـ`await resolveStorage()`.
  **لا يزال** firebase-vendor يحوي storage لأن `manualChunks` يجمع كل firebase في حزمة
  واحدة؛ فصلها إلى `firebase-storage` لم يُنقص شيئاً (Vite يُصدر لها `modulepreload`)
  ⇒ **أُعيد manualChunks كما كان**. لا تُعِد المحاولة بلا قياس.
- **حدّ معروف**: Firestore في المسار الحرج (يمنع خفضاً أكبر ~90KB gzip) لأن
  `config.js` يُصدّر `db` جاهزاً و30+ وحدة تستورده. تحويله إلى lazy = إعادة كتابة عريضة
  تمسّ الدخول ⇒ **مؤجّل بقرار**.

### 2) الخطوط (render-blocking)
- خط Tajawal **محلي**: `public/fonts/*.woff2` (12 ملفاً، 111.5KB) + 12 `@font-face`
  مُدرجة داخل `index.html` عبر `scripts/inline-fonts.mjs` (بلا طلب CSS خارجي).
- `preload` لوزنين فقط (900 عربي/لاتيني = وزن اسم العلامة على أول شاشة).
- حُذف `preconnect`/`stylesheet` لـ`fonts.googleapis.com` و`fonts.gstatic.com`،
  و**ضُيّق CSP** في `public/_headers`: `style-src 'self' 'unsafe-inline'` و`font-src 'self'`.
- `public/_headers`: `/fonts/*` → `max-age=31536000, immutable`.

### 3) الصور
- `scripts/optimize-images.mjs` (sharp): AVIF للشعارين + ضغط palette للأيقونات.
  `logo 47.5→22.9KB` · `wide 13.7→10.2KB` · `apple-touch-icon 34.2→10.0KB` ·
  `favicon-96x96 10.5→3.9KB` · `emblem 39.4→36.0KB`.
- `<picture>` + `<source type="image/avif">` + PNG fallback في `Login.jsx` ·
  `RoyalHeader.jsx` · `NovHomePage.jsx`، و`preload as="image" type="image/avif"`
  بـ`fetchpriority="high"` للشعار (عنصر LCP).
- **رقم إصدار `?v=3`** على أصول العلامة (لأن `/assets/*` صار immutable سنة):
  في `src/data/brand.js` + `index.html` + `src/utils/watermark.js`.
  **عند تغيير أي صورة: ارفع الرقم في المواضع الثلاثة وإلا بقي القديم في الكاش.**

### 4) CSS
- نُقلت `home-slim.css` → `NovHomePage.jsx`، `info-pages.css` → الصفحات الثلاث،
  `console-shell.css` → `AdminRoom.jsx` (كانت في `main.jsx` فتُحمَّل لكل زيارة).
- حُذفت **35 قاعدة ميتة** (29 صنفاً غير مذكور في أي JSX/HTML) من `alm-royal.css`:
  `.rz-btn*` · `.rz-card` · `.rz-glass` · `.rz-footer-{top,logo,tag,cols,col}` ·
  `.rz-discover*` · `.nov-tile*` · `.nv-btn` · `.btn-royal/glass` ⇒ 33.9KB → 28.8KB.
  **مُتحقَّق بالبكسل**: `/login` عند 320 **مطابق تماماً**، وعند 390 فرق 12 بايت (3 بكسل AA).

### 5) الترويسة على الجوال — صف واحد
- **عطب حقيقي أُصلح**: `@media (max-width: 720px)` كان يضع `.rz-logo img{height:38px}`
  و`.rz-topbar-inner{padding:8px 12px}` **بعد** قواعد 480px/400px في الملف، فتغلبها
  بنفس الأولوية ⇒ على 320px الشعار 38px والحشو 8px (والقصد 24px/4px).
  الحل: تلك القاعدتان في `@media (min-width:481px) and (max-width:720px)`.
  محروس بـ`src/styles/mobileHeaderCascade.test.js` (3 اختبارات تقرأ CSS).
- `@media (max-width:560px)`: شريط التنقل **صف واحد** (كان شبكة 3 أعمدة على سطرين):
  `.rz-burger` ثابت + `<nav>` بتمرير أفقي (`overflow-x:auto`, `scrollbar-width:none`,
  `scroll-snap`) + `mask-image` تلاشٍ 7px على الحافة (دلالة بلا قصّ حادّ) +
  `.rz-subbar-tools` (الوضع الليلي/اللغة) في الطرف. **لا تمرير أفقي للصفحة** (0).
- `.rz-burger`/`.rz-nav-link` ارتفاع 32–40px بلا تضخيم بصري (أمر المالك: أزرار أصغر).
- **البحث**: `RoyalHeader.jsx` يستخدم `matchMedia('(max-width:480px)')` فيبدّل النص
  إلى `ابحث…` بدل قطع `ابحث عن أي منتج أو قسم…` (نص المالك المخصّص لا يُلمس).
- **وضع المالك**: `Editable` صار يقبل `withControls={false}`، وروابط التنقل تستخدمه ⇒
  لا أزرار تعديل/حذف داخل الصف إطلاقاً (التعديل من «مدير المحتوى»). محروس باختبار
  في `RoyalHeader.test.jsx` (يفشل فعلاً إن أُعيد `withControls={true}`).

### 6) أدوات القياس داخل المشروع
- `npm run speed:help` → روابط PSI/GTmetrix/WebPageTest + فحص سريع للترويسات والخطوط.
- `npm run speed:audit` → Playwright: iPhone 390×844 · 4G (1.6Mbps/150ms) · CPU×4،
  يقرأ FCP/LCP/CLS/TBT + أحجام JS/CSS/خطوط/صور. `BASE_URL=` للإنتاج، `ROUTES=` لمسارات،
  `NO_THROTTLE=1` بلا خنق. **يسقط تلقائياً إلى `/usr/bin/chromium`** إن لم تُثبَّت حزم Playwright.
- `npm run analyze` (موجود) · `npm run fonts` · `npm run images`.

### 7) قياس قبل/بعد (نفس الأداة، /login، 390px، 4G+CPU×4)
| | FCP | LCP | CLS | TBT | JS |
|---|---|---|---|---|---|
| الإنتاج القديم | 1.60s | **4.31s** | 0.007 | 290ms | 419KB |
| البناء الجديد (محلي) | **1.08s** | **2.98s** | 0.005 | **154ms** | **342KB** |
> المقارنة ليست مثالية (محلي بلا RTT للـCDN)؛ القياس الحقيقي بعد النشر بـ`BASE_URL=https://almusaymir.pages.dev`.

### 8) البوابات
`npm run lint`=0 · `npx vitest run`=**55 ملفاً/368 اختباراً** · `npm run build` ✓ ·
`npm run contrast` (BASE_URL=preview) = **1054 عنصراً/0 مخالفة/PASS** (نفس 5 suspects الكاذبة) ·
smoke على 13 مساراً: **0 أخطاء runtime**، 0 تجاوز أفقي، والمحميّة تُحوّل لـ`/login`.

### 9) دروس
- **ترتيب كتل `@media` في نفس الملف يحسم النزاع**: قاعدة عامة لاحقة تلغي قاعدة أضيق سابقة.
  عند إضافة استعلام أعرض، **قيّده بحدّ أدنى** أو ضعه قبل الأضيق.
- **Playwright غير مثبَّت هنا**: `npx playwright install` غير متاح ⇒ استخدم
  `executablePath:'/usr/bin/chromium'` (الأداة تفعلها تلقائياً).
- **`page.screenshot()` الكامل مع `backdrop-filter`+`sticky` يعطي لقطة خاطئة** للترويسة
  (تبدو فاتحة). القصّ (`clip`) أو قياس `getComputedStyle` هو الحكم، لا اللقطة الكاملة.
- `/login` وحدها لا تكفي لفحص الترويسة (لا تُعرض قبل المصادقة، وجلسة الزائر تحتاج Firestore
  حقيقياً) ⇒ استخدم harness مؤقتاً (Vite + `RoyalHeader` بـprops وهمية) ثم **احذفه**.
