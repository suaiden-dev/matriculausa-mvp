import React from 'react';
import { MessageSquare, Smartphone } from 'lucide-react';

interface EmptyStateProps {
  onCreateConnection: () => void;
}

export const EmptyState = ({ onCreateConnection }: EmptyStateProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="p-8 text-center">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No WhatsApp Connections</h3>
        <p className="text-gray-600 mb-6">
          Connect your first WhatsApp number to start automating conversations with AI assistants.
        </p>
        <button 
          onClick={onCreateConnection}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
        >
          <Smartphone className="h-4 w-4" />
          Connect WhatsApp
        </button>
      </div>
    </div>
  );
};