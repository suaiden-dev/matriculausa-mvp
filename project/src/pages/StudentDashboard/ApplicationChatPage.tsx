import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ApplicationChat from '../../components/ApplicationChat';
import { useApplicationChat } from '../../hooks/useApplicationChat';
import { useAuth } from '../../hooks/useAuth';
import DocumentRequestsCard from '../../components/DocumentRequestsCard';
import { supabase } from '../../lib/supabase';

const ApplicationChatPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { user, userProfile } = useAuth();
  const { messages, sendMessage, loading, isSending, error } = useApplicationChat(applicationId);

  // Estado do I-20 Control Fee
  const [i20Loading, setI20Loading] = useState(false);
  const [i20Error, setI20Error] = useState<string | null>(null);

  // Função para iniciar o pagamento do I-20 Control Fee
  const handlePayI20 = async () => {
    setI20Loading(true);
    setI20Error(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/stripe-checkout-i20-control-fee`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          success_url: window.location.origin + '/student/i20-control-fee-success?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: window.location.origin + '/student/i20-control-fee-error',
        }),
      });
      const data = await res.json();
      if (data.session_url) {
        window.location.href = data.session_url;
      } else {
        setI20Error('Erro ao criar sessão de pagamento.');
      }
    } catch (err) {
      setI20Error('Erro ao redirecionar para o pagamento.');
    } finally {
      setI20Loading(false);
    }
  };

  // Lógica de exibição do card
  const hasPaid = !!userProfile?.has_paid_i20_control_fee;
  const dueDate = userProfile?.i20_control_fee_due_date || null;
  const paymentDate = userProfile?.i20_control_fee_due_date || null;
  const isExpired = !hasPaid && dueDate ? new Date(dueDate) < new Date() : false;

  // This check prevents rendering with an invalid state that can cause hook order issues.
  if (!user) {
    return <div className="text-center text-gray-500 py-10">Authenticating...</div>;
  }

  return (
    <div className="p-4 md:p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Application Chat
        </h2>
        {/* Card de Solicitações de Documentos */}
        {applicationId && (
          <DocumentRequestsCard 
            applicationId={applicationId} 
            isSchool={false} 
            currentUserId={user.id} 
          />
        )}
        <ApplicationChat
          messages={messages}
          onSend={sendMessage}
          loading={loading}
          isSending={isSending}
          error={error}
          currentUserId={user.id}
          i20ControlFee={{
            hasPaid,
            dueDate,
            isExpired,
            isLoading: i20Loading,
            onPay: handlePayI20,
            paymentDate,
          }}
        />
        {i20Error && <div className="text-center text-red-500 py-2">{i20Error}</div>}
        {loading && messages.length === 0 && (
            <div className="text-center text-gray-500 py-10">Loading Chat...</div>
        )}
        {error && !loading && (
          <div className="text-center text-red-500 py-10">
            Failed to load chat. Please try refreshing the page.
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationChatPage; 