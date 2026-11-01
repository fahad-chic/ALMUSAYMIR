// functions/api/auth-events.js — أحداث المصادقة (محاولات دخول + سجل عناوين IP)
//
// سبب وجوده: محاولات الدخول الفاشلة وعناوين IP لا يمكن تسجيلها بأمان من
// المتصفح — أي كود عميل يستطيع تزويرها. لذلك تُسجَّل هنا على الخادم (Cloudflare
// Pages Functions) حيث يُقرأ عنوان IP الحقيقي من ترويسة cf-connecting-ip ولا
// يستطيع العميل تزويره. التخزين في D1 (نفس نمط otp/verify وai.js).
//
// العمليات:
//   POST /api/auth-events { action: 'login_failed', email, reason }
//        → يسجّل محاولة دخول فاشلة + IP الحقيقي. لا يتطلب مصادقة (تحدث قبل الدخول).
//   POST /api/auth-events { action: 'login_success' }  (بـ Authorization)
//        → يسجّل نجاح دخول + يحدّث سجل IP لهذا الحساب.
//   GET  /api/auth-events?type=failed_logins|ip_history&email=&limit=  (بـ Authorization)
//        → قراءة للمالك فقط (يُتحقق من Firebase ID Token + قائمة المالك).
//
// ملاحظة أمنية: القراءة محصورة بالمالك عبر التحقق الخادمي من الرمز — لا يمكن
// تجاوزها من المتصفح. الكتابة لا تمنح أي قدرة، لكن نحدّ حجم المدخلات وطولها.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store",
    },
  });
}

async function readJsonSafe(request) {
  try {
    const data = await request.json();
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

// عنوان IP الحقيقي كما يراه Cloudflare — غير قابل للتزوير من العميل.
function getClientIp(request) {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim().slice(0, 64);
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim().slice(0, 64);
  return "unknown";
}

const isValidEmail = (email) =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

// يتحقق من Firebase ID Token عبر REST ويعيد البريد والمعرّف.
// ownerOnly=true → يقبل حسابات المالك المعتمدة فقط (للقراءة).
// ownerOnly=false → يقبل أي حساب موثّق (لتسجيل سجل IP الخاص بصاحبه).
async function verifyToken(request, env, { ownerOnly = true } = {}) {
  const authHeader = request.headers.get("Authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!idToken || idToken.length < 20 || idToken.length > 8192) {
    return { ok: false, status: 401, error: "رمز الهوية مفقود أو غير صالح" };
  }
  const apiKey = String(env.FIREBASE_WEB_API_KEY || env.VITE_FIREBASE_API_KEY || "").trim();
  if (!apiKey) return { ok: false, status: 500, error: "إعداد الخادم ناقص" };

  let res;
  try {
    res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
  } catch {
    return { ok: false, status: 502, error: "تعذر التحقق من جلسة Firebase" };
  }
  const data = await res.json().catch(() => ({}));
  const account = data?.users?.[0] || {};
  const email = String(account.email || "").trim().toLowerCase();
  const uid = String(account.localId || "").trim();
  if (!res.ok || !email || !uid) return { ok: false, status: 401, error: "جلسة غير صالحة" };

  const ownerEmails = String(env.OWNER_EMAILS || env.VITE_OWNER_EMAILS || "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const isOwner = ownerEmails.includes(email);

  if (ownerOnly && !isOwner) {
    return { ok: false, status: 403, error: "هذا الحساب ليس حساب صاحب الموقع" };
  }
  return { ok: true, email, uid, isOwner, idToken };
}

// يتحقق من أن الحساب يملك صلاحية مجهرة فعلاً في rbac/{uid} — بقراءة الوثيقة
// من Firestore REST برمز المستخدم نفسه (فتُطبَّق قواعد الأمان: صاحب الوثيقة
// يقرأ وثيقته). هذا تحقّق خادمي حقيقي لا يعتمد على أي إدخال من العميل.
async function userHasGrant(env, idToken, uid, key) {
  const projectId = String(
    env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || ""
  ).trim();
  const apiKey = String(env.FIREBASE_WEB_API_KEY || env.VITE_FIREBASE_API_KEY || "").trim();
  if (!projectId || !apiKey || !uid) return false;
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
        `/databases/(default)/documents/rbac/${encodeURIComponent(uid)}?key=${encodeURIComponent(apiKey)}`,
      { headers: { Authorization: `Bearer ${idToken}` } }
    );
    if (!res.ok) return false;
    const doc = await res.json().catch(() => null);
    const fields = doc?.fields || {};
    if (fields?.suspended?.booleanValue === true) return false;
    const grants = fields?.grants?.mapValue?.fields || {};
    return (
      grants?.[key]?.booleanValue === true ||
      grants?.SUPER_ADMIN_FULL_ACCESS?.booleanValue === true
    );
  } catch {
    return false;
  }
}

async function ensureTables(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS failed_logins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      ip TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    )`
  ).run();
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS ip_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      ip TEXT NOT NULL,
      user_agent TEXT NOT NULL DEFAULT '',
      event TEXT NOT NULL DEFAULT 'login',
      created_at INTEGER NOT NULL
    )`
  ).run();
  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_failed_logins_email ON failed_logins(email, created_at)`
  ).run();
  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_ip_history_email ON ip_history(email, created_at)`
  ).run();
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!env || !env.DB) {
    return json({ success: false, error: "قاعدة البيانات غير متاحة" }, 500);
  }

  try {
    await ensureTables(env.DB);
  } catch {
    return json({ success: false, error: "تعذر تهيئة السجلات" }, 500);
  }

  // ——— قراءة ———
  if (request.method === "GET") {
    const identity = await verifyToken(request, env, { ownerOnly: false });
    if (!identity.ok) return json({ success: false, error: identity.error }, identity.status);

    const url = new URL(request.url);
    const type = String(url.searchParams.get("type") || "failed_logins");
    const email = String(url.searchParams.get("email") || "").trim().toLowerCase();
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));

    if (type === "ip_history") {
      // المالك، أو من يملك صلاحية VIEW_USER_IP_HISTORY فعلاً (تُقرأ من rbac
      // خادمياً — تحقّق حقيقي لا يعتمد على العميل).
      const allowed =
        identity.isOwner ||
        (await userHasGrant(env, identity.idToken, identity.uid, "VIEW_USER_IP_HISTORY"));
      if (!allowed) {
        return json({ success: false, error: "لا تملك صلاحية سجل عناوين IP" }, 403);
      }
      const rows = email
        ? await env.DB.prepare(
            `SELECT email, ip, user_agent, event, created_at FROM ip_history
             WHERE email = ?1 ORDER BY created_at DESC LIMIT ?2`
          ).bind(email, limit).all()
        : await env.DB.prepare(
            `SELECT email, ip, user_agent, event, created_at FROM ip_history
             ORDER BY created_at DESC LIMIT ?1`
          ).bind(limit).all();
      return json({ success: true, type, items: rows.results || [] });
    }

    // محاولات الدخول الفاشلة: للمالك فقط (TRACK_FAILED_LOGINS صلاحية مالك-فقط).
    if (!identity.isOwner) {
      return json({ success: false, error: "هذه البيانات لصاحب الموقع فقط" }, 403);
    }
    const rows = email
      ? await env.DB.prepare(
          `SELECT email, ip, reason, created_at FROM failed_logins
           WHERE email = ?1 ORDER BY created_at DESC LIMIT ?2`
        ).bind(email, limit).all()
      : await env.DB.prepare(
          `SELECT email, ip, reason, created_at FROM failed_logins
           ORDER BY created_at DESC LIMIT ?1`
        ).bind(limit).all();
    return json({ success: true, type: "failed_logins", items: rows.results || [] });
  }

  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  // ——— كتابة ———
  const body = await readJsonSafe(request);
  const action = String(body.action || "").trim();
  const ip = getClientIp(request);
  const now = Math.floor(Date.now() / 1000);
  const userAgent = String(request.headers.get("user-agent") || "").slice(0, 300);

  if (action === "login_failed") {
    const email = String(body.email || "").trim().toLowerCase();
    const reason = String(body.reason || "").slice(0, 200);
    if (!isValidEmail(email)) {
      return json({ success: false, error: "بريد غير صالح" }, 400);
    }
    await env.DB.prepare(
      `INSERT INTO failed_logins (email, ip, reason, created_at) VALUES (?1, ?2, ?3, ?4)`
    ).bind(email, ip, reason, now).run();
    return json({ success: true });
  }

  if (action === "login_success") {
    // أي عضو موثّق يسجّل سجل IP الخاص به فقط (يُشتق بريده من الرمز، لا من
    // الطلب) — فلا يستطيع تلويث سجل غيره. القراءة تبقى للمالك فقط.
    const identity = await verifyToken(request, env, { ownerOnly: false });
    if (!identity.ok) return json({ success: false, error: identity.error }, identity.status);
    await env.DB.prepare(
      `INSERT INTO ip_history (email, ip, user_agent, event, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    ).bind(identity.email, ip, userAgent, "login", now).run();
    return json({ success: true });
  }

  return json({ success: false, error: "إجراء غير معروف" }, 400);
}
