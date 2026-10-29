// src/components/RoyalHome/CatalogPage.jsx
// صفحة الكاتالوج الديناميكية — النسخة النهائية

import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { colorAlpha } from '../../utils/color';
import {
  ArrowRight,
  Plus,
  Grid,
  LayoutGrid,
  Circle,
  Columns,
  Image,
  Sparkles,
  Settings,
  Save,
  X,
  Search,
  Heart,
  GitCompare,
  Share2,
} from 'lucide-react';

import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  addDoc,
  setDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';

import { db } from '../../firebase/config';
import { AuthContext } from '../../context/AuthContext';
import ProductCard from './ProductCard';
import FreeImageField from '../FreeImageField';
import { ROYAL_SECTIONS } from './sectionsData';
import useStore from '../../store/useStore';
import '../../styles/RoyalHome.css';

const WHATSAPP_NUMBER = '966507882771';

const DEFAULT_CATALOG_SETTINGS = {
  displayStyle: 'square',
  productsPerRow: 4,
  showPrices: true,
  showDescriptions: true,
};

// خريطة عربية احتياطية لأسماء الأقسام — تُستخدم عندما لا يكون للقسم اسم محفوظ في Firestore
const CATALOG_NAME_MAP = ROYAL_SECTIONS.reduce((map, section) => {
  map[section.id] = section.title;
  (section.branches || []).forEach((branch) => {
    if (branch.catalogId) map[branch.catalogId] = branch.name || section.title;
  });
  return map;
}, {});

const DISPLAY_STYLES = {
  square: {
    icon: Grid,
    label: 'مربع',
    cols: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '1.5rem',
  },
  wide: {
    icon: LayoutGrid,
    label: 'مستطيل',
    cols: '1fr',
    gap: '1.5rem',
    direction: 'column',
  },
  circle: {
    icon: Circle,
    label: 'دائري',
    cols: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '2rem',
    center: true,
  },
  masonry: {
    icon: Columns,
    label: 'شبكي',
    cols: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '1rem',
  },
  horizontal: {
    icon: Image,
    label: 'طولي',
    cols: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '1rem',
    compact: true,
  },
  featured: {
    icon: Sparkles,
    label: 'مميز',
    cols: 'repeat(3, 1fr)',
    gap: '1.5rem',
    featured: true,
  },
};

const CatalogPage = () => {
  const { catalogId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole } = useContext(AuthContext);
  const favorites = useStore((state) => state.favorites || []);
  const toggleFavorite = useStore((state) => state.toggleFavorite);

  // فلتر المقاس القادم من القائمة الذكية (مثال: قسم معيّن -> مقاس M)
  const activeSize = location.state?.size || null;
  const activeSubName = location.state?.subName || null;

  // أزرار التعديل والحذف وإضافة المنتجات للمالك فقط — محجوبة عن المشرفين والجميع
  const isOwner = userRole === 'owner';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogInfo, setCatalogInfo] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [compareIds, setCompareIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('almusaymir_compare_ids') || '[]');
      return Array.isArray(saved) ? saved.slice(0, 3) : [];
    } catch {
      return [];
    }
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [cardStyle, setCardStyle] = useState('square');
  const [showSettings, setShowSettings] = useState(false);

  const [catalogSettings, setCatalogSettings] = useState(
    DEFAULT_CATALOG_SETTINGS
  );

  // البحث عن معلومات القسم محلياً من sectionsData
  useEffect(() => {
    const findCatalogInfo = () => {
      for (const section of ROYAL_SECTIONS) {
        // دعم روابط على مستوى القسم الرئيسي (مثل /catalog/abayas, /catalog/bags, /catalog/perfumes)
        if (section.id === catalogId) {
          return {
            catalogId: section.id,
            name: section.title,
            section: section.title,
            sectionColor: section.color,
          };
        }
        for (const branch of section.branches || []) {
          if (branch.catalogId === catalogId) {
            return {
              ...branch,
              section: section.title,
              sectionColor: section.color,
            };
          }
        }
      }

      return null;
    };

    setCatalogInfo(findCatalogInfo());
  }, [catalogId]);

  // جلب إعدادات الكاتالوج
  useEffect(() => {
    const fetchSettings = async () => {
      if (!catalogId) return;

      try {
        const settingsRef = doc(db, 'catalogSettings', catalogId);
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
          const savedSettings = {
            ...DEFAULT_CATALOG_SETTINGS,
            ...settingsSnap.data(),
          };

          setCatalogSettings(savedSettings);
          setCardStyle(savedSettings.displayStyle || 'square');
        } else {
          setCatalogSettings(DEFAULT_CATALOG_SETTINGS);
          setCardStyle(DEFAULT_CATALOG_SETTINGS.displayStyle);
        }
      } catch (error) {
        console.error('Error fetching catalog settings:', error);

        setCatalogSettings(DEFAULT_CATALOG_SETTINGS);
        setCardStyle(DEFAULT_CATALOG_SETTINGS.displayStyle);
      }
    };

    fetchSettings();
  }, [catalogId]);

  // جلب المنتجات
  useEffect(() => {
    const fetchProducts = async () => {
      if (!catalogId) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const productsQuery = query(
          collection(db, 'products'),
          where('catalogId', '==', catalogId),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(productsQuery);

        const loadedProducts = snapshot.docs.map((productDoc) => ({
          id: productDoc.id,
          ...productDoc.data(),
        }));

        setProducts(loadedProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [catalogId]);

  // حفظ إعدادات العرض
  const saveDisplaySettings = async (newSettings) => {
    if (!isOwner || !catalogId) return;

    try {
      const settingsRef = doc(db, 'catalogSettings', catalogId);

      // setDoc مع merge يمنع فشل الحفظ إذا لم يكن المستند موجوداً
      await setDoc(
        settingsRef,
        {
          ...DEFAULT_CATALOG_SETTINGS,
          ...newSettings,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const finalSettings = {
        ...DEFAULT_CATALOG_SETTINGS,
        ...newSettings,
      };

      setCatalogSettings(finalSettings);
      setCardStyle(finalSettings.displayStyle || 'square');
      setShowSettings(false);
    } catch (error) {
      console.error('Error saving catalog settings:', error);
      alert('حدث خطأ أثناء حفظ إعدادات العرض');
    }
  };

  // فتح نافذة إضافة منتج
  const openAddProduct = () => {
    setEditingProduct(null);
    setShowAddModal(true);
  };

  // فتح نافذة تعديل منتج
  const openEditProduct = (product) => {
    setEditingProduct(product);
    setShowAddModal(true);
  };

  // بعد حفظ المنتج يتم تحديث القائمة بدون إعادة تحميل الصفحة
  const handleProductSaved = (savedProduct, wasEditing) => {
    if (!savedProduct) return;

    if (wasEditing) {
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === savedProduct.id ? savedProduct : product
        )
      );
    } else {
      setProducts((currentProducts) => [
        savedProduct,
        ...currentProducts,
      ]);
    }

    setShowAddModal(false);
    setEditingProduct(null);
  };

  const closeProductModal = () => {
    setShowAddModal(false);
    setEditingProduct(null);
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('almusaymir_recent_searches') || '[]');
      if (Array.isArray(saved)) setRecentSearches(saved.slice(0, 5));
    } catch {
      setRecentSearches([]);
    }
  }, []);

  const registerSearch = () => {
    const value = searchText.trim();
    if (!value) return;
    const next = [value, ...recentSearches.filter((item) => item !== value)].slice(0, 5);
    setRecentSearches(next);
    localStorage.setItem('almusaymir_recent_searches', JSON.stringify(next));
  };

  const toggleCompare = (productId) => {
    setCompareIds((current) => {
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : current.length < 3
          ? [...current, productId]
          : current;
      localStorage.setItem('almusaymir_compare_ids', JSON.stringify(next));
      return next;
    });
  };

  const shareCatalog = async () => {
    const url = window.location.href;
    const data = { title: catalogInfo?.name || 'كتالوج المسيمير', url };
    if (navigator.share) {
      await navigator.share(data).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(url);
  };

  // فلترة المنتجات حسب المقاس المختار من القائمة الذكية (إن وُجد)
  const sizeFilteredProducts = activeSize
    ? products.filter((product) => {
        const raw = String(product.size || '').trim().toUpperCase();
        const wanted = String(activeSize).trim().toUpperCase();
        if (wanted === 'خاص') {
          return !raw || !['S', 'M', 'L', 'XL'].includes(raw);
        }
        return raw === wanted;
      })
    : products;

  const visibleProducts = sizeFilteredProducts.filter((product) => {
    const queryText = searchText.trim().toLowerCase();
    const matchesSearch = !queryText || [product.name, product.description, product.brand, product.category]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(queryText));
    const matchesFavorites = !showFavoritesOnly || favorites.includes(product.id);
    return matchesSearch && matchesFavorites;
  });

  const currentDisplayStyle =
    DISPLAY_STYLES[cardStyle] || DISPLAY_STYLES.square;

  return (
    <div
      dir="rtl"
      className="rh-root"
      style={{
        minHeight: '100vh',
        padding: '1.5rem 0.75rem',
      }}
    >
      <div className="rh-bg" aria-hidden="true" />
      <div className="rh-topline" aria-hidden="true" />
      {/* رأس الصفحة */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          marginBottom: '2rem',
        }}
      >
        <button
          onClick={() => navigate('/')}
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(var(--rz-primary-rgb), 0.12)',
            border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
            borderRadius: 12,
            padding: '0.45rem 0.9rem',
            color: 'var(--rz-primary)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            marginBottom: '0.75rem',
            fontFamily: 'Tajawal',
            fontWeight: 800,
          }}
        >
          الرئيسية
        </button>


        {/* عنوان الكاتالوج */}
        <div
          style={{
            background:
              'linear-gradient(145deg, rgba(var(--rz-ivory-rgb), 0.98), rgba(var(--rz-ivory-rgb), 0.92))',
            border: `1px solid rgba(var(--rz-primary-rgb), 0.35)`,
            borderRadius: 20,
            padding: '1.5rem',
            textAlign: 'center',
            overflowX: 'hidden',
            boxShadow: `0 8px 32px ${colorAlpha(
              catalogInfo?.sectionColor || 'var(--rz-primary)',
              0.13
            )}`,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: 900,
              background: 'linear-gradient(180deg, var(--rz-primary), var(--rz-primary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'Tajawal',
            }}
          >
            {catalogInfo?.name || CATALOG_NAME_MAP[catalogId] || catalogId?.replace(/-/g, ' ')}
          </h1>

          {catalogInfo?.section && (
            <p
              style={{
                margin: '0.5rem 0 0',
                color: 'var(--rz-primary)',
                fontSize: '0.9rem',
                fontFamily: 'Tajawal',
              }}
            >
              {catalogInfo.section}
            </p>
          )}

          {activeSize && (
            <div
              style={{
                marginTop: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'rgba(var(--rz-primary-rgb), 0.10)',
                border: '1px solid rgba(var(--rz-primary-rgb), 0.28)',
                borderRadius: 999,
                padding: '0.4rem 0.5rem 0.4rem 0.9rem',
                fontFamily: 'Tajawal',
              }}
            >
              <span style={{ color: 'var(--rz-primary)', fontSize: '0.85rem', fontWeight: 800 }}>
                {activeSubName ? `${activeSubName} — ` : ''}
                المقاس: {activeSize}
              </span>
              <button
                type="button"
                onClick={() => navigate(`/catalog/${catalogId}`, { replace: true })}
                style={{
                  background: 'var(--rz-primary)',
                  color: 'var(--rz-ivory)',
                  border: 'none',
                  borderRadius: 999,
                  padding: '0.25rem 0.7rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                إزالة الفلتر
              </button>
            </div>
          )}
        </div>
      </div>

      {/* شريط التحكم */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
          background: 'rgba(var(--rz-ivory-rgb), 0.85)',
          padding: '1rem',
          borderRadius: 16,
        }}
      >
        {/* اختيار شكل العرض */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              color: 'var(--rz-muted)',
              fontSize: '0.85rem',
              marginLeft: '0.5rem',
              fontFamily: 'Tajawal',
            }}
          >
            شكل العرض:
          </span>

          <div
            style={{
              display: 'flex',
              gap: '0.3rem',
              background: 'rgba(var(--rz-white-rgb), 0.05)',
              padding: '0.3rem',
              borderRadius: 12,
              flexWrap: 'wrap',
            }}
          >
            {Object.entries(DISPLAY_STYLES).map(([key, style]) => {
              const Icon = style.icon;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCardStyle(key)}
                  title={style.label}
                  style={{
                    padding: '0.5rem 0.8rem',
                    background:
                      cardStyle === key
                        ? 'rgba(var(--rz-primary-rgb), 0.3)'
                        : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    color:
                      cardStyle === key ? 'var(--rz-primary)' : 'var(--rz-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontFamily: 'Tajawal',
                    fontSize: '0.8rem',
                  }}
                >
                  <Icon size={16} />
                  <span>{style.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            registerSearch();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            maxWidth: 460,
            width: '100%',
            margin: '0.75rem auto 0',
            padding: '0.55rem 0.75rem',
            borderRadius: 14,
            border: '1px solid rgba(var(--rz-primary-rgb), 0.25)',
            background: 'rgba(var(--rz-white-rgb), 0.72)',
          }}
        >
          <Search size={17} color="var(--rz-primary)" aria-hidden="true" />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="ابحث داخل هذا القسم..."
            aria-label="البحث داخل المنتجات"
            style={{
              flex: 1,
              minWidth: 0,
              border: 0,
              outline: 0,
              background: 'transparent',
              color: 'var(--rz-ink)',
              fontFamily: 'Tajawal',
              fontSize: '0.85rem',
            }}
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText('')}
              aria-label="مسح البحث"
              style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--rz-muted)' }}
            >
              <X size={16} />
            </button>
          )}
        </form>

        {recentSearches.length > 0 && !searchText && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setSearchText(term)}
                style={{
                  border: '1px solid rgba(var(--rz-primary-rgb), 0.18)',
                  background: 'rgba(var(--rz-primary-rgb), 0.06)',
                  color: 'var(--rz-primary)',
                  borderRadius: 999,
                  padding: '4px 10px',
                  fontFamily: 'Tajawal',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                }}
              >
                {term}
              </button>
            ))}
          </div>
        )}

        {/* عدد المنتجات */}
        <p
          style={{
            color: 'var(--rz-muted)',
            fontSize: '0.9rem',
            fontFamily: 'Tajawal',
            margin: 0,
          }}
        >
          {visibleProducts.length} منتج
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setShowFavoritesOnly((value) => !value)}
            aria-pressed={showFavoritesOnly}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: `1px solid ${showFavoritesOnly ? 'var(--rz-primary)' : 'rgba(var(--rz-primary-rgb), 0.22)'}`,
              background: showFavoritesOnly ? 'rgba(var(--rz-primary-rgb), 0.14)' : 'rgba(var(--rz-white-rgb), 0.7)',
              color: 'var(--rz-primary)',
              borderRadius: 999,
              padding: '7px 12px',
              cursor: 'pointer',
              fontFamily: 'Tajawal',
              fontWeight: 800,
              fontSize: '0.72rem',
            }}
          >
            <Heart size={15} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
            المفضلة ({favorites.length})
          </button>
          <button
            type="button"
            onClick={shareCatalog}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid rgba(var(--rz-primary-rgb), 0.22)',
              background: 'rgba(var(--rz-white-rgb), 0.7)',
              color: 'var(--rz-primary)',
              borderRadius: 999,
              padding: '7px 12px',
              cursor: 'pointer',
              fontFamily: 'Tajawal',
              fontWeight: 800,
              fontSize: '0.72rem',
            }}
          >
            <Share2 size={15} />
            مشاركة القسم
          </button>
          {compareIds.length > 0 && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--rz-muted)',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}>
              <GitCompare size={15} />
              للمقارنة: {compareIds.length}/3
            </span>
          )}
        </div>

        {/* أزرار الإدارة */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          {isOwner && (
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                background: 'rgba(var(--rz-primary-rgb), 0.2)',
                border: '1px solid rgba(var(--rz-primary-rgb), 0.4)',
                borderRadius: 12,
                color: 'var(--rz-primary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontFamily: 'Tajawal',
              }}
            >
              <Settings size={16} />
              إعدادات العرض
            </button>
          )}

          {isOwner && (
            <button
              type="button"
              onClick={openAddProduct}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.2rem',
                background:
                  'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
                border: 'none',
                borderRadius: 12,
                color: 'var(--rz-white)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontFamily: 'Tajawal',
              }}
            >
              <Plus size={18} />
              إضافة منتج
            </button>
          )}
        </div>
      </div>

      {/* المنتجات */}
      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem',
            color: 'var(--rz-muted)',
            fontFamily: 'Tajawal',
          }}
        >
          جاري التحميل...
        </div>
      ) : visibleProducts.length === 0 ? (
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            textAlign: 'center',
            padding: '4rem',
            color: 'var(--rz-muted)',
            background: 'rgba(var(--rz-white-rgb), 0.02)',
            borderRadius: 16,
            border: '2px dashed rgba(var(--rz-white-rgb), 0.1)',
          }}
        >
          <p
            style={{
              fontSize: '4rem',
              margin: '0 0 1rem',
            }}
          >
            
          </p>

          <p
            style={{
              margin: 0,
              fontSize: '1.1rem',
              fontFamily: 'Tajawal',
            }}
          >
            لا توجد منتجات في هذا القسم حالياً
          </p>

          {isOwner && (
            <button
              type="button"
              onClick={openAddProduct}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background:
                  'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
                border: 'none',
                borderRadius: 12,
                color: 'var(--rz-white)',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Tajawal',
              }}
            >
              أضف أول منتج
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              display:
                currentDisplayStyle.direction === 'column'
                  ? 'flex'
                  : 'grid',

              flexDirection:
                currentDisplayStyle.direction || undefined,

              gridTemplateColumns:
                currentDisplayStyle.cols ||
                'repeat(auto-fill, minmax(220px, 1fr))',

              gap: currentDisplayStyle.gap || '1.5rem',

              justifyItems: currentDisplayStyle.center
                ? 'center'
                : 'stretch',

              // بطاقات عرضية متناسقة: 3–4 في الصف للشاشات الكبيرة، ومنتجان للهاتف
              ...(currentDisplayStyle.direction === 'column'
                ? {}
                : {
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
                  }),
            }}
          >
            {visibleProducts.map((product) => (
              <div key={product.id} style={{ position: 'relative', minWidth: 0 }}>
                <div style={{
                  position: 'absolute',
                  top: 10,
                  insetInlineEnd: 10,
                  zIndex: 3,
                  display: 'flex',
                  gap: 6,
                }}>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(product.id)}
                    aria-label={favorites.includes(product.id) ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                    title={favorites.includes(product.id) ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                    style={{
                      width: 34,
                      height: 34,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '50%',
                      border: '1px solid rgba(var(--rz-primary-rgb), 0.28)',
                      background: 'rgba(255,255,255,0.92)',
                      color: 'var(--rz-primary)',
                      cursor: 'pointer',
                      boxShadow: '0 5px 14px rgba(0,0,0,0.12)',
                    }}
                  >
                    <Heart size={16} fill={favorites.includes(product.id) ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCompare(product.id)}
                    aria-label={compareIds.includes(product.id) ? 'إزالة من المقارنة' : 'إضافة إلى المقارنة'}
                    title={compareIds.includes(product.id) ? 'إزالة من المقارنة' : 'إضافة إلى المقارنة'}
                    style={{
                      width: 34,
                      height: 34,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '50%',
                      border: '1px solid rgba(var(--rz-primary-rgb), 0.28)',
                      background: compareIds.includes(product.id) ? 'rgba(var(--rz-primary-rgb), 0.18)' : 'rgba(255,255,255,0.92)',
                      color: 'var(--rz-primary)',
                      cursor: 'pointer',
                      boxShadow: '0 5px 14px rgba(0,0,0,0.12)',
                    }}
                  >
                    <GitCompare size={16} />
                  </button>
                </div>
                <ProductCard
                  product={product}
                  style={cardStyle}
                  compact={currentDisplayStyle.compact}
                  isOwner={isOwner}
                  showPrices={catalogSettings.showPrices}
                  showDescriptions={catalogSettings.showDescriptions}
                  onEdit={openEditProduct}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* إعدادات العرض */}
      {showSettings && isOwner && (
        <DisplaySettingsModal
          settings={catalogSettings}
          onSave={saveDisplaySettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* إضافة / تعديل */}
      {showAddModal && (
        <AddProductModal
          catalogId={catalogId}
          catalogName={catalogInfo?.name || CATALOG_NAME_MAP[catalogId]}
          editingProduct={editingProduct}
          onClose={closeProductModal}
          onSave={handleProductSaved}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════
// مودال إعدادات العرض
// ═══════════════════════════════════════════

const DisplaySettingsModal = ({
  settings,
  onSave,
  onClose,
}) => {
  const [localSettings, setLocalSettings] = useState({
    ...DEFAULT_CATALOG_SETTINGS,
    ...settings,
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(var(--rz-ink-rgb), 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        dir="rtl"
        style={{
          background:
            'linear-gradient(145deg, var(--rz-ink), var(--rz-ink))',
          border: '2px solid var(--rz-primary)',
          borderRadius: 24,
          padding: '2rem',
          maxWidth: 500,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <h2
            style={{
              margin: 0,
              color: 'var(--rz-primary)',
              fontSize: '1.3rem',
              fontFamily: 'Tajawal',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Settings size={24} />
            إعدادات العرض
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            style={{
              width: 36,
              height: 36,
              flex: '0 0 36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(var(--rz-primary-rgb), 0.15)',
              border: '1px solid rgba(var(--rz-primary-rgb), 0.4)',
              borderRadius: 10,
              cursor: 'pointer',
              color: 'var(--rz-primary)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              color: 'var(--rz-muted)',
              marginBottom: '0.5rem',
              fontFamily: 'Tajawal',
            }}
          >
            شكل عرض المنتجات:
          </label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(3, minmax(0, 1fr))',
              gap: '0.5rem',
            }}
          >
            {Object.entries(DISPLAY_STYLES).map(
              ([key, style]) => {
                const Icon = style.icon;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setLocalSettings((current) => ({
                        ...current,
                        displayStyle: key,
                      }))
                    }
                    style={{
                      padding: '0.75rem',
                      background:
                        localSettings.displayStyle === key
                          ? 'rgba(var(--rz-primary-rgb), 0.3)'
                          : 'rgba(var(--rz-white-rgb), 0.05)',
                      border:
                        localSettings.displayStyle === key
                          ? '2px solid var(--rz-primary)'
                          : '1px solid rgba(var(--rz-white-rgb), 0.2)',
                      borderRadius: 12,
                      color:
                        localSettings.displayStyle === key
                          ? 'var(--rz-primary)'
                          : 'var(--rz-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontFamily: 'Tajawal',
                      fontSize: '0.8rem',
                    }}
                  >
                    <Icon size={24} />
                    {style.label}
                  </button>
                );
              }
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--rz-white)',
              cursor: 'pointer',
              fontFamily: 'Tajawal',
            }}
          >
            <input
              type="checkbox"
              checked={Boolean(localSettings.showPrices)}
              onChange={(event) =>
                setLocalSettings((current) => ({
                  ...current,
                  showPrices: event.target.checked,
                }))
              }
              style={{
                width: 20,
                height: 20,
              }}
            />
            عرض الأسعار
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--rz-white)',
              cursor: 'pointer',
              fontFamily: 'Tajawal',
            }}
          >
            <input
              type="checkbox"
              checked={Boolean(localSettings.showDescriptions)}
              onChange={(event) =>
                setLocalSettings((current) => ({
                  ...current,
                  showDescriptions: event.target.checked,
                }))
              }
              style={{
                width: 20,
                height: 20,
              }}
            />
            عرض الوصف
          </label>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '1rem',
          }}
        >
          <button
            type="button"
            onClick={() => onSave(localSettings)}
            style={{
              flex: 1,
              padding: '0.85rem',
              background:
                'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
              border: 'none',
              borderRadius: 12,
              color: 'var(--rz-white)',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              fontFamily: 'Tajawal',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Save size={18} />
            حفظ الإعدادات
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.85rem',
              background: 'transparent',
              border: '1px solid var(--rz-ink)',
              borderRadius: 12,
              color: 'var(--rz-muted)',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              fontFamily: 'Tajawal',
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// مودال إضافة / تعديل المنتج
// ═══════════════════════════════════════════

const AddProductModal = ({
  catalogId,
  catalogName,
  editingProduct,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState({
    name: editingProduct?.name || '',
    price:
      editingProduct?.price !== undefined
        ? editingProduct.price
        : '',
    size: editingProduct?.size || '',
    description: editingProduct?.description || '',
    image: editingProduct?.image || '',
    whatsapp:
      editingProduct?.whatsapp || WHATSAPP_NUMBER,
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setSaving(true);

    try {
      const productData = {
        name: form.name.trim(),
        price: Number(form.price),
        size: form.size.trim(),
        description: form.description.trim(),
        image: (form.image || '').trim(),
        whatsapp: form.whatsapp.replace(/[^0-9]/g, ''),
      };

      let savedProduct;

      // تعديل منتج موجود في Firestore
      if (
        editingProduct?.id &&
        !String(editingProduct.id).startsWith('sample-')
      ) {
        const productRef = doc(
          db,
          'products',
          editingProduct.id
        );

        await updateDoc(productRef, {
          ...productData,
          updatedAt: serverTimestamp(),
        });

        savedProduct = {
          ...editingProduct,
          ...productData,
        };
      } else {
        // إضافة منتج جديد
        const productRef = await addDoc(
          collection(db, 'products'),
          {
            ...productData,
            catalogId,
            catalogName: catalogName || '',
            createdAt: serverTimestamp(),
          }
        );

        savedProduct = {
          id: productRef.id,
          ...productData,
          catalogId,
          catalogName: catalogName || '',
        };
      }

      onSave(
        savedProduct,
        Boolean(
          editingProduct?.id &&
            !String(editingProduct.id).startsWith('sample-')
        )
      );
    } catch (error) {
      console.error('Error saving product:', error);
      alert('حدث خطأ أثناء حفظ المنتج');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.85rem',
    background: 'rgba(var(--rz-white-rgb), 0.05)',
    border: '1px solid rgba(var(--rz-white-rgb), 0.2)',
    borderRadius: 12,
    color: 'var(--rz-white)',
    fontSize: '1rem',
    fontFamily: 'Tajawal',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(var(--rz-ink-rgb), 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        dir="rtl"
        style={{
          background:
            'linear-gradient(145deg, var(--rz-ink), var(--rz-ink))',
          border: '2px solid var(--rz-primary)',
          borderRadius: 24,
          padding: '2rem',
          maxWidth: 550,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <h2
            style={{
              margin: 0,
              color: 'var(--rz-primary)',
              fontSize: '1.3rem',
              fontFamily: 'Tajawal',
            }}
          >
            {editingProduct
              ? 'تعديل المنتج'
              : 'إضافة منتج جديد'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            style={{
              width: 36,
              height: 36,
              flex: '0 0 36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(var(--rz-primary-rgb), 0.15)',
              border: '1px solid rgba(var(--rz-primary-rgb), 0.4)',
              borderRadius: 10,
              cursor: 'pointer',
              color: 'var(--rz-primary)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {catalogName && (
          <div
            style={{
              background: 'rgba(var(--rz-primary-rgb), 0.1)',
              padding: '0.75rem',
              borderRadius: 10,
              marginBottom: '1rem',
              textAlign: 'center',
              color: 'var(--rz-primary)',
              fontFamily: 'Tajawal, sans-serif',
              fontSize: '0.9rem',
            }}
          >
            القسم: {catalogName}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                color: 'var(--rz-muted)',
                marginBottom: '0.3rem',
                fontFamily: 'Tajawal',
              }}
            >
              اسم المنتج *
            </label>

            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              required
              style={inputStyle}
              placeholder="ابحث باسم المنتج أو القسم"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  color: 'var(--rz-muted)',
                  marginBottom: '0.3rem',
                  fontFamily: 'Tajawal',
                }}
              >
                السعر (ر.س) *
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                required
                style={inputStyle}
                placeholder="850"
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  color: 'var(--rz-muted)',
                  marginBottom: '0.3rem',
                  fontFamily: 'Tajawal',
                }}
              >
                المقاس
              </label>

              <input
                type="text"
                value={form.size}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    size: event.target.value,
                  }))
                }
                style={inputStyle}
                placeholder="M, L, XL"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <FreeImageField
              value={form.image}
              onChange={(url) =>
                setForm((current) => ({
                  ...current,
                  image: url,
                }))
              }
              label="صورة المنتج"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                color: 'var(--rz-muted)',
                marginBottom: '0.3rem',
                fontFamily: 'Tajawal',
              }}
            >
              الوصف
            </label>

            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical',
              }}
              placeholder="وصف المنتج..."
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                color: 'var(--rz-muted)',
                marginBottom: '0.3rem',
                fontFamily: 'Tajawal',
              }}
            >
              رقم واتساب للشراء
            </label>

            <input
              type="text"
              value={form.whatsapp}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  whatsapp: event.target.value,
                }))
              }
              style={inputStyle}
              placeholder="966500000000"
            />
          </div>

          <div
            style={{
              display: 'flex',
              gap: '1rem',
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: '0.85rem',
                background: saving
                  ? 'rgba(var(--rz-primary-rgb), 0.5)'
                  : 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
                border: 'none',
                borderRadius: 12,
                color: 'var(--rz-white)',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'Tajawal',
              }}
            >
              {saving
                ? 'جاري الحفظ...'
                : editingProduct
                ? 'حفظ التعديلات'
                : 'إضافة المنتج'}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                flex: 1,
                padding: '0.85rem',
                background: 'transparent',
                border: '1px solid var(--rz-ink)',
                borderRadius: 12,
                color: 'var(--rz-muted)',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'Tajawal',
              }}
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CatalogPage;
