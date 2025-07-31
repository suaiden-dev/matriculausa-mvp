import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ConnectWhatsApp: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  
  // Redirecionar para o componente WhatsAppConnection com agentId na URL
  useEffect(() => {
    if (agentId) {
      navigate(`/school/dashboard/whatsapp?agentId=${agentId}`, { replace: true });
    }
  }, [agentId, navigate]);

  // Renderizar nada enquanto redireciona
  return null;
};

export default ConnectWhatsApp;