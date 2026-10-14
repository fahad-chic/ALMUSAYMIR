// src/components/haraj/AuctionPanel.jsx
// لوحة المزاد العلني المباشر — عدّاد تنازلي ومزايدات حية.
import { useEffect, useMemo, useState } from 'react';
import { Gavel, Timer, TrendingUp } from 'lucide-react';
import {
  AUCTION_DURATION_HOURS,
  formatCountdown,
} from '../../utils/dressMeta';

const toMs = (value) => {
  if (!value) return 0;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
};

export default function AuctionPanel({ ad = {}, onBid, disabled = false, currentUserKey = '' }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const endMs = useMemo(() => {
    const explicit = toMs(ad.auctionEndsAt);
    if (explicit) return explicit;
    const start = toMs(ad.createdAt) || now;
    return start + AUCTION_DURATION_HOURS * 3600 * 1000;
  }, [ad.auctionEndsAt, ad.createdAt, now]);

  const ended = endMs <= now;
  const highest = Number(ad.currentBid || ad.price || 0);
  const bids = Array.isArray(ad.bids) ? ad.bids : [];
  const isTopBidder =
    bids.length > 0 && String(bids[bids.length - 1]?.bidderKey || '') === String(currentUserKey || '');

  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('أدخل مبلغاً صحيحاً');
      return;
    }
    if (value < highest + 1) {
      setError(`يجب أن تكون المزايدة أعلى من ${highest.toLocaleString()} ريال`);
      return;
    }
    setError('');
    onBid?.(value);
    setAmount('');
  };

  return (
    <div
      className="rooz-auction"
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
          margin: '0 0 10px',
          fontSize: 18,
          fontWeight: 800,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Gavel size={20} color="var(--rz-primary)" /> حراج المزاد العلني
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          textAlign: 'center',
        }}
      >
        <div style={{ background: 'rgba(var(--rz-primary-rgb), 0.06)', borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--rz-muted)', fontWeight: 700 }}>أعلى مزايدة</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--rz-primary)' }}>
            {highest.toLocaleString()} <span style={{ fontSize: 13 }}>ريال</span>
          </div>
        </div>
        <div style={{ background: 'rgba(var(--rz-primary-rgb), 0.06)', borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--rz-muted)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Timer size={13} /> الوقت المتبقي
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: ended ? 'var(--rz-primary)' : 'var(--rz-ink)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatCountdown(endMs - now)}
          </div>
        </div>
      </div>

      <p style={{ margin: '12px 0 6px', fontSize: 12, color: 'var(--rz-muted)', textAlign: 'center' }}>
        مدة المزاد {AUCTION_DURATION_HOURS} ساعة من وقت النشر — {bids.length} مزايدة.
      </p>

      {isTopBidder && !ended && (
        <p style={{ margin: '0 0 8px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: 'var(--rz-muted)' }}>
          أنت صاحب أعلى مزايدة حالياً ✓
        </p>
      )}

      {!ended ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input
            type="number"
            min={highest + 1}
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError('');
            }}
            placeholder={`أعلى من ${highest.toLocaleString()}`}
            style={{
              flex: 1,
              border: '1px solid rgba(var(--rz-primary-rgb), 0.22)',
              borderRadius: 12,
              padding: '0.8rem 1rem',
              fontSize: 15,
              fontFamily: 'inherit',
              background: 'var(--rz-ivory)',
              color: 'var(--rz-ink)',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={disabled}
            style={{
              background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
              color: 'var(--rz-ivory)',
              border: 'none',
              borderRadius: 12,
              padding: '0 20px',
              fontWeight: 800,
              fontSize: 15,
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: disabled ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <TrendingUp size={17} /> زايد
          </button>
        </div>
      ) : (
        <p style={{ margin: '6px 0 0', textAlign: 'center', fontWeight: 800, color: 'var(--rz-primary)' }}>
          انتهى المزاد — الفائز بأعلى مزايدة
        </p>
      )}

      {error && (
        <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--rz-error)', textAlign: 'center' }}>{error}</p>
      )}

      {bids.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            margin: '14px 0 0',
            padding: 0,
            display: 'grid',
            gap: 6,
            maxHeight: 160,
            overflowY: 'auto',
          }}
        >
          {[...bids]
            .slice(-6)
            .reverse()
            .map((bid, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: 'var(--rz-ivory)',
                  border: '1px solid var(--rz-ivory)',
                  borderRadius: 10,
                  padding: '7px 12px',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <span>{bid.bidderName || 'مزايد'}</span>
                <span style={{ color: 'var(--rz-primary)' }}>{Number(bid.amount || 0).toLocaleString()} ريال</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
