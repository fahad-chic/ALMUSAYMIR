// src/components/RoyalHome/AIChatWidget.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Send,
  X,
  UserRound,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

const ASSISTANT_NAME = 'المساعد الذكي';

const INITIAL_MESSAGE = {
  id: 'welcome',
  sender: 'bot',
  text: 'أهلاً وسهلاً فيك نورت موقع أناقة ROOZ 💐\nمعك علياء تفضل كيف أقدر أساعدك؟',
};

const SMART_RESPONSES = {
  دخول:
    'لتسجيل الدخول، اختر زر تسجيل الدخول من الموقع واتبع خطوات الدخول المتاحة.',
  تسجيل:
    'لإنشاء حساب جديد، اختر إنشاء حساب جديد ثم أكمل بيانات التسجيل المطلوبة.',
  طلب:
    'لإجراء طلب، اختر المنتج المناسب ثم أضفه إلى السلة وأكمل بيانات الشحن والدفع.',
  توصيل:
    'يمكنك معرفة تفاصيل التوصيل والشحن من معلومات الطلب قبل إتمام عملية الشراء.',
  إرجاع:
    'يمكنك مراجعة سياسة الإرجاع في الموقع لمعرفة الشروط والمدة المسموحة لكل طلب.',
  مقاس:
    'ننصح بمراجعة جدول المقاسات الموجود في صفحة المنتج قبل إتمام الطلب.',
  دفع:
    'تظهر وسائل الدفع المتاحة لك أثناء إتمام عملية الشراء حسب إعدادات المتجر.',
  ملاحظة:
    'للحصول على إجابة دقيقة بخصوص الإرجاع أو الطلب، اذكر رقم الطلب أو تفاصيل المشكلة دون مشاركة معلومات حساسة.',
};

const getSmartResponse = (text) => {
  const normalizedText = text.trim().toLowerCase();

  for (const [keyword, response] of Object.entries(SMART_RESPONSES)) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      return response;
    }
  }

  return 'أستطيع مساعدتك في المنتجات والطلبات والتوصيل والمقاسات والدفع والإرجاع. اكتب سؤالك بالتفصيل وسأحاول مساعدتك.';
};

const AIChatWidget = ({
  topOffset = 0,
  isOpen = false,
  onClose = () => {},
}) => {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const messageText = input.trim();

    if (!messageText || isLoading) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          context: 'royal-home',
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data?.reply || typeof data.reply !== 'string') {
        throw new Error('Invalid AI response');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.reply.trim(),
        },
      ]);
    } catch (error) {
      console.error('AI chat error:', error);

      setMessages((prev) => [
        ...prev,
        {
          id: `fallback-${Date.now()}`,
          sender: 'bot',
          text: getSmartResponse(messageText),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    if (isLoading) return;

    setMessages([INITIAL_MESSAGE]);
    setInput('');
  };

  // لا يوجد زر عائم أسود — النافذة فقط، وتُفتح من زر الترويسة
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Chat Window */}
      <div
        dir="rtl"
        role="dialog"
        aria-label="المساعد الذكي"
        style={{
          position: 'fixed',
          left: 'clamp(10px, 3vw, 24px)',
          top: `calc(clamp(84px, 9vw, 96px) + ${topOffset}px)`,
          width: 'min(390px, calc(100vw - 20px))',
          height: `min(570px, calc(100vh - 130px - ${topOffset}px))`,
          minHeight: 400,
          background:
            'linear-gradient(145deg, var(--rz-ivory) 0%, var(--rz-ivory) 100%)',
          border: '1px solid rgba(var(--rz-primary-rgb), 0.24)',
          borderRadius: 22,
          boxShadow:
            '0 24px 70px rgba(var(--rz-ink-rgb), 0.22), 0 5px 18px rgba(var(--rz-ink-rgb), 0.08)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          overflow: 'hidden',
          fontFamily: 'Tajawal, Arial, sans-serif',
        }}
      >
        {/* Header */}
        <header
          style={{
            flexShrink: 0,
            padding: '0.95rem 1rem',
            background:
              'linear-gradient(135deg, var(--rz-ink) 0%, var(--rz-ink) 55%, var(--rz-ink) 100%)',
            color: 'var(--rz-white)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.7rem',
            boxShadow: '0 3px 14px rgba(var(--rz-ink-rgb), 0.10)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              background: 'linear-gradient(145deg, var(--rz-ink) 0%, var(--rz-ink) 55%, var(--rz-ink) 100%)',
              border: '1.5px solid rgba(var(--rz-gold-rgb), 0.85)',
              boxShadow: '0 4px 12px rgba(var(--rz-ink-rgb), 0.45), inset 0 1px 1px rgba(var(--rz-white-rgb), 0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bot size={21} strokeWidth={2.1} color="var(--rz-primary)" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                fontSize: '0.98rem',
                fontWeight: 900,
                lineHeight: 1.4,
                background: 'linear-gradient(120deg, var(--rz-ivory) 0%, var(--rz-primary) 35%, var(--rz-primary) 60%, var(--rz-ivory) 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                textShadow: '0 1px 8px rgba(var(--rz-primary-rgb), 0.25)',
              }}
            >
              المساعد الذكي
            </h3>

            <p
              style={{
                margin: '0.12rem 0 0',
                fontSize: '0.7rem',
                color: 'rgba(var(--rz-primary-rgb), 0.85)',
                fontWeight: 700,
                opacity: 1,
              }}
            >
              متصل الآن — جاهز لمساعدتك
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            aria-label="بدء محادثة جديدة"
            title="محادثة جديدة"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid rgba(var(--rz-white-rgb), 0.28)',
              background: 'rgba(var(--rz-white-rgb), 0.12)',
              color: 'var(--rz-ivory)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <RotateCcw size={16} />
          </button>

          {/* زر الإغلاق */}
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق المساعد الذكي"
            title="إغلاق"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid rgba(var(--rz-white-rgb), 0.28)',
              background: 'rgba(var(--rz-white-rgb), 0.12)',
              color: 'var(--rz-ivory)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </header>

        {/* Messages */}
        <main
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--rz-primary) transparent',
          }}
        >
          {messages.map((message) => {
            const isUser = message.sender === 'user';

            return (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '0.5rem',
                  justifyContent: isUser ? 'flex-start' : 'flex-end',
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      flexShrink: 0,
                      background:
                        'linear-gradient(145deg, var(--rz-primary), var(--rz-primary))',
                      color: 'var(--rz-ivory)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bot size={16} />
                  </div>
                )}

                <div
                  style={{
                    maxWidth: '78%',
                    padding: '0.72rem 0.9rem',
                    borderRadius: 16,
                    borderTopRightRadius: isUser ? 16 : 5,
                    borderTopLeftRadius: isUser ? 5 : 16,
                    background: isUser
                      ? 'linear-gradient(145deg, var(--rz-primary), var(--rz-primary))'
                      : 'rgba(var(--rz-white-rgb), 0.82)',
                    border: isUser
                      ? '1px solid rgba(var(--rz-primary-rgb), 0.2)'
                      : '1px solid rgba(var(--rz-primary-rgb), 0.13)',
                    color: isUser ? 'var(--rz-ivory)' : 'var(--rz-ink)',
                    boxShadow: '0 4px 13px rgba(var(--rz-ink-rgb), 0.06)',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.84rem',
                      lineHeight: 1.75,
                      whiteSpace: 'pre-line',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {message.text}
                  </p>
                </div>

                {isUser && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      flexShrink: 0,
                      background: 'rgba(var(--rz-primary-rgb), 0.12)',
                      color: 'var(--rz-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <UserRound size={16} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading */}
          {isLoading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '0.5rem',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background:
                    'linear-gradient(145deg, var(--rz-primary), var(--rz-primary))',
                  color: 'var(--rz-ivory)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={16} />
              </div>

              <div
                style={{
                  padding: '0.7rem 0.9rem',
                  borderRadius: 15,
                  borderTopLeftRadius: 5,
                  background: 'rgba(var(--rz-white-rgb), 0.82)',
                  border: '1px solid rgba(var(--rz-primary-rgb), 0.13)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  color: 'var(--rz-primary)',
                }}
              >
                <Sparkles size={15} />

                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  جاري تجهيز الإجابة
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* Input */}
        <footer
          style={{
            flexShrink: 0,
            padding: '0.8rem',
            borderTop: '1px solid rgba(var(--rz-primary-rgb), 0.16)',
            background: 'rgba(var(--rz-white-rgb), 0.55)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              background: 'var(--rz-ivory)',
              border: '1px solid rgba(var(--rz-primary-rgb), 0.20)',
              borderRadius: 14,
              padding: '0.35rem',
              boxShadow: '0 4px 14px rgba(var(--rz-ink-rgb), 0.05)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={1000}
              disabled={isLoading}
              placeholder="اكتب سؤالك هنا..."
              aria-label="رسالة المساعد الذكي"
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                padding: '0.65rem 0.7rem',
                color: 'var(--rz-ink)',
                fontFamily: 'inherit',
                fontSize: '0.84rem',
                direction: 'rtl',
              }}
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="إرسال الرسالة"
              style={{
                width: 42,
                height: 42,
                flexShrink: 0,
                border: 'none',
                borderRadius: 11,
                background:
                  input.trim() && !isLoading
                    ? 'linear-gradient(145deg, var(--rz-primary), var(--rz-primary))'
                    : 'var(--rz-ivory)',
                color: 'var(--rz-ivory)',
                cursor:
                  input.trim() && !isLoading
                    ? 'pointer'
                    : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.2s ease',
              }}
            >
              <Send size={17} />
            </button>
          </div>
        </footer>
      </div>

      <style>{`
        @media (max-width: 480px) {
          [role="dialog"] {
            left: 10px !important;
            right: 10px !important;
            top: 82px !important;
            width: auto !important;
            height: min(570px, calc(100vh - 100px)) !important;
            min-height: 360px !important;
            border-radius: 18px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            scroll-behavior: auto !important;
            transition: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default AIChatWidget;