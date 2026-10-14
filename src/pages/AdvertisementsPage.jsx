import React, { useContext, useState } from 'react';
import { AdminContext } from '../context/AdminContext';
import { Plus, Trash2, Eye, EyeOff, X } from 'lucide-react';

export const AdvertisementsPage = () => {
  const ctx = useContext(AdminContext) || {};
  const {
    advertisements = [],
    addAdvertisement,
    deleteAdvertisement,
    toggleAdvertisement
  } = ctx;
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    expiryDate: '',
  });

  const formatDate = (value) => {
    try {
      if (!value) return 'التاريخ غير متوفر';

      const date =
        typeof value?.toDate === 'function'
          ? value.toDate()
          : value instanceof Date
            ? value
            : new Date(value);

      if (Number.isNaN(date.getTime())) return 'التاريخ غير متوفر';

      return date.toLocaleDateString('ar-SA');
    } catch {
      return 'التاريخ غير متوفر';
    }
  };

  const handleAddAd = (e) => {
    e.preventDefault();

    const title = formData.title.trim();
    const description = formData.description.trim();
    const imageUrl = formData.imageUrl.trim();

    if (title && description) {
      addAdvertisement({
        ...formData,
        title,
        description,
        imageUrl,
        expiryDate: formData.expiryDate
          ? new Date(formData.expiryDate)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      setFormData({ title: '', description: '', imageUrl: '', expiryDate: '' });
      setShowForm(false);
    }
  };

  return (
    <div className="ads-container">
      <style>{`
        .ads-container {
          padding: 1rem;
          max-width: 1200px;
          margin: 0 auto;
          min-height: calc(100vh - 70px);
        }

        .ads-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding: 1rem 1.1rem;
          background: rgba(var(--rz-ink-rgb), 0.8);
          border: 1px solid rgba(var(--rz-primary-rgb), 0.2);
          border-radius: 16px;
        }

        .ads-title { font-size: 1.35rem; font-weight: 700; color: var(--rz-ivory) !important; }
        .add-btn { display:flex; align-items:center; gap:0.4rem; background: linear-gradient(135deg, var(--rz-primary), var(--rz-primary)); color:var(--rz-white); border:none; padding:0.65rem 1rem; border-radius:999px; font-weight:700; font-size:0.9rem; }

        .ads-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; }
        .ad-card {
          background: rgba(var(--rz-ink-rgb), 0.86);
          border: 1px solid rgba(var(--rz-primary-rgb), 0.18);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 20px rgba(var(--rz-ink-rgb), 0.2);
        }

        .ad-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(var(--rz-primary-rgb), 0.2);
        }

        .ad-card.inactive {
          opacity: 0.6;
        }

        .ad-image {
          width: 100%;
          height: 150px;
          background: linear-gradient(135deg, rgba(var(--rz-primary-rgb), 0.22), rgba(var(--rz-white-rgb), 0.05));
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--rz-ivory);
          font-size: 2rem;
          overflow: hidden;
        }

        .ad-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .ad-content { padding: 1rem; }
        .ad-title { font-size: 1rem; font-weight: 700; color: var(--rz-ivory); margin-bottom: 0.35rem; }
        .ad-description { color: var(--rz-gold); font-size: 0.84rem; margin-bottom: 0.75rem; line-height: 1.5; }

        .ad-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
          color: var(--rz-muted);
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--rz-border);
        }

        .ad-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .ad-status.active {
          background: rgba(var(--rz-ink-rgb), 0.1);
          color: var(--rz-ivory);
        }

        .ad-status.inactive {
          background: rgba(var(--rz-primary-rgb), 0.1);
          color: var(--rz-ivory);
        }

        .ad-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: space-between;
        }

        .ad-btn {
          flex: 1;
          padding: 0.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          font-family: inherit;
          font-size: 0.8rem;
          transition: all 0.3s ease;
        }

        .ad-btn-toggle {
          background: var(--rz-primary);
          color: white;
        }

        .ad-btn-toggle:hover {
          background: var(--rz-primary);
        }

        .ad-btn-delete {
          background: var(--rz-primary);
          color: white;
        }

        .ad-btn-delete:hover {
          background: var(--rz-primary);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(var(--rz-ink-rgb), 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 20px 25px rgba(var(--rz-ink-rgb), 0.15);
        }

        .modal-header {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--rz-ink);
          margin-bottom: 1.5rem;
          border-bottom: 2px solid var(--rz-border);
          padding-bottom: 1rem;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
          border-top: 2px solid var(--rz-border);
          padding-top: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: var(--rz-ink);
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid var(--rz-border);
          border-radius: 6px;
          font-size: 1rem;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--rz-primary);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 100px;
        }

        .modal-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-family: inherit;
          transition: all 0.3s ease;
        }

        .modal-btn-submit {
          background: var(--rz-primary);
          color: var(--rz-white);
        }

        .modal-btn-submit:hover {
          background: var(--rz-primary);
        }

        .modal-btn-cancel {
          background: var(--rz-border);
          color: var(--rz-ink);
        }

        .modal-btn-cancel:hover {
          background: var(--rz-border);
        }

        @media (max-width: 768px) {
          .ads-header {
            flex-direction: column;
            gap: 1rem;
          }

          .add-btn {
            width: 100%;
            justify-content: center;
          }

          .ads-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ads-header">
        <h1 className="ads-title">إدارة الإعلانات</h1>
        <button className="add-btn" onClick={() => setShowForm(true)} type="button">
          <Plus size={18} />
          إعلان جديد
        </button>
      </div>

      <div className="ads-grid">
        {advertisements.length === 0 && (
          <div className="ad-card">
            <div className="ad-content">
              <div className="ad-title">لا توجد إعلانات</div>
              <div className="ad-description">يمكنك إضافة إعلان جديد من الزر أعلاه.</div>
            </div>
          </div>
        )}

        {advertisements.map((ad) => (
          <div key={ad.id} className={`ad-card ${!ad.isActive ? 'inactive' : ''}`}>
            <div className="ad-image">
              {ad.imageUrl ? (
                <img src={ad.imageUrl} alt={ad.title || 'صورة الإعلان'} />
              ) : null}
            </div>
            <div className="ad-content">
              <div className="ad-title">{ad.title || 'بدون عنوان'}</div>
              <div className="ad-description">{ad.description || 'لا يوجد وصف للإعلان'}</div>
              
              <div className="ad-meta">
                <span>{formatDate(ad.createdDate)}</span>
                <div className={`ad-status ${ad.isActive ? 'active' : 'inactive'}`}>
                  {ad.isActive ? 'نشط' : 'غير نشط'}
                </div>
              </div>

              <div className="ad-actions">
                <button className="ad-btn ad-btn-toggle" onClick={() => toggleAdvertisement(ad.id)} type="button">
                  {ad.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                  {ad.isActive ? 'إخفاء' : 'إظهار'}
                </button>
                <button className="ad-btn ad-btn-delete" onClick={() => deleteAdvertisement(ad.id)} type="button">
                  <Trash2 size={14} />
                  حذف
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span>إضافة إعلان جديد</span>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="إغلاق"
                style={{
                  background: 'rgba(var(--rz-ink-rgb), 0.06)',
                  border: 'none',
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  flex: '0 0 30px',
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

            <form onSubmit={handleAddAd}>
              <div className="form-group">
                <label>عنوان الإعلان</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: عرض خاص لفترة محدودة"
                  required
                />
              </div>

              <div className="form-group">
                <label>وصف الإعلان</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="أدخل وصف الإعلان التفصيلي"
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label>رابط الصورة</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="form-group">
                <label>تاريخ انتهاء الإعلان</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="modal-btn modal-btn-cancel" onClick={() => setShowForm(false)}>
                  إلغاء
                </button>
                <button type="submit" className="modal-btn modal-btn-submit">
                  إضافة الإعلان
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvertisementsPage;