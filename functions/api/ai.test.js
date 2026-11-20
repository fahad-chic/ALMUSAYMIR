// functions/api/ai.test.js — اختبار سلوك المساعد الذكي «فهد» (Cloudflare Function)
//
// يشغّل منطق الدالة الحقيقي (onRequest) ويستبدل فقط الحدود الخارجية:
// نداء Groq عبر fetch وطبقة D1 لتحديد المعدّل. المُختبَر هو المنطق الفعلي:
//   - كشف التحية وردّها فقط عند سلام المستخدم (لا تكرار "السلام عليكم").
//   - عدم الاعتذار عن أي سؤال عام (لا ردود مراوغة).
//   - سقف التوكنات موجود لتفادي المحتوى الفارغ.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onRequest } from './ai';

const makeDb = () => ({
  prepare: () => ({
    bind: () => ({
      first: async () => null,
      run: async () => ({}),
    }),
    first: async () => null,
    run: async () => ({}),
  }),
});

const makeRequest = (body) => ({
  method: 'POST',
  url: 'https://example.com/api/ai',
  headers: {
    get: (name) => {
      const n = String(name).toLowerCase();
      if (n === 'cf-connecting-ip') return '203.0.113.9';
      if (n === 'content-type') return 'application/json';
      return null;
    },
  },
  json: async () => body,
});

let lastGroqBody = null;

beforeEach(() => {
  lastGroqBody = null;
  globalThis.fetch = vi.fn(async (url, opts = {}) => {
    if (String(url).includes('api.groq.com')) {
      lastGroqBody = JSON.parse(opts.body || '{}');
      const reply =
        (lastGroqBody.__mockReply !== undefined && lastGroqBody.__mockReply) ||
        'إجابة تجريبية من فهد.';
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: reply } }] }),
      };
    }
    return { ok: false, text: async () => 'unexpected' };
  });
});

const env = () => ({
  DB: makeDb(),
  GROQ_API_KEY: 'test-key',
  VITE_AI_NAME: 'فهد',
  VITE_CONTACT_WHATSAPP_1: '966536667222',
});

const call = async (message) => {
  const res = await onRequest({ request: makeRequest({ message }), env: env() });
  return { status: res.status, body: await res.json() };
};

describe('ai: منع تكرار التحية', () => {
  it('لا يبدأ الرد بتحية إذا لم يسلّم المستخدم (يحذف "وعليكم السلام" من البداية)', async () => {
    // نحاكي ردّاً خاطئاً من النموذج يبدأ بتحية على سؤال عادي.
    globalThis.fetch = vi.fn(async (url, opts = {}) => {
      if (String(url).includes('api.groq.com')) {
        lastGroqBody = JSON.parse(opts.body || '{}');
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content:
                    'وعليكم السلام ورحمة الله وبركاته 🌸 عدد سكان الرياض نحو 7 ملايين نسمة.',
                },
              },
            ],
          }),
        };
      }
      return { ok: false, text: async () => '' };
    });
    const r = await call('كم عدد سكان الرياض؟');
    expect(r.status).toBe(200);
    expect(r.body.reply.startsWith('وعليكم السلام')).toBe(false);
    expect(r.body.reply).toContain('عدد سكان الرياض');
  });

  it('يبقي التحية إذا سلّم المستخدم', async () => {
    globalThis.fetch = vi.fn(async (url, opts = {}) => {
      if (String(url).includes('api.groq.com')) {
        return {
          ok: true,
          json: async () => ({
            choices: [
              { message: { content: 'وعليكم السلام ورحمة الله 🌸 كيف أقدر أساعدك؟' } },
            ],
          }),
        };
      }
      return { ok: false, text: async () => '' };
    });
    const r = await call('السلام عليكم');
    expect(r.status).toBe(200);
    expect(r.body.reply.startsWith('وعليكم السلام')).toBe(true);
  });

  it('إن كان الرد كله تحية على سؤال غير تحية، لا يُعاد الرد التحية وحده (502)', async () => {
    globalThis.fetch = vi.fn(async (url, opts = {}) => {
      if (String(url).includes('api.groq.com')) {
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'وعليكم السلام ورحمة الله وبركاته 🌸' } }],
          }),
        };
      }
      return { ok: false, text: async () => '' };
    });
    const r = await call('كم الساعة الآن؟');
    expect(r.status).toBe(502);
    expect(r.body.reply).toBe('');
  });
});

describe('ai: يجيب على أي سؤال عام', () => {
  it('يعيد ردّاً غير فارغ لسؤال علمي', async () => {
    const r = await call('ما هي عاصمة اليابان؟');
    expect(r.status).toBe(200);
    expect(typeof r.body.reply).toBe('string');
    expect(r.body.reply.length).toBeGreaterThan(0);
  });

  it('يمرّر الرسالة إلى Groq مع سقف توكنات (تفادي المحتوى الفارغ)', async () => {
    await call('اشرح لي الجاذبية');
    expect(lastGroqBody).toBeTruthy();
    expect(lastGroqBody.max_completion_tokens).toBeGreaterThan(0);
    expect(lastGroqBody.messages?.[0]?.role).toBe('system');
    expect(lastGroqBody.messages?.[1]?.content).toContain('اشرح لي الجاذبية');
  });

  it('يعلّم النموذج ألا يبدأ بتحية لغير المسلّم (في موجّه النظام)', async () => {
    await call('ما هو أطول نهر في العالم؟');
    const sys = lastGroqBody.messages.find((m) => m.role === 'system').content;
    expect(sys).toContain('التحية');
    expect(sys).toMatch(/ممنوع/);
  });

  it('اسم "ماجد" يُصنّف مذكراً (لا يخاطب الرجل بصيغة أنثى)', async () => {
    await call('مرحبا أنا ماجد');
    const user = lastGroqBody.messages.find((m) => m.role === 'user').content;
    expect(user).toContain('الجنس: male');
  });
});

describe('ai: حماية الحدود', () => {
  it('يرفض الطرق غير POST بـ 405', async () => {
    const res = await onRequest({
      request: { method: 'GET', headers: { get: () => null } },
      env: env(),
    });
    expect(res.status).toBe(405);
  });

  it('يرفض الرسالة الطويلة جداً بـ 400', async () => {
    const r = await call('ا'.repeat(2001));
    expect(r.status).toBe(400);
  });
});
