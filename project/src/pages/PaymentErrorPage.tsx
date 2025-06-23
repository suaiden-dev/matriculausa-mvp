import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const messages = {
  pt: {
    errorTitle: 'Erro no Processamento do Pagamento',
    errorTryAgain: 'Por favor, tente novamente ou entre em contato com o suporte.',
    goBack: 'Voltar para Minhas Aplicações',
    errorDetails: 'Detalhes do erro:',
  },
  en: {
    errorTitle: 'Payment Processing Error',
    errorTryAgain: 'Please try again or contact support.',
    goBack: 'Back to My Applications',
    errorDetails: 'Error details:',
  }
};

const PaymentErrorPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Espera que o erro seja passado via state: { error: string }
  const error = (location.state && (location.state as any).error) || 'Unknown error.';
  const sessionId = new URLSearchParams(window.location.search).get('session_id');

  // Troque 'pt' por 'en' para exibir em inglês
  const currentLang = 'en';

  const handleGoBack = () => {
    navigate('/student/dashboard/applications');
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>{messages[currentLang].errorTitle}</h2>
      <p style={styles.errorText}>{error}</p>
      {sessionId && (
        <p style={styles.sessionId}>
          Session ID: <code>{sessionId}</code>
        </p>
      )}
      <p style={styles.text}>{messages[currentLang].errorTryAgain}</p>
      <button onClick={handleGoBack} style={styles.button}>{messages[currentLang].goBack}</button>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
    padding: '40px',
    maxWidth: '600px',
    margin: '50px auto',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#333',
  },
  heading: {
    color: '#dc3545',
    fontSize: '2em',
    marginBottom: '20px',
  },
  text: {
    fontSize: '1.1em',
    lineHeight: '1.6',
    marginBottom: '15px',
  },
  errorText: {
    color: '#dc3545',
    fontSize: '1.1em',
    lineHeight: '1.6',
    marginBottom: '15px',
  },
  sessionId: {
    backgroundColor: '#f0f0f0',
    padding: '10px',
    borderRadius: '4px',
    display: 'inline-block',
    margin: '10px 0',
    fontSize: '0.9em',
    color: '#555',
  },
  button: {
    display: 'inline-block',
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    textDecoration: 'none',
    border: 'none',
    borderRadius: '5px',
    fontSize: '1em',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
};

export default PaymentErrorPage; 