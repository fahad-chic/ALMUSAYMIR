import React, { useEffect, useState } from 'react';
import { Bell, Home, MessageCircle, PackageSearch, Download } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const MobileBottomNav = ({ visible = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [installEvent, setInstallEvent] = useState(null);

  useEffect(() => {
    const onInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => window.removeEventListener('beforeinstallprompt', onInstall);
  }, []);

  if (!visible) return null;

  const items = [
    { label: 'الرئيسية', icon: Home, path: '/' },
    { label: 'الحراج', icon: PackageSearch, path: '/haraj' },
    { label: 'الرسائل', icon: MessageCircle, path: '/inbox' },
    { label: 'التنبيهات', icon: Bell, path: '/notifications' },
  ];

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  };

  return (
    <>
      <nav className="alm-mobile-bottom-nav" aria-label="التنقل السريع">
        {items.map(({ label, icon: Icon, path }) => {
          const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={active ? 'is-active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          );
        })}
        {installEvent && (
          <button type="button" onClick={install} className="is-install">
            <Download size={18} />
            <span>تثبيت</span>
          </button>
        )}
      </nav>
      <style>{`
        .alm-mobile-bottom-nav {
          display: none;
        }
        @media (max-width: 720px) {
          .alm-mobile-bottom-nav {
            position: fixed;
            z-index: 1250;
            inset-inline: 10px;
            bottom: calc(10px + env(safe-area-inset-bottom));
            display: flex;
            align-items: stretch;
            justify-content: space-around;
            gap: 4px;
            padding: 7px;
            border: 1px solid rgba(var(--rz-primary-rgb), .22);
            border-radius: 20px;
            background: rgba(255, 253, 249, .92);
            box-shadow: 0 12px 34px rgba(var(--rz-ink-rgb), .18);
            backdrop-filter: blur(16px);
          }
          .alm-mobile-bottom-nav button {
            min-width: 58px;
            min-height: 48px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            border: 0;
            border-radius: 14px;
            background: transparent;
            color: var(--rz-muted);
            font: 800 10px Tajawal, sans-serif;
            cursor: pointer;
          }
          .alm-mobile-bottom-nav button.is-active {
            color: var(--rz-primary);
            background: rgba(var(--rz-primary-rgb), .12);
          }
          .alm-mobile-bottom-nav button.is-install {
            color: var(--rz-white);
            background: var(--rz-primary);
          }
        }
      `}</style>
    </>
  );
};

export default MobileBottomNav;
