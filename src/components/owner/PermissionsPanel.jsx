// src/components/owner/PermissionsPanel.jsx — مصفوفة الصلاحيات المجهرية
// تبويب داخل غرفة صاحب الموقع: حسابات المالك فقط (البريدان المعتمدان)
// ثم 7 أقسام، كل صلاحية بمفتاح تفعيل/تعطيل (Toggle) مع زر تعديل/حفظ.
// الكتابة على rbac/{uid} مقيّدة بالقواعد للمالك فقط — أي تلاعب من حساب آخر يرفضه الخادم ويُسجَّل.
import { useEffect, useMemo, useState } from 'react';
import {
  Crown, Users, ShoppingBag, Database, UserCheck, Eye, Pencil,
  Shield, Snowflake, Sun, Check, X, Info,
  Settings, Wrench, LockOpen, ListChecks, Code, RefreshCw,
  Timer, Ban, Unlock, UserX, LogOut, BadgeCheck, Fingerprint,
  Trash2, RotateCcw, PencilLine, CheckCircle2, Star, MessageSquareOff,
  PenLine, ArrowLeftRight, FolderUp, FolderX, BadgeDollarSign, LayoutGrid, Tags,
  UserPlus, UserCog, KeyRound, Wallet, ScrollText, Radio, Archive,
  ShieldAlert, ScanEye, Palette, CaseSensitive, Image, SlidersHorizontal,
  Box, Repeat, EyeOff, MessageSquare
} from 'lucide-react';
import * as permissionCatalog from '../../permissions/catalog';
import {
  PERMISSION_CATEGORIES,
  PERMISSIONS,
  permissionsByCategory
} from '../../permissions/catalog';
import { computeEffectiveGrants, countGranted, sanitizeGrants } from '../../permissions/logic';
import {
  getUserRbac,
  setUserGrants,
  setSuspended,
  toggleGrant,
  logPermissionAudit
} from '../../permissions/rbacService';

const OWNER_ONLY_PERMISSION_KEYS =
  permissionCatalog.OWNER_ONLY_PERMISSION_KEYS ||
  new Set([
    'MONITOR_PRIVATE_MESSAGES',
    'VIEW_SYSTEM_AUDIT_LOGS',
    'TRACK_EMPLOYEE_LIVE_SESSIONS',
    'FIREBASE_MUTATION_LOGS',
    'RECOVER_DELETED_ITEMS_ARCHIVE',
    'TRACK_FAILED_LOGINS',
    'MONITOR_USER_TRAFFIC_LIVE'
  ]);

// أيقونة مميزة لكل صلاحية على حدة — «لغة بصرية» تُميّز كل صندوق في المصفوفة
const PERMISSION_ICONS = {
  // master
  SUPER_ADMIN_FULL_ACCESS: Crown,
  UPDATE_GLOBAL_SETTINGS: Settings,
  TOGGLE_MAINTENANCE_MODE: Wrench,
  BYPASS_FIREBASE_RULES: LockOpen,
  MANAGE_NAVIGATION_MENU: ListChecks,
  CODE_SNIPPET_INJECTION: Code,
  FLUSH_SYSTEM_CACHE: RefreshCw,
  // users
  BAN_USER_TEMPORARY: Timer,
  BAN_USER_PERMANENT: Ban,
  UNBAN_USER_RESTORE: Unlock,
  BLOCK_USER_REGISTRATION: UserX,
  FORCE_LOGOUT_SESSION: LogOut,
  MANAGE_USER_VERIFICATION: BadgeCheck,
  VIEW_USER_IP_HISTORY: Fingerprint,
  // haraj
  HARAJ_POST_DELETE: Trash2,
  HARAJ_POST_RESTORE: RotateCcw,
  HARAJ_POST_FORCE_EDIT: PencilLine,
  HARAJ_POST_APPROVE: CheckCircle2,
  HARAJ_POST_FEATURE: Star,
  HARAJ_COMMENT_DELETE: MessageSquareOff,
  HARAJ_COMMENT_EDIT: PenLine,
  TRANSFER_POST_OWNERSHIP: ArrowLeftRight,
  // catalog
  CREATE_NEW_CATALOG: FolderUp,
  DELETE_MAIN_CATALOG: FolderX,
  EDIT_CATALOG_PRICING: BadgeDollarSign,
  CUSTOMIZE_CATALOG_LAYOUT: LayoutGrid,
  MANAGE_CATALOG_TAGS: Tags,
  // staff
  ADD_NEW_EMPLOYEE: UserPlus,
  EDIT_EMPLOYEE_PROFILE: UserCog,
  GRANT_SUB_ADMIN_PERMISSIONS: KeyRound,
  SUSPEND_SUB_ADMIN_ACCOUNT: Snowflake,
  VIEW_EMPLOYEE_SALARIES: Wallet,
  // spy
  MONITOR_PRIVATE_MESSAGES: MessageSquare,
  VIEW_SYSTEM_AUDIT_LOGS: ScrollText,
  TRACK_EMPLOYEE_LIVE_SESSIONS: Radio,
  FIREBASE_MUTATION_LOGS: Database,
  RECOVER_DELETED_ITEMS_ARCHIVE: Archive,
  TRACK_FAILED_LOGINS: ShieldAlert,
  MONITOR_USER_TRAFFIC_LIVE: ScanEye,
  // inline
  INLINE_TEXT_EDIT: Pencil,
  INLINE_STYLE_COLOR: Palette,
  INLINE_FONT_CUSTOMIZE: CaseSensitive,
  INLINE_IMAGE_REPLACE: Image,
  INLINE_IMAGE_DESIGN_MOD: SlidersHorizontal,
  INLINE_BOX_SHAPE_MOD: Box,
  INLINE_TICKER_CONTROL: Repeat,
  INLINE_ELEMENT_DELETE: EyeOff,
};

// لون هدية الأيقونة حسب القسم — درجات بيج وذهبي دافئة متناسقة مع خلفية var(--rz-ivory)
const CATEGORY_CHIP = {
  master: 'bg-[var(--rz-cream-5)] text-[var(--rz-slate)] border-[var(--rz-role-master-line)]',
  users: 'bg-[var(--rz-role-users-bg)] text-[var(--rz-slate)] border-[var(--rz-role-users-line)]',
  haraj: 'bg-[var(--rz-role-haraj-bg)] text-[var(--rz-slate)] border-[var(--rz-role-haraj-line)]',
  catalog: 'bg-[var(--rz-role-catalog-bg)] text-[var(--rz-slate)] border-[var(--rz-role-catalog-line)]',
  staff: 'bg-[var(--rz-role-staff-bg)] text-[var(--rz-slate)] border-[var(--rz-role-staff-line)]',
  spy: 'bg-[var(--rz-role-spy-bg)] text-[var(--rz-slate)] border-[var(--rz-role-spy-line)]',
  inline: 'bg-[var(--rz-cream-8)] text-[var(--rz-slate)] border-[var(--rz-slate-300)]',
};

// يطابق شكل الكتالوج الأصلي: cat.icon قد يكون اسم الأيقونة أو المعرف
const CATEGORY_ICONS = {
  Crown, Users, ShoppingBag, Database, UserCheck, Eye, Pencil,
  master: Crown,
  users: Users,
  haraj: ShoppingBag,
  catalog: Database,
  staff: UserCheck,
  spy: Eye,
  inline: Pencil,
};

// البريدان المعتمدان فقط — لا يظهر أي بريد آخر في النظام
const OWNER_ONLY_EMAILS = [
  'f882771f@gmail.com',
  'kal6667222@gmail.com',
];

const PermissionsPanel = ({ users = [], ownerEmail: _ownerEmail, darkMode = false }) => {
  const [target, setTarget] = useState(null);
  const [rbac, setRbac] = useState(null);
  const [loadingRbac, setLoadingRbac] = useState(false);
  const [activeCategory, setActiveCategory] = useState('master');
  const [savingKey, setSavingKey] = useState('');
  const [notice, setNotice] = useState('');

  // خلفية فاتحة دائماً + نص أسود عريض (لا أسود/كحلي للخيارات)
  const cardBg = {
    background: 'linear-gradient(165deg, var(--rz-cream-2) 0%, var(--rz-cream-4) 100%)',
    borderColor: 'rgba(var(--rz-primary-rgb), .22)',
  };
  const textMain = 'text-[var(--rz-slate)] font-extrabold';
  const textSub = 'text-[var(--rz-primary)] font-bold';
  const textMuted = 'text-[var(--rz-slate-700)] font-semibold';
  const chipInactive =
    'bg-[var(--rz-white)] text-[var(--rz-slate)] border-[var(--rz-slate-300)] hover:bg-[var(--rz-cream-8)] font-extrabold';
  const rowBgOn =
    'bg-[var(--rz-white)] border-[var(--rz-gold)]/60 shadow-sm shadow-[var(--rz-gold)]/15';
  const rowBgOff =
    'bg-[var(--rz-cream-7)] border-[var(--rz-slate-200)] hover:border-[var(--rz-gold)]/50';
  const noticeBg =
    'text-[var(--rz-slate)] bg-[var(--rz-role-active-bg)] border-[var(--rz-gold)]/50 font-extrabold';

  // حسابات المشرفين/الموظفين فقط — المالك يملك كل الصلاحيات ولا يُدار من هنا
  const staffCandidates = useMemo(() => {
    const ownerEmails = new Set(OWNER_ONLY_EMAILS.map((e) => e.toLowerCase()));
    const staffRoles = new Set(['admin', 'staff', 'employee', 'moderator', 'sub_admin', 'manager', 'editor']);
    return (Array.isArray(users) ? users : [])
      .filter((u) => {
        const email = String(u.email || '').trim().toLowerCase();
        if (!email || ownerEmails.has(email)) return false;
        const role = String(u.role || '').trim().toLowerCase();
        if (role === 'owner') return false;
        if (staffRoles.has(role)) return true;
        // أي مستخدم مسجّل يمكن منحه صلاحيات مشرف عند الحاجة
        return Boolean(u.id || u.uid);
      })
      .slice(0, 80);
  }, [users]);

  useEffect(() => {
    if (!target) {
      setRbac(null);
      return;
    }
    let alive = true;
    setLoadingRbac(true);
    getUserRbac(target.id)
      .then((docData) => {
        if (alive) setRbac(docData);
      })
      .catch(() => {
        if (alive) setRbac(null);
      })
      .finally(() => {
        if (alive) setLoadingRbac(false);
      });
    return () => {
      alive = false;
    };
  }, [target]);

  const effective = useMemo(
    () => computeEffectiveGrants({ role: target?.role, rbacDoc: rbac }),
    [target, rbac]
  );
  const grantedCount = countGranted(effective.grants);
  const rawGrants = sanitizeGrants(rbac?.grants || {});
  const suspended = rbac?.suspended === true;

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  const handleToggle = async (key, enabled) => {
    if (!target || savingKey) return;
    setSavingKey(key);
    try {
      const next = await toggleGrant(target.id, key, enabled, rawGrants);
      setRbac((prev) => ({ ...(prev || {}), grants: next }));
      flash('تم حفظ التعديل بنجاح');
    } catch {
      flash('رفض الخادم العملية — هذه العملية للمالك فقط');
    } finally {
      setSavingKey('');
    }
  };

  const handleCategoryAll = async (categoryId, enable) => {
    if (!target || savingKey) return;
    setSavingKey('bulk');
    try {
      const next = { ...rawGrants };
      for (const p of permissionsByCategory(categoryId)) {
        if (enable) next[p.key] = true;
        else delete next[p.key];
      }
      const saved = await setUserGrants(target.id, next);
      setRbac((prev) => ({ ...(prev || {}), grants: saved }));
      await logPermissionAudit(
        enable ? 'permissions_bulk_grant' : 'permissions_bulk_revoke',
        `${enable ? 'منح' : 'سحب'} كل صلاحيات قسم ${categoryId} ${enable ? 'إلى' : 'من'} ${target.email || target.id}`
      );
      flash('تم حفظ التعديل بنجاح');
    } catch {
      flash('رفض الخادم العملية');
    } finally {
      setSavingKey('');
    }
  };

  const handleSuspend = async (suspend) => {
    if (!target || savingKey) return;
    if (suspend && !window.confirm(`تجميد حساب ${target.email || target.id} فوراً وسحب كل صلاحياته؟`)) return;
    setSavingKey('suspend');
    try {
      await setSuspended(target.id, suspend);
      setRbac((prev) => ({ ...(prev || {}), suspended: suspend }));
      flash(suspend ? 'تم تجميد الحساب وسحب صلاحياته' : 'تم إعادة تفعيل الحساب');
    } catch {
      flash('رفض الخادم العملية');
    } finally {
      setSavingKey('');
    }
  };

  const categoryPerms = permissionsByCategory(activeCategory)
    .filter((permission) => !OWNER_ONLY_PERMISSION_KEYS.has(permission.key));

  return (
    <div className="space-y-5" dir="rtl" lang="ar">
      {/* ترويسة التبويب */}
      <div className="rounded-2xl p-5 border shadow-lg" style={cardBg}>
        <h3 className={`font-bold flex items-center gap-2 mb-2 ${textMain} text-base md:text-lg`}>
          <Shield size={20} className="text-[var(--rz-primary)]" />
          مصفوفة الصلاحيات المجهرية{' '}
          <span className="text-[var(--rz-primary)]">(47 صلاحية)</span>
        </h3>
        <p className={`text-sm ${textSub} leading-6 font-medium`}>
          اختر حساب مشرف أو موظف ثم شغّل أو أوقف كل صلاحية مباشرة.
          المنح تُحفظ في قاعدة البيانات وتُفرض من الخادم. حساب المالك يملك كل الصلاحيات دائماً ولا يُعدَّل هنا.
        </p>
      </div>

      {/* اختيار المشرف/الموظف لمنح الصلاحيات */}
      <div className="rounded-2xl p-5 border shadow-lg" style={cardBg}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--rz-primary)]/15 border border-[var(--rz-primary)]/30 flex items-center justify-center text-[var(--rz-primary)]">
            <UserCheck size={20} />
          </div>
          <div>
            <h4 className={`font-bold ${textMain} text-sm md:text-base`}>
              حسابات المشرفين والموظفين
            </h4>
            <p className={`text-xs ${textMuted} font-medium`}>
              اختر حساباً ثم شغّل أو أوقف الصلاحيات — المالك لا يظهر هنا
            </p>
          </div>
        </div>

        <div className="max-h-56 overflow-y-auto divide-y divide-[var(--rz-primary)]/15 rounded-xl border border-[var(--rz-primary)]/25">
          {staffCandidates.length === 0 && (
            <p className={`p-4 text-sm ${textMuted} text-center font-medium`}>
              لا توجد حسابات مشرفين أو موظفين حالياً — أضف موظفاً أولاً من قسم المستخدمين
            </p>
          )}
          {staffCandidates.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setTarget(u)}
              className={`w-full text-right px-4 py-3.5 flex items-center justify-between gap-3 transition-colors ${
                target?.id === u.id
                  ? 'bg-[var(--rz-primary)]/15 border-r-4 border-[var(--rz-primary)]'
                  : 'hover:bg-[var(--rz-primary)]/08'
              }`}
            >
              <span className="min-w-0">
                <span className={`block font-bold text-sm truncate ${textMain}`}>
                  {u.displayName || u.email || u.id}
                </span>
                <span className={`block text-xs ${textMuted} font-medium truncate`}>
                  {u.email} — {u.role || 'owner'}
                </span>
              </span>
              {target?.id === u.id && (
                <Check size={18} className="text-[var(--rz-primary)] flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* لوحة المنح للحساب المختار */}
      {target && (
        <div
          className="rounded-2xl p-5 border shadow-lg space-y-4"
          style={cardBg}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className={`font-bold text-sm md:text-base ${textMain}`}>
                {target.displayName || target.email}
              </p>
              <p
                className={`text-xs font-bold ${
                  suspended ? 'text-[var(--rz-primary)]' : 'text-[var(--rz-primary)]'
                }`}
              >
                {suspended
                  ? 'الحساب مجمّد — كل الصلاحيات مسحوبة فعلياً'
                  : `${grantedCount} من ${PERMISSIONS.length} صلاحية فعّالة`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSuspend(!suspended)}
              disabled={savingKey === 'suspend'}
              className={`flex items-center justify-center gap-2 w-full md:w-auto px-4 py-3 rounded-xl text-sm font-bold border transition-all duration-200 ${
                suspended
                  ? 'bg-[var(--rz-ink)]/15 text-[var(--rz-ink)] border-[var(--rz-ink)]/40 hover:bg-[var(--rz-ink)]/25'
                  : 'bg-[var(--rz-primary)]/15 text-[var(--rz-primary)] border-[var(--rz-primary)]/40 hover:bg-[var(--rz-primary)]/25'
              }`}
            >
              {suspended ? <Sun size={16} /> : <Snowflake size={16} />}
              {suspended ? 'إعادة تفعيل الحساب' : 'تجميد فوري وسحب الصلاحيات'}
            </button>
          </div>

          {notice && (
            <p className={`text-sm font-bold border rounded-xl px-4 py-2.5 ${noticeBg}`}>
              {notice}
            </p>
          )}

          {loadingRbac ? (
            <p className={`text-sm ${textMuted} text-center py-6 font-medium`}>
              جاري تحميل مصفوفة الحساب…
            </p>
          ) : (
            <>
              {/* تبويبات الأقسام السبعة */}
              <div className="flex flex-wrap gap-2 w-full overflow-x-auto pb-1">
                {PERMISSION_CATEGORIES.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.icon] || CATEGORY_ICONS[cat.id] || Shield;
                  const active = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border shrink-0 transition-all duration-200 ${
                        active
                          ? 'bg-[var(--rz-white)] text-[var(--rz-slate)] border-[var(--rz-gold)] shadow-md shadow-[var(--rz-gold)]/25 ring-1 ring-[var(--rz-gold)]/40'
                          : chipInactive
                      }`}
                    >
                      <Icon size={15} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* أدوات القسم */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className={`text-xs ${textMuted} font-bold`}>
                  {categoryPerms.length} صلاحيات في هذا القسم
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCategoryAll(activeCategory, true)}
                    className="text-xs px-3.5 py-2 rounded-xl bg-[var(--rz-ink)]/15 text-[var(--rz-ink)] border border-[var(--rz-ink)]/40 hover:bg-[var(--rz-ink)]/25 font-bold transition-all duration-200"
                  >
                    تفعيل القسم كله
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryAll(activeCategory, false)}
                    className="text-xs px-3.5 py-2 rounded-xl bg-[var(--rz-primary)]/12 text-[var(--rz-primary)] border border-[var(--rz-primary)]/35 hover:bg-[var(--rz-primary)]/20 font-bold transition-all duration-200"
                  >
                    تعطيل القسم كله
                  </button>
                </div>
              </div>

              {/* مفاتيح الصلاحيات — مع زر تعديل/حفظ */}
              <div className="space-y-3">
                {activeCategory === 'spy' && categoryPerms.length === 0 && (
                  <div className={`rounded-xl border px-4 py-4 text-sm ${textMuted}`}>
                    صلاحيات المراقبة والسجلات الحساسة محجوزة لصاحب الموقع فقط،
                    ولا يمكن منحها لأي مشرف أو موظف.
                  </div>
                )}
                {categoryPerms.map((p) => {
                  const on = effective.grants[p.key] === true;
                  const saving = savingKey === p.key;
                  const ChipIcon = PERMISSION_ICONS[p.key] || Shield;
                  const chipColor =
                    CATEGORY_CHIP[activeCategory] ||
                    'bg-[var(--rz-primary)]/12 text-[var(--rz-primary)] border-[var(--rz-primary)]/30';
                  return (
                    <div
                      key={p.key}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 transition-all duration-200 ${
                        on ? rowBgOn : rowBgOff
                      } ${suspended ? 'opacity-50' : ''}`}
                    >
                      <div className="min-w-0 flex items-start gap-3">
                        <span
                          className={`flex-shrink-0 mt-0.5 w-10 h-10 rounded-xl border flex items-center justify-center ${chipColor}`}
                          title={p.key}
                        >
                          <ChipIcon size={18} />
                        </span>
                        <div>
                          <p className={`font-bold text-sm ${textMain} flex items-center gap-2 flex-wrap`}>
                            {p.label}
                            <code
                              className={`text-[10px] font-mono bg-[var(--rz-primary)]/10 px-1.5 py-0.5 rounded ${darkMode ? 'text-[var(--rz-primary)]' : 'text-[var(--rz-muted)]'}`}
                              dir="ltr"
                            >
                              {p.key}
                            </code>
                          </p>
                          <p className={`text-xs ${textSub} leading-5 mt-0.5 font-medium`}>
                            {p.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[11px] font-extrabold min-w-[3rem] text-center ${on ? 'text-[var(--rz-success)]' : 'text-[var(--rz-muted)]'}`}>
                          {on ? 'تشغيل' : 'إيقاف'}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={`${on ? 'إيقاف' : 'تشغيل'} ${p.label}`}
                          disabled={suspended || savingKey === 'bulk' || saving}
                          onClick={() => handleToggle(p.key, !on)}
                          className={`relative w-12 h-7 rounded-full transition-colors ${
                            on ? 'bg-[var(--rz-gold)]' : 'bg-[var(--rz-slate-300)]'
                          } ${suspended ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all flex items-center justify-center ${
                              on ? 'right-1' : 'right-6'
                            }`}
                          >
                            {saving ? (
                              <span className="w-3 h-3 border-2 border-[var(--rz-primary)] border-t-transparent rounded-full animate-spin" />
                            ) : on ? (
                              <Check size={11} className="text-[var(--rz-primary)]" />
                            ) : (
                              <X size={11} className="text-[var(--rz-primary)]" />
                            )}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeCategory === 'inline' && (
                <p className={`text-xs ${textSub} leading-6 flex items-start gap-2 border border-[var(--rz-primary)]/25 rounded-xl px-3.5 py-2.5 font-medium ${darkMode ? 'bg-[var(--rz-ink)]' : 'bg-[var(--rz-ivory)]'}`}>
                  <Info size={15} className="flex-shrink-0 mt-0.5 text-[var(--rz-primary)]" />
                  صلاحيات هذا القسم لا تظهر كأزرار ثابتة في الغرفة — بل كأدوات تحكم منبثقة
                  بجانب العناصر نفسها في الموقع (نصوص، صور، شريط متحرك) لمن يملكها فقط.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PermissionsPanel;
