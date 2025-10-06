import React from 'react';
import { logError } from '../lib/logError';

export class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
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
    // Não exibe nada para o usuário, apenas renderiza os filhos normalmente
    return this.props.children;
  }
} 