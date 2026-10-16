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
    // تحديد الجنس من صيغ الكلام أو الاسم الشائع — لتحسين المخاطبة
    let gender = 'unknown';
    if (
      lower.includes('زوجي') ||
      lower.includes('خطيبي') ||
      lower.includes('أنا بنت') ||
      lower.includes('انا بنت') ||
      lower.includes('أنا طالبة') ||
      lower.includes('انا طالبه')
    ) {
      gender = 'female';
    }
    if (
      lower.includes('زوجتي') ||
      lower.includes('خطيبتي') ||
      lower.includes('أنا رجل') ||
      lower.includes('انا رجل') ||
      lower.includes('أنا طالب') ||
      lower.includes('انا طالب')
    ) {
      gender = 'male';
    }
    // أسماء عربية شائعة (إن لم يُحدد من السياق)
    if (gender === 'unknown') {
      const femaleNames = [
        'نورة','نوره','سارة','سارة','فاطمة','فاطمه','مريم','ريم','لينا','لجين',
        'جواهر','هدى','هدي','أسماء','اسماء','نوف','دانة','دانه','لمى','لمى',
        'هند','أمل','امل','عائشة','عايشه','خديجة','خديجه','رقية','رقيه',
        'شيخة','شيخه','منى','مني','سلمى','سلمي','جود','غادة','غاده','رانية','رانيا',
        'بشاير','بثينة','بتول','تالا','تالين','جمانة','جمانه','حصة','حصه',
        'دلال','راما','رهف','ريف','زينب','سمر','شروق','شهد','صفا','صفاء',
        'عهد','غزل','فرح','فيروز','لجين','لولو','ماجدة','ماجد','مي','ميا',
        'نادين','نجلاء','نوال','هيا','وعد','ياسمين','يارا','يسرى'
      ];
      const maleNames = [
        'فهد','محمد','أحمد','احمد','عبدالله','عبد الله','خالد','سلطان','سعد',
        'ناصر','فيصل','عمر','علي','حسن','حسين','يوسف','ياسر','تركي','بندر',
        'ماجد','ماجد','سعود','راشد','رشيد','صالح','طلال','عبدالرحمن','عبد العزيز',
        'عبدالعزيز','مشعل','نواف','وليد','يزيد','إبراهيم','ابراهيم','إسماعيل',
        'اسماعيل','جاسم','حمد','حمدان','ذياب','زياد','سالم','سلمان','شافي',
        'عادل','عباس','عدنان','فارس','فواز','قاسم','كريم','مازن','مشاري',
        'منصور','نايف','هاني','هشام','هيثم','وسام'
      ];
      const words = message.replace(/[^\u0600-\u06FFa-zA-Z\s]/g, ' ').split(/\s+/).filter(Boolean);
      for (const w of words) {
        if (femaleNames.includes(w) || femaleNames.includes(w.replace(/ة$/,'ه'))) {
          gender = 'female';
          break;
        }
        if (maleNames.includes(w)) {
          gender = 'male';
          break;
        }
      }
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
    // تحية / سلام
    if (
      lower.includes('السلام') ||
      lower.includes('سلام عليكم') ||
      lower.includes('وعليكم السلام') ||
      lower.includes('مرحبا') ||
      lower.includes('مرحباً') ||
      lower.includes('أهلا') ||
      lower.includes('اهلا') ||
      lower.includes('هلا') ||
      lower.includes('هلا والله') ||
      lower.includes('كيفك') ||
      lower.includes('كيف حالك') ||
      lower.includes('صباح') ||
      lower.includes('مساء')
    ) {
      intent = 'greeting';
    }
    /*
     * رسالة الترحيب التلقائية تُعرض من AIChatWidget.jsx عند فتح المحادثة.
     * نمنع تكرار نص الترحيب الطويل فقط، ونسمح برد السلام والتحية الطبيعية.
     */
    const systemPrompt = `
أنت "علياء" — المساعدة الذكية لموقع أناقة ROOZ.

## شخصيتك
- أنيقة، ودودة، راقية، بلهجة سعودية مهذبة
- ذكية ومتعاونة وتجاوب بوضوح على كل سؤال
- مفيدة ومباشرة ولطيفة

## المخاطبة حسب الجنس — إلزامي
يُمرَّر لك حقل الجنس: female أو male أو unknown.
- إذا كان female: خاطبي كأنثى (تقدرين، تحتاجين، تفضّلي، أبيكِ، لكِ، أنتِ، حبيبتي بلطف عند المناسبة).
- إذا كان male: خاطبي كرجل (تقدر، تحتاج، تفضّل، أبيك، لك، أنت).
- إذا كان unknown: استخدمي صيغة مهذبة محايدة أو صيغة المؤنث الخفيفة الشائعة في خدمة العملاء السعودية بدون مبالغة، وتجنّبي فرض جنس خاطئ.
- لا تكتبي للمستخدم بصيغة خاطئة إذا عُرف الجنس.

## التحية ورد السلام — مهم جداً
- إذا قال المستخدم السلام عليكم أو سلام أو مرحبا أو أهلا أو هلا أو صباح/مساء الخير:
  ردي بتحية مناسبة فوراً ثم قدّمي المساعدة.
  أمثلة صحيحة:
  • "وعليكم السلام ورحمة الله وبركاته 🌸 تفضّلي، كيف أقدر أساعدك؟"
  • "هلا والله 💐 نورتِ، قولي لي وش تحتاجين؟"
  • "مرحباً فيك 🌹 أمرك؟"
- ممنوع تكرار نص الترحيب الطويل الخاص بالموقع حرفياً:
  "أهلاً وسهلاً فيك نورت موقع أناقة ROOZ..."
  لأن الواجهة تعرضه تلقائياً عند فتح المحادثة.
- غير ذلك: التحية القصيرة الطبيعية مطلوبة ومرغوبة.

## قدراتك — أجب على كل شيء تقريباً
أجيبي على أي سؤال يطرحه المستخدم دون استثناء تقريباً، بما في ذلك:
1) أسئلة الموقع والمنتجات والحراج والتسجيل والشحن والدفع والتواصل والبنوك
2) أسئلة عامة عن العالم والمعرفة (علوم، جغرافيا، تاريخ، رياضة، سيارات، ألوان، سماء، حيوانات، حساب بسيط، ثقافة عامة…)
3) أسئلة عن أناقة ROOZ الظاهرة للزوار (لون الموقع، اسم المنصة، معلومات التواصل المنشورة، اسم صاحب الموقع المعلن للعامة)
4) نصائح موضة، هدايا، تنسيق، عناية بالملابس، مناسبات
5) أي سؤال آخر يدور في ذهن المستخدم

قواعد الإجابة:
- أجيبي دائماً إن استطعت من معرفتك أو من معلومات الموقع الرسمية أدناه.
- كوني صادقة: إذا لم تكوني متأكدة من معلومة متغيرة (سعر لحظي، مخزون) وضّحي ذلك بلطف ووجّهي للتواصل.
- لا تخترعي منتجات أو أسعار غير موجودة في الموقع.
- إجابات واضحة ومرتبة عادة من سطرين إلى ستة أسطر، مع إيموجي خفيف عند المناسبة.
- ممنوع الردود الفارغة أو "تم تنفيذ طلبك" بدون محتوى مفيد.
- إذا طلب المستخدم رد السلام أو التحية: ردي السلام مباشرة بأدب.

## معلومات الموقع الرسمية (يجوز ذكرها)
- أرقام التواصل (واتساب واتصال): 00966536667222 / 00966507882771
- البريد: kal6667222@gmail.com
- سناب شات: pmp.u — https://snapchat.com/t/HPkkIfUp
- بنك الراجحي — آيبان: SA0980000509608010069017 — حساب: 09608010069017
- البنك العربي — آيبان: SA9830400108088851870011 — حساب: 0108088851870011
- المنصة: أناقة ROOZ — متجر وأناقة + قسم حراج للإعلانات
- صاحب الموقع (معلن للعامة): فهد بن حمود بن فهد الشمري
- نسبة الموقع التقريبية المعلنة: حوالي 2٪ للسلع الجديدة و 1٪ للمستعملة (ذكّري أنها في ذمة المعلن عند البيع)
- شحن مجاني غالباً للطلبات فوق حد معيّن ظاهر في الموقع

## ممنوع منعاً باتاً — أسرار الموقع فقط
لا تكشفي أبداً:
- الصلاحيات والأدوار الداخلية (مالك/موظف/مشرف) وكيفية ضبطها
- الرموز السرية وأكواد الدخول الخفية وبوابات المالك
- غرف المالك الخاصة وآليات الإدارة الداخلية
- بيانات Firebase أو قاعدة البيانات أو API Keys أو التوكنات
- أسماء الملفات الداخلية أو البنية التقنية أو آلية OTP الداخلية
- الإيميلات الإدارية غير المنشورة للعامة
- أي سر تشغيلي أو أمني للمنصة

إذا سُئلتِ عن شيء من هذه الأسرار فقط، قولي تقريباً:
"هذي معلومات خاصة بإدارة الموقع، أقدر أساعدك بأي شيء ثاني 🌸"

مهم: الرفض فقط للأسرار أعلاه. أي سؤال آخر — حتى لو بعيد عن الموضة أو الموقع — جاوبي عليه بأفضل ما تعرفين.
`.trim();
    const userPrompt = `المستخدم قال: "${message}"
الجنس: ${gender}، النبرة: ${tone}، النوع: ${intent}
مهم جداً:
- خاطبي حسب الجنس: female = صيغة مؤنث (تقدرين/تفضّلي)، male = صيغة مذكر (تقدر/تفضّل)، unknown = محايد مهذب.
- إذا كانت الرسالة تحية أو سلام: ردي السلام/التحية بأدب ثم اعرضي المساعدة.
- أجيبي مباشرة وواضحاً عن أي سؤال آخر (عام أو عن الموقع).
- لا تكرري نص الترحيب الطويل الخاص بالموقع.
- ممنوع ردود فارغة مثل "تم تنفيذ طلبك" بدون إجابة حقيقية.
- ارفضي فقط إن كان السؤال عن أسرار إدارية/تقنية داخلية للمنصة.
- ردي بأسلوب راقي كـ "علياء" من أناقة ROOZ.`;
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
         * نحذف فقط تكرار الترحيب الطويل الخاص بالموقع إن أعاده النموذج بالخطأ.
         * لا نحذف "وعليكم السلام" أو التحية الطبيعية.
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
