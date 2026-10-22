import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  increment,
  addDoc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  arrayUnion,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { ensureFirebaseSession } from '../utils/firebaseSession';
import { notifyOwner } from '../utils/visitorNotify';
import { db, auth } from '../firebase/config';
import VerifiedBadge from '../components/haraj/VerifiedBadge';
import SizeMatcher from '../components/haraj/SizeMatcher';
import AuctionPanel from '../components/haraj/AuctionPanel';
import EscrowPanel from '../components/haraj/EscrowPanel';
import { hasAnySize } from '../utils/dressMeta';
import {
  ArrowRight,
  MapPin,
  Clock,
  Phone,
  User,
  Eye,
  MessageCircle,
  ShieldCheck,
  Share2,
  Copy,
  Send,
  Mail,
  Lock,
} from 'lucide-react';
import usePermissions from '../permissions/usePermissions';
import { requirePerm, showIfCan } from '../permissions/rbacService';

const ADMIN_NUMBER = '0536667222';

const C = {
  gold: 'var(--rz-primary)',
  goldDark: 'var(--rz-primary)',
  ink: 'var(--rz-ink)',
  inkSoft: 'var(--rz-ink)',
  cream: 'var(--rz-ivory)',
  creamLight: 'var(--rz-ivory)',
  card: 'var(--rz-ivory)',
  line: 'var(--rz-ivory)',
};

const timeAgo = (timestamp) => {
  if (!timestamp?.toDate) return '';
  const diffMs = Date.now() - timestamp.toDate().getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return mins <= 1 ? 'الآن' : `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'منذ يوم' : `منذ ${days} أيام`;
};

export default function AdDetailsPage() {
  const { can, isOwner } = usePermissions();
  const handleModDelete = async () => {
    if (!ad?.id) return;
    if (!window.confirm('تأكيد حذف هذا الإعلان؟')) return;
    try {
      await requirePerm(can, 'HARAJ_POST_DELETE', 'حذف إعلان حراج', ad.id);
      await deleteDoc(doc(db, 'haraj_ads', ad.id));
      window.history.back();
    } catch (e) {
      alert(e?.message || 'تعذر الحذف');
    }
  };

  const { id } = useParams();
  const navigate = useNavigate();

  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);

  const [harajUser, setHarajUser] = useState(null);
  const [chatReady, setChatReady] = useState(false);
  const [chatError, setChatError] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // canonical موحّد للإعلان — يمنع ازدواج المحتوى بين /ad/:id و /haraj/ad/:id
  useEffect(() => {
    if (!id) return;
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = 'https://rooz-store.pages.dev/ad/' + id;
    document.head.appendChild(link);
    return () => link.remove();
  }, [id]);

  // SEO ديناميكي لكل إعلان — عنوانه ووصفه ومشاركته تظهر لمحركات البحث
  // والمشاركة عند فتح الصفحة. (للقراءة العامة: صفحة الإعلان الآن مفتوحة.)
  useEffect(() => {
    if (!ad) return;
    const price = Number(ad.price) || 0;
    const title = `${ad.title || 'إعلان حراج'} — ${price} ريال | حراج المسيمير`;
    const description =
      `${ad.description || ''}`.slice(0, 155) ||
      `إعلان في حراج المسيمير — ${ad.category || 'أصناف متعددة'}${ad.city ? ' في ' + ad.city : ''}`;
    const url = 'https://rooz-store.pages.dev/ad/' + id;
    document.title = title;
    const setMeta = (selector, value) => {
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(selector.startsWith('meta[property') ? 'property' : 'name', selector.match(/property="([^"]+)/)?.[1] || selector.match(/name="([^"]+)/)?.[1] || 'description');
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:url"]', url);
    setMeta('meta[property="og:type"]', 'article');
    const img = ad.images?.[0];
    if (img && /^https?:/.test(img)) {
      setMeta('meta[property="og:image"]', img);
    }
  }, [ad, id]);

  // قراءة جلسة حراج المحلية (تسجيل الحراج يعمل عبر localStorage)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('harajUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') setHarajUser(parsed);
      }
    } catch {
      localStorage.removeItem('harajUser');
    }
  }, []);

  // جلب الإعلان
  useEffect(() => {
    if (!id || !db) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, 'haraj_ads', id));
        if (!cancelled && snap.exists()) {
          setAd({ id: snap.id, ...snap.data() });
          try {
            await updateDoc(doc(db, 'haraj_ads', id), { views: increment(1) });
          } catch {
            /* عداد المشاهدات غير حرج */
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const sellerKey = useMemo(() => {
    if (!ad) return '';
    // V2/V3: نحافظ على مفتاح الهاتف في chatId (توافق مع المحادثات القائمة)،
    // فالمعرف القديم harajUserId/الهاتف هو الأقرب لهوية البائع عبر الأجهزة.
    return String(ad.harajUserId || ad.userPhone || ad.userId || ad.userEmail || ad.userName || 'seller');
  }, [ad]);

  const buyerKey = useMemo(() => {
    if (!harajUser) return '';
    return String(harajUser.phone || harajUser.userPhone || harajUser.email || harajUser.name || 'visitor');
  }, [harajUser]);

  const isSeller = useMemo(() => {
    if (!ad || !harajUser) return false;
    const sellerPhone = String(ad.userPhone || '').replace(/\D/g, '');
    const myPhone = String(harajUser.phone || harajUser.userPhone || '').replace(/\D/g, '');
    return sellerPhone && myPhone && sellerPhone === myPhone;
  }, [ad, harajUser]);

  const chatId = useMemo(() => {
    if (!ad || !buyerKey || !sellerKey) return '';
    const participants = [sellerKey, buyerKey]
      .map((key) => String(key).trim())
      .sort()
      .join('_');
    return `haraj_${ad.id}_${participants}`.replace(/[^\w-]/g, '_');
  }, [ad, buyerKey, sellerKey]);

  // تجهيز الدردشة: دخول مجهول صامت ثم استماع مباشر للرسائل
  useEffect(() => {
    if (!chatId || !db || !auth) return;
    let unsub = null;
    let cancelled = false;
    setChatReady(false);
    setChatError('');
    (async () => {
      try {
        if (!auth.currentUser) await signInAnonymously(auth);
        if (cancelled) return;
        const msgsRef = collection(db, 'chats', chatId, 'messages');
        unsub = onSnapshot(
          query(msgsRef, orderBy('createdAt', 'asc')),
          (snap) => {
            if (cancelled) return;
            setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setChatReady(true);
          },
          () => {
            if (!cancelled) {
              setChatError('تعذر فتح الرسائل حالياً، حاول لاحقاً.');
              setChatReady(true);
            }
          }
        );
      } catch {
        if (!cancelled) {
          setChatError('تعذر تجهيز المحادثة، تحقق من اتصالك.');
          setChatReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !chatId || !db || sending) return;
    setSending(true);
    try {
      // V1: يجب إنشاء وثيقة المحادثة (بالهوية) قبل أول رسالة، لأن قاعدة رسائل
      // المحادثة تشترط وجود وثيقة المحادثة وأن يكون المُرسل مشاركاً فيها.
      try {
        await setDoc(
          doc(db, 'chats', chatId),
          {
            adId: ad.id,
            adTitle: ad.title || '',
            sellerKey,
            buyerKey,
            buyerName: harajUser?.name || 'زائر',
            buyerUid: auth?.currentUser?.uid || '',
            participantUids: auth?.currentUser?.uid ? [auth.currentUser.uid] : [],
            // V1: هوية البائع الحقيقية = ad.userId (uid مصادقة)، ليتمكن من القراءة.
            sellerUid: ad.userId || '',
            lastMessage: text,
            updatedAt: serverTimestamp(),
            isPrivate: true,
            type: 'haraj_ad_chat',
          },
          { merge: true }
        );
      } catch {
        /* وثيقة الملخص غير حرج */
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text,
        senderKey: buyerKey,
        senderName: harajUser?.name || harajUser?.userName || 'زائر',
        createdAt: serverTimestamp(),
      });

      setDraft('');
    } catch {
      setChatError('لم يتم إرسال الرسالة، حاول مرة أخرى.');
    } finally {
      setSending(false);
    }
  };

  const handleCall = () => {
    const phone = ad?.userPhone || ad?.phone;
    if (phone) window.location.href = `tel:${phone}`;
  };

  // إرسال مزايدة جديدة في المزاد العلني (٤٨ ساعة)
  const handleBid = async (amount) => {
    if (!ad || !db) return;
    const bidderName = harajUser?.name || harajUser?.userName || 'مزايد';
    const bidderKey = String(
      harajUser?.phone || harajUser?.userPhone || harajUser?.email || bidderName
    );
    try {
      await updateDoc(doc(db, 'haraj_ads', ad.id), {
        currentBid: amount,
        bids: arrayUnion({
          amount,
          bidderName,
          bidderKey,
          at: Date.now(),
        }),
        updatedAt: serverTimestamp(),
      });
      notifyOwner(
        'مزايدة جديدة',
        `${bidderName} زايد بمبلغ ${Number(amount).toLocaleString()} ريال على «${ad.title}»`
      );
    } catch {
      /* فشل المزايدة يُظهر تنبيهاً بسيطاً */
      alert('تعذّر إرسال المزايدة، حاول مرة أخرى.');
    }
  };

  // خطوات الوساطة الآمنة (الدفع/الشحن/الاستلام/التحرير)
  const handleEscrowAction = async (action) => {
    if (!ad || !db) return;
    const now = Date.now();
    const nextStatus =
      action === 'pay'
        ? 'paid'
        : action === 'ship'
        ? 'shipped'
        : action === 'receive'
        ? 'received'
        : 'released';
    const escrow = {
      status: nextStatus,
      commissionRate: ad.condition === 'used' ? 0.01 : 0.02,
      updatedAt: now,
      reviewUntil: nextStatus === 'received' ? now + 24 * 3600 * 1000 : null,
    };
    try {
      await updateDoc(doc(db, 'haraj_ads', ad.id), { escrow, updatedAt: serverTimestamp() });
      notifyOwner(
        'تحديث الوساطة الآمنة',
        `«${ad.title}» — الحالة الجديدة: ${nextStatus}`
      );
    } catch {
      alert('تعذّر تحديث حالة الوساطة، حاول مرة أخرى.');
    }
  };

  const handleShare = () => {
    const adUrl = `${window.location.origin}/haraj/ad/${ad.id}`;
    const text = `${ad.title} — ${Number(ad.price || 0).toLocaleString()} ريال | حراج المسيمير | ALMUSAYMIR\n${adUrl}`;
    if (navigator.share) {
      navigator.share({ title: ad.title, text, url: adUrl }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleCopyLink = () => {
    const adUrl = `${window.location.origin}/haraj/ad/${ad.id}`;
    navigator.clipboard?.writeText(adUrl).then(() => alert('تم نسخ رابط الإعلان'));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.inkSoft, fontFamily: 'Tajawal' }}>
        جاري تحميل الإعلان...
      </div>
    );
  }

  if (!ad) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'Tajawal', color: C.ink }}>
        <p style={{ fontSize: 18, fontWeight: 700 }}>الإعلان غير موجود أو تم حذفه</p>
        <button type="button" onClick={() => navigate('/haraj')} style={goldBtn}>
          العودة إلى الحراج
        </button>
      </div>
    );
  }

  const images = Array.isArray(ad.images) ? ad.images.filter(Boolean) : [];
  const mainImage = images[imgIndex] || null;

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${C.cream} 0%, var(--rz-ivory) 55%, var(--rz-ivory) 100%)`,
        fontFamily: 'Tajawal, sans-serif',
        color: C.ink,
        padding: '1rem',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => navigate('/haraj')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: C.card,
            border: `1px solid ${C.line}`,
            borderRadius: 12,
            padding: '10px 18px',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 700,
            color: C.ink,
            marginBottom: 16,
            fontFamily: 'inherit',
          }}
        >
          <ArrowRight size={18} /> العودة للحراج
        </button>

        {/* الصور */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.line}`,
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(var(--rz-ink-rgb), 0.12)',
          }}
        >
          <div
            style={{
              height: 320,
              background: `linear-gradient(135deg, ${C.creamLight}, var(--rz-ivory))`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {mainImage ? (
              <img loading="lazy" decoding="async"
                src={mainImage}
                alt={ad.title || 'إعلان'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <ShieldCheck size={64} color={C.gold} strokeWidth={1.2} />
            )}
            {ad.condition && (
              <span
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
                  color: 'var(--rz-white)',
                  padding: '5px 14px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(var(--rz-ink-rgb), 0.2)',
                }}
              >
                {ad.condition === true ? 'جديد' : ad.condition}
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 8, padding: 10, overflowX: 'auto' }}>
              {images.map((img, i) => (
                <img loading="lazy" decoding="async"
                  key={i}
                  src={img}
                  alt={`صورة ${i + 1}`}
                  onClick={() => setImgIndex(i)}
                  style={{
                    width: 72,
                    height: 72,
                    objectFit: 'cover',
                    borderRadius: 10,
                    border: imgIndex === i ? `3px solid ${C.gold}` : `1px solid ${C.line}`,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* العنوان والسعر */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.line}`,
            borderRadius: 20,
            padding: 20,
            marginTop: 14,
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(var(--rz-ink-rgb), 0.10)',
          }}
        >
          <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 800 }}>
            {ad.title || 'إعلان بدون عنوان'}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 'clamp(1.6rem, 5vw, 2.4rem)',
              fontWeight: 800,
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {Number(ad.price || 0).toLocaleString()} ريال
          </p>
          {ad.description && (
            <p style={{ marginTop: 14, lineHeight: 1.9, whiteSpace: 'pre-line', textAlign: 'right', color: C.inkSoft, fontSize: 15 }}>
              {ad.description}
            </p>
          )}
        </div>

        {/* المنتج في الحركة — معاينة إطارات الفيديو القصير */}
        {Array.isArray(ad.motionFrames) && ad.motionFrames.length > 0 && (
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.line}`,
              borderRadius: 20,
              padding: 16,
              marginTop: 14,
              boxShadow: '0 8px 30px rgba(var(--rz-ink-rgb), 0.10)',
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800, textAlign: 'center' }}>
              المنتج في الحركة
            </h3>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {ad.motionFrames.map((frame, i) => (
                <img
                  key={i}
                  src={frame}
                  alt={`حركة ${i + 1}`}
                  loading="lazy"
                  style={{ width: 88, height: 110, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.line}`, flexShrink: 0 }}
                />
              ))}
            </div>
          </div>
        )}

        {/* حاسبة المقاسات الذكية */}
        {hasAnySize(ad.measurements || {}) && <SizeMatcher dress={ad.measurements || {}} />}

        {/* المزاد العلني (٤٨ ساعة) */}
        {ad.isAuction && (
          <AuctionPanel
            ad={ad}
            onBid={handleBid}
            disabled={isSeller}
            currentUserKey={buyerKey}
          />
        )}

        {/* الوساطة الآمنة */}
        {ad.escrow && <EscrowPanel ad={ad} role={isSeller ? 'seller' : 'buyer'} onAction={handleEscrowAction} />}

        {/* بيانات المعلن */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.line}`,
            borderRadius: 20,
            padding: 20,
            marginTop: 14,
            boxShadow: '0 8px 30px rgba(var(--rz-ink-rgb), 0.10)',
          }}
        >
          <h3 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 800, textAlign: 'center', color: C.ink }}>
            بيانات المعلن
          </h3>
          <div style={{ display: 'grid', gap: 10, fontSize: 15 }}>
            <div style={infoRow}>
              <User size={18} color={C.gold} />
              <span style={{ fontWeight: 700 }}>{ad.userName || 'معلن'}</span>
              {(isOwner || showIfCan(can, 'HARAJ_POST_DELETE')) && (
        <button type="button" onClick={handleModDelete} style={{
          marginBottom: 10, padding: '8px 12px', borderRadius: 10,
          border: '1px solid rgba(179,38,30,0.35)', background: '#FBEAE7',
          color: '#B3261E', fontWeight: 800, fontSize: 13, cursor: 'pointer'
        }}>حذف الإعلان (صلاحية مشرف)</button>
      )}
      <VerifiedBadge verified={ad.sellerVerified || ad.verified} withLabel />
            </div>
            {(ad.city || ad.location || ad.userRegion) && (
              <div style={infoRow}>
                <MapPin size={18} color={C.gold} />
                <span>{ad.city || ad.location || ad.userRegion}</span>
              </div>
            )}
            <div style={infoRow}>
              <Clock size={18} color={C.gold} />
              <span>{timeAgo(ad.createdAt) || 'حديثاً'}</span>
            </div>
            <div style={infoRow}>
              <Eye size={18} color={C.gold} />
              <span>{ad.views || 0} مشاهدة</span>
            </div>
          </div>

          {/* زر الاتصال — اختياري: يظهر فقط إن وضع المعلن رقمه */}
          {(ad.userPhone || ad.phone) && !isSeller && (
            <button type="button" onClick={handleCall} style={{ ...goldBtn, marginTop: 16 }}>
              <Phone size={18} /> اتصال بالمعلن — {ad.userPhone || ad.phone}
            </button>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button type="button" onClick={handleShare} style={{ ...ghostBtn, flex: 1 }}>
              <Share2 size={16} /> مشاركة
            </button>
            <button type="button" onClick={handleCopyLink} style={{ ...ghostBtn, flex: 1 }}>
              <Copy size={16} /> نسخ الرابط
            </button>
          </div>
        </div>

        {/* الرسائل الخاصة — إلزامية لكل إعلان */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.line}`,
            borderRadius: 20,
            padding: 20,
            marginTop: 14,
            marginBottom: 30,
            boxShadow: '0 8px 30px rgba(var(--rz-ink-rgb), 0.10)',
          }}
        >
          <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Mail size={20} color={C.gold} /> المراسلة الخاصة مع المعلن
          </h3>
          <p style={{ margin: '0 0 14px', textAlign: 'center', fontSize: 12, color: C.inkSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Lock size={12} /> محادثة سرية بينك وبين المعلن — لا يطلع عليها الزوار
          </p>

          {isSeller ? (
            <p style={{ textAlign: 'center', color: C.inkSoft, fontSize: 14, background: C.creamLight, borderRadius: 12, padding: 14 }}>
              هذا إعلانك أنت — رسائل المشترين تصلك هنا عند بدئهم المحادثة.
            </p>
          ) : !harajUser ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: C.inkSoft, fontSize: 14, marginBottom: 12 }}>
                سجّل في منصة الحراج أولاً لتتمكن من مراسلة المعلن مباشرة وسرّياً.
              </p>
              <button type="button" onClick={() => navigate('/haraj')} style={goldBtn}>
                التسجيل في الحراج
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  background: C.creamLight,
                  border: `1px solid ${C.line}`,
                  borderRadius: 14,
                  minHeight: 180,
                  maxHeight: 320,
                  overflowY: 'auto',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {!chatReady && (
                  <p style={{ textAlign: 'center', color: C.inkSoft, fontSize: 13 }}>جاري تجهيز المحادثة...</p>
                )}
                {chatReady && messages.length === 0 && !chatError && (
                  <p style={{ textAlign: 'center', color: C.inkSoft, fontSize: 13 }}>
                    لا توجد رسائل بعد — ابدأ المحادثة مع المعلن الآن.
                  </p>
                )}
                {chatError && (
                  <p style={{ textAlign: 'center', color: 'var(--rz-primary)', fontSize: 13 }}>{chatError}</p>
                )}
                {messages.map((m) => {
                  const mine = m.senderKey === buyerKey;
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: mine ? 'flex-start' : 'flex-end',
                        maxWidth: '80%',
                        background: mine
                          ? `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`
                          : 'var(--rz-white)',
                        color: mine ? 'var(--rz-white)' : C.ink,
                        border: mine ? 'none' : `1px solid ${C.line}`,
                        borderRadius: 14,
                        padding: '8px 14px',
                        fontSize: 14,
                        lineHeight: 1.7,
                        boxShadow: '0 2px 8px rgba(var(--rz-ink-rgb), 0.10)',
                      }}
                    >
                      {m.text}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendMessage();
                  }}
                  placeholder="اكتب رسالتك للمعلن..."
                  style={{
                    flex: 1,
                    border: `1px solid ${C.line}`,
                    borderRadius: 12,
                    padding: '12px 14px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    background: 'var(--rz-white)',
                    color: C.ink,
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={sending || !draft.trim()}
                  style={{
                    ...goldBtn,
                    width: 'auto',
                    padding: '0 18px',
                    opacity: sending || !draft.trim() ? 0.6 : 1,
                  }}
                >
                  <Send size={18} />
                </button>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: C.inkSoft, paddingBottom: 24 }}>
          تنبيه: لا تدفع أي مبلغ قبل استلام السلعة. للشكاوى تواصل مع إدارة الموقع {ADMIN_NUMBER}
        </p>
      </div>
    </div>
  );
}

const infoRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  background: 'var(--rz-ivory)',
  border: '1px solid var(--rz-ivory)',
  borderRadius: 12,
  padding: '10px 14px',
};

const goldBtn = {
  width: '100%',
  padding: 14,
  background: 'linear-gradient(135deg, var(--rz-primary) 0%, var(--rz-primary) 55%, var(--rz-primary) 100%)',
  color: 'var(--rz-white)',
  border: 'none',
  borderRadius: 12,
  fontWeight: 800,
  fontSize: 15,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  fontFamily: 'inherit',
  boxShadow: '0 6px 20px rgba(var(--rz-primary-rgb), 0.35), inset 0 1px 0 rgba(var(--rz-white-rgb), 0.5)',
};

const ghostBtn = {
  padding: '10px 14px',
  background: 'var(--rz-white)',
  color: 'var(--rz-ink)',
  border: '1px solid var(--rz-ivory)',
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontFamily: 'inherit',
};