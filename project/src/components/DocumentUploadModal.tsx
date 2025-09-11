import React from 'react';
import DocumentUpload from './DocumentUpload';
import { FaTimes } from 'react-icons/fa';

interface DocumentUploadModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ onSuccess, onClose }) => {
  // Hide floating elements when modal is open
  React.useEffect(() => {
    // Hide floating elements when modal opens
    document.body.classList.add('modal-open');
    
    // Cleanup function to show floating elements when modal closes
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative">
        <button
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl focus:outline-none"
          aria-label="Close"
          onClick={onClose}
        >
          <FaTimes />
        </button>
        <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">Upload Required Documents</h2>
        <p className="text-slate-600 text-center mb-6">
          Please upload the following documents to proceed:<br />
          <strong>Passport</strong>, <strong>High School Diploma</strong>, and <strong>Proof of Funds</strong>.<br />
          Each field below accepts only one file. All files must be clear and legible.
        </p>
        
        <DocumentUpload onUploadSuccess={onSuccess} />
        
      </div>
    </div>
  );
};

export default DocumentUploadModal; 