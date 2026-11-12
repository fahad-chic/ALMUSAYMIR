// إشعارات عامة (Toast) — بديل عن window.alert في كل الموقع.
// مخزن خارجي بسيط يُقرأ عبر useSyncExternalStore في <ToastHost />.
// الاستخدام: toast('تم الحفظ') أو toast.error('تعذر الحفظ').

let items = [];
let seq = 0;
const listeners = new Set();

const emit = () => {
  listeners.forEach((fn) => fn());
};

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getSnapshot = () => items;

export const dismiss = (id) => {
  const next = items.filter((t) => t.id !== id);
  if (next.length === items.length) return;
  items = next;
  emit();
};

const DEFAULT_DURATION = 3600;

const push = (message, type = 'success', duration = DEFAULT_DURATION) => {
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) return null;

  const id = ++seq;
  items = [...items, { id, message: text, type }];
  emit();

  if (duration > 0 && typeof window !== 'undefined') {
    window.setTimeout(() => dismiss(id), duration);
  }
  return id;
};

const toast = (message, type, duration) => push(message, type, duration);
toast.success = (message, duration) => push(message, 'success', duration);
toast.error = (message, duration) => push(message, 'error', duration);
toast.info = (message, duration) => push(message, 'info', duration);
toast.dismiss = dismiss;

export default toast;
