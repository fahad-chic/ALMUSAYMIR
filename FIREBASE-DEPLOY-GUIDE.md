# نشر فهارس Firestore (يدوي وبعد مراجعة المالك)

ابدأ دائمًا من جذر نسخة Git التي راجعتها، وعلى الفرع الذي يحمل التغيير المطلوب. لا تشغّل Firebase CLI من `~` أو من نسخة أقدم للمشروع؛ Firebase CLI يقرأ `firebase.json` من دليل العمل، وهذا الإعداد يشير إلى `firestore.indexes.json` بجواره.

من جذر المستودع شغّل الفحص دون نشر:

```bash
node scripts/preflight-indexes.mjs --expect-branch fix/firestore-index-preflight
npm run test:indexes
```

ولمقارنة الإنتاج قراءةً فقط:

```bash
npx firebase-tools firestore:indexes --project anaqa-chic-4e437 > /tmp/prod-indexes.json
node scripts/compare-indexes.mjs firestore.indexes.json /tmp/prod-indexes.json
```

راجع نتيجة المقارنة قبل أي نشر. `preflight` و`compare` لا تنشران ولا تحذفان شيئًا. إذا أظهر التقرير فهارس إنتاجية غير موجودة بالملف أو اختلافات `fieldOverrides`، أوقف النشر وراجعها مع المالك.

**أمر النشر المقترح للمراجعة فقط — لا تشغّله قبل مراجعة الفروع ونتيجة المقارنة وموافقة المالك:**

```bash
firebase deploy --only firestore:indexes --project anaqa-chic-4e437
```

لا يُستخدم `--force`؛ لا ينشر هذا الأمر قواعد Firestore أو التطبيق.
