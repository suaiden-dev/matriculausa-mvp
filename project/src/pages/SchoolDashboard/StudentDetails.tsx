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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Student Application
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Review and manage {student.full_name}'s application details
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {application.status === 'enrolled' || application.acceptance_letter_status === 'approved' ? (
                <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Enrolled
                </div>
              ) : (
                <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-300">
                  <div className="w-2 h-2 bg-slate-400 rounded-full mr-2 animate-pulse"></div>
                  Pending Review
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto" role="tablist">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-[#05294E] text-[#05294E]' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
                onClick={() => setActiveTab(tab.id as any)}
                type="button"
                aria-selected={activeTab === tab.id}
                role="tab"
              >
                <tab.icon className={`w-5 h-5 mr-2 transition-colors ${
                  activeTab === tab.id ? 'text-[#05294E]' : 'text-slate-400 group-hover:text-slate-600'
                }`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Conteúdo das abas */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-8">
              {/* Student Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <UserCircle className="w-6 h-6 mr-3" />
                    Student Information
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Full Name</dt>
                          <dd className="text-base font-semibold text-slate-900">{student.full_name}</dd>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Phone</dt>
                          <dd className="text-base text-slate-900">{student.phone || 'Not provided'}</dd>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Country</dt>
                          <dd className="text-base text-slate-900">{student.country || 'Not specified'}</dd>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Student Type</dt>
                          <dd className="text-base text-slate-900">
                            {application.student_process_type === 'initial' ? 'Initial - F-1 Visa Required' :
                             application.student_process_type === 'transfer' ? 'Transfer - Current F-1 Student' :
                             application.student_process_type === 'change_of_status' ? 'Change of Status - From Other Visa' :
                             application.student_process_type || 'Not specified'}
                          </dd>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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

            {/* Sidebar */}
            <div className="xl:col-span-4 space-y-6">
              {/* Quick Stats Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Application Summary</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Submitted</span>
                    <span className="text-sm text-slate-900">
                      {new Date((application as any).created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Documents</span>
                    <span className="text-sm text-slate-900">
                      {DOCUMENTS_INFO.filter(doc => {
                        const d = latestDocByType(doc.key);
                        return d?.status === 'approved';
                      }).length} / {DOCUMENTS_INFO.length} approved
                    </span>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-sm text-slate-600 mb-2">Progress</div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-[#05294E] to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(DOCUMENTS_INFO.filter(doc => {
                            const d = latestDocByType(doc.key);
                            return d?.status === 'approved';
                          }).length / DOCUMENTS_INFO.length) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-900">Application submitted</p>
                        <p className="text-xs text-slate-500">{new Date((application as any).created_at || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {(application as any).updated_at !== (application as any).created_at && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-900">Last updated</p>
                          <p className="text-xs text-slate-500">{new Date((application as any).updated_at || Date.now()).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
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
                        onClick={() => d && requestChangesDoc(d.type)}
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
          </div>
        </div>
      )}
      {previewUrl && (
        <ImagePreviewModal imageUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </div>
  );
};

export default StudentDetails; 