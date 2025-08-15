import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ApplicationChat from '../../components/ApplicationChat';
import DocumentViewerModal from '../../components/DocumentViewerModal';

const DOCUMENTS_INFO = [
  { key: 'passport', label: 'Passport', description: "A valid copy of the student's passport. Used for identification and visa purposes." },
  { key: 'diploma', label: 'High School Diploma', description: 'Proof of high school graduation. Required for university admission.' },
  { key: 'funds_proof', label: 'Proof of Funds', description: 'A bank statement or financial document showing sufficient funds for study.' }
];

const AdminApplicationView: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (applicationId) {
      fetchApplicationDetails();
      fetchChatMessages();
      // Log admin view
      supabase.rpc('log_admin_action', {
        action_text: 'view_application',
        target_type_text: 'scholarship_application',
        target_id_param: applicationId,
        details_param: {}
      });
    }
  }, [applicationId]);

  const fetchApplicationDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select(`*, user_profiles!student_id(*), scholarships(*, universities(*))`)
        .eq('id', applicationId)
        .single();
      if (error) throw error;
      setApplication(data);
    } catch (err: any) {
      setError('Failed to load application details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchChatMessages = async () => {
    setChatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-application-messages', {
        method: 'POST',
        body: { application_id: applicationId },
      });
      if (error) throw error;
      setMessages(data.messages || []);
    } catch (err) {
      setMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-slate-500">Loading application details...</div>;
  }
  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }
  if (!application) {
    return <div className="text-center py-10 text-slate-500">Application not found.</div>;
  }

  return (
    <div className="p-4 md:p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Application Details</h2>
        {/* Student & Scholarship Info */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold text-[#05294E] mb-4">Student Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>Name:</strong> {application.user_profiles?.full_name}</div>
            <div><strong>Email:</strong> {application.user_profiles?.email}</div>
            <div><strong>Phone:</strong> {application.user_profiles?.phone || 'N/A'}</div>
            <div><strong>Country:</strong> {application.user_profiles?.country || 'N/A'}</div>
            <div><strong>Student Type:</strong> {application.student_process_type || 'N/A'}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold text-[#05294E] mb-4">Scholarship Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>Scholarship:</strong> {application.scholarships?.title || application.scholarships?.name}</div>
            <div><strong>Annual Value with Scholarship:</strong> ${Number(application.scholarships?.annual_value_with_scholarship || 0).toLocaleString()}</div>
            {application.scholarships?.course && <div><strong>Course:</strong> {application.scholarships.course}</div>}
            {application.scholarships?.country && <div><strong>Country:</strong> {application.scholarships.country}</div>}
            <div className="md:col-span-2"><strong>Description:</strong> {application.scholarships?.description}</div>
          </div>
        </div>
        {/* Student Documents */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold text-[#05294E] mb-4">Student Documents</h3>
          <ul className="space-y-6">
            {DOCUMENTS_INFO.map((doc) => {
              let docData = Array.isArray(application.documents)
                ? application.documents.find((d: any) => d.type === doc.key)
                : null;
              if (!docData && Array.isArray(application.user_profiles?.documents)) {
                docData = application.user_profiles.documents.find((d: any) => d.type === doc.key);
              }
              return (
                <li key={doc.key} className="border-b last:border-0 pb-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-800 text-base">{doc.label}</div>
                      <div className="text-xs text-slate-500 mb-1">{doc.description}</div>
                      {docData && (
                        <div className="text-xs text-slate-600 mb-1">Uploaded: {new Date(docData.uploaded_at).toLocaleDateString()}</div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2 md:mt-0">
                      {docData ? (
                        <>
                          <button
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium"
                            onClick={() => setPreviewUrl(docData.url)}
                          >
                            View
                          </button>
                          <a
                            href={docData.url}
                            download
                            className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-xs font-medium"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              supabase.rpc('log_admin_action', {
                                action_text: 'download_document',
                                target_type_text: 'scholarship_document',
                                target_id_param: applicationId,
                                details_param: { document_type: doc.key, document_label: doc.label }
                              });
                            }}
                          >
                            Download
                          </a>
                        </>
                      ) : (
                        <span className="text-xs text-red-500">Not uploaded</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        {/* Chat Section */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold text-[#05294E] mb-4">Chat (Read-only)</h3>
          <ApplicationChat
            messages={messages}
            onSend={undefined}
            loading={chatLoading}
            isSending={false}
            error={null}
            currentUserId={''}
            readOnly={true}
          />
        </div>
        {previewUrl && (
          <DocumentViewerModal documentUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
        )}
      </div>
    </div>
  );
};

export default AdminApplicationView; 