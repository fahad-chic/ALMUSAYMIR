// اختبار نظام الإشعارات العام (Toast) — بديل window.alert.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import toast, { dismiss, getSnapshot } from './toast';
import ToastHost from '../components/ToastHost';

describe('toast store', () => {
  beforeEach(() => {
    getSnapshot().slice().forEach((t) => dismiss(t.id));
  });

  it('يضيف إشعار نجاح ويحمل الرسالة', () => {
    toast.success('تم الحفظ');
    const items = getSnapshot();
    expect(items).toHaveLength(1);
    expect(items[0].message).toBe('تم الحفظ');
    expect(items[0].type).toBe('success');
  });

  it('toast.error يضبط النوع error', () => {
    toast.error('تعذر الحفظ');
    expect(getSnapshot()[0].type).toBe('error');
  });

  it('يتجاهل الرسائل الفارغة', () => {
    expect(toast('')).toBeNull();
    expect(getSnapshot()).toHaveLength(0);
  });

  it('dismiss يزيل الإشعار بمعرّفه', () => {
    const id = toast.info('تنبيه');
    dismiss(id);
    expect(getSnapshot()).toHaveLength(0);
  });
});

describe('ToastHost', () => {
  afterEach(() => {
    getSnapshot().slice().forEach((t) => dismiss(t.id));
  });

  it('يعرض الرسالة في DOM عند إضافتها', () => {
    render(<ToastHost />);
    act(() => {
      toast.success('مرحباً');
    });
    expect(screen.getByText('مرحباً')).toBeInTheDocument();
  });

  it('لا يعرض شيئاً عندما لا توجد إشعارات', () => {
    const { container } = render(<ToastHost />);
    expect(container.querySelector('[aria-label="الإشعارات"]')).toBeNull();
  });

  it('زر الإغلاق يزيل الإشعار', () => {
    render(<ToastHost />);
    act(() => {
      toast.error('خطأ ما');
    });
    fireEvent.click(screen.getByLabelText('إغلاق'));
    expect(screen.queryByText('خطأ ما')).toBeNull();
  });
});

describe('إخفاء تلقائي', () => {
  it('يختفي الإشعار بعد المدة المحددة', async () => {
    toast.success('مؤقت', 30);
    expect(getSnapshot()).toHaveLength(1);
    await new Promise((r) => setTimeout(r, 60));
    expect(getSnapshot()).toHaveLength(0);
  });
});
