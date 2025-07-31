import React from 'react';
import { MessageSquare, Smartphone, Loader2 } from 'lucide-react';
import type { WhatsAppConnection } from '../../types';
import { ConnectionCard } from './ConnectionCard';

interface ConnectionsListProps {
  connections: WhatsAppConnection[];
  loading: boolean;
  actionLoading: string | null;
  onCreateConnection: () => void;
  onDisconnect: (id: string, instanceName: string) => void;
  onReconnect: (id: string, instanceName: string) => void;
  onDelete: (id: string, instanceName: string) => void;
}

export const ConnectionsList = ({
  connections,
  loading,
  actionLoading,
  onCreateConnection,
  onDisconnect,
  onReconnect,
  onDelete
}: ConnectionsListProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              WhatsApp Connections
            </h2>
            <p className="text-gray-600 mt-1">
              Manage your university's WhatsApp connections
            </p>
          </div>
          <button 
            onClick={onCreateConnection}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Smartphone className="h-4 w-4" />
            Connect New WhatsApp
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
        </div>
      ) : connections.length === 0 ? (
        <div className="p-8 text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No WhatsApp Connections</h3>
          <p className="text-gray-600 mb-6">
            Connect your first WhatsApp number to get started.
          </p>
        </div>
      ) : (
        connections.map((connection) => (
          <ConnectionCard
            key={connection.id}
            connection={connection}
            actionLoading={actionLoading}
            onDisconnect={onDisconnect}
            onReconnect={onReconnect}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
};