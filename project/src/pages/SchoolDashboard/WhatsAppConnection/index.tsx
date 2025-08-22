import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useUniversity } from '../../../context/UniversityContext';
import { Brain } from 'lucide-react';

import { useWhatsAppConnection } from './hooks/useWhatsAppConnection';
import { useQRCodeValidation } from './hooks/useQRCodeValidation';

import { TabNavigation } from './components/TabNavigation';
import { ConnectionsList } from './components/ConnectionsList';
import { QRCodeModal } from './components/QRCodeModal';
import { DeleteDialog } from './components/ConfirmationDialogs/DeleteDialog';
import { DisconnectDialog } from './components/ConfirmationDialogs/DisconnectDialog';

export default function WhatsAppConnection() {
  const { user } = useAuth();
  const { university } = useUniversity();
  
  const [activeTab, setActiveTab] = useState<'agents' | 'whatsapp'>('agents');
  
  // Estados para os diálogos de confirmação
  const [deleteConnectionId, setDeleteConnectionId] = useState<string | null>(null);
  const [deleteInstanceName, setDeleteInstanceName] = useState<string | null>(null);
  const [disconnectConnectionId, setDisconnectConnectionId] = useState<string | null>(null);
  const [disconnectInstanceName, setDisconnectInstanceName] = useState<string | null>(null);

  // Estados para o modal de QR Code
  const [showQrModal, setShowQrModal] = useState(false);
  const [currentConnectionId, setCurrentConnectionId] = useState<string | null>(null);
  const [currentInstanceName, setCurrentInstanceName] = useState<string | null>(null);

  // Hooks customizados
  const {
    connections,
    loading,
    actionLoading,
    fetchConnections,
    disconnectConnection,
    deleteConnection
  } = useWhatsAppConnection(university, user);

  const {
    qrCodeUrl,
    qrLoading,
    setQrLoading,
    qrError,
    setQrError,
    isCheckingConnection,
    connectionStatus,
    isAutoRefreshing,
    countdown,
    refreshQRCodeData
  } = useQRCodeValidation(
    currentInstanceName,
    currentConnectionId,
    () => {
      setShowQrModal(false);
      fetchConnections();
    },
    showQrModal
  );

  // Handlers
  const handleCreateConnection = () => {
    // Apenas redireciona para a aba AI Agents
    setActiveTab('agents');
  };

  const handleReconnect = async (id: string, instanceName: string) => {
    setCurrentConnectionId(id);
    setCurrentInstanceName(instanceName);
    setQrLoading(true);
    setQrError(null);
    setShowQrModal(true);
    
    try {
      await refreshQRCodeData();
      fetchConnections();
    } catch (error) {
      console.error('Error reconnecting:', error);
      setShowQrModal(false);
    } finally {
      setQrLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowQrModal(false);
    setCurrentConnectionId(null);
    setCurrentInstanceName(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-3">WhatsApp Connection</h1>
        <p className="text-gray-600 text-base md:text-lg">
          Connect your university's WhatsApp to enable automated conversations with AI assistants.
        </p>
      </div>

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'agents' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 lg:p-10">
          <div className="text-center py-8 md:py-12">
            <Brain className="h-10 w-10 md:h-12 md:w-12 text-[#05294E] mx-auto mb-4 md:mb-6" />
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">AI Agents Management</h3>
            <p className="text-gray-600 mb-6 md:mb-8">
              Create and manage your AI agents before connecting them to WhatsApp.
            </p>
            <p className="text-sm text-gray-500">
              This section will be implemented in the next phase.
            </p>
          </div>
        </div>
      ) : (
        <ConnectionsList
          connections={connections}
          loading={loading}
          actionLoading={actionLoading}
          onCreateConnection={handleCreateConnection}
          onDisconnect={(id, instanceName) => {
            setDisconnectConnectionId(id);
            setDisconnectInstanceName(instanceName);
          }}
          onReconnect={handleReconnect}
          onDelete={(id, instanceName) => {
            setDeleteConnectionId(id);
            setDeleteInstanceName(instanceName);
          }}
        />
      )}

      <QRCodeModal
        isOpen={showQrModal}
        onClose={handleCloseModal}
        onRefresh={refreshQRCodeData}
        qrCodeUrl={qrCodeUrl}
        qrLoading={qrLoading}
        qrError={qrError}
        isCheckingConnection={isCheckingConnection}
        connectionStatus={connectionStatus}
        isAutoRefreshing={isAutoRefreshing}
        countdown={countdown}
      />

      {deleteConnectionId && deleteInstanceName && (
        <DeleteDialog
          instanceName={deleteInstanceName}
          onConfirm={async () => {
            await deleteConnection(deleteConnectionId);
            setDeleteConnectionId(null);
            setDeleteInstanceName(null);
          }}
          onCancel={() => {
            setDeleteConnectionId(null);
            setDeleteInstanceName(null);
          }}
        />
      )}

      {disconnectConnectionId && disconnectInstanceName && (
        <DisconnectDialog
          instanceName={disconnectInstanceName}
          onConfirm={async () => {
            await disconnectConnection(disconnectConnectionId);
            setDisconnectConnectionId(null);
            setDisconnectInstanceName(null);
          }}
          onCancel={() => {
            setDisconnectConnectionId(null);
            setDisconnectInstanceName(null);
          }}
        />
      )}
    </div>
  );
}