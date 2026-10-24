// اختيار صورة من الجهاز (تُضغط وتُحفظ مجاناً) أو لصق رابط مباشر.
import { useState } from 'react';
import { compressImageToDataUrl } from '../utils/compressImage';

const FreeImageField = ({
  label = 'صورة السلعة',
  value = '',
  onChange,
  required = false,
  variant = 'light',
  maxDim = 800,
  quality = 0.72,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dark = variant === 'royal';
  const text = value && !String(value).startsWith('data:image') ? value : '';

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const dataUrl = await compressImageToDataUrl(file, { maxDim, quality });
      onChange(dataUrl);
    } catch (err) {
      setError(err?.message || 'تعذّرت قراءة الصورة.');
    } finally {
      setBusy(false);
    }
  };

  const box = dark
    ? {
        width: '100%',
        padding: '0.85rem',
        background: 'rgba(var(--rz-white-rgb), 0.05)',
        border: '1px solid rgba(var(--rz-white-rgb), 0.2)',
        borderRadius: 12,
        color: 'var(--rz-white)',
        fontSize: '1rem',
        fontFamily: 'Tajawal',
        boxSizing: 'border-box',
      }
    : undefined;

  const lightClass =
    'w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all';

  return (
    <div style={{ width: '100%' }}>
      {label ? (
        <label
          style={{
            display: 'block',
            marginBottom: '0.35rem',
            fontFamily: 'Tajawal',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: dark ? 'var(--rz-white)' : 'var(--rz-muted)',
          }}
        >
          {label}
          {required ? ' *' : ''}
        </label>
      ) : null}

      <input
        type="url"
        value={text}
        placeholder="رابط مباشر (اختياري) — أو اختر صورة من الجهاز"
        onChange={(event) => {
          setError('');
          onChange(event.target.value);
        }}
        className={dark ? undefined : lightClass}
        style={box}
      />

      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '0.55rem',
          padding: '0.55rem 0.9rem',
          borderRadius: 10,
          cursor: busy ? 'wait' : 'pointer',
          fontFamily: 'Tajawal',
          fontWeight: 800,
          fontSize: '0.85rem',
          background: dark ? 'rgba(var(--rz-gold-rgb), 0.18)' : 'var(--rz-primary)',
          color: dark ? 'var(--rz-ivory)' : 'var(--rz-white)',
          border: dark ? '1px solid rgba(var(--rz-gold-rgb), 0.45)' : 'none',
        }}
      >
        {busy ? 'جاري ضغط الصورة...' : 'اختيار صورة من الجهاز (مجاناً)'}
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={pick}
          style={{ display: 'none' }}
        />
      </label>

      <p
        style={{
          margin: '0.45rem 0 0',
          fontSize: '0.75rem',
          color: dark ? 'rgba(255,255,255,0.7)' : 'var(--rz-muted)',
          fontFamily: 'Tajawal',
          lineHeight: 1.45,
        }}
      >
        الصورة تُضغط على جهازك وتُحفظ مع السلعة. لا تحتاج بطاقة ولا Storage.
        الرابط اختياري إذا كانت الصورة مرفوعة على موقع آخر.
      </p>

      {error ? (
        <p style={{ margin: '0.4rem 0 0', color: '#B3261E', fontSize: '0.8rem', fontFamily: 'Tajawal' }}>
          {error}
        </p>
      ) : null}

      {value ? (
        <div style={{ marginTop: '0.6rem' }}>
          <img
            src={value}
            alt="معاينة"
            style={{
              maxWidth: '100%',
              maxHeight: 160,
              objectFit: 'contain',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.08)',
              background: '#fff',
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

export default FreeImageField;
