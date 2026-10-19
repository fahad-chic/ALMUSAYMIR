// src/components/owner/CommentsReviewPanel.jsx
import React, { useEffect, useState } from 'react';
import { MessageSquare, Check, X } from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import usePermissions from '../../permissions/usePermissions';
import { requirePerm } from '../../permissions/requirePerm';
const CommentsReviewPanel = () => {
  const { can } = usePermissions();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((c) => c.status === 'pending');

        setPending(list);
        setLoading(false);
      },
      (error) => {
        console.error('Comments review error:', error);
        setPending([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const approve = async (id) => {
    try { await requirePerm(can, 'HARAJ_COMMENT_EDIT', 'اعتماد تعليق', id); } catch (e) { alert(e.message); return; }
    try {
      await updateDoc(doc(db, 'comments', id), {
        status: 'approved',
      });
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء الموافقة على التعليق');
    }
  };

  const reject = async (id) => {
    try { await requirePerm(can, 'HARAJ_COMMENT_DELETE', 'رفض تعليق', id); } catch (e) { alert(e.message); return; }
    if (!window.confirm('هل أنت متأكد من رفض هذا التعليق؟')) return;

    try {
      await updateDoc(doc(db, 'comments', id), {
        status: 'rejected',
      });
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء رفض التعليق');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2 text-yellow-400">
        <MessageSquare size={22} />
        آراء العملاء المعلقة ({pending.length})
      </h2>

      {loading ? (
        <p className="text-slate-400 text-center py-8">جاري تحميل التعليقات...</p>
      ) : pending.length === 0 ? (
        <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-8 text-center text-slate-400 border border-slate-700/50">
          لا توجد تعليقات بانتظار المراجعة حالياً
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((comment) => (
            <div
              key={comment.id}
              className="bg-slate-800/80 backdrop-blur-md rounded-xl p-4 border border-slate-700/50"
            >
              <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-yellow-400">
                      {comment.name || 'زائر'}
                    </span>
                    {comment.city && (
                      <span className="text-xs text-slate-400">• {comment.city}</span>
                    )}
                  </div>

                  {comment.email && (
                    <p className="text-xs text-slate-500 mb-2">{comment.email}</p>
                  )}

                  <p className="text-sm text-slate-200 leading-relaxed break-words">
                    {comment.text}
                  </p>
                </div>

                <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                  <button
                    onClick={() => approve(comment.id)}
                    className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-bold flex items-center gap-1 transition"
                  >
                    <Check size={15} />
                    موافق
                  </button>
                  <button
                    onClick={() => reject(comment.id)}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-bold flex items-center gap-1 transition"
                  >
                    <X size={15} />
                    رفض
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentsReviewPanel;