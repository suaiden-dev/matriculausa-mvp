import React from 'react';
import { CheckSquare, FileText, RefreshCw } from 'lucide-react';

interface BulkDocumentActionsBarProps {
  selectedCount: number;
  onGenerateDocuments: () => void;
  onClearSelection: () => void;
  isGenerating: boolean;
}

function BulkDocumentActionsBarBase({
  selectedCount,
  onGenerateDocuments,
  onClearSelection,
  isGenerating
}: BulkDocumentActionsBarProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <CheckSquare size={20} className="text-blue-600" />
          <span className="text-lg font-semibold">
            {selectedCount} student{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onGenerateDocuments}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText size={16} />
                Generate Documents
              </>
            )}
          </button>
          <button
            onClick={onClearSelection}
            className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear Selection
          </button>
        </div>
      </div>
    </div>
  );
}

export const BulkDocumentActionsBar = React.memo(BulkDocumentActionsBarBase);
export default BulkDocumentActionsBar;
