import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  where,
  arrayUnion,
  arrayRemove,
  getDocs,
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  sendEmailVerification,
  signOut,
  updateProfile,
} from "firebase/auth";
import { db } from "../firebase/config";
import { recordKick, markManualSignOut } from "../utils/kickLog";
import { ensureFirebaseSession } from "../utils/firebaseSession";

// API helpers للـ Auth (D1)
const API_BASE = "/api";

// قائمة السماح: تُقرأ من متغيرات البيئة مع قيمة افتراضية للتوافق
const ENV_EMAILS = (
  import.meta.env.VITE_OWNER_EMAILS ||
  import.meta.env.VITE_ADMIN_EMAILS ||
  ""
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ALLOWED_EMAILS = new Set(
  ENV_EMAILS.length ? ENV_EMAILS : ["f882771f@gmail.com", "kal6667222@gmail.com"]
);

const OWNER_EMAILS = new Set(ALLOWED_EMAILS);

const isAllowedEmail = (email) =>
  typeof email === "string" && ALLOWED_EMAILS.has(email.toLowerCase());

const isOwnerEmail = (email) =>
  typeof email === "string" && OWNER_EMAILS.has(email.toLowerCase());

// تسجيل أحداث في logs
const addLog = async (action, target, by) => {
  try {
    try { await ensureFirebaseSession(); } catch { /* تُحاول الكتابة على أي حال */ }
    await addDoc(collection(db, "logs"), {
      action,
      target,
      by: by || "system",
      time: serverTimestamp(),
    });
  } catch (_) {
    // Silently fail - cleanup operation
  }
};

const useStore = create(
  persist(
    (set, get) => ({
  // حالة المصادقة
  user: null,
  userRole: null,
  isAuthenticated: false,
  loading: true,
  error: null,

  // توثيق البريد (واجهة تحقق بالبريد)
  tempEmail: "",
  otpSent: false,
  emailVerificationRequired: false,
  emailVerificationSentAt: null,

  // بيانات التطبيق
  products: [],
  users: [],
  logs: [],
  messages: [],
  allMessages: [],
  favorites: [],
  stats: {},
  branches: [],

  // ذاكرة المالكين لإرسال الإشعارات
  ownerCache: [],

  // جلسة الزائر
  guestSession: {
    active: false,
    phone: "",
    startedAt: null,
    expiresAt: null,
    warnedAt: null,
  },
  guestTimers: { warn: null, expire: null },
  guestWarning: false,
  guestExpired: false,

  // إدارة المستمعين
  listeners: new Map(), // name => unsubscribe
  notificationListener: null, // للتوافق الرجعي

  addListener: (name, unsub) => {
    const map = get().listeners;
    if (map.has(name)) {
      try {
        map.get(name)();
      } catch {
        // Silently fail - non-critical operation
      }
    }
    map.set(name, unsub);
    set({ listeners: map });
  },
  removeListener: (name) => {
    const map = get().listeners;
    if (map.has(name)) {
      try {
        map.get(name)();
      } catch {
        // Silently fail - non-critical operation
      }
      map.delete(name);
      set({ listeners: map });
    }
  },
  clearAllListeners: () => {
    const map = get().listeners;
    for (const [, unsub] of map.entries()) {
      try {
        unsub();
      } catch {
        // Silently fail - non-critical operation
      }
    }
    // أوقف مؤقتات الزائر أيضاً
    const t = get().guestTimers;
    try {
      if (t?.warn) clearTimeout(t.warn);
      if (t?.expire) clearTimeout(t.expire);
    } catch {
      // Silently fail - timer cleanup is non-critical
    }
    set({
      listeners: new Map(),
      notificationListener: null,
      guestTimers: { warn: null, expire: null },
    });
  },

  // أدوات إشعار المالكين برسالة داخل messages
  ensureOwnerCache: async () => {
    const cached = get().ownerCache;
    if (cached && cached.length) return cached;

    try {
      const emails = Array.from(OWNER_EMAILS);
      let owners = [];

      // in يدعم حتى 10 عناصر - هنا 2 فقط
      const qOwners = query(collection(db, "users"), where("email", "in", emails));
      const snap = await getDocs(qOwners);
      owners = snap.docs.map((d) => ({ uid: d.id, email: d.data().email }));

      set({ ownerCache: owners });
      return owners;
    } catch (_) {
      set({ ownerCache: [] });
      return [];
    }
  },

  notifyOwners: async (text, meta = {}) => {
    try {
      const owners = await get().ensureOwnerCache();
      const senderId = get().user?.uid || "system";
      const senderEmail = get().user?.email || "system@local";
      if (!owners.length) {
        // لا يوجد مالكون مسجّلون بعد، سجّل في اللوق فقط
        await addLog("OWNER_NOTIFY_FALLBACK", text, senderEmail);
        return;
      }
      await Promise.all(
        owners.map((o) =>
          addDoc(collection(db, "messages"), {
            senderId,
            senderEmail,
            receiverId: o.uid,
            receiverEmail: o.email,
            text,
            meta,
            createdAt: serverTimestamp(),
            read: false,
            type: "SYSTEM_NOTICE",
          })
        )
      );
    } catch (_) {
      // Silently fail - cleanup operation
    }
  },

  setOtpSent: (val) => set({ otpSent: val }),

  // مسح هوية الزائر الراكدة نهائياً — تُستدعى قبل كل دخول حقيقي (بريد/Google)
  // وبعد وصول مستخدم Firebase حقيقي في AuthContext حتى لا تلطخ جلسة
  // المالك/العضو بهوية 'guest' راكدة من جلسة زائر سابقة (خاصة عبر
  // localStorage من تبويب/جلسة أخرى) أو تُبقي مؤقّتات زائر تعمل
  // في الخلفية فتستدعي signOut فجأة. آمنة للنداء المتكررة (idempotent).
  clearStaleGuestIdentity: async () => {
    const s = get();
    const wasGuestActive = !!s.guestSession?.active;
    const hadGuestUser = !!s.user?.isGuest;

    // جلسة زائر نشطة/حية — لا تمسح هنا؛ guestLogin يدير تنظيف السابقة عبر endGuestSession
    if (wasGuestActive || hadGuestUser) {
      return { success: true };
    }
    // أوقف أي مؤقّت زائر معلّق (warn/expire) قبل كل شيء حتى لا يستدعي
    // signOut على جلسة عضو حقيقية عند انتهاء وقته.
    try {
      const t = s.guestTimers || {};
      if (t.warn) clearTimeout(t.warn);
      if (t.expire) clearTimeout(t.expire);
    } catch {
      // non-critical
    }

    // امسح هوية الزائر من المتجر بلا شروط: سابقة كانت تشترط isGuest فقط
    // فتبقى userRole='guest' عالقة إذا كان المتجر مكتوباً يدوياً (غير isGuest).
    set({
      user: null,
      userRole: null,
      isAuthenticated: false,
      guestSession: { active: false, phone: "", startedAt: null, expiresAt: null, warnedAt: null },
      guestTimers: { warn: null, expire: null },
      guestWarning: false,
      guestExpired: false,
    });

    // أبطل مفعول جلسة الزائر المحفوظة (localStorage — chic-guest-session) فوراً
    // حتى لا تستعيدها إعادة التهيئة بعد تحديث/تنقل وتعيد تشغيل مؤقّتاتها.

    try {
      localStorage.removeItem('chic-guest-session');
    } catch {
      // non-critical
    }

    if (wasGuestActive || hadGuestUser) {
      // إشعار هامشي فقط عند وجود شيء يُمسح فعلاً — يمنع ضجيج السجلات
      await get().notifyOwners?.(`مسح جلسة زائر سابقة عند دخول عضو حقيقي`, { action: 'GUEST_CLEARED' }).catch(() => {});
    }
    return { success: true };
  },

  // تسجيل الدخول بكلمة مرور مع فرض قائمة السماح
  login: async (email, password) => {
    set({ error: null, loading: true });
    try {
      if (!isAllowedEmail(email)) {
        await addLog("UNAUTHORIZED_LOGIN_ATTEMPT", email, "guest");
        await get().notifyOwners(`محاولة دخول غير مصرّح بها: ${email}`, {
          action: "UNAUTHORIZED_LOGIN_ATTEMPT",
        });
        set({ loading: false, error: "الحساب غير مصرح له بالدخول" });
        return { success: false, error: "الحساب غير مصرح له بالدخول" };
      }

      const authInstance = getAuth();
      const cred = await signInWithEmailAndPassword(authInstance, email, password);

      // ترقية الدور للمالك إن لزم
      if (isOwnerEmail(email)) {
        try {
          await updateDoc(doc(db, "users", cred.user.uid), { role: "owner" });
        } catch {
        // Silently fail - non-critical operation
      }
      }

      // إرسال توثيق البريد إن لم يكن موثقاً
      if (!cred.user.emailVerified) {
        try {
          await sendEmailVerification(cred.user);
          set({
            tempEmail: email,
            otpSent: true,
            loading: false,
            emailVerificationRequired: true,
            emailVerificationSentAt: Date.now(),
          });
        } catch (e) {
          set({
            tempEmail: email,
            otpSent: true,
            loading: false,
            emailVerificationRequired: true,
          });
        }
      } else {
        set({
          tempEmail: "",
          otpSent: false,
          loading: false,
          emailVerificationRequired: false,
        });
      }

      await get().notifyOwners(`تسجيل دخول: ${email}`, { action: "LOGIN" });
      return { success: true };
    } catch (err) {
      set({ loading: false, error: err.message });
      return { success: false, error: err.message };
    }
  },

  // تسجيل الدخول عبر Google (Popup) مع فرض قائمة السماح
  loginWithGooglePopup: async () => {
    set({ error: null, loading: true });
    try {
      const authInstance = getAuth();
      const provider = new GoogleAuthProvider();
      const { user: gUser } = await signInWithPopup(authInstance, provider);

      if (!isAllowedEmail(gUser.email)) {
        await addLog(
          "UNAUTHORIZED_GOOGLE_LOGIN",
          gUser.email,
          gUser.email || "unknown"
        );
        await get().notifyOwners(`محاولة Google غير مصرّح بها: ${gUser.email}`, {
          action: "UNAUTHORIZED_GOOGLE_LOGIN",
        });
        markManualSignOut();
        await signOut(authInstance);
        set({ loading: false, error: "الحساب غير مصرح له بالدخول" });
        return { success: false, error: "الحساب غير مصرح له بالدخول" };
      }

      // إنشاء/تحديث وثيقة المستخدم
      const userRef = doc(db, "users", gUser.uid);
      const snap = await getDoc(userRef);

      const role = isOwnerEmail(gUser.email) ? "owner" : "user";

      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: gUser.uid,
          email: gUser.email,
          name: gUser.displayName || "مستخدم",
          role,
          status: "active",
          createdAt: serverTimestamp(),
          favorites: [],
        });
      } else {
        await updateDoc(userRef, { role });
      }

      await addLog("GOOGLE_LOGIN", gUser.email, gUser.email);
      await get().notifyOwners(`تسجيل دخول Google: ${gUser.email}`, {
        action: "LOGIN",
      });
      set({ loading: false, otpSent: false });
      return { success: true };
    } catch (err) {
      set({ loading: false, error: err.message });
      return { success: false, error: err.message };
    }
  },

  // تسجيل الدخول عبر Google (تمرير كائن خارجي) مع فرض قائمة السماح
  loginWithGoogle: async (googleUser) => {
    set({ error: null, loading: true });
    try {
      if (!isAllowedEmail(googleUser?.email)) {
        await get().notifyOwners(`محاولة Google غير مصرّح بها: ${googleUser?.email || "unknown"}`, {
          action: "UNAUTHORIZED_GOOGLE_LOGIN",
        });
        set({ loading: false, error: "الحساب غير مصرح له بالدخول" });
        return { success: false, error: "الحساب غير مصرح له بالدخول" };
      }

      if (!googleUser?.uid || !googleUser?.email) {
        throw new Error("بيانات Google غير صالحة");
      }

      const role = isOwnerEmail(googleUser.email) ? "owner" : "user";

      const userRef = doc(db, "users", googleUser.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: googleUser.uid,
          email: googleUser.email,
          name: googleUser.displayName || "مستخدم",
          role,
          status: "active",
          createdAt: serverTimestamp(),
          favorites: [],
        });
      } else {
        await updateDoc(userRef, { role });
      }

      const userData = {
        uid: googleUser.uid,
        email: googleUser.email,
        name: googleUser.displayName || "مستخدم",
        role,
        status: "active",
      };

      set({
        user: userData,
        userRole: role,
        isAuthenticated: true,
        loading: false,
        otpSent: false,
        emailVerificationRequired: false,
        tempEmail: "",
      });

      await addLog("GOOGLE_LOGIN", userData.email, userData.email);
      await get().notifyOwners(`تسجيل دخول Google: ${userData.email}`, {
        action: "LOGIN",
      });
      return { success: true };
    } catch (err) {
      set({ loading: false, error: err.message });
      return { success: false, error: err.message };
    }
  },

  // التسجيل مقيّد للبريدين المصرّح بهما فقط
  register: async (email, password, name) => {
    set({ error: null, loading: true });
    try {
      if (!isAllowedEmail(email)) {
        await get().notifyOwners(`محاولة تسجيل غير مصرّح بها: ${email}`, {
          action: "UNAUTHORIZED_REGISTER",
        });
        set({ loading: false, error: "التسجيل مغلق لغير الحسابات المصرح بها" });
        return {
          success: false,
          error: "التسجيل مغلق لغير الحسابات المصرح بها",
        };
      }

      const authInstance = getAuth();
      const cred = await createUserWithEmailAndPassword(authInstance, email, password);
      await updateProfile(cred.user, { displayName: name });
      await sendEmailVerification(cred.user);

      const role = isOwnerEmail(email) ? "owner" : "user";

      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        email,
        name,
        role,
        status: "active",
        createdAt: serverTimestamp(),
        favorites: [],
      });

      set({
        loading: false,
        otpSent: true,
        tempEmail: email,
        emailVerificationRequired: true,
        emailVerificationSentAt: Date.now(),
      });

      await addLog("USER_REGISTER", email, email);
      await get().notifyOwners(`تسجيل جديد: ${email}`, { action: "REGISTER" });

      return { success: true };
    } catch (err) {
      set({ loading: false, error: err.message });
      return { success: false, error: err.message };
    }
  },

  logout: async () => {
    try {
      const u = getEffectiveUser();
      if (u) {
        await addLog("USER_LOGOUT", u.email, u.email);
        await get().notifyOwners(`تسجيل خروج: ${u.email}`, { action: "LOGOUT" });
      }
    } catch {
      // Silently fail - logging is non-critical
    }
    try {
      get().clearAllListeners();
      markManualSignOut();
      const authInstance = getAuth();
      await signOut(authInstance);
    } finally {
      set({
        user: null,
        userRole: null,
        isAuthenticated: false,
        otpSent: false,
        tempEmail: "",
        emailVerificationRequired: false,
        emailVerificationSentAt: null,
        guestWarning: false,
        guestExpired: false,
      });
    }
  },

  // جلسة الزائر المجانية (دقيقتان)
  startGuestSession: async (phone) => {
    // إنهِ أي جلسة زائر سابقة
    if (get().guestSession.active) {
      await get().endGuestSession("restart");
    }

    try {
      await addDoc(collection(db, "guestSessions"), {
        startedAt: serverTimestamp(),
        status: "active",
      });
    } catch {
      // Silently fail - guest session logging is non-critical
    }

    const started = Date.now();
    const expiresAt = started + 30 * 60 * 1000; // 30 دقيقة
    const warnedAt = expiresAt - 15000; // تحذير قبل 15 ثانية

    set({
      guestSession: { active: true, phone: String(phone || "").trim(), startedAt: started, expiresAt, warnedAt },
      guestWarning: false,
      guestExpired: false,
    });

    // جدولة مؤقتات التحذير/الانتهاء (تتحقق من الانتهاء الفوري)
    get()._scheduleGuestTimers();

    await get().notifyOwners(`زائر دخل: ${phone}`, { action: "GUEST_ENTER" });
    return { success: true };
  },

  // إعادة جدولة مؤقتات الزائر بعد استرجاع الحالة من التخزين (refresh/تنقل مباشر).
  rescheduleGuestTimers: () => {
    const s = get().guestSession;
    if (!s?.active || !s.expiresAt) return;
    if (s.expiresAt <= Date.now()) {
      // الجلسة منتهية أثناء غياب الصفحة — تُمسح بصمت دون ضبط guestExpired:
      // ضبطه هنا كان ينطلق فور تحميل الصفحة، وإن كان المستخدم الحالي عضواً
      // (مالك/مسجّل) دخل للتو بينما isAuthenticated لم يكتمل بعد، فإن تأثير
      // App.jsx يقرأ guestExpired=true ويطرده لـ /login رغم نجاح دخوله.
      set({
        guestSession: { active: false, phone: "", startedAt: null, expiresAt: null, warnedAt: null },
        guestWarning: false,
        guestExpired: false,
        guestTimers: { warn: null, expire: null },
      });
      return;
    }
    get()._scheduleGuestTimers();
  },

  // جدولة warn/expire بناءً على guestSession الحالية (داخلية)
  _scheduleGuestTimers: () => {
    const s = get().guestSession;
    if (!s?.active || !s.expiresAt) return;
    const { guestTimers } = get();
    try {
      if (guestTimers?.warn) clearTimeout(guestTimers.warn);
      if (guestTimers?.expire) clearTimeout(guestTimers.expire);
    } catch {
      // timer cleanup is non-critical
    }

    const phone = s.phone;
    const warnedAt = s.warnedAt || (s.expiresAt - 10000);
    const warnMs = Math.max(0, warnedAt - Date.now());
    const expireMs = Math.max(0, s.expiresAt - Date.now());

    let warnTimer = null;
    if (warnMs > 0) {
      warnTimer = setTimeout(async () => {
        set({ guestWarning: true });
        await get().notifyOwners(`تحذير زائر (قرب انتهاء الجلسة): ${phone}`, {
          action: "GUEST_WARN",
        });
      }, warnMs);
    } else {
      set({ guestWarning: true });
    }

    const expireTimer = setTimeout(async () => {
      const cur = get().guestSession;
      recordKick("guest-timer-expired", { phone: cur?.phone || "" });
      // المؤقّت خاص بالزائر المجهول فقط — كان signOut بلا شرط يُسقِط جلسة
      // المالك/العضو إذا دخل أثناء بقاء مؤقّت زائر سابق فيُرمى لـ /login.
      let liveAuthUser = null;
      try {
        liveAuthUser = getAuth()?.currentUser || null;
      } catch {
        liveAuthUser = null;
      }
      const memberActive = !!liveAuthUser && !liveAuthUser.isAnonymous;
      if (liveAuthUser?.isAnonymous) {
        try {
          await signOut(getAuth());
        } catch {
          // ignore
        }
      }
      set({
        ...(memberActive ? {} : { user: null, userRole: null, isAuthenticated: false }),
        guestSession: {
          active: false,
          phone: cur.phone,
          startedAt: cur.startedAt,
          expiresAt: cur.expiresAt,
          warnedAt: cur.warnedAt,
        },
        guestWarning: false,
        guestExpired: !memberActive,
        guestTimers: { warn: null, expire: null },
      });
      try {
        await addDoc(collection(db, "guestSessions"), {
          endedAt: serverTimestamp(),
          status: "expired",
        });
      } catch {
        // Silently fail - non-critical operation
      }
      await get().notifyOwners(`انتهت جلسة زائر: ${phone}`, {
        action: "GUEST_EXPIRE",
      });
    }, expireMs);

    set({ guestTimers: { warn: warnTimer, expire: expireTimer } });
  },

  endGuestSession: async (reason = "manual") => {
    const { guestTimers, guestSession } = get();
    try {
      if (guestTimers?.warn) clearTimeout(guestTimers.warn);
      if (guestTimers?.expire) clearTimeout(guestTimers.expire);
    } catch {
      // Silently fail - timer cleanup is non-critical
    }
    try {
      if (guestSession?.phone) {
        await addDoc(collection(db, "guestSessions"), {
          endedAt: serverTimestamp(),
          status: reason,
        });
        await get().notifyOwners(`إنهاء جلسة زائر: ${guestSession.phone}`, {
          action: "GUEST_END",
          reason,
        });
      }
    } catch {
      // Silently fail - guest session logging is non-critical
    }
    // امسح هوية الزائر الراكدة من المتجر أيضاً: guestLogin يضبط
    // user/userRole='guest'/isAuthenticated، ودخول عضو (مالك/مستخدم) بعده في
    // نفس التبويب لا يمر على المتجر أصلاً، فتبقى الهوية 'guest' عالقة فيرى
    // ProtectedRoute العضوَ زائراً (يطرده من صفحات blockGuest) وترجع
    // getEffectiveRole/getEffectiveUser زائراً بدل العضو الحقيقي.
    const staleGuestIdentity = get().user?.isGuest
      ? { user: null, userRole: null, isAuthenticated: false }
      : {};
    set({
      ...staleGuestIdentity,
      guestSession: { active: false, phone: "", startedAt: null, expiresAt: null, warnedAt: null },
      guestTimers: { warn: null, expire: null },
      guestWarning: false,
      guestExpired: false,
    });
    return { success: true };
  },

  // تسجيل دخول الزائر — البريد الموثق عبر OTP إلزامي (يُمرَّر بعد التحقق)
  guestLogin: async (verifiedEmail = null) => {
    const guestPhone = "زائر-" + Math.floor(Math.random() * 9000 + 1000);
    try {
      // استخدام Firebase Anonymous auth كما طُلب
      try {
        const authInstance = getAuth();
        await signInAnonymously(authInstance);
      } catch {
        // المتابعة حتى لو تعذّر Anonymous (التخزين المحلي يكفي للزائر)
      }
      await get().startGuestSession(guestPhone);
      const prevGuest = get().guestSession || {};
      set({
        user: {
          uid: "guest-" + Date.now(),
          phone: guestPhone,
          email: verifiedEmail || undefined,
          isGuest: true,
        },
        guestSession: {
          ...prevGuest,
          email: verifiedEmail || undefined,
        },
        userRole: "guest",
        isAuthenticated: true,
        loading: false,
        error: null,
      });
      await get().notifyOwners(`دخول زائر جديد: ${guestPhone}${verifiedEmail ? ` (${verifiedEmail})` : ''}`, { action: "GUEST_LOGIN" });
      return { success: true };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  getGuestRemaining: () => {
    const s = get().guestSession;
    if (!s.active || !s.expiresAt) return 0;
    return Math.max(0, s.expiresAt - Date.now());
  },

  // ========== OTP عبر البريد (Cloudflare Functions + Resend + D1) ==========
  // إرسال كود تحقق 6 أرقام للبريد
  sendOtp: async (email, purpose = "login") => {
    try {
      const res = await fetch(`${API_BASE}/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || "تعذّر إرسال الكود" };
    } catch (err) {
      return { success: false, error: "تعذّر الاتصال بالخادم" };
    }
  },

  // التحقق من كود OTP
  verifyOtp: async (email, code, purpose = "login") => {
    try {
      const res = await fetch(`${API_BASE}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, purpose }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || "الكود غير صحيح" };
    } catch (err) {
      return { success: false, error: "تعذّر الاتصال بالخادم" };
    }
  },

  // بيانات التطبيق الأخرى
  fetchAllData: () => {
    const u = getEffectiveUser();
    if (!u) return;

    // المنتجات
    const unsubProducts = onSnapshot(
      collection(db, "products"),
      (snap) =>
        set({
          products: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        }),
      (err) => set({ error: err.message })
    );
    get().addListener("products", unsubProducts);

    // المستخدمون
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) =>
        set({
          users: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        }),
      (err) => set({ error: err.message })
    );
    get().addListener("users", unsubUsers);

    // الفروع
    const unsubBranches = onSnapshot(
      collection(db, "branches"),
      (snap) =>
        set({
          branches: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        }),
      (err) => set({ error: err.message })
    );
    get().addListener("branches", unsubBranches);
  },

  fetchStats: async () => {
    const u = getEffectiveUser();
    if (!u) return;

    try {
      const productsSnap = await getDocs(collection(db, "products"));
      const usersSnap = await getDocs(collection(db, "users"));

      set({
        stats: {
          totalProducts: productsSnap.size,
          totalUsers: usersSnap.size,
        },
      });
    } catch (err) {
      set({ error: err.message });
    }
  },

  addProduct: async (data) => {
    const u = getEffectiveUser();
    if (!u) return { success: false, error: "يرجى تسجيل الدخول" };

    try {
      const docRef = await addDoc(collection(db, "products"), {
        ...data,
        createdAt: serverTimestamp(),
        boostedAt: serverTimestamp(),
      });

      await addLog("ADD_PRODUCT", data?.title || docRef.id, u.email);
      return { success: true, id: docRef.id };
    } catch (err) {
      set({ error: err.message });
      return { success: false, error: err.message };
    }
  },

  deleteProduct: async (id, title) => {
    const u = getEffectiveUser();
    if (!u) return { success: false, error: "يرجى تسجيل الدخول" };

    try {
      await deleteDoc(doc(db, "products", id));
      await addLog("DELETE_PRODUCT", title || id, u.email);
      return { success: true };
    } catch (err) {
      set({ error: err.message });
      return { success: false, error: err.message };
    }
  },

  boostProduct: async (id, title) => {
    const u = getEffectiveUser();
    if (!u) return { success: false, error: "يرجى تسجيل الدخول" };

    try {
      await updateDoc(doc(db, "products", id), {
        boostedAt: serverTimestamp(),
      });
      await addLog("BOOST_PRODUCT", title || id, u.email);
      return { success: true };
    } catch (err) {
      set({ error: err.message });
      return { success: false, error: err.message };
    }
  },

  toggleFavorite: async (productId) => {
    const u = getEffectiveUser();
    if (!u) return { success: false, error: "يرجى تسجيل الدخول" };

    try {
      const userRef = doc(db, "users", u.uid);
      const isFav = get().favorites.includes(productId);

      await updateDoc(userRef, {
        favorites: isFav ? arrayRemove(productId) : arrayUnion(productId),
      });

      set({
        favorites: isFav
          ? get().favorites.filter((id) => id !== productId)
          : [...get().favorites, productId],
      });

      await addLog(isFav ? "UNFAVORITE" : "FAVORITE", productId, u.email);
      return { success: true };
    } catch (err) {
      set({ error: err.message });
      return { success: false, error: err.message };
    }
  },

  // التحقق عبر توثيق البريد
  verifyOTP: async () => {
    try {
      const u = getAuth().currentUser;
      if (!u) return { success: false, error: "لا يوجد مستخدم حالياً" };
      await u.reload();
      if (u.emailVerified) {
        set({
          otpSent: false,
          emailVerificationRequired: false,
          tempEmail: "",
        });
        return { success: true };
      }
      return { success: false, error: "لم يتم توثيق البريد بعد" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  resendOTP: async () => {
    try {
      const u = getAuth().currentUser;
      if (!u) return { success: false, error: "لا يوجد مستخدم حالياً" };

      const last = get().emailVerificationSentAt;
      if (last && Date.now() - last < 60000) {
        return { success: false, error: "الرجاء الانتظار قبل إعادة الإرسال" };
      }

      await sendEmailVerification(u);
      set({ emailVerificationSentAt: Date.now(), otpSent: true });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  sendMessage: async (receiverId, receiverEmail, text) => {
    const u = getEffectiveUser();
    if (!u) return { success: false, error: "يرجى تسجيل الدخول" };
    try {
      await addDoc(collection(db, "messages"), {
        senderId: u.uid,
        senderEmail: u.email,
        receiverId,
        receiverEmail,
        text,
        createdAt: serverTimestamp(),
        read: false,
      });

      await addLog("SEND_MESSAGE", `To: ${receiverEmail}`, u.email);
      return { success: true };
    } catch (err) {
      set({ error: err.message });
      return { success: false, error: err.message };
    }
  },

  markMessageAsRead: async (messageId) => {
    const u = getEffectiveUser();
    if (!u) return { success: false, error: "يرجى تسجيل الدخول" };
    try {
      await updateDoc(doc(db, "messages", messageId), { read: true });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  startMessagesListener: () => {
    const u = getEffectiveUser();
    if (!u) return;

    const qInbox = query(
      collection(db, "messages"),
      where("receiverId", "==", u.uid),
      orderBy("createdAt", "desc")
    );

    const qOutbox = query(
      collection(db, "messages"),
      where("senderId", "==", u.uid),
      orderBy("createdAt", "desc")
    );

    const unsubInbox = onSnapshot(
      qInbox,
      (snap) =>
        set({
          messages: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        }),
      (err) => set({ error: err.message })
    );

    const unsubOutbox = onSnapshot(
      qOutbox,
      () => {},
      (err) => set({ error: err.message })
    );

    get().addListener("messages-inbox", unsubInbox);
    get().addListener("messages-outbox", unsubOutbox);
  },

  startAllMessagesListener: () => {
    const user = getEffectiveUser();
    if (!user || getEffectiveRole() !== "owner") return;

    const qAll = query(
      collection(db, "messages"),
      orderBy("createdAt", "desc"),
      limit(200)
    );

    const unsub = onSnapshot(
      qAll,
      (snap) =>
        set({
          allMessages: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        }),
      (err) => set({ error: err.message })
    );

    get().addListener("all-messages", unsub);
  },

  banUser: async (id, email, status) => {
    const u = getEffectiveUser();
    if (!u) return { success: false, error: "يرجى تسجيل الدخول" };
    try {
      await updateDoc(doc(db, "users", id), { status });

      await addLog(
        status === "banned" ? "BAN_USER" : "UNBAN_USER",
        email,
        u.email
      );

      set({
        users: get().users.map((x) => (x.id === id ? { ...x, status } : x)),
      });

      return { success: true };
    } catch (err) {
      set({ error: err.message });
      return { success: false, error: err.message };
    }
  },

  promoteUser: async (id, email, role) => {
    const u = getEffectiveUser();
    if (!u) return { success: false, error: "يرجى تسجيل الدخول" };
    try {
      await updateDoc(doc(db, "users", id), { role });

      await addLog("PROMOTE_USER", `${email} to ${role}`, u.email);

      set({
        users: get().users.map((x) => (x.id === id ? { ...x, role } : x)),
      });

      return { success: true };
    } catch (err) {
      set({ error: err.message });
      return { success: false, error: err.message };
    }
  },

  startLogsListener: () => {
    const u = getEffectiveUser();
    if (!u) return;

    const qLogs = query(
      collection(db, "logs"),
      orderBy("time", "desc"),
      limit(200)
    );

    const unsub = onSnapshot(
      qLogs,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          time: d.data().time?.toDate ? d.data().time.toDate() : null,
        }));
        set({ logs: items });
      },
      (err) => set({ error: err.message })
    );

    get().addListener("logs", unsub);
  },
    }),
    {
      name: "chic-guest-session",
      storage: createJSONStorage(() => localStorage),
      // احفظ حالة جلسة الزائر فقط (لا المؤقتات ولا المراقبات ولا بيانات المستخدم الحساسة)
      partialize: (state) => ({
        guestSession: state.guestSession,
        guestWarning: state.guestWarning,
        guestExpired: state.guestExpired,
      }),
      onRehydrateStorage: () => (state) => {
        // بعد استرجاع الحالة من التخزين: أعد جدولة المؤقتات إذا كانت الجلسة فعّالة
        if (state?.guestSession?.active) {
          try {
            state.rescheduleGuestTimers?.();
          } catch {
            // non-critical
          }
        }
      },
    }
  )
);

// userRole في المتجر لا يُزامَن مع جلسة Firebase (دخول Login.jsx يتم عبر
// AuthContext مباشرة)، فيبقى null وتتعطّل كل دوال لوحة المالك التي تحرس
// نفسها بـ get().user. هذه الدوال تسقط على جلسة Firebase الحية كحل أخير.
const getEffectiveUser = () => {
  const storeUser = useStore.getState().user;
  if (storeUser) return storeUser;
  try {
    const firebaseUser = getAuth().currentUser;
    return firebaseUser
      ? { uid: firebaseUser.uid, email: firebaseUser.email }
      : null;
  } catch {
    return null;
  }
};

const getEffectiveRole = () => {
  const storeRole = useStore.getState().userRole;
  if (storeRole) return storeRole;
  const email = getEffectiveUser()?.email;
  if (!email) return null;
  return isOwnerEmail(email) ? "owner" : "user";
};

export default useStore;
export { getEffectiveUser, getEffectiveRole };