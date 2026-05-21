import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AdminUploadAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (title: string, file: File) => Promise<void>;
  applicationTitle?: string;
}

/**
 * AdminUploadAttachmentModal - Modal for admins to upload documents for students
 */
const AdminUploadAttachmentModal: React.FC<AdminUploadAttachmentModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  applicationTitle = 'Application',
}) => {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        // Sugestão de título baseada no nome do arquivo (sem extensão)
        const suggestedTitle = selectedFile.name.split('.').slice(0, -1).join('.');
        setTitle(suggestedTitle.replace(/_/g, ' ').replace(/-/g, ' '));
      }
    }
  };

  const handleSubmit = async () => {
    if (!file || !title.trim()) return;
    
    setIsProcessing(true);
    try {
      await onUpload(title.trim(), file);
      setFile(null);
      setTitle('');
      onClose();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error('Error uploading document: ' + (error?.message || 'Unknown error occurred. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const commonTitles = [
    "Official Acceptance Letter",
    "Enrollment Deposit Receipt",
    "Orientation Guide",
    "Health Insurance Manual",
    "Housing Information",
    "Financial Award Letter"
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-white">
            <Upload className="w-5 h-5" />
            <h3 className="text-lg font-bold">Upload for Student</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm text-slate-500 mb-4">
              Add a document to <span className="font-semibold text-slate-900">{applicationTitle}</span>. 
              The student will see this file in their "My Applications" view.
            </p>
          </div>

          <div className="space-y-4">
            {/* Title Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Document Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                placeholder="Ex: Official Acceptance Letter"
              />
            </div>

            {/* Common Titles Shortcuts */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Common Titles</p>
              <div className="flex flex-wrap gap-2">
                {commonTitles.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTitle(t)}
                    className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                      title === t 
                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* File Upload Area */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">File Attachment</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                  file 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="application/pdf,image/*,.doc,.docx"
                />
                
                {file ? (
                  <>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-green-700 truncate max-w-[250px]">
                        {file.name}
                      </p>
                      <p className="text-xs text-green-600/70">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Upload className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700">Click to select file</p>
                      <p className="text-xs text-slate-500">PDF, Images or Documents (Max 10MB)</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-4">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isProcessing || !file || !title.trim()}
              className="flex-[2] px-4 py-3 bg-[#05294E] hover:bg-[#041f38] text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {isProcessing ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span>Uploading...</span>
                </div>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span>Send to Student</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUploadAttachmentModal;
