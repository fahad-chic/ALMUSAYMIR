import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Ruler, ShoppingBag, Ban, Pencil, X } from 'lucide-react';
import useStore from '../../store/useStore';

const ProductIcon = ({ size = '4rem', color = 'var(--rz-primary)' }) => (
  <ShoppingBag size={size === '4rem' ? 64 : 40} color={color} />
);

const ProductCard = ({
  product,
  style = 'square', // 'square' | 'wide' | 'circle'
  onEdit,
  isOwner = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const [guestBlocked, setGuestBlocked] = useState(false);
  const isGuest = useStore((s) => s.userRole === 'guest');

  const GuestBlockOverlay = () =>
    guestBlocked
      ? createPortal(
          <div
            dir="rtl"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(var(--rz-ink-rgb), 0.72)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 15000,
              fontFamily: 'Tajawal',
              padding: '1rem',
            }}
            onClick={() => setGuestBlocked(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--rz-ivory)',
                border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
                borderRadius: 18,
                padding: '1.75rem 1.5rem',
                maxWidth: 380,
                width: '90%',
                textAlign: 'center',
                color: 'var(--rz-ink)',
                boxShadow: '0 20px 60px rgba(var(--rz-ink-rgb), 0.28)',
                position: 'relative',
              }}
            >
              <button
                type="button"
                onClick={() => setGuestBlocked(false)}
                aria-label="إغلاق"
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  background: 'rgba(var(--rz-ink-rgb), 0.06)',
                  border: 'none',
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--rz-primary)',
                }}
              >
                <X size={16} />
              </button>

              <div style={{ fontSize: 40, marginBottom: 8 }}>
                <Ban size={40} color="var(--rz-primary)" />
              </div>

              <h3
                style={{
                  color: 'var(--rz-primary)',
                  fontSize: 18,
                  fontWeight: 700,
                  margin: '0 0 8px',
                }}
              >
                الشراء غير متاح للزائر
              </h3>

              <p
                style={{
                  color: 'var(--rz-primary)',
                  fontSize: 14,
                  margin: '0 0 16px',
                  lineHeight: 1.6,
                }}
              >
                لا يمكن إتمام الشراء في وضع الزائر المؤقت. سجّل حساباً جديداً
                لإكمال التسوق.
              </p>

              <button
                type="button"
                onClick={() => setGuestBlocked(false)}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
                  color: 'var(--rz-white)',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 5px 15px rgba(var(--rz-primary-rgb), 0.22)',
                }}
              >
                حسناً
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === '') {
      return 'غير محدد';
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice)) {
      return 'غير محدد';
    }

    return `${numericPrice.toLocaleString('ar-SA')} ر.س`;
  };

  const handleWhatsApp = () => {
    if (isGuest) {
      setGuestBlocked(true);
      return;
    }

    if (!product?.whatsapp) return;

    const phoneNumber = String(product.whatsapp).replace(/[^0-9]/g, '');

    if (!phoneNumber) return;

    const message = encodeURIComponent(
      `مرحباً، أريد الاستفسار عن: ${product.name || 'المنتج'}\n` +
        `السعر: ${formatPrice(product.price)}\n` +
        `المقاس: ${product.size || 'غير محدد'}\n` +
        `الوصف: ${product.description || ''}`
    );

    window.open(
      `https://wa.me/${phoneNumber}?text=${message}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const whatsappButtonStyle = {
    background: 'var(--rz-gold)',
    border: '1px solid rgba(var(--rz-ink-rgb), 0.10)',
    borderRadius: 8,
    color: 'var(--rz-ink)',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontFamily: 'Tajawal',
    transition: 'all 0.3s ease',
    boxShadow: '0 5px 14px rgba(var(--rz-primary-rgb), 0.2)',
  };

  const whatsappIcon = (size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );

  const imageFallback = (fontSize) => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        background: 'linear-gradient(145deg, var(--rz-ivory), var(--rz-gold))',
      }}
    >
      {product?.icon ? (
        <span style={{ fontSize }}>{product.icon}</span>
      ) : (
        <ProductIcon />
      )}
    </div>
  );

  // ═══════════════════════════════════════════
  // STYLE: Square (مربع)
  // ═══════════════════════════════════════════
  if (style === 'square') {
    return (
      <div
        style={{
          background: 'var(--rz-white)',
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid rgba(var(--rz-ink-rgb), 0.08)',
          boxShadow: '0 2px 10px rgba(var(--rz-ink-rgb), 0.05)',
          transition: 'all 0.3s ease',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'relative',
            paddingTop: '100%',
            background: 'var(--rz-ivory)',
          }}
        >
          {!imageError && product?.image ? (
            <img loading="lazy" decoding="async"
              src={product.image}
              alt={product.name || 'منتج'}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={() => setImageError(true)}
            />
          ) : (
            imageFallback('3rem')
          )}

          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
              color: 'var(--rz-white)',
              padding: '0.4rem 0.8rem',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: '0.85rem',
              boxShadow: '0 4px 12px rgba(var(--rz-ink-rgb), 0.25)',
            }}
          >
            {formatPrice(product?.price)}
          </div>

          {isOwner && onEdit && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                display: 'flex',
                gap: '0.5rem',
              }}
            >
              <button
                type="button"
                onClick={() => onEdit(product)}
                style={{
                  background: 'rgba(var(--rz-primary-rgb), 0.95)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.4rem 0.7rem',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  color: 'var(--rz-white)',
                  fontFamily: 'Tajawal',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Pencil size={12} color="var(--rz-white)" />
                  تعديل
                </span>
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '1rem' }}>
          <h3
            style={{
              margin: '0 0 0.5rem',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--rz-ink)',
              fontFamily: 'Tajawal, sans-serif',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              lineHeight: 1.35,
            }}
          >
            {product?.name || 'منتج'}
          </h3>

          {product?.size && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--rz-muted)',
                fontSize: '0.8rem',
                marginBottom: '0.5rem',
              }}
            >
              <Ruler size={14} />
              المقاس: {product.size}
            </div>
          )}

          <p
            style={{
              margin: 0,
              fontSize: '0.8rem',
              color: 'var(--rz-primary)',
              lineHeight: 1.55,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product?.description || 'بدون وصف'}
          </p>

          <button
            type="button"
            onClick={handleWhatsApp}
            style={{
              ...whatsappButtonStyle,
              width: '100%',
              marginTop: '1rem',
              padding: '0.75rem',
              fontSize: '0.9rem',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {whatsappIcon(20)}
            اشتري الآن
          </button>
        </div>

        <GuestBlockOverlay />
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // STYLE: Wide (عريض)
  // ═══════════════════════════════════════════
  if (style === 'wide') {
    return (
      <div
        style={{
          background: 'var(--rz-white)',
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid rgba(var(--rz-ink-rgb), 0.08)',
          boxShadow: '0 2px 10px rgba(var(--rz-ink-rgb), 0.05)',
          display: 'flex',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            width: '40%',
            minHeight: 200,
            background: 'var(--rz-ivory)',
            position: 'relative',
          }}
        >
          {!imageError && product?.image ? (
            <img loading="lazy" decoding="async"
              src={product.image}
              alt={product.name || 'منتج'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '4rem',
                background: 'linear-gradient(145deg, var(--rz-ivory), var(--rz-gold))',
              }}
            >
              {product?.icon ? (
                <span style={{ fontSize: '4rem' }}>{product.icon}</span>
              ) : (
                <ProductIcon />
              )}
            </div>
          )}

          {isOwner && onEdit && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
              }}
            >
              <button
                type="button"
                onClick={() => onEdit(product)}
                style={{
                  background: 'rgba(var(--rz-primary-rgb), 0.95)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.4rem 0.8rem',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  color: 'var(--rz-white)',
                  fontFamily: 'Tajawal',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Pencil size={12} color="var(--rz-white)" />
                  تعديل
                </span>
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            flex: 1,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
                color: 'var(--rz-white)',
                padding: '0.3rem 0.7rem',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: '1rem',
                marginBottom: '0.75rem',
              }}
            >
              {formatPrice(product?.price)}
            </div>

            <h3
              style={{
                margin: '0 0 0.5rem',
                fontSize: '1.2rem',
                fontWeight: 400,
                color: 'var(--rz-ink)',
                fontFamily: 'Tajawal, sans-serif',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                lineHeight: 1.35,
              }}
            >
              {product?.name || 'منتج'}
            </h3>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
                marginBottom: '1rem',
              }}
            >
              {product?.size && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: 'var(--rz-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  <Ruler size={14} />
                  المقاس: {product.size}
                </div>
              )}
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '0.85rem',
                color: 'var(--rz-primary)',
                lineHeight: 1.5,
              }}
            >
              {product?.description || 'بدون وصف'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleWhatsApp}
            style={{
              ...whatsappButtonStyle,
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              alignSelf: 'flex-start',
            }}
          >
            {whatsappIcon(20)}
            اشتري الآن عبر واتساب
          </button>
        </div>

        <GuestBlockOverlay />
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // STYLE: Circle (دائري)
  // ═══════════════════════════════════════════
  if (style === 'circle') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid rgba(var(--rz-primary-rgb), 0.5)',
            boxShadow:
              '0 8px 32px rgba(var(--rz-primary-rgb), 0.18), 0 0 20px rgba(var(--rz-primary-rgb), 0.16)',
            background: 'var(--rz-ivory)',
            position: 'relative',
          }}
        >
          {!imageError && product?.image ? (
            <img loading="lazy" decoding="async"
              src={product.image}
              alt={product.name || 'منتج'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '4rem',
                background: 'linear-gradient(145deg, var(--rz-ivory), var(--rz-gold))',
              }}
            >
              {product?.icon ? (
                <span style={{ fontSize: '4rem' }}>{product.icon}</span>
              ) : (
                <ProductIcon />
              )}
            </div>
          )}

          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
              color: 'var(--rz-white)',
              padding: '0.3rem',
              textAlign: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
            }}
          >
            {formatPrice(product?.price)}
          </div>

          {isOwner && onEdit && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
              }}
            >
              <button
                type="button"
                onClick={() => onEdit(product)}
                style={{
                  background: 'rgba(var(--rz-primary-rgb), 0.95)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.3rem 0.6rem',
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                  color: 'var(--rz-white)',
                  fontFamily: 'Tajawal',
                }}
              >
                <Pencil size={12} color="var(--rz-white)" />
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            textAlign: 'center',
            maxWidth: 180,
          }}
        >
          <h3
            style={{
              margin: '0 0 0.3rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--rz-ink)',
              fontFamily: 'Tajawal, sans-serif',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              lineHeight: 1.35,
            }}
          >
            {product?.name || 'منتج'}
          </h3>

          {product?.size && (
            <p
              style={{
                margin: 0,
                fontSize: '0.75rem',
                color: 'var(--rz-muted)',
              }}
            >
              المقاس: {product.size}
            </p>
          )}

          <button
            type="button"
            onClick={handleWhatsApp}
            style={{
              ...whatsappButtonStyle,
              margin: '0.75rem auto 0',
              padding: '0.5rem 1rem',
              borderRadius: 20,
              fontSize: '0.8rem',
            }}
          >
            {whatsappIcon(16)}
            شراء
          </button>
        </div>

        <GuestBlockOverlay />
      </div>
    );
  }

  return <GuestBlockOverlay />;
};

export default ProductCard;