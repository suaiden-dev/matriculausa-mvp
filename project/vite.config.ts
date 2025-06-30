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
  server: {
    hmr: {
      overlay: false, // Desabilita overlay de erros
    },
    // Configurações para evitar recarregamento automático
    watch: {
      // Ignora mudanças em arquivos temporários
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.temp/**']
    }
  },
  // Configurações para desenvolvimento
  define: {
    // Desabilita recarregamento desnecessário
    __VITE_IS_MODERN__: true
  }
});