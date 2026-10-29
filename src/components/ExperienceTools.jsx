import React, { useEffect, useState } from 'react';
import { ArrowUp, WifiOff } from 'lucide-react';

const ExperienceTools = () => {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const updateScroll = () => setShowTop(window.scrollY > 320);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    updateScroll();
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return (
    <>
      {!online && (
        <div className="alm-offline-banner" role="status">
          <WifiOff size={15} aria-hidden="true" />
          أنت غير متصل حاليًا — سيتم تحديث البيانات عند عودة الاتصال
        </div>
      )}
      {showTop && (
        <button
          type="button"
          className="alm-scroll-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="العودة إلى أعلى الصفحة"
          title="العودة إلى الأعلى"
        >
          <ArrowUp size={18} />
        </button>
      )}
      <style>{`
        .alm-offline-banner {
          position: fixed;
          z-index: 1500;
          top: calc(8px + env(safe-area-inset-top));
          inset-inline: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 9px 12px;
          border: 1px solid rgba(170, 75, 54, .3);
          border-radius: 12px;
          background: rgba(255, 245, 241, .96);
          color: #8a3d2c;
          box-shadow: 0 8px 22px rgba(0,0,0,.12);
          font: 800 12px Tajawal, sans-serif;
          direction: rtl;
        }
        .alm-scroll-top {
          position: fixed;
          z-index: 1200;
          inset-inline-start: 16px;
          bottom: calc(82px + env(safe-area-inset-bottom));
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(var(--rz-primary-rgb), .3);
          border-radius: 50%;
          background: var(--rz-primary);
          color: var(--rz-white);
          box-shadow: 0 10px 24px rgba(var(--rz-primary-rgb), .28);
          cursor: pointer;
          animation: almToolIn .2s ease-out both;
        }
        @keyframes almToolIn {
          from { opacity: 0; transform: translateY(8px) scale(.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .alm-scroll-top { animation: none; }
        }
      `}</style>
    </>
  );
};

export default ExperienceTools;
