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
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Separar bibliotecas grandes, mas manter React no bundle principal
            if (id.includes('@ckeditor')) return 'editor';
            if (id.includes('@mui')) return 'mui';
            if (id.includes('chart.js') || id.includes('recharts')) return 'charts';
            if (id.includes('@azure') || id.includes('msal')) return 'microsoft';
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('date-fns') || id.includes('dayjs')) return 'dates';
            if (id.includes('framer-motion')) return 'animations';
            // Dividir vendor em chunks menores
            if (id.includes('lodash') || id.includes('ramda')) return 'utils';
            if (id.includes('axios') || id.includes('fetch')) return 'http';
            // React e react-dom ficam no bundle principal para evitar problemas
            return 'vendor';
          }
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
      'react-router-dom',
      '@supabase/supabase-js',
      '@azure/msal-browser'
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