// src/components/NotificationPanel.jsx
// صفحة الإشعارات — المسار /notifications
// تقرأ سجل البث من /api/broadcast?history=1 وتتتبع المقروء محلياً

import React, { useEffect } from 'react';
import { Bell, BellOff, CheckCheck, Crown, Mail, Trash2 } from 'lucide-react';
import useNotifications from '../store/useNotifications';

const TYPE_LABELS = {
  'site-notice': 'إشعار من الإدارة',
  'owner-entry': 'بث ملكي',
  general: 'تنبيه عام',
};

const formatTime = (at) => {
  try {
    if (!at) return '';
    const date = new Date(at);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('ar-SA', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const toolButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'rgba(var(--rz-primary-rgb), 0.1)',
  border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
  color: 'var(--rz-ink)',
  borderRadius: 999,
  padding: '7px 13px',
  fontSize: '0.78rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Tajawal',
  minHeight: 40,
  transition: 'background 0.2s ease',
};

const bannerStyle = {
  background: 'rgba(var(--rz-primary-rgb), 0.12)',
  border: '1px solid rgba(var(--rz-primary-rgb), 0.3)',
  borderRadius: 12,
  padding: '0.75rem 1rem',
  color: 'var(--rz-ink)',
  fontSize: '0.88rem',
  fontWeight: 600,
  marginBottom: '1rem',
};

const NotificationPanel = () => {
  const rawItems = useNotifications((s) => s.items);
  const rawReadIds = useNotifications((s) => s.readIds);
  const muted = useNotifications((s) => s.muted);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const markAsRead = useNotifications((s) => s.markAsRead);
  const clearAll = useNotifications((s) => s.clearAll);
  const toggleMuted = useNotifications((s) => s.toggleMuted);

  // حماية البيانات القادمة من مخزن الإشعارات قبل استخدامها
  const items = Array.isArray(rawItems) ? rawItems : [];

  const readIds =
    rawReadIds instanceof Set
      ? rawReadIds
      : new Set(Array.isArray(rawReadIds) ? rawReadIds : []);

  const unreadCount = items.filter((item) => !muted && !readIds.has(item.id)).length;

  useEffect(() => {
    let cancelled = false;

    // استعادة حالة القراءة من sessionStorage
    const stored = sessionStorage.getItem('notificationsReadIds');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const ids = Array.isArray(parsed) ? new Set(parsed) : new Set();
        useNotifications.getState().setReadIds(ids);
      } catch (e) {
        // تجاهل بيانات القراءة المحلية غير الصالحة
      }
    }

    const refresh = () => {
      fetch('/api/broadcast?history=1', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && Array.isArray(data?.items)) {
            useNotifications.getState().syncFromServer(data.items);
          }
        })
        .catch(() => {
          // تجاهل أخطاء تحديث الإشعارات المؤقتة
        });
    };

    refresh();
    const id = setInterval(refresh, 15000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // حفظ حالة القراءة في sessionStorage عند التغيير
  useEffect(() => {
    try {
      if (readIds.size > 0) {
        sessionStorage.setItem('notificationsReadIds', JSON.stringify([...readIds]));
      } else {
        sessionStorage.removeItem('notificationsReadIds');
      }
    } catch {
      // تجاهل أخطاء التخزين المحلية غير الحرجة
    }
  }, [readIds]);

  const handleItemClick = (itemId) => {
    if (!muted && !readIds.has(itemId)) {
      markAsRead(itemId);
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '1.5rem 1rem 2.5rem',
        minHeight: '70vh',
        fontFamily: 'Tajawal',
      }}
    >
      {/* العنوان + أدوات التحكم */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: '1.25rem',
        }}
      >
        <h1
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
            fontWeight: 800,
            color: 'var(--rz-ink)',
            margin: 0,
          }}
        >
          <Bell size={24} color="var(--rz-primary)" />
          الإشعارات
          {unreadCount > 0 && (
            <span
              style={{
                background: 'var(--rz-primary)',
                color: 'var(--rz-white)',
                fontSize: '0.7rem',
                fontWeight: 800,
                borderRadius: 999,
                padding: '2px 9px',
                minWidth: 22,
                textAlign: 'center',
              }}
            >
              {unreadCount}
            </span>
          )}
        </h1>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={toggleMuted}
            aria-pressed={muted}
            style={toolButtonStyle}
          >
            {muted ? <Bell size={14} /> : <BellOff size={14} />}
            {muted ? 'تفعيل الإشعارات' : 'إيقاف الإشعارات'}
          </button>

          <button type="button" onClick={markAllRead} style={toolButtonStyle}>
            <CheckCheck size={14} />
            تعليم الكل كمقروء
          </button>

          {items.length > 0 && (
            <button type="button" onClick={clearAll} style={toolButtonStyle}>
              <Trash2 size={14} />
              مسح الكل
            </button>
          )}
        </div>
      </div>

      {/* تنبيه عند الإيقاف */}
      {muted && (
        <p style={bannerStyle}>
          الإشعارات متوقفة حالياً — فعّلها ليصلك جديد الإدارة.
        </p>
      )}

      {/* حالة فارغة */}
      {items.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3.5rem 1rem',
            color: 'var(--rz-primary)',
            background: 'rgba(var(--rz-ivory-rgb), 0.6)',
            borderRadius: 16,
            border: '1px solid rgba(var(--rz-primary-rgb), 0.18)',
          }}
        >
          <Bell size={48} color="var(--rz-primary)" style={{ margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>
            لا توجد إشعارات حالياً
          </p>
          <p style={{ fontSize: '0.9rem', marginTop: 6, lineHeight: 1.5 }}>
            ستظهر هنا رسائل الإدارة وإعلانات المتجر فور وصولها.
          </p>
        </div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {items.map((item) => {
            const isRead = readIds.has(item.id);
            const isUnread = !muted && !isRead;
            return (
              <li
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                style={{
                  background: isUnread
                    ? 'linear-gradient(145deg, var(--rz-ivory), var(--rz-ivory))'
                    : 'rgba(var(--rz-white-rgb), 0.72)',
                  border: `1px solid ${isUnread ? 'rgba(var(--rz-primary-rgb), 0.45)' : 'rgba(var(--rz-primary-rgb), 0.2)'}`,
                  borderRadius: 14,
                  padding: '0.9rem 1rem',
                  boxShadow: isUnread
                    ? '0 6px 18px rgba(var(--rz-primary-rgb), 0.12)'
                    : '0 2px 8px rgba(var(--rz-primary-rgb), 0.06)',
                  transition: 'all 0.25s ease',
                  cursor: isUnread ? 'pointer' : 'default',
                  opacity: isRead && muted ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (isUnread) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(var(--rz-primary-rgb), 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isUnread
                    ? '0 6px 18px rgba(var(--rz-primary-rgb), 0.12)'
                    : '0 2px 8px rgba(var(--rz-primary-rgb), 0.06)';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 4,
                    flexWrap: 'wrap',
                  }}
                >
                  {item.type === 'owner-entry' ? (
                    <Crown size={15} color="var(--rz-primary)" />
                  ) : (
                    <Mail size={15} color="var(--rz-primary)" />
                  )}

                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--rz-primary)',
                    }}
                  >
                    {item.title || TYPE_LABELS[item.type] || 'إشعار'}
                  </span>

                  {isUnread && (
                    <span
                      style={{
                        background: 'var(--rz-primary)',
                        color: 'var(--rz-white)',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        borderRadius: 999,
                        padding: '1px 8px',
                        animation: 'pulse 2s infinite',
                      }}
                    >
                      جديد
                    </span>
                  )}

                  <span
                    style={{
                      marginInlineStart: 'auto',
                      fontSize: '0.75rem',
                      color: 'var(--rz-primary)',
                    }}
                  >
                    {formatTime(item.at)}
                  </span>
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    color: 'var(--rz-ink)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {item.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default NotificationPanel;