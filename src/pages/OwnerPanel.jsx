// src/components/OwnerPanel.jsx
import React, { useEffect, useMemo, useState } from 'react';
import useStore, { getEffectiveRole } from '../store/useStore';
import { useAuth } from '../context/AuthContext';
import CloseButton from '../components/CloseButton';

export default function OwnerPanel() {
  // الدور يُقرأ من AuthContext (المزامَن مع جلسة Firebase مباشرة) —
  // userRole في useStore لا يتحدّث عند الدخول عبر Login.jsx فتبقى
  // اللوحة عالقة على "غير مصرح لك" رغم نجاح الدخول.
  const { userRole } = useAuth();
  // احتياط: لو تأخر Context في تأكيد الدور نحسبه من جلسة Firebase مباشرة
  const effectiveRole = userRole || getEffectiveRole();
  const {
    users = [],
    loading,
    error: storeError,
    fetchAllData,
    banUser,
    promoteUser,
    fetchStats,
    startLogsListener,
    startAllMessagesListener,
  } = useStore();

  const [busy, setBusy] = useState({});
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');

  const filteredUsers = useMemo(() => {
    const q = String(userSearch || '').trim().toLowerCase();
    const safeUsers = Array.isArray(users) ? users : [];

    if (!q) return safeUsers;

    return safeUsers.filter((u) => {
      const email = String(u?.email || '').toLowerCase();
      const role = String(u?.role || '').toLowerCase();
      const status = String(u?.status || '').toLowerCase();

      return (
        email.includes(q) ||
        role.includes(q) ||
        status.includes(q)
      );
    });
  }, [users, userSearch]);

  const markBusy = (key, val) => setBusy((b) => ({ ...b, [key]: val }));

  const onErr = (e) => {
    console.error(e);
    setError(e?.message || 'خطأ صلاحيات/شبكة');
  };

  useEffect(() => {
    if (effectiveRole !== 'owner') return;
    fetchAllData();
    fetchStats();
    startLogsListener();
    startAllMessagesListener();
  }, [effectiveRole, fetchAllData, fetchStats, startLogsListener, startAllMessagesListener]);

  useEffect(() => {
    if (storeError) setError(storeError);
  }, [storeError]);

  if (effectiveRole !== 'owner') {
    return <div style={denied}>غير مصرح لك بالدخول</div>;
  }

  if (loading) {
    return <div style={loadingBox}>جاري التحميل...</div>;
  }

  const withNotify = async (fn, successMsg) => {
    setError('');
    setOk('');

    try {
      await fn();
      setOk(successMsg || 'تم بنجاح');
    } catch (err) {
      console.error(err);
      setError(err?.message || 'حدث خطأ غير متوقع');
    }
  };

  // Use useStore data mutations if applicable or trigger effects
  // Optional: add handlers for delete, reply etc. as per original logic if suitable

  const sendBroadcastNow = async () => {
    const msg = String(broadcastMsg || '').trim();

    if (!msg) {
      setError('يرجى كتابة الرسالة أولاً');
      return;
    }

    markBusy('broadcast', true);

    await withNotify(async () => {
      // القناة الموثوقة: قاعدة D1 عبر دالة الصفحات — قواعد Firestore
      // المنشورة لا تسمح بالكتابة على broadcasts فتفشل الكتابة بصمت.
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: msg, type: 'owner' }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'تعذر إرسال البث');
      }

      setBroadcastMsg('');
    }, 'تم إرسال البث الفوري للجميع');

    markBusy('broadcast', false);
  };

  return (
    <div style={page} dir="rtl">
      <div style={headerRow}>
        <div>
          <h1 style={title}>لوحة صاحب موقع أناقة ROOZ</h1>
          <p style={subtitle}>هذه الصفحة خاصة بصاحب الموقع فقط</p>
        </div>

        <div style={headerActions}>
          <button
            type="button"
            style={btnGlass}
            onClick={() => typeof fetchAllData === 'function' && fetchAllData()}
          >
            تحديث البيانات
          </button>

          <CloseButton
            corner="topLeft"
            style={{
              position: 'static',
              width: 40,
              height: 40,
              background: 'rgba(var(--rz-white-rgb), 0.08)',
              border: '1px solid rgba(var(--rz-primary-rgb), 0.45)',
              color: 'var(--rz-ivory)',
              boxShadow: '0 0 12px rgba(var(--rz-primary-rgb), 0.25)',
              top: 0,
            }}
          />
        </div>
      </div>

      {error ? <div style={alertError}>{error}</div> : null}
      {ok ? <div style={alertOk}>{ok}</div> : null}

      <section style={section}>
        <h2 style={sectionTitle}>بثّ فوري (شريط + صوت)</h2>

        <div style={card}>
          <p style={{ marginBottom: 8, color: 'var(--rz-border)' }}>
            أرسل إعلاناً فورياً سيظهر كشريط متحرك مع صوت للجميع في الموقع.
          </p>

          <textarea
            placeholder="اكتب الرسالة هنا..."
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
            style={textarea}
            rows={3}
            disabled={!!busy.broadcast}
          />

          <div style={actions}>
            <button
              type="button"
              style={{
                ...btnRoyal,
                ...(busy.broadcast ? btnDisabled : {}),
              }}
              onClick={sendBroadcastNow}
              disabled={!!busy.broadcast}
            >
              {busy.broadcast ? 'جارٍ الإرسال...' : 'إرسال الآن'}
            </button>

            <button
              type="button"
              style={btnGray}
              onClick={() => setBroadcastMsg('')}
              disabled={!!busy.broadcast}
            >
              مسح
            </button>
          </div>
        </div>
      </section>

      <section style={section}>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>المستخدمين</h2>

          <input
            type="search"
            placeholder="بحث بالإيميل/الدور/الحالة..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            style={searchInput}
            aria-label="البحث عن المستخدمين"
          />
        </div>

        {filteredUsers.map((u) => {
          const id = u?.id;

          if (!id) return null;

          const email = String(u?.email || '—');
          const role = String(u?.role || 'user');
          const status = String(u?.status || 'active');

          return (
            <div key={id} style={card}>
              <p style={item}>{email}</p>
              <p style={item}>الدور: {role}</p>
              <p style={item}>الحالة: {status}</p>

              <div style={actions}>
                <button
                  type="button"
                  style={btnBan}
                  onClick={() => typeof banUser === 'function' && banUser(id)}
                  disabled={!!busy[`u_ban_${id}`] || typeof banUser !== 'function'}
                >
                  {busy[`u_ban_${id}`] ? 'جارٍ الحظر...' : 'حظر'}
                </button>

                <button
                  type="button"
                  style={btnBurgundy}
                  onClick={() =>
                    typeof promoteUser === 'function' &&
                    promoteUser(id, u?.email, 'owner')
                  }
                  disabled={!!busy[`u_role_${id}`] || typeof promoteUser !== 'function'}
                >
                  {busy[`u_role_${id}`] ? 'جارٍ التحويل...' : 'تحويل إلى مالك'}
                </button>

                <button
                  type="button"
                  style={btnGray}
                  onClick={() =>
                    typeof promoteUser === 'function' &&
                    promoteUser(id, u?.email, 'user')
                  }
                  disabled={!!busy[`u_role_${id}`] || typeof promoteUser !== 'function'}
                >
                  {busy[`u_role_${id}`] ? 'جارٍ التحويل...' : 'تحويل إلى مستخدم'}
                </button>
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div style={emptyBox}>لا يوجد نتائج</div>
        )}
      </section>

      {/* الشكاوى وغيرها أقسام بإمكانك إضافتها هنا بنفس الطريقة إذا ضروري */}
    </div>
  );
}

/* CSS in JS */

const page = {
  padding: '2rem',
  fontFamily: "Tajawal, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  background: 'linear-gradient(135deg,var(--rz-ink),var(--rz-ink))',
  minHeight: '100vh',
  color: 'var(--rz-ivory)',
  boxSizing: 'border-box',
};

const headerRow = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 12,
};

const headerActions = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  flexWrap: 'wrap',
};

const title = {
  color: 'var(--rz-ivory)',
  fontSize: 28,
  fontWeight: 800,
  textShadow: '0 0 10px rgba(var(--rz-primary-rgb), 0.45)',
};

const subtitle = {
  color: 'var(--rz-border)',
  marginBottom: 16,
  fontSize: 14,
};

const section = {
  marginTop: 28,
};

const sectionHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 10,
  flexWrap: 'wrap',
};

const sectionTitle = {
  color: 'var(--rz-ivory)',
  fontSize: 22,
  fontWeight: 800,
  marginBottom: 10,
  textShadow: '0 0 10px rgba(var(--rz-primary-rgb), 0.35)',
};

const card = {
  background: 'rgba(var(--rz-white-rgb), 0.08)',
  padding: '1rem',
  borderRadius: 14,
  border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
  marginBottom: 12,
  boxShadow: '0 0 18px rgba(var(--rz-primary-rgb), 0.25)',
  backdropFilter: 'blur(10px)',
};

const item = {
  marginBottom: 6,
  fontSize: 15,
};

const actions = {
  marginTop: 10,
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

const btnBan = {
  background: 'var(--rz-primary)',
  color: 'var(--rz-white)',
  padding: '8px 12px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 800,
};

const btnBurgundy = {
  background: 'var(--rz-primary)',
  color: 'var(--rz-white)',
  padding: '8px 12px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 800,
};

const btnGray = {
  background: 'var(--rz-muted)',
  color: 'var(--rz-white)',
  padding: '8px 12px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 800,
};

const btnGlass = {
  background: 'rgba(var(--rz-white-rgb), 0.12)',
  border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
  color: 'var(--rz-ivory)',
  padding: '8px 12px',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 700,
  boxShadow: '0 0 12px rgba(var(--rz-primary-rgb), 0.25)',
};

const btnRoyal = {
  background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
  color: 'var(--rz-white)',
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid rgba(var(--rz-cream-4-rgb), 0.45)',
  cursor: 'pointer',
  fontWeight: 900,
  boxShadow: '0 0 25px rgba(var(--rz-primary-rgb), 0.45)',
};

const btnDisabled = {
  opacity: 0.55,
  cursor: 'not-allowed',
};

const denied = {
  padding: '2rem',
  textAlign: 'center',
  color: 'red',
  fontSize: 20,
};

const loadingBox = {
  padding: '2rem',
  textAlign: 'center',
  color: 'var(--rz-ivory)',
  fontSize: 20,
};

const alertError = {
  background: 'rgba(var(--rz-primary-rgb), 0.18)',
  border: '1px solid rgba(var(--rz-primary-rgb), 0.45)',
  color: 'var(--rz-ivory)',
  padding: '10px 12px',
  borderRadius: 12,
  marginTop: 10,
  marginBottom: 10,
  boxShadow: '0 0 12px rgba(var(--rz-primary-rgb), 0.35)',
};

const alertOk = {
  background: 'rgba(var(--rz-ink-rgb), 0.18)',
  border: '1px solid rgba(var(--rz-ink-rgb), 0.45)',
  color: 'var(--rz-ivory)',
  padding: '10px 12px',
  borderRadius: 12,
  marginTop: 10,
  marginBottom: 10,
  boxShadow: '0 0 12px rgba(var(--rz-ink-rgb), 0.35)',
};

const emptyBox = {
  padding: '0.8rem',
  color: 'var(--rz-border)',
  fontStyle: 'italic',
};

const textarea = {
  width: '100%',
  background: 'rgba(var(--rz-white-rgb), 0.06)',
  color: 'var(--rz-white)',
  border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
  borderRadius: 10,
  padding: '10px 12px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  resize: 'vertical',
};

const searchInput = {
  background: 'rgba(var(--rz-white-rgb), 0.06)',
  color: 'var(--rz-white)',
  border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
  borderRadius: 10,
  padding: '8px 12px',
  outline: 'none',
  boxSizing: 'border-box',
  maxWidth: '100%',
};