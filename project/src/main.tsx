import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

createRoot(document.getElementById('root')!).render(
  // StrictMode removido para evitar renderizações duplas desnecessárias
  // <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  // </StrictMode>
);
