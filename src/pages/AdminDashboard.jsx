// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { markManualSignOut } from '../utils/kickLog'
import {
  Package, Users, ShoppingCart, Megaphone, Settings, BarChart3,
  Shield, Bell, Image, Trash2, Edit, Plus, DollarSign,
  ChevronRight, Menu, X, LogOut, User, Store,
  Bell as BellIcon, Lock as LockIcon, Check, AlertTriangle,
  Database, Loader2, ArrowRight
} from 'lucide-react'
import {
  auth, db, COLLECTIONS, getAllOrders, getProducts, isAdminEmail,
  addProduct, updateProduct, deleteProduct, getCategories, addCategory,
  updateOrderStatus, updateUser, updateSettings, collection, getDocs,
  doc, addDoc, onSnapshot, serverTimestamp, deleteDoc
} from '../firebase'
import CloseButton from '../components/CloseButton'
import usePermissions from '../permissions/usePermissions'
import { requirePerm } from '../permissions/requirePerm'

/* ===================== Helpers ===================== */
const btnBase = 'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-300 min-h-[52px] shrink-0 leading-6 group border'
const btnGold = 'bg-[var(--rz-white)] border-[rgba(var(--rz-ink-rgb),0.10)] text-[var(--rz-ink)] shadow-sm hover:bg-[var(--rz-ivory)] hover:border-[var(--rz-primary)]/40 transition-all duration-200 group'
const btnGoldActive = 'bg-gradient-to-l from-[var(--rz-primary)]/15 via-[var(--rz-primary)]/8 to-[var(--rz-ivory)] text-[var(--rz-primary)] font-bold border border-[var(--rz-primary)]/50 shadow-md shadow-[var(--rz-primary)]/10'

const toSafeNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const normalized = value.replace(/,/g, '').replace(/[^\d.-]/g, '')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

const formatNumber = (value) => {
  const number = toSafeNumber(value)
  return number.toLocaleString('ar-SA', {
    maximumFractionDigits: 2
  })
}

const formatPrice = (value) => `${formatNumber(value)} ر.س`

const getTimestampValue = (value) => {
  if (!value) return 0
  if (typeof value.toMillis === 'function') {
    const millis = value.toMillis()
    return Number.isFinite(millis) ? millis : 0
  }
  if (typeof value.seconds === 'number') {
    return Number.isFinite(value.seconds) ? value.seconds : 0
  }
  const dateValue = new Date(value).getTime()
  return Number.isFinite(dateValue) ? dateValue : 0
}

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className={`bg-[var(--rz-white)] rounded-xl p-5 border border-[rgba(var(--rz-ink-rgb),0.08)] shadow-sm ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[var(--rz-muted)] text-sm">{title}</p>
        <p className="text-2xl font-bold mt-1.5 text-[var(--rz-ink)]">{value}</p>
      </div>
      <div className={`p-3 rounded-xl ${color.replace('border', 'bg').replace('-500', '-500/15')}`}>
        <Icon className={color.replace('border', 'text')} size={22} />
      </div>
    </div>
  </div>
)

/* ===================== Main Component ===================== */
const AdminDashboard = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ products: 0, orders: 0, users: 0, revenue: 0 })
  const [recentOrders, setRecentOrders] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [tabHistory, setTabHistory] = useState(['overview'])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [securityAlerts, setSecurityAlerts] = useState([])

  useEffect(() => {
    if (!auth || typeof auth.onAuthStateChanged !== 'function') {
      setLoading(false)
      navigate('/login')
      return
    }

    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser && isAdminEmail(currentUser.email)) {
        setUser(currentUser)
        try {
          await Promise.all([loadStats(), loadSecurityAlerts()])
        } catch (e) {
          console.error('admin initialization:', e)
        }
      } else {
        setUser(null)
        navigate('/login')
      }
      setLoading(false)
    })

    return () => unsub()
  }, [navigate])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
      }
    }

    if (sidebarOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [sidebarOpen])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && sidebarOpen) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [sidebarOpen])

  const loadStats = async () => {
    try {
      const [productsSnap, ordersSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.PRODUCTS)),
        getDocs(collection(db, COLLECTIONS.ORDERS)),
        getDocs(collection(db, COLLECTIONS.USERS))
      ])

      let totalRevenue = 0
      const orders = []

      ordersSnap.forEach((d) => {
        const data = d.data()
        totalRevenue += toSafeNumber(data.total)
        orders.push({ id: d.id, ...data })
      })

      orders.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt))

      setStats({
        products: productsSnap.size,
        orders: ordersSnap.size,
        users: usersSnap.size,
        revenue: totalRevenue
      })
      setRecentOrders(orders.slice(0, 5))
    } catch (e) {
      console.error('loadStats:', e)
      setStats((prev) => ({
        products: toSafeNumber(prev.products),
        orders: toSafeNumber(prev.orders),
        users: toSafeNumber(prev.users),
        revenue: toSafeNumber(prev.revenue)
      }))
    }
  }

  const loadSecurityAlerts = async () => {
    const alerts = []
    try {
      const snap = await getDocs(collection(db, 'security_logs'))
      snap.forEach((d) => {
        const data = d.data()
        if (data.severity === 'high') alerts.push(data)
      })
    } catch (e) {
      console.error('loadSecurityAlerts:', e)
    }
    alerts.push({
      type: 'recommendation',
      message: 'تفعيل التحقق بخطوتين للحسابات الإدارية',
      severity: 'medium'
    })
    setSecurityAlerts(alerts)
  }

  const handleLogout = async () => {
    markManualSignOut()
    try {
      await auth.signOut()
    } catch (e) {
      console.error('handleLogout:', e)
    } finally {
      navigate('/')
    }
  }

  const handleMenuSelect = (tabId) => {
    setTabHistory((prev) => {
      if (prev[prev.length - 1] === tabId) return prev
      return [...prev, tabId]
    })
    setActiveTab(tabId)
    setSidebarOpen(false)
  }

  // رجوع خطوة واحدة داخل اللوحة — ليس تسجيل خروج
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

  // ❌ : رجوع خطوة داخل اللوحة؛ إن كنت في نظرة عامة فقط → اخرج من /admin
  const handlePanelClose = () => {
    if (activeTab !== 'overview' || tabHistory.length > 1) {
      goBackOneStep()
      return
    }
    // الخروج من لوحة الإدارة فقط (ليس تسجيل خروج)
    const prev = window.history.state?.prevPath
    const url = prev && prev !== '/admin' ? prev : '/'
    const nav = window.__ROOZ_NAV__
    if (typeof nav === 'function') {
      nav(url, !prev)
      return
    }
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(url)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--rz-ivory)] flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-[var(--rz-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  const menuItems = [
    { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
    { id: 'products', label: 'المنتجات', icon: Package },
    { id: 'categories', label: 'التصنيفات', icon: Store },
    { id: 'orders', label: 'الطلبات', icon: ShoppingCart },
    { id: 'users', label: 'المستخدمين', icon: Users },
    { id: 'banners', label: 'الإعلانات', icon: Megaphone },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
    { id: 'security', label: 'الأمان', icon: Shield },
    { id: 'settings', label: 'الإعدادات', icon: Settings }
  ]

  return (
    <div className="min-h-screen bg-[var(--rz-ivory)] text-[var(--rz-ink)]" dir="rtl">
      <header className="bg-[var(--rz-white)]/95 backdrop-blur-md p-3.5 sm:p-4 flex items-center justify-between gap-2 relative z-40 sticky top-0 border-b border-[rgba(var(--rz-ink-rgb),0.08)] shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-[var(--rz-ivory)] rounded-lg shrink-0 text-[var(--rz-ink)]"
          aria-label="فتح القائمة"
          type="button"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-base sm:text-lg font-bold truncate flex-1 text-center text-[var(--rz-ink)]">
          لوحة التحكم
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          {/* رجوع = خطوة داخل اللوحة فقط — منفصل عن تسجيل الخروج */}
          <button
            type="button"
            onClick={goBackOneStep}
            className="px-3 py-2 rounded-xl border border-[rgba(var(--rz-ink-rgb),0.12)] bg-[var(--rz-white)] hover:bg-[var(--rz-ivory)] text-xs font-bold flex items-center gap-1.5 text-[var(--rz-ink)]"
            aria-label="رجوع خطوة واحدة"
            title={activeTab === 'overview' ? 'أنت في نظرة عامة' : 'رجوع للقسم السابق'}
          >
            <ArrowRight size={15} />
            رجوع
          </button>
          <CloseButton
            onClose={handlePanelClose}
            corner="topLeft"
            style={{
              position: 'static',
              width: 38,
              height: 38,
              zIndex: 5,
              background: 'var(--rz-white)',
              borderColor: 'rgba(var(--rz-ink-rgb), 0.15)',
              color: 'var(--rz-ink)',
              boxShadow: 'none',
              top: 0,
            }}
          />
        </div>
      </header>

      <aside
        className={`fixed inset-y-0 right-0 w-72 max-w-[88vw] bg-[var(--rz-white)] z-50 flex flex-col overflow-hidden transition-all duration-300 ease-in-out border-l border-[rgba(var(--rz-ink-rgb),0.08)] shadow-xl ${
          sidebarOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : 'translate-x-full opacity-0 pointer-events-none'
        }`}
        aria-hidden={!sidebarOpen}
      >
        <div className="p-5 border-b border-[rgba(var(--rz-ink-rgb),0.08)] shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-[var(--rz-primary)]/15 text-[var(--rz-primary)] rounded-full flex items-center justify-center shrink-0">
                <Store size={20} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[var(--rz-ink)]">أناقة ROOZ</p>
                <p className="text-xs text-[var(--rz-muted)]">لوحة التحكم</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-[var(--rz-ivory)] rounded-lg text-[var(--rz-ink)]"
              aria-label="إغلاق القائمة"
              type="button"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleMenuSelect(item.id)}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                className={`${btnBase} ${isActive ? btnGoldActive : btnGold}`}
              >
                <Icon size={20} className={`shrink-0 ${isActive ? 'text-[var(--rz-primary)]' : 'text-[var(--rz-muted)] group-hover:text-[var(--rz-primary)]'}`} />
                <span className={`flex-1 text-right ${isActive ? 'text-[var(--rz-primary)]' : 'text-[var(--rz-ink)]'}`}>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="shrink-0 p-4 border-t border-[rgba(var(--rz-ink-rgb),0.08)] bg-[var(--rz-ivory)]/60">
          <div className="flex items-center gap-3 mb-3 px-3 min-w-0">
            <div className="w-9 h-9 bg-[var(--rz-primary)]/15 text-[var(--rz-primary)] rounded-full flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-[var(--rz-ink)]">{user?.displayName || 'مدير'}</p>
              <p className="text-xs text-[var(--rz-muted)] truncate" dir="ltr">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            type="button"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-red-500/10 text-red-600 transition-colors text-sm font-medium"
          >
            <LogOut size={18} className="shrink-0" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="p-4 sm:p-6 min-w-0">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">نظرة عامة</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="المنتجات" value={formatNumber(stats.products)} icon={Package} color="border-pink-500 text-pink-500" />
              <StatCard title="الطلبات" value={formatNumber(stats.orders)} icon={ShoppingCart} color="border-[var(--rz-primary)] text-[var(--rz-primary)]" />
              <StatCard title="المستخدمين" value={formatNumber(stats.users)} icon={Users} color="border-green-500 text-green-500" />
              <StatCard title="الإيرادات" value={formatPrice(stats.revenue)} icon={DollarSign} color="border-yellow-500 text-yellow-500" />
            </div>

            {securityAlerts.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="text-yellow-500" size={24} />
                  <h3 className="text-lg font-bold">تنبيهات الأمان</h3>
                </div>
                <div className="space-y-3">
                  {securityAlerts.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 text-yellow-200">
                      <Check size={16} />
                      <span>{a.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[var(--rz-white)] rounded-xl p-6 border border-[rgba(var(--rz-ink-rgb),0.08)]">
              <h3 className="text-lg font-bold mb-4">آخر الطلبات</h3>
              {recentOrders.length > 0 ? (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-[var(--rz-ivory)] rounded-lg">
                      <div>
                        <p className="font-medium">طلب #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-[var(--rz-muted)]">{order.customerName || 'غير محدد'}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-pink-500">{formatPrice(order.total)}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            order.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : order.status === 'completed'
                              ? 'bg-green-500/20 text-green-400'
                              : 'text-[var(--rz-muted)] text-[var(--rz-muted)]'
                          }`}
                        >
                          {order.status === 'pending'
                            ? 'قيد الانتظار'
                            : order.status === 'completed'
                            ? 'مكتمل'
                            : order.status || 'غير محدد'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--rz-muted)] text-center py-8">لا توجد طلبات بعد</p>
              )}
              <button
                onClick={() => handleMenuSelect('orders')}
                type="button"
                className="mt-4 w-full py-3 bg-[var(--rz-ivory)] hover:bg-[var(--rz-ivory)] hover:border-pink-500/50 rounded-lg flex items-center justify-center gap-2 border border-[rgba(var(--rz-ink-rgb),0.10)] transition-all duration-200"
              >
                عرض كل الطلبات <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { tab: 'products', icon: Plus, color: 'text-pink-500', label: 'إضافة منتج' },
                { tab: 'banners', icon: Image, color: 'text-[var(--rz-primary)]', label: 'إضافة إعلان' },
                { tab: 'categories', icon: Store, color: 'text-green-500', label: 'إدارة التصنيفات' },
                { tab: 'security', icon: Shield, color: 'text-yellow-500', label: 'الأمان' }
              ].map((q) => (
                <button
                  key={q.tab}
                  onClick={() => handleMenuSelect(q.tab)}
                  type="button"
                  className="bg-[var(--rz-white)] hover:bg-[var(--rz-ivory)] hover:border-pink-500/50 rounded-xl p-6 border border-[rgba(var(--rz-ink-rgb),0.08)] flex flex-col items-center gap-3 transition-all duration-200"
                >
                  <q.icon className={q.color} size={32} />
                  <span>{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'products' && <ProductsManager onUpdate={loadStats} />}
        {activeTab === 'categories' && <CategoriesManager />}
        {activeTab === 'orders' && <OrdersManager />}
        {activeTab === 'users' && <UsersManager />}
        {activeTab === 'banners' && <BannersManager />}
        {activeTab === 'notifications' && <NotificationsManager />}
        {activeTab === 'security' && <SecurityManager />}
        {activeTab === 'settings' && <SettingsManager />}
      </main>
    </div>
  )
}

/* ===================== Products Manager ===================== */
const ProductsManager = ({ onUpdate }) => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const result = await getProducts({ limit: 100 })
      const list = Array.isArray(result) ? result : (result?.data || [])
      setProducts(list)
    } catch (e) {
      console.error(e)
      setProducts([])
    }
    setLoading(false)
  }

  const { can } = usePermissions()
  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) return
    try {
      await requirePerm(can, 'DELETE_MAIN_CATALOG', 'حذف منتج', id)
      try {
        await deleteProduct(id)
      } catch {
        await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id))
      }
      await load()
      onUpdate?.()
    } catch (err) {
      alert(err?.message || 'حدث خطأ أثناء الحذف')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">إدارة المنتجات</h2>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          type="button"
          className="bg-pink-600 hover:bg-pink-500 px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 border border-pink-400/30 hover:border-pink-400/60 transition-all duration-200 hover:-translate-y-0.5"
        >
          <Plus size={20} /> إضافة منتج
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--rz-muted)]">جاري التحميل...</div>
      ) : (
        <div className="bg-[var(--rz-white)] rounded-xl border border-[rgba(var(--rz-ink-rgb),0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--rz-ivory)]">
                <tr>
                  <th className="px-6 py-4 text-right">المنتج</th>
                  <th className="px-6 py-4 text-right">السعر</th>
                  <th className="px-6 py-4 text-right">التصنيف</th>
                  <th className="px-6 py-4 text-right">الحالة</th>
                  <th className="px-6 py-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-[rgba(var(--rz-ink-rgb),0.08)] hover:bg-[var(--rz-ivory)]/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img loading="lazy" src={p.image} alt={p.name || 'المنتج'} className="w-12 h-12 rounded-lg object-cover" />
                        <div>
                          <p className="font-medium">{p.name || 'منتج بدون اسم'}</p>
                          <p className="text-sm text-[var(--rz-muted)]">{p.description?.slice(0, 50)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-pink-500">{formatPrice(p.price)}</td>
                    <td className="px-6 py-4 text-[var(--rz-muted)]">{p.category || 'غير محدد'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs ${p.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {p.active ? 'مفعل' : 'غير مفعل'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => { setEditing(p); setShowForm(true) }} type="button" className="p-2 hover:bg-[var(--rz-primary)]/20 rounded-lg text-[var(--rz-primary)]">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} type="button" className="p-2 hover:bg-red-500/20 rounded-lg text-red-400">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {products.length === 0 && <p className="text-center py-12 text-[var(--rz-muted)]">لا توجد منتجات</p>}
        </div>
      )}

      {showForm && (
        <ProductForm
          product={editing}
          onClose={() => setShowForm(false)}
          onSave={async () => { setShowForm(false); await load(); onUpdate?.() }}
        />
      )}
    </div>
  )
}

const ProductForm = ({ product, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    category: product?.category || '',
    image: product?.image || '',
    active: product?.active !== false
  })
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const price = toSafeNumber(form.price, NaN)

    if (!Number.isFinite(price) || price < 0) {
      alert('يرجى إدخال سعر صحيح')
      return
    }

    setSaving(true)
    try {
      const data = { ...form, price }
      if (product?.id) {
        await updateProduct(product.id, data)
      } else {
        await addProduct(data)
      }
      onSave()
    } catch {
      alert('حدث خطأ')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--rz-white)] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[rgba(var(--rz-ink-rgb),0.08)] flex items-center justify-between sticky top-0 bg-[var(--rz-white)]">
          <h3 className="text-xl font-bold">{product ? 'تعديل منتج' : 'إضافة منتج'}</h3>
          <button onClick={onClose} type="button" className="p-2 hover:bg-[var(--rz-ivory)] rounded-lg"><X size={24} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <input type="text" placeholder="اسم المنتج" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" required />
          <textarea placeholder="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-[var(--rz-white)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 focus:border-pink-500 focus:outline-none h-24" />
          <input type="number" min="0" step="0.01" placeholder="السعر" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" required />
          <input type="text" placeholder="التصنيف" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" />
          <input type="url" placeholder="رابط الصورة" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" />
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-5 h-5" />
            <span>مفعل</span>
          </label>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-[var(--rz-white)] hover:bg-[var(--rz-ivory)] hover:border-pink-500/50 rounded-lg border border-[rgba(var(--rz-ink-rgb),0.10)] transition-all duration-200">إلغاء</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-pink-600 hover:bg-pink-500 rounded-lg disabled:opacity-50 border border-pink-400/30 hover:border-pink-400/60 transition-all duration-200">{saving ? '...' : 'حفظ'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ===================== Categories Manager ===================== */
const CategoriesManager = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const result = await getCategories()
      const list = Array.isArray(result) ? result : (result?.data || [])
      setCategories(list)
    } catch (e) {
      console.error(e)
      setCategories([])
    }
    setLoading(false)
  }

  const add = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await addCategory({ name: name.trim() })
      setName('')
      await load()
    } catch {
      alert('حدث خطأ')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إدارة التصنيفات</h2>
      <form onSubmit={add} className="flex gap-3">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم التصنيف الجديد" className="flex-1 bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" />
        <button type="submit" className="bg-pink-600 hover:bg-pink-500 px-6 py-3 rounded-lg border border-pink-400/30 hover:border-pink-400/60 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 transition-all duration-200">إضافة</button>
      </form>
      {loading ? (
        <div className="text-center py-12 text-[var(--rz-muted)]">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((c) => (
            <div key={c.id} className="bg-[var(--rz-white)] rounded-xl p-4 border border-[rgba(var(--rz-ink-rgb),0.08)] text-center">
              <p className="font-medium break-words">{c.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ===================== Orders Manager ===================== */
const OrdersManager = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const result = await getAllOrders()
      const list = Array.isArray(result) ? result : (result?.data || result?.orders || [])
      setOrders(list)
    } catch (e) {
      console.error(e)
      setOrders([])
    }
    setLoading(false)
  }

  const changeStatus = async (id, status) => {
    try {
      await updateOrderStatus(id, status)
      await load()
    } catch {
      alert('حدث خطأ')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إدارة الطلبات</h2>
      {loading ? (
        <div className="text-center py-12 text-[var(--rz-muted)]">جاري التحميل...</div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="bg-[var(--rz-white)] rounded-xl p-4 border border-[rgba(var(--rz-ink-rgb),0.08)] flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium">طلب #{o.id?.slice?.(0, 8)}</p>
                <p className="text-sm text-[var(--rz-muted)]">{o.customerName || 'غير محدد'} — {formatPrice(o.total)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => changeStatus(o.id, 'pending')} type="button" className="px-3 py-1 rounded-lg text-xs bg-yellow-500/20 text-yellow-400">قيد الانتظار</button>
                <button onClick={() => changeStatus(o.id, 'completed')} type="button" className="px-3 py-1 rounded-lg text-xs bg-green-500/20 text-green-400">مكتمل</button>
              </div>
            </div>
          ))}
          {orders.length === 0 && <p className="text-center py-12 text-[var(--rz-muted)]">لا توجد طلبات</p>}
        </div>
      )}
    </div>
  )
}

/* ===================== Users Manager ===================== */
const UsersManager = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.USERS))
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setUsers(list)
    } catch (e) {
      console.error(e)
      setUsers([])
    }
    setLoading(false)
  }

  const toggleAdmin = async (userId, currentRole) => {
    try {
      const target = users.find((x) => x.id === userId)
      if (currentRole !== 'admin' && !isAdminEmail(target?.email)) {
        alert('لا يمكن تعيين هذا المستخدم مشرفاً — الإشراف متاح لإيميلات المالك المعتمدة فقط')
        return
      }
      await updateUser(userId, { role: currentRole === 'admin' ? 'user' : 'admin' })
      await load()
    } catch {
      alert('حدث خطأ')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إدارة المستخدمين</h2>
      {loading ? (
        <div className="text-center py-12 text-[var(--rz-muted)]">جاري التحميل...</div>
      ) : (
        <div className="bg-[var(--rz-white)] rounded-xl border border-[rgba(var(--rz-ink-rgb),0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--rz-ivory)]">
                <tr>
                  <th className="px-6 py-4 text-right">المستخدم</th>
                  <th className="px-6 py-4 text-right">البريد</th>
                  <th className="px-6 py-4 text-right">الدور</th>
                  <th className="px-6 py-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-[rgba(var(--rz-ink-rgb),0.08)]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
                          <User size={18} />
                        </div>
                        <span>{u.displayName || 'مستخدم'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[var(--rz-muted)]">{u.email || 'غير متوفر'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs ${u.role === 'admin' ? 'bg-pink-500/20 text-pink-400' : 'text-[var(--rz-muted)] text-[var(--rz-muted)]'}`}>
                        {u.role === 'admin' ? 'مدير' : 'مستخدم'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => toggleAdmin(u.id, u.role)} type="button" className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 border border-yellow-500/30 hover:border-yellow-500/60 transition-all duration-200">
                        {u.role === 'admin' ? 'إزالة الأدمن' : 'تعيين أدمن'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ===================== Banners Manager ===================== */
const BannersManager = () => {
  const [banners, setBanners] = useState([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.BANNERS))
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setBanners(list)
    } catch (e) {
      console.error(e)
      setBanners([])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">إدارة الإعلانات</h2>
        <button onClick={() => setShowForm(true)} type="button" className="bg-pink-600 hover:bg-pink-500 px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 border border-pink-400/30 hover:border-pink-400/60 transition-all duration-200 hover:-translate-y-0.5">
          <Plus size={20} /> إضافة إعلان
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banners.map((b) => (
          <div key={b.id} className="bg-[var(--rz-white)] rounded-xl overflow-hidden border border-[rgba(var(--rz-ink-rgb),0.08)]">
            <img loading="lazy" src={b.image} alt={b.title || 'الإعلان'} className="w-full h-40 object-cover" />
            <div className="p-4">
              <p className="font-bold">{b.title || 'إعلان بدون عنوان'}</p>
              <p className="text-sm text-[var(--rz-muted)]">{b.link || 'لا يوجد رابط'}</p>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <BannerForm onClose={() => setShowForm(false)} onSave={async () => { setShowForm(false); await load() }} />
      )}
    </div>
  )
}

const BannerForm = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ title: '', image: '', link: '', active: true })
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await addDoc(collection(db, COLLECTIONS.BANNERS), { ...form, createdAt: serverTimestamp() })
      onSave()
    } catch {
      alert('حدث خطأ')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--rz-white)] rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-[rgba(var(--rz-ink-rgb),0.08)] flex items-center justify-between">
          <h3 className="text-xl font-bold">إضافة إعلان</h3>
          <button onClick={onClose} type="button" className="p-2 hover:bg-[var(--rz-ivory)] rounded-lg"><X size={24} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <input type="text" placeholder="العنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" required />
          <input type="url" placeholder="رابط الصورة" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" required />
          <input type="url" placeholder="رابط النقر" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" required />
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-[var(--rz-white)] hover:bg-[var(--rz-ivory)] hover:border-pink-500/50 rounded-lg border border-[rgba(var(--rz-ink-rgb),0.10)] transition-all duration-200">إلغاء</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-pink-600 hover:bg-pink-500 rounded-lg disabled:opacity-50 border border-pink-400/30 hover:border-pink-400/60 transition-all duration-200">{saving ? '...' : 'حفظ'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ===================== Notifications Manager ===================== */
const NotificationsManager = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [sendState, setSendState] = useState('idle')
  const [sendFeedback, setSendFeedback] = useState('')
  const [subscribers, setSubscribers] = useState([])

  useEffect(() => { load() }, [])
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'subscribers'),
      (snap) => setSubscribers(snap.docs.map((d) => d.data().email).filter(Boolean)),
      () => setSubscribers([])
    )
    return () => unsub()
  }, [])

  const load = async () => {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.NOTIFICATIONS))
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt))
      setNotifications(list)
    } catch (e) {
      console.error(e)
      setNotifications([])
    }
    setLoading(false)
  }

  const sendSiteNotice = async (e) => {
    e.preventDefault()
    const title = noteTitle.trim()
    const body = noteBody.trim()
    if (!title || !body || sendState === 'sending') return

    setSendState('sending')
    setSendFeedback('')

    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ type: 'site-notice', message: JSON.stringify({ title, body }) })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.success) {
        setSendState('error')
        setSendFeedback(data.error || 'تعذر الإرسال، حاول مرة أخرى.')
        return
      }

      try {
        await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
          title, body, type: 'broadcast', createdAt: serverTimestamp()
        })
      } catch (error) {
        console.error(error)
      }

      await load()
      setSendState('sent')
      setSendFeedback('تم الإرسال — سيصل الإشعار لجميع الزوار خلال ثوانٍ ويظهر في جرس الإشعارات.')
      setNoteTitle('')
      setNoteBody('')
    } catch {
      setSendState('error')
      setSendFeedback('خطأ في الاتصال بالخادم.')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إدارة الإشعارات</h2>

      <form onSubmit={sendSiteNotice} className="bg-[var(--rz-white)] rounded-xl p-6 border border-[rgba(var(--rz-ink-rgb),0.08)] space-y-3">
        <h3 className="font-bold text-yellow-400 flex items-center gap-2">
          <BellIcon size={18} /> إرسال إشعار لجميع الزوار
        </h3>
        <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="عنوان الإشعار" maxLength={80} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" required />
        <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="نص الإشعار" maxLength={300} rows={3} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" required />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={sendState === 'sending' || !noteTitle.trim() || !noteBody.trim()} className="bg-pink-600 hover:bg-pink-500 px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50 border border-pink-400/30 hover:border-pink-400/60 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 transition-all duration-200">
            {sendState === 'sending' ? <Loader2 className="animate-spin" size={20} /> : <BellIcon size={20} />}
            إرسال للجميع الآن
          </button>
          {sendFeedback && (
            <p className={`text-sm font-semibold ${sendState === 'sent' ? 'text-green-400' : 'text-red-400'}`}>{sendFeedback}</p>
          )}
        </div>
      </form>

      <div className="bg-[var(--rz-white)] rounded-xl p-6 border border-[rgba(var(--rz-ink-rgb),0.08)]">
        <h3 className="font-bold text-yellow-400 mb-3">مشتركو العروض بالبريد ({subscribers.length})</h3>
        {subscribers.length === 0 ? (
          <p className="text-[var(--rz-muted)] text-sm">لا يوجد مشتركون بعد.</p>
        ) : (
          <ul className="text-sm space-y-1 max-h-48 overflow-y-auto" dir="ltr">
            {subscribers.map((email) => (
              <li key={email} className="text-[var(--rz-ink)] text-left">{email}</li>
            ))}
          </ul>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--rz-muted)]">جاري التحميل...</div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div key={n.id} className="bg-[var(--rz-white)] rounded-xl p-6 border border-[rgba(var(--rz-ink-rgb),0.08)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center">
                  <BellIcon className="text-pink-500" size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-bold">{n.title || 'إشعار'}</p>
                  <p className="text-[var(--rz-muted)]">{n.body || ''}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ===================== Security Manager ===================== */
const SecurityManager = () => {
  const [settings, setSettings] = useState({
    twoFactorRequired: false,
    loginNotifications: true,
    suspiciousActivityAlert: true,
    maxLoginAttempts: 5,
    sessionTimeout: 30
  })

  const save = async (key, value) => {
    try {
      await updateSettings('security', { [key]: value })
      setSettings((prev) => ({ ...prev, [key]: value }))
    } catch {
      alert('حدث خطأ')
    }
  }

  const Toggle = ({ label, desc, icon: Icon, value, onToggle }) => (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-bold flex items-center gap-2"><Icon size={20} /> {label}</p>
        <p className="text-sm text-[var(--rz-muted)]">{desc}</p>
      </div>
      <button onClick={onToggle} type="button" className={`w-14 h-8 rounded-full transition-colors ${value ? 'bg-pink-500' : 'bg-[rgba(var(--rz-ink-rgb),0.25)]'}`}>
        <div className={`w-6 h-6 bg-white rounded-full transition-transform ${value ? 'translate-x-7' : ''}`} />
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إعدادات الأمان</h2>
      <div className="bg-[var(--rz-white)] rounded-xl p-6 border border-[rgba(var(--rz-ink-rgb),0.08)] space-y-6">
        <Toggle label="التحقق بخطوتين" desc="طلب رمز إضافي عند تسجيل الدخول" icon={LockIcon} value={settings.twoFactorRequired} onToggle={() => save('twoFactorRequired', !settings.twoFactorRequired)} />
        <Toggle label="إشعارات تسجيل الدخول" desc="إشعار عند تسجيل دخول جديد" icon={BellIcon} value={settings.loginNotifications} onToggle={() => save('loginNotifications', !settings.loginNotifications)} />
        <Toggle label="تنبيه النشاط المشبوه" desc="كشف محاولات الاختراق" icon={AlertTriangle} value={settings.suspiciousActivityAlert} onToggle={() => save('suspiciousActivityAlert', !settings.suspiciousActivityAlert)} />
        <div>
          <p className="font-bold mb-2">محاولات تسجيل الدخول المسموحة</p>
          <select value={settings.maxLoginAttempts} onChange={(e) => save('maxLoginAttempts', Number(e.target.value))} className="bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all w-full">
            <option value={3}>3 محاولات</option>
            <option value={5}>5 محاولات</option>
            <option value={10}>10 محاولات</option>
          </select>
        </div>
        <div>
          <p className="font-bold mb-2">مهلة الجلسة (بالدقائق)</p>
          <select value={settings.sessionTimeout} onChange={(e) => save('sessionTimeout', Number(e.target.value))} className="bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all w-full">
            <option value={15}>15 دقيقة</option>
            <option value={30}>30 دقيقة</option>
            <option value={60}>60 دقيقة</option>
          </select>
        </div>
      </div>

      <div className="bg-[var(--rz-white)] rounded-xl p-6 border border-[rgba(var(--rz-ink-rgb),0.08)]">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Database size={20} /> سجل الأمان</h3>
        <p className="text-[var(--rz-muted)] text-sm">لا يوجد نشاط مشبوه حالياً</p>
      </div>
    </div>
  )
}

/* ===================== Settings Manager ===================== */
const SettingsManager = () => {
  const [store, setStore] = useState({
    storeName: 'أناقة ROOZ',
    storeDescription: '',
    phone: '',
    email: '',
    address: ''
  })
  const [bank, setBank] = useState({
    rajhi: { name: '', iban: '', account: '' },
    arabi: { name: '', iban: '', account: '' }
  })

  const saveStore = async () => {
    try {
      await updateSettings('store', store)
      alert('تم حفظ الإعدادات بنجاح')
    } catch {
      alert('حدث خطأ')
    }
  }

  const saveBank = async () => {
    try {
      await updateSettings('bank', bank)
      alert('تم حفظ بيانات البنك بنجاح')
    } catch {
      alert('حدث خطأ')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إعدادات المتجر</h2>

      <div className="bg-[var(--rz-white)] rounded-xl p-6 border border-[rgba(var(--rz-ink-rgb),0.08)]">
        <h3 className="text-lg font-bold mb-4">معلومات المتجر</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--rz-muted)] mb-2">اسم المتجر</label>
            <input type="text" value={store.storeName} onChange={(e) => setStore({ ...store, storeName: e.target.value })} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" />
          </div>
          <div>
            <label className="block text-sm text-[var(--rz-muted)] mb-2">الوصف</label>
            <textarea value={store.storeDescription} onChange={(e) => setStore({ ...store, storeDescription: e.target.value })} className="w-full bg-[var(--rz-white)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 focus:border-pink-500 focus:outline-none h-24" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--rz-muted)] mb-2">الهاتف</label>
              <input type="tel" value={store.phone} onChange={(e) => setStore({ ...store, phone: e.target.value })} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" />
            </div>
            <div>
              <label className="block text-sm text-[var(--rz-muted)] mb-2">البريد</label>
              <input type="email" value={store.email} onChange={(e) => setStore({ ...store, email: e.target.value })} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" />
            </div>
          </div>
          <button onClick={saveStore} type="button" className="w-full py-3 bg-pink-600 hover:bg-pink-500 rounded-lg border border-pink-400/30 hover:border-pink-400/60 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 transition-all duration-200">حفظ إعدادات المتجر</button>
        </div>
      </div>

      <div className="bg-[var(--rz-white)] rounded-xl p-6 border border-[rgba(var(--rz-ink-rgb),0.08)]">
        <h3 className="text-lg font-bold mb-4">بيانات البنك</h3>
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">بنك الراجحي</h4>
            <input type="text" placeholder="رقم IBAN" value={bank.rajhi.iban} onChange={(e) => setBank({ ...bank, rajhi: { ...bank.rajhi, iban: e.target.value } })} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" />
          </div>
          <div>
            <h4 className="font-medium mb-3">البنك العربي</h4>
            <input type="text" placeholder="رقم IBAN" value={bank.arabi.iban} onChange={(e) => setBank({ ...bank, arabi: { ...bank.arabi, iban: e.target.value } })} className="w-full bg-[var(--rz-ivory)] border border-[rgba(var(--rz-ink-rgb),0.10)] rounded-lg px-4 py-3 text-[var(--rz-ink)] placeholder:text-[var(--rz-muted)] focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition-all" />
          </div>
          <button onClick={saveBank} type="button" className="w-full py-3 bg-pink-600 hover:bg-pink-500 rounded-lg border border-pink-400/30 hover:border-pink-400/60 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 transition-all duration-200">حفظ بيانات البنك</button>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard