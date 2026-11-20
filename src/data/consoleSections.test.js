import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CONSOLE_SECTIONS, visibleItems } from './consoleSections';
import { PERMISSION_ROUTES } from '../permissions/permissionRoutes';
import {
  DEFERRED_PERMISSION_KEYS,
  DISABLED_PERMISSION_KEYS,
} from '../permissions/catalog';

const OWNER_ROOM_TABS = (() => {
  const src = readFileSync('src/pages/OwnerPrivateRoom.jsx', 'utf8');
  const block = src.slice(src.indexOf('const tabs = ['), src.indexOf(']', src.indexOf('const tabs = [')));
  return [...block.matchAll(/id: '([a-z]+)'/g)].map((m) => m[1]);
})();

const APP_ROUTES = (() => {
  const src = readFileSync('src/App.jsx', 'utf8');
  return new Set([...src.matchAll(/path="(\/[^"*]*)"|path='(\/[^'*]*)'/g)].map((m) => m[1] || m[2]));
})();

const allItems = CONSOLE_SECTIONS.flatMap((s) => s.items);

describe('خريطة غرفة القيادة — لا تكرار ولا بند بلا هدف', () => {
  it('«نظرة عامة» قسم واحد وهدف تبويب واحد فقط', () => {
    expect(CONSOLE_SECTIONS.filter((s) => s.title === 'نظرة عامة')).toHaveLength(1);
    const overviewTargets = allItems.filter((i) => i.target?.tab === 'overview');
    expect(overviewTargets).toHaveLength(1);
  });

  it('لا يوجد معرّف بند مكرر بين الأقسام', () => {
    const ids = allItems.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('لا يوجد عنوان قسم مكرر', () => {
    const titles = CONSOLE_SECTIONS.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('كل بند له هدف حقيقي موجود فعلاً', () => {
    allItems.forEach((item) => {
      expect(item.target, `بند بلا هدف: ${item.id}`).toBeTruthy();
      if (item.target.kind === 'tab') {
        expect(OWNER_ROOM_TABS, `تبويب غير موجود: ${item.target.tab}`).toContain(item.target.tab);
      } else {
        expect(APP_ROUTES.has(item.target.path), `مسار غير موجود: ${item.target.path}`).toBe(true);
      }
    });
  });

  it('لا بند يعتمد على صلاحية مؤجلة أو معطّلة', () => {
    allItems.forEach((item) => {
      if (!item.perm) return;
      expect(DEFERRED_PERMISSION_KEYS.has(item.perm), `مؤجلة: ${item.perm}`).toBe(false);
      expect(DISABLED_PERMISSION_KEYS.has(item.perm), `معطّلة: ${item.perm}`).toBe(false);
    });
  });

  it('كل مفتاح له وجهة عمل في خريطة الصلاحيات', () => {
    allItems.filter((i) => i.perm).forEach((item) => {
      expect(PERMISSION_ROUTES[item.perm], `بلا وجهة: ${item.perm}`).toBeTruthy();
    });
  });

  it('بند إعدادات الموقع عام ويظهر للجميع', () => {
    const settings = allItems.find((i) => i.target?.path === '/settings');
    expect(settings.publicItem).toBe(true);
    const section = CONSOLE_SECTIONS.find((s) => s.items.includes(settings));
    expect(visibleItems(section, { can: () => false, isOwner: false })).toHaveLength(1);
  });

  it('بند غرفة صاحب الموقع لا يظهر لغير المالك', () => {
    const owner = allItems.find((i) => i.target?.path === '/owner-private-room');
    expect(owner.ownerOnly).toBe(true);
    const section = CONSOLE_SECTIONS.find((s) => s.items.includes(owner));
    const asAdmin = visibleItems(section, { can: () => true, isOwner: false });
    expect(asAdmin.some((i) => i.id === 'ownerroom')).toBe(false);
    const asOwner = visibleItems(section, { can: () => true, isOwner: true });
    expect(asOwner.some((i) => i.id === 'ownerroom')).toBe(true);
  });

  it('المشرف لا يحصل على أي بند هدفه تبويب في غرفة المالك', () => {
    // /owner-private-room مقيّد بدور owner، فأي تبويب فيه زر بلا وظيفة للمشرف.
    CONSOLE_SECTIONS.forEach((section) => {
      visibleItems(section, { can: () => true, isOwner: false }).forEach((item) => {
        expect(item.target.kind, `بند تبويب مكشوف للمشرف: ${item.id}`).not.toBe('tab');
      });
    });
  });
});
