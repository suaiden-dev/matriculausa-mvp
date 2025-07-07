// AVISO: Este componente está obsoleto. Use apenas para referência histórica.
// O fluxo correto agora está em StudentDashboard/ScholarshipFeeSuccess.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const messages = {
  title: 'Scholarship Fee Payment Successful!',
  processed: 'We have received your Scholarship Fee payment. We will contact you soon with the next steps for your scholarship process.',
  sessionId: 'Session ID:',
  confirmation: 'You will receive a confirmation email shortly.',
  goHome: 'Return Home',
  verifying: 'Verifying your payment...',
  pleaseWait: 'Please wait.',
  errorTitle: 'Payment Processing Error',
  errorTryAgain: 'Please try again or contact support.'
};

const ScholarshipFeeSuccessOLD: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
          const EDGE_FUNCTION_ENDPOINT = `${SUPABASE_PROJECT_URL}/functions/v1/verify-stripe-session-scholarship-fee`;

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
            throw new Error(data.error || 'Failed to verify session on the backend.');
          }
          if (data.message.includes('successfully')) {
            // Success
          } else {
            setError(data.message || 'Stripe session is not complete or is invalid.');
          }
        } catch (err: any) {
          setError('Error communicating with the verification server: ' + err.message);
        } finally {
          setLoading(false);
        }
      };
      verifySession(id);
    } else {
      setError('Session ID not found in URL.');
      setLoading(false);
    }
  }, []);

  const handleGoDashboard = () => {
    navigate('/student/dashboard');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>{messages.verifying}</h2>
        <p style={styles.text}>{messages.pleaseWait}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>{messages.errorTitle}</h2>
        <p style={styles.errorText}>{error}</p>
        <p style={styles.text}>{messages.errorTryAgain}</p>
        <button onClick={handleGoDashboard} style={styles.button}>Go to Dashboard</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>{messages.title}</h1>
      <p style={styles.text}>{messages.processed}</p>
      {sessionId && (
        <p style={styles.sessionId}>
          {messages.sessionId} <code>{sessionId}</code>
        </p>
      )}
      <p style={styles.text}>{messages.confirmation}</p>
      <button onClick={handleGoDashboard} style={styles.button}>Go to Dashboard</button>
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

export default ScholarshipFeeSuccessOLD; 