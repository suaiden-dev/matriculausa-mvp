import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      './tests/integration/mocks/server.ts',
      './tests/setup.ts'
    ],
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/pages/AgencyDashboard/**',
        'src/pages/AdminDashboard/AgencyManagement.tsx',
        'src/hooks/useAgency*.ts',
        'src/lib/queryKeys.ts',
        'src/components/AuthRedirect.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
