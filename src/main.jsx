import './firebase/config'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import './index.css'
import './styles/contour-theme.css'
import './styles/logo-clean.css'
import './styles/rooz-royal.css'
import './styles/rooz-pearl.css'
import './styles/theme.css'
import './styles/rooz-luxury-3d.css'
import './styles/rooz-site-backdrop.css'

/* ── استقرار تحميل المقاطع (chunks) ──
 * عند فشل تحميل أي مقطع ديناميكي (بصمة قديمة بعد نشر جديد، أو خطأ MIME
 * مؤقت في الشبكة) نعيد تحميل الصفحة مرة واحدة فقط — باستخدام نفس المفتاح
 * المنسق مع App.jsx و AdminPage.jsx — ثم نستكمل عادي.
 * هذا يقضي نهائياً على شاشات التجمّد/إعادة التحميل التي لا تنتهي. */
const chunkReloadKey = 'chunkReloadOnce';
const scheduleReload = () => {
  try {
    if (!sessionStorage.getItem(chunkReloadKey)) {
      sessionStorage.setItem(chunkReloadKey, '1');
      // مهلة قصيرة كي تظهر أي شاشة تحميل حالية قبل إعادة التحميل
      setTimeout(() => window.location.reload(), 150);
    }
  } catch {
    // تجاهل — خاصية sessionStorage قد تكون محجوبة في بعض المتصفحات
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    // منع ظهور الخطأ في الكونسول — سنعيد التحميل تلقائياً بدلاً منه
    event.preventDefault();
    scheduleReload();
  });
  // تسوية لأي فشل في تحميل مقطع من أصولنا المحلية (/assets/*.js) فقط —
  // لضمان عدم إعادة التحميل بسبب سكربتات خارجية محجوبة (تحليلات، إعلانات).
  window.addEventListener('error', (event) => {
    const target = event.target;
    const src = (target && (target.src || target.href)) || '';
    if (/\/assets\/[^"]+\.js($|\?)/.test(src) && !sessionStorage.getItem(chunkReloadKey)) {
      scheduleReload();
    }
  }, true);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)