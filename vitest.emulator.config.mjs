// إعداد vitest لاختبارات المحاكي (تحتاج Java + firebase emulators:exec).
// منفصل عن vitest.config.js حتى لا يلتقطه `npm test` العادي (لا محاكي هناك).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['e2e/**/*.emulator.mjs'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
