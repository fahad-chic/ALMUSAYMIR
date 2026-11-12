import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { hasAuthenticatedUser } from '../utils/guards';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Megaphone, Trash2 } from 'lucide-react';
import toast from '../utils/toast';

const AdsPage = () => {
  const { user, userRole } = useAuth();
  const isAuthenticated = hasAuthenticatedUser(user);
  const [adText, setAdText] = useState('');
  const [ads, setAds] = useState([]);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const adsQuery = query(
      collection(db, 'ads'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      adsQuery,
      (snap) => {
        setAds(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data()
          }))
        );
      },
      (error) => {
        console.error('ads subscription:', error);
        setAds([]);
      }
    );

    return () => unsub();
  }, []);

  const formatAdDate = (createdAt) => {
    try {
      if (!createdAt) return 'التاريخ غير متوفر';

      const date =
        typeof createdAt?.toDate === 'function'
          ? createdAt.toDate()
          : createdAt instanceof Date
          ? createdAt
          : new Date(createdAt);

      if (Number.isNaN(date.getTime())) return 'التاريخ غير متوفر';

      return date.toLocaleDateString('ar-SA');
    } catch {
      return 'التاريخ غير متوفر';
    }
  };

  const handlePostAd = async () => {
    const content = adText.trim();

    if (!content || !isAuthenticated || !user?.uid || posting) return;

    setPosting(true);

    try {
      await addDoc(collection(db, 'ads'), {
        byUid: user.uid,
        byEmail: user.email || '',
        content,
        createdAt: serverTimestamp()
      });

      setAdText('');
    } catch (error) {
      console.error('post ad:', error);
      toast.error('حدث خطأ أثناء نشر الإعلان');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteAd = async (id) => {
    if (!id || deletingId) return;
    if (!window.confirm('هل تريد حذف هذا الإعلان؟')) return;

    setDeletingId(id);

    try {
      await deleteDoc(doc(db, 'ads', id));
    } catch (error) {
      console.error('delete ad:', error);
      toast.error('حدث خطأ أثناء حذف الإعلان');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="glass-morphism-gold p-6 rounded-lg">
      <h2 className="text-luxury-gold font-bold mb-4 flex items-center gap-2">
        <Megaphone />
        لوحة الإعلانات
      </h2>

      <textarea
        value={adText}
        onChange={(e) => setAdText(e.target.value)}
        placeholder="اكتب إعلانك هنا..."
        className="input-gold w-full h-24 mb-2"
        disabled={posting}
      />

      <button
        onClick={handlePostAd}
        type="button"
        disabled={posting || !adText.trim() || !isAuthenticated}
        className="btn-gold w-full mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {posting ? 'جاري النشر...' : 'نشر الإعلان'}
      </button>

      <div className="space-y-3">
        {ads.length === 0 && (
          <p className="text-center text-gray-400">لا توجد إعلانات</p>
        )}

        {ads.map((a) => (
          <div
            key={a.id}
            className="bg-black/30 p-3 rounded-lg border-luxury-gold/10"
          >
            <p className="text-xs text-gray-400">
              بواسطة: {a.byEmail || 'مستخدم'} - {formatAdDate(a.createdAt)}
            </p>

            <p className="mt-2">{a.content || ''}</p>

            {(userRole === 'owner' ||
              (isAuthenticated && a.byUid === user?.uid)) && (
              <button
                onClick={() => handleDeleteAd(a.id)}
                type="button"
                disabled={deletingId === a.id}
                className="text-red-500 text-xs mt-2 flex items-center gap-1 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={12} />
                {deletingId === a.id ? 'جاري الحذف...' : 'حذف الإعلان'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdsPage;