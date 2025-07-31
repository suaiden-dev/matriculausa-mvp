import React from 'react';

interface DeleteDialogProps {
  instanceName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteDialog = ({ instanceName, onConfirm, onCancel }: DeleteDialogProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Connection</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete the instance <strong className="font-mono">{instanceName}</strong>? This action cannot be undone.
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
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};