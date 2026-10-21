import React, { useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminContext } from '../context/AdminContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, Share2, Copy, X } from 'lucide-react';

export const BranchesManagement = () => {
  const { branches = [], addBranch, updateBranch, deleteBranch } = useContext(AdminContext) || {};
  const { userRole } = useAuth();
  const isOwner = userRole === 'owner';
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'عام',
    location: '',
    manager: '',
    status: 'نشط'
  });

  const [editingBranch, setEditingBranch] = useState(null);

  const resetForm = () => {
    setFormData({ name: '', type: 'عام', location: '', manager: '', status: 'نشط' });
    setEditingBranch(null);
    setShowForm(false);
  };

  const openEditBranch = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || '',
      type: branch.type || 'عام',
      location: branch.location || '',
      manager: branch.manager || '',
      status: branch.status || 'نشط',
    });
    setShowForm(true);
  };

  /*
   * عند القدوم من «تعديل الفرع» في BranchDetail (عبر router state)
   * ننتظر تحميل القوائم ثم نفتح نموذج التعديل معبأً بالفرع المقصود.
   */
  const location = useLocation();
  const appliedAutoEdit = useRef(false);
  useEffect(() => {
    const editId = location.state && location.state.editBranchId;
    if (!editId || appliedAutoEdit.current || !branches || !Array.isArray(branches)) {
      return;
    }
    const target = branches.find((b) => b.id === editId);
    if (target) {
      appliedAutoEdit.current = true;
      openEditBranch(target);
    }
  }, [branches, location]);

  const handleSubmitBranch = async (e) => {
    e.preventDefault();
    if (!(formData.name && formData.location && formData.manager)) return;
    if (editingBranch) {
      await updateBranch(editingBranch.id, formData);
      alert('تم حفظ تعديلات الفرع');
    } else {
      await addBranch(formData);
    }
    resetForm();
  };

  const handleCopy = async (branch) => {
    const text = `
اسم الفرع: ${branch.name || 'غير متوفر'}
النوع: ${branch.type || 'غير متوفر'}
الموقع: ${branch.location || 'غير متوفر'}
المدير: ${branch.manager || 'غير متوفر'}
الحالة: ${branch.status || 'غير متوفر'}
    `;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        alert('تم نسخ بيانات الفرع');
      } else {
        alert('المتصفح لا يدعم نسخ البيانات مباشرة');
      }
    } catch {
      alert('تعذر نسخ بيانات الفرع');
    }
  };

  const handleShare = async (branch) => {
    const text = `فرع ${branch.name || 'غير متوفر'} - الموقع: ${branch.location || 'غير متوفر'} - المدير: ${branch.manager || 'غير متوفر'}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: branch.name || 'بيانات الفرع', text });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        alert('تم نسخ بيانات المشاركة');
      } else {
        alert('المتصفح لا يدعم المشاركة المباشرة');
      }
    } catch {
      return;
    }
  };

  return (
    <div className="management-container">
      <style>{`
        .management-container {
          padding: 1rem;
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Tajawal', sans-serif;
        }

        .management-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding: 1rem 1.1rem;
          background: var(--rz-ink);
          border: 1px solid rgba(var(--rz-primary-rgb), 0.25);
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(var(--rz-white-rgb), 0.05);
        }

        .management-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--rz-ivory) !important;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: linear-gradient(135deg, var(--rz-primary), var(--rz-primary));
          color: var(--rz-white);
          border: none;
          padding: 0.65rem 1rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .table-wrapper {
          background: var(--rz-ink);
          border: 1px solid rgba(var(--rz-primary-rgb), 0.25);
          border-radius: 16px;
          overflow-x: auto;
          box-shadow: 0 2px 12px rgba(var(--rz-white-rgb), 0.05);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          color: var(--rz-white);
          min-width: 850px;
        }

        th {
          background: var(--rz-ink);
          padding: 0.9rem;
          font-size: 0.9rem;
          color: var(--rz-ivory) !important;
          text-align: left;
        }

        td {
          padding: 0.8rem;
          border-bottom: 1px solid rgba(var(--rz-white-rgb), 0.05);
        }

        .branch-name {
          font-weight: 700;
          color: var(--rz-ivory);
        }

        .type-badge {
          display: inline-block;
          background: rgba(var(--rz-primary-rgb), 0.15);
          color: var(--rz-ivory);
          padding: 0.24rem 0.6rem;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 700;
        }

        .status-badge {
          display: inline-block;
          padding: 0.24rem 0.6rem;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 700;
        }

        .status-active { background: rgba(var(--rz-ink-rgb), 0.2); color: var(--rz-ivory); }
        .status-warning { background: rgba(var(--rz-primary-rgb), 0.2); color: var(--rz-ivory); }
        .status-danger { background: rgba(var(--rz-primary-rgb), 0.2); color: var(--rz-ivory); }

        .action-cell {
          display: flex;
          gap: 0.4rem;
          justify-content: flex-end;
        }

        .action-btn {
          padding: 0.5rem 0.75rem;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8rem;
        }

        .action-btn-edit { background: rgba(var(--rz-primary-rgb), 0.15); color: var(--rz-ivory); }
        .action-btn-delete { background: rgba(var(--rz-primary-rgb), 0.16); color: var(--rz-cream-4); }
        .action-btn-share { background: rgba(var(--rz-white-rgb), 0.08); color: var(--rz-white); }
        .action-btn-copy { background: rgba(var(--rz-white-rgb), 0.08); color: var(--rz-white); }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(var(--rz-ink-rgb), 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal {
          background: var(--rz-ink);
          border: 1px solid rgba(var(--rz-primary-rgb), 0.25);
          border-radius: 16px;
          padding: 1.1rem;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 2px 12px rgba(var(--rz-white-rgb), 0.05);
        }

        .modal-header {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--rz-ivory);
          margin-bottom: 0.9rem;
        }

        .form-group {
          margin-bottom: 0.8rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        label {
          color: var(--rz-ivory);
          font-size: 0.85rem;
        }

        input, select {
          padding: 0.6rem;
          border-radius: 8px;
          border: 1px solid rgba(var(--rz-white-rgb), 0.1);
          background: var(--rz-ink);
          color: var(--rz-white);
          font-size: 0.9rem;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.6rem;
          margin-top: 1rem;
        }

        .modal-btn {
          padding: 0.6rem 0.9rem;
          border-radius: 999px;
          font-weight: 700;
          cursor: pointer;
        }

        .modal-btn-submit {
          background: linear-gradient(135deg, var(--rz-primary), var(--rz-primary));
          color: var(--rz-white);
        }

        .modal-btn-cancel {
          background: rgba(var(--rz-white-rgb), 0.08);
          color: var(--rz-ivory);
        }
      `}</style>

      <div className="management-header">
        <h1 className="management-title">إدارة الفروع</h1>
        <button className="add-btn" onClick={() => setShowForm(true)} type="button">
          <Plus size={18} />
          إضافة فرع جديد
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>اسم الفرع</th>
              <th>النوع</th>
              <th>الموقع</th>
              <th>المدير</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>

          <tbody>
            {branches.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--rz-ivory)', padding: '2rem' }}>
                  لا توجد فروع
                </td>
              </tr>
            ) : (
              branches.map((branch) => (
                <tr key={branch.id}>
                  <td className="branch-name">{branch.name || 'غير متوفر'}</td>
                  <td><span className="type-badge">{branch.type || 'غير متوفر'}</span></td>
                  <td>{branch.location || 'غير متوفر'}</td>
                  <td>{branch.manager || 'غير متوفر'}</td>

                  <td>
                    <span className={
                      branch.status === 'نشط'
                        ? 'status-badge status-active'
                        : branch.status === 'مغلق'
                        ? 'status-badge status-danger'
                        : 'status-badge status-warning'
                    }>
                      {branch.status || 'غير محدد'}
                    </span>
                  </td>

                  <td>
                    <div className="action-cell">
                      <button className="action-btn action-btn-share" onClick={() => handleShare(branch)} type="button">
                        <Share2 size={16} />
                        مشاركة
                      </button>

                      <button className="action-btn action-btn-copy" onClick={() => handleCopy(branch)} type="button">
                        <Copy size={16} />
                        نسخ
                      </button>

                      {isOwner && (
                        <>
                          <button className="action-btn action-btn-edit" onClick={() => openEditBranch(branch)} type="button">
                            <Edit size={16} />
                            تعديل
                          </button>

                          <button className="action-btn action-btn-delete" onClick={() => deleteBranch(branch.id)} type="button">
                            <Trash2 size={16} />
                            حذف
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>

        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span>{editingBranch ? 'تعديل الفرع' : 'إضافة فرع جديد'}</span>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingBranch(null); }}
                aria-label="إغلاق"
                style={{
                  background: 'rgba(var(--rz-white-rgb), 0.06)',
                  border: 'none',
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  flex: '0 0 30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--rz-ivory)',
                }}
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSubmitBranch}>
              <div className="form-group">
                <label>اسم الفرع</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: فرع الرياض الرئيسي"
                  required
                />
              </div>

              <div className="form-group">
                <label>نوع الفرع</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option>عام</option>
                  <option>خاص</option>
                </select>
              </div>

              <div className="form-group">
                <label>الموقع</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="مثال: الرياض - حي الملقا"
                  required
                />
              </div>

              <div className="form-group">
                <label>اسم المدير</label>
                <input
                  type="text"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="مثال: محمد الشمري"
                  required
                />
              </div>

              <div className="form-group">
                <label>حالة الفرع</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option>نشط</option>
                  <option>مغلق</option>
                  <option>تحت الصيانة</option>
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="modal-btn modal-btn-cancel" onClick={resetForm}>
                  إلغاء
                </button>
                <button type="submit" className="modal-btn modal-btn-submit">
                  {editingBranch ? 'حفظ التعديلات' : 'إضافة الفرع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchesManagement;