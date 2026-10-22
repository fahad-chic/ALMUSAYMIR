# المسيمير | ALMUSAYMIR

تصميم **Obsidian × Copper** مع الربط الكامل لـ Firebase و Cloudflare Functions.

## المتطلبات
- Node 22 (انظر `.nvmrc`)
- متغيرات البيئة من `.env.example`

## التشغيل
```bash
npm install
npm run dev
```

## البناء
```bash
npm run build
```

## الاختبار
```bash
npm test
```

## Cloudflare Pages
- Build: `npm run build`
- Output: `dist`
- Variables: `VITE_FIREBASE_*`, `VITE_OWNER_EMAILS`, …

## Functions (API)
- `/api/otp/send` · `/api/otp/verify`
- `/api/owner-pin`
- `/api/ai`
- `/api/broadcast`

## الهوية
- Obsidian `#0b0a09`
- Copper `#c47a3a` / `#e8a35c`
- Ivory `#faf6f0`
