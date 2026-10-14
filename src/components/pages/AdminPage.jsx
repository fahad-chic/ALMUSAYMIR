// src/components/pages/AdminPage.jsx - بوابة لوحة التحكم
// تحقّق isAdminEmail → تحميل AdminDashboard | عند الفشل: صفحة احتياطية بسيطة
import React, { useEffect, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../firebase/config'
import { collection, getDocs } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { isAdminEmail } from '../../firebase'
import {
  Package,
  ShoppingCart,
  Users,
  Coins,
  ClipboardList,
  Megaphone,
  Flag,
  Settings,
  ShieldX,
  ArrowRight,
} from 'lucide-react'

// إن فشل جلب الـ chunk بعد نشر جديد نعيد تحميل الصفحة مرة واحدة فقط
const chunkReloadKey = 'chunkReloadOnce'

const AdminDashboard = lazy(() =>
  import('../../pages/AdminDashboard').catch((err) => {
    if (!sessionStorage.getItem(chunkReloadKey)) {
      sessionStorage.setItem(chunkReloadKey, '1')
      window.location.reload()
      return new Promise(() => {})
    }
    // بعد إعادة التحميل مرة واحدة: نعرض الصفحة الاحتياطية بدل رمي الخطأ
    return { default: AdminFallback }
  })
)

/** صفحة احتياطية عند تعذّر تحميل AdminDashboard */
function AdminFallback() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    users: 0,
    revenue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchStats = async () => {
      try {
        const [productsSnap, ordersSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'users')),
        ])

        let revenue = 0
        ordersSnap.forEach((docSnap) => {
          revenue += Number(docSnap.data()?.total) || 0
        })

        if (!cancelled) {
          setStats({
            products: productsSnap.size,
            orders: ordersSnap.size,
            users: usersSnap.size,
            revenue,
          })
        }
      } catch (error) {
        console.error('AdminFallback stats error:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStats()
    return () => {
      cancelled = true
    }
  }, [])

  const statCards = [
    {
      title: 'المنتجات',
      value: stats.products,
      colorTailwind: 'text-pink-400',
      icon: Package,
    },
    {
      title: 'الطلبات',
      value: stats.orders,
      colorTailwind: 'text-[var(--rz-primary)]',
      icon: ShoppingCart,
    },
    {
      title: 'المستخدمين',
      value: stats.users,
      colorTailwind: 'text-green-400',
      icon: Users,
    },
    {
      title: 'الإيرادات',
      value: `${stats.revenue.toLocaleString('ar-SA')} ر.س`,
      colorTailwind: 'text-yellow-400',
      icon: Coins,
    },
  ]

  // المسارات كما في المشروع — لا تُغيَّر إلا إذا تأكدت من الراوتر
  const quickLinks = [
    { name: 'إدارة المنتجات', path: '/owner-panel', icon: Package },
    { name: 'إدارة الطلبات', path: '/owner-panel', icon: ClipboardList },
    { name: 'إدارة المستخدمين', path: '/users', icon: Users },
    { name: 'إدارة الإعلانات', path: '/advertisements', icon: Megaphone },
    { name: 'الشكاوى', path: '/complaints', icon: Flag },
    { name: 'الإعدادات', path: '/settings', icon: Settings },
  ]

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      navigate('/')
    }
  }

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-slate-950 text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">لوحة التحكم</h1>
          <button
            type="button"
            onClick={goBack}
            className="px-3.5 py-2 rounded-xl border border-slate-600 bg-slate-800/80 hover:bg-slate-700 text-sm font-bold flex items-center gap-2"
            aria-label="رجوع"
          >
            <ArrowRight size={16} />
            رجوع
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {statCards.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className={`bg-slate-800/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-slate-700/50 ${item.colorTailwind}`}
              >
                {Icon ? <Icon size={28} /> : null}
                <p className="text-xl sm:text-2xl font-bold mt-2">
                  {loading ? '…' : item.value}
                </p>
                <p className="text-slate-400 text-sm font-medium">{item.title}</p>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {quickLinks.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => navigate(item.path)}
                className="bg-slate-800/80 hover:bg-slate-700 rounded-xl p-5 sm:p-6 border border-slate-700/60 hover:border-pink-500/50 transition-all duration-200 text-center"
              >
                {Icon ? <Icon size={32} className="mx-auto" /> : null}
                <p className="mt-2 font-bold">{item.name}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // غير مسجّل أو ليس أدمن
  if (!user || !isAdminEmail(user.email)) {
    return (
      <div
        dir="rtl"
        lang="ar"
        className="min-h-screen bg-slate-950 flex items-center justify-center p-4"
      >
        <div className="bg-slate-800/80 backdrop-blur-md p-8 rounded-2xl text-center border border-red-500/30 max-w-md w-full">
          <ShieldX size={64} className="mx-auto text-red-400" />
          <h1 className="text-2xl font-bold mt-4 text-red-400">غير مصرح بالدخول</h1>
          <p className="text-slate-400 mt-2">هذه الصفحة للأدمن فقط</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-sm"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="animate-spin w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <AdminDashboard />
    </Suspense>
  )
}