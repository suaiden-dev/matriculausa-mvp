import React from 'react';
import { Brain } from 'lucide-react';

export const AgentsTab = () => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 lg:p-10">
      <div className="text-center py-8 md:py-12">
        <Brain className="h-10 w-10 md:h-12 md:w-12 text-[#05294E] mx-auto mb-4 md:mb-6" />
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">AI Agents Management</h3>
        <p className="text-gray-600 mb-6 md:mb-8 text-sm md:text-base">
          Create and manage your AI agents before connecting them to WhatsApp.
        </p>
        <p className="text-sm text-gray-500">
          This section will be implemented in the next phase.
        </p>
      </div>
    </div>
  );
};