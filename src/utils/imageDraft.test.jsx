// src/utils/imageDraft.test.js — مسودة الصورة داخل الجلسة (❌ لا يُفقد الصورة)
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { clearImageDraft, readImageDraft, saveImageDraft } from './imageDraft';
import FreeImageField from '../components/FreeImageField';

const DATA_URL = 'data:image/jpeg;base64,AAAA';

beforeEach(() => {
  window.sessionStorage.clear();
  cleanup();
});

describe('imageDraft — تخزين مسودة الجلسة', () => {
  it('يحفظ ويقرأ ويُفرّغ بالقيمة الفارغة', () => {
    saveImageDraft('k1', DATA_URL);
    expect(readImageDraft('k1')).toBe(DATA_URL);
    clearImageDraft('k1');
    expect(readImageDraft('k1')).toBe('');
  });

  it('لا يرمي عند مفتاح فارغ أو تخزين محجوب', () => {
    expect(() => saveImageDraft('', DATA_URL)).not.toThrow();
    expect(readImageDraft('')).toBe('');
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveImageDraft('k2', DATA_URL)).not.toThrow();
    spy.mockRestore();
  });
});

describe('FreeImageField — ❌ ثم إعادة الفتح', () => {
  it('يستعيد الصورة المحفوظة في الجلسة بلا رفع جديد', async () => {
    saveImageDraft('form-x', DATA_URL);
    const onChange = vi.fn();
    render(<FreeImageField value="" onChange={onChange} draftKey="form-x" />);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(DATA_URL));
  });

  it('لا يستعيد شيئاً حين تكون القيمة موجودة أصلاً', async () => {
    saveImageDraft('form-y', DATA_URL);
    const onChange = vi.fn();
    render(<FreeImageField value={DATA_URL} onChange={onChange} draftKey="form-y" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('بلا draftKey لا تُقرأ أي مسودة', async () => {
    saveImageDraft('form-z', DATA_URL);
    const onChange = vi.fn();
    render(<FreeImageField value="" onChange={onChange} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('مسح الرابط يُفرّغ المسودة فلا تعود عند إعادة الفتح', async () => {
    saveImageDraft('form-w', DATA_URL);
    const onChange = vi.fn();
    const { rerender } = render(
      <FreeImageField
        value="https://example.com/a.jpg"
        onChange={onChange}
        draftKey="form-w"
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/رابط مباشر/), {
      target: { value: '' },
    });
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(readImageDraft('form-w')).toBe('');
    onChange.mockClear();
    rerender(<FreeImageField value="" onChange={onChange} draftKey="form-w" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(onChange).not.toHaveBeenCalled();
  });
});
