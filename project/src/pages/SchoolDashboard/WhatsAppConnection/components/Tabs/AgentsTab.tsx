import React from 'react';
import { Brain } from 'lucide-react';

export const AgentsTab = () => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="text-center py-8">
        <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Agents Management</h3>
        <p className="text-gray-600 mb-6">
          Create and manage your AI agents before connecting them to WhatsApp.
        </p>
        <p className="text-sm text-gray-500">
          This section will be implemented in the next phase.
        </p>
      </div>
    </div>
  );
};