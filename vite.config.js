import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from '@aklinker1/rollup-plugin-visualizer'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // تقرير حجم الحزمة يُولَّد فقط عند التحليل الصريح (npm run analyze)
    // حتى لا يُنشر dist/stats.html بلا داعٍ مع كل بناء.
    ...(mode === 'analyze'
      ? [visualizer({ filename: 'dist/stats.html', open: false, gzipSize: true, brotliSize: true })]
      : []),
  ],
  base: '/',
  // ختم وقت البناء — يُعرض أسفل صفحة الدخول ليميّز المستخدم النسخة الجديدة
  // من أي نسخة قديمة محفوظة في كاش جهازه (يبث أيضاً في الكونسول قبل حذفه بالإنتاج).
  define: {
    __BUILD_STAMP__: JSON.stringify(new Date().toISOString())
  },
  server: {
    allowedHosts: ['.prod-runtime.all-hands.dev']
  },
  preview: {
    allowedHosts: ['.prod-runtime.all-hands.dev']
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
    treeShaking: true
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        compact: true,
        manualChunks(id) {
          if (id.includes('node_modules/react')) return 'react-vendor'
          if (id.includes('node_modules/firebase')) return 'firebase-vendor'
          if (id.includes('node_modules/lucide-react')) return 'icons-vendor'
          if (id.includes('node_modules/@tanstack')) return 'query-vendor'
        }
      }
    }
  }
}))
