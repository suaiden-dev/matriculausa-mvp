import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface CosI20SectionProps {
  student: any;
  isPlatformAdmin: boolean;
  onRefresh?: () => void;
  handleViewDocument: (doc: any) => void;
  handleDownloadDocument: (doc: any) => void;
}

export const CosI20Section: React.FC<CosI20SectionProps> = React.memo(({
  student,
  isPlatformAdmin,
  onRefresh,
  handleViewDocument,
  handleDownloadDocument,
}) => {
  const [i20File, setI20File] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const getCosApplication = () => {
    const apps = student?.all_applications?.filter((app: any) =>
      app.student_process_type === 'change_of_status'
    ) || [];
    return (
      apps.find((app: any) => app.status === 'enrolled') ||
      apps.find((app: any) => app.i20_document_url) ||
      apps.find((app: any) => app.is_application_fee_paid) ||
      apps[0]
    );
  };

  const cosApp = getCosApplication();

  if (!cosApp) return null;

  const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9.-]/g, '_');

  const handleUpload = async () => {
    if (!isPlatformAdmin || !i20File || !cosApp) return;
    setUploading(true);
    try {
      const sanitized = sanitizeFileName(i20File.name);
      const storagePath = `${student.user_id}/i20-documents/${Date.now()}_${sanitized}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(storagePath, i20File, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('document-attachments')
        .getPublicUrl(uploadData?.path || storagePath);

      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({
          i20_document_url: publicUrl,
          i20_document_status: 'sent',
          i20_document_sent_at: new Date().toISOString(),
        })
        .eq('id', cosApp.id);

      if (updateError) throw updateError;

      setI20File(null);
      onRefresh?.();
    } catch (err: any) {
      alert('Failed to upload I-20: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-sm relative overflow-hidden">
      <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-5 rounded-t-3xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
            <svg className="w-6 h-6 text-[#05294E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">I-20 Document</h3>
            <p className="text-blue-100 text-sm">I-20 document for Change of Status students</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {cosApp.i20_document_url ? (
          <div className="bg-white rounded-3xl p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2 mb-1">
                  <p className="font-medium text-slate-900 break-words">
                    {cosApp.i20_document_url.split('/').pop() || 'I-20 Document'}
                  </p>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 whitespace-nowrap">
                    Available
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  Sent on {cosApp.i20_document_sent_at
                    ? new Date(cosApp.i20_document_sent_at).toLocaleDateString('pt-BR')
                    : 'N/A'}
                </p>

                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <button
                    onClick={() => handleViewDocument({
                      file_url: cosApp.i20_document_url,
                      filename: cosApp.i20_document_url.split('/').pop() || 'i20.pdf'
                    })}
                    className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDownloadDocument({
                      file_url: cosApp.i20_document_url,
                      filename: cosApp.i20_document_url.split('/').pop() || 'i20.pdf'
                    })}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                  >
                    Download
                  </button>
                  {isPlatformAdmin && (
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.doc,.docx';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) setI20File(file);
                        };
                        input.click();
                      }}
                      className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                    >
                      Replace
                    </button>
                  )}
                </div>
              </div>
            </div>

            {isPlatformAdmin && i20File && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-[#05294E] mb-4">Replace I-20 Document</h4>
                <p className="text-sm text-slate-600 mb-4">Selected: {i20File.name}</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                  >
                    {uploading ? 'Uploading...' : 'Replace I-20'}
                  </button>
                  <button
                    onClick={() => setI20File(null)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-slate-700 mb-2">
                {i20File ? 'Upload I-20 Document' : 'I-20 Not Sent Yet'}
              </h4>
              <p className="text-slate-500 max-w-md mx-auto mb-6">
                {i20File
                  ? 'Click Upload to send this I-20 to the student.'
                  : 'Upload the I-20 document issued by the university for this COS student.'}
              </p>

              {isPlatformAdmin && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-200 transition font-medium text-blue-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>{i20File ? 'Change file' : 'Select I-20 File'}</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setI20File(e.target.files?.[0] || null)}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                  {i20File && (
                    <p className="text-sm text-slate-600 text-center">Selected: {i20File.name}</p>
                  )}
                  <button
                    onClick={handleUpload}
                    disabled={!i20File || uploading}
                    className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : 'Upload I-20'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

CosI20Section.displayName = 'CosI20Section';
