import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminContext } from '../context/AdminContext';
import { useAuth } from '../context/AuthContext';
import {
  MapPin,
  Users,
  Star,
  ArrowLeft,
  Edit,
  Trash2,
  Share2,
  Copy
} from 'lucide-react';

export const BranchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getBranchById, branches, deleteBranch } = useContext(AdminContext) || {};
  const { userRole } = useAuth();
  const isOwner = userRole === 'owner';
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fromList = branches?.find((b) => b.id === id);

    if (fromList) {
      if (active) {
        setBranch(fromList);
        setLoading(false);
      }
      return undefined;
    }

    if (typeof getBranchById === 'function') {
      setLoading(true);
      getBranchById(id)
        .then((data) => {
          if (active) {
            setBranch(data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setBranch(null);
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [id, branches, getBranchById]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--rz-primary)' }}>
        <p>جاري تحميل بيانات الفرع...</p>
      </div>
    );
  }

  if (!branch) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--rz-ink)' }}>
        <p>لم يتم العثور على الفرع</p>
        <button
          onClick={() => navigate('/branches')}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            background: 'var(--rz-primary)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--rz-white)',
            fontWeight: 700
          }}
        >
          العودة إلى الفروع
        </button>
      </div>
    );
  }

  const safeNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };

  const displayValue = (value, fallback = 'غير متوفر') => {
    if (value === null || value === undefined || String(value).trim() === '') {
      return fallback;
    }
    return value;
  };

  const employees = safeNumber(branch.employees);
  const rating = Math.min(5, Math.max(0, safeNumber(branch.rating)));
  const completionPercentage = Math.min(
    100,
    Math.max(0, safeNumber(branch.completionPercentage))
  );
  const branchName = displayValue(branch.name);
  const branchLocation = displayValue(branch.location);
  const branchManager = displayValue(branch.manager);
  const branchType = displayValue(branch.type);

  const handleCopy = async () => {
    const text = `
اسم الفرع: ${branchName}
الموقع: ${branchLocation}
المدير: ${branchManager}
التقييم: ${rating}/5
عدد الموظفين: ${employees}
نسبة الإنجاز: ${completionPercentage}%
نوع الفرع: ${branchType}
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

  const handleShare = async () => {
    const text = `فرع ${branchName} - الموقع: ${branchLocation} - المدير: ${branchManager}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: branchName, text });
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
    <div className="branch-detail-container">
      <style>{`
        .branch-detail-container {
          padding: 2rem;
          background: linear-gradient(135deg, var(--rz-ink) 0%, var(--rz-ink) 100%);
          min-height: calc(100vh - 70px);
          color: var(--rz-white);
          font-family: 'Tajawal', sans-serif;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--rz-primary);
          color: var(--rz-white);
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 700;
          margin-bottom: 2rem;
          transition: all 0.3s ease;
          font-size: 1rem;
        }

        .back-button:hover {
          background: var(--rz-primary);
          transform: translateY(-2px);
        }

        .detail-header {
          background: var(--rz-ink);
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 12px rgba(var(--rz-white-rgb), 0.05);
          border-left: 4px solid var(--rz-primary);
        }

        .detail-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--rz-primary);
          margin-bottom: 1rem;
        }

        .detail-meta {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        .meta-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .meta-icon {
          width: 45px;
          height: 45px;
          background: rgba(var(--rz-primary-rgb), 0.15);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--rz-primary);
          flex-shrink: 0;
        }

        .meta-content h4 {
          color: var(--rz-muted);
          font-size: 0.85rem;
          margin-bottom: 0.25rem;
        }

        .meta-content p {
          color: var(--rz-white);
          font-weight: 700;
          font-size: 1rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: var(--rz-ink);
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(var(--rz-white-rgb), 0.05);
          border-top: 3px solid var(--rz-primary);
          text-align: center;
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--rz-primary);
          margin-bottom: 0.5rem;
        }

        .stat-name {
          color: var(--rz-muted);
          font-size: 0.9rem;
        }

        .progress-section {
          background: var(--rz-ink);
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(var(--rz-white-rgb), 0.05);
          margin-bottom: 2rem;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .progress-label-text {
          font-weight: 700;
          color: var(--rz-white);
        }

        .progress-label-value {
          color: var(--rz-primary);
          font-weight: 700;
        }

        .progress-bar {
          width: 100%;
          height: 12px;
          background: var(--rz-ink);
          border-radius: 6px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--rz-primary), var(--rz-gold));
          border-radius: 6px;
          transition: width 0.3s ease;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          background: var(--rz-ink);
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(var(--rz-white-rgb), 0.05);
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 700;
          transition: all 0.3s ease;
          font-size: 0.95rem;
        }

        .action-btn-edit {
          background: var(--rz-primary);
          color: var(--rz-white);
        }

        .action-btn-edit:hover {
          background: var(--rz-primary);
          transform: translateY(-2px);
        }

        .action-btn-delete {
          background: var(--rz-primary);
          color: white;
        }

        .action-btn-delete:hover {
          background: var(--rz-primary);
          transform: translateY(-2px);
        }

        .action-btn-share {
          background: var(--rz-ink);
          color: var(--rz-white);
        }

        .action-btn-share:hover {
          background: var(--rz-ink);
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .branch-detail-container {
            padding: 1rem;
          }

          .detail-title {
            font-size: 1.5rem;
          }

          .detail-meta {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column;
          }

          .action-btn {
            justify-content: center;
            width: 100%;
          }
        }
      `}</style>

      <button className="back-button" onClick={() => navigate('/branches')}>
        <ArrowLeft size={18} />
        العودة إلى الفروع
      </button>

      <div className="detail-header">
        <h1 className="detail-title">{branchName}</h1>

        <div className="detail-meta">
          <div className="meta-item">
            <div className="meta-icon">
              <MapPin size={20} />
            </div>
            <div className="meta-content">
              <h4>الموقع</h4>
              <p>{branchLocation}</p>
            </div>
          </div>

          <div className="meta-item">
            <div className="meta-icon">
              <Users size={20} />
            </div>
            <div className="meta-content">
              <h4>مدير الفرع</h4>
              <p>{branchManager}</p>
            </div>
          </div>

          <div className="meta-item">
            <div className="meta-icon">
              <Star size={20} />
            </div>
            <div className="meta-content">
              <h4>التقييم</h4>
              <p>{rating}/5.0</p>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{employees}</div>
          <div className="stat-name">عدد الموظفين</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{completionPercentage}%</div>
          <div className="stat-name">نسبة الإنجاز</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{branchType}</div>
          <div className="stat-name">نوع الفرع</div>
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-label">
          <span className="progress-label-text">تقدم الأداء</span>
          <span className="progress-label-value">{completionPercentage}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="action-btn action-btn-share" onClick={handleShare}>
          <Share2 size={18} />
          مشاركة
        </button>

        <button className="action-btn action-btn-share" onClick={handleCopy}>
          <Copy size={18} />
          نسخ البيانات
        </button>

        {isOwner && (
          <>
            <button
              className="action-btn action-btn-edit"
              onClick={() =>
                navigate('/branches', {
                  state: { editBranchId: branch.id }
                })
              }
            >
              <Edit size={18} />
              تعديل الفرع
            </button>

            <button
              className="action-btn action-btn-delete"
              onClick={async () => {
                if (!window.confirm(`تأكيد حذف فرع «${branchName}»؟ لا يمكن التراجع.`)) return;
                await deleteBranch(branch.id);
                navigate('/branches');
              }}
            >
              <Trash2 size={18} />
              حذف الفرع
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BranchDetail;