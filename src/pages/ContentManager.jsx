// src/pages/ContentManager.jsx
// ============================================================
// مدير المحتوى المركزي — لصاحب الموقع فقط (roleRequired="owner").
// يعرض كل المحتوى القابل للتحكم (نصوص + قوائم)، مع:
//   - تعديل أي نص (يكتب في Firestore → يظهر لكل الزوار لحظياً)
//   - حذف/استرجاع أي عنصر
//   - إدارة قوائم كاملة: إضافة/تعديل/حذف/ترتيب عنصر
// كل عملية حقيقية ومربوطة بـ settings/siteContent — لا وهمي ولا تجريبي.
// ============================================================
import { useMemo, useState } from 'react';
import {
  Pencil, Trash2, RotateCcw, Plus, ArrowUp, ArrowDown, Save, X, ListChecks, Type,
} from 'lucide-react';
import useSiteContent, {
  setSiteText,
  clearSiteText,
  hideSiteItem,
  showSiteItem,
  setSiteList,
} from '../store/useSiteContent';
import { CONTENT_FIELDS, CONTENT_LISTS, CONTENT_GROUPS } from '../data/contentRegistry';
import toast from '../utils/toast';

const uid = () => `it_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const Card = ({ children }) => (
  <div
    style={{
      background: 'var(--rz-white, #fff)',
      border: '1px solid rgba(var(--rz-primary-rgb), 0.25)',
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
    }}
  >
    {children}
  </div>
);

const Btn = ({ children, onClick, tone = 'primary', title, disabled }) => {
  const palette = {
    primary: 'var(--rz-primary)',
    danger: 'var(--rz-error, #b3283c)',
    ghost: 'transparent',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '7px 11px',
        borderRadius: 9,
        border: tone === 'ghost' ? '1px solid rgba(var(--rz-primary-rgb),0.4)' : 'none',
        background: tone === 'ghost' ? 'transparent' : palette[tone],
        color: tone === 'ghost' ? 'var(--rz-primary)' : '#fff',
        fontWeight: 800,
        fontSize: '0.8rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
};

const TextRow = ({ field }) => {
  const texts = useSiteContent((s) => s.texts);
  const hidden = useSiteContent((s) => s.hidden);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);

  const isHidden = hidden[field.key] === true;
  const current = texts[field.key];

  const save = async () => {
    if (!String(val).trim()) {
      toast.error('النص فارغ');
      return;
    }
    setBusy(true);
    try {
      await setSiteText(field.key, val);
      setEditing(false);
      toast.success('تم الحفظ');
    } catch {
      toast.error('تعذر الحفظ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div style={{ fontWeight: 800, marginBottom: 6, color: 'var(--rz-ink)' }}>
        <Type size={14} style={{ verticalAlign: 'middle', marginInlineEnd: 5 }} />
        {field.label}
        <span style={{ fontSize: '0.7rem', opacity: 0.6, marginInlineStart: 6 }}>{field.key}</span>
      </div>

      {editing ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <textarea
            value={val}
            onChange={(e) => setVal(e.target.value)}
            rows={2}
            autoFocus
            style={{
              flex: 1,
              borderRadius: 9,
              border: '1.5px solid var(--rz-primary)',
              padding: 8,
              fontFamily: 'Tajawal',
              fontSize: '0.88rem',
            }}
          />
          <Btn onClick={save} disabled={busy}><Save size={14} /> حفظ</Btn>
          <Btn tone="ghost" onClick={() => setEditing(false)}><X size={14} /></Btn>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              color: current ? 'var(--rz-ink)' : 'var(--rz-muted, #777)',
              fontSize: '0.88rem',
              opacity: isHidden ? 0.45 : 1,
              textDecoration: isHidden ? 'line-through' : 'none',
            }}
          >
            {current || '— يستخدم النص الافتراضي —'}
          </span>
          <span style={{ display: 'inline-flex', gap: 5, flexShrink: 0 }}>
            <Btn onClick={() => { setVal(current ?? ''); setEditing(true); }}><Pencil size={13} /> تعديل</Btn>
            {isHidden ? (
              <Btn tone="ghost" onClick={() => showSiteItem(field.key).then(() => toast.success('تم الاسترجاع')).catch(() => toast.error('تعذر الاسترجاع'))}>
                <RotateCcw size={13} /> استرجاع
              </Btn>
            ) : (
              <Btn tone="danger" onClick={() => hideSiteItem(field.key).then(() => toast.success('تم الحذف')).catch(() => toast.error('تعذر الحذف'))}>
                <Trash2 size={13} /> حذف
              </Btn>
            )}
            {current && (
              <Btn tone="ghost" onClick={() => clearSiteText(field.key).then(() => toast.success('أُعيد للنص الافتراضي')).catch(() => toast.error('تعذر'))}>
                افتراضي
              </Btn>
            )}
          </span>
        </div>
      )}
    </Card>
  );
};

const ListEditor = ({ list }) => {
  const items = useSiteContent((s) => s.lists[list.key]);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);

  const currentItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const persist = async (next) => {
    setBusy(true);
    try {
      await setSiteList(list.key, next);
      toast.success('تم الحفظ — ظهر لكل الزوار');
    } catch {
      toast.error('تعذر الحفظ');
    } finally {
      setBusy(false);
    }
  };

  const move = (idx, dir) => {
    const next = [...currentItems];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    persist(next);
  };

  const add = () => {
    const text = String(draft.new ?? '').trim();
    if (!text) return;
    const extra = String(draft.newA ?? '').trim();
    const item = { id: uid(), q: text, a: extra };
    persist([...currentItems, item]);
    setDraft((d) => ({ ...d, new: '', newA: '' }));
  };

  return (
    <Card>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>
        <ListChecks size={14} style={{ verticalAlign: 'middle', marginInlineEnd: 5 }} />
        {list.label}
        <span style={{ fontSize: '0.7rem', opacity: 0.6, marginInlineStart: 6 }}>{currentItems.length} عنصر</span>
      </div>

      {currentItems.map((it, idx) => (
        <div
          key={it.id || idx}
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            padding: '7px 0',
            borderTop: idx === 0 ? 'none' : '1px solid rgba(var(--rz-primary-rgb), 0.12)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              value={draft[it.id]?.q ?? it.q ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, [it.id]: { ...(d[it.id] || {}), q: e.target.value } }))}
              style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(var(--rz-primary-rgb),0.3)', padding: 6, fontSize: '0.85rem', fontFamily: 'Tajawal' }}
            />
            {(it.a !== undefined) && (
              <input
                value={draft[it.id]?.a ?? it.a ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [it.id]: { ...(d[it.id] || {}), a: e.target.value } }))}
                placeholder="الوصف/الجواب"
                style={{ width: '100%', marginTop: 4, borderRadius: 8, border: '1px solid rgba(var(--rz-primary-rgb),0.2)', padding: 6, fontSize: '0.8rem', fontFamily: 'Tajawal' }}
              />
            )}
          </div>
          <Btn
            disabled={busy}
            onClick={() => {
              const patch = draft[it.id] || {};
              persist(currentItems.map((x) => (x.id === it.id ? { ...x, ...patch } : x)));
              setDraft((d) => ({ ...d, [it.id]: {} }));
            }}
          ><Save size={13} /></Btn>
          <Btn tone="ghost" disabled={busy || idx === 0} onClick={() => move(idx, -1)}><ArrowUp size={13} /></Btn>
          <Btn tone="ghost" disabled={busy || idx === currentItems.length - 1} onClick={() => move(idx, 1)}><ArrowDown size={13} /></Btn>
          <Btn tone="danger" disabled={busy} onClick={() => persist(currentItems.filter((x) => x.id !== it.id))}><Trash2 size={13} /></Btn>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <input
            value={draft.new ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, new: e.target.value }))}
            placeholder="عنصر جديد (العنوان/السؤال)"
            style={{ width: '100%', borderRadius: 8, border: '1.5px dashed var(--rz-primary)', padding: 7, fontSize: '0.85rem', fontFamily: 'Tajawal' }}
          />
          <input
            value={draft.newA ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, newA: e.target.value }))}
            placeholder="الوصف/الجواب (اختياري)"
            style={{ width: '100%', marginTop: 4, borderRadius: 8, border: '1px solid rgba(var(--rz-primary-rgb),0.3)', padding: 7, fontSize: '0.8rem', fontFamily: 'Tajawal' }}
          />
        </div>
        <Btn onClick={add} disabled={busy}><Plus size={14} /> إضافة</Btn>
      </div>
    </Card>
  );
};

const ContentManager = () => {
  const [group, setGroup] = useState('all');
  const groups = Object.entries(CONTENT_GROUPS);

  const fields = group === 'all' ? CONTENT_FIELDS : CONTENT_FIELDS.filter((f) => f.group === group);
  const lists = group === 'all' ? CONTENT_LISTS : CONTENT_LISTS.filter((l) => l.group === group);

  return (
    <div dir="rtl" style={{ padding: 16, maxWidth: 900, margin: '0 auto', fontFamily: 'Tajawal' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 4 }}>مدير المحتوى</h1>
      <p style={{ color: 'var(--rz-muted, #666)', fontSize: '0.88rem', marginBottom: 14 }}>
        عدّل أو احذف أي نص أو عنصر — يُطبَّق فوراً على كل الموقع ولكل الزوار على أجهزتهم.
        هذا القسم لصاحب الموقع فقط.
      </p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setGroup('all')}
          style={{
            padding: '6px 12px', borderRadius: 999, fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer',
            border: '1px solid var(--rz-primary)',
            background: group === 'all' ? 'var(--rz-primary)' : 'transparent',
            color: group === 'all' ? '#fff' : 'var(--rz-primary)',
          }}
        >الكل</button>
        {groups.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setGroup(id)}
            style={{
              padding: '6px 12px', borderRadius: 999, fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer',
              border: '1px solid var(--rz-primary)',
              background: group === id ? 'var(--rz-primary)' : 'transparent',
              color: group === id ? '#fff' : 'var(--rz-primary)',
            }}
          >{label}</button>
        ))}
      </div>

      {fields.map((f) => <TextRow key={f.key} field={f} />)}
      {lists.map((l) => <ListEditor key={l.key} list={l} />)}
    </div>
  );
};

export default ContentManager;
