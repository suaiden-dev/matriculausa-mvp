import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Application, UserProfile, Scholarship } from '../../types';
import ApplicationChat from '../../components/ApplicationChat';
import { useApplicationChat } from '../../hooks/useApplicationChat';
import { useAuth } from '../../hooks/useAuth';
import DocumentRequestsCard from '../../components/DocumentRequestsCard';
import ImagePreviewModal from '../../components/ImagePreviewModal';
import { MessageCircle, FileText, UserCircle } from 'lucide-react';
import Modal from 'react-modal';

interface ApplicationDetails extends Application {
  user_profiles: UserProfile;
  scholarships: Scholarship;
}

const DOCUMENTS_INFO = [
  {
    key: 'passport',
    label: 'Passport',
    description: 'A valid copy of the student\'s passport. Used for identification and visa purposes.'
  },
  {
    key: 'diploma',
    label: 'High School Diploma',
    description: 'Proof of high school graduation. Required for university admission.'
  },
  {
    key: 'funds_proof',
    label: 'Proof of Funds',
    description: 'A bank statement or financial document showing sufficient funds for study.'
  }
];

const TABS = [
  { id: 'details', label: 'Details', icon: UserCircle },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'documents', label: 'Documents', icon: FileText },
];

const StudentDetails: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const chat = useApplicationChat(applicationId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'documents'>('details');
  const [acceptanceModalOpen, setAcceptanceModalOpen] = useState(false);
  const [acceptanceAction, setAcceptanceAction] = useState<'approve' | 'reject' | null>(null);
  const [acceptanceLoading, setAcceptanceLoading] = useState(false);

  useEffect(() => {
    if (applicationId) {
      fetchApplicationDetails();
    }
  }, [applicationId]);

  const fetchApplicationDetails = async () => {
    if (!applicationId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          user_profiles!student_id(*),
          scholarships(*, universities(*))
        `)
        .eq('id', applicationId)
        .single();

      if (error) {
        throw error;
      }
      
      if (data) {
        setApplication(data as ApplicationDetails);
      }
    } catch (err: any) {
      console.error("Error fetching application details:", err);
      setError("Failed to load application details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E] mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }
  
  if (!application) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p>Application not found.</p>
      </div>
    );
  }

  const { user_profiles: student, scholarships: scholarship, status } = application;

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Student Application Details</h1>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto flex-nowrap scrollbar-hide" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`flex items-center gap-2 px-5 py-2 md:px-5 md:py-2 px-3 py-1 text-sm md:text-base font-semibold rounded-t-lg border-b-2 transition-colors duration-200 focus:outline-none whitespace-nowrap ${activeTab === tab.id ? 'border-[#05294E] text-[#05294E] bg-white' : 'border-transparent text-slate-500 bg-slate-50 hover:text-[#05294E]'}`}
            onClick={() => setActiveTab(tab.id as any)}
            type="button"
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            <tab.icon className="w-5 h-5" />
            <span className="hidden xs:inline">{tab.label}</span>
          </button>
        ))}
      </div>
      {/* Conteúdo das abas */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Removido: Acceptance Letter Block e Modal de confirmação */}
            {/* Aqui permanecem apenas os outros blocos de informações do aluno */}
            {/* Student Information */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-bold text-[#05294E] mb-4">Student Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>Name:</strong> {student.full_name}</div>
                <div><strong>User ID:</strong> {student.user_id}</div>
                <div><strong>Phone:</strong> {student.phone || 'N/A'}</div>
                <div><strong>Country:</strong> {student.country || 'N/A'}</div>
                <div><strong>Student Type:</strong> {
                  application.student_process_type === 'initial' ? 'Initial - F-1 Visa Required' :
                  application.student_process_type === 'transfer' ? 'Transfer - Current F-1 Student' :
                  application.student_process_type === 'change_of_status' ? 'Change of Status - From Other Visa' :
                  application.student_process_type || 'N/A'
                }</div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <strong>Status: </strong>
                {application.status === 'enrolled' || application.acceptance_letter_status === 'approved' ? (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">Enrolled</span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">Waiting for acceptance letter</span>
                )}
              </div>
            </div>
            {/* Exemplo de exibição condicional do botão do I-20 Control Fee */}
            {application.acceptance_letter_status === 'approved' && (
              <div className="mt-6">
                {/* Aqui vai o botão do I-20 Control Fee, se já não estiver em outro lugar */}
                {/* <ButtonI20ControlFee ... /> */}
              </div>
            )}
            {/* Scholarship Information */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-bold text-[#05294E] mb-4">Scholarship Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>Scholarship:</strong> {scholarship.title}</div>
                <div><strong>Amount:</strong> ${Number(scholarship.annual_value_with_scholarship ?? 0).toLocaleString()}</div>
                <div className="md:col-span-2"><strong>Description:</strong> {scholarship.description}</div>
              </div>
            </div>
            {/* University Information */}
            {scholarship.universities && (
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-[#05294E] mb-4">University Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><strong>Name:</strong> {scholarship.universities.name || 'N/A'}</div>
                  <div><strong>Location:</strong> {scholarship.universities.location || 'N/A'}</div>
                  <div><strong>Email:</strong> {scholarship.universities.contact?.email || scholarship.universities.contact?.admissionsEmail || 'N/A'}</div>
                  <div><strong>Phone:</strong> {scholarship.universities.contact?.phone || 'N/A'}</div>
                </div>
              </div>
            )}
            {/* Student Documents Section */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-bold text-[#05294E] mb-4">Student Documents</h2>
              <ul className="space-y-6">
                {DOCUMENTS_INFO.map((doc) => {
                  const docUploaded = Array.isArray(application.documents)
                    ? application.documents.includes(doc.key)
                    : false;
                  return (
                    <li key={doc.key} className="border-b last:border-0 pb-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-800 text-base">{doc.label}</div>
                          <div className="text-xs text-slate-500 mb-1">{doc.description}</div>
                        </div>
                        <div className="flex gap-2 mt-2 md:mt-0">
                          {docUploaded ? (
                            <span className="text-xs text-green-600">Uploaded</span>
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
          </div>
        </div>
      )}
      {activeTab === 'chat' && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-[#05294E] mb-4">Chat</h2>
          <div className="flex-1 flex flex-col">
          <ApplicationChat
            messages={chat.messages}
            onSend={chat.sendMessage}
            loading={chat.loading}
            isSending={chat.isSending}
            error={chat.error}
            currentUserId={user?.id}
              messageContainerClassName="gap-6 py-4"
          />
          </div>
        </div>
      )}
      {activeTab === 'documents' && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-[#05294E] mb-4">Document Requests</h2>
          <DocumentRequestsCard
            applicationId={applicationId!}
            isSchool={true}
            currentUserId={user?.id || ''}
            studentType={application.student_process_type || 'initial'}
            studentUserId={student.user_id} // Passa o user_id do aluno
          />
        </div>
      )}
      {previewUrl && (
        <ImagePreviewModal imageUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </div>
  );
};

export default StudentDetails; 