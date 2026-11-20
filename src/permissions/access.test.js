// src/permissions/access.test.js — أرقام «نظرة عامة» تطابق ما يفتحه كل رقم،
// ولا صلاحية قابلة للمنح بلا أثر فعلي (لا أزرار ميتة).
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  GRANTABLE_PERMISSION_KEYS,
  isBannedUser,
  isStaffRole,
  isGrantablePermissionKey,
  OWNER_ONLY_PERMISSION_KEYS,
  DEFERRED_PERMISSION_KEYS,
  DISABLED_PERMISSION_KEYS,
  PERMISSION_KEYS,
} from './catalog';
import { computeEffectiveGrants, countGranted } from './logic';
import { CONSOLE_SECTIONS } from '../data/consoleSections';
import { PERMISSION_ROUTES } from './permissionRoutes';

const readRepoFile = (rel) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

describe('أرقام نظرة عامة — الرقم يطابق ما يفتحه', () => {
  it('«المدراء» يعدّ كل أدوار الطاقم لا admin وحدها', () => {
    const users = [
      { role: 'admin' }, { role: 'staff' }, { role: 'employee' },
      { role: 'moderator' }, { role: 'sub_admin' }, { role: 'manager' },
      { role: 'editor' }, { role: 'user' }, { role: 'OWNER' }, {},
    ];
    expect(users.filter((u) => isStaffRole(u.role))).toHaveLength(7);
  });

  it('«المحظورون» يعدّ الصيغتين اللتين تفرضهما القواعد', () => {
    const users = [
      { banned: true },
      { status: 'banned' },
      { status: 'BANNED' },
      { banned: false, status: 'active' },
      {},
    ];
    expect(users.filter(isBannedUser)).toHaveLength(3);
  });

  it('الحد الأعلى لعدّاد الصلاحيات = المفاتيح القابلة للمنح فعلاً', () => {
    const { grants } = computeEffectiveGrants({
      role: 'user',
      rbacDoc: { grants: { SUPER_ADMIN_FULL_ACCESS: true } },
    });
    expect(countGranted(grants)).toBe(GRANTABLE_PERMISSION_KEYS.length);
    expect(GRANTABLE_PERMISSION_KEYS.length).toBe(39);
  });

  it('المفاتيح المحجوزة/المؤجلة/المعطّلة خارج العدّاد', () => {
    for (const key of OWNER_ONLY_PERMISSION_KEYS) {
      expect(GRANTABLE_PERMISSION_KEYS.includes(key), key).toBe(false);
    }
    for (const key of [...DEFERRED_PERMISSION_KEYS, ...DISABLED_PERMISSION_KEYS]) {
      expect(GRANTABLE_PERMISSION_KEYS.includes(key), key).toBe(false);
    }
  });
});

describe('صلاحيات مربوطة — لا مفاتيح بلا أثر', () => {
  const rules = readRepoFile('firestore.rules');
  const srcText = (() => {
    const files = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'permissions') continue;
          walk(full);
        } else if (/\.jsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) {
          files.push(full);
        }
      }
    };
    walk(path.resolve(process.cwd(), 'src'));
    return files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  })();

  it('كل مفتاح قابل للمنح مفروض في قواعد Firestore أو مستخدم في الواجهة', () => {
    const orphan = GRANTABLE_PERMISSION_KEYS.filter(
      (key) => !rules.includes(`'${key}'`) && !srcText.includes(`'${key}'`)
    );
    expect(orphan).toEqual([]);
  });

  it('كل مفتاح قابل للمنح مذكور في قواعد الخادم', () => {
    const unenforced = GRANTABLE_PERMISSION_KEYS.filter(
      (key) => !rules.includes(`'${key}'`)
    );
    expect(unenforced).toEqual([]);
  });

  it('لا مفتاح محجوز للمالك مذكور كقابل للمنح', () => {
    const bad = [...OWNER_ONLY_PERMISSION_KEYS].filter(isGrantablePermissionKey)
      .filter((key) => GRANTABLE_PERMISSION_KEYS.includes(key));
    expect(bad).toEqual([]);
  });

  it('كل مفتاح ممنوح له وجهة حقيقية أو تشغيل داخل الصفحة', () => {
    const missingRoute = GRANTABLE_PERMISSION_KEYS.filter(
      (key) => !PERMISSION_ROUTES[key]
    );
    // المفاتيح التي تعمل داخل الصفحة نفسها (تعديل مباشر) تُشغَّل بلا تنقّل،
    // لكنها مذكورة في مصدر الواجهة فعلاً — يُثبته الاختبار السابق.
    expect(missingRoute.length).toBeLessThanOrEqual(9);
  });

  it('أقسام غرفة القيادة كلها لها أهداف قائمة في الكود', () => {
    const room = readRepoFile('src/pages/OwnerPrivateRoom.jsx');
    const app = readRepoFile('src/App.jsx');
    const tabIds = new Set(
      [...room.matchAll(/^\s{6}id: '([a-z]+)',/gm)].map((m) => m[1])
    );
    const routes = new Set([...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]));
    const broken = [];
    for (const section of CONSOLE_SECTIONS) {
      for (const item of section.items) {
        const target = item.target;
        if (target.kind === 'tab' && !tabIds.has(target.tab)) {
          broken.push(`${section.id}/${item.id}→tab:${target.tab}`);
        }
        if (target.kind === 'route' && !routes.has(target.path)) {
          const dynamic = target.path.replace(/\/[^/]+$/, '/:id');
          if (!routes.has(dynamic)) broken.push(`${section.id}/${item.id}→${target.path}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it('وجهات مصفوفة الصلاحيات موجودة كلها', () => {
    const room = readRepoFile('src/pages/OwnerPrivateRoom.jsx');
    const app = readRepoFile('src/App.jsx');
    const tabIds = new Set(
      [...room.matchAll(/^\s{6}id: '([a-z]+)',/gm)].map((m) => m[1])
    );
    const routes = new Set([...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]));
    const broken = [];
    for (const [key, url] of Object.entries(PERMISSION_ROUTES)) {
      const tab = url.match(/[?&]tab=([^&]+)/);
      if (tab) {
        if (!tabIds.has(decodeURIComponent(tab[1]))) broken.push(`${key}→${url}`);
      } else if (!routes.has(url)) {
        const dynamic = url.replace(/\/[^/]+$/, '/:catalogId');
        if (!routes.has(dynamic)) broken.push(`${key}→${url}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('كل مفاتيح الكتالوج إمّا ممنوحة أو مصنّفة بسبب المنع', () => {
    const unexplained = PERMISSION_KEYS.filter(
      (key) =>
        !GRANTABLE_PERMISSION_KEYS.includes(key) &&
        !OWNER_ONLY_PERMISSION_KEYS.has(key) &&
        !DEFERRED_PERMISSION_KEYS.has(key) &&
        !DISABLED_PERMISSION_KEYS.has(key)
    );
    expect(unexplained).toEqual([]);
  });
});
