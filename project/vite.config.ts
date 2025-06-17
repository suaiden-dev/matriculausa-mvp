import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  plugins: [react()],
  build: {
    rollupOptions: {
      // Vite automatically detects index.html as entry point
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});