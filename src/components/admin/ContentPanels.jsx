// src/components/admin/ContentPanels.jsx — لوحات إدارة المحتوى (تصنيفات/بنرات/تنبيهات)
// مشتركة بين لوحة الإدارة القديمة وغرفة المشرف الجديدة — لا نسخ مكررة.
// كل عملية تُمرّ عبر requirePerm (رفض محلي + تسجيل) ثم تُفرض خادمياً بقواعد
// Firestore (categories/banners/notifications). الواجهة لا تمنح قدرة بذاتها.
import { useState, useEffect } from 'react';
import { Plus, X, Bell as BellIcon, Loader2 } from 'lucide-react';
import {
  db, COLLECTIONS, getCategories, addCategory,
  collection, getDocs, doc, addDoc, deleteDoc, onSnapshot, serverTimestamp,
} from '../../firebase';
import FreeImageField from '../FreeImageField';
import usePermissions from '../../permissions/usePermissions';
import { requirePerm } from '../../permissions/rbacService';
import { writeAuditLog } from '../../permissions/audit';
import toast from '../../utils/toast';

const getTimestampValue = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? millis : 0;
  }
  if (typeof value.seconds === 'number') {
    return Number.isFinite(value.seconds) ? value.seconds : 0;
  }
  const dateValue = new Date(value).getTime();
  return Number.isFinite(dateValue) ? dateValue : 0;
};

/* ===================== Categories Manager ===================== */
export const CategoriesManager = () => {
  const { can } = usePermissions();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const result = await getCategories();
      const list = Array.isArray(result) ? result : (result?.data || []);
      setCategories(list);
    } catch (e) {
      console.error(e);
      setCategories([]);
    }
    setLoading(false);
  };

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await requirePerm(can, 'MANAGE_CATEGORIES', 'إضافة تصنيف', name.trim());
      await addCategory({ name: name.trim() });
      await writeAuditLog({
        action: 'CATEGORY_CREATE', permissionKey: 'MANAGE_CATEGORIES',
        targetType: 'categories', targetId: name.trim(), result: 'success',
        details: `إضافة تصنيف: ${name.trim()}`, severity: 'medium',
      });
      setName('');
      await load();
    } catch (err) {
      toast.error(err?.code === 'no-permission' ? err.message : 'حدث خطأ');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إدارة التصنيفات</h2>
      <form onSubmit={add} className="flex gap-3">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم التصنيف الجديد" className="flex-1 bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" />
        <button type="submit" className="bg-pink-600 hover:bg-pink-500 px-6 py-3 rounded-lg border border-pink-400/30 hover:border-pink-400/60 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 transition-all duration-200">إضافة</button>
      </form>
      {loading ? (
        <div className="text-center py-12 text-[var(--rz-muted)]">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((c) => (
            <div key={c.id} className="bg-[var(--rz-white)] rounded-xl p-4 border border-[rgba(var(--rz-ink-rgb),0.08)] text-center">
              <p className="font-medium break-words">{c.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ===================== Banners Manager ===================== */
export const BannersManager = () => {
  const [banners, setBanners] = useState([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.BANNERS));
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setBanners(list);
    } catch (e) {
      console.error(e);
      setBanners([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">إدارة الإعلانات</h2>
        <button onClick={() => setShowForm(true)} type="button" className="bg-pink-600 hover:bg-pink-500 px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 border border-pink-400/30 hover:border-pink-400/60 transition-all duration-200 hover:-translate-y-0.5">
          <Plus size={20} /> إضافة إعلان
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banners.map((b) => (
          <div key={b.id} className="bg-[var(--rz-white)] rounded-xl overflow-hidden border border-[rgba(var(--rz-ink-rgb),0.08)]">
            <img loading="lazy" src={b.image} alt={b.title || 'الإعلان'} className="w-full h-40 object-cover" />
            <div className="p-4">
              <p className="font-bold">{b.title || 'إعلان بدون عنوان'}</p>
              <p className="text-sm text-[var(--rz-muted)]">{b.link || 'لا يوجد رابط'}</p>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <BannerForm onClose={() => setShowForm(false)} onSave={async () => { setShowForm(false); await load(); }} />
      )}
    </div>
  );
};

const BannerForm = ({ onClose, onSave }) => {
  const { can } = usePermissions();
  const [form, setForm] = useState({ title: '', image: '', link: '', active: true });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await requirePerm(can, 'MANAGE_SITE_BANNERS', 'إضافة بنر', form.title || '-');
      await addDoc(collection(db, COLLECTIONS.BANNERS), { ...form, createdAt: serverTimestamp() });
      await writeAuditLog({
        action: 'BANNER_CREATE', permissionKey: 'MANAGE_SITE_BANNERS',
        targetType: 'banners', targetId: form.title || '-', result: 'success',
        details: `إضافة بنر: ${form.title || '-'}`, severity: 'medium',
      });
      onSave();
    } catch (err) {
      toast.error(err?.code === 'no-permission' ? err.message : 'حدث خطأ');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--rz-white)] rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-[rgba(var(--rz-ink-rgb),0.08)] flex items-center justify-between">
          <h3 className="text-xl font-bold">إضافة إعلان</h3>
          <button onClick={onClose} type="button" className="p-2 hover:bg-[var(--rz-ivory)] rounded-lg"><X size={24} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <input type="text" placeholder="العنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" required />
          <FreeImageField
            value={form.image}
            onChange={(image) => setForm({ ...form, image })}
            label="صورة الإعلان"
          />
          <input type="url" placeholder="رابط النقر" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" required />
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-[var(--rz-white)] hover:bg-[var(--rz-ivory)] hover:border-pink-500/50 rounded-lg border border-[rgba(var(--rz-ink-rgb),0.10)] transition-all duration-200">إلغاء</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-pink-600 hover:bg-pink-500 rounded-lg disabled:opacity-50 border border-pink-400/30 hover:border-pink-400/60 transition-all duration-200">{saving ? '...' : 'حفظ'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ===================== Notifications Manager ===================== */
export const NotificationsManager = ({ isOwner = false }) => {
  const { can } = usePermissions();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [sendState, setSendState] = useState('idle');
  const [sendFeedback, setSendFeedback] = useState('');
  const [subscribers, setSubscribers] = useState([]);

  useEffect(() => { load(); }, []);
  // المشتركون بالبريد مقروؤون للمالك فقط (قاعدة subscribers) — لا نطلبهم لغيره
  // حتى لا تُطلق طلبات مرفوضة ولا تظهر بيانات لا يحق للمشرف رؤيتها.
  useEffect(() => {
    if (!isOwner) return undefined;
    const unsub = onSnapshot(collection(db, 'subscribers'),
      (snap) => setSubscribers(snap.docs.map((d) => d.data().email).filter(Boolean)),
      () => setSubscribers([])
    );
    return () => unsub();
  }, [isOwner]);

  const load = async () => {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.NOTIFICATIONS));
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));
      setNotifications(list);
    } catch (e) {
      console.error(e);
      setNotifications([]);
    }
    setLoading(false);
  };

  // بثّ عام لكل الزوار: خادمي ومالك-فقط (/api/broadcast). غير المالك لا يراه.
  const sendSiteNotice = async (e) => {
    e.preventDefault();
    const title = noteTitle.trim();
    const body = noteBody.trim();
    if (!title || !body || sendState === 'sending') return;

    setSendState('sending');
    setSendFeedback('');

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ type: 'site-notice', message: JSON.stringify({ title, body }) })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setSendState('error');
        setSendFeedback(data.error || 'تعذر الإرسال، حاول مرة أخرى.');
        return;
      }

      try {
        await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
          title, body, type: 'broadcast', createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error(error);
      }

      await writeAuditLog({
        action: 'NOTIFICATION_BROADCAST', permissionKey: 'MANAGE_NOTIFICATIONS',
        targetType: 'notifications', targetId: title, result: 'success',
        details: `بثّ إشعار عام: ${title}`, severity: 'high',
      });

      await load();
      setSendState('sent');
      setSendFeedback('تم الإرسال — سيصل الإشعار لجميع الزوار خلال ثوانٍ ويظهر في جرس الإشعارات.');
      setNoteTitle('');
      setNoteBody('');
    } catch {
      setSendState('error');
      setSendFeedback('خطأ في الاتصال بالخادم.');
    }
  };

  const removeNotification = async (item) => {
    try {
      await requirePerm(can, 'MANAGE_NOTIFICATIONS', 'حذف تنبيه', item.id);
      await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, item.id));
      await writeAuditLog({
        action: 'NOTIFICATION_DELETE', permissionKey: 'MANAGE_NOTIFICATIONS',
        targetType: 'notifications', targetId: item.id, result: 'success',
        details: `حذف تنبيه: ${item.title || '-'}`, severity: 'medium',
      });
      await load();
    } catch (err) {
      toast.error(err?.code === 'no-permission' ? err.message : 'تعذر حذف التنبيه');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إدارة الإشعارات</h2>

      {isOwner && (
        <form onSubmit={sendSiteNotice} className="bg-[var(--rz-white)] rounded-xl p-6 border border-[rgba(var(--rz-ink-rgb),0.08)] space-y-3">
          <h3 className="font-bold text-yellow-400 flex items-center gap-2">
            <BellIcon size={18} /> إرسال إشعار لجميع الزوار
          </h3>
          <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="عنوان الإشعار" maxLength={80} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" required />
          <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="نص الإشعار" maxLength={300} rows={3} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" required />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={sendState === 'sending' || !noteTitle.trim() || !noteBody.trim()} className="bg-pink-600 hover:bg-pink-500 px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50 border border-pink-400/30 hover:border-pink-400/60 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 transition-all duration-200">
              {sendState === 'sending' ? <Loader2 className="animate-spin" size={20} /> : <BellIcon size={20} />}
              إرسال للجميع الآن
            </button>
            {sendFeedback && (
              <p className={`text-sm font-semibold ${sendState === 'sent' ? 'text-green-400' : 'text-red-400'}`}>{sendFeedback}</p>
            )}
          </div>
        </form>
      )}

      <div className="bg-[var(--rz-white)] rounded-xl p-6 border border-[rgba(var(--rz-ink-rgb),0.08)]">
        <h3 className="font-bold text-yellow-400 mb-3">مشتركو العروض بالبريد ({subscribers.length})</h3>
        {subscribers.length === 0 ? (
          <p className="text-[var(--rz-muted)] text-sm">لا يوجد مشتركون بعد.</p>
        ) : (
          <ul className="text-sm space-y-1 max-h-48 overflow-y-auto" dir="ltr">
            {subscribers.map((email) => (
              <li key={email} className="text-[var(--rz-ink)] text-left">{email}</li>
            ))}
          </ul>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--rz-muted)]">جاري التحميل...</div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div key={n.id} className="bg-[var(--rz-white)] rounded-xl p-6 border border-[rgba(var(--rz-ink-rgb),0.08)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center">
                  <BellIcon className="text-pink-500" size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-bold">{n.title || 'إشعار'}</p>
                  <p className="text-[var(--rz-muted)]">{n.body || ''}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeNotification(n)}
                  className="p-2 rounded-lg hover:bg-[var(--rz-ivory)] text-[var(--rz-primary)]"
                  aria-label="حذف التنبيه"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
