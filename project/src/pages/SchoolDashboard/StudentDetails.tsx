import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Application, UserProfile, Scholarship } from '../../types';
import ApplicationChat from '../../components/ApplicationChat';
import { useApplicationChat } from '../../hooks/useApplicationChat';
import { useAuth } from '../../hooks/useAuth';
import DocumentRequestsCard from '../../components/DocumentRequestsCard';
import ImagePreviewModal from '../../components/ImagePreviewModal';
import { MessageCircle, FileText, UserCircle, Eye, Download, CheckCircle2, XCircle } from 'lucide-react';

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
  { id: 'review', label: 'Review', icon: FileText },
];

const StudentDetails: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const chat = useApplicationChat(applicationId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'documents' | 'review'>('details');
  const [acceptanceLoading, setAcceptanceLoading] = useState(false);
  const [rejectingLoading, setRejectingLoading] = useState(false);
  // Removido: student_documents como fonte primária; usaremos application.documents
  const [studentDocs, setStudentDocs] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  // Modal para justificar solicitação de mudanças
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingRejectType, setPendingRejectType] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  // Modal para recusar aluno na bolsa
  const [showRejectStudentModal, setShowRejectStudentModal] = useState(false);
  const [rejectStudentReason, setRejectStudentReason] = useState('');

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
        // Mantemos uma cópia simplificada para compatibilidade antiga
        const appDocs = (data as any).documents;
        if (Array.isArray(appDocs) && appDocs.length > 0) {
          setStudentDocs(appDocs.map((d: any) => ({ type: d.type, file_url: d.url, status: d.status || 'under_review' })));
        } else {
          // Fallback 1: usar documentos salvos no perfil do aluno (user_profiles.documents)
          const profileDocs = (data as any).user_profiles?.documents;
          if (Array.isArray(profileDocs) && profileDocs.length > 0) {
            setStudentDocs(profileDocs.map((d: any) => ({ type: d.type, file_url: d.url, status: d.status || 'under_review' })));
          } else {
            // Fallback 2: buscar do storage se a application ainda não tiver documentos associados
            const studentId = (data as any).user_profiles?.user_id;
            if (studentId) {
              const { data: docs } = await supabase
                .from('student_documents')
                .select('*')
                .eq('user_id', studentId);
              if (docs && docs.length > 0) {
                setStudentDocs((docs || []).map((d: any) => ({ type: d.type, file_url: d.file_url, status: d.status || 'under_review' })));
              } else {
                setStudentDocs([]);
              }
            } else {
              setStudentDocs([]);
            }
          }
        }
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

  const { user_profiles: student, scholarships: scholarship } = application;

  const latestDocByType = (type: string) => {
    const docs = (application as any)?.documents as any[] | undefined;
    const appDoc = Array.isArray(docs) ? docs.find((d) => d.type === type) : undefined;
    if (appDoc) return { id: `${type}`, type, file_url: appDoc.url, status: appDoc.status || 'under_review' };
    // fallback compatibilidade
    return studentDocs.find((d) => d.type === type);
  };

  const updateApplicationDocStatus = async (
    type: string,
    status: 'approved' | 'changes_requested' | 'under_review',
    reviewNotes?: string
  ) => {
    const docs = Array.isArray((application as any)?.documents) ? ([...(application as any).documents] as any[]) : [];
    const idx = docs.findIndex((d) => d.type === type);
    if (idx >= 0) {
      docs[idx] = { ...docs[idx], status, review_notes: reviewNotes ?? docs[idx]?.review_notes };
    }
    await supabase.from('scholarship_applications').update({ documents: docs }).eq('id', applicationId);
    setApplication((prev) => prev ? ({ ...prev, documents: docs } as any) : prev);
  };

  const approveDoc = async (type: string) => {
    try {
      setUpdating(type);
      await updateApplicationDocStatus(type, 'approved');
    } finally {
      setUpdating(null);
    }
  };

  const requestChangesDoc = async (type: string, reason: string) => {
    try {
      setUpdating(type);
      await updateApplicationDocStatus(type, 'changes_requested', reason || undefined);
      // Mantém o fluxo do aluno em revisão
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'under_review' })
        .eq('user_id', student.user_id);
    } finally {
      setUpdating(null);
    }
  };

  const allApproved = ['passport', 'diploma', 'funds_proof']
    .every((k) => {
      const d = latestDocByType(k);
      return d && d.file_url && (d.status || '').toLowerCase() === 'approved';
    });

  const approveStudent = async () => {
    try {
      setAcceptanceLoading(true);
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'approved' })
        .eq('user_id', student.user_id);
      // Atualiza a aplicação para liberar Application Fee no dashboard do aluno
      await supabase
        .from('scholarship_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);
      await fetchApplicationDetails();
      setActiveTab('details');
    } finally {
      setAcceptanceLoading(false);
    }
  };

  const rejectStudent = async () => {
    try {
      setRejectingLoading(true);
      // Atualiza perfil do aluno para estado rejeitado
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'rejected' })
        .eq('user_id', student.user_id);
      // Atualiza aplicação com status e justificativa
      await supabase
        .from('scholarship_applications')
        .update({ status: 'rejected', notes: rejectStudentReason || null })
        .eq('id', applicationId);
      await fetchApplicationDetails();
      setActiveTab('details');
      setShowRejectStudentModal(false);
      setRejectStudentReason('');
    } finally {
      setRejectingLoading(false);
    }
  };

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
                {application.status === 'rejected' ? (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">Rejected</span>
                ) : application.status === 'enrolled' || application.acceptance_letter_status === 'approved' ? (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">Enrolled</span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">Waiting for acceptance letter</span>
                )}
              </div>
              {application.status === 'rejected' && application.notes && (
                <div className="mt-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-100">
                  <strong>Reason:</strong> {application.notes}
                </div>
              )}
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
                  <div><strong>Email:</strong> {(scholarship.universities as any)?.contact?.email || (scholarship.universities as any)?.contact?.admissionsEmail || 'N/A'}</div>
                  <div><strong>Phone:</strong> {(scholarship.universities as any)?.contact?.phone || 'N/A'}</div>
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
            onSend={chat.sendMessage as any}
            loading={chat.loading}
            isSending={chat.isSending}
            error={chat.error}
            currentUserId={user?.id || ''}
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
              studentType={(application.student_process_type || 'initial') as any}
              studentUserId={student.user_id}
            />
        </div>
      )}
      {activeTab === 'review' && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-[#05294E] mb-4">Manual Review</h2>
          <div className="space-y-4">
            {DOCUMENTS_INFO.map((doc) => {
              const d = latestDocByType(doc.key);
              return (
                <div key={doc.key} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">{doc.label}</div>
                      <div className="text-xs text-slate-500">{doc.description}</div>
                      <div className="mt-1 text-xs">
                        <span className={`px-2 py-0.5 rounded-full ${d?.status === 'approved' ? 'bg-green-100 text-green-700' : d?.status === 'changes_requested' ? 'bg-red-100 text-red-700' : d?.status === 'under_review' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{d?.status || 'not submitted'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {d?.file_url && (
                        <>
                          <a className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50" href={d.file_url} target="_blank" rel="noreferrer">
                            <Eye className="inline w-4 h-4 mr-1" /> Preview
                          </a>
                          <a className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50" href={d.file_url} download>
                            <Download className="inline w-4 h-4 mr-1" /> Download
                          </a>
                        </>
                      )}
                      <button
                        disabled={!d || updating === d.type || (d.status || '').toLowerCase() === 'approved'}
                        onClick={() => d && approveDoc(d.type)}
                        className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle2 className="inline w-4 h-4 mr-1" /> Approve
                      </button>
                      <button
                        disabled={!d || updating === d.type || (d.status || '').toLowerCase() === 'approved'}
                        onClick={() => {
                          if (!d) return;
                          setPendingRejectType(d.type);
                          setRejectReason('');
                          setShowReasonModal(true);
                        }}
                        className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="inline w-4 h-4 mr-1" /> Request changes
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              disabled={!allApproved || acceptanceLoading}
              onClick={approveStudent}
              className="px-5 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {acceptanceLoading ? 'Approving...' : 'Approve student'}
            </button>
            <button
              type="button"
              onClick={() => { setShowRejectStudentModal(true); setRejectStudentReason(''); }}
              className="ml-3 px-5 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700"
            >
              Reject student
            </button>
          </div>
        </div>
      )}
      {previewUrl && (
        <ImagePreviewModal imageUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
      {/* Modal de justificativa para Request Changes */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-[#05294E] mb-3">Provide a justification</h3>
            <p className="text-sm text-slate-600 mb-4">Explain why this document needs changes. The student will see this message.</p>
            <textarea
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 min-h-[120px]"
              placeholder="Example: The passport photo is blurry. Please upload a clearer scan including all four corners."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                onClick={() => { setShowReasonModal(false); setPendingRejectType(null); setRejectReason(''); }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                disabled={!pendingRejectType || updating === pendingRejectType}
                onClick={async () => {
                  if (!pendingRejectType) return;
                  await requestChangesDoc(pendingRejectType, rejectReason.trim());
                  setShowReasonModal(false);
                  setPendingRejectType(null);
                  setRejectReason('');
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para recusar aluno na bolsa */}
      {showRejectStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-[#05294E] mb-3">Reject scholarship application</h3>
            <p className="text-sm text-slate-600 mb-4">Provide a justification (optional). The student will see this message.</p>
            <textarea
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 min-h-[120px]"
              placeholder="Optional: Missing required documents or eligibility criteria not met."
              value={rejectStudentReason}
              onChange={(e) => setRejectStudentReason(e.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                onClick={() => { setShowRejectStudentModal(false); setRejectStudentReason(''); }}
                disabled={rejectingLoading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                disabled={rejectingLoading}
                onClick={rejectStudent}
              >
                {rejectingLoading ? 'Rejecting...' : 'Confirm rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetails; 