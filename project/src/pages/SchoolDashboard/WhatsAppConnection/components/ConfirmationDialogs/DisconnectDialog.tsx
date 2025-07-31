import React from 'react';

interface DisconnectDialogProps {
  instanceName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DisconnectDialog = ({ instanceName, onConfirm, onCancel }: DisconnectDialogProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Disconnect WhatsApp</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to disconnect the instance <strong className="font-mono">{instanceName}</strong>? You can reconnect it later.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};