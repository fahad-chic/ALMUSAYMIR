import React, { useEffect, useRef, useState } from 'react';
import { Mail, Send, User, ShieldCheck, Loader2 } from 'lucide-react';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import useStore from '../../store/useStore';

/*
 * بريد وارد للعضو لقراءة ردود صاحب الموقع وإرسال رسائل جديدة.
 * القراءة/الكتابة على مجموعة messages بنفس شكل نموذج ContactOwnerModal:
 *   - رسائل العضو :  senderId=uid , receiverId='owner' , uid=uid
 *   - ردود المالك  :  senderId='admin' , receiverId=<member uid>  (تصل عبر receiverId==uid)
 * مطابقة بالـ uid أساساً (متوافق مع firestore.rules)، مع تضمين البريد/الجوال للتقييد.
 */
const MemberInbox = () => {
  const { user } = useAuth();
  const storeUser = useStore((s) => s.user);
  const uid = user?.uid || storeUser?.uid;
  const displayName =
    user?.displayName || user?.email || storeUser?.name || storeUser?.email || 'المستخدم';

  const [thread, setThread] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    const unsubs = [];
    const merge = {};
    const push = (key) => (snap) => {
      merge[key] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const all = [...(merge.incoming || []), ...(merge.outgoing || [])]
        .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
      setThread(all);
      setLoading(false);
    };
    unsubs.push(
      onSnapshot(
        query(collection(db, 'messages'), where('senderId', '==', uid)),
        push('outgoing'),
        () => {}
      )
    );
    unsubs.push(
      onSnapshot(
        query(collection(db, 'messages'), where('receiverId', '==', uid)),
        push('incoming'),
        () => {}
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [uid]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [thread.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError('');
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: uid,
        uid: uid || null,
        senderEmail: user?.email || storeUser?.email || null,
        senderPhone: storeUser?.phone || null,
        senderName: user?.displayName || storeUser?.name || user?.email || '',
        receiverId: 'owner',
        text: body,
        read: false,
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(),
      });
      setText('');
    } catch (e) {
      console.error('inbox send error:', e);
      setSendError('تعذّر الإرسال — حاول مرة أخرى.');
    } finally {
      setSending(false);
    }
  };

  const fmt = (ts) => {
    if (!ts) return '';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString('ar', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const isFromOwner = (m) =>
    m.senderId === 'admin' || m.adminMessage === true;

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '1rem',
        fontFamily: 'Tajawal',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: '1rem',
          color: 'var(--rz-ink)',
          fontWeight: 900,
          fontSize: '1.35rem',
        }}
      >
        <Mail size={24} style={{ color: 'var(--rz-primary)' }} aria-hidden="true" />
        بريد العضو الوارد
      </div>

      <div
        style={{
          background: 'linear-gradient(160deg, var(--rz-ivory), var(--rz-ivory))',
          border: '2px solid var(--rz-primary)',
          borderRadius: 20,
          padding: '0.5rem',
          boxShadow: '0 12px 40px rgba(var(--rz-ink-rgb), 0.18)',
        }}
      >
        <div
          ref={listRef}
          style={{
            height: 360,
            overflowY: 'auto',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {loading && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--rz-primary)', display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
              <Loader2 size={18} className="spin" aria-hidden="true" />
              جاري تحميل الرسائل...
            </div>
          )}
          {!loading && thread.length === 0 && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--rz-primary)', fontWeight: 700, lineHeight: 2 }}>
              لا توجد رسائل بعد.
              <br />
              استخدم زرّ «مراسلة صاحب الموقع» لإرسال استفسار، وستظهر الردود هنا.
            </div>
          )}
          {thread.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: isFromOwner(m) ? 'flex-start' : 'flex-end',
                maxWidth: '78%',
                background: isFromOwner(m) ? 'var(--rz-ivory)' : 'linear-gradient(135deg,var(--rz-ink),var(--rz-primary))',
                color: isFromOwner(m) ? 'var(--rz-ink)' : 'var(--rz-white)',
                border: isFromOwner(m) ? '1px solid var(--rz-primary)' : 'none',
                borderRadius: 14,
                padding: '0.6rem 0.85rem',
                fontSize: '0.92rem',
                lineHeight: 1.7,
                fontWeight: isFromOwner(m) ? 600 : 700,
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  marginBottom: 4,
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  opacity: 0.75,
                  fontWeight: 800,
                }}
              >
                {isFromOwner(m) ? <ShieldCheck size={13} aria-hidden="true" /> : <User size={13} aria-hidden="true" />}
                {isFromOwner(m) ? 'رد صاحب الموقع' : 'أنت'} · {fmt(m.createdAt)}
              </div>
              <div>{m.text}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '0.65rem', borderTop: '1px solid var(--rz-ivory)' }}>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (sendError) setSendError('');
            }}
            rows={3}
            maxLength={1000}
            placeholder="اكتب ردّك أو استفسارك لصاحب الموقع..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              resize: 'vertical',
              borderRadius: 12,
              border: '1.5px solid var(--rz-primary)',
              background: 'var(--rz-ivory)',
              padding: '0.6rem 0.8rem',
              fontFamily: 'Tajawal',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--rz-ink)',
              outline: 'none',
              lineHeight: 1.8,
            }}
          />
          {sendError && (
            <div style={{ fontSize: '0.78rem', color: 'var(--rz-primary)', fontWeight: 800, marginTop: 4 }}>
              {sendError}
            </div>
          )}
          <button
            type="button"
            onClick={send}
            disabled={!text.trim() || sending}
            style={{
              marginTop: 10,
              width: '100%',
              border: 'none',
              borderRadius: 12,
              padding: '0.7rem',
              fontFamily: 'Tajawal',
              fontWeight: 900,
              fontSize: '0.95rem',
              cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: 'var(--rz-white)',
              background: text.trim() && !sending
                ? 'linear-gradient(135deg,var(--rz-ink),var(--rz-primary))'
                : 'var(--rz-muted)',
              boxShadow: text.trim() && !sending ? '0 8px 20px rgba(var(--rz-ink-rgb), 0.3)' : 'none',
            }}
          >
            <Send size={16} aria-hidden="true" />
            {sending ? 'جاري الإرسال...' : 'إرسال'}
          </button>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--rz-primary)', fontWeight: 700, marginTop: '0.75rem' }}>
        الرسائل خاصة بينك وبين صاحب الموقع.
      </p>
    </div>
  );
};

export default MemberInbox;