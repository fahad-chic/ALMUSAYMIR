// src/components/Editable.jsx
// ============================================================
// مكوّن تحكم حقيقي في المحتوى — لصاحب الموقع فقط.
// يعرض النص/العنصر كما يراه الزائر، ويضيف زرّي «تعديل» و«حذف» للمالك فقط.
//   - تعديل: يكتب في settings/siteContent.texts (Firestore) → يظهر لكل الزوار
//     لحظياً على كل الأجهزة (onSnapshot)، لا نسخة محلية.
//   - حذف: يخفي العنصر في كل الموقع (hidden=true) مع إمكانية الاسترجاع.
//   - استرجاع: من مدير المحتوى المركزي.
// إن لم يكن المالك مسجّلاً: لا يظهر أي زر ولا أي أثر للتحكم.
// ============================================================
import { useState } from 'react';
import { Pencil, X, Check, Trash2, RotateCcw } from 'lucide-react';
import useIsOwner from '../hooks/useIsOwner';
import useSiteContent, { setSiteText, hideSiteItem, showSiteItem } from '../store/useSiteContent';
import toast from '../utils/toast';

const ICON_BTN = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: '1.5px solid rgba(var(--rz-primary-rgb), 0.85)',
  background: 'linear-gradient(135deg, var(--rz-ink), var(--rz-ink))',
  color: 'var(--rz-white)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: '0 3px 10px rgba(var(--rz-ink-rgb), 0.35)',
  padding: 0,
};

const Editable = ({
  contentKey,
  defaultValue = '',
  as: Tag = 'span',
  multiline = false,
  className,
  style,
  title,
  children,
  wrapperStyle,
  controlsOnly = false,
}) => {
  const isOwner = useIsOwner();
  const texts = useSiteContent((s) => s.texts);
  const hidden = useSiteContent((s) => s.hidden);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const isHidden = hidden[contentKey] === true;
  const current = texts[contentKey] ?? defaultValue;

  // للزوار: يُعرض النص فقط (أو لا شيء إن كان محذوفاً). لا أزرار إطلاقاً.
  if (!isOwner) {
    if (controlsOnly) return null;
    if (isHidden) return null;
    return (
      <Tag className={className} style={style} title={title}>
        {children ?? current}
      </Tag>
    );
  }

  // للمالك: عنصر محذوف → شارة استرجاع صغيرة بدل إخفائه تماماً.
  if (isHidden) {
    if (controlsOnly) {
      return (
        <button
          type="button"
          title="استرجاع العنصر"
          aria-label="استرجاع العنصر"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              await showSiteItem(contentKey);
              toast.success('تم استرجاع العنصر');
            } catch {
              toast.error('تعذر الاسترجاع');
            }
          }}
          style={{ ...ICON_BTN, width: 22, height: 22 }}
        >
          <RotateCcw size={12} />
        </button>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 8px',
          borderRadius: 8,
          border: '1.5px dashed rgba(var(--rz-primary-rgb), 0.7)',
          background: 'rgba(var(--rz-primary-rgb), 0.06)',
          fontSize: '0.72rem',
          color: 'var(--rz-primary)',
          ...wrapperStyle,
        }}
      >
        <Trash2 size={12} /> عنصر محذوف
        <button
          type="button"
          title="استرجاع العنصر"
          aria-label="استرجاع العنصر"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              await showSiteItem(contentKey);
              toast.success('تم استرجاع العنصر');
            } catch {
              toast.error('تعذر الاسترجاع');
            }
          }}
          style={{ ...ICON_BTN, width: 22, height: 22 }}
        >
          <RotateCcw size={12} />
        </button>
      </span>
    );
  }

  const openEditor = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setValue(current);
    setOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = String(value).trim();
    if (!next) {
      toast.error('لا يمكن حفظ نص فارغ — استخدم «حذف» لإخفائه');
      return;
    }
    setBusy(true);
    try {
      await setSiteText(contentKey, next);
      setOpen(false);
      toast.success('تم حفظ التعديل — ظهر لكل الزوار');
    } catch {
      toast.error('تعذر الحفظ — حاول مرة أخرى');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (!window.confirm('حذف هذا العنصر من كل الموقع؟ يمكنك استرجاعه لاحقاً من مدير المحتوى.')) {
      return;
    }
    setBusy(true);
    try {
      await hideSiteItem(contentKey);
      toast.success('تم حذف العنصر من الموقع');
    } catch {
      toast.error('تعذر الحذف');
    } finally {
      setBusy(false);
    }
  };

  const controls = (
    <span
      className="editable-controls"
      style={{
        display: 'inline-flex',
        gap: 4,
        marginInlineStart: 6,
        verticalAlign: 'middle',
        ...wrapperStyle,
      }}
    >
      <button type="button" onClick={openEditor} title="تعديل" aria-label="تعديل" style={ICON_BTN}>
        <Pencil size={12} strokeWidth={2.4} />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        title="حذف"
        aria-label="حذف"
        style={{ ...ICON_BTN, borderColor: 'rgba(var(--rz-error-rgb, 190,40,60), 0.9)' }}
      >
        <Trash2 size={12} strokeWidth={2.4} />
      </button>
    </span>
  );

  return (
    <>
      {controlsOnly ? (
        controls
      ) : (
        <Tag className={className} style={{ position: 'relative', ...style }} title={title}>
          {children ?? current}
          {controls}
        </Tag>
      )}

      {open && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!busy) setOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1800,
            background: 'rgba(var(--rz-ink-rgb), 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            direction: 'rtl',
            fontFamily: 'Tajawal',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="تعديل المحتوى"
            style={{
              width: 'min(460px, 100%)',
              background: 'var(--rz-ivory)',
              border: '2px solid var(--rz-primary)',
              borderRadius: 18,
              boxShadow: '0 22px 55px rgba(var(--rz-ink-rgb), 0.35)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(120deg, var(--rz-ink), var(--rz-ink))',
                color: 'var(--rz-gold)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 900,
                fontSize: '0.95rem',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Pencil size={16} /> تعديل المحتوى
              </span>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                disabled={busy}
                aria-label="إغلاق"
                style={{ background: 'none', border: 'none', color: 'var(--rz-gold)', cursor: 'pointer', padding: 2 }}
              >
                <X size={17} />
              </button>
            </div>

            <div style={{ padding: 16 }}>
              {multiline ? (
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  autoFocus
                  disabled={busy}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    borderRadius: 12,
                    border: '1.5px solid var(--rz-primary)',
                    background: 'var(--rz-white, #fff)',
                    padding: '10px 12px',
                    fontFamily: 'Tajawal',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--rz-ink)',
                    lineHeight: 1.8,
                  }}
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  maxLength={4000}
                  autoFocus
                  disabled={busy}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: 12,
                    border: '1.5px solid var(--rz-primary)',
                    background: 'var(--rz-white, #fff)',
                    padding: '11px 12px',
                    fontFamily: 'Tajawal',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: 'var(--rz-ink)',
                  }}
                />
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={busy || !String(value).trim()}
                style={{
                  marginTop: 12,
                  width: '100%',
                  border: 'none',
                  borderRadius: 12,
                  padding: 12,
                  fontFamily: 'Tajawal',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  color: 'var(--rz-white)',
                  background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
                  opacity: busy || !String(value).trim() ? 0.6 : 1,
                }}
              >
                <Check size={16} /> {busy ? 'جاري الحفظ…' : 'حفظ — يظهر لكل الزوار'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Editable;
