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

function generateCode() {
  // مولد تشفيري آمن — Math.random() قابل للتنبؤ ولا يصلح لرموز تحقق
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1000000).padStart(6, "0");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendEmail(env, email, code, purpose) {
  const apiKey = env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "خدمة البريد غير مُعدة (RESEND_API_KEY مفقودة)"
    );
  }

  const fromEmail =
    env.OTP_FROM_EMAIL || "onboarding@resend.dev";

  const purposeLabel =
    purpose === "register"
      ? "تسجيل حساب جديد"
      : purpose === "login"
        ? "تسجيل الدخول"
        : "التحقق";

  // القالب المعتمد رسمياً لرسالة التحقق — هوية المسيمير | ALMUSAYMIR
  const html = `
    <div dir="rtl" style="font-family:'Tajawal',Arial,Tahoma,sans-serif;max-width:520px;margin:auto;padding:32px 28px;background:#fdfbf7;color:#1f1116;border:1px solid rgba(31,17,22,.10);border-radius:8px">
      <h2 style="color:#6b1d2f;text-align:center;margin:0 0 4px;font-weight:800;font-size:22px">
        المسيمير | ALMUSAYMIR
      </h2>
      <div style="height:3px;width:56px;background:#d4a5a5;border-radius:3px;margin:0 auto 24px"></div>

      <p style="text-align:right;font-size:15px;line-height:1.9;margin:0 0 12px">
        مرحباً بك في المسيمير | ALMUSAYMIR،
      </p>

      <p style="text-align:right;font-size:15px;line-height:1.9;margin:0 0 8px">
        رمز التحقق المؤقت الخاص بك هو:
      </p>

      <div style="text-align:center;margin:20px 0">
        <span style="display:inline-block;font-size:34px;font-weight:800;letter-spacing:10px;color:#fdfbf7;background:#1f1116;padding:16px 26px;border-radius:8px">
          ${code}
        </span>
      </div>

      <p style="text-align:right;font-size:14px;line-height:1.9;color:#3a2a30;margin:0 0 10px">
        هذا الرمز صالحة للاستخدام لمرة واحدة فقط وينتهي خلال 10 دقائق. يرجى عدم مشاركته مع أي شخص لضمان أمان حسابك.
      </p>

      <p style="text-align:right;font-size:13px;line-height:1.9;color:#8a5560;margin:0 0 4px">
        إذا لم تكن أنت من طلب هذا الرمز، يمكنك تجاهل هذا البريد الإلكتروني بأمان.
      </p>

      <p style="text-align:right;font-size:13px;line-height:1.9;color:#8a5560;margin:0">
        شكراً لك،<br>فريق دعم المسيمير | ALMUSAYMIR.
      </p>
    </div>
  `;

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `المسيمير | ALMUSAYMIR <${fromEmail}>`,
        to: [email],
        subject: "رمز التحقق الخاص بك لملف دخولك - المسيمير | ALMUSAYMIR",
        html,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    throw new Error(
      `فشل إرسال البريد (${response.status}): ${errorText}`
    );
  }

  return response.json().catch(() => ({}));
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

  const cleanPurpose =
    String(body.purpose || "login").trim() || "login";

  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    return json(
      {
        success: false,
        error: "بريد إلكتروني غير صالح",
      },
      400
    );
  }

  try {
    const now = Math.floor(Date.now() / 1000);

    // جدول الرموز يُنشأ كسولاً (نمط otp_attempts/ai_rate_limits) حتى لا تعتمد
    // إرسال الرمز على جدول أُنشئ يدوياً خارج المستودع — كان غيابه يُفشل الإرسال.
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        purpose TEXT NOT NULL DEFAULT 'login',
        expires_at INTEGER NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ).run().catch(() => {});

    // حد إرسال: رمز واحد كل 60 ثانية لنفس البريد والغرض — يمنع إغراق البريد
    // وإساءة استخدام خدمة Resend (الرمز الحديث يبقى صالحاً 10 دقائق)
    const recent = await env.DB.prepare(
      `SELECT created_at FROM otps
       WHERE email = ?1 AND purpose = ?2 AND used = 0
       ORDER BY id DESC LIMIT 1`
    ).bind(cleanEmail, cleanPurpose).first().catch(() => null);

    const nowMs = Date.now();
    if (recent && recent.created_at) {
      const createdMs = Date.parse(
        String(recent.created_at).replace(" ", "T") + "Z"
      );
      if (Number.isFinite(createdMs) && nowMs - createdMs < 60_000) {
        return json(
          {
            success: false,
            error: "تم إرسال كود مؤخراً، انتظر دقيقة ثم حاول مجدداً",
          },
          429
        );
      }
    }

    const code = generateCode();

    const expiresAt = now + 600;

    await env.DB.prepare(
      `UPDATE otps
       SET used = 1
       WHERE email = ?1
         AND purpose = ?2
         AND used = 0`
    )
      .bind(cleanEmail, cleanPurpose)
      .run();

    await env.DB.prepare(
      `INSERT INTO otps
        (email, code, purpose, expires_at, used)
       VALUES
        (?1, ?2, ?3, ?4, 0)`
    )
      .bind(
        cleanEmail,
        code,
        cleanPurpose,
        expiresAt
      )
      .run();

    try {
      await sendEmail(
        env,
        cleanEmail,
        code,
        cleanPurpose
      );
    } catch (emailError) {
      await env.DB.prepare(
        `DELETE FROM otps
         WHERE email = ?1
           AND code = ?2`
      )
        .bind(cleanEmail, code)
        .run()
        .catch(() => {});

      throw emailError;
    }

    return json({
      success: true,
      message:
        "تم إرسال كود التحقق إلى بريدك الإلكتروني",
      expiresIn: 300,
    });
  } catch (error) {
    console.error("otp/send error:", error);

    return json(
      {
        success: false,
        error:
          error?.message ||
          "تعذر إرسال كود التحقق",
      },
      500
    );
  }
}