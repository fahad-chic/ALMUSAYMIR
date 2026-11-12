import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // إيميلات المالك لم تعد مكتوبة في الكود — تُحقن هنا للاختبار فقط حتى
    // تظل مسارات المالك قابلة للاختبار بلا قيم إنتاجية داخل src.
    env: {
      VITE_OWNER_EMAILS: 'f882771f@gmail.com,kal6667222@gmail.com',
    },
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    globals: true,
  },
});
