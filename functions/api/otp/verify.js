const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
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

  const body = await readJsonSafe(request);

  const cleanEmail = String(body.email || "")
    .trim()
    .toLowerCase();

  const cleanCode = String(body.code || "").trim();

  const cleanPurpose =
    String(body.purpose || "login").trim() || "login";

  if (
    !cleanEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    return json(
      {
        success: false,
        error: "بريد إلكتروني غير صالح",
      },
      400
    );
  }

  if (!/^\d{6}$/.test(cleanCode)) {
    return json(
      {
        success: false,
        error: "يجب إدخال كود مكون من 6 أرقام",
      },
      400
    );
  }

  try {
    // عدّاد المحاولات الفاشلة لكل (بريد+غرض) — جدول يُنشأ كسولاً لمنع
    // التخمين الآلي للرموز (10 محاولات كحد أقصى خلال 15 دقيقة)
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS otp_attempts (
        key TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 0,
        window_start INTEGER NOT NULL
      )`
    ).run().catch(() => {});

    const attemptKey = cleanEmail + "|" + cleanPurpose;
    const nowSec = Math.floor(Date.now() / 1000);
    const WINDOW = 900; // 15 دقيقة
    const MAX_ATTEMPTS = 10;

    const att = await env.DB.prepare(
      `SELECT attempts, window_start FROM otp_attempts WHERE key = ?1`
    ).bind(attemptKey).first();

    let attempts = Number(att?.attempts || 0);
    let windowStart = Number(att?.window_start || nowSec);
    // عند انتهاء النافذة نُصفّر العدّاد ونبدأ نافذة جديدة. بدون إعادة تعيين
    // window_start يبقى الفارق دائماً أكبر من النافذة فيُصفَّر العدّاد في كل
    // طلب، فتصبح حماية التخمين بلا أثر بعد أول 15 دقيقة.
    if (nowSec - windowStart > WINDOW) {
      attempts = 0;
      windowStart = nowSec;
    }

    if (attempts >= MAX_ATTEMPTS) {
      await env.DB.prepare(
        `UPDATE otps SET used = 1
         WHERE email = ?1 AND purpose = ?2 AND used = 0`
      ).bind(cleanEmail, cleanPurpose).run();
      await env.DB.prepare(
        `DELETE FROM otp_attempts WHERE key = ?1`
      ).bind(attemptKey).run();

      return json({
        success: false,
        error: "تم تجاوز عدد المحاولات المسموح، اطلب كوداً جديداً",
      });
    }

    const row = await env.DB.prepare(
      `SELECT id, code, expires_at, used
       FROM otps
       WHERE email = ?1
         AND purpose = ?2
         AND code = ?3
         AND used = 0
       ORDER BY id DESC
       LIMIT 1`
    )
      .bind(cleanEmail, cleanPurpose, cleanCode)
      .first();

    if (!row) {
      // سجّل المحاولة الفاشلة وأغلق عند النجاح
      const nxt = attempts + 1;
      await env.DB.prepare(
        `INSERT INTO otp_attempts (key, attempts, window_start)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET attempts = ?2, window_start = ?3`
      ).bind(attemptKey, nxt, windowStart).run().catch(() => {});

      return json({
        success: false,
        error: "الكود غير صحيح أو تم استخدامه مسبقاً",
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = Number(row.expires_at);

    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      await env.DB.prepare(
        "UPDATE otps SET used = 1 WHERE id = ?1"
      )
        .bind(row.id)
        .run()
        .catch((error) => {
          console.error(
            "otp/verify expired-code update error:",
            error
          );
        });

      return json({
        success: false,
        error: "انتهت صلاحية الكود",
      });
    }

    await env.DB.prepare(
      "UPDATE otps SET used = 1 WHERE id = ?1"
    )
      .bind(row.id)
      .run();

    await env.DB.prepare(
      "DELETE FROM otps WHERE id = ?1"
    )
      .bind(row.id)
      .run();

    await env.DB.prepare(
      "DELETE FROM otp_attempts WHERE key = ?1"
    )
      .bind(attemptKey)
      .run()
      .catch(() => {});

    return json({
      success: true,
      message: "تم التحقق بنجاح",
    });
  } catch (error) {
    console.error("otp/verify error:", error);

    return json(
      {
        success: false,
        error:
          error?.message ||
          "تعذر التحقق من الكود",
      },
      500
    );
  }
}