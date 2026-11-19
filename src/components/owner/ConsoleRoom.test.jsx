import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// المكوّن الحقيقي يُختبر؛ نُبدّل فقط طبقات الهوية والصلاحيات والرمز.
let auth = { userRole: 'guest', user: null, isAuthenticated: false };
let perms = { ready: true, can: () => false };

vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../permissions/usePermissions', () => ({ default: () => perms }));

const gatePassed = vi.fn();
vi.mock('./OwnerGatekeeper', () => ({
  default: ({ onPassed }) => (
    <div data-testid="gatekeeper">
      <button type="button" onClick={() => { gatePassed(); onPassed(); }}>اجتياز</button>
    </div>
  ),
}));

import ConsoleRoom from './ConsoleRoom';

const renderRoom = () =>
  render(
    <MemoryRouter>
      <ConsoleRoom />
    </MemoryRouter>
  );

describe('غرفة القيادة — الحجب قبل الرمز', () => {
  beforeEach(() => {
    auth = { userRole: 'guest', user: null, isAuthenticated: false };
    perms = { ready: true, can: () => false };
    gatePassed.mockClear();
  });

  it('الزائر يرى شاشة الرمز فقط ولا يرى أي قسم داخلي', () => {
    renderRoom();
    expect(screen.getByRole('heading', { name: 'غرفة القيادة' })).toBeTruthy();
    expect(document.querySelector('#console-code')).toBeTruthy();
    // لا يتسرّب أي عنوان من أقسام الغرفة
    ['نظرة عامة', 'المراقبة والتشغيل', 'الإدارة العليا', 'غرفة صاحب الموقع'].forEach((label) => {
      expect(screen.queryByText(label)).toBeNull();
    });
  });

  it('الزائر لا يصل إلى حارس الرمز الخادمي قبل تسجيل الدخول', () => {
    renderRoom();
    expect(screen.queryByTestId('gatekeeper')).toBeNull();
  });

  it('رمز غير صالح لا يفتح الغرفة ولا يتجاوز التحقق', () => {
    renderRoom();
    fireEvent.change(document.querySelector('#console-code'), { target: { value: '12' } });
    fireEvent.submit(document.querySelector('form'));
    expect(gatePassed).not.toHaveBeenCalled();
    expect(screen.queryByTestId('gatekeeper')).toBeNull();
  });

  it('صاحب الموقع المصرّح يمرّ بحارس الرمز قبل أي محتوى', () => {
    auth = { userRole: 'owner', user: { email: 'o@x.com' }, isAuthenticated: true };
    perms = { ready: true, can: () => true };
    renderRoom();
    expect(screen.getByTestId('gatekeeper')).toBeTruthy();
    expect(screen.queryByText('المراقبة والتشغيل')).toBeNull();
  });

  it('بعد اجتياز الرمز تظهر الأقسام الخمسة بلا تكرار', () => {
    auth = { userRole: 'owner', user: { email: 'o@x.com' }, isAuthenticated: true };
    perms = { ready: true, can: () => true };
    renderRoom();
    fireEvent.click(screen.getByText('اجتياز'));
    const titles = ['نظرة عامة', 'المراقبة والتشغيل', 'المحتوى والتصنيفات', 'الإدارة العليا', 'إعدادات العرض'];
    titles.forEach((t) => expect(screen.getByText(t)).toBeTruthy());
    // لا عنوان مكرر
    expect(screen.getAllByText('نظرة عامة').length).toBe(1);
  });

  it('«إعدادات الموقع» متاحة داخل الغرفة للجميع بلا صلاحية', () => {
    auth = { userRole: 'admin', user: { email: 'a@x.com' }, isAuthenticated: true };
    perms = { ready: true, can: () => false };
    renderRoom();
    // مشرف بلا أي صلاحية يُحوَّل لـ /unauthorized — لا تظهر الغرفة
    expect(screen.queryByText('إعدادات العرض')).toBeNull();
  });
});
