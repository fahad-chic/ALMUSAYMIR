// اختبار زر تعديل النص: للمالك فقط — لا يراه الزائر ولا المشرف.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockAuth = { userRole: null, isAuthenticated: false, user: null };

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

import OwnerTextEdit from './OwnerTextEdit';
import useSiteTexts from '../store/useSiteTexts';

describe('OwnerTextEdit — الزر للمالك فقط', () => {
  beforeEach(() => {
    mockAuth.userRole = null;
    mockAuth.isAuthenticated = false;
    useSiteTexts.setState({ texts: {} });
  });

  it('لا يعرض الزر للزائر (غير موثّق)', () => {
    render(<OwnerTextEdit textKey="home.hero_sub" defaultValue="نص" />);
    expect(screen.queryByLabelText('تعديل النص')).toBeNull();
  });

  it('لا يعرض الزر لمشرف حتى لو كان موثّقاً', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.userRole = 'admin';
    render(<OwnerTextEdit textKey="home.hero_sub" defaultValue="نص" />);
    expect(screen.queryByLabelText('تعديل النص')).toBeNull();
  });

  it('يعرض الزر للمالك', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.userRole = 'owner';
    render(<OwnerTextEdit textKey="home.hero_sub" defaultValue="نص" />);
    expect(screen.getByLabelText('تعديل النص')).toBeInTheDocument();
  });

  it('لا يعرض شيئاً بلا مفتاح نص', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.userRole = 'owner';
    const { container } = render(<OwnerTextEdit textKey="" defaultValue="نص" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('يفتح المحرر بقيمة النص المحفوظة وليس الافتراضية', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.userRole = 'owner';
    useSiteTexts.setState({ texts: { 'home.hero_sub': 'نص مخصص' } });

    render(<OwnerTextEdit textKey="home.hero_sub" defaultValue="نص افتراضي" />);
    fireEvent.click(screen.getByLabelText('تعديل النص'));

    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe('نص مخصص');
  });
});
