// src/pages/OwnerPrivateRoom.jsx - غرفة صاحب الموقع السرية 100%
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { markManualSignOut } from '../utils/kickLog'
import { buildAdRejectUpdate } from '../utils/adActions'
import {
  Eye, Shield, Users, MessageSquare, ShoppingBag, Bell,
  Search, Trash2, Ban, UserCheck, AlertTriangle, Check,
  X, ChevronDown, Lock, Unlock, Key, Activity, Monitor,
  TrendingUp, Crown, Settings, LogOut, RefreshCw,
  Send, Star, Flag, Edit3, Save, UserRound, ClipboardList,
  Radio, LayoutDashboard, BarChart3,
  Gauge, Moon, Sun, ArrowRight
} from 'lucide-react'
import {
  auth, db,
  COLLECTIONS,
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, where, orderBy, onSnapshot, serverTimestamp
} from '../firebase'
import OwnerGatekeeper from '../components/owner/OwnerGatekeeper'
import PermissionsPanel from '../components/owner/PermissionsPanel'
import CommentsReviewPanel from '../components/owner/CommentsReviewPanel'
import OwnerConsoleMenu from '../components/owner/OwnerConsoleMenu'
import CloseButton from '../components/CloseButton'
import usePermissions from '../permissions/usePermissions'
import { requirePerm } from '../permissions/rbacService'

const OWNER_EMAILS = [
  'f882771f@gmail.com',
  'kal6667222@gmail.com'
]

const isOwnerEmail = (email) =>
  OWNER_EMAILS.includes(
    String(email || '').trim().toLowerCase()
  )

const logSecurityEvent = async (type, details, severity = 'info') => {
  try {
    await addDoc(collection(db, 'security_logs'), {
      type,
      details,
      severity,
      timestamp: serverTimestamp(),
      userId: auth.currentUser?.uid,
      userEmail: auth.currentUser?.email
    })
  } catch (e) {
    console.error('Failed to log security event:', e)
  }
}

const safeNumber = (value, fallback = 0) => {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : fallback
}

const formatNumber = (value) => safeNumber(value).toLocaleString('ar-SA')

const formatDate = (value) => {
  if (!value) return ''

  try {
    const date = value?.seconds
      ? new Date(value.seconds * 1000)
      : value?.toDate
        ? value.toDate()
        : new Date(value)

    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleString('ar-SA')
  } catch {
    return ''
  }
}

const OwnerPrivateRoom = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('center')
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 1024px)').matches
  )
  const { can } = usePermissions()

  const [gatePassed, setGatePassed] = useState(() => {
    try {
      return sessionStorage.getItem('rooz_owner_gate_ok') === '1'
    } catch {
      return false
    }
  })

  const [users, setUsers] = useState([])
  const [ads, setAds] = useState([])
  const [messages, setMessages] = useState([])
  const [privateChats, setPrivateChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [notifications, setNotifications] = useState([])
  const [securityLogs, setSecurityLogs] = useState([])
  const [orders, setOrders] = useState([])
  const [reports, setReports] = useState([])

  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

  const [broadcastText, setBroadcastText] = useState('')
  const [broadcastSending, setBroadcastSending] = useState(false)

  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  const [toast, setToast] = useState(null)

  const [editingUserId, setEditingUserId] = useState(null)
  const [editingUserName, setEditingUserName] = useState('')

  const [editingAdId, setEditingAdId] = useState(null)
  const [editingAdTitle, setEditingAdTitle] = useState('')
  const [editingAdDescription, setEditingAdDescription] = useState('')

  // مسار التنقل الذكي — خطوة واحدة فقط للخلف
  const [tabHistory, setTabHistory] = useState(['center'])

  // وضع الليل — يُحفظ في localStorage
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem('rooz_owner_dark') === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('rooz_owner_dark', darkMode ? '1' : '0')
    } catch { /* ignore */ }
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode((v) => !v)

  const showToast = (message, type = 'success') => {
    setToast({
      id: Date.now(),
      message,
      type
    })

    window.setTimeout(() => {
      setToast(null)
    }, 3200)
  }

  // رجوع داخل الغرفة فقط — لا يخرج للصفحة الرئيسية ولا يسجّل خروجاً
  const goToTab = (tabId) => {
    setTabHistory((prev) => {
      if (prev[prev.length - 1] === tabId) return prev
      return [...prev, tabId]
    })
    setActiveTab(tabId)
    setSearchTerm('')
    setFilterType('all')
  }

  const goBackOneStep = () => {
    setTabHistory((prev) => {
      // إن كنا في المركز فقط: ابقَ هنا — ممنوع الخروج من الغرفة بزر الرجوع
      if (prev.length <= 1) {
        setActiveTab('center')
        return ['center']
      }
      const next = prev.slice(0, -1)
      const target = next[next.length - 1] || 'center'
      setActiveTab(target)
      setSearchTerm('')
      setFilterType('all')
      return next.length ? next : ['center']
    })
  }

  // منع زر رجوع المتصفح من إخراج المالك من الغرفة بعد إدخال الرمز
  useEffect(() => {
    if (!gatePassed) return undefined
    const lockState = () => {
      try {
        window.history.pushState({ roozOwnerRoom: true }, '', window.location.href)
      } catch { /* ignore */ }
    }
    lockState()
    const onPop = () => {
      // أعد تثبيت الحالة وارجع خطوة داخل الغرفة فقط
      lockState()
      goBackOneStep()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [gatePassed])


  useEffect(() => {
    if (!showNotifications) return undefined

    const onKey = (e) => {
      if (e.key === 'Escape') setShowNotifications(false)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showNotifications])

  useEffect(() => {
    if (!toast) return undefined

    const timer = window.setTimeout(() => {
      setToast(null)
    }, 3200)

    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!auth || typeof auth.onAuthStateChanged !== 'function') {
      setLoading(false)
      navigate('/login', { replace: true })
      return undefined
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      const ownerAccess =
        currentUser &&
        isOwnerEmail(currentUser.email)

      if (!ownerAccess) {
        setUser(null)

        if (currentUser) {
          try {
            await logSecurityEvent(
              'unauthorized_owner_room_attempt',
              `محاولة دخول غير مصرح بها إلى غرفة المالك: ${currentUser.email || 'بدون بريد'}`,
              'high'
            )
          } catch (error) {
            console.error(error)
          }

          try {
            await auth.signOut()
          } catch (error) {
            console.error(error)
          }
        }

        navigate('/login', { replace: true })
        setLoading(false)
        return
      }

      setUser(currentUser)

      try {
        await loadAllData()
        await logSecurityEvent(
          'owner_login',
          'تسجيل دخول صاحب الموقع',
          'info'
        )
      } catch (error) {
        console.error('Owner room initialization error:', error)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [navigate])

  const loadAllData = async () => {
    try {
      const [
        usersSnap,
        adsSnap,
        messagesSnap,
        chatsSnap,
        notifSnap,
        logsSnap,
        ordersSnap,
        reportsSnap
      ] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.USERS)),
        getDocs(collection(db, 'haraj_ads')),
        getDocs(collection(db, COLLECTIONS.MESSAGES)),
        getDocs(collection(db, 'chats')),
        getDocs(
          query(
            collection(db, 'notifications'),
            orderBy('timestamp', 'desc')
          )
        ),
        getDocs(
          query(
            collection(db, 'security_logs'),
            where('severity', '==', 'high'),
            orderBy('timestamp', 'desc')
          )
        ),
        getDocs(collection(db, COLLECTIONS.ORDERS)),
        getDocs(collection(db, 'reports'))
      ])

      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setAds(adsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setMessages(messagesSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setPrivateChats(chatsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setNotifications(notifSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setSecurityLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('تعذر تحميل بعض بيانات الغرفة', 'error')
    }
  }

  useEffect(() => {
    if (!user || !isOwnerEmail(user.email)) return undefined

    const unsub = onSnapshot(
      query(
        collection(db, 'notifications'),
        orderBy('timestamp', 'desc')
      ),
      (snap) => {
        const newNotifs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((n) => {
            const timestamp =
              n.createdAt?.seconds ||
              n.timestamp?.seconds

            return (
              !n.read &&
              timestamp > Date.now() / 1000 - 3600
            )
          })

        setUnreadCount(newNotifs.length)
        setNotifications(
          snap.docs.map(d => ({ id: d.id, ...d.data() }))
        )
      },
      (error) => {
        console.error('Notifications listener error:', error)
      }
    )

    return () => unsub()
  }, [user])

  const logEvent = async (type, details) => {
    await logSecurityEvent(type, details, 'medium')
    await loadAllData()
  }

  const banUser = async (userId, reason) => {
    if (!userId) return

    if (!window.confirm(`تأكيد حظر المستخدم?\nالسبب: ${reason}`)) return

    try {
      await requirePerm(can, 'BAN_USER_TEMPORARY', 'حظر مستخدم', userId)
      await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
        banned: true,
        bannedAt: serverTimestamp(),
        banReason: reason
      })

      await logEvent(
        'user_banned',
        `تم حظر مستخدم: ${userId}, السبب: ${reason}`
      )

      showToast('تم حفظ التعديل بنجاح')
    } catch (error) {
      console.error(error)
      showToast(error?.message || 'حدث خطأ أثناء الحظر', 'error')
    }
  }

  const unbanUser = async (userId) => {
    if (!userId) return

    try {
      await requirePerm(can, 'UNBAN_USER_RESTORE', 'فك حظر مستخدم', userId)
      await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
        banned: false,
        unbannedAt: serverTimestamp()
      })

      await logEvent(
        'user_unbanned',
        `تم إلغاء حظر مستخدم: ${userId}`
      )

      showToast('تم حفظ التعديل بنجاح')
    } catch (error) {
      console.error(error)
      showToast(error?.message || 'حدث خطأ', 'error')
    }
  }

  const saveUserName = async (userId) => {
    if (!userId) return

    const name = String(editingUserName || '').trim()

    if (!name) {
      showToast('اكتب اسم المستخدم أولاً', 'error')
      return
    }

    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
        displayName: name,
        updatedAt: serverTimestamp(),
        updatedBy: user.email
      })

      await logEvent(
        'user_profile_updated',
        `تم تعديل اسم المستخدم: ${userId}`
      )

      setEditingUserId(null)
      setEditingUserName('')
      showToast('تم حفظ التعديل بنجاح')
    } catch (error) {
      console.error(error)
      showToast(error?.message || 'تعذر حفظ التعديل', 'error')
    }
  }

  const setAsAdmin = async (userId) => {
    if (!userId) return

    try {
      await requirePerm(can, 'GRANT_SUB_ADMIN_PERMISSIONS', 'تعيين مدير', userId)
      const target = users.find((x) => x.id === userId)

      if (!target?.email) {
        showToast(
          'لا يمكن تعيين مدير لحساب لا يحتوي على بريد إلكتروني',
          'error'
        )
        return
      }

      if (
        OWNER_EMAILS.includes(
          String(target.email).trim().toLowerCase()
        )
      ) {
        showToast(
          'حساب المالك لا يحتاج إلى تعيين مدير',
          'error'
        )
        return
      }

      await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
        role: 'admin',
        promotedAt: serverTimestamp(),
        promotedBy: user.email
      })

      await logEvent(
        'user_promoted',
        `تم تعيين مستخدم كمدير: ${userId}`
      )

      showToast('تم حفظ التعديل بنجاح')
    } catch (error) {
      console.error(error)
      showToast(error?.message || 'حدث خطأ', 'error')
    }
  }

  const removeAdmin = async (userId) => {
    if (!userId) return

    try {
      await requirePerm(can, 'GRANT_SUB_ADMIN_PERMISSIONS', 'إزالة مدير', userId)
      await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
        role: 'user',
        demotedAt: serverTimestamp()
      })

      await logEvent(
        'admin_removed',
        `تم إزالة صلاحيات المدير من: ${userId}`
      )

      showToast('تم حفظ التعديل بنجاح')
    } catch (error) {
      console.error(error)
      showToast(error?.message || 'حدث خطأ', 'error')
    }
  }

  const deleteAd = async (adId, reason) => {
    if (!adId) return

    if (!window.confirm(`تأكيد حذف الإعلان?\nالسبب: ${reason}`)) return

    try {
      await requirePerm(can, 'HARAJ_POST_DELETE', 'حذف إعلان', adId)
      const ad = ads.find(a => a.id === adId)

      await deleteDoc(doc(db, 'haraj_ads', adId))

      await logEvent(
        'ad_deleted',
        `تم حذف إعلان: ${adId}, السبب: ${reason}, المعلن: ${ad?.userId || ''}`
      )

      showToast('تم حفظ التعديل بنجاح')
    } catch (error) {
      console.error(error)
      showToast(error?.message || 'حدث خطأ', 'error')
    }
  }

  const approveAd = async (adId) => {
    if (!adId) return

    try {
      await requirePerm(can, 'HARAJ_POST_APPROVE', 'الموافقة على إعلان', adId)
      await updateDoc(
        doc(db, 'haraj_ads', adId),
        { status: 'active' }
      )

      await logEvent(
        'ad_approved',
        `تم تفعيل إعلان: ${adId}`
      )

      showToast('تم حفظ التعديل بنجاح')
    } catch (error) {
      console.error(error)
      showToast(error?.message || 'حدث خطأ', 'error')
    }
  }

  const rejectAd = async (adId, reason) => {
    if (!adId) return

    if (!window.confirm(`تأكيد رفض الإعلان?\nالسبب: ${reason}`)) return

    try {
      await requirePerm(can, 'HARAJ_POST_APPROVE', 'رفض إعلان', adId)
      await updateDoc(doc(db, 'haraj_ads', adId), {
        ...buildAdRejectUpdate(reason),
        rejectedAt: serverTimestamp()
      })

      await logEvent(
        'ad_rejected',
        `تم رفض إعلان: ${adId}, السبب: ${reason}`
      )

      showToast('تم حفظ التعديل بنجاح')
    } catch (error) {
      console.error(error)
      showToast(error?.message || 'حدث خطأ', 'error')
    }
  }

  const saveAdEdit = async (adId) => {
    if (!adId) return

    const title = String(editingAdTitle || '').trim()
    const description = String(
      editingAdDescription || ''
    ).trim()

    if (!title) {
      showToast('عنوان الإعلان مطلوب', 'error')
      return
    }

    try {
      await requirePerm(can, 'HARAJ_POST_FORCE_EDIT', 'تعديل إعلان', adId)
      await updateDoc(doc(db, 'haraj_ads', adId), {
        title,
        description,
        updatedAt: serverTimestamp(),
        updatedBy: user.email
      })

      await logEvent(
        'ad_updated',
        `تم تعديل الإعلان: ${adId}`
      )

      setEditingAdId(null)
      setEditingAdTitle('')
      setEditingAdDescription('')
      showToast('تم حفظ التعديل بنجاح')
    } catch (error) {
      console.error(error)
      showToast(error?.message || 'تعذر حفظ التعديل', 'error')
    }
  }

  const sendBroadcast = async () => {
    const title = prompt('عنوان الإشعار:')
    if (!title?.trim()) return

    const body = prompt('محتوى الإشعار:')
    if (!body?.trim()) return

    try {
      const current = auth.currentUser
      if (!current) {
        throw new Error('يجب تسجيل الدخول أولاً')
      }
      const token = await current.getIdToken(true)

      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: `${title.trim()} — ${body.trim()}`,
          type: 'owner'
        })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || 'تعذر إرسال البث'
        )
      }

      await logEvent(
        'broadcast_sent',
        `تم إرسال إشعار عام: ${title.trim()}`
      )

      showToast('تم حفظ التعديل بنجاح')
    } catch (error) {
      console.error(error)
      showToast(error?.message || 'حدث خطأ', 'error')
    }
  }

  const sendDirectBroadcast = async () => {
    const msg = String(broadcastText || '').trim()

    if (!msg || broadcastSending) return

    setBroadcastSending(true)

    try {
      const current = auth.currentUser
      if (!current) {
        throw new Error('يجب تسجيل الدخول أولاً')
      }
      const token = await current.getIdToken(true)

      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: msg,
          type: 'general'
        })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || 'تعذر إرسال البث'
        )
      }

      await logEvent(
        'broadcast_sent',
        `بث مباشر من الغرفة: ${msg.slice(0, 60)}`
      )

      setBroadcastText('')

      showToast('تم حفظ التعديل بنجاح')
    } catch (error) {
      console.error(error)
      showToast(
        error?.message || 'حدث خطأ أثناء الإرسال',
        'error'
      )
    } finally {
      setBroadcastSending(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logEvent(
        'owner_logout',
        'تسجيل خروج صاحب الموقع'
      )
    } catch (error) {
      console.error(error)
    } finally {
      markManualSignOut()
      await auth.signOut()
      navigate('/login', { replace: true })
    }
  }

  // تنقية المستخدمين في لوحة الإدارة: إخفاء إيميلات غير المالكين من العرض العام إن لزم، لكن الإبقاء على وظائف الإدارة
  const filteredUsers = useMemo(() => {
    let result = Array.isArray(users) ? users : []

    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase()

      result = result.filter((u) =>
        String(u?.email || '').toLowerCase().includes(term) ||
        String(u?.displayName || '').toLowerCase().includes(term) ||
        String(u?.uid || '').toLowerCase().includes(term)
      )
    }

    if (filterType === 'banned') {
      result = result.filter(u => u?.banned)
    } else if (filterType === 'admins') {
      result = result.filter(u => u?.role === 'admin')
    } else if (filterType === 'active') {
      result = result.filter(u => !u?.banned)
    }

    return result
  }, [users, searchTerm, filterType])

  const filteredAds = useMemo(() => {
    let result = Array.isArray(ads) ? ads : []

    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase()

      result = result.filter((a) =>
        String(a?.title || '').toLowerCase().includes(term) ||
        String(a?.description || '').toLowerCase().includes(term) ||
        String(a?.userId || '').toLowerCase().includes(term)
      )
    }

    if (filterType === 'pending') {
      result = result.filter(a => a?.status === 'pending')
    } else if (filterType === 'active') {
      result = result.filter(a => a?.status === 'active')
    } else if (filterType === 'rejected') {
      result = result.filter(a => a?.status === 'rejected')
    }

    return result
  }, [ads, searchTerm, filterType])

  const filteredMessages = useMemo(() => {
    let result = Array.isArray(messages) ? messages : []

    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase()

      result = result.filter((m) =>
        String(m?.content || '').toLowerCase().includes(term) ||
        String(m?.senderId || '').toLowerCase().includes(term) ||
        String(m?.receiverId || '').toLowerCase().includes(term)
      )
    }

    return result
  }, [messages, searchTerm])

  const stats = useMemo(() => {
    const safeUsers = Array.isArray(users) ? users : []
    const safeAds = Array.isArray(ads) ? ads : []
    const safeMessages = Array.isArray(messages) ? messages : []
    const safeOrders = Array.isArray(orders) ? orders : []
    const safeReports = Array.isArray(reports) ? reports : []
    const safeLogs = Array.isArray(securityLogs)
      ? securityLogs
      : []

    return {
      totalUsers: safeUsers.length,
      bannedUsers: safeUsers.filter(u => u?.banned).length,
      adminUsers: safeUsers.filter(
        u => u?.role === 'admin'
      ).length,
      activeUsers: safeUsers.filter(
        u => !u?.banned
      ).length,
      totalAds: safeAds.length,
      pendingAds: safeAds.filter(
        a => a?.status === 'pending'
      ).length,
      activeAds: safeAds.filter(
        a => a?.status === 'active'
      ).length,
      totalMessages: safeMessages.length,
      totalOrders: safeOrders.length,
      pendingReports: safeReports.filter(
        r => r?.status === 'pending'
      ).length,
      securityAlerts: safeLogs.length
    }
  }, [
    users,
    ads,
    messages,
    orders,
    reports,
    securityLogs
  ])

  // فرض اتجاه RTL للغرفة (عربي) — قبل أي return مبكر حتى لا يُستدعى الـ Hook شرطياً
  useEffect(() => {
    const root = document.documentElement
    const prevDir = root.getAttribute('dir')
    const prevLang = root.getAttribute('lang')
    root.setAttribute('dir', 'rtl')
    root.setAttribute('lang', 'ar')
    return () => {
      if (prevDir != null) root.setAttribute('dir', prevDir)
      else root.removeAttribute('dir')
      if (prevLang != null) root.setAttribute('lang', prevLang)
      else root.removeAttribute('lang')
    }
  }, [])

  if (loading) {
    return (
      <div dir="rtl" lang="ar" className="min-h-screen bg-[var(--rz-ivory)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-14 h-14 border-4 border-[var(--rz-primary)]/30 border-t-[var(--rz-primary)] rounded-full mx-auto mb-4" />
          <p className="text-[var(--rz-ink)] font-bold">
            جاري تحميل غرفة صاحب موقع المسيمير | ALMUSAYMIR...
          </p>
        </div>
      </div>
    )
  }

  const safeStepBack = (fallback = '/') => {
    const prev = window.history.state?.prevPath

    const url =
      prev &&
      prev !== '/owner-private-room' &&
      prev !== '/owner-room'
        ? prev
        : fallback

    const nav = window.__ROOZ_NAV__

    if (typeof nav === 'function') {
      nav(url, prev ? false : true)
    } else {
      navigate(url, { replace: !prev })
    }
  }

  if (!gatePassed) {
    return (
      <OwnerGatekeeper
        onPassed={() => {
          try { sessionStorage.setItem('rooz_owner_gate_ok', '1') } catch { /* ignore */ }
          setGatePassed(true)
        }}
        onCancel={() => safeStepBack('/')}
      />
    )
  }

  // زر ❌ = رجوع خطوة واحدة فقط (نفس goBackOneStep) — ليس خروجاً من الغرفة
  const handlePanelClose = () => {
    goBackOneStep()
  }

  // تبويبات منفصلة — لا صفحة طويلة
  const tabs = [
    {
      id: 'center',
      label: 'المركز الرئيسي',
      icon: LayoutDashboard,
      category: 'monitor',
      categoryLabel: 'المراقبة'
    },
    {
      id: 'overview',
      label: 'نظرة عامة',
      icon: BarChart3,
      category: 'monitor',
      categoryLabel: 'المراقبة'
    },
    {
      id: 'live',
      label: 'النشاط اللحظي',
      icon: Gauge,
      category: 'monitor',
      categoryLabel: 'المراقبة'
    },
    {
      id: 'messages',
      label: 'الرسائل الخاصة',
      icon: MessageSquare,
      category: 'monitor',
      categoryLabel: 'المراقبة',
      viewOnly: true
    },
    {
      id: 'permissions',
      label: 'الصلاحيات',
      icon: Key,
      category: 'protect',
      categoryLabel: 'الحماية والإدارة'
    },
    {
      id: 'users',
      label: 'المستخدمون',
      icon: Users,
      category: 'admin',
      categoryLabel: 'الإدارة'
    },
    {
      id: 'ads',
      label: 'الإعلانات',
      icon: ShoppingBag,
      category: 'admin',
      categoryLabel: 'الإدارة'
    },
    {
      id: 'comments',
      label: 'آراء العملاء',
      icon: Star,
      category: 'review',
      categoryLabel: 'المراجعة'
    },
    {
      id: 'reports',
      label: 'البلاغات',
      icon: Flag,
      category: 'review',
      categoryLabel: 'المراجعة'
    },
    {
      id: 'broadcast',
      label: 'البث والتنبيهات',
      icon: Bell,
      category: 'comms',
      categoryLabel: 'التواصل'
    },
    {
      id: 'orders',
      label: 'الطلبات',
      icon: Activity,
      category: 'viewOnly',
      categoryLabel: 'المشاهدة فقط',
      viewOnly: true
    },
    {
      id: 'security',
      label: 'سجل الأمان',
      icon: Shield,
      category: 'viewOnly',
      categoryLabel: 'المشاهدة فقط',
      viewOnly: true
    }
  ]

  const tabGroups = [
    {
      title: 'المراقبة',
      icon: Eye,
      items: tabs.filter((tab) => tab.category === 'monitor')
    },
    {
      title: 'الإدارة والحماية',
      icon: Settings,
      items: tabs.filter(
        (tab) => tab.category === 'admin' || tab.category === 'protect'
      )
    },
    {
      title: 'المراجعة',
      icon: ClipboardList,
      items: tabs.filter((tab) => tab.category === 'review')
    },
    {
      title: 'التواصل',
      icon: Bell,
      items: tabs.filter((tab) => tab.category === 'comms')
    },
    {
      title: 'المشاهدة فقط',
      icon: Eye,
      items: tabs.filter((tab) => tab.category === 'viewOnly')
    }
  ]

  return (
    <div
      dir="rtl"
      lang="ar"
      className={`min-h-screen owner-console-room ${darkMode ? 'owner-dark' : ''}`}
      style={darkMode ? { background: 'var(--rz-ink)', color: 'var(--rz-ivory)' } : { background: 'var(--rz-ivory)', color: 'var(--rz-ink)' }}
    >
      <style>{`
        .owner-console-room {
          direction: rtl;
          text-align: start;
          background:
            radial-gradient(circle at top right, rgba(var(--rz-primary-rgb), .16), transparent 32%),
            radial-gradient(circle at bottom left, rgba(var(--rz-primary-rgb), .10), transparent 30%),
            linear-gradient(160deg, var(--rz-ivory) 0%, var(--rz-ivory) 55%, var(--rz-ivory) 100%);
          color: var(--rz-ink);
        }

        .owner-console-room [dir="ltr"] {
          direction: ltr;
          text-align: left;
          unicode-bidi: embed;
        }

        .owner-console-room .royal-surface {
          background:
            linear-gradient(165deg, rgba(var(--rz-ivory-rgb), .96), rgba(var(--rz-cream-4-rgb), .96));
          border-color: rgba(var(--rz-primary-rgb), .28);
          box-shadow: 0 10px 28px rgba(var(--rz-ink-rgb), .08);
        }

        .owner-console-room .royal-muted {
          color: var(--rz-ink);
        }

        .owner-console-room .royal-text {
          color: var(--rz-ink);
        }

        .owner-console-room .royal-border {
          border-color: rgba(var(--rz-primary-rgb), .28);
        }

        .owner-console-room .icon-card {
          min-height: 96px;
          min-width: 0;
          max-width: 100%;
          overflow: visible;
          background:
            linear-gradient(145deg, rgba(var(--rz-ivory-rgb), .98), rgba(var(--rz-cream-4-rgb), .92));
          border: 1px solid rgba(var(--rz-primary-rgb), .26);
          transition:
            transform .2s ease,
            border-color .2s ease,
            background .2s ease,
            box-shadow .2s ease;
        }

        .owner-console-room .icon-card:hover {
          transform: translateY(-2px);
          border-color: rgba(var(--rz-primary-rgb), .72);
          background:
            linear-gradient(145deg, rgba(var(--rz-ivory-rgb), .99), rgba(var(--rz-cream-4-rgb), .96));
          box-shadow: 0 12px 30px rgba(var(--rz-ink-rgb), .12);
        }

        .owner-console-room .icon-card.active {
          border-color: rgba(var(--rz-primary-rgb), .9);
          box-shadow:
            0 0 0 1px rgba(var(--rz-primary-rgb), .14),
            0 12px 32px rgba(var(--rz-ink-rgb), .12);
        }

        .owner-console-room button {
          -webkit-tap-highlight-color: transparent;
        }

        .owner-console-room input,
        .owner-console-room textarea,
        .owner-console-room select {
          color-scheme: light;
          color: var(--rz-ink);
          font-weight: 600;
        }

        .owner-console-room ::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }

        .owner-console-room ::-webkit-scrollbar-track {
          background: rgba(var(--rz-primary-rgb), .08);
        }

        .owner-console-room ::-webkit-scrollbar-thumb {
          background: rgba(var(--rz-primary-rgb), .45);
          border-radius: 999px;
        }

        .owner-console-room .gold-button {
          background: linear-gradient(135deg, var(--rz-white), var(--rz-cream-3));
          color: var(--rz-slate);
          font-weight: 800;
          border: 1px solid var(--rz-gold);
        }

        .owner-console-room .gold-button:hover {
          background: linear-gradient(135deg, var(--rz-cream-5), var(--rz-cream-3));
          color: var(--rz-slate);
        }

        .owner-console-room .light-field {
          background: rgba(var(--rz-ivory-rgb), .92);
          color: var(--rz-ink);
          border-color: rgba(var(--rz-primary-rgb), .25);
          font-weight: 600;
        }

        .owner-console-room .light-field::placeholder {
          color: var(--rz-primary);
        }

                .owner-console-room .icon-card,
        .owner-console-room .icon-card span,
        .owner-console-room .icon-card p,
        .owner-console-room .royal-surface,
        .owner-console-room .royal-surface p,
        .owner-console-room .royal-surface h2,
        .owner-console-room .royal-surface h3,
        .owner-console-room .royal-surface h4 {
          color: var(--rz-slate);
          font-weight: 800;
        }

        .owner-console-room .view-only-badge {
          background: rgba(var(--rz-primary-rgb), .10);
          color: var(--rz-ink);
          border-color: rgba(var(--rz-primary-rgb), .25);
          font-weight: 700;
        }

        /* ===== وضع الليل ===== */
        .owner-console-room.owner-dark {
          background:
            radial-gradient(circle at top right, rgba(var(--rz-primary-rgb), .12), transparent 36%),
            radial-gradient(circle at bottom left, rgba(var(--rz-primary-rgb), .08), transparent 32%),
            linear-gradient(160deg, var(--rz-ink) 0%, var(--rz-ink) 50%, var(--rz-ink) 100%) !important;
          color: var(--rz-ivory) !important;
        }

        /* حتى في الوضع الليلي: بطاقات الخيارات والصلاحيات تبقى فاتحة ونص أسود عريض */
        .owner-console-room.owner-dark .royal-surface {
          background:
            linear-gradient(165deg, var(--rz-white), var(--rz-cream-2)) !important;
          border-color: rgba(var(--rz-gold-rgb), .40) !important;
          box-shadow: 0 10px 28px rgba(var(--rz-ink-rgb), .12) !important;
          color: var(--rz-slate) !important;
        }

        .owner-console-room.owner-dark .royal-muted {
          color: var(--rz-slate-700) !important;
          font-weight: 700 !important;
        }

        .owner-console-room.owner-dark .royal-text {
          color: var(--rz-slate) !important;
          font-weight: 800 !important;
        }

        .owner-console-room.owner-dark .royal-border {
          border-color: rgba(var(--rz-gold-rgb), .35) !important;
        }

        .owner-console-room.owner-dark .icon-card {
          background:
            linear-gradient(145deg, var(--rz-white), var(--rz-cream-2)) !important;
          border: 1px solid rgba(var(--rz-gold-rgb), .40) !important;
          color: var(--rz-slate) !important;
        }

        .owner-console-room.owner-dark .icon-card:hover {
          border-color: var(--rz-gold) !important;
          background:
            linear-gradient(145deg, var(--rz-white), var(--rz-cream-5)) !important;
          box-shadow: 0 12px 30px rgba(var(--rz-gold-rgb), .22) !important;
          color: var(--rz-slate) !important;
        }

        .owner-console-room.owner-dark .icon-card.active {
          border-color: var(--rz-gold) !important;
          background:
            linear-gradient(145deg, var(--rz-white), var(--rz-cream-3)) !important;
          box-shadow:
            0 0 0 1px rgba(var(--rz-gold-rgb), .35),
            0 12px 32px rgba(var(--rz-gold-rgb), .18) !important;
          color: var(--rz-slate) !important;
        }

        .owner-console-room.owner-dark input,
        .owner-console-room.owner-dark textarea,
        .owner-console-room.owner-dark select {
          color-scheme: dark;
          color: var(--rz-ivory) !important;
        }

        .owner-console-room.owner-dark ::-webkit-scrollbar-track {
          background: rgba(var(--rz-ink-rgb), .25);
        }

        .owner-console-room.owner-dark ::-webkit-scrollbar-thumb {
          background: rgba(var(--rz-primary-rgb), .45);
        }

        .owner-console-room.owner-dark .gold-button {
          background: linear-gradient(135deg, var(--rz-primary), var(--rz-primary));
          color: var(--rz-ink);
        }

        .owner-console-room.owner-dark .light-field {
          background: rgba(var(--rz-ink-rgb), .92) !important;
          color: var(--rz-ivory) !important;
          border-color: rgba(var(--rz-primary-rgb), .35) !important;
        }

        .owner-console-room.owner-dark .light-field::placeholder {
          color: var(--rz-primary) !important;
        }

        .owner-console-room.owner-dark .view-only-badge {
          background: rgba(var(--rz-primary-rgb), .15) !important;
          color: var(--rz-ivory) !important;
          border-color: rgba(var(--rz-primary-rgb), .3) !important;
        }
      `}</style>

      {toast && (
        <div
          className="fixed top-4 left-3 right-3 sm:left-auto sm:right-5 sm:w-[380px] z-[100] rounded-2xl border px-4 py-3 shadow-2xl"
          style={{
            background:
              toast.type === 'error'
                ? 'var(--rz-ivory)'
                : 'var(--rz-ivory)',
            borderColor:
              toast.type === 'error'
                ? 'rgba(var(--rz-primary-rgb), .30)'
                : 'rgba(var(--rz-primary-rgb), .35)'
          }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  toast.type === 'error'
                    ? 'rgba(var(--rz-primary-rgb), .10)'
                    : 'rgba(var(--rz-primary-rgb), .10)',
                color:
                  toast.type === 'error'
                    ? 'var(--rz-primary)'
                    : 'var(--rz-primary)'
              }}
            >
              {toast.type === 'error'
                ? <AlertTriangle size={18} />
                : <Check size={18} />}
            </div>

            <p className="font-bold text-sm text-[var(--rz-ink)]">
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="mr-auto p-1.5 rounded-lg hover:bg-[var(--rz-primary)]/10 text-[var(--rz-ink)]"
              aria-label="إغلاق"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <header className="royal-surface backdrop-blur-md border-b royal-border px-3 py-3 md:px-6 md:py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <OwnerConsoleMenu
              tabs={tabs}
              activeId={activeTab}
              onSelect={(tab) => {
                goToTab(tab.id)
                setSidebarOpen(false)
              }}
              triggerLabel="امتيازات المالك"
            />

            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-bold flex items-center gap-2 royal-text">
                <Crown
                  className="text-[var(--rz-primary)] flex-shrink-0"
                  size={24}
                />
                غرفة صاحب موقع المسيمير | ALMUSAYMIR
              </h1>

              <p className="text-xs md:text-sm royal-muted font-medium">
                مركز التحكم والمراقبة والحماية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <button
              type="button"
              onClick={sendBroadcast}
              className="hidden sm:flex gold-button px-4 py-2 rounded-lg items-center gap-2 font-bold hover:scale-[1.02] transition-transform"
              title="إرسال إشعار عام"
            >
              <Send size={18} />
              <span>إشعار عام</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 hover:bg-[var(--rz-primary)]/10 rounded-lg relative royal-text border border-transparent hover:border-[var(--rz-primary)]/20 transition-colors"
              title="الإشعارات"
              aria-label="الإشعارات"
              aria-expanded={showNotifications}
            >
              <Bell size={20} />

              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-[var(--rz-primary)] rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                loadAllData().then(() =>
                  showToast('تم حفظ التعديل بنجاح')
                )
              }
              className="p-2.5 hover:bg-[var(--rz-primary)]/10 rounded-lg royal-text border border-transparent hover:border-[var(--rz-primary)]/20 transition-colors"
              title="تحديث البيانات"
              aria-label="تحديث البيانات"
            >
              <RefreshCw size={20} />
            </button>

            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-2.5 hover:bg-[var(--rz-primary)]/10 rounded-lg royal-text border border-transparent hover:border-[var(--rz-primary)]/20 transition-colors"
              title={darkMode ? 'الوضع النهاري' : 'وضع الليل'}
              aria-label={darkMode ? 'الوضع النهاري' : 'وضع الليل'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <CloseButton
              onClose={handlePanelClose}
              corner="topLeft"
              className="owner-room-close"
              style={{
                position: 'static',
                width: 38,
                height: 38,
                background: darkMode ? 'rgba(var(--rz-ink-rgb), 0.85)' : 'rgba(var(--rz-ivory-rgb), 0.65)',
                border: '1px solid rgba(var(--rz-primary-rgb), 0.3)',
                color: darkMode ? 'var(--rz-ivory)' : 'var(--rz-ink)',
                boxShadow: 'none',
                top: 0
              }}
            />

            <button
              type="button"
              onClick={handleLogout}
              className="p-2.5 hover:bg-[var(--rz-primary)]/10 rounded-lg text-[var(--rz-primary)] border border-transparent hover:border-[var(--rz-primary)]/20 transition-colors"
              title="تسجيل الخروج"
              aria-label="تسجيل الخروج"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row">
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-[var(--rz-ink)]/25 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />

            <aside className="fixed inset-y-0 right-0 w-80 max-w-[90vw] bg-[var(--rz-ivory)]/98 backdrop-blur-xl md:static md:w-72 md:max-w-none md:border-l royal-border p-3 md:p-4 md:min-h-screen z-50 overflow-y-auto shadow-2xl md:shadow-none">
              <div className="flex items-center justify-between mb-4 md:hidden">
                <div>
                  <span className="font-bold royal-text block">
                    امتيازات المالك
                  </span>
                  <span className="text-xs royal-muted font-medium">
                    الأقسام والصلاحيات
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-[var(--rz-primary)]/10 rounded-lg royal-text"
                  aria-label="إغلاق القائمة"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                {tabGroups.map(group => {
                  const GroupIcon = group.icon

                  return (
                    <section key={group.title}>
                      <div className="flex items-center gap-2 px-2 mb-2">
                        <GroupIcon
                          size={15}
                          className="text-[var(--rz-primary)]"
                        />
                        <span className="text-xs font-bold royal-muted">
                          {group.title}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {group.items.map(tab => {
                          const TabIcon = tab.icon
                          const active = activeTab === tab.id

                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                goToTab(tab.id)
                                setSidebarOpen(false)
                              }}
                              className={`icon-card rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-center ${
                                active ? 'active' : ''
                              }`}
                              title={tab.label}
                              aria-current={active ? 'page' : undefined}
                            >
                              <span
                                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                                  active
                                    ? 'bg-[var(--rz-primary)]/15 border-[var(--rz-primary)]/40 text-[var(--rz-primary)]'
                                    : 'bg-[var(--rz-primary)]/5 border-[var(--rz-primary)]/15 text-[var(--rz-primary)]'
                                }`}
                              >
                                <TabIcon size={20} />
                              </span>

                              <span className="text-[11px] font-bold leading-4 royal-text">
                                {tab.label}
                              </span>

                              {tab.viewOnly && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full view-only-badge border">
                                  مشاهدة فقط
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
              </div>
            </aside>
          </>
        )}

        <main className="flex-1 min-w-0 p-3 md:p-6">
          <div className="royal-surface backdrop-blur-md rounded-2xl border royal-border p-4 md:p-5 mb-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {(() => {
                  const currentTab =
                    tabs.find(tab => tab.id === activeTab) || tabs[0]
                  const CurrentIcon = currentTab.icon

                  return (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-[var(--rz-primary)]/10 border border-[var(--rz-primary)]/30 flex items-center justify-center text-[var(--rz-primary)]">
                        <CurrentIcon size={24} />
                      </div>

                      <div className="min-w-0">
                        <h2 className="font-bold text-lg md:text-xl royal-text">
                          {currentTab.label}
                        </h2>

                        <p className="text-xs md:text-sm royal-muted font-medium">
                          قسم {currentTab.categoryLabel || currentTab.category}
                        </p>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* رجوع خطوة واحدة داخل الغرفة — ليس خروجاً وليس تسجيل خروج */}
              <button
                type="button"
                onClick={goBackOneStep}
                className="px-3.5 py-2.5 rounded-xl border border-[var(--rz-primary)]/40 bg-[var(--rz-primary)]/10 text-[var(--rz-ink)] hover:bg-[var(--rz-primary)]/20 text-xs font-bold flex items-center gap-2 shadow-sm"
                aria-label="رجوع خطوة واحدة داخل الغرفة"
                title={activeTab === 'center' ? 'أنت في المركز الرئيسي' : 'رجوع للقسم السابق'}
              >
                <ArrowRight size={15} className="opacity-80" />
                رجوع
              </button>
            </div>
          </div>

          {['users', 'ads', 'messages'].includes(activeTab) && (
            <div className="royal-surface backdrop-blur-md rounded-xl p-3 md:p-4 mb-6 border royal-border">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative min-w-0">
                  <Search
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--rz-primary)]"
                    size={19}
                  />

                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو البريد أو المعرّف..."
                    value={searchTerm}
                    onChange={(e) =>
                      setSearchTerm(e.target.value)
                    }
                    className="w-full light-field border rounded-xl pl-4 pr-10 py-3 text-sm focus:border-[var(--rz-primary)]/60 focus:outline-none transition-all font-semibold"
                  />
                </div>

                <select
                  value={filterType}
                  onChange={(e) =>
                    setFilterType(e.target.value)
                  }
                  className="md:w-48 light-field border rounded-xl px-4 py-3 text-sm focus:border-[var(--rz-primary)]/60 focus:outline-none font-semibold"
                  aria-label="تصفية النتائج"
                >
                  <option value="all">الكل</option>
                  <option value="active">نشط</option>
                  <option value="banned">محظور</option>
                  <option value="admins">مدراء</option>
                  <option value="pending">قيد المراجعة</option>
                  <option value="rejected">مرفوض</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'center' && (
            <CenterPanel
              onTab={goToTab}
              onBroadcast={sendBroadcast}
              onSettings={() => navigate('/settings')}
              onAdminPanel={() => navigate('/admin')}
              onComplaints={() => navigate('/complaints')}
            />
          )}

          {activeTab === 'overview' && (
            <OverviewPanel stats={stats} onTab={goToTab} />
          )}

          {activeTab === 'live' && (
            <LiveActivityPanel
              users={users}
              ads={ads}
              messages={messages}
              orders={orders}
              reports={reports}
              onTab={goToTab}
            />
          )}

          {activeTab === 'permissions' && (
            <PermissionsPanel
              users={users}
              ownerEmail={user?.email}
              darkMode={false}
            />
          )}

          {activeTab === 'broadcast' && (
            <BroadcastPanel
              text={broadcastText}
              setText={setBroadcastText}
              sending={broadcastSending}
              onSend={sendDirectBroadcast}
              onQuickNotice={sendBroadcast}
            />
          )}

          {activeTab === 'users' && (
            <UsersPanel
              can={can}
              users={filteredUsers}
              editingUserId={editingUserId}
              editingUserName={editingUserName}
              setEditingUserName={setEditingUserName}
              onEdit={(target) => {
                setEditingUserId(target.id)
                setEditingUserName(target.displayName || '')
              }}
              onCancelEdit={() => {
                setEditingUserId(null)
                setEditingUserName('')
              }}
              onSaveEdit={saveUserName}
              onBan={banUser}
              onUnban={unbanUser}
              onSetAdmin={setAsAdmin}
              onRemoveAdmin={removeAdmin}
            />
          )}

          {activeTab === 'ads' && (
            <AdsPanel
              can={can}
              ads={filteredAds}
              editingAdId={editingAdId}
              editingAdTitle={editingAdTitle}
              editingAdDescription={editingAdDescription}
              setEditingAdTitle={setEditingAdTitle}
              setEditingAdDescription={setEditingAdDescription}
              onEdit={(ad) => {
                setEditingAdId(ad.id)
                setEditingAdTitle(ad.title || '')
                setEditingAdDescription(ad.description || '')
              }}
              onCancelEdit={() => {
                setEditingAdId(null)
                setEditingAdTitle('')
                setEditingAdDescription('')
              }}
              onSaveEdit={saveAdEdit}
              onDelete={deleteAd}
              onApprove={approveAd}
              onReject={rejectAd}
            />
          )}

          {activeTab === 'messages' && (
            <MessagesPanel
              messages={filteredMessages}
              privateChats={privateChats}
              selectedChat={selectedChat}
              setSelectedChat={setSelectedChat}
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              db={db}
            />
          )}

          {activeTab === 'comments' && (
            <CommentsReviewPanel />
          )}

          {activeTab === 'reports' && (
            <ReportsPanel reports={reports} />
          )}

          {activeTab === 'security' && (
            <SecurityPanel logs={securityLogs} />
          )}

          {activeTab === 'orders' && (
            <OrdersPanel orders={orders} />
          )}
        </main>
      </div>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(var(--rz-ink-rgb), 0.16)' }}
            onClick={() => setShowNotifications(false)}
            aria-hidden="true"
          />

          <div className="fixed top-20 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 bg-[var(--rz-ivory)]/98 backdrop-blur-xl rounded-2xl border border-[var(--rz-primary)]/30 shadow-2xl z-50 max-h-[75vh] overflow-hidden">
            <div className="p-4 border-b border-[var(--rz-primary)]/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-[var(--rz-primary)]/10 flex items-center justify-center text-[var(--rz-primary)]">
                  <Bell size={18} />
                </div>

                <div>
                  <h3 className="font-bold royal-text">
                    الإشعارات
                  </h3>
                  <p className="text-[11px] royal-muted font-medium">
                    آخر التنبيهات الواردة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="p-2 rounded-lg hover:bg-[var(--rz-primary)]/10 royal-text"
                aria-label="إغلاق الإشعارات"
              >
                <X size={18} />
              </button>
            </div>

            <div className="divide-y divide-[var(--rz-primary)]/10 overflow-y-auto max-h-[calc(75vh-76px)]">
              {notifications.slice(0, 10).map(notif => (
                <button
                  key={notif.id}
                  type="button"
                  className="w-full text-right p-4 hover:bg-slate-700/50"
                  onClick={() => setShowNotifications(false)}
                >
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--rz-primary)]/10 text-[var(--rz-primary)] flex items-center justify-center flex-shrink-0">
                      <Bell size={16} />
                    </div>

                    <div className="min-w-0">
                      <span className="block font-bold royal-text truncate">
                        {notif.title || 'تنبيه'}
                      </span>

                      <span className="block text-sm royal-muted mt-1 break-words font-medium">
                        {notif.body || notif.message || '—'}
                      </span>

                      <span className="block text-[11px] text-[var(--rz-muted)] mt-2 font-medium">
                        {formatDate(
                          notif.timestamp ||
                          notif.createdAt
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {notifications.length === 0 && (
                <div className="p-8 text-center royal-muted">
                  <Bell
                    size={30}
                    className="mx-auto mb-2 opacity-40"
                  />
                  <p className="text-sm font-medium">
                    لا توجد إشعارات حالياً
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const StatCard = ({
  icon: Icon,
  value,
  label,
  color
}) => {
  const colors = {
    gold: 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)] border-[var(--rz-primary)]/25',
    red: 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)] border-[var(--rz-primary)]/25',
    yellow: 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)] border-[var(--rz-primary)]/25',
    green: 'bg-[var(--rz-ink)]/10 text-[var(--rz-ink)] border-[var(--rz-ink)]/25',
    purple: 'bg-[var(--rz-muted)]/10 text-[var(--rz-muted)] border-[var(--rz-muted)]/25',
    orange: 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)] border-[var(--rz-primary)]/25'
  }

  return (
    <div
      className={`royal-surface rounded-xl p-3 md:p-4 border ${
        colors[color] || colors.gold
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} />
        <span className="text-xs md:text-sm font-bold opacity-90">
          {label}
        </span>
      </div>

      <p className="text-xl md:text-2xl font-bold text-[var(--rz-ink)]">
        {formatNumber(value)}
      </p>
    </div>
  )
}

/* ===== المركز الرئيسي (بدون نظرة عامة أو نشاط لحظي) ===== */
const CenterPanel = ({
  onTab,
  onBroadcast,
  onSettings,
  onAdminPanel,
  onComplaints
}) => {
  const [openGroup, setOpenGroup] = useState('admin')

  const groups = [
    {
      id: 'admin',
      title: 'الإدارة',
      items: [
        { id: 'ads', label: 'إدارة الإعلانات', action: () => onTab('ads') },
        { id: 'users', label: 'إدارة المستخدمين', action: () => onTab('users') },
        { id: 'admin', label: 'لوحة الإدارة', action: onAdminPanel },
        { id: 'settings', label: 'إعدادات الموقع', action: onSettings },
      ],
    },
    {
      id: 'monitor',
      title: 'المراقبة',
      items: [
        { id: 'overview', label: 'نظرة عامة / الإحصائيات', action: () => onTab('overview') },
        { id: 'live', label: 'النشاط اللحظي', action: () => onTab('live') },
        { id: 'reports', label: 'البلاغات', action: () => onTab('reports') },
        { id: 'security', label: 'سجلات الأمان', action: () => onTab('security') },
      ],
    },
    {
      id: 'comms',
      title: 'التواصل والمراجعة',
      items: [
        { id: 'messages', label: 'الرسائل الخاصة', action: () => onTab('messages') },
        { id: 'comments', label: 'مراجعة التقييمات', action: () => onTab('comments') },
        { id: 'complaints', label: 'الشكاوى / المراسلات', action: onComplaints },
        { id: 'broadcast', label: 'إرسال تنبيه جماعي', action: () => onTab('broadcast') },
      ],
    },
    {
      id: 'protect',
      title: 'الحماية والصلاحيات',
      items: [
        { id: 'permissions', label: 'مصفوفة الصلاحيات (تشغيل / إيقاف)', action: () => onTab('permissions') },
        { id: 'orders', label: 'الطلبات', action: () => onTab('orders') },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      <div className="text-center mb-1">
        <h2 className="text-lg font-bold royal-text">غرفة صاحب الموقع</h2>
        <p className="text-xs royal-muted mt-1 font-medium">
          افتح المجموعة ثم اختر القسم — زر الرجوع ينقلك للقسم السابق داخل الغرفة
        </p>
      </div>

      <div className="space-y-2">
        {groups.map((g) => {
          const open = openGroup === g.id
          return (
            <div key={g.id} className="royal-surface rounded-xl border royal-border overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenGroup(open ? null : g.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right hover:bg-[var(--rz-primary)]/5 transition-colors"
                aria-expanded={open}
              >
                <span className="font-extrabold text-sm royal-text">{g.title}</span>
                <span className="text-xs font-bold text-[var(--rz-primary)] min-w-[1.5rem] text-center">
                  {open ? '−' : '+'}
                </span>
              </button>
              {open && (
                <div className="border-t border-[var(--rz-primary)]/15 px-2 py-2 space-y-1">
                  {g.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.action}
                      className="w-full text-right px-3 py-2.5 rounded-lg text-sm font-bold royal-text hover:bg-[var(--rz-primary)]/10 transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ===== نظرة عامة (قسم مستقل) — الإحصائيات تظهر هنا فقط عند الضغط ===== */
const OverviewPanel = ({ stats, onTab }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        icon={Users}
        value={stats.totalUsers}
        label="إجمالي المستخدمين"
        color="gold"
      />
      <StatCard
        icon={Ban}
        value={stats.bannedUsers}
        label="المحظورون"
        color="red"
      />
      <StatCard
        icon={Crown}
        value={stats.adminUsers}
        label="المدراء"
        color="yellow"
      />
      <StatCard
        icon={ShoppingBag}
        value={stats.activeAds}
        label="الإعلانات النشطة"
        color="green"
      />
      <StatCard
        icon={MessageSquare}
        value={stats.totalMessages}
        label="الرسائل"
        color="purple"
      />
      <StatCard
        icon={AlertTriangle}
        value={stats.securityAlerts}
        label="تنبيهات الأمان"
        color="orange"
      />
    </div>

    <div className="royal-surface rounded-2xl p-4 md:p-5 border royal-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2 royal-text">
          <TrendingUp
            size={18}
            className="text-[var(--rz-primary)]"
          />
          نظرة عامة
        </h3>

        <button
          type="button"
          onClick={() => onTab('users')}
          className="text-xs text-[var(--rz-primary)] hover:text-[var(--rz-primary)] hover:underline font-bold"
        >
          تفاصيل المستخدمين
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat
          icon={Users}
          value={stats.totalUsers}
          label="المستخدمون"
        />
        <MiniStat
          icon={Crown}
          value={stats.adminUsers}
          label="المدراء"
        />
        <MiniStat
          icon={ShoppingBag}
          value={stats.totalAds}
          label="الإعلانات"
        />
        <MiniStat
          icon={Activity}
          value={stats.activeAds}
          label="النشطة"
        />
      </div>
    </div>
  </div>
)

/* ===== النشاط اللحظي (قسم مستقل) ===== */
const LiveActivityPanel = ({
  users,
  ads,
  messages,
  orders,
  reports = [],
  onTab
}) => (
  <div className="space-y-6">
    <div className="royal-surface rounded-2xl p-4 md:p-6 border royal-border">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 royal-text">
        <Activity
          className="text-[var(--rz-ink)]"
          size={20}
        />
        النشاط اللحظي
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <LiveStat
          value={users.filter(u => !u?.banned).length}
          label="مستخدمين نشطين"
          icon={UserCheck}
        />

        <LiveStat
          value={ads.filter(a => a?.status === 'active').length}
          label="إعلانات نشطة"
          icon={ShoppingBag}
        />

        <LiveStat
          value={messages.length}
          label="رسائل"
          icon={MessageSquare}
        />

        <LiveStat
          value={orders.length}
          label="طلبات"
          icon={Activity}
        />
      </div>
    </div>

    <div className="royal-surface rounded-2xl p-4 md:p-5 border royal-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2 royal-text">
          <Flag
            size={18}
            className="text-[var(--rz-primary)]"
          />
          أحدث البلاغات
        </h3>

        <button
          type="button"
          onClick={() => onTab('reports')}
          className="text-xs text-[var(--rz-primary)] hover:underline font-bold"
        >
          عرض الكل
        </button>
      </div>

      <div className="space-y-3">
        {reports.slice(0, 4).map(report => (
          <button
            key={report.id}
            type="button"
            onClick={() => onTab('reports')}
            className="w-full flex items-center justify-between gap-3 p-3 bg-[var(--rz-primary)]/5 hover:bg-[var(--rz-primary)]/10 rounded-xl text-right transition-colors border border-transparent hover:border-[var(--rz-primary)]/10"
          >
            <div className="min-w-0">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-[10px] mb-1 font-bold ${
                  report.status === 'pending'
                    ? 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)]'
                    : report.status === 'resolved'
                      ? 'bg-[var(--rz-ink)]/10 text-[var(--rz-ink)]'
                      : 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)]'
                }`}
              >
                {report.status === 'pending'
                  ? 'جديد'
                  : report.status === 'resolved'
                    ? 'تم الحل'
                    : 'قيد المراجعة'}
              </span>

              <p className="text-sm font-bold royal-text truncate">
                {report.reason ||
                  report.description ||
                  'بلاغ'}
              </p>

              <p className="text-[10px] royal-muted mt-1 font-medium">
                {formatDate(report.createdAt)}
              </p>
            </div>

            <ChevronDown
              size={16}
              className="text-[var(--rz-primary)] -rotate-90 flex-shrink-0"
            />
          </button>
        ))}

        {reports.length === 0 && (
          <EmptyState
            icon={Flag}
            text="لا توجد بلاغات حالياً"
          />
        )}
      </div>
    </div>

    <div className="royal-surface rounded-2xl p-4 md:p-6 border royal-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold royal-text">
          حسابات المالك فقط
        </h3>

        <span className="text-[10px] px-2 py-1 rounded-full view-only-badge border">
          مشاهدة فقط
        </span>
      </div>

      <div className="space-y-3">
        {users
          .filter((u) => isOwnerEmail(u.email))
          .slice(0, 2)
          .map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between gap-3 p-3 bg-[var(--rz-primary)]/5 rounded-xl border border-[var(--rz-primary)]/5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-[var(--rz-primary)]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Crown
                  size={18}
                  className="text-[var(--rz-primary)]"
                />
              </div>

              <div className="min-w-0">
                <p className="font-bold royal-text truncate">
                  {u.displayName || u.email || 'مالك'}
                </p>

                <p className="text-xs royal-muted truncate font-medium">
                  {u.email}
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[10px] flex-shrink-0 font-bold bg-[var(--rz-primary)]/10 text-[var(--rz-primary)]">
              مالك
            </span>
          </div>
        ))}

        {users.filter((u) => isOwnerEmail(u.email)).length === 0 && (
          <EmptyState
            icon={Crown}
            text="لا توجد حسابات مالك مطابقة"
          />
        )}
      </div>
    </div>
  </div>
)

const MiniStat = ({ icon: Icon, value, label }) => (
  <div className="text-center p-4 bg-[var(--rz-primary)]/5 rounded-xl border border-[var(--rz-primary)]/10">
    <Icon
      size={20}
      className="mx-auto mb-2 text-[var(--rz-primary)]"
    />

    <p className="text-2xl font-bold royal-text">
      {formatNumber(value)}
    </p>

    <p className="text-xs royal-muted font-bold">
      {label}
    </p>
  </div>
)

const LiveStat = ({ value, label, icon: Icon }) => (
  <div className="text-center p-4 bg-[var(--rz-primary)]/5 rounded-xl border border-[var(--rz-primary)]/10">
    <Icon
      size={19}
      className="mx-auto mb-2 text-[var(--rz-primary)]"
    />

    <p className="text-2xl font-bold royal-text">
      {formatNumber(value)}
    </p>

    <p className="text-xs royal-muted font-bold">
      {label}
    </p>
  </div>
)

const EmptyState = ({ icon: Icon, text }) => (
  <div className="text-center py-8 royal-muted">
    <Icon
      size={30}
      className="mx-auto mb-2 opacity-40"
    />

    <p className="text-sm font-medium">{text}</p>
  </div>
)

const UsersPanel = ({
  users,
  editingUserId,
  editingUserName,
  setEditingUserName,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onBan,
  onUnban,
  onSetAdmin,
  onRemoveAdmin
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold royal-text">
          إدارة المستخدمين
        </h2>

        <p className="text-xs royal-muted mt-1 font-medium">
          {formatNumber(users.length)} مستخدم
        </p>
      </div>

      <div className="w-10 h-10 rounded-xl bg-[var(--rz-primary)]/10 border border-[var(--rz-primary)]/20 flex items-center justify-center text-[var(--rz-primary)]">
        <Users size={20} />
      </div>
    </div>

    <div className="royal-surface rounded-2xl border royal-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-[var(--rz-primary)]/8">
            <tr>
              <th className="px-4 py-3 text-right font-bold text-[var(--rz-ink)]">المستخدم</th>
              <th className="px-4 py-3 text-right font-bold text-[var(--rz-ink)]">البريد</th>
              <th className="px-4 py-3 text-right font-bold text-[var(--rz-ink)]">الحالة</th>
              <th className="px-4 py-3 text-center font-bold text-[var(--rz-ink)]">
                الإجراءات
              </th>
            </tr>
          </thead>

          <tbody>
            {users.map(u => (
              <tr
                key={u.id}
                className="border-t border-[var(--rz-primary)]/10"
              >
                <td className="px-4 py-3">
                  {editingUserId === u.id ? (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-[var(--rz-primary)]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <UserRound
                          size={18}
                          className="text-[var(--rz-primary)]"
                        />
                      </div>

                      <input
                        value={editingUserName}
                        onChange={(e) =>
                          setEditingUserName(e.target.value)
                        }
                        className="light-field border rounded-lg px-3 py-2 text-sm w-full font-semibold"
                        placeholder="اسم المستخدم"
                        aria-label="اسم المستخدم"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--rz-primary)]/10 rounded-xl flex items-center justify-center">
                        <Users
                          size={18}
                          className="text-[var(--rz-primary)]"
                        />
                      </div>

                      <div>
                        <p className="font-bold royal-text">
                          {u.displayName || 'بدون اسم'}
                        </p>

                        <p className="text-xs royal-muted font-medium">
                          ID:{' '}
                          {String(u.uid || u.id || '').slice(
                            0,
                            8
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </td>

                <td className="px-4 py-3 royal-muted font-medium">
                  {isOwnerEmail(u.email)
                    ? u.email
                    : '—'}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      u.banned
                        ? 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)]'
                        : u.role === 'admin'
                          ? 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)]'
                          : 'bg-[var(--rz-ink)]/10 text-[var(--rz-ink)]'
                    }`}
                  >
                    {u.banned
                      ? 'محظور'
                      : u.role === 'admin'
                        ? 'مدير'
                        : 'نشط'}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    {editingUserId === u.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            onSaveEdit(u.id)
                          }
                          className="p-2.5 hover:bg-[var(--rz-ink)]/10 rounded-lg text-[var(--rz-ink)]"
                          title="حفظ التعديل"
                          aria-label="حفظ التعديل"
                        >
                          <Save size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={onCancelEdit}
                          className="p-2.5 hover:bg-[var(--rz-primary)]/10 rounded-lg text-[var(--rz-primary)]"
                          title="إلغاء التعديل"
                          aria-label="إلغاء التعديل"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onEdit(u)}
                        className="p-2.5 hover:bg-[var(--rz-primary)]/10 rounded-lg text-[var(--rz-primary)]"
                        title="تعديل المستخدم"
                        aria-label="تعديل المستخدم"
                      >
                        <Edit3 size={18} />
                      </button>
                    )}

                    {u.banned ? (
                      <button
                        type="button"
                        onClick={() =>
                          onUnban(u.id)
                        }
                        className="p-2.5 hover:bg-[var(--rz-ink)]/10 rounded-lg text-[var(--rz-ink)]"
                        title="إلغاء الحظر"
                        aria-label="إلغاء الحظر"
                      >
                        <Unlock size={18} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const reason =
                            prompt('سبب الحظر:')

                          onBan(
                            u.id,
                            reason?.trim() ||
                            'مخالفة'
                          )
                        }}
                        className="p-2.5 hover:bg-[var(--rz-primary)]/10 rounded-lg text-[var(--rz-primary)]"
                        title="حظر المستخدم"
                        aria-label="حظر المستخدم"
                      >
                        <Ban size={18} />
                      </button>
                    )}

                    {u.role === 'admin' ? (
                      <button
                        type="button"
                        onClick={() =>
                          onRemoveAdmin(u.id)
                        }
                        className="p-2.5 hover:bg-[var(--rz-primary)]/10 rounded-lg text-[var(--rz-primary)]"
                        title="إزالة صلاحيات المدير"
                        aria-label="إزالة صلاحيات المدير"
                      >
                        <Crown size={18} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onSetAdmin(u.id)
                        }
                        className="p-2.5 hover:bg-[var(--rz-primary)]/10 rounded-lg text-[var(--rz-primary)]"
                        title="تعيين مدير"
                        aria-label="تعيين مدير"
                      >
                        <Crown size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <EmptyState
            icon={Users}
            text="لا توجد نتائج مطابقة"
          />
        )}
      </div>
    </div>
  </div>
)

const AdsPanel = ({
  can,
  ads,
  editingAdId,
  editingAdTitle,
  editingAdDescription,
  setEditingAdTitle,
  setEditingAdDescription,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onApprove,
  onReject
}) => (

  <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold royal-text">
          إدارة الإعلانات
        </h2>

        <p className="text-xs royal-muted mt-1 font-medium">
          {formatNumber(ads.length)} إعلان
        </p>
      </div>

      <div className="w-10 h-10 rounded-xl bg-[var(--rz-primary)]/10 border border-[var(--rz-primary)]/20 flex items-center justify-center text-[var(--rz-primary)]">
        <ShoppingBag size={20} />
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {ads.map(ad => (
        <div
          key={ad.id}
          className="royal-surface rounded-2xl p-4 border royal-border"
        >
          <div className="flex gap-4">
            {ad.images?.[0] && (
              <img
                loading="lazy"
                decoding="async"
                src={ad.images[0]}
                alt=""
                className="w-24 h-24 rounded-xl object-cover border border-[var(--rz-primary)]/10 flex-shrink-0"
              />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                {editingAdId === ad.id ? (
                  <div className="flex-1 space-y-2">
                    <input
                      value={editingAdTitle}
                      onChange={(e) =>
                        setEditingAdTitle(e.target.value)
                      }
                      className="w-full light-field border rounded-lg px-3 py-2 text-sm font-semibold"
                      placeholder="عنوان الإعلان"
                      aria-label="عنوان الإعلان"
                    />

                    <textarea
                      value={editingAdDescription}
                      onChange={(e) =>
                        setEditingAdDescription(e.target.value)
                      }
                      rows={4}
                      className="w-full light-field border rounded-lg px-3 py-2 text-sm resize-y font-semibold"
                      placeholder="وصف الإعلان"
                      aria-label="وصف الإعلان"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onSaveEdit(ad.id)
                        }
                        className="px-3 py-2 bg-[var(--rz-ink)]/10 text-[var(--rz-ink)] rounded-lg text-xs flex items-center gap-1.5 font-bold"
                      >
                        <Save size={15} />
                        حفظ
                      </button>

                      <button
                        type="button"
                        onClick={onCancelEdit}
                        className="px-3 py-2 bg-[var(--rz-primary)]/10 text-[var(--rz-primary)] rounded-lg text-xs flex items-center gap-1.5 font-bold"
                      >
                        <X size={15} />
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <h4 className="font-bold royal-text truncate">
                    {ad.title || 'إعلان بدون عنوان'}
                  </h4>
                )}

                <span
                  className={`px-2 py-1 rounded-full text-[10px] flex-shrink-0 font-bold ${
                    ad.status === 'active'
                      ? 'bg-[var(--rz-ink)]/10 text-[var(--rz-ink)]'
                      : ad.status === 'pending'
                        ? 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)]'
                        : 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)]'
                  }`}
                >
                  {ad.status === 'active'
                    ? 'نشط'
                    : ad.status === 'pending'
                      ? 'قيد المراجعة'
                      : 'مرفوض'}
                </span>
              </div>

              {editingAdId !== ad.id && (
                <>
                  <p className="text-sm royal-muted mb-3 line-clamp-2 font-medium">
                    {ad.description
                      ? `${ad.description.slice(0, 120)}${ad.description.length > 120 ? '...' : ''}`
                      : 'بدون وصف'}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(ad)}
                      className="px-3 py-2 bg-[var(--rz-primary)]/10 text-[var(--rz-primary)] rounded-lg text-xs flex items-center gap-1.5 font-bold"
                    >
                      <Edit3 size={15} />
                      تعديل
                    </button>

                    {ad.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            onApprove(ad.id)
                          }
                          className="px-3 py-2 bg-[var(--rz-ink)]/10 text-[var(--rz-ink)] rounded-lg text-xs flex items-center gap-1.5 font-bold"
                        >
                          <Check size={15} />
                          تفعيل
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onReject(
                              ad.id,
                              'مخالفة للشروط'
                            )
                          }
                          className="px-3 py-2 bg-[var(--rz-primary)]/10 text-[var(--rz-primary)] rounded-lg text-xs flex items-center gap-1.5 font-bold"
                        >
                          <X size={15} />
                          رفض
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        onDelete(
                          ad.id,
                          'قرار الإدارة'
                        )
                      }
                      className="px-3 py-2 bg-[var(--rz-primary)]/10 text-[var(--rz-primary)] rounded-lg text-xs flex items-center gap-1.5 font-bold"
                    >
                      <Trash2 size={15} />
                      حذف
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {ads.length === 0 && (
        <div className="lg:col-span-2">
          <EmptyState
            icon={ShoppingBag}
            text="لا توجد إعلانات مطابقة"
          />
        </div>
      )}
    </div>
  </div>
)

const MessagesPanel = ({
  messages,
  privateChats = [],
  selectedChat,
  setSelectedChat,
  chatMessages = [],
  setChatMessages,
  db,
}) => {
  const openChat = async (chat) => {
    setSelectedChat(chat)
    setChatMessages([])
    if (!db || !chat?.id) return
    try {
      const { collection, query, orderBy, getDocs } = await import('firebase/firestore')
      const snap = await getDocs(
        query(collection(db, 'chats', chat.id, 'messages'), orderBy('createdAt', 'asc'))
      )
      setChatMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error('owner chat open:', e)
      setChatMessages([])
    }
  }

  return (
  <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold royal-text">
          الرسائل الخاصة — مراقبة المالك
        </h2>
        <p className="text-xs royal-muted mt-1 font-medium">
          محادثات حراج خاصة (المشتري ↔ المعلن) — تظهر لك فقط كمالك
        </p>
      </div>
      <span className="px-3 py-1.5 rounded-full text-[10px] bg-[var(--rz-primary)]/10 text-[var(--rz-ink)] border border-[var(--rz-primary)]/25 font-bold">
        {formatNumber((privateChats || []).length)} محادثة حراج
      </span>
    </div>

    <div className="royal-surface rounded-xl p-4 border royal-border" style={{ background: 'rgba(var(--rz-primary-rgb), 0.08)' }}>
      <p className="text-[var(--rz-ink)] flex items-center gap-2 text-sm font-medium">
        <Shield size={18} />
        الرسائل الخاصة محمية: المشاركون فقط يتراسلون، وأنت كمالك تراقب لحماية الموقع دون علمهم.
      </p>
    </div>

    {/* محادثات حراج الخاصة */}
    <div className="space-y-3">
      <h3 className="font-bold royal-text text-base">محادثات إعلانات الحراج</h3>
      {(privateChats || []).length === 0 && (
        <EmptyState icon={MessageSquare} text="لا توجد محادثات حراج بعد" />
      )}
      {(privateChats || []).map((chat) => (
        <div key={chat.id} className="royal-surface rounded-xl p-4 border royal-border">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <p className="font-bold royal-text text-sm">{chat.adTitle || 'إعلان'}</p>
              <p className="text-[11px] royal-muted">
                مشتري: {chat.buyerName || chat.buyerKey || '—'} | بائع: {chat.sellerKey || '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openChat(chat)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'linear-gradient(135deg,var(--rz-primary),var(--rz-primary))', color: 'var(--rz-white)', border: 'none', cursor: 'pointer' }}
            >
              فتح المحادثة
            </button>
          </div>
          {chat.lastMessage && (
            <p className="text-sm royal-text break-words">آخر رسالة: {chat.lastMessage}</p>
          )}
        </div>
      ))}
    </div>

    {selectedChat && (
      <div className="royal-surface rounded-xl p-4 border royal-border" style={{ borderColor: 'var(--rz-primary)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold royal-text">محادثة: {selectedChat.adTitle || selectedChat.id}</h3>
          <button type="button" onClick={() => { setSelectedChat(null); setChatMessages([]) }} className="text-xs font-bold royal-muted">إغلاق</button>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {chatMessages.length === 0 && <p className="text-sm royal-muted">لا رسائل أو جاري التحميل...</p>}
          {chatMessages.map((m) => (
            <div key={m.id} className="p-2 rounded-lg" style={{ background: 'var(--rz-ivory)', border: '1px solid rgba(var(--rz-primary-rgb), 0.2)' }}>
              <p className="text-[11px] royal-muted font-medium">{m.senderName || m.senderKey || '—'}</p>
              <p className="royal-text text-sm break-words font-medium">{m.text || m.content || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="border-t border-[var(--rz-primary)]/20 pt-4 mt-4">
      <h3 className="font-bold royal-text text-base mb-2">رسائل عامة أخرى</h3>
      <div className="space-y-3">
        {(messages || []).map(msg => (
          <div key={msg.id} className="royal-surface rounded-xl p-4 border royal-border">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs royal-muted font-medium">
                من: {String(msg.senderId || '').slice(0, 8) || '—'}
              </span>
              <span className="text-xs royal-muted font-medium">
                إلى: {String(msg.receiverId || '').slice(0, 8) || '—'}
              </span>
            </div>
            <p className="royal-text break-words font-medium">{msg.content || '—'}</p>
            <p className="text-[11px] text-[var(--rz-muted)] mt-2 font-medium">{formatDate(msg.createdAt)}</p>
          </div>
        ))}
        {(messages || []).length === 0 && (
          <EmptyState icon={MessageSquare} text="لا توجد رسائل عامة" />
        )}
      </div>
    </div>
  </div>
  )
}

const ReportsPanel = ({ reports }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold royal-text">
          البلاغات
        </h2>

        <p className="text-xs royal-muted mt-1 font-medium">
          {formatNumber(reports.length)} بلاغ
        </p>
      </div>

      <span className="px-3 py-1.5 rounded-full text-[10px] bg-[var(--rz-primary)]/10 text-[var(--rz-ink)] border border-[var(--rz-primary)]/25 font-bold">
        مراجعة
      </span>
    </div>

    <div className="space-y-3">
      {reports.map(report => (
        <div
          key={report.id}
          className="royal-surface rounded-xl p-4 border royal-border"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-bold ${
                report.status === 'pending'
                  ? 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)]'
                  : report.status === 'resolved'
                    ? 'bg-[var(--rz-ink)]/10 text-[var(--rz-ink)]'
                    : 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)]'
              }`}
            >
              {report.status === 'pending'
                ? 'قيد المراجعة'
                : report.status === 'resolved'
                  ? 'تم الحل'
                  : 'مرفوض'}
            </span>

            <span className="text-xs royal-muted font-medium">
              {formatDate(report.createdAt)}
            </span>
          </div>

          <p className="royal-text font-medium">
            {report.reason ||
              report.description ||
              'بلاغ'}
          </p>

          <p className="text-xs royal-muted mt-1 font-medium">
            على الإعلان:{' '}
            {String(report.adId || '').slice(0, 8) ||
              '—'}
          </p>
        </div>
      ))}

      {reports.length === 0 && (
        <EmptyState
          icon={Flag}
          text="لا توجد بلاغات"
        />
      )}
    </div>
  </div>
)

const SecurityPanel = ({ logs }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold royal-text">
          سجل الأمان
        </h2>

        <p className="text-xs royal-muted mt-1 font-medium">
          أحداث الأمان ذات الأولوية العالية
        </p>
      </div>

      <span className="px-3 py-1.5 rounded-full text-[10px] view-only-badge border">
        مشاهدة فقط
      </span>
    </div>

    <div className="bg-[var(--rz-primary)]/5 border border-[var(--rz-primary)]/20 rounded-xl p-4">
      <p className="text-[var(--rz-ink)] flex items-center gap-2 text-sm font-medium">
        <Lock size={18} />
        سجل الأمان للقراءة والمشاهدة فقط.
      </p>
    </div>

    <div className="space-y-3">
      {logs.map(log => (
        <div
          key={log.id}
          className="royal-surface rounded-xl p-4 border royal-border"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle
                size={18}
                className={
                  log.severity === 'high'
                    ? 'text-[var(--rz-primary)]'
                    : log.severity === 'medium'
                      ? 'text-[var(--rz-primary)]'
                      : 'text-[var(--rz-ink)]'
                }
              />

              <span className="font-bold royal-text">
                {log.type || 'حدث أمني'}
              </span>
            </div>

            <span className="text-xs royal-muted font-medium">
              {formatDate(log.timestamp)}
            </span>
          </div>

          <p className="text-sm royal-muted font-medium">
            {log.details || '—'}
          </p>

          <p className="text-xs text-[var(--rz-muted)] mt-1 font-medium">
            بواسطة: {log.userEmail || '—'}
          </p>
        </div>
      ))}

      {logs.length === 0 && (
        <EmptyState
          icon={Shield}
          text="لا توجد تنبيهات أمان"
        />
      )}
    </div>
  </div>
)

const OrdersPanel = ({ orders }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold royal-text">
          الطلبات
        </h2>

        <p className="text-xs royal-muted mt-1 font-medium">
          {formatNumber(orders.length)} طلب
        </p>
      </div>

      <span className="px-3 py-1.5 rounded-full text-[10px] view-only-badge border">
        مشاهدة فقط
      </span>
    </div>

    <div className="bg-[var(--rz-primary)]/5 border border-[var(--rz-primary)]/20 rounded-xl p-4">
      <p className="text-[var(--rz-ink)] flex items-center gap-2 text-sm font-medium">
        <Eye size={18} />
        الطلبات موجودة في قسم المشاهدة فقط ولا تحتوي على إجراءات تعديل هنا.
      </p>
    </div>

    <div className="royal-surface rounded-2xl border royal-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead className="bg-[var(--rz-primary)]/8">
            <tr>
              <th className="px-4 py-3 text-right font-bold text-[var(--rz-ink)]">
                رقم الطلب
              </th>

              <th className="px-4 py-3 text-right font-bold text-[var(--rz-ink)]">
                العميل
              </th>

              <th className="px-4 py-3 text-right font-bold text-[var(--rz-ink)]">
                المجموع
              </th>

              <th className="px-4 py-3 text-right font-bold text-[var(--rz-ink)]">
                الحالة
              </th>
            </tr>
          </thead>

          <tbody>
            {orders.map(order => (
              <tr
                key={order.id}
                className="border-t border-[var(--rz-primary)]/10"
              >
                <td className="px-4 py-3 font-mono text-sm font-medium">
                  {String(order.id || '').slice(0, 8)}
                </td>

                <td className="px-4 py-3 font-medium">
                  {order.customerName || '—'}
                </td>

                <td className="px-4 py-3 text-[var(--rz-primary)] font-bold">
                  {safeNumber(order.total).toLocaleString('ar-SA')}{' '}
                  ر.س
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold ${
                      order.status === 'completed'
                        ? 'bg-[var(--rz-ink)]/10 text-[var(--rz-ink)]'
                        : order.status === 'pending'
                          ? 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)]'
                          : 'bg-[var(--rz-primary)]/5 royal-muted'
                    }`}
                  >
                    {order.status || 'غير محدد'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && (
          <EmptyState
            icon={Activity}
            text="لا توجد طلبات"
          />
        )}
      </div>
    </div>
  </div>
)

const BroadcastPanel = ({
  text,
  setText,
  sending,
  onSend,
  onQuickNotice
}) => (
  <div className="space-y-4">
    <div className="royal-surface rounded-2xl p-5 md:p-6 border border-[var(--rz-primary)]/30">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-[var(--rz-primary)]/10 border border-[var(--rz-primary)]/25 flex items-center justify-center text-[var(--rz-primary)] flex-shrink-0">
          <Radio size={21} />
        </div>

        <div>
          <h3 className="text-lg font-bold text-[var(--rz-primary)]">
            بث مباشر للعملاء
          </h3>

          <p className="text-xs md:text-sm royal-muted mt-1 font-medium">
            تظهر الرسالة كشريط متحرك أعلى الصفحة لدى جميع الزوار فوراً.
          </p>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={500}
        placeholder="اكتب رسالة البث..."
        disabled={sending}
        className="w-full p-3 rounded-xl light-field text-sm outline-none border focus:border-[var(--rz-primary)]/60 transition resize-y disabled:opacity-60 font-semibold"
      />

      <div className="flex items-center justify-between mt-1 mb-3">
        <span className="text-xs text-[var(--rz-muted)] font-medium">
          {text.length}/500
        </span>

        <span className="text-[10px] royal-muted font-medium">
          قناة البث المباشر
        </span>
      </div>

      <button
        type="button"
        onClick={onSend}
        disabled={!text.trim() || sending}
        className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition ${
          text.trim() && !sending
            ? 'gold-button hover:scale-[1.01]'
            : 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)] cursor-not-allowed border border-[var(--rz-primary)]/10'
        }`}
      >
        <Send size={18} />

        {sending
          ? 'جاري الإرسال...'
          : 'إرسال البث الآن'}
      </button>

      <button
        type="button"
        onClick={onQuickNotice}
        disabled={sending}
        className="w-full mt-3 py-3 rounded-xl bg-[var(--rz-primary)]/5 hover:bg-[var(--rz-primary)]/10 text-[var(--rz-ink)] text-sm flex items-center justify-center gap-2 transition-all border border-[var(--rz-primary)]/15 disabled:opacity-50 font-bold"
      >
        <Bell size={16} />
        إشعار بعنوان ونص
      </button>
    </div>

    <div className="royal-surface rounded-2xl p-4 border border-[var(--rz-primary)]/20">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[var(--rz-primary)]/10 text-[var(--rz-primary)] flex items-center justify-center flex-shrink-0">
          <Eye size={17} />
        </div>

        <div>
          <p className="text-sm font-bold royal-text">
            حالة القناة
          </p>

          <p className="text-xs royal-muted mt-1 font-medium">
            البث المباشر يستخدم قناة
            <span className="text-[var(--rz-primary)] mx-1 font-bold">
              /api/broadcast
            </span>
            الحالية للموقع.
          </p>
        </div>
      </div>
    </div>
  </div>
)

export default OwnerPrivateRoom