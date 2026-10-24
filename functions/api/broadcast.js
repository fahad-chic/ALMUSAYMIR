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
    },
  });
}

async function readJsonSafe(request) {
  try {
    const data = await request.json();
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

// تحقق خادمي من هوية صاحب الموقع عبر Firebase ID Token
// (تمنع كتابة أي بث من غير المالك — بينما تبقى القراءة عامة)
async function verifyOwnerToken(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) return { ok: false, status: 401 };
  const apiKey = env.FIREBASE_WEB_API_KEY || env.VITE_FIREBASE_API_KEY || "";
  if (!apiKey) return { ok: false, status: 500 };
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  const data = await res.json().catch(() => ({}));
  const email = String(data?.users?.[0]?.email || "").trim().toLowerCase();
  if (!res.ok || !email) return { ok: false, status: 401 };
  const ownerEmails = String(env.OWNER_EMAILS || env.VITE_OWNER_EMAILS || "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!ownerEmails.includes(email)) return { ok: false, status: 403 };
  return { ok: true };
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return json(
      {
        success: false,
        error: "Method not allowed",
      },
      405
    );
  }

  if (!env || !env.DB) {
    return json(
      {
        success: false,
        error: "قاعدة البيانات غير متاحة",
      },
      500
    );
  }

  if (request.method === "POST") {
    const identity = await verifyOwnerToken(request, env);
    if (!identity.ok) {
      return json(
        { success: false, error: "غير مصرح — البث حكر على صاحب الموقع" },
        identity.status
      );
    }

    const body = await readJsonSafe(request);

    const type =
      typeof body.type === "string" && body.type.trim()
        ? body.type.trim()
        : "general";

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    if (!message) {
      return json(
        {
          success: false,
          error: "نص البث مطلوب",
        },
        400
      );
    }

    if (message.length > 2000) {
      return json(
        {
          success: false,
          error: "نص البث طويل جداً",
        },
        400
      );
    }

    try {
      // جدول البث يُنشأ كسولاً حتى لا يعتمد على إنشاء يدوي خارج المستودع.
      await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS broadcasts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL DEFAULT 'general',
          message TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )`
      ).run().catch(() => {});

      const inserted = await env.DB.prepare(
        `INSERT INTO broadcasts
          (type, message, created_at)
         VALUES
          (?1, ?2, strftime('%s','now'))`
      )
        .bind(type, message)
        .run();

      return json({
        success: true,
        message: "تم حفظ البث بنجاح",
        id: inserted?.meta?.last_row_id ?? null,
      });
    } catch (error) {
      console.error("broadcast POST error:", error);

      return json(
        {
          success: false,
          error: "تعذر حفظ البث",
        },
        500
      );
    }
  }

  try {
    // ?history=1 يعيد آخر 50 بثاً (خلال 30 يوماً) لجرس الإشعارات داخل الموقع؛
    // بدونها يبقى السلوك القديم: أحدث بث خلال 30 ثانية (للشريط المتحرك).
    const url = new URL(request.url);
    if (url.searchParams.get("history") === "1") {
      const history = await env.DB.prepare(
        `SELECT id, type, message, created_at
         FROM broadcasts
         WHERE created_at > strftime('%s','now') - 2592000
         ORDER BY created_at DESC
         LIMIT 50`
      ).all();

      return json({ success: true, items: history?.results || [] });
    }

    const result = await env.DB.prepare(
      `SELECT id, type, message, created_at
       FROM broadcasts
       WHERE created_at > strftime('%s','now') - 30
       ORDER BY created_at DESC
       LIMIT 1`
    ).all();

    const latest = result?.results?.[0];

    return json(latest || {});
  } catch (error) {
    console.error("broadcast GET error:", error);

    return json({});
  }
}
