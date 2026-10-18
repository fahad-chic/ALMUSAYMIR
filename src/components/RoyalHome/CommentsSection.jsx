// src/components/RoyalHome/CommentsSection.jsx
import React, { useEffect, useState, useRef } from 'react';
import {
  MessageCircle,
  Send,
  X,
  CheckCircle2,
  Sparkles,
  User,
  Mail,
  MapPin,
} from 'lucide-react';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';

const COMMENTS_COLLECTION = 'comments';
const MAX_COMMENT_LENGTH = 250;

const CommentsSection = () => {
  const [approvedComments, setApprovedComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', city: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Full comment view
  const [selectedComment, setSelectedComment] = useState(null);
  const [showAllComments, setShowAllComments] = useState(false);

  // Ticker
  const [currentIndex, setCurrentIndex] = useState(0);
  const tickerRef = useRef(null);

  // =========================================================
  // تحميل التعليقات المعتمدة فقط
  // =========================================================
  useEffect(() => {
    let unsubscribe = null;

    try {
      const commentsRef = collection(db, COMMENTS_COLLECTION);
      const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));

      unsubscribe = onSnapshot(
        commentsQuery,
        (snapshot) => {
          const loaded = snapshot.docs
            .map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                text: typeof data.text === 'string' ? data.text : '',
                name: typeof data.name === 'string' ? data.name : 'زائر',
                city: typeof data.city === 'string' ? data.city : '',
                status: data.status || 'approved',
                createdAt: data.createdAt || null,
              };
            })
            .filter((c) => c.status === 'approved' && c.text.trim());

          setApprovedComments(loaded);
          setLoadError('');
          setIsLoading(false);
        },
        (error) => {
          console.error('Comments Firestore error:', error);
          setApprovedComments([]);
          setLoadError('تعذر تحميل التعليقات حالياً.');
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Comments initialization error:', error);
      setApprovedComments([]);
      setLoadError('تعذر تحميل التعليقات حالياً.');
      setIsLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // =========================================================
  // الشريط المتحرك المستمر
  // =========================================================
  useEffect(() => {
    if (approvedComments.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % approvedComments.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [approvedComments.length]);

  // =========================================================
  // إرسال التعليق
  // =========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, city, text } = form;

    if (!name.trim() || !text.trim() || isSubmitting) return;
    if (text.trim().length > MAX_COMMENT_LENGTH) {
      setLoadError(`التعليق يجب ألا يتجاوز ${MAX_COMMENT_LENGTH} حرفاً.`);
      return;
    }

    setIsSubmitting(true);
    setLoadError('');

    try {
      await addDoc(collection(db, COMMENTS_COLLECTION), {
        name: name.trim(),
        email: email.trim() || '',
        city: city.trim() || '',
        text: text.trim(),
        status: 'pending',
        likes: 0,
        createdAt: serverTimestamp(),
      });

      setSubmitSuccess(true);
      setForm({ name: '', email: '', city: '', text: '' });
    } catch (error) {
      console.error('Error adding comment:', error);
      setLoadError('تعذر إرسال التعليق. تأكد من اتصال الموقع ثم حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSubmitSuccess(false);
    setForm({ name: '', email: '', city: '', text: '' });
    setLoadError('');
  };

  const currentComment = approvedComments[currentIndex] || null;

  return (
    <section
      dir="rtl"
      aria-labelledby="comments-title"
      style={{
        width: '100%',
        marginTop: '1.1rem',
        marginBottom: '0.5rem',
        padding: '0.85rem 0.9rem',
        boxSizing: 'border-box',
        background: 'linear-gradient(145deg, var(--rz-ivory) 0%, var(--rz-ivory) 52%, var(--rz-ivory) 100%)',
        border: '1px solid rgba(var(--rz-primary-rgb), 0.22)',
        borderRadius: 18,
        boxShadow: '0 10px 28px rgba(var(--rz-primary-rgb), 0.08), inset 0 1px 0 rgba(var(--rz-white-rgb), 0.8)',
        fontFamily: 'Tajawal, Arial, sans-serif',
      }}
    >
      {/* Header + زر آراء العملاء */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.6rem',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(145deg, var(--rz-primary) 0%, var(--rz-primary) 100%)',
              color: 'var(--rz-ivory)',
              boxShadow: '0 4px 12px rgba(var(--rz-primary-rgb), 0.2)',
            }}
          >
            <MessageCircle size={17} strokeWidth={2.3} />
          </div>
          <div>
            <h2
              id="comments-title"
              style={{
                margin: 0,
                color: 'var(--rz-ink)',
                fontSize: '0.95rem',
                fontWeight: 800,
                lineHeight: 1.3,
              }}
            >
              آراء العملاء
            </h2>
            <button
              type="button"
              onClick={() => setShowAllComments(true)}
              disabled={isLoading || approvedComments.length === 0}
              style={{
                margin: 0,
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: approvedComments.length > 0 && !isLoading ? 'var(--rz-primary)' : 'var(--rz-primary)',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: approvedComments.length > 0 && !isLoading ? 'pointer' : 'default',
                fontFamily: 'inherit',
                textDecoration: approvedComments.length > 0 && !isLoading ? 'underline' : 'none',
                textUnderlineOffset: 2,
              }}
            >
              {isLoading
                ? 'جاري التحميل...'
                : approvedComments.length > 0
                  ? 'لمشاهدة جميع التعليقات اضغط هنا'
                  : 'لا توجد تعليقات معتمدة'}
            </button>
          </div>
        </div>

        {/* الزر الصغير الاحترافي */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '0.4rem 0.8rem',
            borderRadius: 999,
            border: '1.5px solid rgba(var(--rz-primary-rgb), 0.55)',
            background: 'linear-gradient(145deg, var(--rz-primary) 0%, rgb(18, 28, 42) 100%)',
            color: 'var(--rz-white)',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(var(--rz-primary-rgb), 0.35)',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          <Sparkles size={13} color="var(--rz-gold)" />
          أضف تعليقك هنا
        </button>
      </div>

      {/* الشريط المتحرك */}
      {!isLoading && approvedComments.length > 0 && (
        <div
          ref={tickerRef}
          onClick={() => currentComment && setSelectedComment(currentComment)}
          style={{
            position: 'relative',
            overflow: 'hidden',
            height: 42,
            borderRadius: 11,
            background: 'linear-gradient(90deg, rgba(var(--rz-primary-rgb), 0.12) 0%, rgba(var(--rz-primary-rgb), 0.08) 50%, rgba(var(--rz-primary-rgb), 0.12) 100%)',
            border: '1px solid rgba(var(--rz-primary-rgb), 0.18)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            boxShadow: 'inset 0 1px 0 rgba(var(--rz-white-rgb), 0.08)',
          }}
        >
          <div
            key={currentComment?.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              animation: 'tickerSlide 0.45s ease-out',
            }}
          >
            <span
              style={{
                flexShrink: 0,
                background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
                color: 'var(--rz-white)',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: 6,
              }}
            >
              {currentComment?.name || 'زائر'}
            </span>
            <span
              style={{
                color: 'var(--rz-ink)',
                fontSize: '0.78rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentComment?.text}
            </span>
          </div>
        </div>
      )}

      {!isLoading && approvedComments.length === 0 && !loadError && (
        <div
          style={{
            textAlign: 'center',
            padding: '0.9rem 0.5rem',
            color: 'var(--rz-primary)',
            fontSize: '0.78rem',
          }}
        >
          كن أول من يشارك تجربته
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 0.7rem',
            borderRadius: 8,
            background: 'rgba(var(--rz-primary-rgb), 0.06)',
            border: '1px solid rgba(var(--rz-primary-rgb), 0.15)',
            color: 'var(--rz-primary)',
            fontSize: '0.75rem',
          }}
        >
          {loadError}
        </div>
      )}

      {/* مودال جميع التعليقات المعتمدة */}
      {showAllComments && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="all-comments-title"
          onClick={() => setShowAllComments(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(var(--rz-ink-rgb), 0.62)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 7200,
            padding: 14,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, var(--rz-ivory), var(--rz-ivory))',
              border: '1.5px solid rgba(var(--rz-primary-rgb), 0.45)',
              borderRadius: 18,
              padding: '1.1rem',
              maxWidth: 420,
              width: '100%',
              maxHeight: '82vh',
              overflowY: 'auto',
              boxShadow: '0 22px 50px rgba(var(--rz-ink-rgb), 0.35)',
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <h3
                id="all-comments-title"
                style={{
                  margin: 0,
                  color: 'var(--rz-ink)',
                  fontSize: '1rem',
                  fontWeight: 800,
                }}
              >
                جميع آراء العملاء
              </h3>
              <button
                type="button"
                onClick={() => setShowAllComments(false)}
                style={{
                  background: 'rgba(var(--rz-ink-rgb), 0.06)',
                  border: 'none',
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--rz-ink)',
                }}
              >
                <X size={17} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {approvedComments.map((comment, index) => (
                <button
                  key={comment.id}
                  type="button"
                  onClick={() => setSelectedComment(comment)}
                  style={{
                    width: '100%',
                    textAlign: 'right',
                    background: 'var(--rz-ivory)',
                    border: '1px solid rgba(var(--rz-primary-rgb), 0.28)',
                    borderRadius: 11,
                    padding: '0.75rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--rz-ink)',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                      }}
                    >
                      {comment.name || 'زائر'}
                    </span>
                    <span
                      style={{
                        color: 'var(--rz-primary)',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                      }}
                    >
                      {index + 1}
                    </span>
                  </div>
                  {comment.city && (
                    <div
                      style={{
                        color: 'var(--rz-primary)',
                        fontSize: '0.68rem',
                        marginBottom: 4,
                      }}
                    >
                      {comment.city}
                    </div>
                  )}
                  <p
                    style={{
                      margin: 0,
                      color: 'var(--rz-ink)',
                      fontSize: '0.78rem',
                      lineHeight: 1.65,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {comment.text}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* مودال كتابة التعليق */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(var(--rz-ink-rgb), 0.62)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 7000,
            padding: 14,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, var(--rz-ivory), var(--rz-ivory))',
              border: '1.5px solid rgba(var(--rz-primary-rgb), 0.45)',
              borderRadius: 18,
              padding: '1.25rem 1.1rem',
              maxWidth: 360,
              width: '100%',
              boxShadow: '0 22px 50px rgba(var(--rz-ink-rgb), 0.35)',
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            {submitSuccess ? (
              <div style={{ textAlign: 'center' }}>
                <CheckCircle2 size={42} color="var(--rz-ink)" style={{ marginBottom: 10 }} />
                <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--rz-ink)' }}>
                  تم الإرسال بنجاح
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--rz-ink)', lineHeight: 1.65 }}>
                  شكراً لك، نفيدكم بأنه تم إرسال تعليقك للإدارة المختصة وسوف يتم مراجعة تعليقك ثم يتم إضافة التعليق بعد المراجعة.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    marginTop: 16,
                    width: '100%',
                    background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
                    color: 'var(--rz-white)',
                    border: 'none',
                    borderRadius: 10,
                    padding: '0.55rem',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  حسناً
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--rz-ink)' }}>
                    ✔️ أكتب رأيك عن تجربتك
                  </h3>
                  <button
                    type="button"
                    onClick={closeModal}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--rz-primary)',
                      padding: 4,
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div style={{ position: 'relative' }}>
                    <User size={14} style={{ position: 'absolute', right: 10, top: 11, color: 'var(--rz-primary)' }} />
                    <input
                      type="text"
                      required
                      placeholder="الاسم"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.55rem 2rem 0.55rem 0.7rem',
                        borderRadius: 9,
                        border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
                        background: 'var(--rz-white)',
                        fontSize: '0.82rem',
                        fontFamily: 'inherit',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={{ position: 'absolute', right: 10, top: 11, color: 'var(--rz-primary)' }} />
                    <input
                      type="email"
                      placeholder="الإيميل (اختياري)"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.55rem 2rem 0.55rem 0.7rem',
                        borderRadius: 9,
                        border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
                        background: 'var(--rz-white)',
                        fontSize: '0.82rem',
                        fontFamily: 'inherit',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ position: 'relative' }}>
                    <MapPin size={14} style={{ position: 'absolute', right: 10, top: 11, color: 'var(--rz-primary)' }} />
                    <input
                      type="text"
                      placeholder="المدينة"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.55rem 2rem 0.55rem 0.7rem',
                        borderRadius: 9,
                        border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
                        background: 'var(--rz-white)',
                        fontSize: '0.82rem',
                        fontFamily: 'inherit',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <textarea
                    required
                    placeholder="اكتب رأيك عن تجربتك..."
                    value={form.text}
                    maxLength={MAX_COMMENT_LENGTH}
                    onChange={(e) => setForm({ ...form, text: e.target.value })}
                    rows={3}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.55rem 0.7rem',
                      borderRadius: 9,
                      border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
                      background: 'var(--rz-white)',
                      fontSize: '0.82rem',
                      fontFamily: 'inherit',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting || !form.name.trim() || !form.text.trim()}
                    style={{
                      marginTop: 4,
                      width: '100%',
                      background:
                        form.name.trim() && form.text.trim() && !isSubmitting
                          ? 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))'
                          : 'var(--rz-ivory)',
                      color:
                        form.name.trim() && form.text.trim() && !isSubmitting
                          ? 'var(--rz-white)'
                          : 'var(--rz-ink)',
                      border: 'none',
                      borderRadius: 10,
                      padding: '0.6rem',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: form.name.trim() && form.text.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Send size={15} />
                    {isSubmitting ? 'جاري الإرسال...' : 'إرسال'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* مودال عرض التعليق الكامل */}
      {selectedComment && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedComment(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(var(--rz-ink-rgb), 0.62)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 7100,
            padding: 14,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, var(--rz-ivory), var(--rz-ivory))',
              border: '1.5px solid rgba(var(--rz-primary-rgb), 0.45)',
              borderRadius: 16,
              padding: '1.15rem 1rem',
              maxWidth: 340,
              width: '100%',
              position: 'relative',
              boxShadow: '0 20px 45px rgba(var(--rz-ink-rgb), 0.35)',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedComment(null)}
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                background: 'rgba(var(--rz-ink-rgb), 0.06)',
                border: 'none',
                borderRadius: 8,
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--rz-ink)',
              }}
            >
              <X size={16} />
            </button>

            <div style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 800, color: 'var(--rz-ink)', fontSize: '0.9rem' }}>
                {selectedComment.name}
              </span>
              {selectedComment.city && (
                <span style={{ color: 'var(--rz-primary)', fontSize: '0.75rem', marginRight: 6 }}>
                  • {selectedComment.city}
                </span>
              )}
            </div>
            <p style={{ margin: 0, color: 'var(--rz-ink)', fontSize: '0.88rem', lineHeight: 1.7 }}>
              {selectedComment.text}
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tickerSlide {
          0% { opacity: 0; transform: translateY(8px); }
          40% { opacity: 1; transform: translateY(0); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
};

export default CommentsSection;