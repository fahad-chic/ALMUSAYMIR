// اختبار بوابة التسجيل (BLOCK_USER_REGISTRATION): الافتراضي مفتوح، ولا يُسمح
// بالإيقاف بلا سبب، والكتابة تحمل blocked/reason/updatedBy وتُسجَّل وتُنبّه.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { onSnapshot, setDoc, addDoc } from 'firebase/firestore';
import RegistrationPanel from './RegistrationPanel';

// نبني لقطة تحاكي settings/registrationGate بحالة قابلة للتحكم.
let gateData = null;
onSnapshot.mockImplementation((ref, next) => {
  next({
    exists: () => gateData !== null,
    data: () => gateData || {},
  });
  return vi.fn();
});

describe('RegistrationPanel — بوابة التسجيل', () => {
  beforeEach(() => {
    gateData = null;
    setDoc.mockClear();
    addDoc.mockClear();
  });

  it('يعرض «التسجيل مفتوح (الافتراضي)» عند غياب الإعداد', () => {
    render(<RegistrationPanel showToast={() => {}} />);
    expect(screen.getByText(/التسجيل مفتوح/)).toBeInTheDocument();
  });

  it('يرفض الإيقاف بلا سبب', async () => {
    const showToast = vi.fn();
    render(<RegistrationPanel showToast={showToast} />);
    fireEvent.click(screen.getByRole('button', { name: /إيقاف التسجيل/ }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('اكتب سبب الإيقاف أولاً', 'error'));
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('يكتب blocked=true مع السبب والمنفّذ عند الإيقاف بسبب', async () => {
    const showToast = vi.fn();
    render(<RegistrationPanel showToast={showToast} />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'هجوم تسجيلات وهمية' },
    });
    fireEvent.click(screen.getByRole('button', { name: /إيقاف التسجيل/ }));

    await waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1));
    const payload = setDoc.mock.calls[0][1];
    expect(payload.blocked).toBe(true);
    expect(payload.reason).toBe('هجوم تسجيلات وهمية');
    expect(payload).toHaveProperty('updatedBy');

    // سجل أمني + تنبيه للمالك (إضافة إلى سجل التدقيق).
    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    const collections = addDoc.mock.calls.map((c) => c[0]?.path || c[0]?.id);
    expect(collections.length).toBeGreaterThan(0);
  });

  it('يعرض «التسجيل متوقف مؤقتاً» عند blocked=true', () => {
    gateData = { blocked: true, reason: 'x' };
    render(<RegistrationPanel showToast={() => {}} />);
    expect(screen.getByText(/التسجيل متوقف مؤقتاً/)).toBeInTheDocument();
  });
});
