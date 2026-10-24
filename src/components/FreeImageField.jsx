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
    <div style={{ marginBottom: dark ? '1rem' : undefined }}>
      <label
        style={
          dark
            ? {
                display: 'block',
                color: 'var(--rz-muted)',
                marginBottom: '0.3rem',
                fontFamily: 'Tajawal',
              }
            : { display: 'block', marginBottom: 6, fontWeight: 700 }
        }
      >
        {label}
      </label>

      <input
        type="text"
        inputMode="url"
        value={text}
        required={required && !value}
        placeholder="أو الصق رابط الصورة المباشر https://..."
        onChange={(event) => {
          setError('');
          onChange(event.target.value);
        }}
        className={dark ? undefined : lightClass}
        style={box}
      />

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 8,
          padding: '0.7rem 0.9rem',
          borderRadius: 12,
          cursor: busy ? 'wait' : 'pointer',
          fontFamily: 'Tajawal',
          fontWeight: 700,
          background: dark ? 'var(--rz-primary)' : 'var(--rz-primary, #6B1D2F)',
          color: '#fff',
        }}
      >
        {busy ? 'جاري ضغط الصورة...' : 'اختيار صورة من الجهاز (مجاناً)'}
        <input
          type="file"
          accept="image/*"
          onChange={pick}
          disabled={busy}
          style={{ display: 'none' }}
        />
      </label>

      <p
        style={{
          margin: '0.45rem 0 0',
          fontSize: 12,
          lineHeight: 1.6,
          color: dark ? 'var(--rz-muted)' : 'var(--rz-muted, #766D72)',
          fontFamily: 'Tajawal',
        }}
      >
        الصورة تُضغط على جهازك وتُحفظ مع السلعة. لا تحتاج بطاقة ولا Storage.
        الرابط اختياري إذا كانت الصورة مرفوعة على موقع آخر.
      </p>

      {error && (
        <p style={{ color: 'var(--rz-error, #b42318)', margin: '0.4rem 0 0', fontFamily: 'Tajawal' }}>
          {error}
        </p>
      )}

      {value ? (
        <img
          src={value}
          alt=""
          style={{
            display: 'block',
            width: '100%',
            maxHeight: 180,
            objectFit: 'cover',
            borderRadius: 12,
            marginTop: 10,
          }}
        />
      ) : null}
    </div>
  );
};

export default FreeImageField;