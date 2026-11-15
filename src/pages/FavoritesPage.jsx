// src/pages/FavoritesPage.jsx
// صفحة «المفضلة» الحقيقية — تُعرض من زر المفضلة في الترويسة/الدرج.
// المصدر: وثيقة العضوية users/{uid}.favorites (نفس ما يكتبه toggleFavorite)
// مع الرجوع إلى مخزن الحالة المحلي. المنتجات تُجلب بالمعرّف (قراءتها عامة).

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowRight, Trash2, Loader2, ShoppingBag } from 'lucide-react';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import useStore from '../store/useStore';
import ProductCard from '../components/RoyalHome/ProductCard';
import { STORE_HOME_PATH } from '../data/royalMenu';

const FavoritesPage = () => {
  const navigate = useNavigate();
  const storeUser = useStore((s) => s.user);
  const storeFavorites = useStore((s) => s.favorites || []);
  const uid = storeUser?.uid || auth?.currentUser?.uid || '';

  const [ids, setIds] = useState(storeFavorites);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // المصدر الحقيقي للمفضلة هو وثيقة العضوية (تكتبها toggleFavorite أيضاً).
  useEffect(() => {
    let mounted = true;
    if (!uid) {
      setLoading(false);
      return () => { mounted = false; };
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        const remote = snap.exists() ? snap.data()?.favorites : null;
        if (mounted && Array.isArray(remote)) setIds(remote);
      } catch (err) {
        console.error('Error loading favorites:', err);
      }
    })();
    return () => { mounted = false; };
  }, [uid]);

  // جلب المنتجات المفضّلة بمعرّفاتها (قراءة المنتجات عامة).
  useEffect(() => {
    let mounted = true;
    if (!ids.length) {
      setProducts([]);
      setLoading(false);
      return () => { mounted = false; };
    }
    (async () => {
      setLoading(true);
      try {
        const snaps = await Promise.all(
          ids.map((id) => getDoc(doc(db, 'products', id)).catch(() => null))
        );
        if (mounted) {
          setProducts(
            snaps
              .filter((s) => s && s.exists())
              .map((s) => ({ id: s.id, ...s.data() }))
          );
        }
      } catch (err) {
        console.error('Error fetching favorite products:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [ids]);

  const removeFavorite = async (productId) => {
    const next = ids.filter((id) => id !== productId);
    setIds(next);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    try {
      await updateDoc(doc(db, 'users', uid), { favorites: arrayRemove(productId) });
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  return (
    <div
      dir="rtl"
      className="rh-root"
      style={{ minHeight: '100vh', padding: '1.5rem 0.75rem' }}
    >
      <div className="rh-bg" aria-hidden="true" />
      <div className="rh-topline" aria-hidden="true" />

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Heart size={24} color="var(--rz-primary)" fill="currentColor" />
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--rz-ink)' }}>
              المفضلة {ids.length > 0 ? `(${ids.length})` : ''}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(STORE_HOME_PATH)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '0.55rem 1rem',
              borderRadius: 12,
              border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
              background: 'var(--rz-white)',
              color: 'var(--rz-primary)',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <ArrowRight size={16} />
            متابعة التسوق
          </button>
        </div>

        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '4rem 0',
              color: 'var(--rz-primary)',
              fontWeight: 700,
            }}
          >
            <Loader2 size={22} className="spin" />
            جاري تحميل المفضلة...
          </div>
        ) : products.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 1.5rem',
              background: 'var(--rz-white)',
              border: '1px solid rgba(var(--rz-ink-rgb), 0.08)',
              borderRadius: 20,
            }}
          >
            <ShoppingBag size={44} color="var(--rz-muted)" style={{ marginBottom: 12 }} />
            <p style={{ margin: '0 0 1rem', color: 'var(--rz-ink)', fontWeight: 700 }}>
              لا توجد منتجات في المفضلة بعد.
            </p>
            <button
              type="button"
              onClick={() => navigate(STORE_HOME_PATH)}
              style={{
                padding: '0.65rem 1.4rem',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-ink))',
                color: 'var(--rz-white)',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              تصفح المتجر
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {products.map((product) => (
              <div key={product.id} style={{ position: 'relative' }}>
                <ProductCard product={product} style="square" />
                <button
                  type="button"
                  onClick={() => removeFavorite(product.id)}
                  aria-label="إزالة من المفضلة"
                  title="إزالة من المفضلة"
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 5,
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    border: '1px solid rgba(var(--rz-primary-rgb), 0.28)',
                    background: 'rgba(255,255,255,0.94)',
                    color: 'var(--rz-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 5px 14px rgba(0,0,0,0.12)',
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
