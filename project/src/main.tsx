import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import i18nInstance from './i18n';

// Função para inicializar a aplicação após o i18n estar pronto
const initializeApp = async () => {
  try {
    // Aguardar a inicialização do i18n
    await i18nInstance;
    console.log('✅ i18n inicializado com sucesso');
    
    // Renderizar a aplicação
    createRoot(document.getElementById('root')!).render(
      // StrictMode removido para evitar renderizações duplas desnecessárias
      // <StrictMode>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      // </StrictMode>
    );
  } catch (error) {
    console.error('❌ Erro ao inicializar i18n:', error);
    
    // Renderizar mesmo com erro (fallback para inglês)
    createRoot(document.getElementById('root')!).render(
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    );
  }
};

// Inicializar a aplicação
initializeApp();
