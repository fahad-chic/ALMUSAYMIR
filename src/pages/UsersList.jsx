import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { isAdminEmail } from '../firebase';
import usePermissions from '../permissions/usePermissions';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  MessageCircle,
  Users,
  Copy,
  ShieldCheck,
  ShieldX,
  LoaderCircle
} from 'lucide-react';

const UsersList = ({ onSelectUser }) => {
  const { user } = useAuth();
  const { can, isOwner: permOwner } = usePermissions();
  const [users, setUsers] = useState([]);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState('');

  const isOwner = isAdminEmail(user?.email) || permOwner || can('BAN_USER_TEMPORARY') || can('MANAGE_USER_VERIFICATION') || can('SUPER_ADMIN_FULL_ACCESS');

  useEffect(() => {
    let mounted = true;

    setUsers([]);
    setForbidden(false);

    if (!isOwner || !user?.uid) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        if (!mounted) return;

        const currentUid = user.uid;

        const list = snap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .filter((u) => {
            if (!u || u.id === currentUid) return false;
            return u.status !== 'banned';
          })
          .sort((a, b) => {
            const nameA = String(a?.name || a?.email || '').toLowerCase();
            const nameB = String(b?.name || b?.email || '').toLowerCase();
            return nameA.localeCompare(nameB, 'ar');
          });

        setUsers(list);
        setForbidden(false);
        setLoading(false);
      },
      (error) => {
        console.error('UsersList Firestore error:', error);

        if (!mounted) return;

        setUsers([]);
        setForbidden(true);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      unsub();
    };
  }, [user?.uid, isOwner]);

  const handleCopyEmail = async (email) => {
    const safeEmail = String(email || '').trim();

    if (!safeEmail) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(safeEmail);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = safeEmail;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopiedEmail(safeEmail);

      window.setTimeout(() => {
        setCopiedEmail((current) =>
          current === safeEmail ? '' : current
        );
      }, 1400);
    } catch (error) {
      console.error('Copy email error:', error);
    }
  };

  const handleSelectUser = (selectedUser) => {
    if (!selectedUser || typeof onSelectUser !== 'function') return;
    onSelectUser(selectedUser);
  };

  if (!isOwner || forbidden) {
    return (
      <div style={container}>
        <div style={restrictedBox}>
          <ShieldX size={46} aria-hidden="true" />
          <p style={restrictedText}>
            قائمة المستخدمين متاحة لصاحب الموقع فقط
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={header}>
        <div style={titleWrap}>
          <div style={titleIcon}>
            <Users size={19} aria-hidden="true" />
          </div>

          <div>
            <h2 style={title}>قائمة المستخدمين</h2>
            <p style={subtitle}>
              {loading
                ? 'جاري تحديث القائمة'
                : `${users.length.toLocaleString('ar-SA')} مستخدم`}
            </p>
          </div>
        </div>

        <div style={ownerBadge}>
          <ShieldCheck size={14} aria-hidden="true" />
          <span>المالك</span>
        </div>
      </div>

      {loading ? (
        <div style={loadingBox} role="status" aria-live="polite">
          <LoaderCircle
            size={24}
            style={loadingIcon}
            aria-hidden="true"
          />
          <span>جاري تحميل المستخدمين...</span>
        </div>
      ) : users.length === 0 ? (
        <div style={emptyBox}>
          <Users size={34} aria-hidden="true" />
          <p style={empty}>لا يوجد مستخدمون حاليًا</p>
        </div>
      ) : (
        <div style={list}>
          {users.map((u) => {
            const safeName = String(u?.name || '').trim();
            const safeEmail = String(u?.email || '').trim();
            const safeRole = String(u?.role || 'مستخدم').trim() || 'مستخدم';
            const avatarLetter = (
              safeName ||
              safeEmail ||
              'م'
            ).charAt(0);

            return (
              <div key={u.id} style={userCard}>
                <div style={avatarWrapper}>
                  {u?.photoURL ? (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={u.photoURL}
                      alt=""
                      style={avatar}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      style={avatarInitials}
                      aria-hidden="true"
                    >
                      {avatarLetter}
                    </div>
                  )}
                </div>

                <div style={userInfo}>
                  <p style={userName}>
                    {safeName || 'مستخدم بدون اسم'}
                  </p>

                  <p style={userEmail}>
                    {safeEmail || 'لا يوجد بريد إلكتروني'}
                  </p>

                  <div style={roleRow}>
                    <span style={roleText}>{safeRole}</span>

                    {u?.isVerified && (
                      <span
                        style={verified}
                        title="حساب موثق"
                        aria-label="حساب موثق"
                      >
                        <ShieldCheck
                          size={14}
                          aria-hidden="true"
                        />
                      </span>
                    )}
                  </div>
                </div>

                <div style={actions}>
                  <button
                    type="button"
                    style={btnCopy}
                    onClick={() => handleCopyEmail(safeEmail)}
                    disabled={!safeEmail}
                    title={
                      copiedEmail === safeEmail
                        ? 'تم النسخ'
                        : 'نسخ البريد الإلكتروني'
                    }
                    aria-label={
                      copiedEmail === safeEmail
                        ? 'تم نسخ البريد الإلكتروني'
                        : 'نسخ البريد الإلكتروني'
                    }
                  >
                    <Copy size={15} aria-hidden="true" />
                    <span>
                      {copiedEmail === safeEmail ? 'تم النسخ' : 'نسخ'}
                    </span>
                  </button>

                  <button
                    type="button"
                    style={btnChat}
                    onClick={() => handleSelectUser(u)}
                    disabled={typeof onSelectUser !== 'function'}
                    title="مراسلة المستخدم"
                    aria-label={`مراسلة ${safeName || safeEmail || 'المستخدم'}`}
                  >
                    <MessageCircle size={15} aria-hidden="true" />
                    <span>راسلني</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UsersList;

const container = {
  background:
    'linear-gradient(145deg, var(--rz-ink) 0%, var(--rz-ink) 100%)',
  padding: '1.25rem',
  borderRadius: 18,
  border: '1px solid rgba(var(--rz-primary-rgb), 0.24)',
  boxShadow:
    '0 12px 35px rgba(var(--rz-ink-rgb), 0.28), inset 0 1px 0 rgba(var(--rz-white-rgb), 0.03)',
  fontFamily: 'Tajawal, Tajawal, sans-serif',
  width: '100%',
  boxSizing: 'border-box',
};

const header = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 16,
  flexWrap: 'wrap',
};

const titleWrap = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
};

const titleIcon = {
  width: 40,
  height: 40,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--rz-white)',
  background:
    'linear-gradient(135deg, var(--rz-primary) 0%, var(--rz-primary) 48%, var(--rz-primary) 100%)',
  boxShadow: '0 6px 18px rgba(var(--rz-primary-rgb), 0.14)',
  flexShrink: 0,
};

const title = {
  color: 'var(--rz-ivory)',
  fontWeight: 800,
  fontSize: 18,
  margin: 0,
  lineHeight: 1.4,
};

const subtitle = {
  color: 'var(--rz-muted)',
  fontSize: 11,
  margin: '2px 0 0',
};

const ownerBadge = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  padding: '6px 9px',
  borderRadius: 999,
  color: 'var(--rz-primary)',
  background: 'rgba(var(--rz-primary-rgb), 0.08)',
  border: '1px solid rgba(var(--rz-primary-rgb), 0.18)',
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

const restrictedBox = {
  minHeight: 220,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: 24,
  color: 'var(--rz-primary)',
  boxSizing: 'border-box',
};

const restrictedText = {
  color: 'var(--rz-muted)',
  margin: '10px 0 0',
  fontSize: 14,
  lineHeight: 1.7,
};

const loadingBox = {
  minHeight: 180,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  color: 'var(--rz-primary)',
  fontSize: 13,
};

const loadingIcon = {
  animation: 'roozUsersSpin 800ms linear infinite',
};

const emptyBox = {
  minHeight: 150,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--rz-ink)',
};

const empty = {
  textAlign: 'center',
  color: 'var(--rz-muted)',
  padding: '0.5rem',
  margin: 0,
  fontSize: 13,
};

const list = {
  display: 'flex',
  flexDirection: 'column',
  gap: 9,
};

const userCard = {
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  background:
    'linear-gradient(135deg, rgba(var(--rz-ink-rgb), 0.98), rgba(var(--rz-ink-rgb), 0.98))',
  padding: 11,
  borderRadius: 13,
  border: '1px solid rgba(var(--rz-primary-rgb), 0.12)',
  boxSizing: 'border-box',
  minWidth: 0,
  transition:
    'border-color 160ms ease, transform 160ms ease, background 160ms ease',
};

const avatarWrapper = {
  width: 44,
  height: 44,
  minWidth: 44,
  borderRadius: '50%',
  overflow: 'hidden',
  border: '2px solid rgba(var(--rz-primary-rgb), 0.35)',
  background: 'var(--rz-ink)',
  boxSizing: 'border-box',
};

const avatar = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const avatarInitials = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background:
    'linear-gradient(135deg, var(--rz-primary) 0%, var(--rz-primary) 50%, var(--rz-primary) 100%)',
  color: 'var(--rz-white)',
  fontWeight: 900,
  fontSize: 17,
  fontFamily: 'Tajawal, Tajawal, sans-serif',
};

const userInfo = {
  flex: 1,
  minWidth: 0,
};

const userName = {
  color: 'var(--rz-ivory)',
  fontWeight: 800,
  fontSize: 13,
  margin: '0 0 2px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const userEmail = {
  color: 'var(--rz-muted)',
  fontSize: 11,
  margin: '0 0 4px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  direction: 'ltr',
  textAlign: 'right',
};

const roleRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
};

const roleText = {
  color: 'var(--rz-muted)',
  fontSize: 11,
  display: 'inline-flex',
  alignItems: 'center',
};

const verified = {
  color: 'var(--rz-ink)',
  display: 'inline-flex',
  alignItems: 'center',
};

const actions = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 6,
  flexShrink: 0,
};

const btnBase = {
  minHeight: 34,
  border: '1px solid transparent',
  padding: '7px 9px',
  borderRadius: 9,
  fontSize: 11,
  fontWeight: 800,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  fontFamily: 'Tajawal, Tajawal, sans-serif',
  transition: 'opacity 160ms ease, transform 160ms ease',
  boxSizing: 'border-box',
};

const btnChat = {
  ...btnBase,
  background:
    'linear-gradient(135deg, var(--rz-primary) 0%, var(--rz-primary) 50%, var(--rz-primary) 100%)',
  color: 'var(--rz-white)',
  borderColor: 'rgba(var(--rz-gold-rgb), 0.25)',
};

const btnCopy = {
  ...btnBase,
  background: 'var(--rz-ink)',
  color: 'var(--rz-border)',
  borderColor: 'rgba(var(--rz-white-rgb), 0.08)',
};

if (
  typeof document !== 'undefined' &&
  !document.getElementById('rooz-users-animation')
) {
  const style = document.createElement('style');
  style.id = 'rooz-users-animation';
  style.textContent = `
    @keyframes roozUsersSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 560px) {
      .rooz-users-card-actions {
        flex-direction: column;
      }
    }
  `;
  document.head.appendChild(style);
}