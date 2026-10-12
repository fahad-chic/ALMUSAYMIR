// اختبار تفاعلي لقائمة امتيازات المالك: البديل الجديد لزر «العين».
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Crown, Users, Eye, Megaphone } from 'lucide-react';
import OwnerConsoleMenu from './OwnerConsoleMenu';

const tabs = [
  { id: 'monitoring', label: 'المراقبة', icon: Eye },
  { id: 'permissions', label: 'مصفوفة الصلاحيات', icon: Crown },
  { id: 'broadcast', label: 'التنبيهات والبث', icon: Megaphone },
  { id: 'users', label: 'المستخدمين', icon: Users },
];

describe('OwnerConsoleMenu', () => {
  it('لا يعرض القائمة قبل الضغط', () => {
    render(<OwnerConsoleMenu tabs={tabs} activeId="monitoring" onSelect={() => {}} triggerLabel="امتيازات المالك" />);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('يفتح القائمة ويدعو onSelect عند اختيار قسم', () => {
    const onSelect = vi.fn();
    render(<OwnerConsoleMenu tabs={tabs} activeId="monitoring" onSelect={onSelect} triggerLabel="امتيازات المالك" />);

    fireEvent.click(screen.getByRole('button', { name: /امتيازات المالك/ }));
    const menu = screen.getByRole('menu');
    // الخيار المحدد حالياً يجب أن يكون معلّماً
    expect(within(menu).getByText('المراقبة').closest('.ocm-item').className).toContain('is-active');

    fireEvent.click(within(menu).getByText('التنبيهات والبث').closest('.ocm-item'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].id).toBe('broadcast');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('لكل خيار زر إغلاق يستبعد الخيار ويغلق القائمة', () => {
    const onSelect = vi.fn();
    render(<OwnerConsoleMenu tabs={tabs} activeId="monitoring" onSelect={onSelect} triggerLabel="امتيازات المالك" />);

    fireEvent.click(screen.getByRole('button', { name: /امتيازات المالك/ }));
    const menu = screen.getByRole('menu');
    const closeButtons = within(menu).getAllByRole('button', { name: /إغلاق القائمة/ });
    // زر إغلاق واحد في الرأس + زر لكل خيار
    expect(closeButtons).toHaveLength(tabs.length + 1);

    fireEvent.click(closeButtons[1]);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('يغلق القائمة بمفتاح Escape', () => {
    render(<OwnerConsoleMenu tabs={tabs} activeId="monitoring" onSelect={() => {}} triggerLabel="امتيازات المالك" />);
    fireEvent.click(screen.getByRole('button', { name: /امتيازات المالك/ }));
    expect(screen.getByRole('menu')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });
});