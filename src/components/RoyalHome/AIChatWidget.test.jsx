// اختبار المساعد «فهد» (النافذة الرئيسية): يرسل السؤال للخادم، ويستخدم
// رداً محلياً احتياطياً مفيداً عند تعذّر الاتصال — بلا تكرار تحية.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import AIChatWidget from './AIChatWidget';

const send = (text) => {
  const input = screen.getByLabelText('رسالة المساعد الذكي');
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByLabelText('إرسال الرسالة'));
};

describe('AIChatWidget (فهد)', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
    // jsdom لا يوفّر scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('يعرض رد الخادم كما هو عند النجاح', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ reply: 'عاصمة اليابان هي طوكيو.' }),
    }));
    render(<AIChatWidget isOpen onClose={() => {}} />);
    send('ما عاصمة اليابان؟');
    await waitFor(() => {
      expect(screen.getByText('عاصمة اليابان هي طوكيو.')).toBeInTheDocument();
    });
  });

  it('عند تعذّر الاتصال يقدّم رداً مفيداً لا يعتذر بلا فائدة', async () => {
    render(<AIChatWidget isOpen onClose={() => {}} />);
    send('ما هي عاصمة مصر؟');
    await waitFor(() => {
      expect(screen.getByText(/تعذّر|أعد إرسال/)).toBeInTheDocument();
    });
  });

  it('لا يردّ بتحية على سؤال عادي', async () => {
    render(<AIChatWidget isOpen onClose={() => {}} />);
    send('اشرح لي الجاذبية');
    await waitFor(() => {
      expect(screen.queryByText(/^وعليكم السلام/)).toBeNull();
    });
  });
});
