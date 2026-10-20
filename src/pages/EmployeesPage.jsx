import React, { useContext, useState } from 'react';
import { AdminContext } from '../context/AdminContext';
import { Plus, RotateCcw, Shield, X } from 'lucide-react';
import usePermissions from '../permissions/usePermissions';
import { requirePerm } from '../permissions/rbacService';

export const EmployeesPage = () => {
  const { can, isOwner } = usePermissions();
  const ctx = useContext(AdminContext) || {};
  const {
    employees = [],
    bannedEmployees = [],
    banEmployee,
    restoreEmployee,
    addEmployee
  } = ctx;

  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'موظف',
    branch: 1,
  });

  const handleAddEmployee = async (e) => {
    e.preventDefault();

    const name = String(formData.name || '').trim();
    const email = String(formData.email || '').trim();
    const branch = Number(formData.branch);

    if (!name || !email || !Number.isInteger(branch) || branch < 1 || typeof addEmployee !== 'function') {
      return;
    }

    try {
      await requirePerm(can, 'ADD_NEW_EMPLOYEE', 'إضافة موظف', email);
    } catch (err) {
      alert(err?.message || 'لا تملك صلاحية إضافة موظف');
      return;
    }
    await addEmployee({
      ...formData,
      name,
      email,
      branch,
    });

    setFormData({ name: '', email: '', role: 'موظف', branch: 1 });
    setShowForm(false);
  };

  const closeForm = () => setShowForm(false);

  return (
    <div className="employees-container">
      <style>{`
        .employees-container {
          padding: 1rem;
          max-width: 1200px;
          margin: 0 auto;
          min-height: calc(100vh - 70px);
        }

        .employees-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding: 1rem 1.1rem;
          background: rgba(var(--rz-ink-rgb), 0.8);
          border: 1px solid rgba(var(--rz-primary-rgb), 0.2);
          border-radius: 16px;
          gap: 0.75rem;
        }

        .employees-title { font-size: 1.35rem; font-weight: 700; color: var(--rz-ivory) !important; }
        .add-btn { display:flex; align-items:center; gap:0.4rem; background: linear-gradient(135deg, var(--rz-primary), var(--rz-primary)); color:var(--rz-white); border:none; padding:0.65rem 1rem; border-radius:999px; font-weight:700; font-size:0.9rem; cursor:pointer; }

        .tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid var(--rz-border);
          overflow-x: auto;
        }

        .tab-btn {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-weight: 600;
          color: var(--rz-muted);
          transition: all 0.3s ease;
          font-family: inherit;
          font-size: 1rem;
          white-space: nowrap;
        }

        .tab-btn.active {
          color: var(--rz-primary);
          border-bottom-color: var(--rz-primary);
        }

        .table-wrapper {
          background: white;
          border-radius: 12px;
          overflow-x: auto;
          overflow-y: hidden;
          box-shadow: 0 2px 12px rgba(var(--rz-ink-rgb), 0.1);
        }

        table {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
        }

        thead {
          background: var(--rz-ink);
          color: var(--rz-ivory);
        }

        th {
          padding: 1.25rem;
          text-align: right;
          font-weight: 600;
          border-bottom: 2px solid var(--rz-primary);
          color: var(--rz-ivory) !important;
        }

        td {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--rz-border);
        }

        tbody tr:hover {
          background: rgba(var(--rz-primary-rgb), 0.05);
        }

        .employee-name {
          font-weight: 600;
          color: var(--rz-ink);
        }

        .role-badge {
          display: inline-block;
          background: rgba(var(--rz-primary-rgb), 0.1);
          color: var(--rz-primary);
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .status-active {
          background: rgba(var(--rz-ink-rgb), 0.1);
          color: var(--rz-ink);
        }

        .status-banned {
          background: rgba(var(--rz-primary-rgb), 0.1);
          color: var(--rz-primary);
        }

        .action-cell {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .action-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-family: inherit;
          font-size: 0.85rem;
          transition: all 0.3s ease;
        }

        .action-btn-ban {
          background: var(--rz-primary);
          color: white;
        }

        .action-btn-ban:hover {
          background: var(--rz-primary);
        }

        .action-btn-restore {
          background: var(--rz-ink);
          color: white;
        }

        .action-btn-restore:hover {
          background: var(--rz-ink);
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--rz-muted);
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
          padding: 1rem;
        }

        .modal {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
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
        .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid var(--rz-border);
          border-radius: 6px;
          font-size: 1rem;
          font-family: inherit;
          box-sizing: border-box;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
          border-top: 2px solid var(--rz-border);
          padding-top: 1.5rem;
        }

        .modal-btn {
          padding: 0.65rem 1rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
        }

        .modal-btn-cancel {
          background: var(--rz-ivory);
          color: var(--rz-ink);
        }

        .modal-btn-submit {
          background: linear-gradient(135deg, var(--rz-primary), var(--rz-primary));
          color: var(--rz-white);
        }

        @media (max-width: 640px) {
          .employees-container {
            padding: 0.75rem;
          }

          .employees-header {
            align-items: stretch;
            flex-direction: column;
          }

          .add-btn {
            justify-content: center;
          }

          .tabs {
            gap: 0.35rem;
            margin-bottom: 1rem;
          }

          .tab-btn {
            padding: 0.65rem 0.8rem;
            font-size: 0.86rem;
          }

          .modal {
            padding: 1.25rem;
            width: 100%;
          }

          .modal-footer {
            flex-direction: column-reverse;
          }

          .modal-btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="employees-header">
        <h1 className="employees-title">إدارة الموظفين</h1>
        <button type="button" className="add-btn" onClick={() => setShowForm(true)}>
          <Plus size={18} />
          موظف جديد
        </button>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          الموظفون النشطون ({employees.length})
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'banned' ? 'active' : ''}`}
          onClick={() => setActiveTab('banned')}
        >
          الموظفون المطرودون ({bannedEmployees.length})
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد الإلكتروني</th>
              <th>الوظيفة</th>
              <th>الفرع</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>

          <tbody>
            {activeTab === 'active'
              ? employees.length > 0
                ? employees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="employee-name">{employee.name || '—'}</td>
                      <td>{employee.email || '—'}</td>
                      <td><span className="role-badge">{employee.role || 'موظف'}</span></td>
                      <td>#{Number.isFinite(Number(employee.branch)) ? Number(employee.branch) : '—'}</td>
                      <td><span className="status-badge status-active">نشط</span></td>
                      <td>
                        <div className="action-cell">
                          <button
                            type="button"
                            className="action-btn action-btn-ban"
                            onClick={() => typeof banEmployee === 'function' && banEmployee(employee.id)}
                          >
                            <Shield size={16} />
                            طرد
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : (
                  <tr>
                    <td colSpan="6">
                      <div className="empty-state">لا يوجد موظفون نشطون حالياً</div>
                    </td>
                  </tr>
                )
              : bannedEmployees.length > 0
                ? bannedEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="employee-name">{employee.name || '—'}</td>
                      <td>{employee.email || '—'}</td>
                      <td><span className="role-badge">{employee.role || 'موظف'}</span></td>
                      <td>#{Number.isFinite(Number(employee.branch)) ? Number(employee.branch) : '—'}</td>
                      <td><span className="status-badge status-banned">مطرود</span></td>
                      <td>
                        <div className="action-cell">
                          <button
                            type="button"
                            className="action-btn action-btn-restore"
                            onClick={() => typeof restoreEmployee === 'function' && restoreEmployee(employee.id)}
                          >
                            <RotateCcw size={16} />
                            استعادة
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : (
                  <tr>
                    <td colSpan="6">
                      <div className="empty-state">لا يوجد موظفون مطرودون حالياً</div>
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span>إضافة موظف جديد</span>
              <button
                type="button"
                onClick={closeForm}
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
                  color: 'var(--rz-white)',
                }}
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleAddEmployee}>
              <div className="form-group">
                <label>اسم الموظف</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>الوظيفة</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option>موظف</option>
                  <option>مدير فرع</option>
                  <option>مسؤول نظام</option>
                </select>
              </div>

              <div className="form-group">
                <label>رقم الفرع</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.branch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      branch: value === '' ? '' : Number(value),
                    });
                  }}
                  required
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-btn modal-btn-cancel"
                  onClick={() => setShowForm(false)}
                >
                  إلغاء
                </button>

                <button type="submit" className="modal-btn modal-btn-submit">
                  إضافة الموظف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;