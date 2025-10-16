import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  build: {
    // Otimizações para reduzir uso de memória
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa bibliotecas pesadas em chunks separados
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material', '@mui/lab', '@mui/x-date-pickers'],
          charts: ['chart.js', 'react-chartjs-2', 'recharts'],
          editor: ['@ckeditor/ckeditor5-build-classic', '@monaco-editor/react'],
          utils: ['date-fns', 'dayjs', 'framer-motion', 'lucide-react'],
          microsoft: ['@azure/msal-browser', '@azure/msal-react']
        }
      }
    },
    // Reduz o tamanho dos chunks
    chunkSizeWarningLimit: 1000,
    // Otimizações de memória
    sourcemap: false,
    reportCompressedSize: false
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      'react',
      'react-dom',
      'react-router-dom'
    ]
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
    __VITE_IS_MODERN__: true,
    'process.env': {
      VITE_NWH_BASE_URL: 'https://nwh.suaiden.com',
      VITE_CHAT_WEBHOOK_ID: 'chatbot-test'
    }
  }
});