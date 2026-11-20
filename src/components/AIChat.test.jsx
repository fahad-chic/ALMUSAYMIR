// اختبار منطق التحية في المساعد «فهد» (المكوّن على مسار /ai-chat):
// يردّ السلام فقط عند سلام المستخدم، ولا يبدأ أي رد آخر بتحية.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../utils/constants', () => ({
  CONTACT_INFO: { WHATSAPP: '966536667222' },
}));

import AIChat from './AIChat';

const openChat = () => {
  render(<AIChat />);
  fireEvent.click(screen.getByLabelText(/فتح مساعد/));
};

const send = (text) => {
  const input = screen.getByPlaceholderText(/اسألني/);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('AIChat (فهد) — التحية عند السلام فقط', () => {
  beforeEach(() => {
    // نجبر المسار المحلي (getSmartResponse) لاختبار نصوصه الحتمية.
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
  });

  it('يردّ "وعليكم السلام" عندما يسلّم المستخدم', async () => {
    openChat();
    send('السلام عليكم');
    await waitFor(() => {
      expect(screen.getByText(/وعليكم السلام/)).toBeInTheDocument();
    });
  });

  it('لا يبدأ الرد بتحية على سؤال عادي', async () => {
    openChat();
    send('ما هي عاصمة اليابان؟');
    await waitFor(() => {
      const bubbles = screen.getAllByText(/./);
      expect(bubbles.length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/^وعليكم السلام/)).toBeNull();
  });

  it('لا يردّ التحية على سؤال يحتوي كلمة "صباح" في وسطه', async () => {
    openChat();
    send('هل الجو بارد في الصباح هذه الأيام؟');
    await waitFor(() => {
      expect(screen.queryByText(/^وعليكم السلام/)).toBeNull();
    });
  });
});
