// اختبار حقيقي لنظام التحكم الكامل بالمحتوى:
//   - الزائر/المشرف: لا يرى أي زر تحكم ولا أثر له.
//   - المالك: يرى زرّي تعديل وحذف، والحفظ/الحذف يكتبان فعلاً في settings/siteContent.
//   - العنصر المحذوف يختفي عن الزائر ويظهر شارة استرجاع للمالك.
//   - القوائم: إضافة/تعديل/حذف/ترتيب تُحفظ فعلاً.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockAuth = { userRole: null, isAuthenticated: false, user: null };
vi.mock('../context/AuthContext', () => ({ useAuth: () => mockAuth }));

const setDoc = vi.fn(() => Promise.resolve());
const onSnapshot = vi.fn(() => vi.fn());
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, ...path) => ({ path })),
  setDoc: (...a) => setDoc(...a),
  onSnapshot: (...a) => onSnapshot(...a),
  deleteField: vi.fn(() => ({ __deleteField: true })),
}));

import Editable from './Editable';
import useSiteContent, {
  setSiteText,
  hideSiteItem,
  showSiteItem,
  setSiteList,
  startSiteContentSync,
} from '../store/useSiteContent';

const resetStore = () =>
  useSiteContent.setState({ texts: {}, hidden: {}, lists: {}, loaded: false, saving: false, error: null });

describe('Editable — أزرار التحكم للمالك فقط', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.userRole = null;
    mockAuth.isAuthenticated = false;
    resetStore();
  });

  it('الزائر يرى النص فقط بلا أي زر تحكم', () => {
    render(<Editable contentKey="home.hero_sub" defaultValue="نص الزائر" />);
    expect(screen.getByText('نص الزائر')).toBeInTheDocument();
    expect(screen.queryByLabelText('تعديل')).toBeNull();
    expect(screen.queryByLabelText('حذف')).toBeNull();
  });

  it('المشرف الموثّق لا يرى أزرار التحكم', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.userRole = 'admin';
    render(<Editable contentKey="home.hero_sub" defaultValue="نص" />);
    expect(screen.queryByLabelText('تعديل')).toBeNull();
    expect(screen.queryByLabelText('حذف')).toBeNull();
  });

  it('المالك يرى زرّي تعديل وحذف', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.userRole = 'owner';
    render(<Editable contentKey="home.hero_sub" defaultValue="نص" />);
    expect(screen.getByLabelText('تعديل')).toBeInTheDocument();
    expect(screen.getByLabelText('حذف')).toBeInTheDocument();
  });

  it('الحفظ الفعلي يكتب النص في Firestore ويحدّث العرض', async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.userRole = 'owner';
    render(<Editable contentKey="home.hero_sub" defaultValue="قديم" />);

    fireEvent.click(screen.getByLabelText('تعديل'));
    const box = screen.getByRole('textbox');
    fireEvent.change(box, { target: { value: 'نص جديد' } });
    fireEvent.click(screen.getByText(/حفظ/));

    await waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1));
    const payload = setDoc.mock.calls[0][1];
    expect(payload.texts['home.hero_sub']).toBe('نص جديد');
    await waitFor(() =>
      expect(useSiteContent.getState().texts['home.hero_sub']).toBe('نص جديد')
    );
  });

  it('الحذف الفعلي يضع hidden=true في Firestore', async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.userRole = 'owner';
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Editable contentKey="home.hero_sub" defaultValue="نص" />);

    fireEvent.click(screen.getByLabelText('حذف'));
    await waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1));
    expect(setDoc.mock.calls[0][1].hidden['home.hero_sub']).toBe(true);
    await waitFor(() => expect(useSiteContent.getState().hidden['home.hero_sub']).toBe(true));
  });

  it('العنصر المحذوف يختفي عن الزائر تماماً', () => {
    useSiteContent.setState({ hidden: { 'home.hero_sub': true } });
    const { container } = render(<Editable contentKey="home.hero_sub" defaultValue="نص" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('العنصر المحذوف يظهر للمالك كشارة قابلة للاسترجاع', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.userRole = 'owner';
    useSiteContent.setState({ hidden: { 'home.hero_sub': true } });
    render(<Editable contentKey="home.hero_sub" defaultValue="نص" />);
    expect(screen.getByText('عنصر محذوف')).toBeInTheDocument();
    expect(screen.getByLabelText('استرجاع العنصر')).toBeInTheDocument();
  });

  it('controlsOnly لا يعرض النص للزائر (فقط للمالك يظهر الزر)', () => {
    const { container } = render(
      <Editable controlsOnly contentKey="home.marquee" defaultValue="شريط" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('useSiteContent — عمليات الحفظ الحقيقية', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  it('setSiteText يكتب في settings/siteContent ويحدّث المخزن', async () => {
    await setSiteText('faq.page_title', 'عنوان مخصص');
    expect(setDoc).toHaveBeenCalledTimes(1);
    const [ref, payload, opts] = setDoc.mock.calls[0];
    expect(ref.path).toEqual(['settings', 'siteContent']);
    expect(payload.texts['faq.page_title']).toBe('عنوان مخصص');
    expect(opts).toEqual({ merge: true });
    expect(useSiteContent.getState().texts['faq.page_title']).toBe('عنوان مخصص');
  });

  it('hideSiteItem ثم showSiteItem يخفي ويستعيد', async () => {
    await hideSiteItem('home.trust.0.title');
    expect(useSiteContent.getState().hidden['home.trust.0.title']).toBe(true);

    await showSiteItem('home.trust.0.title');
    expect(useSiteContent.getState().hidden['home.trust.0.title']).toBe(false);
  });

  it('setSiteList يحفظ قائمة كاملة (إضافة عنصر)', async () => {
    const items = [{ id: 'a', q: 'س1', a: 'ج1' }, { id: 'b', q: 'س2', a: 'ج2' }];
    await setSiteList('faq.items', items);
    expect(useSiteContent.getState().lists['faq.items']).toEqual(items);
    expect(setDoc.mock.calls[0][1].lists['faq.items']).toEqual(items);
  });

  it('startSiteContentSync يشترك مرة واحدة فقط ويطبّق اللقطة', () => {
    startSiteContentSync();
    startSiteContentSync();
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    const cb = onSnapshot.mock.calls[0][1];
    cb({ exists: () => true, data: () => ({ texts: { x: 'y' }, hidden: {}, lists: {} }) });
    expect(useSiteContent.getState().texts.x).toBe('y');
    expect(useSiteContent.getState().loaded).toBe(true);
  });
});
