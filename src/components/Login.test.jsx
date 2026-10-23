import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { AuthProvider } from '../context/AuthContext';
import Login from './Login';
import useStore from '../store/useStore';

vi.mock('../store/useStore', () => {
  const sendOtp = vi.fn(() => Promise.resolve({ success: true }));
  const store = { sendOtp };
  return {
    __esModule: true,
    default: vi.fn(() => store),
  };
});

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );

const openHiddenModal = () => {
  const trigger = screen.getByRole('button', { name: 'دخول مخفي' });
  fireEvent.click(trigger);
  fireEvent.click(trigger);
  fireEvent.click(trigger);
};

describe('الدخول المخفي بالرمز السري', () => {
  it('يفتح مودالاً مكتفياً ذاتياً فيه بريد وكلمة مرور ورمز سري', () => {
    renderLogin();
    expect(screen.queryByPlaceholderText('الرمز السري')).toBeNull();

    openHiddenModal();

    expect(screen.getByPlaceholderText('البريد الإلكتروني')).toBeTruthy();
    expect(screen.getByPlaceholderText('كلمة المرور')).toBeTruthy();
    expect(screen.getByPlaceholderText('الرمز السري')).toBeTruthy();
  });

  it('يسحب قيم النموذج الرئيسي إلى داخل المودال مبدئياً', () => {
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('example@mail.com'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••'), {
      target: { value: 'Passw0rd!' },
    });

    openHiddenModal();

    expect(screen.getByPlaceholderText('البريد الإلكتروني').value).toBe(
      'owner@example.com'
    );
    expect(screen.getByPlaceholderText('كلمة المرور').value).toBe('Passw0rd!');
  });

  it('يطلب تعبئة الخانات داخل المودال قبل المتابعة', async () => {
    renderLogin();
    openHiddenModal();

    const form = screen.getByPlaceholderText('الرمز السري').closest('form');
    fireEvent.submit(form);

    expect(
      await screen.findByText('أدخل البريد وكلمة المرور والرمز السري')
    ).toBeTruthy();
  });

  it('يرفض الرمز السري الخاطئ ويمسحه دون مغادرة المودال', async () => {
    renderLogin();
    openHiddenModal();

    fireEvent.change(screen.getByPlaceholderText('البريد الإلكتروني'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('كلمة المرور'), {
      target: { value: 'Passw0rd!' },
    });
    const codeInput = screen.getByPlaceholderText('الرمز السري');
    fireEvent.change(codeInput, { target: { value: 'wrong-code' } });

    const form = codeInput.closest('form');
    fireEvent.submit(form);

    expect(await screen.findByText('الرمز السري غير صحيح')).toBeTruthy();
    expect(codeInput.value).toBe('');
  });
});

describe('بطاقتا اختيار الدور', () => {
  it('ضغطة بطاقة صاحب الموقع تخصص العنوان وتنقل التركيز لخانة البريد', async () => {
    renderLogin();

    fireEvent.click(
      screen.getByRole('button', { name: 'دخول صاحب موقع “المسيمير | ALMUSAYMIR”' })
    );

    expect(screen.getByText('دخول صاحب الموقع')).toBeTruthy();
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByPlaceholderText('example@mail.com')
      );
    });
  });

  it('ضغطة بطاقة المشرفين تخصص العنوان وتنقل التركيز لخانة البريد', async () => {
    renderLogin();

    fireEvent.click(
      screen.getByRole('button', { name: 'دخول المشرفين والمراقبين' })
    );

    expect(screen.getByText('دخول المشرفين')).toBeTruthy();
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByPlaceholderText('example@mail.com')
      );
    });
  });
});

describe('الدخول الرسمي لإيميلات المالك', () => {
  it('يوجّه العضو غير الموثّق إلى إثبات الملكية بدل فتح الموقع (بلا بوابة OTP)', async () => {
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('example@mail.com'), {
      target: { value: 'f882771f@gmail.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••'), {
      target: { value: 'AnyPass123' },
    });

    const form = screen
      .getByPlaceholderText('example@mail.com')
      .closest('form');
    fireEvent.submit(form);

    // أُزيلت بوابة OTP: تُرسل Firebase رسالة توثيق البريد ولا يُفتح الموقع
    // حتى تُضغط. لا مودال كود تحقق بعد الآن.
    await waitFor(() => {
      expect(screen.queryByText('أدخل كود التحقق')).toBeNull();
    });
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe('سجل التشخيص وإصدار الواجهة لا يظهران في الواجهة إطلاقاً', () => {
  it('يخفي إصدار الواجهة وسجل التشخيص في الوضع المحايد (زائر)', () => {
    renderLogin();
    expect(screen.queryByText(/إصدار الواجهة/)).toBeNull();
    expect(screen.queryByText(/سجل التشخيص/)).toBeNull();
  });

  it('يخفي إصدار الواجهة وسجل التشخيص عند اختيار بطاقة المشرفين', () => {
    renderLogin();
    const adminCard = screen.getByText('دخول المشرفين والمراقبين');
    fireEvent.click(adminCard);
    expect(screen.queryByText(/إصدار الواجهة/)).toBeNull();
    expect(screen.queryByText(/سجل التشخيص/)).toBeNull();
  });

  it('يبقى سجل التشخيص في الـConsole فقط حتى لصاحب الموقع (لا يُعرض في الواجهة)', () => {
    sessionStorage.setItem(
      'rooz_kick_log',
      JSON.stringify([
        { at: new Date().toISOString(), reason: 'no-session', path: '/about' },
      ])
    );
    renderLogin();
    const ownerCard = screen.getByText(/دخول صاحب موقع/);
    fireEvent.click(ownerCard);
    // لوحة التشخيص أُزيلت من الواجهة نهائياً — لا تظهر لأي دور.
    expect(screen.queryByText(/إصدار الواجهة/)).toBeNull();
    expect(
      screen.queryByText(
        'سجل التشخيص — آخر أسباب الرجوع لصفحة الدخول:'
      )
    ).toBeNull();
  });
});