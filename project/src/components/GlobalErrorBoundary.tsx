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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-blue-500/30 selection:text-blue-200">
          <div className="relative w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 text-center shadow-2xl overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
            
            {/* Icon */}
            <div className="relative mx-auto w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6 animate-pulse">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Content */}
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
              Oops! Something went wrong
            </h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              We encountered an unexpected rendering error. Don't worry, your data is safe. Let's try to reload the application.
            </p>

            {/* Error Message Details (Subtle) */}
            {this.state.error && (
              <div className="text-left bg-slate-950/80 border border-slate-850 rounded-xl p-3 mb-6 max-h-24 overflow-y-auto font-mono text-[10px] text-slate-500">
                {this.state.error.toString()}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white py-3 px-4 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Reload Application
              </button>
              
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/student/dashboard';
                }}
                className="w-full bg-slate-800/80 hover:bg-slate-805 text-slate-300 py-3 px-4 rounded-xl text-sm font-medium transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 