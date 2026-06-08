import React from 'react';
import { logError } from '../lib/logError';

export class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // Log mais detalhado para erros de rede
    if (error?.message?.includes('Failed to fetch')) {
      console.error('🌐 Erro de rede detectado:', {
        error: error.message,
        componentStack: info.componentStack,
        timestamp: new Date().toISOString()
      });
    }
    logError(error, info);

    // Auto-reload silencioso na primeira falha
    const key = 'errorBoundaryReloadCount';
    const count = parseInt(sessionStorage.getItem(key) || '0', 10);
    if (count < 1) {
      sessionStorage.setItem(key, String(count + 1));
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      const key = 'errorBoundaryReloadCount';
      const count = parseInt(sessionStorage.getItem(key) || '0', 10);

      // Auto-reload ainda não aconteceu — mostrar spinner enquanto recarrega
      if (count < 1) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#05294E', borderTopColor: 'transparent' }} />
          </div>
        );
      }

      // Segunda falha — erro persistente, mostrar tela friendly
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
          {/* Card */}
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header strip */}
            <div className="h-2 w-full" style={{ backgroundColor: '#05294E' }} />

            <div className="p-8 text-center">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <img src="/logo.png.png" alt="Matrícula USA" className="h-10 object-contain" />
              </div>

              {/* Icon */}
              <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#EFF6FF' }}>
                <svg className="w-7 h-7" fill="none" stroke="#05294E" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              {/* Content */}
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Ops, essa página não carregou
              </h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Aconteceu um pequeno problema ao carregar esta tela.<br />
                Seus dados estão seguros — basta recarregar para continuar.
              </p>

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    sessionStorage.removeItem(key);
                    this.setState({ hasError: false, error: null });
                    window.location.reload();
                  }}
                  className="w-full text-white py-3 px-4 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#05294E' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Recarregar página
                </button>

                <button
                  onClick={() => {
                    sessionStorage.removeItem(key);
                    this.setState({ hasError: false, error: null });
                    window.location.href = '/student/dashboard';
                  }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl text-sm font-medium transition-colors"
                >
                  Voltar ao Dashboard
                </button>
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            © {new Date().getFullYear()} Matrícula USA. Todos os direitos reservados.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
} 