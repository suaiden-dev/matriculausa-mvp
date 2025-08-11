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
      <div className="p-6 md:p-8 border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2 md:gap-3 mb-2">
              <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-[#05294E]" />
              WhatsApp Connections
            </h2>
            <p className="text-gray-600 text-sm md:text-base">
              Manage your university's WhatsApp connections
            </p>
          </div>
          <button 
            onClick={onCreateConnection}
            className="w-full md:w-auto bg-[#05294E] hover:bg-[#05294E]/90 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl font-medium flex items-center justify-center gap-2 md:gap-3 transition-colors shadow-lg hover:shadow-xl text-sm md:text-base"
          >
            <Smartphone className="h-4 w-4 md:h-5 md:w-5" />
            Connect New WhatsApp
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 md:p-12 text-center">
          <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-[#05294E] mx-auto" />
        </div>
      ) : connections.length === 0 ? (
        <div className="p-8 md:p-12 text-center">
          <MessageSquare className="h-10 w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-4 md:mb-6" />
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">No WhatsApp Connections</h3>
          <p className="text-gray-600 mb-6 md:mb-8 text-sm md:text-base">
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