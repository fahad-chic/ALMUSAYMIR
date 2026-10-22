// src/components/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { Bell, Eye, Volume2, VolumeX, LogOut, ShieldCheck, MousePointerClick, Type, Contrast, ZapOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import usePrefs, { FONT_SCALES } from '../../store/usePrefs';
import useNotifications from '../../store/useNotifications';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = {
  owner: 'صاحب موقع "المسيمير | ALMUSAYMIR"',
  admin: 'مشرف',
  employee: 'موظف',
  user: 'مستخدم',
  guest: 'زائر',
};

const Toggle = ({ on, onClick, dangerOff = false }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
      on ? (dangerOff ? 'bg-red-600' : 'bg-luxury-gold') : 'bg-gray-600'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
        on ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

export default function SettingsPage() {
  const { user, userRole, logout } = useAuth();
  const navigate = useNavigate();

  // التفضيلات الحقيقية الموحدة (usePrefs) — كانت الصفحة تقرأ مفاتيح
  // muteAudio/incognitoMode من useStore وهي غير موجودة أصلاً، فأي ضغطة
  // على المبدّلين كانت ترمي TypeError وتكسر الصفحة بالكامل.
  const {
    clickSound,
    fontSize,
    highContrast,
    reduceMotion,
    welcomeSound,
    incognito,
    toggleClickSound,
    setFontSize,
    toggleHighContrast,
    toggleReduceMotion,
    toggleWelcomeSound,
    toggleIncognito,
  } = usePrefs();

  // مبدّل «الإشعارات المباشرة» يتحكم فعلياً في جرس الإشعارات داخل الموقع
  // (useNotifications.muted) — كان قديماً يخزن علماً في localStorage بلا أثر.
  const notificationsMuted = useNotifications((s) => s.muted);
  const toggleNotificationsMuted = useNotifications((s) => s.toggleMuted);

  const [lastLogin, setLastLogin] = useState(null);

  // آخر تسجيل دخول يُقرأ من وثيقة المستخدم في Firestore — كائن Firebase
  // نفسه لا يحمل هذا الحقل، وقراءته منه كانت تعرض «---» دائماً.
  useEffect(() => {
    let cancelled = false;
    if (!user?.uid || !db) return undefined;
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (!cancelled && snap.exists()) setLastLogin(snap.data()?.lastLogin || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const loginDate = lastLogin?.toDate
    ? lastLogin.toDate().toLocaleString('ar-SA', {
        timeZone: 'Asia/Riyadh',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '---';

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen w-full marble-bg flex items-center justify-center">
        <div className="glass-morphism-gold p-6 rounded-xl text-center text-xs text-red-300">
          <p className="font-bold"> يجب تسجيل الدخول للوصول إلى الإعدادات</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full marble-bg overflow-y-auto no-scroll font-Tajawal">
      <div className="max-w-2xl mx-auto p-4 md:p-8">

        {/* الرسالة الأمنية الملكية الجديدة */}
        <div className="glass-morphism-gold p-4 rounded-lg text-xs text-red-300 mb-6 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-luxury-gold" />
          <p>
            <span className="font-bold text-luxury-gold"> حماية البيانات:</span><br />
            تخضع جميع بيانات المستخدمين والزائرين والرسائل الخاصة والمعاملات الداخلية لحماية صارمة 
            وتشفير عالمي متقدم 
            <span className="text-luxury-gold font-bold">(تشفير بموجب بروتوكولات عالمية محمية وسرية ومتعددة الطبقات)</span>،
            وتُعتبر سرية للغاية ولا يُسمح لأي جهة أو فرد بالاطلاع عليها أو الوصول إليها أو المساس بها،
            التزامًا بمعايير الأمان الدولية.
            <br />
            <span className="text-gray-300 italic">
              All user and visitor data is fully encrypted and cannot be accessed or viewed by any unauthorized party.
            </span>
          </p>
        </div>

        {/* العنوان */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold hero-text mb-2">الإعدادات والتحكم</h1>
          <p className="text-gray-400 text-sm">تحكم بإعدادات حسابك وتفضيلاتك الشخصية</p>
        </div>

        {/* معلومات الحساب */}
        <div className="glass-morphism-gold rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-luxury-gold mb-4">معلومات الحساب</h2>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">البريد الإلكتروني</p>
              <p className="text-luxury-gold font-semibold break-all">{user?.email}</p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1">الرتبة</p>
              <p className="text-luxury-gold font-semibold">
                {ROLE_LABELS[userRole] || 'مستخدم'}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1">آخر تسجيل دخول</p>
              <p className="text-luxury-gold font-semibold" dir="ltr">{loginDate}</p>
            </div>
          </div>
        </div>

        {/* إعدادات الموقع الرسمية — تُحفظ على جهاز الزائر وتنطبق على كل الصفحات */}
        <div className="glass-morphism-gold rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-luxury-gold mb-4">إعدادات الموقع الرسمية</h2>

          <div className="space-y-4">

            {/* صوت الضغط على الأزرار */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MousePointerClick className="w-5 h-5 text-luxury-gold" />
                <div>
                  <p className="font-semibold text-sm">صوت الضغط على الأزرار</p>
                  <p className="text-xs text-gray-400">نقرة خفيفة عند الضغط على أي زر أو خيار في الموقع</p>
                </div>
              </div>
              <Toggle on={clickSound} onClick={toggleClickSound} />
            </div>

            {/* حجم الخط */}
            <div className="border-t border-luxury-gold/10 pt-4">
              <div className="flex items-center gap-3 mb-3">
                <Type className="w-5 h-5 text-luxury-gold" />
                <div>
                  <p className="font-semibold text-sm">حجم الخط</p>
                  <p className="text-xs text-gray-400">تكبير نصوص الموقع بالكامل لسهولة القراءة</p>
                </div>
              </div>
              <div className="flex gap-2" role="group" aria-label="حجم الخط">
                {FONT_SCALES.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFontSize(opt.key)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition ${
                      fontSize === opt.key
                        ? 'bg-luxury-gold text-black border-luxury-gold'
                        : 'bg-transparent text-gray-300 border-luxury-gold/30 hover:border-luxury-gold'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* التباين العالي */}
            <div className="flex items-center justify-between border-t border-luxury-gold/10 pt-4">
              <div className="flex items-center gap-3">
                <Contrast className="w-5 h-5 text-luxury-gold" />
                <div>
                  <p className="font-semibold text-sm">التباين العالي</p>
                  <p className="text-xs text-gray-400">زيادة وضوح النصوص والروابط</p>
                </div>
              </div>
              <Toggle on={highContrast} onClick={toggleHighContrast} />
            </div>

            {/* تقليل الحركة */}
            <div className="flex items-center justify-between border-t border-luxury-gold/10 pt-4">
              <div className="flex items-center gap-3">
                <ZapOff className="w-5 h-5 text-luxury-gold" />
                <div>
                  <p className="font-semibold text-sm">تقليل الحركة</p>
                  <p className="text-xs text-gray-400">إيقاف الحركات والمؤثرات المتحركة في الموقع</p>
                </div>
              </div>
              <Toggle on={reduceMotion} onClick={toggleReduceMotion} />
            </div>

          </div>
        </div>

        {/* الخصوصية والصوت */}
        <div className="glass-morphism-gold rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-luxury-gold mb-4">الخصوصية والصوت</h2>

          <div className="space-y-4">

            {/* وضع التخفي */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-luxury-gold" />
                <div>
                  <p className="font-semibold text-sm">وضع التخفي</p>
                  <p className="text-xs text-gray-400">إيقاف إشعارات دخولك وخروجك التي تصل لغرفة المالك</p>
                </div>
              </div>

              <Toggle on={incognito} onClick={toggleIncognito} />
            </div>

            {/* الصوت الترحيبي */}
            <div className="flex items-center justify-between border-t border-luxury-gold/10 pt-4">
              <div className="flex items-center gap-3">
                {welcomeSound ? (
                  <Volume2 className="w-5 h-5 text-luxury-gold" />
                ) : (
                  <VolumeX className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className="font-semibold text-sm">الصوت الترحيبي</p>
                  <p className="text-xs text-gray-400">صوت الترحيب الملكي عند دخول صاحب الموقع</p>
                </div>
              </div>

              <Toggle on={welcomeSound} onClick={toggleWelcomeSound} />
            </div>

          </div>
        </div>

        {/* الإشعارات */}
        <div className="glass-morphism-gold rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-luxury-gold mb-4">الإشعارات</h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-luxury-gold" />
              <div>
                <p className="font-semibold text-sm">الإشعارات المباشرة</p>
                <p className="text-xs text-gray-400">جرس الإشعارات داخل الموقع — إشعارات الإدارة تصلك فوراً</p>
              </div>
            </div>

            <Toggle on={!notificationsMuted} onClick={toggleNotificationsMuted} />
          </div>
        </div>

        {/* تسجيل الخروج */}
        <button
          onClick={handleLogout}
          className="w-full btn-gold flex items-center justify-center gap-2 mb-4 hover:scale-105 transition"
        >
          <LogOut size={18} />
          تسجيل الخروج
        </button>

        {/* الفوتر */}
        <div className="glass-morphism-gold rounded-lg p-4 text-center text-xs text-gray-400">
          <p>إصدار 1.0.0 - المسيمير | ALMUSAYMIR</p>
          <p className="mt-2">منصة معتمدة تتبع رؤية 2030</p>
        </div>

      </div>
    </div>
  );
}
