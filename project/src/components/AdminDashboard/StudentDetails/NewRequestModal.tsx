import React from 'react';

interface NewDocumentRequest {
  title: string;
  description: string;
  due_date: string;
  attachment: File | null;
}

interface NewRequestModalProps {
  isOpen: boolean;
  studentName: string;
  newDocumentRequest: NewDocumentRequest;
  creatingDocumentRequest: boolean;
  onClose: () => void;
  onRequestChange: (updates: Partial<NewDocumentRequest>) => void;
  onCreate: () => Promise<void>;
}

export const NewRequestModal: React.FC<NewRequestModalProps> = React.memo(({
  isOpen,
  studentName,
  newDocumentRequest,
  creatingDocumentRequest,
  onClose,
  onRequestChange,
  onCreate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg mx-4 border border-slate-200">
        <h3 className="font-extrabold text-xl mb-6 text-[#05294E] text-center">New Document Request</h3>
        <p className="text-sm text-slate-600 mb-6 text-center">
          Request a new document from {studentName}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Document Title <span className="text-red-500">*</span>
            </label>
            <input
              className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base"
              placeholder="e.g., Additional Bank Statement"
              value={newDocumentRequest.title}
              onChange={(e) => onRequestChange({ title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base min-h-[80px] resize-vertical"
              placeholder="Describe what document you need and any specific requirements..."
              value={newDocumentRequest.description}
              onChange={(e) => onRequestChange({ description: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
            <input
              className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base"
              type="date"
              value={newDocumentRequest.due_date}
              onChange={(e) => onRequestChange({ due_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Template/Attachment (Optional)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition font-medium text-slate-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.586-6.586M16 5v6a2 2 0 002 2h6" />
                </svg>
                <span>{newDocumentRequest.attachment ? 'Change file' : 'Select file'}</span>
                <input
                  type="file"
                  className="sr-only"
                  onChange={(e) => onRequestChange({ attachment: e.target.files ? e.target.files[0] : null })}
                  disabled={creatingDocumentRequest}
                />
              </label>
              {newDocumentRequest.attachment && (
                <span className="text-xs text-slate-700 truncate max-w-[180px]">
                  {newDocumentRequest.attachment.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <button
            className="flex-1 bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-medium hover:bg-slate-300 transition disabled:opacity-50"
            onClick={onClose}
            disabled={creatingDocumentRequest}
          >
            Cancel
          </button>
          <button
            className="flex-1 bg-[#05294E] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#041f38] transition disabled:opacity-50 flex items-center justify-center"
            onClick={onCreate}
            disabled={creatingDocumentRequest || !newDocumentRequest.title.trim()}
          >
            {creatingDocumentRequest ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              'Create Request'
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

NewRequestModal.displayName = 'NewRequestModal';

