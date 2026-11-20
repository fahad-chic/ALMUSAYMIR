// يثبت سلوك ❌ في نافذة «إضافة إعلان» (بنرات المحتوى): الإلغاء يُبقي الصورة
// في مسودة الجلسة فتُستعاد عند إعادة الفتح، والحفظ وحده يمسحها.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { readImageDraft, saveImageDraft } from '../../utils/imageDraft';

vi.mock('../../firebase', () => ({
  db: {},
  COLLECTIONS: { BANNERS: 'banners' },
  getCategories: async () => [],
  addCategory: async () => {},
  collection: () => ({}),
  getDocs: async () => ({ forEach: () => {}, docs: [] }),
  doc: () => ({}),
  addDoc: async () => ({}),
  deleteDoc: async () => {},
  onSnapshot: () => () => {},
  serverTimestamp: () => 0,
}));

vi.mock('../../permissions/usePermissions', () => ({ default: () => ({ can: () => true }) }));
vi.mock('../../permissions/rbacService', () => ({ requirePerm: async () => {} }));
vi.mock('../../permissions/audit', () => ({ writeAuditLog: async () => {} }));
vi.mock('../../utils/toast', () => ({ default: { error: () => {}, success: () => {} } }));

import { BannersManager } from './ContentPanels';

const DRAFT = 'data:image/png;base64,BANNER';

const renderPanel = () => render(<BannersManager />);

describe('نافذة إضافة بنر — ❌ لا يُلغي مسودة الصورة', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    saveImageDraft('banner-new', DRAFT);
  });

  it('الإلغاء ثم إعادة الفتح يعرض الصورة المحفوظة', async () => {
    const { unmount } = renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /إضافة إعلان/ }));

    const preview = await screen.findByAltText(/معاينة/);
    expect(preview.getAttribute('src')).toBe(DRAFT);

    // ❌ = إغلاق بلا حفظ: المسودة تبقى
    fireEvent.click(screen.getByRole('button', { name: /إلغاء/ }));
    await waitFor(() => expect(screen.queryByAltText(/معاينة/)).toBe(null));
    expect(readImageDraft('banner-new')).toBe(DRAFT);

    unmount();
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /إضافة إعلان/ }));
    const again = await screen.findByAltText(/معاينة/);
    expect(again.getAttribute('src')).toBe(DRAFT);
  });
});
