// src/components/RoyalHome/RoyalHarajPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { colorAlpha } from '../../utils/color';
import {
  Crown,
  Plus,
  ArrowRight,
  Search,
  MapPin,
  X,
  Phone,
  MessageCircle,
  CreditCard,
  Copy,
  Check,
  ShoppingBag,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Shield,
  Building2,
  Landmark,
  Zap,
  BedDouble,
  Car,
  Watch,
  Shirt,
  House,
  BriefcaseBusiness,
  Armchair,
  Home,
  Smartphone,
  Laptop,
  Baby,
  UserRound,
  Package,
  Tv,
  Gem,
} from 'lucide-react';

import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
} from 'firebase/firestore';

import { db } from '../../firebase';
import { BANK_ACCOUNTS as CONST_BANKS, COMMISSION_RATES } from '../../utils/constants';
import CommissionAndBanks from '../shared/CommissionAndBanks';
import { ensureFirebaseSession } from '../../utils/firebaseSession';
import HarajUserRegistration from '../haraj/HarajUserRegistration';
import HarajAuth from '../haraj/HarajAuth';

import OwnerEditBadge from '../OwnerEditBadge';
import '../../styles/RoyalHome.css';

const C = {
  gold: 'var(--rz-primary)',
  goldLight: 'var(--rz-primary)',
  goldDark: 'var(--rz-primary)',
  black: 'var(--rz-ink)',
  blackLight: 'var(--rz-ink)',
  darkBg: 'var(--rz-ivory)',
  gray: 'var(--rz-ivory)',
  grayLight: 'var(--rz-ivory)',
  grayMid: 'var(--rz-muted)',
  white: 'var(--rz-white)',
  cream: 'var(--rz-ink)',
  green: 'var(--rz-ink)',
  red: 'var(--rz-primary)',
};


const BANK_ICONS = { alrajhi: Building2, arabank: Landmark };
const BANK_ACCOUNTS = CONST_BANKS.map((b) => ({
  ...b,
  icon: BANK_ICONS[b.id] || Building2,
}));

const HARAJ_SECTIONS = [
  {
    id: 'electronics',
    name: 'أجهزة كهربائية',
    icon: Zap,
    color: 'var(--rz-primary)',
  },
  {
    id: 'bedrooms',
    name: 'غرف نوم',
    icon: BedDouble,
    color: 'var(--rz-primary)',
  },
  {
    id: 'cars',
    name: 'سيارات',
    icon: Car,
    color: 'var(--rz-primary)',
  },
  {
    id: 'watches',
    name: 'ساعات',
    icon: Watch,
    color: 'var(--rz-primary)',
  },
  {
    id: 'bags',
    name: 'شنط',
    icon: ShoppingBag,
    color: 'var(--rz-primary)',
  },
  {
    id: 'clothes',
    name: 'ملابس',
    icon: Shirt,
    color: 'var(--rz-ink)',
  },
  {
    id: 'realestate',
    name: 'عقارات',
    icon: House,
    color: 'var(--rz-primary)',
  },
  {
    id: 'jobs',
    name: 'وظائف',
    icon: BriefcaseBusiness,
    color: 'var(--rz-primary)',
  },
  {
    id: 'furniture',
    name: 'أثاث',
    icon: Armchair,
    color: 'var(--rz-primary)',
  },
  {
    id: 'homeware',
    name: 'مستلزمات',
    icon: Home,
    color: 'var(--rz-primary)',
  },
  {
    id: 'mobiles',
    name: 'جوالات',
    icon: Smartphone,
    color: 'var(--rz-primary)',
  },
  {
    id: 'laptops',
    name: 'حواسب',
    icon: Laptop,
    color: 'var(--rz-primary)',
  },
  {
    id: 'kids',
    name: 'أطفال',
    icon: Baby,
    color: 'var(--rz-primary)',
  },
  {
    id: 'women',
    name: 'نسائي',
    icon: UserRound,
    color: 'var(--rz-primary)',
  },
  {
    id: 'men',
    name: 'رجالي',
    icon: UserRound,
    color: 'var(--rz-primary)',
  },
  {
    id: 'other',
    name: 'أخرى',
    icon: Package,
    color: 'var(--rz-muted)',
  },
];

const normalizeSaudiPhone = (phone) => {
  if (!phone) return '';

  const digits = String(phone).replace(/\D/g, '');

  if (digits.startsWith('966')) {
    return digits;
  }

  if (digits.startsWith('05') && digits.length === 10) {
    return `966${digits.substring(1)}`;
  }

  if (digits.startsWith('5') && digits.length === 9) {
    return `966${digits}`;
  }

  return digits;
};

const AdCard = ({
  ad,
  isRegistered,
  onContact,
  navigate,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const conditionText =
    ad.condition === true || ad.isNew === true
      ? 'جديد'
      : ad.condition || ad.desc_condition || '';

  const getConditionColor = () => {
    if (conditionText === 'جديد') return 'var(--rz-primary)';
    if (conditionText === 'ممتازة') return 'var(--rz-muted)';
    return 'var(--rz-primary)';
  };

  const imageSource = ad.images?.[0] || ad.image;

  const isImageUrl =
    typeof imageSource === 'string' &&
    /^(https?:\/\/|data:image\/|\/)/i.test(imageSource);

  const locationText = ad.location || ad.city || 'غير محدد';
  const sellerName =
    ad.userName || ad.sellerName || ad.username || 'بائع موثوق';

  const timeAgo = (() => {
    const ms = ad.createdAt?.toMillis?.();
    if (!ms) return '';
    const mins = Math.floor((Date.now() - ms) / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `قبل ${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `قبل ${hrs} ساعة`;
    return `قبل ${Math.floor(hrs / 24)} يوم`;
  })();

  const handleCardClick = () => {
    if (ad.id) {
      navigate(`/haraj/ad/${ad.id}`);
    }
  };

  const handleWhatsApp = (event) => {
    event.stopPropagation();

    if (!onContact()) {
      return;
    }

    const phone =
      ad.userPhone ||
      ad.phone ||
      ad.sellerPhone;

    const cleanPhone = normalizeSaudiPhone(phone);

    if (!cleanPhone) {
      return;
    }

    window.open(
      `https://wa.me/${cleanPhone}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleCall = (event) => {
    event.stopPropagation();

    if (!onContact()) {
      return;
    }

    const phone =
      ad.userPhone ||
      ad.phone ||
      ad.sellerPhone;

    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        background: 'var(--rz-white)',
        borderRadius: 8,
        overflow: 'hidden',
        border: `1px solid ${
          isHovered ? 'rgba(var(--rz-primary-rgb), 0.28)' : 'rgba(var(--rz-ink-rgb), 0.08)'
        }`,
        transition: 'all 0.3s ease',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 10px 28px rgba(var(--rz-ink-rgb), 0.10)'
          : '0 2px 10px rgba(var(--rz-ink-rgb), 0.05)',
        cursor: 'pointer',
        opacity: isRegistered ? 1 : 0.95,
        display: 'flex',
        alignItems: 'stretch',
        minHeight: 152,
      }}
    >
      <OwnerEditBadge to="/owner-private-room" label="تعديل" />

      {/* صورة السلعة (يمين البطاقة) */}
      <div
        style={{
          width: '36%',
          minWidth: 104,
          maxWidth: 165,
          flexShrink: 0,
          background: 'var(--rz-ivory)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {isImageUrl ? (
          <img loading="lazy" decoding="async"
            src={imageSource}
            alt={ad.title || 'إعلان'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingBag size={38} color="var(--rz-primary)" strokeWidth={1.5} />
          </div>
        )}

        {conditionText && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: getConditionColor(),
              color: 'var(--rz-white)',
              padding: '2px 8px',
              borderRadius: 8,
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            {conditionText}
          </div>
        )}
      </div>

      {/* تفاصيل الإعلان (المنتصف) */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h3
            style={{
              margin: '0 0 6px',
              fontSize: '1.02rem',
              fontWeight: 800,
              color: 'var(--rz-ink)',
              fontFamily: 'Tajawal, sans-serif',
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {ad.title || 'إعلان بدون عنوان'}
          </h3>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.76rem',
              fontWeight: 400,
              color: 'var(--rz-muted)',
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <UserRound size={12} aria-hidden="true" />
              {sellerName}
            </span>
            <span aria-hidden="true">•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={12} aria-hidden="true" />
              {locationText}
            </span>
            {timeAgo && (
              <>
                <span aria-hidden="true">•</span>
                <span>{timeAgo}</span>
              </>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.6rem',
            marginTop: '0.7rem',
          }}
        >
          <span
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: 'var(--rz-primary)',
              fontFamily: 'Tajawal, sans-serif',
              whiteSpace: 'nowrap',
            }}
          >
            {Number(ad.price || 0).toLocaleString()}{' '}
            <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>ر.س</span>
          </span>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={handleCall}
              aria-label="اتصال"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'var(--rz-white)',
                border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
                color: 'var(--rz-primary)',
                cursor: 'pointer',
              }}
            >
              <Phone size={15} color="var(--rz-primary)" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'var(--rz-gold)',
                border: '1px solid rgba(var(--rz-ink-rgb), 0.10)',
                borderRadius: 8,
                padding: '0.45rem 1.05rem',
                cursor: 'pointer',
                color: 'var(--rz-ink)',
                fontSize: '0.82rem',
                fontWeight: 800,
                fontFamily: 'Tajawal, sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              <MessageCircle size={14} color="var(--rz-ink)" aria-hidden="true" />
              تواصل
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SectionCard = ({
  section,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const Icon = section.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'var(--rz-white)',
        border: `2px solid ${
          isHovered
            ? colorAlpha(section.color, 0.5)
            : C.grayLight
        }`,
        borderRadius: 14,
        padding: '6px 4px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        transition: 'all 0.3s ease',
        transform: isHovered
          ? 'translateY(-3px)'
          : 'translateY(0)',
        boxShadow: isHovered
          ? `0 8px 20px ${colorAlpha(section.color, 0.13)}`
          : '0 2px 6px rgba(var(--rz-ink-rgb), 0.2)',
        width: '100%',
        height: '70px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '10px',
          background: colorAlpha(section.color, 0.15),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isHovered
            ? 'scale(1.08)'
            : 'scale(1)',
          transition: 'transform 0.3s ease',
        }}
      >
        <Icon
          size={18}
          color={section.color}
          strokeWidth={1.8}
        />
      </div>

      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--rz-ink)',
          fontFamily: 'Tajawal, sans-serif',
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          padding: '0 2px',
        }}
      >
        {section.name}
      </span>
    </button>
  );
};

const BankCard = ({ bank }) => {
  const [copied, setCopied] = useState(null);

  const BankIcon = bank.icon;

  const copy = async (text, id) => {
    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopied(id);

      window.setTimeout(() => {
        setCopied(null);
      }, 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, var(--rz-white) 0%, var(--rz-cream) 100%)',
        border: '1px solid rgba(var(--rz-primary-rgb), 0.15)',
        borderRadius: 12,
        padding: '0.5rem 0.65rem',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 6,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          background: colorAlpha(bank.color, 0.06),
          borderRadius: '50%',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.45rem',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            background: colorAlpha(bank.color, 0.13),
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BankIcon
            size={24}
            color={bank.color}
            strokeWidth={1.8}
          />
        </div>

        <h4
          style={{
            margin: 0,
            fontSize: '0.95rem',
            fontWeight: 900,
            color: 'var(--rz-ink)',
            fontFamily: 'Tajawal, sans-serif',
          }}
        >
          {bank.name}
        </h4>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <p
          style={{
            margin: '0 0 0.25rem',
            fontSize: '0.7rem',
            color: 'var(--rz-muted)',
          }}
        >
          IBAN
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--rz-cream)',
            border: '1px solid rgba(var(--rz-primary-rgb), 0.12)',
            borderRadius: 8,
            padding: '0.28rem 0.5rem',
            gap: 6,
            width: 'fit-content',
            maxWidth: '100%',
          }}
        >
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--rz-ink)',
              fontFamily: 'monospace',
              direction: 'ltr',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {bank.iban}
          </span>

          <button
            type="button"
            onClick={() =>
              copy(
                bank.iban,
                `${bank.id}-iban`
              )
            }
            aria-label="نسخ رقم الآيبان"
            style={{
              background: 'var(--rz-primary)',
              color: 'var(--rz-ivory)',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              padding: '3px 8px',
              flexShrink: 0,
              fontSize: '0.7rem',
              fontWeight: 700,
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            {copied === `${bank.id}-iban` ? 'تم' : 'نسخ'}
          </button>
        </div>
      </div>

      <div>
        <p
          style={{
            margin: '0 0 0.25rem',
            fontSize: '0.7rem',
            color: 'var(--rz-muted)',
          }}
        >
          رقم الحساب
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--rz-cream)',
            border: '1px solid rgba(var(--rz-primary-rgb), 0.12)',
            borderRadius: 8,
            padding: '0.28rem 0.5rem',
            gap: 6,
            width: 'fit-content',
            maxWidth: '100%',
          }}
        >
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--rz-ink)',
              fontFamily: 'monospace',
              direction: 'ltr',
              whiteSpace: 'nowrap',
            }}
          >
            {bank.account}
          </span>

          <button
            type="button"
            onClick={() =>
              copy(
                bank.account,
                `${bank.id}-acc`
              )
            }
            aria-label="نسخ رقم الحساب"
            style={{
              background: 'var(--rz-primary)',
              color: 'var(--rz-ivory)',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              padding: '3px 8px',
              flexShrink: 0,
              fontSize: '0.7rem',
              fontWeight: 700,
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            {copied === `${bank.id}-acc` ? 'تم' : 'نسخ'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RoyalHarajPage = () => {
  const navigate = useNavigate();
  const [sectionsOpen, setSectionsOpen] = useState(false);

  const [harajUser, setHarajUser] = useState(null);
  const [showRegisterModal, setShowRegisterModal] =
    useState(false);
  const [showHarajAuth, setShowHarajAuth] =
    useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState('الكل');

  // دعم الوصول من الرئيسية: ?q=نص البحث و ?cat=القسم
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const q = searchParams.get('q');
    const cat = searchParams.get('cat');
    if (q) setSearchTerm(q);
    if (cat) setSelectedCategory(cat);
  }, [searchParams]);

  const [visibleAds, setVisibleAds] =
    useState(6);

  const [showAllSections, setShowAllSections] =
    // الأقسام تظهر كاملة تلقائياً (تعديل: متلغّة التبديل)
    useState(true);

  const [realAds, setRealAds] = useState([]);
  const [loadingAds, setLoadingAds] =
    useState(true);

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem('harajUser');

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored);

      if (
        parsed &&
        typeof parsed === 'object'
      ) {
        setHarajUser(parsed);
      } else {
        localStorage.removeItem('harajUser');
      }
    } catch (error) {
      console.error(
        'Invalid harajUser in localStorage:',
        error
      );

      localStorage.removeItem('harajUser');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchAds = async () => {
      setLoadingAds(true);

      await ensureFirebaseSession();

      const sortByCreatedDesc = (list) =>
        [...list].sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) -
            (a.createdAt?.toMillis?.() ?? 0)
        );

      try {
        let snapshot;
        try {
          // المحاولة الأولى: استعلام مرتب (يحتاج فهرساً مركباً)
          snapshot = await getDocs(
            query(
              collection(db, 'haraj_ads'),
              where('status', '==', 'active'),
              orderBy('createdAt', 'desc')
            )
          );
        } catch (queryError) {
          // في حال غياب الفهرس (failed-precondition) نستعلم بدون ترتيب
          // ونرتّب النتائج على العميل حتى تعمل الصفحة بدون توقف.
          console.warn('haraj index fallback:', queryError?.message);
          snapshot = await getDocs(
            query(
              collection(db, 'haraj_ads'),
              where('status', '==', 'active')
            )
          );
        }

        const ads = sortByCreatedDesc(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );

        if (isMounted) {
          setRealAds(ads);
        }
      } catch (error) {
        console.error(
          'Error fetching ads:',
          error
        );

        if (isMounted) {
          setRealAds([]);
        }
      } finally {
        if (isMounted) {
          setLoadingAds(false);
        }
      }
    };

    fetchAds();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleContact = useCallback(() => {
    if (!harajUser) {
      setShowHarajAuth(true);
      return false;
    }

    return true;
  }, [harajUser]);

  const handleRegistrationSuccess = (
    data
  ) => {
    setHarajUser(data);
    setShowRegisterModal(false);
    setShowHarajAuth(false);

    try {
      localStorage.setItem(
        'harajUser',
        JSON.stringify(data)
      );
    } catch (error) {
      console.error(
        'Unable to save harajUser:',
        error
      );
    }
  };

  const handleHarajAuthSuccess = (
    userData
  ) => {
    setHarajUser(userData);
    setShowHarajAuth(false);
    setShowRegisterModal(false);

    try {
      localStorage.setItem(
        'harajUser',
        JSON.stringify(userData)
      );
    } catch (error) {
      console.error(
        'Unable to save harajUser:',
        error
      );
    }
  };

  const openAuth = () => {
    setShowHarajAuth(true);
  };

  const openRegistration = () => {
    setShowHarajAuth(false);
    setShowRegisterModal(true);
  };

  const adsData = Array.isArray(realAds)
    ? realAds
    : [];

  const search = searchTerm
    .toLowerCase()
    .trim();

  const filteredAds = adsData.filter((ad) => {
    const title = String(
      ad.title || ''
    ).toLowerCase();

    const description = String(
      ad.description || ''
    ).toLowerCase();

    const matchSearch =
      !search ||
      title.includes(search) ||
      description.includes(search);

    const matchCategory =
      selectedCategory === 'الكل' ||
      ad.category === selectedCategory;

    return (
      matchSearch &&
      matchCategory
    );
  });

  const categories = [
    'الكل',
    ...new Set(
      adsData
        .map((ad) => ad.category)
        .filter(Boolean)
    ),
  ];

  const displayedSections =
    showAllSections
      ? HARAJ_SECTIONS
      : HARAJ_SECTIONS.slice(0, 8);

  const displayedAds =
    filteredAds.slice(0, visibleAds);

  const hasMoreAds =
    visibleAds < filteredAds.length;

  return (
    <div
      className="rh-root haraj-page"
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'transparent',
        fontFamily:
          'Tajawal',
        direction: 'rtl',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      <div className="rh-bg" aria-hidden="true" />
      <div className="rh-topline" aria-hidden="true" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Tajawal:wght@300;400;500;700;800;900&display=swap"
        rel="stylesheet"
      />

      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          overflow-x: hidden !important;
        }

        .haraj-page {
          overflow-x: hidden !important;
          width: 100%;
        }

        .haraj-page * {
          max-width: 100%;
        }

        .ads-grid {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 14px !important;
          width: 100% !important;
        }

        .sections-grid {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 8px !important;
          width: 100% !important;
        }

        @media (min-width: 768px) {
          .ads-grid {
            grid-template-columns: 1fr !important;
          }

          .sections-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
        }

        @media (max-width: 400px) {
          .sections-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.08);
          }
        }

        @keyframes marquee {
          0% {
            transform: translateX(-50%);
          }

          100% {
            transform: translateX(0);
          }
        }

        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }

          50% {
            background-position: 100% 50%;
          }

          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }

          100% {
            transform: translateX(100%);
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }

          100% {
            transform: rotate(360deg);
          }
        }

        .shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }

        /* لافتة «أعلن الآن» — تتغلب على قاعدة الأزرار الذهبية العامة */
        .haraj-page .haraj-cta-banner {
          background: linear-gradient(120deg, var(--rz-primary) 0%, var(--rz-primary) 55%, var(--rz-primary) 100%) !important;
          border: none !important;
          box-shadow: 0 10px 28px rgba(var(--rz-primary-rgb), 0.35), inset 0 1px 0 rgba(var(--rz-white-rgb), 0.25) !important;
          font-weight: 800 !important;
        }
      `}</style>

      <header
        style={{
          // حجاب عاجي شبه شفاف (بدل عاجي معتم) ليبقى جبل/مدينة الرياض
          // ظاهراً خلف ترويسة الحراج — مع الحفاظ على قراءة النص الداكن.
          background: `linear-gradient(180deg, rgba(var(--rz-ivory-rgb), 0.88) 0%, rgba(var(--rz-ivory-rgb), 0.62) 100%)`,
          borderBottom: `1px solid colorAlpha(C.gold, 0.19)`,
          padding: '1.1rem 1rem 1.25rem',
          position: 'sticky',
          top: 'var(--rooz-top-offset, 0px)',
          zIndex: 100,
          backdropFilter: 'blur(20px)',
          width: '100%',
        }}
      >
        <div
          style={{
            maxWidth: '820px',
            width: '100%',
            margin: '0 auto',
            direction: 'rtl',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  flexShrink: 0,
                  background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDark} 100%)`,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 15px colorAlpha(C.gold, 0.25)`,
                }}
              >
                <ShoppingBag size={22} color="var(--rz-white)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 'clamp(1.1rem, 3.4vw, 1.6rem)',
                    fontWeight: 800,
                    color: 'var(--rz-ink)',
                    fontFamily: 'Tajawal, sans-serif',
                    lineHeight: 1.25,
                  }}
                >
                  منصة حراج الفخامة والتميز
                </h1>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 'clamp(0.74rem, 2.4vw, 0.9rem)',
                    fontWeight: 400,
                    color: 'var(--rz-muted)',
                    fontFamily: 'Tajawal, sans-serif',
                    lineHeight: 1.5,
                  }}
                >
                  هنا تلتقي النخبة لبيع وشراء أرقى السلع والمنتجات بكل موثوقية وسهولة
                </p>
              </div>
            </div>

            <button
              type="button"
              className="haraj-cta-banner haraj-add-ad-btn"
              onClick={() => {
                if (!harajUser) {
                  setShowHarajAuth(true);
                } else {
                  navigate('/haraj/post');
                }
              }}
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: 'var(--rz-primary)',
                border: 'none',
                borderRadius: 8,
                padding: '0.7rem 1.15rem',
                cursor: 'pointer',
                color: 'var(--rz-white)',
                fontSize: '0.88rem',
                fontWeight: 800,
                fontFamily: 'Tajawal, sans-serif',
                boxShadow: '0 8px 22px rgba(var(--rz-primary-rgb), 0.28)',
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={17} color="var(--rz-white)" aria-hidden="true" />
              أضف إعلانك الآن
            </button>
          </div>
        </div>
      </header>

      {/* لافتات حراج الإبداعية — شريط متحرك ملوّن يمين ← يسار */}
      {/* رسالة البث تظهر في الصفحة الرئيسية فقط (كما طلب المستخدم) — لا شريط بث في الحراج */}

      {/* لافتة «أعلن معنا هنا» الموحدة */}
      <div
        style={{
          maxWidth: '820px',
          width: '100%',
          margin: '0 auto',
          padding: '0.85rem 0.75rem 0',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="haraj-ad-banner"
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--rz-primary)',
            borderRadius: 8,
            padding: '1.4rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem',
            direction: 'rtl',
            flexWrap: 'wrap',
            boxShadow: '0 12px 30px rgba(var(--rz-primary-rgb), 0.22)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              insetInlineStart: -30,
              insetBlockStart: -30,
              width: 110,
              height: 110,
              borderRadius: '50%',
              border: '2px solid rgba(var(--rz-gold-rgb), 0.55)',
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              insetInlineEnd: -24,
              insetBlockEnd: -34,
              width: 96,
              height: 96,
              borderRadius: '50%',
              border: '2px solid rgba(var(--rz-gold-rgb), 0.45)',
            }}
          />
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <div
              style={{
                color: 'var(--rz-white)',
                fontSize: 'clamp(1.05rem, 3vw, 1.35rem)',
                fontWeight: 800,
                fontFamily: 'Tajawal, sans-serif',
                lineHeight: 1.4,
              }}
            >
              مساحتك الإعلانية هنا تنبض بالفخامة!
            </div>
            <div
              style={{
                color: 'var(--rz-gold)',
                fontSize: 'clamp(0.78rem, 2.4vw, 0.9rem)',
                fontWeight: 400,
                fontFamily: 'Tajawal, sans-serif',
                lineHeight: 1.6,
                marginTop: 6,
              }}
            >
              تواصل مع آلاف الزوار المهتمين بمنتجاتك، واجعل لعلامتك التجارية حضوراً بطلاً.
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/contact')}
            style={{
              position: 'relative',
              flexShrink: 0,
              background: 'var(--rz-ivory)',
              border: 'none',
              borderRadius: 8,
              padding: '0.8rem 1.4rem',
              cursor: 'pointer',
              color: 'var(--rz-ink)',
              fontSize: '0.9rem',
              fontWeight: 800,
              fontFamily: 'Tajawal, sans-serif',
              whiteSpace: 'nowrap',
            }}
          >
            تواصل للإعلان معنا
          </button>
        </div>
      </div>

      <main
        style={{
          maxWidth: '600px',
          width: '100%',
          margin: '0 auto',
          padding: '1rem',
          overflowX: 'hidden',
        }}
      >
        {!harajUser && (
          <div
            style={{
              background: `linear-gradient(145deg, rgba(var(--rz-ivory-rgb), 0.95) 0%, rgba(var(--rz-ivory-rgb), 0.9) 100%)`,
              border: `1px solid colorAlpha(C.gold, 0.19)`,
              borderRadius: 12,
              padding: '1rem',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
            }}
            onClick={openAuth}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' ||
                event.key === ' '
              ) {
                openAuth();
              }
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDark} 100%)`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Crown
                size={20}
                color={C.black}
              />
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '0.9rem',
                fontWeight: 600,
                color: C.cream,
                lineHeight: 1.5,
              }}
            >
              عزيزي الزائر: سجل في منصة الإعلانات ليتم فتح جميع المميزات
            </p>
          </div>
        )}



        <div
          style={{
            position: 'relative',
            marginBottom: '0.75rem',
          }}
        >
          <Search
            size={18}
            color={C.grayMid}
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform:
                'translateY(-50%)',
            }}
          />

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(
                event.target.value
              );
              setVisibleAds(6);
            }}
            placeholder="ابحث عن سلعة..."
            aria-label="البحث عن سلعة"
            style={{
              width: '100%',
              background: `linear-gradient(145deg, var(--rz-white) 0%, var(--rz-ivory) 100%)`,
              border: `1px solid var(--rz-primary)`,
              borderRadius: 14,
              padding:
                '0.85rem 1rem 0.85rem 3rem',
              color: 'var(--rz-ink)',
              caretColor: 'var(--rz-ink)',
              fontSize: '0.9rem',
              fontFamily:
                'Tajawal',
              outline: 'none',
              fontWeight: 600,
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <select
            value={selectedCategory}
            onChange={(event) => {
              setSelectedCategory(
                event.target.value
              );
              setVisibleAds(6);
            }}
            aria-label="اختر القسم"
            style={{
              width: '100%',
              background: 'var(--rz-white)',
              border: `1px solid var(--rz-primary)`,
              borderRadius: 14,
              padding: '0.75rem 1rem',
              color: 'var(--rz-ink)',
              fontSize: '0.9rem',
              fontFamily:
                'Tajawal',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {categories.map((category) => (
              <option
                key={category}
                value={category}
                style={{ color: 'var(--rz-ink)', background: 'var(--rz-white)' }}
              >
                {category}
              </option>
            ))}
          </select>
        </div>

        <section
          style={{ marginBottom: '0.85rem' }}
        >
          <button
            type="button"
            onClick={() => setSectionsOpen((v) => !v)}
            style={{
              width: '100%',
              marginBottom: sectionsOpen ? '0.75rem' : 0,
              background: 'linear-gradient(145deg, var(--rz-ivory), var(--rz-ivory))',
              border: '1.5px solid var(--rz-primary)',
              borderRadius: 14,
              padding: '0.85rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              color: 'var(--rz-ink)',
              fontSize: '0.95rem',
              fontWeight: 900,
              fontFamily: 'Tajawal, sans-serif',
              boxShadow: '0 2px 10px rgba(var(--rz-primary-rgb), 0.15)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Crown size={18} color="var(--rz-primary)" />
              أقسام الحراج
              <span style={{
                background: 'var(--rz-primary)',
                color: 'var(--rz-white)',
                fontSize: '0.7rem',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: 999,
              }}>{HARAJ_SECTIONS.length}</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 800 }}>
              {sectionsOpen ? 'إخفاء' : 'عرض'}
              {sectionsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </button>

          {sectionsOpen && (
            <>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: 'var(--rz-muted)', fontWeight: 600 }}>
                اختر قسماً لتصفية الإعلانات حسب النوع
              </p>
              <div className="sections-grid">
                {HARAJ_SECTIONS.map((section) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    onClick={() => {
                      setSelectedCategory(section.name);
                      setSectionsOpen(false);
                      setVisibleAds(6);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        <section
          style={{ marginBottom: '0.85rem' }}
        >
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: C.cream,
              marginBottom: '1rem',
            }}
          >
            {loadingAds
              ? 'جاري تحميل الإعلانات...'
              : `أحدث الإعلانات (${filteredAds.length})`}
          </h2>

          {loadingAds ? (
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'center',
                padding: '3rem',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: `3px solid ${C.grayLight}`,
                  borderTopColor: C.gold,
                  borderRadius: '50%',
                  animation:
                    'spin 1s linear infinite',
                }}
              />
            </div>
          ) : filteredAds.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                background: `linear-gradient(145deg, var(--rz-white) 0%, var(--rz-ivory) 100%)`,
                border: `1px solid ${C.grayLight}`,
                borderRadius: 16,
                color: 'var(--rz-muted)',
                fontFamily:
                  'Tajawal',
              }}
            >
              لا توجد إعلانات متاحة حاليًا
            </div>
          ) : (
            <div className="ads-grid">
              {displayedAds.map((ad) => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  isRegistered={
                    !!harajUser
                  }
                  onContact={
                    handleContact
                  }
                  navigate={navigate}
                />
              ))}
            </div>
          )}

          {hasMoreAds && (
            <button
              type="button"
              onClick={() =>
                setVisibleAds(
                  (previous) =>
                    previous + 6
                )
              }
              style={{
                width: '100%',
                marginTop: '1.5rem',
                background: `linear-gradient(135deg, ${C.gold} 0%, var(--rz-primary) 100%)`,
                border: `1px solid ${C.gold}`,
                borderRadius: 14,
                padding: '1rem',
                cursor: 'pointer',
                color: 'var(--rz-white)',
                fontSize: '0.9rem',
                fontWeight: 800,
                fontFamily:
                  'Tajawal, sans-serif',
                boxShadow: '0 6px 18px rgba(var(--rz-primary-rgb), 0.25)',
              }}
            >
              عرض المزيد من الإعلانات (
              {Math.max(
                filteredAds.length -
                  visibleAds,
                0
              )}{' '}
              متبقي)
            </button>
          )}
        </section>

        <section style={{ marginBottom: '0.85rem' }}>
          <CommissionAndBanks showBanks={false} />
        </section>

        <section
          style={{
            marginBottom: '0.85rem',
            padding: '0.75rem 0.85rem',
            background: `linear-gradient(135deg, ${C.darkBg} 0%, rgba(var(--rz-primary-rgb), 0.1) 100%)`,
            borderRadius: '16px',
            border: `1px solid colorAlpha(C.gold, 0.25)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldLight} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield
                size={24}
                color={C.darkBg}
              />
            </div>

            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: C.gold,
                }}
              >
                منصة الإعلانات في المسيمير | ALMUSAYMIR
              </h3>

              <p
                style={{
                  margin:
                    '0.15rem 0 0',
                  fontSize:
                    '0.75rem',
                  color: C.grayMid,
                }}
              >
                موثوقية وأمان بمعايير عالمية
              </p>
            </div>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: '0.9rem',
              lineHeight: 1.8,
              color: C.cream,
              fontFamily:
                'Tajawal',
              textAlign: 'justify',
            }}
          >
            تجمع منصة الإعلانات في موقع «المسيمير | ALMUSAYMIR» بين الموثوقية المطلقة
            وأعلى معايير الحماية لبيانات زوار الموقع ومستخدميه، مما يضمن بيئة
            تصفح آمنة وتجربة إعلانية موثوقة للجميع.
          </p>
        </section>

        <section style={{ marginBottom: '0.85rem' }}>
          <CommissionAndBanks showRates={false} />
        </section>

        <footer
          style={{
            textAlign: 'center',
            padding: '0.75rem 0.85rem',
            borderTop: `1px solid ${C.grayLight}`,
            marginTop: '1rem',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.8rem',
              color: C.grayMid,
              fontFamily:
                'Tajawal',
            }}
          >
            جميع الحقوق محفوظة © المسيمير | ALMUSAYMIR 2026
          </p>
        </footer>
      </main>

      {harajUser && (
        <div
          style={{
            position: 'fixed',
            bottom: '1rem',
            left: '50%',
            transform:
              'translateX(-50%)',
            background: `linear-gradient(135deg, ${C.green} 0%, var(--rz-ink) 100%)`,
            borderRadius: 50,
            padding: '0.6rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: `0 8px 30px colorAlpha(C.green, 0.25)`,
            zIndex: 100,
            maxWidth: '90%',
          }}
        >
          <Check
            size={16}
            color="white"
          />

          <span
            style={{
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: 600,
              fontFamily:
                'Tajawal',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            مسجل:{' '}
            {harajUser.name ||
              harajUser.displayName ||
              'مستخدم'}
          </span>

          {/* زر تسجيل الخروج من حساب حراج — يمسح الجلسة ويعيد تحميل الصفحة */}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('harajUser');
              setHarajUser(null);
            }}
            aria-label="تسجيل الخروج"
            style={{
              marginInlineStart: '0.5rem',
              background: 'rgba(var(--rz-ink-rgb), 0.25)',
              border: '1px solid rgba(var(--rz-white-rgb), 0.4)',
              color: 'white',
              borderRadius: 999,
              padding: '0.35rem 0.9rem',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'Tajawal',
              whiteSpace: 'nowrap',
            }}
          >
            خروج
          </button>
        </div>
      )}

      <HarajUserRegistration
        isOpen={showRegisterModal}
        onClose={() =>
          setShowRegisterModal(false)
        }
        onSuccess={
          handleRegistrationSuccess
        }
      />

      <HarajAuth
        isOpen={showHarajAuth}
        onClose={() =>
          setShowHarajAuth(false)
        }
        onCreateAccount={
          openRegistration
        }
        onSuccess={
          handleHarajAuthSuccess
        }
      />
    </div>
  );
};

export default RoyalHarajPage;