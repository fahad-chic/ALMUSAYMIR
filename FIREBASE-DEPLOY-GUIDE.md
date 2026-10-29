# طريقة ربط قواعد Firebase بعد إضافة الملفات

## 1) فك ضغط الحزمة

ضع الملفات في جذر مشروع GitHub، بجانب `package.json`:

```text
firestore.rules
firestore.indexes.json
firebase.json
```

لا تضعها داخل `src`.

## 2) تثبيت Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

سجّل الدخول بالحساب الذي يملك مشروع Firebase الصحيح.

## 3) اختيار المشروع

من جذر المشروع شغّل:

```bash
firebase use --add
```

ثم اختر مشروع Firebase المرتبط بالموقع، وتأكد من أن المعرّف هو نفسه الموجود في:

```text
VITE_FIREBASE_PROJECT_ID
```

## 4) فحص القواعد قبل النشر

```bash
firebase firestore:rules:release
```

إذا كان هذا الأمر غير متاح في نسخة CLI لديك، استخدم النشر المباشر في الخطوة التالية.

## 5) نشر القواعد والفهارس

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

ولنشر قواعد Storage أيضًا:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## 6) التحقق

بعد النشر:

```bash
firebase projects:list
firebase use
```

ثم اختبر:

- قراءة الإعلان.
- إرسال الرسالة العامة داخل الإعلان.
- قراءة الرسائل الخاصة.
- المفضلة.
- صلاحيات غرفة المالك.
- حذف رسالة عامة من المالك.

## مهم

- لا تستبدل `firestore.rules` القديم إلا بعد حفظ نسخة احتياطية.
- لا تنشر القواعد من مشروع Firebase خاطئ.
- لا ترسل كلمات المرور أو مفاتيح Firebase أو Cloudflare.
- الرسائل العامة لا تعمل فعليًا إلا بعد نشر `firestore.rules`.
- ملف `firebase.json` يحدد أماكن القواعد والفهارس، لذلك يجب وضعه في جذر المشروع.
