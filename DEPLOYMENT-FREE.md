# إعداد النشر المجاني — المسيمير | ALMUSAYMIR

## متغيرات Cloudflare Pages → Production Variables

انسخ القيم الحالية من قسم `[env.production.vars]` في `wrangler.toml`.

المتغيرات العامة المطلوبة:

```text
OWNER_EMAILS=f882771f@gmail.com,kal6667222@gmail.com
VITE_FIREBASE_API_KEY=<قيمة Firebase العامة>
VITE_FIREBASE_AUTH_DOMAIN=anaqa-chic-4e437.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=anaqa-chic-4e437
VITE_FIREBASE_MESSAGING_SENDER_ID=173599362251
VITE_FIREBASE_APP_ID=<قيمة Firebase العامة>
VITE_FIREBASE_MEASUREMENT_ID=G-NDLJXV8KD8
VITE_OWNER_EMAILS=f882771f@gmail.com,kal6667222@gmail.com
VITE_ADMIN_EMAILS=f882771f@gmail.com,kal6667222@gmail.com
VITE_OWNER_SOUND_URL=/sounds/welcome.mp3
VITE_RIBBON_DURATION_SECONDS=60
VITE_SOUND_DURATION_SECONDS=45
VITE_THROTTLE_WINDOW_SECONDS=120
VITE_AI_NAME=فهد
VITE_AI_GREETING=ياهلا نورت المسيمير | ALMUSAYMIR
VITE_STORE_NAME=المسيمير | ALMUSAYMIR
VITE_STORE_DESCRIPTION=متجر شامل وحراج إعلانات موثوق في السعودية
VITE_SHIPPING_FEE=20
VITE_FREE_SHIPPING_MIN=500
VITE_RETURN_POLICY_DAYS=7
OTP_ENFORCED=true
OTP_FROM_EMAIL=onboarding@resend.dev
STORE_NAME=المسيمير | ALMUSAYMIR
STORE_DESCRIPTION=متجر شامل وحراج إعلانات موثوق في السعودية
STORE_POLICY=الاستبدال خلال 7 أيام – الشحن لجميع مناطق المملكة
STORE_WORKING_HOURS=من 10 صباحًا إلى 11 مساءً
VITE_PHONE_1=966536667222
VITE_PHONE_2=966507882771
VITE_PHONE_1_DISPLAY=00966536667222
VITE_PHONE_2_DISPLAY=00966507882771
VITE_CONTACT_WHATSAPP_1=966536667222
VITE_CONTACT_WHATSAPP_2=966507882771
VITE_CONTACT_EMAIL=kal6667222@gmail.com
VITE_SNAPCHAT_URL=https://snapchat.com/t/HPkkIfUp
VITE_SNAPCHAT_USERNAME=pmp.u
VITE_BANK_RAJHI_NAME=بنك الراجحي
VITE_BANK_RAJHI_IBAN=SA0980000509608010069017
VITE_BANK_RAJHI_ACCOUNT=09608010069017
VITE_BANK_ARABI_NAME=البنك العربي
VITE_BANK_ARABI_IBAN=SA9830400108088851870011
VITE_BANK_ARABI_ACCOUNT=0108088851870011
```

لا تضف `VITE_FIREBASE_STORAGE_BUCKET` للمسار المجاني الحالي؛ الصور تُضغط في
المتصفح وتُحفظ كبيانات محدودة الحجم في Firestore. لا تضف بطاقة.

## Secrets في Cloudflare Pages

هذه القيم لا تُكتب في Git ولا في `wrangler.toml`:

```text
GROQ_API_KEY=<مفتاح Groq الخاص بك، إن أردت تشغيل المساعد>
RESEND_API_KEY=<مفتاح Resend الخاص بك، إن أردت OTP بالبريد>
FIREBASE_WEB_API_KEY=<اختياري؛ يمكنه استخدام VITE_FIREBASE_API_KEY>
```

لا يوجد `VITE_OWNER_SECRET_CODE`. رمز المالك يُنشأ ويُخزّن مجزّأً في D1
من خلال `/api/owner-pin`.

## Bindings

أضف D1 باسم المتغير `DB` إلى قاعدة `chic_users`، كما هو مذكور في
`wrangler.toml`.

## Firebase

- انشر `firestore.rules` كاملًا.
- انشر `storage.rules` فقط للمسار المستقبلي؛ المسار الحالي للصور لا يعتمد على
  Firebase Storage.
- تأكد من تفعيل Email/Password وGoogle في Firebase Authentication.

## الشعار

الأصول الحالية المستخدمة هي:

```text
public/assets/logo-almusaymir.png
public/assets/logo-almusaymir-wide.png
public/assets/emblem.png
public/favicon.png
public/favicon.ico
public/apple-touch-icon.png
public/icons/icon-72x72.png
public/icons/icon-96x96.png
public/icons/icon-192x192.png
public/icons/icon-512x512.png
```

الصورة المرفقة الجديدة بصيغة JPEG وبخلفية بيضاء؛ ليست شفافة. لا تستبدل بها
الأصول الحالية مباشرة. للحصول على شعار احترافي بلا خلفية، جهّز نسخ PNG شفافة:
نسخة كاملة، نسخة أفقية، ورمز منفصل، ثم استبدل الملفات السابقة مع الحفاظ على
أسمائها وأبعادها المناسبة.
