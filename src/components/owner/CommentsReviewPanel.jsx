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
  deleteDoc,
  getDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import usePermissions from '../../permissions/usePermissions';
import { requirePerm } from '../../permissions/rbacService';
import { writeAuditLog } from '../../permissions/audit';
import toast from '../../utils/toast';
const CommentsReviewPanel = () => {
  const { can } = usePermissions();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let comments = [];
    let privateEmails = {};

    const emit = () => {
      const list = comments
        .filter((c) => c.status === 'pending')
        .map((c) => ({ ...c, email: c.email || privateEmails[c.id] || '' }));
      setPending(list);
      setLoading(false);
    };

    const q = query(
      collection(db, 'comments'),
      orderBy('createdAt', 'desc')
    );

    // البريد الخاص صار في comment_private (لا يُقرأ علناً). المالك/المشرف فقط
    // يستطيع قراءته، فنُدمجه مع التعليق لعرضه في لوحة المراجعة.
    const privateQ = query(collection(db, 'comment_private'));

    const unsubPrivate = onSnapshot(
      privateQ,
      (snapshot) => {
        privateEmails = {};
        snapshot.docs.forEach((d) => {
          privateEmails[d.id] = d.data()?.email || '';
        });
        emit();
      },
      (error) => {
        console.error('Comment private error:', error);
        privateEmails = {};
        emit();
      }
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        comments = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      },
      (error) => {
        console.error('Comments review error:', error);
        comments = [];
        emit();
      }
    );

    return () => {
      unsubscribe();
      unsubPrivate();
    };
  }, []);

  const approve = async (id) => {
    try { await requirePerm(can, 'HARAJ_COMMENT_EDIT', 'اعتماد تعليق', id); } catch (e) { toast.error(e.message); return; }
    try {
      await updateDoc(doc(db, 'comments', id), {
        status: 'approved',
      });
      await writeAuditLog({
        action: 'HARAJ_COMMENT_APPROVE', permissionKey: 'HARAJ_COMMENT_EDIT',
        targetType: 'comments', targetId: id, result: 'success',
        details: 'اعتماد تعليق ونشره', severity: 'info',
      });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الموافقة على التعليق');
    }
  };

  // الرفض حذف حقيقي: يُؤرشف التعليق في deleted_archive أولاً ثم يُحذف من
  // قاعدة البيانات (بدل تغيير الحالة الذي كان يُبقي التعليق مخزّناً).
  const reject = async (id) => {
    try { await requirePerm(can, 'HARAJ_COMMENT_DELETE', 'حذف تعليق', id); } catch (e) { toast.error(e.message); return; }
    if (!window.confirm('هل أنت متأكد من حذف هذا التعليق؟ سيُؤرشف قبل الحذف.')) return;

    try {
      const snap = await getDoc(doc(db, 'comments', id));
      const payload = snap.exists() ? snap.data() : {};
      await addDoc(collection(db, 'deleted_archive'), {
        sourceCollection: 'comments',
        sourceId: id,
        payload,
        deletedAt: serverTimestamp(),
        deletedBy: 'owner-room',
      });
      await deleteDoc(doc(db, 'comments', id));
      await writeAuditLog({
        action: 'HARAJ_COMMENT_DELETE', permissionKey: 'HARAJ_COMMENT_DELETE',
        targetType: 'comments', targetId: id, result: 'success',
        details: 'حذف تعليق وأرشفته في deleted_archive', severity: 'medium',
      });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء حذف التعليق');
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
                    حذف
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