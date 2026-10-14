// src/pages/Dashboard.jsx — لوحة التحكم الرئيسية (لصاحب الموقع فقط)
import React, { useContext, useState, useMemo, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { AdminContext } from '../context/AdminContext'
import { auth } from '../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { colorAlpha } from '../utils/color'
import {
  BarChart3,
  Users,
  Megaphone,
  Star,
  MapPin,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Activity,
  Crown,
} from 'lucide-react'

/* ── الألوان حسب الدور ── */
const ROLE_LABELS = {
  owner: { label: 'صاحب الموقع', color: 'var(--rz-primary)' },
  admin: { label: 'مشرف', color: 'var(--rz-primary)' },
  employee: { label: 'موظف', color: 'var(--rz-ink)' },
}

/* ── أدوات القيم الآمنة ── */
const safeNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const safePercentage = (value) => {
  const number = safeNumber(value)
  return Math.min(100, Math.max(0, number))
}

const safeText = (value) => (typeof value === 'string' ? value : '')

/* ── بطاقة إحصاء ── */
const StatCard = ({ icon: Icon, label, value, sub, color = 'var(--rz-primary)', onClick }) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={
      onClick
        ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onClick()
            }
          }
        : undefined
    }
    style={{
      background: 'rgba(var(--rz-ink-rgb), 0.88)',
      border: '1px solid rgba(var(--rz-primary-rgb), 0.22)',
      borderRadius: 16,
      padding: '1.1rem 1.2rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.22s ease',
      boxShadow: '0 4px 16px rgba(var(--rz-ink-rgb), 0.25)',
    }}
    onMouseEnter={(e) => {
      if (onClick) e.currentTarget.style.transform = 'translateY(-3px)'
      e.currentTarget.style.borderColor = 'rgba(var(--rz-primary-rgb), 0.5)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'none'
      e.currentTarget.style.borderColor = 'rgba(var(--rz-primary-rgb), 0.22)'
    }}
  >
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        flexShrink: 0,
        background: colorAlpha(color, 0.1),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={24} color={color} />
    </div>
    <div>
      <div
        style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          color: 'var(--rz-ivory)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '0.84rem', color: 'var(--rz-gold)', marginTop: 3 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: '0.74rem', color: 'var(--rz-primary)', marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  </div>
)

/* ── بطاقة فرع ── */
const BranchCard = ({ branch, onClick }) => {
  const completion = safePercentage(branch?.completionPercentage)
  const rating = safeNumber(branch?.rating)
  const employees = safeNumber(branch?.employees)
  const barColor =
    completion >= 90 ? 'var(--rz-ink)' : completion >= 70 ? 'var(--rz-primary)' : 'var(--rz-primary)'

  return (
    <div
      onClick={() => onClick(branch.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(branch.id)
        }
      }}
      style={{
        background: 'rgba(var(--rz-ink-rgb), 0.9)',
        border: '1px solid rgba(var(--rz-primary-rgb), 0.2)',
        borderRadius: 16,
        padding: '1rem 1.1rem',
        cursor: 'pointer',
        transition: 'all 0.22s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.borderColor = 'rgba(var(--rz-primary-rgb), 0.5)'
        e.currentTarget.style.boxShadow = '0 8px 28px rgba(var(--rz-primary-rgb), 0.14)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.borderColor = 'rgba(var(--rz-primary-rgb), 0.2)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -20,
          left: -20,
          width: 80,
          height: 80,
          background:
            'radial-gradient(circle, rgba(var(--rz-primary-rgb), 0.1), transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '0.75rem',
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 700,
              color: 'var(--rz-ivory)',
              fontSize: '0.95rem',
              marginBottom: 3,
            }}
          >
            {safeText(branch?.name) || 'فرع بدون اسم'}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: 'var(--rz-gold)',
              fontSize: '0.78rem',
            }}
          >
            <MapPin size={12} />
            {safeText(branch?.location) || 'الموقع غير محدد'}
          </div>
        </div>
        <span
          style={{
            background:
              branch.status === 'نشط'
                ? 'rgba(var(--rz-ink-rgb), 0.15)'
                : 'rgba(var(--rz-primary-rgb), 0.15)',
            color: branch.status === 'نشط' ? 'var(--rz-ink)' : 'var(--rz-ivory)',
            padding: '0.25rem 0.65rem',
            borderRadius: 999,
            fontSize: '0.73rem',
            fontWeight: 700,
          }}
        >
          {branch.status === 'نشط' ? '● ' : '○ '}
          {safeText(branch?.status) || 'غير محدد'}
        </span>
      </div>
      <div style={{ marginBottom: '0.7rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 5,
          }}
        >
          <span style={{ fontSize: '0.76rem', color: 'var(--rz-muted)' }}>
            نسبة الإنجاز
          </span>
          <span
            style={{ fontSize: '0.76rem', fontWeight: 700, color: barColor }}
          >
            {completion}%
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: 'rgba(var(--rz-white-rgb), 0.07)',
            borderRadius: 999,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${completion}%`,
              background: `linear-gradient(90deg, ${barColor}, ${colorAlpha(barColor, 0.6)})`,
              borderRadius: 999,
              transition: 'width 0.8s ease',
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '0.9rem' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--rz-gold)' }}>
            <Users size={12} style={{ display: 'inline', marginLeft: 3 }} />
            {employees} موظف
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: '0.76rem',
              color: 'var(--rz-primary)',
            }}
          >
            <Star size={12} fill="var(--rz-primary)" />
            {rating > 0 ? rating.toFixed(1) : '—'}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--rz-primary)',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          <span>عرض التفاصيل</span>
          <ArrowLeft size={14} />
        </div>
      </div>
    </div>
  )
}

/* ══════════════ المكوّن الرئيسي ══════════════ */
const Dashboard = () => {
  const navigate = useNavigate()
  const { userRole, isAuthenticated, loading: authLoading } = useAuth()
  const ctx = useContext(AdminContext) || {}
  const {
    branches = [],
    advertisements = [],
    employees = [],
    complaints = [],
  } = ctx
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!auth || typeof onAuthStateChanged !== 'function') return undefined
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [])

  const [activeTab, setActiveTab] = useState('overview')
  const [tabHistory, setTabHistory] = useState(['overview'])
  const [searchTerm, setSearchTerm] = useState('')

  const goToTab = (tabId) => {
    setTabHistory((prev) => {
      if (prev[prev.length - 1] === tabId) return prev
      return [...prev, tabId]
    })
    setActiveTab(tabId)
  }

  // رجوع خطوة واحدة داخل اللوحة — ليس خروجاً من الموقع
  const goBackOneStep = () => {
    setTabHistory((prev) => {
      if (prev.length <= 1) {
        setActiveTab('overview')
        return ['overview']
      }
      const next = prev.slice(0, -1)
      setActiveTab(next[next.length - 1] || 'overview')
      return next.length ? next : ['overview']
    })
  }

  // مغادرة صفحة اللوحة (ليس تسجيل خروج)
  const leaveDashboard = () => {
    const prev = window.history.state?.prevPath
    if (prev && prev !== '/dashboard') {
      navigate(prev)
      return
    }
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  const stats = useMemo(() => {
    const safeBranches = Array.isArray(branches) ? branches : []
    const safeAdvertisements = Array.isArray(advertisements)
      ? advertisements
      : []
    const safeEmployees = Array.isArray(employees) ? employees : []
    const safeComplaints = Array.isArray(complaints) ? complaints : []

    const ratingTotal = safeBranches.reduce(
      (sum, branch) => sum + safeNumber(branch?.rating),
      0
    )

    const completionTotal = safeBranches.reduce(
      (sum, branch) => sum + safePercentage(branch?.completionPercentage),
      0
    )

    return {
      totalBranches: safeBranches.length,
      activeBranches: safeBranches.filter((b) => b?.status === 'نشط').length,
      totalEmployees: safeEmployees.length,
      activeAds: safeAdvertisements.filter((a) => a?.isActive === true).length,
      pendingComplaints: safeComplaints.filter(
        (c) => c?.status !== 'معالجة' && !c?.resolved
      ).length,
      resolvedComplaints: safeComplaints.filter((c) => c?.resolved === true)
        .length,
      avgRating: safeBranches.length
        ? (ratingTotal / safeBranches.length).toFixed(1)
        : '0.0',
      avgCompletion: safeBranches.length
        ? Math.round(completionTotal / safeBranches.length)
        : 0,
    }
  }, [branches, advertisements, employees, complaints])

  const filteredBranches = useMemo(() => {
    const normalizedSearch = safeText(searchTerm).trim().toLowerCase()
    if (!normalizedSearch) return Array.isArray(branches) ? branches : []

    return (Array.isArray(branches) ? branches : []).filter((b) => {
      const name = safeText(b?.name).toLowerCase()
      const location = safeText(b?.location).toLowerCase()
      const manager = safeText(b?.manager).toLowerCase()

      return (
        name.includes(normalizedSearch) ||
        location.includes(normalizedSearch) ||
        manager.includes(normalizedSearch)
      )
    })
  }, [branches, searchTerm])

  if (authLoading) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '2rem',
          color: 'var(--rz-ivory)',
          direction: 'rtl',
        }}
      >
        جاري التحميل...
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '2rem',
          color: 'var(--rz-ivory)',
          direction: 'rtl',
        }}
      >
        الرجاء تسجيل الدخول أولاً
      </div>
    )
  }

  if (userRole !== 'owner') {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '2rem',
          color: 'var(--rz-ivory)',
          direction: 'rtl',
        }}
      >
        غير مصرح لك بالدخول إلى لوحة التحكم
      </div>
    )
  }

  const handleBranchClick = (id) => {
    if (!id) return
    navigate(`/branch/${id}`)
  }

  const roleInfo = ROLE_LABELS[userRole] || ROLE_LABELS.employee

  const pulseText = `نبض النشاط — الفروع: ${stats.totalBranches} | النشطة: ${stats.activeBranches} | الإعلانات النشطة: ${stats.activeAds} | الموظفون: ${stats.totalEmployees} | الشكاوى المعلّقة: ${stats.pendingComplaints}`

  return (
    <div
      style={{
        padding: '0.75rem 1rem 2rem',
        maxWidth: 1200,
        margin: '0 auto',
        direction: 'rtl',
      }}
      dir="rtl"
      lang="ar"
    >
      {/* Header */}
      <div
        style={{
          background: 'rgba(var(--rz-ink-rgb), 0.9)',
          border: '1px solid rgba(var(--rz-primary-rgb), 0.25)',
          borderRadius: 20,
          padding: '1.25rem 1.4rem',
          marginBottom: '0.6rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '1.55rem',
                fontWeight: 800,
              }}
            >
              لوحة التحكم الرئيسية
            </span>
          </div>
          <div
            style={{
              color: 'var(--rz-gold)',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: roleInfo.color, fontWeight: 700 }}>
              {roleInfo.label}
            </span>
            <span style={{ color: 'var(--rz-muted)' }}>•</span>
            <span dir="ltr">{user?.email || ''}</span>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '0.6rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* رجوع داخل اللوحة — ليس تسجيل خروج */}
          <button
            type="button"
            onClick={goBackOneStep}
            title={
              activeTab === 'overview'
                ? 'أنت في نظرة عامة'
                : 'رجوع للتبويب السابق'
            }
            style={{
              background: 'rgba(var(--rz-primary-rgb), 0.12)',
              color: 'var(--rz-ivory)',
              border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
              padding: '0.6rem 1rem',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              cursor: 'pointer',
            }}
          >
            <ArrowRight size={15} />
            رجوع
          </button>
          {/* مغادرة الصفحة فقط */}
          <button
            type="button"
            onClick={leaveDashboard}
            style={{
              background: 'transparent',
              color: 'var(--rz-gold)',
              border: '1px solid rgba(var(--rz-primary-rgb), 0.25)',
              padding: '0.6rem 1rem',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
          {userRole === 'owner' && (
            <button
              type="button"
              onClick={() => navigate('/complaints')}
              style={{
                background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
                color: 'var(--rz-white)',
                border: 'none',
                padding: '0.6rem 1.1rem',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
              }}
            >
              <Crown size={15} />
              غرفة الشكاوى
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/branches')}
            style={{
              background: 'rgba(var(--rz-primary-rgb), 0.12)',
              color: 'var(--rz-ivory)',
              border: '1px solid rgba(var(--rz-primary-rgb), 0.25)',
              padding: '0.6rem 1.1rem',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              cursor: 'pointer',
            }}
          >
            <Activity size={15} />
            إدارة الفروع
          </button>
        </div>
      </div>

      {/* Live Activity Pulse */}
      <div
        style={{
          marginBottom: '1rem',
          background: 'rgba(var(--rz-ink-rgb), 0.95)',
          borderRadius: 14,
          border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
          padding: '0.7rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Activity size={18} color="var(--rz-primary)" />
        <span
          style={{ fontSize: '0.82rem', color: 'var(--rz-ivory)', fontWeight: 600 }}
        >
          {pulseText}
        </span>
      </div>

      {/* بطاقات الإحصائيات */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.2rem',
        }}
      >
        <StatCard
          icon={BarChart3}
          label="إجمالي الفروع"
          value={stats.totalBranches}
          sub={`${stats.activeBranches} فرع نشط`}
          color="var(--rz-primary)"
          onClick={() => navigate('/branches')}
        />
        <StatCard
          icon={Users}
          label="الموظفون"
          value={stats.totalEmployees}
          sub="موظف مسجّل"
          color="var(--rz-primary)"
          onClick={() => navigate('/employees')}
        />
        <StatCard
          icon={Megaphone}
          label="الإعلانات الفعّالة"
          value={stats.activeAds}
          sub="إعلان نشط"
          color="var(--rz-gold)"
          onClick={() => navigate('/advertisements')}
        />
        <StatCard
          icon={Star}
          label="متوسط التقييم"
          value={stats.avgRating}
          sub="من 5 نجوم"
          color="var(--rz-primary)"
        />
        <StatCard
          icon={AlertCircle}
          label="شكاوى معلّقة"
          value={stats.pendingComplaints}
          sub={`${stats.resolvedComplaints} تمت معالجتها`}
          color={stats.pendingComplaints > 0 ? 'var(--rz-primary)' : 'var(--rz-ink)'}
          onClick={() => navigate('/complaints')}
        />
        <StatCard
          icon={TrendingUp}
          label="معدل الإنجاز"
          value={`${stats.avgCompletion}%`}
          sub="متوسط الفروع"
          color="var(--rz-ink)"
        />
      </div>

      {/* أزرار التبويبات */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'rgba(var(--rz-ink-rgb), 0.7)',
          border: '1px solid rgba(var(--rz-primary-rgb), 0.15)',
          borderRadius: 14,
          padding: '0.4rem',
          marginBottom: '1.1rem',
          width: 'fit-content',
          flexWrap: 'wrap',
        }}
      >
        {[
          { id: 'overview', label: 'نظرة عامة', icon: Activity },
          { id: 'branches', label: 'الفروع', icon: BarChart3 },
          { id: 'alerts', label: 'التنبيهات', icon: AlertCircle },
        ].map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => goToTab(tab.id)}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: '0.84rem',
                background: active
                  ? 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))'
                  : 'transparent',
                color: active ? 'var(--rz-ink)' : 'var(--rz-gold)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* محتوى التبويبات */}
      {activeTab === 'overview' && (
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: '1fr 1fr',
          }}
          className="dashboard-overview-grid"
        >
          <style>{`
            @media (max-width: 768px) {
              .dashboard-overview-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
          {/* أحدث الفروع */}
          <div
            style={{
              background: 'rgba(var(--rz-ink-rgb), 0.88)',
              border: '1px solid rgba(var(--rz-primary-rgb), 0.2)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '0.85rem 1.1rem',
                borderBottom: '1px solid rgba(var(--rz-primary-rgb), 0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  color: 'var(--rz-ivory)',
                  fontSize: '0.95rem',
                }}
              >
                أحدث الفروع
              </span>
              <button
                type="button"
                onClick={() => navigate('/branches')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--rz-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                عرض الكل
              </button>
            </div>
            <div style={{ padding: '0.6rem' }}>
              {(Array.isArray(branches) ? branches : [])
                .slice(0, 4)
                .map((branch) => {
                  const completion = safePercentage(
                    branch?.completionPercentage
                  )

                  return (
                    <div
                      key={branch.id}
                      onClick={() => handleBranchClick(branch.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleBranchClick(branch.id)
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.7rem 0.8rem',
                        borderRadius: 10,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        borderBottom: '1px solid rgba(var(--rz-white-rgb), 0.04)',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          'rgba(var(--rz-primary-rgb), 0.06)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = 'transparent')
                      }
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          flexShrink: 0,
                          background:
                            'linear-gradient(135deg, rgba(var(--rz-primary-rgb), 0.2), rgba(var(--rz-primary-rgb), 0.15))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: 'var(--rz-ivory)',
                            fontSize: '0.87rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {safeText(branch?.name) || 'فرع بدون اسم'}
                        </div>
                        <div
                          style={{
                            color: 'var(--rz-gold)',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <MapPin size={10} />
                          {safeText(branch?.location) || 'الموقع غير محدد'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div
                          style={{
                            color: 'var(--rz-primary)',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                          }}
                        >
                          {completion}%
                        </div>
                        <div style={{ color: 'var(--rz-muted)', fontSize: '0.7rem' }}>
                          إنجاز
                        </div>
                      </div>
                    </div>
                  )
                })}
              {(Array.isArray(branches) ? branches : []).length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: 'var(--rz-muted)',
                  }}
                >
                  لا توجد فروع مسجّلة
                </div>
              )}
            </div>
          </div>

          {/* الإعلانات النشطة */}
          <div
            style={{
              background: 'rgba(var(--rz-ink-rgb), 0.88)',
              border: '1px solid rgba(var(--rz-primary-rgb), 0.2)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '0.85rem 1.1rem',
                borderBottom: '1px solid rgba(var(--rz-primary-rgb), 0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  color: 'var(--rz-ivory)',
                  fontSize: '0.95rem',
                }}
              >
                الإعلانات النشطة
              </span>
              <button
                type="button"
                onClick={() => navigate('/advertisements')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--rz-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                إدارة
              </button>
            </div>
            <div style={{ padding: '0.6rem' }}>
              {(Array.isArray(advertisements) ? advertisements : [])
                .filter((a) => a?.isActive === true)
                .slice(0, 4)
                .map((ad) => (
                  <div
                    key={ad.id}
                    style={{
                      padding: '0.7rem 0.8rem',
                      borderRadius: 10,
                      borderBottom: '1px solid rgba(var(--rz-white-rgb), 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        flexShrink: 0,
                        background: 'rgba(var(--rz-primary-rgb), 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: 'var(--rz-ivory)',
                          fontSize: '0.87rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {safeText(ad?.title) || 'إعلان بدون عنوان'}
                      </div>
                      <div
                        style={{
                          color: 'var(--rz-gold)',
                          fontSize: '0.74rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {safeText(ad?.description)}
                      </div>
                    </div>
                    <span
                      style={{
                        background: 'rgba(var(--rz-ink-rgb), 0.15)',
                        color: 'var(--rz-ink)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: 999,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      نشط
                    </span>
                  </div>
                ))}
              {(Array.isArray(advertisements) ? advertisements : []).filter(
                (a) => a?.isActive === true
              ).length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: 'var(--rz-muted)',
                  }}
                >
                  لا توجد إعلانات نشطة
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'branches' && (
        <div>
          <div
            style={{
              marginBottom: '0.85rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              placeholder="ابحث عن فرع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'rgba(var(--rz-ink-rgb), 0.88)',
                border: '1px solid rgba(var(--rz-primary-rgb), 0.22)',
                borderRadius: 12,
                padding: '0.65rem 1rem',
                color: 'var(--rz-ivory)',
                fontSize: '0.88rem',
                flex: 1,
                maxWidth: 340,
                minWidth: 180,
              }}
            />
            <button
              type="button"
              onClick={() => navigate('/branches')}
              style={{
                background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
                color: 'var(--rz-white)',
                border: 'none',
                padding: '0.65rem 1.1rem',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
              }}
            >
              + إضافة فرع
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '0.85rem',
            }}
          >
            {filteredBranches.map((branch) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                onClick={handleBranchClick}
              />
            ))}
            {filteredBranches.length === 0 && (
              <div
                style={{
                  gridColumn: '1/-1',
                  textAlign: 'center',
                  padding: '3rem',
                  color: 'var(--rz-muted)',
                  background: 'rgba(var(--rz-ink-rgb), 0.7)',
                  border: '1px solid rgba(var(--rz-primary-rgb), 0.12)',
                  borderRadius: 16,
                }}
              >
                <BarChart3
                  size={42}
                  color="var(--rz-ink)"
                  style={{ marginBottom: 12 }}
                />
                <p>لا توجد فروع تطابق البحث</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        >
          {(Array.isArray(branches) ? branches : [])
            .filter((b) => safePercentage(b?.completionPercentage) < 80)
            .map((branch) => (
              <div
                key={branch.id}
                onClick={() => handleBranchClick(branch.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleBranchClick(branch.id)
                  }
                }}
                style={{
                  background: 'rgba(var(--rz-primary-rgb), 0.08)',
                  border: '1px solid rgba(var(--rz-primary-rgb), 0.25)',
                  borderRadius: 14,
                  padding: '0.9rem 1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <Clock size={22} color="var(--rz-primary)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      color: 'var(--rz-ivory)',
                      fontSize: '0.9rem',
                    }}
                  >
                    {safeText(branch?.name) || 'فرع بدون اسم'}
                  </div>
                  <div style={{ color: 'var(--rz-muted)', fontSize: '0.78rem' }}>
                    نسبة الإنجاز {safePercentage(branch?.completionPercentage)}%
                    — يحتاج متابعة
                  </div>
                </div>
                <span
                  style={{
                    background: 'rgba(var(--rz-primary-rgb), 0.2)',
                    color: 'var(--rz-primary)',
                    padding: '0.25rem 0.7rem',
                    borderRadius: 999,
                    fontSize: '0.74rem',
                    fontWeight: 700,
                  }}
                >
                  تحتاج متابعة
                </span>
              </div>
            ))}
          {(Array.isArray(complaints) ? complaints : [])
            .filter((c) => !c?.resolved)
            .map((c) => (
              <div
                key={c.id}
                onClick={() => navigate('/complaints')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate('/complaints')
                  }
                }}
                style={{
                  background: 'rgba(var(--rz-primary-rgb), 0.08)',
                  border: '1px solid rgba(var(--rz-primary-rgb), 0.25)',
                  borderRadius: 14,
                  padding: '0.9rem 1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <AlertCircle
                  size={22}
                  color="var(--rz-primary)"
                  style={{ flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      color: 'var(--rz-ivory)',
                      fontSize: '0.9rem',
                    }}
                  >
                    شكوى معلّقة
                  </div>
                  <div style={{ color: 'var(--rz-muted)', fontSize: '0.78rem' }}>
                    {safeText(c?.description) || 'انقر للمراجعة'}
                  </div>
                </div>
                <span
                  style={{
                    background: 'rgba(var(--rz-primary-rgb), 0.2)',
                    color: 'var(--rz-ivory)',
                    padding: '0.25rem 0.7rem',
                    borderRadius: 999,
                    fontSize: '0.74rem',
                    fontWeight: 700,
                  }}
                >
                  معلّقة
                </span>
              </div>
            ))}
          {(Array.isArray(branches) ? branches : []).filter(
            (b) => safePercentage(b?.completionPercentage) < 80
          ).length === 0 &&
            (Array.isArray(complaints) ? complaints : []).filter(
              (c) => !c?.resolved
            ).length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem',
                  color: 'var(--rz-ink)',
                  background: 'rgba(var(--rz-ink-rgb), 0.05)',
                  border: '1px solid rgba(var(--rz-ink-rgb), 0.2)',
                  borderRadius: 16,
                }}
              >
                <CheckCircle
                  size={42}
                  color="var(--rz-ink)"
                  style={{ marginBottom: 12 }}
                />
                <p>لا توجد تنبيهات! كل شيء على ما يرام</p>
              </div>
            )}
        </div>
      )}
    </div>
  )
}

export default Dashboard
