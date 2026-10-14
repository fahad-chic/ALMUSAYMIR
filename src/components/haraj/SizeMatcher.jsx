// src/components/haraj/SizeMatcher.jsx
// حاسبة المقاسات الذكية — تُدخل المشترية مقاساتها فيعرض الموقع نسبة الملاءمة.
import { useMemo, useState } from 'react';
import { Ruler, Sparkles } from 'lucide-react';
import {
  SIZE_FIELDS,
  computeFitScore,
  fitVerdict,
  hasAnySize,
} from '../../utils/dressMeta';

const TONE_COLORS = {
  great: 'var(--rz-muted)',
  good: 'var(--rz-primary)',
  ok: 'var(--rz-muted)',
  weak: 'var(--rz-primary)',
  neutral: 'var(--rz-muted)',
};

export default function SizeMatcher({ dress = {} }) {
  const [buyer, setBuyer] = useState({});
  const available = useMemo(() => hasAnySize(dress), [dress]);
  const score = useMemo(() => computeFitScore(dress, buyer), [dress, buyer]);
  const verdict = fitVerdict(score);

  if (!available) return null;

  return (
    <div
      className="rooz-size-matcher"
      style={{
        background: 'var(--rz-white)',
        border: '1px solid var(--rz-ivory)',
        borderRadius: 20,
        padding: 20,
        marginTop: 14,
        boxShadow: '0 8px 30px rgba(var(--rz-ink-rgb), 0.08)',
      }}
    >
      <h3
        style={{
          margin: '0 0 6px',
          fontSize: 18,
          fontWeight: 800,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Ruler size={20} color="var(--rz-primary)" /> حاسبة المقاسات الذكية
      </h3>
      <p style={{ margin: '0 0 14px', textAlign: 'center', fontSize: 12, color: 'var(--rz-muted)' }}>
        أدخلي مقاساتك بالسنتيمتر لتعرفي نسبة ملاءمة الفستان لكِ.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
        }}
      >
        {SIZE_FIELDS.map((field) => (
          <label key={field.key} style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--rz-ink)' }}>
              {field.label} <span style={{ color: 'var(--rz-muted)', fontWeight: 500 }}>(سم)</span>
            </span>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={buyer[field.key] ?? ''}
              onChange={(e) =>
                setBuyer((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              placeholder={dress[field.key] ? `مقاس الفستان: ${dress[field.key]}` : '0'}
              style={{
                border: '1px solid rgba(var(--rz-primary-rgb), 0.22)',
                borderRadius: 12,
                padding: '0.7rem 0.85rem',
                fontSize: 15,
                fontFamily: 'inherit',
                color: 'var(--rz-ink)',
                background: 'var(--rz-ivory)',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </label>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          background: 'rgba(var(--rz-primary-rgb), 0.06)',
          borderRadius: 14,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
          <Sparkles size={18} color="var(--rz-primary)" />
          {score == null ? 'أدخلي قياساً واحداً على الأقل' : verdict.label}
        </span>
        {score != null && (
          <span
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: TONE_COLORS[verdict.tone],
            }}
          >
            {score}%
          </span>
        )}
      </div>
    </div>
  );
}
