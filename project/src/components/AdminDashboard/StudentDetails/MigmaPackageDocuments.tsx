import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface MigmaFile {
  name: string;
  url: string;
  type: 'formulario' | 'documento';
  category: string;
}

interface MigmaPackage {
  id: string;
  student_name: string;
  process_type: string | null;
  zip_url: string;
  zip_expires_at: string | null;
  files: MigmaFile[];
  status: string;
  received_at: string;
  transfer_form_filled_url: string | null;
  transfer_form_status: string | null;
}

interface MigmaPackageDocumentsProps {
  studentUserId: string;
  studentEmail: string;
  onViewDocument: (doc: { file_url: string; filename: string }) => void;
  onDownloadDocument: (doc: { file_url: string; filename: string }) => void;
}

const MigmaPackageDocuments: React.FC<MigmaPackageDocumentsProps> = ({
  studentUserId,
  studentEmail,
  onViewDocument,
  onDownloadDocument,
}) => {
  const [packages, setPackages] = useState<MigmaPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true);
      try {
        // Try by user_id first, fallback to email
        console.log('[MigmaPackageDocuments] querying with:', { studentUserId, studentEmail });

        let { data, error } = await supabase
          .from('migma_packages')
          .select('*')
          .eq('student_user_id', studentUserId)
          .order('received_at', { ascending: false });

        console.log('[MigmaPackageDocuments] user_id query result:', { data, error });

        if ((error || !data?.length) && studentEmail) {
          const res = await supabase
            .from('migma_packages')
            .select('*')
            .eq('student_email', studentEmail)
            .order('received_at', { ascending: false });
          data = res.data;
          error = res.error;
          console.log('[MigmaPackageDocuments] email query result:', { data, error });
        }

        if (!error && data) {
          setPackages(data);
          if (data.length > 0) setExpandedPackage(data[0].id);
        }
      } catch (err) {
        console.error('[MigmaPackageDocuments] fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (studentUserId || studentEmail) fetchPackages();
  }, [studentUserId, studentEmail]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const formularios = (pkg: MigmaPackage) => pkg.files.filter((f) => f.type === 'formulario');
  const documentos = (pkg: MigmaPackage) => pkg.files.filter((f) => f.type === 'documento');

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 rounded-t-3xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-[#FFD700] rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
            <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Migma Package Documents</h3>
            <p className="text-slate-300 text-sm">Documents sent by Migma for this student</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading package...</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-slate-700 mb-1">No package received yet</h4>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              The Migma admin hasn't sent the document package yet. It will appear here once sent.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {packages.map((pkg) => (
              <div key={pkg.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                {/* Package header */}
                <button
                  onClick={() => setExpandedPackage(expandedPackage === pkg.id ? null : pkg.id)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        Package — {formatDate(pkg.received_at)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {pkg.files.length} file{pkg.files.length !== 1 ? 's' : ''} · {pkg.process_type ?? 'standard'}
                        {pkg.zip_expires_at && ` · ZIP expires ${formatDate(pkg.zip_expires_at)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      pkg.status === 'received' ? 'bg-blue-100 text-blue-800' :
                      pkg.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {pkg.status}
                    </span>
                    <a
                      href={pkg.zip_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-[#05294E] font-medium hover:underline whitespace-nowrap"
                    >
                      Download ZIP
                    </a>
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform ${expandedPackage === pkg.id ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* File list */}
                {expandedPackage === pkg.id && (
                  <div className="p-5 space-y-4">
                    {formularios(pkg).length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Signed Forms ({formularios(pkg).length})
                        </h5>
                        <div className="space-y-2">
                          {formularios(pkg).map((file, idx) => (
                            <FileRow
                              key={idx}
                              file={file}
                              onView={onViewDocument}
                              onDownload={onDownloadDocument}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {documentos(pkg).length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Student Documents ({documentos(pkg).length})
                        </h5>
                        <div className="space-y-2">
                          {documentos(pkg).map((file, idx) => (
                            <FileRow
                              key={idx}
                              file={file}
                              onView={onViewDocument}
                              onDownload={onDownloadDocument}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transfer Form filled by student - REMOVIDO: Agora é exibido no card de topo (TransferFormSection) */}

                    {pkg.files.length === 0 && !pkg.transfer_form_filled_url && (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No individual files listed. Use the ZIP download above.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FileRow: React.FC<{
  file: MigmaFile;
  onView: (doc: { file_url: string; filename: string }) => void;
  onDownload: (doc: { file_url: string; filename: string }) => void;
}> = ({ file, onView, onDownload }) => (
  <div className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
    </div>
    <div className="flex gap-2 flex-shrink-0">
      <button
        onClick={() => onView({ file_url: file.url, filename: file.name })}
        className="bg-[#05294E] hover:bg-[#041f38] text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
      >
        View
      </button>
      <button
        onClick={() => onDownload({ file_url: file.url, filename: file.name })}
        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
      >
        Download
      </button>
    </div>
  </div>
);

export default MigmaPackageDocuments;
