// يثبت أن صفوف الأزرار الطويلة تلفّ (flex-wrap: wrap) فلا يخرج زر عن الشاشة
// عند 320px: «أضف تعليقك هنا» كان يبدأ عند -70px و«تواصل» في بطاقة الحراج عند -13px.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../firebase/config', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection: () => ({}),
  addDoc: async () => ({}),
  setDoc: async () => ({}),
  doc: () => ({}),
  onSnapshot: () => () => {},
  query: () => ({}),
  orderBy: () => ({}),
  where: () => ({}),
  serverTimestamp: () => 0,
}));

import CommentsSection from './CommentsSection';

const flexWrapOf = (el) => getComputedStyle(el).flexWrap;

describe('صف آراء العملاء يلفّ على الجوال', () => {
  it('صف الرأس يستخدم flex-wrap: wrap', () => {
    render(<CommentsSection />);
    const button = screen.getByRole('button', { name: /أضف تعليقك هنا/ });
    const row = button.parentElement;
    expect(flexWrapOf(row)).toBe('wrap');
  });
});
