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
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Connected</span>;
      case 'connecting':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Connecting</span>;
      case 'disconnected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Disconnected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Error</span>;
    }
  };

  return (
    <div className="p-6 border-b border-slate-200 last:border-b-0">
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
              onClick={() => onDisconnect(connection.id, connection.instance_name)}
              disabled={actionLoading === connection.id}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-3 py-1 rounded-lg border border-orange-200 text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <WifiOff className="h-4 w-4" />
              {actionLoading === connection.id ? "..." : "Disconnect"}
            </button>
          )}
          {connection.connection_status === 'disconnected' && (
            <button
              onClick={() => onReconnect(connection.id, connection.instance_name)}
              disabled={actionLoading === connection.id}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              {actionLoading === connection.id ? "..." : "Reconnect"}
            </button>
          )}
          <button
            onClick={() => onDelete(connection.id, connection.instance_name)}
            disabled={actionLoading === connection.id}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg border border-red-200 text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {actionLoading === connection.id ? "..." : "Delete"}
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
          <span className="font-medium text-gray-700">Connected at:</span>
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