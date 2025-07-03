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
    logError(error, info);
  }

  render() {
    // Não exibe nada para o usuário, apenas renderiza os filhos normalmente
    return this.props.children;
  }
} 