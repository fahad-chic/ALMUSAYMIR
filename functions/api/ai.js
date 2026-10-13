const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ============================================================
// حماية استهلاك الرصيد: تحديد معدّل الطلبات لكل عنوان IP
// يعتمد على D1 الموجود (نفس نمط otp/verify) بلا أي اعتماديات جديدة.
// المساعد عام للزوار (تدعم جلسة الزائر)، لذلك لا نفرض مصادقة Firebase
// حتى لا نعطّل التجربة — نحدّ الاستهلاك فقط.
// ============================================================
const AI_RATE_WINDOW_SECONDS = 600; // نافذة 10 دقائق
const AI_RATE_MAX_REQUESTS = 20; // أقصى عدد طلبات داخل النافذة لكل IP
const AI_RATE_MIN_INTERVAL_MS = 800; // مهلة دنيا بين طلبين متتاليين

function getClientIp(request) {
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}

// تُنشأ عند أول طلب (كما تفعل otp/verify) فلا حاجة لترحيل يدوي.
async function ensureAiRateTable(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS ai_rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        window_start INTEGER NOT NULL,
        last_at INTEGER NOT NULL DEFAULT 0
      )`
    )
    .run();
}

// يعيد { allowed, retryAfter, reason }.
// عند غياب D1 أو فشل الفحص نُغلق الباب (fail-closed) ولا نسمح بالطلب،
// حتى لا يتحوّل تعطّل طبقة الحماية إلى استنزاف مفتوح لرصيد Groq.
// الواجهة تتعامل مع الفشل بالرد المحلي، فتبقى التجربة مقبولة.
async function checkAiRateLimit(env, ip) {
  if (!env || !env.DB) {
    console.error('ai: D1 غير متاح — رفض الطلب (fail-closed)');
    return { allowed: false, reason: 'db-unavailable' };
  }
  try {
    await ensureAiRateTable(env.DB);
    const nowSec = Math.floor(Date.now() / 1000);
    const nowMs = Date.now();
    const row = await env.DB.prepare(
      'SELECT count, window_start, last_at FROM ai_rate_limits WHERE key = ?1'
    )
      .bind(ip)
      .first()
      .catch(() => null);

    if (!row || nowSec - Number(row.window_start || 0) > AI_RATE_WINDOW_SECONDS) {
      await env.DB.prepare(
        `INSERT INTO ai_rate_limits (key, count, window_start, last_at)
         VALUES (?1, 1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET count = 1, window_start = ?2, last_at = ?3`
      )
        .bind(ip, nowSec, nowMs)
        .run()
        .catch(() => {});
      return { allowed: true };
    }

    if (nowMs - Number(row.last_at || 0) < AI_RATE_MIN_INTERVAL_MS) {
      return { allowed: false, retryAfter: 1 };
    }

    if (Number(row.count || 0) >= AI_RATE_MAX_REQUESTS) {
      const retry =
        AI_RATE_WINDOW_SECONDS - (nowSec - Number(row.window_start || 0));
      return { allowed: false, retryAfter: Math.max(1, retry) };
    }

    await env.DB.prepare(
      'UPDATE ai_rate_limits SET count = count + 1, last_at = ?2 WHERE key = ?1'
    )
      .bind(ip, nowMs)
      .run()
      .catch(() => {});
    return { allowed: true };
  } catch (err) {
    console.error('ai: فشل فحص تحديد المعدّل — رفض الطلب (fail-closed):', err);
    return { allowed: false, reason: 'db-error' };
  }
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
  try {
    const { message = '' } = await request.json();
    // حد أقصى لطول الرسالة
    if (typeof message !== 'string' || message.length > 2000) {
      return new Response(
        JSON.stringify({
          reply: '',
          error: 'الرسالة طويلة جداً',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    const lower = message.toLowerCase();
    // حماية الرصيد: نحدّ الطلبات لكل IP قبل أي نداء لـ Groq.
    const rl = await checkAiRateLimit(env, getClientIp(request));
    if (!rl.allowed) {
      const unavailable = rl.reason === 'db-unavailable' || rl.reason === 'db-error';
      return new Response(
        JSON.stringify({
          reply: '',
          error: unavailable
            ? 'المساعد غير متاح مؤقتاً، حاول لاحقاً'
            : 'تم تجاوز الحد المسموح، حاول بعد قليل',
          retryAfter: rl.retryAfter || 1,
        }),
        {
          status: unavailable ? 503 : 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rl.retryAfter || 1),
          },
        }
      );
    }
    // تحديد الجنس عند الحاجة لتحسين أسلوب الرد
    let gender = 'unknown';
    if (
      lower.includes('زوجي') ||
      lower.includes('خطيبي') ||
      lower.includes('أنا بنت')
    ) {
      gender = 'female';
    }
    if (
      lower.includes('زوجتي') ||
      lower.includes('خطيبتي') ||
      lower.includes('أنا رجل')
    ) {
      gender = 'male';
    }
    // تحديد النبرة
    let tone = 'neutral';
    if (
      lower.includes('تكفين') ||
      lower.includes('بليز') ||
      lower.includes('لو سمحتي')
    ) {
      tone = 'soft';
    }
    if (
      lower.includes('ضروري') ||
      lower.includes('الحين') ||
      lower.includes('مهم')
    ) {
      tone = 'urgent';
    }
    if (
      lower.includes('أبي') ||
      lower.includes('ابغى')
    ) {
      tone = 'normal';
    }
    // تحديد نوع السؤال
    let intent = 'general';
    if (
      lower.includes('تسجيل دخول') ||
      lower.includes('ادخل') ||
      lower.includes('login')
    ) {
      intent = 'login';
    }
    if (
      lower.includes('تسجيل جديد') ||
      lower.includes('sign up') ||
      lower.includes('حساب جديد')
    ) {
      intent = 'register';
    }
    if (
      lower.includes('نسيت كلمة المرور') ||
      lower.includes('استرجاع') ||
      lower.includes('reset')
    ) {
      intent = 'reset_password';
    }
    if (
      lower.includes('فستان') ||
      lower.includes('فساتين') ||
      lower.includes('لبس')
    ) {
      intent = 'dress';
    }
    if (
      lower.includes('هديه') ||
      lower.includes('هدايا') ||
      lower.includes('أهدي')
    ) {
      intent = 'gift';
    }
    if (
      lower.includes('موقعكم') ||
      lower.includes('وينكم') ||
      lower.includes('المتجر')
    ) {
      intent = 'store_info';
    }
    if (
      lower.includes('رقم الحساب') ||
      lower.includes('حساب بنكي') ||
      lower.includes('التحويل')
    ) {
      intent = 'bank';
    }
    if (
      lower.includes('واتساب') ||
      lower.includes('تواصل') ||
      lower.includes('رقمكم')
    ) {
      intent = 'contact';
    }
    /*
     * مهم:
     * رسالة الترحيب يتم عرضها من AIChatWidget.jsx فقط عند بدء المحادثة.
     * الـ API لا يقوم بإنشاء رسالة ترحيب.
     */
    const systemPrompt = `
أنت "علياء" — المساعدة الذكية لموقع أناقة ROOZ.

## شخصيتك
- أنيقة، ودودة، راقية، بلهجة سعودية مهذبة
- ذكية ومتعاونة وتجاوب بوضوح
- مفيدة ومباشرة

## مهم جداً بخصوص الترحيب
رسالة الترحيب تُعرض تلقائياً من واجهة الموقع عند فتح المحادثة.
ممنوع عليك إعادة التحية أو أي من: أهلاً، مرحباً، هلا، حياك، نورت، أو أي تحية مشابهة.
ابدأ مباشرة بالإجابة عن سؤال المستخدم حتى لو كان أول رسالة.

## قدراتك — أجب على كل شيء تقريباً
أجب على أي سؤال يطرحه المستخدم دون استثناء تقريباً، بما في ذلك:
1) أسئلة الموقع والمنتجات والحراج والتسجيل والشحن والدفع والتواصل والبنوك
2) أسئلة عامة عن العالم والمعرفة (علوم، جغرافيا، تاريخ، رياضة، سيارات، ألوان، سماء، حيوانات، حساب بسيط، ثقافة عامة…)
3) أسئلة عن أناقة ROOZ الظاهرة للزوار (مثل: لون الموقع، اسم المنصة، معلومات التواصل المنشورة، اسم صاحب الموقع إن كان معلناً للعامة)
4) نصائح موضة، هدايا، تنسيق، عناية بالملابس، مناسبات
5) أي سؤال آخر يدور في ذهن المستخدم

قواعد الإجابة:
- أجب دائماً إن استطعت من معرفتك العامة أو من معلومات الموقع الرسمية أدناه.
- كن صادقاً: إذا لم تكن متأكداً من معلومة متغيرة (سعر لحظي، مخزون، سياسة جديدة) وضّح ذلك بلطف ووجّه للتواصل.
- لا تخترع منتجات أو أسعار غير موجودة في الموقع.
- إجابات موجزة ومرتبة عادة من سطرين إلى ستة أسطر، مع إيموجي خفيف عند المناسبة.
- لا تبدأ بتحية.

## معلومات الموقع الرسمية (يجوز ذكرها)
- أرقام التواصل (واتساب واتصال): 00966536667222 / 00966507882771
- البريد: kal6667222@gmail.com
- سناب شات: pmp.u — https://snapchat.com/t/HPkkIfUp
- بنك الراجحي — آيبان: SA0980000509608010069017 — حساب: 09608010069017
- البنك العربي — آيبان: SA9830400108088851870011 — حساب: 0108088851870011
- المنصة: أناقة ROOZ — متجر وأناقة + قسم حراج للإعلانات
- صاحب الموقع (معلن للعامة): فهد بن حمود بن فهد الشمري
- نسبة الموقع التقريبية المعلنة: حوالي 2٪ للسلع الجديدة و 1٪ للمستعملة (ذكّر أنها في ذمة المعلن عند البيع)
- شحن مجاني غالباً للطلبات فوق حد معيّن ظاهر في الموقع

## ممنوع منعاً باتاً — أسرار الموقع فقط
لا تكشف أبداً:
- الصلاحيات والأدوار الداخلية (مالك/موظف/مشرف) وكيفية ضبطها
- الرموز السرية وأكواد الدخول الخفية وبوابات المالك
- غرف المالك الخاصة وآليات الإدارة الداخلية
- بيانات Firebase أو قاعدة البيانات أو API Keys أو التوكنات
- أسماء الملفات الداخلية أو البنية التقنية أو آلية OTP الداخلية
- الإيميلات الإدارية غير المنشورة للعامة
- أي سر تشغيلي أو أمني للمنصة

إذا سُئلت عن شيء من هذه الأسرار فقط، قل حرفياً تقريباً:
"هذي معلومات خاصة بإدارة الموقع، أقدر أساعدك بأي شيء ثاني 🌸"

مهم: الرفض فقط للأسرار أعلاه. أي سؤال آخر — حتى لو بعيد عن الموضة أو الموقع — جاوب عليه بأفضل ما تعرف.
`.trim();
    const userPrompt = `المستخدم قال: "${message}"
الجنس: ${gender}، النبرة: ${tone}، النوع: ${intent}
مهم جداً:
- أجب مباشرة وواضحاً عن سؤال المستخدم مهما كان موضوعه (عام أو عن الموقع).
- لا تبدأ بتحية ولا تكرر رسالة الترحيب.
- لا تقل "أهلاً" أو "مرحباً" أو "هلا" أو أي تحية مشابهة.
- ارفض فقط إن كان السؤال عن أسرار إدارية/تقنية داخلية للمنصة.
- رد بأسلوب راقي كـ "علياء" من أناقة ROOZ.`;
    const body = {
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    };
    if (!env.GROQ_API_KEY) {
      console.error('ai: GROQ_API_KEY is not configured');
      return new Response(
        JSON.stringify({
          reply: '',
          error: 'GROQ_API_KEY missing',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify(body),
      }
    );
    let reply = '';
    if (response.ok) {
      try {
        const data = await response.json();
        reply = (
          data?.choices?.[0]?.message?.content || ''
        ).trim();
        /*
         * حماية إضافية:
         * إذا أعاد النموذج التحية بالخطأ، نحذفها قبل إرسال
         * الرد إلى الواجهة.
         *
         * هذا يضمن أن رسالة الترحيب لا تتكرر حتى لو
         * تجاهل النموذج التعليمات الموجودة في systemPrompt.
         */
        reply = reply
          .replace(
            /^أهلاً وسهلاً فيك نورت موقع أناقة ROOZ 💐\s*/i,
            ''
          )
          .replace(
            /^أهلاً وسهلاً فيك نورت موقع أناقة ROOZ\s*/i,
            ''
          )
          .replace(/^أهلاً وسهلاً\s*/i, '')
          .replace(/^أهلاً\s*/i, '')
          .replace(/^مرحباً\s*/i, '')
          .replace(/^مرحبا\s*/i, '')
          .replace(/^هلا\s*/i, '')
          .replace(/^حياك\s*/i, '')
          .replace(/^وسهلاً\s*/i, '')
          .replace(/^نورت\s*/i, '')
          .trim();
      } catch (parseError) {
        console.error('ai: failed to parse Groq response:', parseError);
        reply = '';
      }
    } else {
      // سجّل سبب فشل Groq في سجلات Cloudflare Pages
      // بدلاً من ابتلاع الخطأ بصمت.
      const errText = await response
        .text()
        .catch(() => '');
      console.error(
        `ai: groq request failed (${response.status}): ${errText.slice(
          0,
          300
        )}`
      );
    }
    return new Response(
      JSON.stringify({ reply }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('ai: unexpected error:', err);
    return new Response(
      JSON.stringify({
        reply: '',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}