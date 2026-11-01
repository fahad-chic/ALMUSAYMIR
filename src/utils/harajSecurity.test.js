// اختبار مساعد أمان الحراج: يوثّق في security_logs وينبّه المالك، ولا يرمي
// عند الفشل (فلا يكسر إجراء التسجيل/الدخول).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addDoc } from 'firebase/firestore';
import { notifyOwner } from './visitorNotify';
import { logHarajDuplicate, logHarajLoginMismatch } from './harajSecurity';

vi.mock('./visitorNotify', () => ({
  notifyOwner: vi.fn(() => Promise.resolve()),
}));

describe('harajSecurity', () => {
  beforeEach(() => {
    addDoc.mockClear();
    notifyOwner.mockClear();
  });

  it('logHarajDuplicate يكتب security_logs وينبّه المالك', async () => {
    await logHarajDuplicate({ uid: 'u1', email: 'a@b.com', phone: '0555' });
    expect(addDoc).toHaveBeenCalledTimes(1);
    const payload = addDoc.mock.calls[0][1];
    expect(payload.type).toBe('haraj_duplicate_profile');
    expect(payload.severity).toBe('high');
    expect(payload.actorUid).toBe('u1');
    expect(notifyOwner).toHaveBeenCalledTimes(1);
  });

  it('logHarajLoginMismatch يوثّق صاحب الرقم الأصلي', async () => {
    await logHarajLoginMismatch({ uid: 'u2', phone: '0555', ownerAuthUid: 'u9' });
    const payload = addDoc.mock.calls[0][1];
    expect(payload.type).toBe('haraj_login_phone_mismatch');
    expect(payload.ownerAuthUid).toBe('u9');
    expect(notifyOwner).toHaveBeenCalledTimes(1);
  });

  it('لا يرمي إن فشلت الكتابة (مقاوم للفشل)', async () => {
    addDoc.mockRejectedValueOnce(new Error('offline'));
    await expect(logHarajDuplicate({ uid: 'u3' })).resolves.toBeUndefined();
  });
});
