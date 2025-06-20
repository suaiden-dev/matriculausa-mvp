import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const messages = {
  pt: {
    title: 'Pagamento Realizado com Sucesso!',
    processed: 'Seu pedido foi processado. Agradecemos sua compra.',
    sessionId: 'ID da Sessão:',
    confirmation: 'Você receberá um e-mail de confirmação em breve.',
    goHome: 'Voltar para o Início',
    verifying: 'Verificando seu pagamento...',
    pleaseWait: 'Por favor, aguarde.',
    errorTitle: 'Erro no Processamento do Pagamento',
    errorTryAgain: 'Por favor, tente novamente ou entre em contato com o suporte.'
  },
  en: {
    title: 'Payment Successful!',
    processed: 'Your order has been processed. Thank you for your purchase.',
    sessionId: 'Session ID:',
    confirmation: 'You will receive a confirmation email shortly.',
    goHome: 'Return Home',
    verifying: 'Verifying your payment...',
    pleaseWait: 'Please wait.',
    errorTitle: 'Payment Processing Error',
    errorTryAgain: 'Please try again or contact support.'
  }
};

const SuccessPage: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Troque 'pt' por 'en' para exibir em inglês
  const currentLang = 'en';

  useEffect(() => {
    const getSessionIdFromUrl = () => {
      const queryParams = new URLSearchParams(window.location.search);
      return queryParams.get('session_id');
    };

    const id = getSessionIdFromUrl();
    if (id) {
      setSessionId(id);
      const verifySession = async (sId: string) => {
        try {
          const SUPABASE_PROJECT_URL = 'https://fitpynguasqqutuhzifx.supabase.co';
          const EDGE_FUNCTION_ENDPOINT = `${SUPABASE_PROJECT_URL}/functions/v1/verify-stripe-session`;

          // Recupera o token JWT do usuário autenticado do localStorage
          let token = null;
          try {
            const raw = localStorage.getItem('sb-fitpynguasqqutuhzifx-auth-token');
            if (raw) {
              const tokenObj = JSON.parse(raw);
              token = tokenObj?.access_token || null;
            }
          } catch (e) {
            token = null;
          }

          const response = await fetch(EDGE_FUNCTION_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: JSON.stringify({ sessionId: sId }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Falha na verificação da sessão no backend.');
          }
          if (data.status === 'complete') {
            console.log('Sessão Stripe verificada e completa no backend:', data);
            // Aqui você pode adicionar lógica para exibir detalhes do pedido
          } else {
            setError(data.message || 'Sessão Stripe não está completa ou inválida.');
          }
        } catch (err: any) {
          console.error('Erro ao chamar Edge Function de verificação:', err);
          setError('Erro ao se comunicar com o servidor de verificação: ' + err.message);
        } finally {
          setLoading(false);
        }
      };
      verifySession(id);
    } else {
      setError('ID da sessão não encontrado na URL.');
      setLoading(false);
    }
  }, []);

  const handleGoScholarships = () => {
    navigate('/scholarships');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>{messages[currentLang].verifying}</h2>
        <p style={styles.text}>{messages[currentLang].pleaseWait}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>{messages[currentLang].errorTitle}</h2>
        <p style={styles.errorText}>{error}</p>
        <p style={styles.text}>{messages[currentLang].errorTryAgain}</p>
        <button onClick={handleGoScholarships} style={styles.button}>Go to Scholarships</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>{messages[currentLang].title}</h1>
      <p style={styles.text}>{messages[currentLang].processed}</p>
      {sessionId && (
        <p style={styles.sessionId}>
          {messages[currentLang].sessionId} <code>{sessionId}</code>
        </p>
      )}
      <p style={styles.text}>{messages[currentLang].confirmation}</p>
      <button onClick={handleGoScholarships} style={styles.button}>Go to Scholarships</button>
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
    color: '#28a745',
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

export default SuccessPage; 