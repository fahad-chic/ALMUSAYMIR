import { useSyncExternalStore } from 'react';
import { Check, AlertTriangle, Info, X } from 'lucide-react';
import { subscribe, getSnapshot, dismiss } from '../utils/toast';

const ICONS = {
  success: Check,
  error: AlertTriangle,
  info: Info,
};

// حاوية إشعارات ثابتة أعلى الصفحة — تُركّب مرة واحدة في App.
const ToastHost = () => {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (!items.length) return null;

  return (
    <div
      className="fixed top-4 left-3 right-3 sm:left-auto sm:right-5 sm:w-[380px] z-[9999] flex flex-col gap-2"
      role="region"
      aria-label="الإشعارات"
    >
      {items.map((t) => {
        const Icon = ICONS[t.type] || Check;
        return (
          <div
            key={t.id}
            className="rounded-2xl border px-4 py-3 shadow-2xl"
            style={{
              background: 'var(--rz-ivory)',
              borderColor: 'rgba(var(--rz-primary-rgb), .32)',
            }}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'rgba(var(--rz-primary-rgb), .10)',
                  color: 'var(--rz-primary)',
                }}
              >
                <Icon size={18} />
              </div>

              <p className="font-bold text-sm text-[var(--rz-ink)] flex-1">
                {t.message}
              </p>

              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="p-1.5 rounded-lg hover:bg-[var(--rz-primary)]/10 text-[var(--rz-ink)]"
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ToastHost;
