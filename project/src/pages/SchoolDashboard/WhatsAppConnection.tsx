import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MessageSquare, 
  WifiOff, 
  RotateCcw, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Smartphone,
  Settings,
  Brain,
  Mail,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';
import { supabase } from '../../lib/supabase';

interface WhatsAppConnection {
  id: string;
  university_id: string;
  phone_number: string;
  connection_status: 'connecting' | 'connected' | 'disconnected' | 'error';
  connected_at?: string;
  disconnected_at?: string | null;
  instance_name: string;
  created_at: string;
  updated_at: string;
}

export default function WhatsAppConnection() {
  const { user } = useAuth();
  const { university } = useUniversity();
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Estados para o modal de QR Code
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [currentConnectionId, setCurrentConnectionId] = useState<string | null>(null);
  const [currentInstanceName, setCurrentInstanceName] = useState<string | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'open' | 'connected' | 'failed' | null>(null);
  // Estado para indicar atualização automática
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  // Estado para o cronômetro
  const [countdown, setCountdown] = useState(300); // 5 minutos = 300 segundos
  
  // Estados para diálogos de confirmação
  const [deleteConnectionId, setDeleteConnectionId] = useState<string | null>(null);
  const [deleteInstanceName, setDeleteInstanceName] = useState<string | null>(null);
  const [disconnectConnectionId, setDisconnectConnectionId] = useState<string | null>(null);
  const [disconnectInstanceName, setDisconnectInstanceName] = useState<string | null>(null);

  // Buscar conexões reais do banco de dados
  const fetchConnections = useCallback(async () => {
    if (!university?.id) {
      console.log('❌ Cannot fetch connections - no university ID');
      return;
    }
    
    console.log('🔍 Fetching connections for university:', university.id);
    setLoading(true);
    try {
      // Buscar conexões do banco de dados
      const { data: connections, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('university_id', university.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching connections:', error);
        return;
      }

      console.log('✅ Fetched connections:', connections);
      console.log('✅ Number of connections:', connections?.length || 0);
      setConnections(connections || []);
    } catch (error) {
      console.error('❌ Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  }, [university?.id]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Função para gerar caracteres aleatórios
  const generateRandomString = useCallback((length: number): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }, []);

  // Função para gerar instance name único
  const generateUniqueInstanceName = useCallback((): string => {
    const userName = user?.email?.split('@')[0] || 'user';
    const randomSuffix = generateRandomString(10);
    return `${userName}_${randomSuffix}`;
  }, [user?.email, generateRandomString]);

  const handleCreateConnection = async () => {
    if (!university || !user) {
      console.error('University or user information not available');
      return;
    }

    const instanceName = generateUniqueInstanceName();
    
    setQrLoading(true);
    setQrError(null);
    setShowQrModal(true);
    setCurrentConnectionId('new');
    setCurrentInstanceName(instanceName);
    
    try {
      console.log('Generating QR code for instance:', instanceName);
      
      // Construir payload dinamicamente
      const payload = {
        instance_name: instanceName,
        university_id: university.id,
        university_name: university.name,
        user_email: user.email,
        user_id: user.id,
        timestamp: new Date().toISOString(),
        user_metadata: {
          ...user
        },
        university_metadata: {
          ...university
        }
      };

      console.log('Dynamic payload:', payload);
      
      // Chamada direta para o webhook
      const response = await fetch('https://nwh.suaiden.com/webhook/gerar_qr_code_whastapp_matriculausa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Webhook response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Webhook error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      // Ler a resposta uma única vez
      const responseText = await response.text();
      console.log('Complete webhook response:', responseText.substring(0, 100) + '...');
      
      let qrCodeData = null;
      
      // Tentar processar como JSON primeiro
      try {
        const parsedResponse = JSON.parse(responseText);
        console.log('Response parsed as JSON:', parsedResponse);
        qrCodeData = parsedResponse.qrCode || parsedResponse.base64 || parsedResponse.qr_code;
      } catch (jsonError) {
        console.log('Response is not JSON, treating as base64 string');
        // Verificar se é base64 válido
        if (responseText && /^[A-Za-z0-9+/=]+$/.test(responseText) && responseText.length > 100) {
          qrCodeData = responseText;
        }
      }
      
      if (qrCodeData && /^[A-Za-z0-9+/=]+$/.test(qrCodeData) && qrCodeData.length > 100) {
        console.log('Valid QR code data detected, setting URL');
        setQrCodeUrl(qrCodeData);
        setIsCheckingConnection(true);
        setConnectionStatus('connecting');
        console.log('QR code generated successfully');
        
        // SALVAR INSTANCE_NAME NO BANCO DE DADOS (igual ao SkillaBot)
        if (university && user && instanceName) {
          console.log('💾 Saving instance_name to database:', instanceName);
          console.log('💾 University ID:', university.id);
          console.log('💾 User ID:', user.id);
          console.log('💾 User email:', user.email);
          
          const newConnection = {
            university_id: university.id,
            phone_number: 'Connecting...',
            connection_status: 'connecting',
            instance_name: instanceName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log('💾 New connection object:', newConnection);

          const { data: savedConnection, error: saveError } = await supabase
            .from('whatsapp_connections')
            .insert([newConnection])
            .select()
            .single();

          if (saveError) {
            console.error('❌ Error saving instance_name to database:', saveError);
            console.error('❌ Error details:', saveError.message);
            console.error('❌ Error code:', saveError.code);
          } else {
            console.log('✅ Instance_name saved to database:', savedConnection);
            console.log('✅ Saved connection ID:', savedConnection?.id);
            // Atualizar o currentConnectionId com o ID salvo
            if (savedConnection) {
              setCurrentConnectionId(savedConnection.id);
              console.log('✅ Current connection ID updated:', savedConnection.id);
            }
          }
        } else {
          console.error('❌ Cannot save instance_name - missing required data:');
          console.error('❌ University:', !!university);
          console.error('❌ User:', !!user);
          console.error('❌ Instance name:', !!instanceName);
          console.error('❌ University ID:', university?.id);
          console.error('❌ User ID:', user?.id);
        }
        
        // VALIDAÇÃO IMEDIATA - Verificar conexão logo após gerar QR code
        if (currentInstanceName) {
          console.log('🚀 Starting immediate validation...');
          console.log('🔍 Current instance name for validation:', currentInstanceName);
          console.log('🔍 Generated instance name:', instanceName);
          console.log('🔍 Are they the same?', currentInstanceName === instanceName);
          
          setTimeout(async () => {
            console.log('🔍 Immediate validation check...');
            console.log('🔍 Using instance name:', currentInstanceName);
            const validationResult = await validateWhatsAppConnection(currentInstanceName);
            
            if (validationResult) {
              console.log('📋 IMMEDIATE VALIDATION RESULT:', validationResult);
              
              if (validationResult.state === 'connected' || validationResult.state === 'conectado' || validationResult.state === 'open') {
                console.log('🎉 WhatsApp connection successful!');
                console.log('🎉 State detected:', validationResult.state);
                console.log('🎉 Setting connection status to connected');
                setConnectionStatus('connected');
                
                // Update database with connection success
                if (university && user) {
                  console.log('💾 Updating database with connection success...');
                  const { error: updateError } = await supabase
                    .from('whatsapp_connections')
                    .update({
                      connection_status: 'connected',
                      connected_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    })
                    .eq('instance_name', currentInstanceName);

                  if (updateError) {
                    console.error('❌ Error updating connection status:', updateError);
                  } else {
                    console.log('✅ Database updated successfully');
                  }
                }

                // FECHAR O MODAL IMEDIATAMENTE PARA EVITAR LOOP INFINITO
                console.log('🚪 Closing modal immediately...');
                setShowQrModal(false);
                setQrCodeUrl(null);
                setConnectionStatus(null);
                setIsCheckingConnection(false);
                setIsAutoRefreshing(false);
                setCurrentInstanceName('');
                
                // Refresh the connections list
                console.log('🔄 Refreshing connections list...');
                fetchConnections();
                
                return; // SAIR DA FUNÇÃO IMEDIATAMENTE
              } else {
                console.log('⏳ Connection not ready yet. State:', validationResult?.state);
              }
            }
          }, 2000); // Aguardar 2 segundos para dar tempo do QR ser escaneado
        }
      } else {
        console.error('Invalid QR code data:', qrCodeData ? qrCodeData.substring(0, 50) : 'null');
        throw new Error('QR Code not found or invalid in response');
      }
      
    } catch (error) {
      console.error('Error creating connection:', error);
      setQrError(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowQrModal(false);
    } finally {
      setQrLoading(false);
    }
  };

  const handleRefreshQrCode = async () => {
    if (!university || !user || !currentInstanceName) {
      console.error('Required information not available for refresh');
      return;
    }

    setQrLoading(true);
    setQrError(null);
    
    try {
      console.log('Refreshing QR code for instance:', currentInstanceName);
      
      // Construir payload dinamicamente para refresh
      const payload = {
        instance_name: currentInstanceName
      };

      console.log('Refresh dynamic payload:', payload);
      
      // Chamada direta para o webhook para refresh
      const response = await fetch('https://nwh.suaiden.com/webhook/gerar_qr_code_whastapp_matriculausa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Refresh webhook response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Refresh webhook error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      // Ler a resposta uma única vez
      const responseText = await response.text();
      console.log('Complete refresh webhook response:', responseText.substring(0, 100) + '...');
      
      let qrCodeData = null;
      
      // Tentar processar como JSON primeiro
      try {
        const parsedResponse = JSON.parse(responseText);
        console.log('Refresh response parsed as JSON:', parsedResponse);
        qrCodeData = parsedResponse.qrCode || parsedResponse.base64 || parsedResponse.qr_code;
      } catch (jsonError) {
        console.log('Refresh response is not JSON, treating as base64 string');
        // Verificar se é base64 válido
        if (responseText && /^[A-Za-z0-9+/=]+$/.test(responseText) && responseText.length > 100) {
          qrCodeData = responseText;
        }
      }
      
      if (qrCodeData && /^[A-Za-z0-9+/=]+$/.test(qrCodeData) && qrCodeData.length > 100) {
        console.log('Valid QR code data detected for refresh, setting URL');
        setQrCodeUrl(qrCodeData);
        console.log('QR code refreshed successfully');
      } else {
        console.error('Invalid QR code data for refresh:', qrCodeData ? qrCodeData.substring(0, 50) : 'null');
        throw new Error('QR Code not found or invalid in refresh response');
      }
      
    } catch (error) {
      console.error('Error refreshing QR code:', error);
      setQrError(`Failed to refresh QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setQrLoading(false);
    }
  };

  const handleDisconnect = useCallback((id: string, instanceName: string) => {
    setDisconnectConnectionId(id);
    setDisconnectInstanceName(instanceName);
  }, []);

  const confirmDisconnect = async () => {
    if (!disconnectConnectionId) return;
    
    setActionLoading(disconnectConnectionId);
    try {
      // Atualizar status no banco de dados
      const { error } = await supabase
        .from('whatsapp_connections')
        .update({ 
          connection_status: 'disconnected', 
          disconnected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', disconnectConnectionId);

      if (error) {
        console.error('Error disconnecting:', error);
        throw error;
      }

      // Atualizar estado local
      setConnections(prev =>
        prev.map(conn =>
          conn.id === disconnectConnectionId
            ? { ...conn, connection_status: 'disconnected', disconnected_at: new Date().toISOString() }
            : conn
        )
      );
      
      console.log('WhatsApp disconnected successfully!');
    } catch (error) {
      console.error('Error disconnecting:', error);
      console.error('Failed to disconnect. Please try again.');
    } finally {
      setActionLoading(null);
      setDisconnectConnectionId(null);
      setDisconnectInstanceName(null);
    }
  };

  const handleDelete = useCallback((id: string, instanceName: string) => {
    setDeleteConnectionId(id);
    setDeleteInstanceName(instanceName);
  }, []);

  const confirmDelete = async () => {
    if (!deleteConnectionId) return;
    
    setActionLoading(deleteConnectionId);
    try {
      // Excluir do banco de dados
      const { error } = await supabase
        .from('whatsapp_connections')
        .delete()
        .eq('id', deleteConnectionId);

      if (error) {
        console.error('Error deleting:', error);
        throw error;
      }

      // Atualizar estado local
      setConnections(prev => prev.filter(conn => conn.id !== deleteConnectionId));
      console.log('Connection deleted successfully!');
    } catch (error) {
      console.error('Error deleting:', error);
      console.error('Failed to delete connection. Please try again.');
    } finally {
      setActionLoading(null);
      setDeleteConnectionId(null);
      setDeleteInstanceName(null);
    }
  };

  const handleReconnect = async (id: string, instanceName: string) => {
    if (!university || !user) {
      console.error('University or user information not available');
      return;
    }

    setActionLoading(id);
    setCurrentConnectionId(id);
    setCurrentInstanceName(instanceName);
    setQrLoading(true);
    setQrError(null);
    setShowQrModal(true);
    
    try {
      // Construir payload dinamicamente para reconexão
      const payload = {
        instance_name: instanceName
      };

      console.log('Reconnect dynamic payload:', payload);
      
      // Chamada direta para o webhook para reconexão
      const response = await fetch('https://nwh.suaiden.com/webhook/gerar_qr_code_whastapp_matriculausa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Ler a resposta uma única vez
      const responseText = await response.text();
      console.log('Complete reconnect webhook response:', responseText.substring(0, 100) + '...');
      
      let qrCodeData = null;
      
      // Tentar processar como JSON primeiro
      try {
        const parsedResponse = JSON.parse(responseText);
        console.log('Reconnect response parsed as JSON:', parsedResponse);
        qrCodeData = parsedResponse.qrCode || parsedResponse.base64 || parsedResponse.qr_code;
      } catch (jsonError) {
        console.log('Reconnect response is not JSON, treating as base64 string');
        // Verificar se é base64 válido
        if (responseText && /^[A-Za-z0-9+/=]+$/.test(responseText) && responseText.length > 100) {
          qrCodeData = responseText;
        }
      }
      
      if (qrCodeData && /^[A-Za-z0-9+/=]+$/.test(qrCodeData) && qrCodeData.length > 100) {
        console.log('Valid QR code data detected for reconnect, setting URL');
        setQrCodeUrl(qrCodeData);
        
        // Atualizar status no banco de dados
        const { error: updateError } = await supabase
          .from('whatsapp_connections')
          .update({ 
            connection_status: 'connecting', 
            disconnected_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.error('Error updating connection status:', updateError);
        }

        // Atualizar estado local
        setConnections(prev =>
          prev.map(conn =>
            conn.id === id
              ? { ...conn, connection_status: 'connecting', disconnected_at: null }
              : conn
          )
        );
        
        setIsCheckingConnection(true);
        setConnectionStatus('connecting');
        console.log('QR code generated successfully for reconnect');
      } else {
        console.error('Invalid QR code data for reconnect:', qrCodeData ? qrCodeData.substring(0, 50) : 'null');
        throw new Error('QR Code not found or invalid in reconnect response');
      }
      
    } catch (error) {
      console.error('Error reconnecting:', error);
      console.error('Failed to reconnect. Please try again.');
      setShowQrModal(false);
    } finally {
      setActionLoading(null);
      setQrLoading(false);
    }
  };

  const handleWhatsAppConnectionSuccess = async () => {
    console.log('WhatsApp connection successful, updating database...');
    
    if (currentConnectionId && currentConnectionId !== 'new') {
      // Atualizar conexão existente
      const { error } = await supabase
        .from('whatsapp_connections')
        .update({ 
          connection_status: 'connected', 
          connected_at: new Date().toISOString(),
          disconnected_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentConnectionId);

      if (error) {
        console.error('Error updating connection:', error);
        return;
      }

      // Atualizar estado local
      setConnections(prev =>
        prev.map(conn =>
          conn.id === currentConnectionId
            ? { 
                ...conn, 
                connection_status: 'connected', 
                connected_at: new Date().toISOString(),
                disconnected_at: null
              }
            : conn
        )
      );
    } else if (currentConnectionId === 'new' && currentInstanceName && university) {
      // Criar nova conexão no banco de dados
      const newConnection = {
        university_id: university.id,
        phone_number: 'Connected',
        connection_status: 'connected',
        connected_at: new Date().toISOString(),
        instance_name: currentInstanceName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('whatsapp_connections')
        .insert([newConnection])
        .select()
        .single();

      if (error) {
        console.error('Error creating connection:', error);
        return;
      }

      // Adicionar nova conexão ao estado local
      setConnections(prev => [data, ...prev]);
    }
    
    console.log('WhatsApp connected successfully!');
    setShowQrModal(false);
    setCurrentConnectionId(null);
    setCurrentInstanceName(null);
    setQrCodeUrl(null);
    setConnectionStatus(null);
    setIsCheckingConnection(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">Connected</span>;
      case 'connecting':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">Connecting</span>;
      case 'disconnected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">Disconnected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">Error</span>;
    }
  };

  const getStatusBadgeForModal = () => {
    if (connectionStatus === 'connected') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Connected!</span>;
    }
    if (connectionStatus === 'open') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200"><Loader2 className="w-3 h-3 mr-1 animate-spin" />QR Code scanned, connecting...</span>;
    }
    if (isCheckingConnection) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Waiting for connection...</span>;
    }
    if (qrError) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><AlertCircle className="w-3 h-3 mr-1" />Error</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">Waiting for scan</span>;
  };

  const handleCloseModal = useCallback(() => {
    setShowQrModal(false);
    setQrCodeUrl(null);
    setConnectionStatus(null);
    setIsCheckingConnection(false);
  }, []);

  // Função para validar a conexão WhatsApp (igual ao Skilabot)
  const validateWhatsAppConnection = async (instanceName: string) => {
    console.log('🚀 validateWhatsAppConnection called with instanceName:', instanceName);
    
    if (!university || !user) {
      console.error('❌ Required information not available for validation');
      console.error('❌ University:', !!university);
      console.error('❌ User:', !!user);
      return null;
    }

    try {
      console.log('Validating WhatsApp connection for instance:', instanceName);
      console.log('🔍 University ID:', university.id);
      console.log('🔍 User ID:', user.id);
      console.log('🔍 User email:', user.email);

      // Buscar o instance_name correto do banco de dados
      console.log('🔍 Searching for instance_name in database:', instanceName);
      const { data: connectionData, error: searchError } = await supabase
        .from('whatsapp_connections')
        .select('instance_name')
        .eq('instance_name', instanceName)
        .eq('university_id', university.id)
        .single();

      if (searchError) {
        console.error('❌ Error searching for instance_name in database:', searchError);
        console.log('🔍 Will use provided instance_name:', instanceName);
      } else {
        console.log('✅ Found instance_name in database:', connectionData);
        // Usar o instance_name do banco se encontrado
        if (connectionData && connectionData.instance_name) {
          console.log('🔍 Using instance_name from database:', connectionData.instance_name);
        }
      }

      // Build dynamic payload for validation (igual ao Skilabot)
      const payload = {
        instance_name: instanceName
      };

      console.log('Payload enviado para qr_validado:', payload);
      console.log('🔗 Calling webhook: https://nwh.suaiden.com/webhook/qr_validado');
      
      // Call the validation webhook (igual ao Skilabot)
      const response = await fetch('https://nwh.suaiden.com/webhook/qr_validado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Validation webhook response status:', response.status);
      console.log('🔗 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Validation webhook error response:', errorText);
        return null;
      }

      // Read the response once
      const responseText = await response.text();
      console.log('Resposta bruta do qr_validado:', responseText);
      console.log('🔍 FULL VALIDATION RESPONSE:', responseText);
      console.log('📏 Response length:', responseText.length);
      console.log('📋 Response type check:', typeof responseText);
      console.log('🔍 Response starts with:', responseText.substring(0, 50));
      console.log('🔍 Response ends with:', responseText.substring(responseText.length - 50));

      let state: string | null = null;
      let number: string | null = null;
      let inboxPayloads: Array<{state: string; inbox_id?: string; user_id?: string}> = [];

      // Try to process as JSON first (igual ao Skilabot)
      try {
        const json = JSON.parse(responseText);
        console.log('JSON parseado do qr_validado:', json);

        let arrayToProcess = json;
        // Se vier como { data: [...] }, use json.data (igual ao Skilabot)
        if (json && Array.isArray(json.data)) {
          arrayToProcess = json.data;
        }
        
        if (Array.isArray(arrayToProcess)) {
          console.log('📋 É um array com', arrayToProcess.length, 'itens');
          inboxPayloads = arrayToProcess.map((item: any) => ({
            state: item.state,
            inbox_id: item.inbox_id,
            user_id: item.user_id
          }));
          state = arrayToProcess[0]?.state;
          number = arrayToProcess[0]?.number;
          
          arrayToProcess.forEach((item: any, index: number) => {
            console.log(`📋 Item ${index}:`, item);
            console.log(`📋 Item ${index} state:`, item.state);
          });
        } else {
          console.log('📋 É um objeto único');
          state = arrayToProcess.state;
          number = arrayToProcess.number;
          inboxPayloads = [{
            state: state || 'unknown',
            inbox_id: arrayToProcess.inbox_id,
            user_id: arrayToProcess.user_id
          }];
          console.log('📋 State:', arrayToProcess.state);
          console.log('📋 Number:', arrayToProcess.number);
          console.log('📋 Inbox ID:', arrayToProcess.inbox_id);
          console.log('📋 User ID:', arrayToProcess.user_id);
        }
        
        console.log('Payloads para Edge Function:', inboxPayloads);
      } catch (jsonError) {
        console.log('❌ Erro ao fazer parse JSON:', jsonError);
        console.log('📋 Tentando detectar status por texto...');
        console.log('📋 Texto contém "connected":', responseText.includes('connected'));
        console.log('📋 Texto contém "conectado":', responseText.includes('conectado'));
        console.log('📋 Texto contém "open":', responseText.includes('open'));
        console.log('📋 Texto contém "closed":', responseText.includes('closed'));
        console.log('📋 Texto contém "failed":', responseText.includes('failed'));
        console.log('📋 Texto contém "success":', responseText.includes('success'));
        console.log('📋 Texto contém "error":', responseText.includes('error'));
        
        // Check if it contains connection status keywords (igual ao Skilabot)
        if (responseText.includes('connected') || responseText.includes('conectado')) {
          console.log('✅ Detectado status: connected/conectado');
          state = 'connected';
        } else if (responseText.includes('open')) {
          console.log('✅ Detectado status: open');
          state = 'open';
        } else if (responseText.includes('closed')) {
          console.log('✅ Detectado status: closed');
          state = 'closed';
        } else if (responseText.includes('failed')) {
          console.log('✅ Detectado status: failed');
          state = 'failed';
        } else if (responseText.includes('success')) {
          console.log('✅ Detectado status: success (tratando como connected)');
          state = 'connected';
        } else {
          console.log('❓ Status desconhecido, salvando resposta bruta');
          state = 'unknown';
        }
      }

      console.log('🎯 VALIDATION DATA FINAL:', { state, number, inboxPayloads });
      console.log('🎯 State detectado:', state);
      console.log('🎯 Tipo do state:', typeof state);

      return { state, number, inboxPayloads };
    } catch (error) {
      console.error('Error validating WhatsApp connection:', error);
      return null;
    }
  };

  // Verificação periódica de status da conexão
  useEffect(() => {
    console.log('🔄 useEffect triggered with:', {
      showQrModal,
      qrCodeUrl: qrCodeUrl ? 'exists' : 'null',
      qrLoading,
      connectionStatus,
      currentInstanceName
    });
    
    let intervalId: NodeJS.Timeout;
    let countdownId: NodeJS.Timeout;
    
    if (showQrModal && qrCodeUrl && !qrLoading && connectionStatus !== 'connected') {
      console.log('✅ Starting automatic refresh cycle');
      console.log('✅ showQrModal:', showQrModal);
      console.log('✅ qrCodeUrl exists:', !!qrCodeUrl);
      console.log('✅ qrLoading:', qrLoading);
      console.log('✅ connectionStatus:', connectionStatus);
      console.log('✅ currentInstanceName:', currentInstanceName);
      // Usar variável de ambiente ou padrão de 5 minutos
      const checkInterval = import.meta.env.VITE_WHATSAPP_CHECK_INTERVAL || 300000; // 5 minutos = 300000 ms
      const countdownSeconds = checkInterval / 1000;
      console.log(`Starting automatic QR code refresh every ${countdownSeconds} seconds`);
      
      // Inicializar cronômetro
      setCountdown(countdownSeconds);
      
      // Cronômetro que atualiza a cada segundo
      countdownId = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return countdownSeconds; // Reset para o próximo ciclo
          }
          return prev - 1;
        });
      }, 1000);
      
      intervalId = setInterval(async () => {
        try {
          console.log('🔄 Auto-refreshing QR code...');
          console.log('🔄 Current instance name:', currentInstanceName);
          console.log('🔄 University:', university?.name);
          console.log('🔄 User:', user?.email);
          setIsAutoRefreshing(true);

          // Call the refresh webhook automatically
          if (!university || !user || !currentInstanceName) {
            console.error('❌ Required information not available for auto-refresh');
            console.error('❌ University:', !!university);
            console.error('❌ User:', !!user);
            console.error('❌ Current instance name:', !!currentInstanceName);
            setIsAutoRefreshing(false);
            return;
          }

          // Build dynamic payload for automatic refresh
          const payload = {
            instance_name: currentInstanceName
          };

          console.log('Auto-refresh dynamic payload:', payload);
          console.log('🔗 Calling auto-refresh webhook: https://nwh.suaiden.com/webhook/qrcode_atualizado');

          // Direct call to the webhook for automatic refresh
          const response = await fetch('https://nwh.suaiden.com/webhook/qrcode_atualizado', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          console.log('Auto-refresh webhook response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Auto-refresh webhook error response:', errorText);
            return;
          }

          // Read the response once
          const responseText = await response.text();
          console.log('Complete auto-refresh webhook response from qrcode_atualizado:', responseText.substring(0, 100) + '...');

          let qrCodeData = null;

          // Try to process as JSON first
          try {
            const parsedResponse = JSON.parse(responseText);
            console.log('Auto-refresh response parsed as JSON from qrcode_atualizado:', parsedResponse);
            qrCodeData = parsedResponse.qrCode || parsedResponse.base64 || parsedResponse.qr_code;
          } catch (jsonError) {
            console.log('Auto-refresh response is not JSON, treating as base64 string from qrcode_atualizado');
            // Check if it's valid base64
            if (responseText && /^[A-Za-z0-9+/=]+$/.test(responseText) && responseText.length > 100) {
              qrCodeData = responseText;
            }
          }

          if (qrCodeData && /^[A-Za-z0-9+/=]+$/.test(qrCodeData) && qrCodeData.length > 100) {
            console.log('Valid QR code data detected for auto-refresh, updating URL');
            setQrCodeUrl(qrCodeData);
            console.log('QR code refreshed successfully');
          } else {
            console.log('No valid QR code data received from auto-refresh');
          }
        } catch (error) {
          console.error('Error during auto-refresh:', error);
        } finally {
          setIsAutoRefreshing(false);
        }
      }, checkInterval);
    }

    return () => {
      if (intervalId) {
        console.log('Clearing automatic QR code refresh');
        clearInterval(intervalId);
      }
      if (countdownId) {
        console.log('Clearing countdown timer');
        clearInterval(countdownId);
      }
      setCountdown(300); // Reset do cronômetro (5 minutos)
    };
  }, [showQrModal, qrCodeUrl, qrLoading, connectionStatus, university, user, currentInstanceName]);

  // Verificação periódica independente de status da conexão (igual ao SkillaBot)
  useEffect(() => {
    console.log('🔄 useEffect para verificação periódica independente triggered');
    console.log('🔄 showQrModal:', showQrModal);
    console.log('🔄 qrCodeUrl exists:', !!qrCodeUrl);
    console.log('🔄 qrLoading:', qrLoading);
    console.log('🔄 connectionStatus:', connectionStatus);
    console.log('🔄 currentInstanceName:', currentInstanceName);
    
    let validationIntervalId: NodeJS.Timeout;
    
    if (showQrModal && qrCodeUrl && !qrLoading && connectionStatus !== 'connected') {
      console.log('✅ Starting independent periodic connection check (like SkillaBot)');
      setIsCheckingConnection(true);
      
      // Verificação a cada 10 segundos (igual ao SkillaBot) - APENAS PARA VALIDAÇÃO
      validationIntervalId = setInterval(async () => {
        try {
          console.log('🔍 Independent connection validation check...');
          console.log('🔍 Current instance name:', currentInstanceName);
          console.log('🔍 University:', university?.name);
          console.log('🔍 User:', user?.email);
          
          // VALIDAÇÃO INDEPENDENTE - Sem depender do refresh do QR code
          if (!currentInstanceName) {
            console.log('❌ No currentInstanceName available for validation');
            return;
          }
          
          const validationResult = await validateWhatsAppConnection(currentInstanceName);
          
          if (validationResult?.state === 'connected' || validationResult?.state === 'conectado' || validationResult?.state === 'open') {
            console.log('🎉 Independent connection detected!');
            setConnectionStatus('connected');
            
            // Update database with connection success
            if (university && user) {
              console.log('💾 Updating database with connection success...');
              const { error: updateError } = await supabase
                .from('whatsapp_connections')
                .update({
                  connection_status: 'connected',
                  connected_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('instance_name', currentInstanceName);

              if (updateError) {
                console.error('❌ Error updating connection status:', updateError);
              } else {
                console.log('✅ Database updated successfully');
              }
            }

            // FECHAR O MODAL IMEDIATAMENTE PARA EVITAR LOOP INFINITO
            console.log('🚪 Closing modal immediately...');
            setShowQrModal(false);
            setQrCodeUrl(null);
            setConnectionStatus(null);
            setIsCheckingConnection(false);
            setIsAutoRefreshing(false);
            setCurrentInstanceName('');
            
            // Limpar o intervalo de validação
            if (validationIntervalId) {
              clearInterval(validationIntervalId);
            }
            
            // Refresh the connections list
            console.log('🔄 Refreshing connections list...');
            fetchConnections();
            
            return; // SAIR DA FUNÇÃO IMEDIATAMENTE
          } else {
            console.log('⏳ Connection not ready yet. State:', validationResult?.state);
          }
        } catch (error) {
          console.error('❌ Error during independent validation:', error);
        }
      }, 10000); // 10 segundos APENAS para validação
    }

    return () => {
      if (validationIntervalId) {
        console.log('Clearing independent validation interval');
        clearInterval(validationIntervalId);
      }
    };
  }, [showQrModal, qrCodeUrl, qrLoading, connectionStatus, currentInstanceName, university, user, supabase, fetchConnections]);

  // Atualização automática do QR code a cada 5 minutos (300 segundos)
  useEffect(() => {
    console.log('🔄 useEffect para atualização automática do QR triggered');
    console.log('🔄 showQrModal:', showQrModal);
    console.log('🔄 qrCodeUrl exists:', !!qrCodeUrl);
    console.log('🔄 qrLoading:', qrLoading);
    console.log('🔄 connectionStatus:', connectionStatus);
    console.log('🔄 currentInstanceName:', currentInstanceName);
    
    let qrRefreshIntervalId: NodeJS.Timeout;
    
    if (showQrModal && qrCodeUrl && !qrLoading && connectionStatus !== 'connected') {
      console.log('✅ Starting automatic QR code refresh every 5 minutes');
      setIsAutoRefreshing(true);
      
      // Usar variável de ambiente ou padrão de 5 minutos
      const checkInterval = import.meta.env.VITE_WHATSAPP_CHECK_INTERVAL || 300000; // 5 minutos = 300000 ms
      const countdownSeconds = checkInterval / 1000;
      console.log(`Starting automatic QR code refresh every ${countdownSeconds} seconds`);
      
      qrRefreshIntervalId = setInterval(async () => {
        try {
          console.log('🔄 Auto-refreshing QR code...');
          console.log('🔄 Current instance name:', currentInstanceName);
          console.log('🔄 University:', university?.name);
          console.log('🔄 User:', user?.email);
          setIsAutoRefreshing(true);
          
          // Build dynamic payload for QR refresh (igual ao Skilabot)
          const payload = {
            instance_name: currentInstanceName
          };
          
          console.log('🔄 QR refresh payload:', payload);
          
          // Direct call to the webhook for automatic refresh
          const response = await fetch('https://nwh.suaiden.com/webhook/qrcode_atualizado', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          
          console.log('🔄 QR refresh response status:', response.status);
          
          if (response.ok) {
            const qrCodeData = await response.text();
            console.log('🔄 QR refresh response length:', qrCodeData.length);
            
            if (qrCodeData && /^[A-Za-z0-9+/=]+$/.test(qrCodeData) && qrCodeData.length > 100) {
              console.log('Valid QR code data detected for auto-refresh, updating URL');
              setQrCodeUrl(qrCodeData);
              console.log('QR code refreshed successfully');
            } else {
              console.log('No valid QR code data received from auto-refresh');
            }
          } else {
            console.error('❌ Error refreshing QR code:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('Error during auto-refresh:', error);
        } finally {
          setIsAutoRefreshing(false);
        }
      }, checkInterval);
    }

    return () => {
      if (qrRefreshIntervalId) {
        console.log('Clearing automatic QR code refresh');
        clearInterval(qrRefreshIntervalId);
      }
    };
  }, [showQrModal, qrCodeUrl, qrLoading, connectionStatus, currentInstanceName, university, user]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">WhatsApp Connection</h1>
        <p className="text-gray-600">
          Connect your university's WhatsApp to enable automated conversations with AI assistants.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  WhatsApp Connections
                </h2>
                <p className="text-gray-600 mt-1">
                  Manage your university's WhatsApp connections for AI-powered conversations
                </p>
              </div>
              <button 
                onClick={handleCreateConnection}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Smartphone className="h-4 w-4" />
                Connect New WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Connections List */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading connections...</span>
              </div>
            </div>
          </div>
        ) : connections.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No WhatsApp Connections</h3>
              <p className="text-gray-600 mb-6">
                Connect your first WhatsApp number to start automating conversations with AI assistants.
              </p>
              <button 
                onClick={handleCreateConnection}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
              >
                <Smartphone className="h-4 w-4" />
                Connect WhatsApp
              </button>
            </div>
          </div>
        ) : (
          connections.map((connection) => (
            <div key={connection.id} className="bg-white rounded-2xl shadow-sm border border-slate-200">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(connection.connection_status)}
                    <span className="text-sm text-gray-500 font-mono">
                      {connection.instance_name}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {connection.connection_status === 'connected' && (
                      <button
                        onClick={() => handleDisconnect(connection.id, connection.instance_name)}
                        disabled={actionLoading === connection.id}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-3 py-1 rounded-lg border border-orange-200 text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <WifiOff className="h-4 w-4" />
                        {actionLoading === connection.id ? "Disconnecting..." : "Disconnect"}
                      </button>
                    )}
                    {connection.connection_status === 'disconnected' && (
                      <button
                        onClick={() => handleReconnect(connection.id, connection.instance_name)}
                        disabled={actionLoading === connection.id}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {actionLoading === connection.id ? "Reconnecting..." : "Reconnect"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(connection.id, connection.instance_name)}
                      disabled={actionLoading === connection.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg border border-red-200 text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {actionLoading === connection.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Phone Number:</span>
                    <div className="text-gray-600">
                      {connection.phone_number || <span className="italic">Not provided</span>}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Instance ID:</span>
                    <div className="text-gray-600 font-mono text-xs">
                      {connection.id}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Connected at:</span>
                    <div className="text-gray-600">
                      {connection.connected_at 
                        ? new Date(connection.connected_at).toLocaleString('en-US')
                        : <span className="italic">-</span>
                      }
                    </div>
                  </div>
                  {connection.disconnected_at && (
                    <div>
                      <span className="font-medium text-gray-700">Disconnected at:</span>
                      <div className="text-gray-600">
                        {new Date(connection.disconnected_at).toLocaleString('en-US')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Connect WhatsApp</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
                title="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Scan the QR Code with your WhatsApp to connect your university's WhatsApp account.
            </p>
            
            <div className="space-y-6">
              <div className="flex justify-center">
                {getStatusBadgeForModal()}
              </div>

              <div className="flex flex-col items-center space-y-4">
                {qrLoading ? (
                  <div className="flex flex-col items-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-sm text-gray-600">Generating QR Code...</p>
                  </div>
                ) : qrError ? (
                  <div className="text-center space-y-3">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                    <p className="text-sm text-red-600">{qrError}</p>
                  </div>
                ) : qrCodeUrl ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={`data:image/png;base64,${qrCodeUrl}`}
                        alt="QR Code for WhatsApp connection"
                        className="mx-auto"
                        style={{ width: 200, height: 200 }} 
                      />
                    </div>
                    
                    {/* Cronômetro fora do QR code */}
                    <div className="mt-4 flex justify-center">
                      <div className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                        connectionStatus === 'connected' 
                          ? 'bg-green-500 text-white' 
                          : connectionStatus === 'open'
                          ? 'bg-blue-500 text-white'
                          : connectionStatus === 'failed'
                          ? 'bg-red-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {connectionStatus === 'connected' ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            <span>Connected successfully!</span>
                          </>
                        ) : connectionStatus === 'open' ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Validating connection...</span>
                          </>
                        ) : connectionStatus === 'failed' ? (
                          <>
                            <AlertCircle className="h-4 w-4" />
                            <span>Connection failed</span>
                          </>
                        ) : isAutoRefreshing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Refreshing QR code...</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4" />
                            <span>Next refresh in <span className="font-bold">{countdown}</span>s</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Informações e barra de progresso */}
                    <div className="text-center space-y-2">
                      <p className="text-xs text-gray-500">
                        QR code will refresh automatically in <span className="font-medium text-blue-600">{countdown}</span> seconds
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-blue-500 h-1 rounded-full transition-all duration-1000 ease-linear"
                          style={{ 
                            width: `${Math.max(0, ((300 - countdown) / 300) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Status de conexão */}
                    {connectionStatus === 'connected' && (
                      <div className="text-center space-y-2 mt-4">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                        <p className="text-sm text-green-600 font-medium">WhatsApp connected successfully!</p>
                        <p className="text-xs text-gray-500">Redirecting...</p>
                      </div>
                    )}
                    
                    {/* Status de validação */}
                    {connectionStatus === 'open' && (
                      <div className="text-center space-y-2 mt-4">
                        <Loader2 className="h-12 w-12 text-blue-500 mx-auto animate-spin" />
                        <p className="text-sm text-blue-600 font-medium">QR Code scanned!</p>
                        <p className="text-xs text-gray-500">Waiting for WhatsApp connection...</p>
                      </div>
                    )}
                    
                    {connectionStatus === 'connecting' && (
                      <div className="text-center space-y-2 mt-4">
                        <Loader2 className="h-12 w-12 text-yellow-500 mx-auto animate-spin" />
                        <p className="text-sm text-yellow-600 font-medium">Scanning QR Code...</p>
                        <p className="text-xs text-gray-500">Please scan the QR code with your WhatsApp</p>
                      </div>
                    )}
                    
                    {connectionStatus === 'failed' && (
                      <div className="text-center space-y-2 mt-4">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                        <p className="text-sm text-red-600 font-medium">Connection failed</p>
                        <p className="text-xs text-gray-500">Please try again or refresh the QR code</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col space-y-2">
                <button
                  onClick={handleRefreshQrCode}
                  disabled={qrLoading || connectionStatus === 'connected'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {qrLoading ? "Generating..." : "Refresh QR Code"}
                </button>
                
                <button 
                  onClick={handleCloseModal} 
                  className="w-full px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg disabled:opacity-50"
                  disabled={connectionStatus === 'connected'}
                >
                  {connectionStatus === 'connected' ? 'Finalizing...' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConnectionId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Connection</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this WhatsApp connection? This action cannot be undone and will completely remove the connection from your account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConnectionId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Dialog */}
      {disconnectConnectionId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Disconnect WhatsApp</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to disconnect this WhatsApp connection? The connection will be disconnected, but not deleted. You can reconnect later if needed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDisconnectConnectionId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDisconnect}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 