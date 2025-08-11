import React from 'react';
import { WifiOff, RotateCcw, Trash2 } from 'lucide-react';
import type { WhatsAppConnection } from '../../types';

interface ConnectionCardProps {
  connection: WhatsAppConnection;
  onDisconnect: (id: string, instanceName: string) => void;
  onReconnect: (id: string, instanceName: string) => void;
  onDelete: (id: string, instanceName: string) => void;
  actionLoading: string | null;
}

export const ConnectionCard = ({
  connection,
  onDisconnect,
  onReconnect,
  onDelete,
  actionLoading
}: ConnectionCardProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <span className="inline-flex items-center px-2.5 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-medium bg-green-100 text-green-800">Connected</span>;
      case 'connecting':
        return <span className="inline-flex items-center px-2.5 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-medium bg-yellow-100 text-yellow-800">Connecting</span>;
      case 'disconnected':
        return <span className="inline-flex items-center px-2.5 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-medium bg-gray-100 text-gray-800">Disconnected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-medium bg-red-100 text-red-800">Error</span>;
    }
  };

  return (
    <div className="p-6 md:p-8 border-b border-slate-200 last:border-b-0">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 md:mb-6 gap-4 md:gap-0">
        <div className="flex items-center gap-3 md:gap-4">
          {getStatusBadge(connection.connection_status)}
          <span className="text-sm text-gray-500 font-mono">
            {connection.instance_name}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          {connection.connection_status === 'connected' && (
            <button
              onClick={() => onDisconnect(connection.id, connection.instance_name)}
              disabled={actionLoading === connection.id}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-orange-200 text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2 transition-colors disabled:opacity-50"
            >
              <WifiOff className="h-3 w-3 md:h-4 md:w-4" />
              {actionLoading === connection.id ? "..." : "Disconnect"}
            </button>
          )}
          {connection.connection_status === 'disconnected' && (
            <button
              onClick={() => onReconnect(connection.id, connection.instance_name)}
              disabled={actionLoading === connection.id}
              className="text-[#05294E] hover:text-[#05294E]/80 hover:bg-[#05294E]/5 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-[#05294E]/20 text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3 md:h-4 md:w-4" />
              {actionLoading === connection.id ? "..." : "Reconnect"}
            </button>
          )}
          <button
            onClick={() => onDelete(connection.id, connection.instance_name)}
            disabled={actionLoading === connection.id}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-red-200 text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
            {actionLoading === connection.id ? "..." : "Delete"}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 text-sm">
        <div>
          <span className="font-semibold text-gray-700 mb-1 md:mb-2 block">Phone Number</span>
          <div className="text-gray-600">
            {connection.phone_number || <span className="italic">Not provided</span>}
          </div>
        </div>
        <div>
          <span className="font-semibold text-gray-700 mb-1 md:mb-2 block">Connected at</span>
          <div className="text-gray-600">
            {connection.connected_at 
              ? new Date(connection.connected_at).toLocaleString()
              : <span className="italic">-</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
};