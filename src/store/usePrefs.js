// src/store/usePrefs.js — تفضيلات الزائر/العضو الرسمية للموقع
// تُحفظ محلياً على الجهاز (localStorage) وتنطبق فوراً على كل الصفحات:
// صوت الضغط على الأزرار، حجم الخط، التباين العالي، تقليل الحركة.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const FONT_SCALES = [
  { key: 'normal', label: 'عادي', scale: 1 },
  { key: 'large', label: 'كبير', scale: 1.15 },
  { key: 'xlarge', label: 'كبير جداً', scale: 1.3 },
];

const FONT_SCALE_MAP = FONT_SCALES.reduce(
  (acc, o) => ({ ...acc, [o.key]: o.scale }),
  {}
);

const isBrowser = typeof document !== 'undefined';

export const applyFontScale = (fontSize) => {
  if (!isBrowser) return;
  const scale = FONT_SCALE_MAP[fontSize] || FONT_SCALE_MAP.normal;
  document.documentElement.style.fontSize = `${16 * scale}px`;
};

export const applyDisplayPrefs = ({
  highContrast,
  reduceMotion,
  compactMode,
  largeClickTargets,
}) => {
  if (!isBrowser) return;

  const root = document.documentElement;
  root.classList.toggle('high-contrast', !!highContrast);
  root.classList.toggle('reduce-motion', !!reduceMotion);
  root.classList.toggle('compact-mode', !!compactMode);
  root.classList.toggle('large-click-targets', !!largeClickTargets);
};

const usePrefs = create(
  persist(
    (set, get) => ({
      clickSound: true,
      fontSize: 'normal',
      highContrast: false,
      reduceMotion: false,
      compactMode: false,
      largeClickTargets: false,
      // الصوت الترحيبي الملكي عند دخول المالك (يُقرأ في App.jsx)
      welcomeSound: true,
      // وضع التخفي: إيقاف إشعارات دخول/خروج العضو التي تصل لغرفة المالك
      incognito: false,

      toggleClickSound: () => set({ clickSound: !get().clickSound }),
      toggleWelcomeSound: () =>
        set({ welcomeSound: !get().welcomeSound }),
      toggleIncognito: () =>
        set({ incognito: !get().incognito }),

      setFontSize: (fontSize) => {
        const safeFontSize = FONT_SCALE_MAP[fontSize]
          ? fontSize
          : 'normal';

        set({ fontSize: safeFontSize });
        applyFontScale(safeFontSize);
      },

      toggleHighContrast: () => {
        const highContrast = !get().highContrast;
        set({ highContrast });
        applyDisplayPrefs({
          highContrast,
          reduceMotion: get().reduceMotion,
          compactMode: get().compactMode,
          largeClickTargets: get().largeClickTargets,
        });
      },

      toggleReduceMotion: () => {
        const reduceMotion = !get().reduceMotion;
        set({ reduceMotion });
        applyDisplayPrefs({
          highContrast: get().highContrast,
          reduceMotion,
          compactMode: get().compactMode,
          largeClickTargets: get().largeClickTargets,
        });
      },

      toggleCompactMode: () => {
        const compactMode = !get().compactMode;
        set({ compactMode });
        applyDisplayPrefs({
          highContrast: get().highContrast,
          reduceMotion: get().reduceMotion,
          compactMode,
          largeClickTargets: get().largeClickTargets,
        });
      },

      toggleLargeClickTargets: () => {
        const largeClickTargets = !get().largeClickTargets;
        set({ largeClickTargets });
        applyDisplayPrefs({
          highContrast: get().highContrast,
          reduceMotion: get().reduceMotion,
          compactMode: get().compactMode,
          largeClickTargets,
        });
      },

      // يُستدعى عند إقلاع التطبيق لتطبيق التفضيلات المحفوظة
      applyAll: () => {
        const {
          fontSize,
          highContrast,
          reduceMotion,
          compactMode,
          largeClickTargets,
        } = get();

        applyFontScale(fontSize);
        applyDisplayPrefs({
          highContrast,
          reduceMotion,
          compactMode,
          largeClickTargets,
        });
      },
    }),
    {
      name: 'rooz-site-prefs',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        clickSound: state.clickSound,
        fontSize: state.fontSize,
        highContrast: state.highContrast,
        reduceMotion: state.reduceMotion,
        compactMode: state.compactMode,
        largeClickTargets: state.largeClickTargets,
        welcomeSound: state.welcomeSound,
        incognito: state.incognito,
      }),
    }
  )
);

export default usePrefs;