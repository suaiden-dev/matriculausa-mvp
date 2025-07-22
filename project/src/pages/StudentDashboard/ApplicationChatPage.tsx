import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ApplicationChat from '../../components/ApplicationChat';
import { useApplicationChat } from '../../hooks/useApplicationChat';
import { useAuth } from '../../hooks/useAuth';
import DocumentRequestsCard from '../../components/DocumentRequestsCard';
import { supabase } from '../../lib/supabase';
import ImagePreviewModal from '../../components/ImagePreviewModal';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import { MessageCircle, FileText, UserCircle, GraduationCap, School, CheckCircle, Building, Award, Home, Info, FileCheck, FolderOpen } from 'lucide-react';
// Remover os imports das imagens
// import WelcomeImg from '../../assets/page 7.png';
// import SupportImg from '../../assets/page 8.png';

// TABS será montado dinamicamente conforme o status

interface DocumentInfo {
  key: string;
  label: string;
  description: string;
  emoji: string;
}
const DOCUMENTS_INFO: DocumentInfo[] = [
  { key: 'passport', label: 'Passport', description: "A valid copy of the student's passport. Used for identification and visa purposes.", emoji: '🛂' },
  { key: 'diploma', label: 'High School Diploma', description: 'Proof of high school graduation. Required for university admission.', emoji: '🎓' },
  { key: 'funds_proof', label: 'Proof of Funds', description: 'A bank statement or financial document showing sufficient funds for study.', emoji: '💵' },
];

// Componente de card padrão para dashboard
const DashboardCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-2xl border border-blue-100 p-6 md:p-10 mb-8 w-full ${className}`}>
    {children}
  </div>
);

// Adicionar função utilitária de download imediato (igual DocumentRequestsCard)
const handleForceDownload = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  } catch (e) {
    alert('Failed to download file.');
  }
};

const ApplicationChatPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { user, userProfile, refetchUserProfile } = useAuth();
  const { messages, sendMessage, loading, isSending, error } = useApplicationChat(applicationId);

  // Todos os hooks devem vir ANTES de qualquer return condicional
  const [i20Loading, setI20Loading] = useState(false);
  const [i20Error, setI20Error] = useState<string | null>(null);
  const [applicationDetails, setApplicationDetails] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scholarshipFeePaidAt, setScholarshipFeePaidAt] = useState<Date | null>(null);
  const [i20Countdown, setI20Countdown] = useState<string | null>(null);
  const [scholarshipFeeDeadline, setScholarshipFeeDeadline] = useState<Date | null>(null);
  // Ajustar tipo de activeTab para incluir 'welcome'
  const [activeTab, setActiveTab] = useState<'welcome' | 'details' | 'i20' | 'chat' | 'documents'>('welcome');

  // useEffect também deve vir antes de qualquer return condicional
  useEffect(() => {
    if (applicationId) {
      supabase
        .from('scholarship_applications')
        .select(`*, user_profiles!student_id(*), scholarships(*, universities(*))`)
        .eq('id', applicationId)
        .single()
        .then(({ data }) => setApplicationDetails(data));
    }
  }, [applicationId]);

  // Polling para atualizar o perfil do usuário a cada 3 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      refetchUserProfile && refetchUserProfile();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetchUserProfile]);

  // Buscar data de pagamento da scholarship fee (agora usando scholarship_applications)
  useEffect(() => {
    // Removido: busca antiga usando user.id
  }, []);

  // Buscar deadline da scholarship fee (data limite para I-20 Control Fee)
  useEffect(() => {
    async function fetchScholarshipFeeDeadline() {
      if (!userProfile?.id) return;
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select('id, updated_at, is_scholarship_fee_paid')
        .eq('student_id', userProfile.id)
        .eq('is_scholarship_fee_paid', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      if (data?.updated_at) {
        const paidDate = new Date(data.updated_at);
        const deadline = new Date(paidDate.getTime() + 10 * 24 * 60 * 60 * 1000);
        setScholarshipFeeDeadline(deadline);
      } else {
        setScholarshipFeeDeadline(null);
      }
    }
    fetchScholarshipFeeDeadline();
  }, [userProfile]);

  // Cronômetro regressivo para a deadline
  useEffect(() => {
    if (!scholarshipFeeDeadline) return;
    function updateCountdown() {
      if (!scholarshipFeeDeadline) return;
      const now = new Date();
      const diff = scholarshipFeeDeadline.getTime() - now.getTime();
      if (diff <= 0) {
        setI20Countdown('Expired');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setI20Countdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [scholarshipFeeDeadline]);

  // Lógica de exibição do card
  const hasPaid = !!(userProfile && (userProfile as any).has_paid_i20_control_fee);
  const dueDate = (userProfile && (userProfile as any).i20_control_fee_due_date) || null;
  const paymentDate = (userProfile && (userProfile as any).i20_control_fee_due_date) || null;
  const isExpired = !hasPaid && dueDate ? new Date(dueDate) < new Date() : false;

  // Função para iniciar o pagamento do I-20 Control Fee
  const handlePayI20 = async () => {
    setI20Loading(true);
    setI20Error(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/stripe-checkout-i20-control-fee`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          success_url: window.location.origin + '/student/i20-control-fee-success?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: window.location.origin + '/student/i20-control-fee-error',
          price_id: STRIPE_PRODUCTS.controlFee.priceId,
        }),
      });
      const data = await res.json();
      if (data.session_url) {
        window.location.href = data.session_url;
      } else {
        setI20Error('Erro ao criar sessão de pagamento.');
      }
    } catch (err) {
      setI20Error('Erro ao redirecionar para o pagamento.');
    } finally {
      setI20Loading(false);
    }
  };

  // AGORA podemos ter o return condicional - todos os hooks já foram chamados
  if (!user) {
    return <div className="text-center text-gray-500 py-10">Authenticating...</div>;
  }

  // Montar as abas dinamicamente com ícones distintos
  const tabs = [
    { id: 'welcome', label: 'Welcome', icon: Home },
    { id: 'details', label: 'Details', icon: Info },
    ...(applicationDetails && applicationDetails.status === 'enrolled' ? [
      { id: 'i20', label: 'I-20 Control Fee', icon: FileCheck }
    ] : []),
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'documents', label: 'Documents', icon: FolderOpen },
  ];

  return (
    <div className="p-6 md:p-12 flex flex-col items-center min-h-screen h-full">
      <div className="w-full max-w-3xl mx-auto space-y-8 flex-1 flex flex-col h-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Student Application Details
        </h2>
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto flex-nowrap scrollbar-hide" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`flex flex-col items-center gap-1 px-3 py-1 md:px-5 md:py-2 text-sm md:text-base font-semibold rounded-t-lg border-b-2 transition-colors duration-200 focus:outline-none whitespace-nowrap ${activeTab === tab.id ? 'border-[#05294E] text-[#05294E] bg-white' : 'border-transparent text-slate-500 bg-slate-50 hover:text-[#05294E]'}`}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              type="button"
              aria-selected={activeTab === tab.id ? 'true' : 'false'}
              role="tab"
            >
              <tab.icon className="w-5 h-5 md:w-5 md:h-5" />
              <span className="text-xs md:text-base mt-0.5 md:mt-0">{tab.label}</span>
            </button>
          ))}
        </div>
        {/* Conteúdo das abas */}
        {activeTab === 'welcome' && applicationDetails && (
          // RESTAURAR layout visual anterior do Welcome (não usar DashboardCard)
          <div className="bg-white rounded-2xl shadow-2xl p-0 overflow-hidden border border-blue-100 flex flex-col">
            {/* Header Welcome + Next Steps (layout visual anterior) */}
            <div className="flex items-center gap-4 px-8 pt-8 pb-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 bg-white rounded-full border border-blue-100">
                {applicationDetails.scholarships?.universities?.logo_url ? (
                  <img
                    src={applicationDetails.scholarships.universities.logo_url || ''}
                    alt={(applicationDetails.scholarships.universities.name || 'university') + ' logo'}
                    className="w-12 h-12 object-contain rounded-full"
                    loading="lazy"
                  />
                ) : (
                  <GraduationCap className="w-8 h-8 text-blue-400" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-[#05294E] mb-1">
                  Welcome, {applicationDetails.user_profiles?.full_name?.split(' ')[0] || 'Student'}
                </h1>
                <div className="text-base text-slate-700">
                  Your application to <span className="font-semibold text-blue-700">{applicationDetails.scholarships?.universities?.name || 'your university'}</span> is in progress.
                </div>
                {applicationDetails.scholarships?.title && (
                  <div className="text-xs text-slate-600 mt-1">
                    Scholarship: <span className="font-semibold">{applicationDetails.scholarships.title}</span>
                  </div>
                )}
              </div>
            </div>
            {/* Next Steps - Guia prático */}
            <div className="px-8 py-8 bg-white flex flex-col gap-6 items-center">
              <h2 className="text-2xl font-extrabold text-[#05294E] mb-2 text-center tracking-tight">How to Proceed</h2>
              {/* Passo 1: Document Requests */}
              <div className="w-full bg-blue-50 rounded-xl p-6 flex flex-col md:flex-row items-center gap-4 shadow">
                <FileText className="w-10 h-10 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-blue-900 text-lg mb-1">Check Document Requests</div>
                  <div className="text-base text-slate-700 mb-2">Now that you’ve reached this stage, you must review and upload the documents requested by your university to continue your process. After this, the school will be able to analyze your application and send your acceptance letter.</div>
                  <button onClick={() => setActiveTab('documents')} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition-all duration-200">Go to Document Requests</button>
                </div>
              </div>
              {/* Passo 2: Chat */}
              <div className="w-full bg-blue-50 rounded-xl p-6 flex flex-col md:flex-row items-center gap-4 shadow">
                <MessageCircle className="w-10 h-10 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-blue-900 text-lg mb-1">Talk to the University</div>
                  <div className="text-base text-slate-700 mb-2">Here you can chat directly with the university, ask questions, and clarify any doubts about your process. Fast and direct communication helps speed up your application.</div>
                  <button onClick={() => setActiveTab('chat')} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition-all duration-200">Open Chat</button>
                </div>
              </div>
              {/* Passo 3: Application Details */}
              <div className="w-full bg-blue-50 rounded-xl p-6 flex flex-col md:flex-row items-center gap-4 shadow">
                <UserCircle className="w-10 h-10 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-blue-900 text-lg mb-1">View Application Details</div>
                  <div className="text-base text-slate-700 mb-2">See all your scholarship information, uploaded documents, and your current status (waiting for acceptance letter, enrolled, etc). Stay up to date with your process at any time.</div>
                  <button onClick={() => setActiveTab('details')} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition-all duration-200">View Application Details</button>
                </div>
              </div>
              {/* Passo 4: I-20 Control Fee (só se liberado) */}
              {(applicationDetails.status === 'enrolled' || applicationDetails.acceptance_letter_status === 'approved') && (
                <div className="w-full bg-blue-50 rounded-xl p-6 flex flex-col md:flex-row items-center gap-4 shadow">
                  <Award className="w-10 h-10 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-bold text-blue-900 text-lg mb-1">Pay I-20 Control Fee</div>
                    <div className="text-base text-slate-700 mb-2">After receiving your acceptance letter, you will be able to pay the I-20 Control Fee. This fee is required for the issuance of your I-20 document, essential for your F-1 visa. You have 10 days to pay after it is released.</div>
                    <button onClick={() => setActiveTab('i20')} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition-all duration-200">Pay I-20 Control Fee</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'details' && applicationDetails && (
          <>
            {/* Student Info */}
            <DashboardCard>
              {/* --- Student Information --- */}
              <h3 className="text-xl font-bold text-[#05294E] mb-4">Student Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>Name:</strong> {applicationDetails.user_profiles?.full_name}</div>
                <div><strong>Email:</strong> {applicationDetails.user_profiles?.email}</div>
                <div><strong>Phone:</strong> {applicationDetails.user_profiles?.phone || 'N/A'}</div>
                <div><strong>Country:</strong> {applicationDetails.user_profiles?.country || 'N/A'}</div>
                <div><strong>Student Type:</strong> {
                  applicationDetails.student_process_type === 'initial' ? 'Initial - F-1 Visa Required' :
                  applicationDetails.student_process_type === 'transfer' ? 'Transfer - Current F-1 Student' :
                  applicationDetails.student_process_type === 'change_of_status' ? 'Change of Status - From Other Visa' :
                  applicationDetails.student_process_type || 'N/A'
                }</div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <strong>Status: </strong>
                {applicationDetails.status === 'enrolled' || applicationDetails.acceptance_letter_status === 'approved' ? (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">Enrolled</span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">Waiting for acceptance letter</span>
                )}
            </div>
            </DashboardCard>
            {/* University Info */}
            <DashboardCard>
              {/* --- University Information --- */}
            {applicationDetails.scholarships?.universities && (
                <h3 className="text-xl font-bold text-[#05294E] mb-4">University Information</h3>
              )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><strong>Name:</strong> {applicationDetails.scholarships.universities.name || 'N/A'}</div>
                  <div><strong>Country:</strong> {applicationDetails.scholarships.universities.address?.country || 'N/A'}</div>
                  <div><strong>City:</strong> {applicationDetails.scholarships.universities.address?.city || 'N/A'}</div>
                  <div><strong>Website:</strong> {applicationDetails.scholarships.universities.website ? (
                    <a href={applicationDetails.scholarships.universities.website || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{applicationDetails.scholarships.universities.website}</a>
                  ) : 'N/A'}</div>
                  <div><strong>Email:</strong> {applicationDetails.scholarships.universities.contact?.email || applicationDetails.scholarships.universities.contact?.admissionsEmail || 'N/A'}</div>
                  <div><strong>Phone:</strong> {applicationDetails.scholarships.universities.contact?.phone || 'N/A'}</div>
                </div>
            </DashboardCard>
            {/* Scholarship Details */}
            <DashboardCard>
              {/* --- Scholarship Details --- */}
              <h3 className="text-xl font-bold text-[#05294E] mb-4">Scholarship Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>Scholarship:</strong> {applicationDetails.scholarships?.title || applicationDetails.scholarships?.name}</div>
                {applicationDetails.scholarships?.course && <div><strong>Course:</strong> {applicationDetails.scholarships.course}</div>}
                {applicationDetails.scholarships?.country && <div><strong>Country:</strong> {applicationDetails.scholarships.country}</div>}
                <div className="md:col-span-2"><strong>Description:</strong> {applicationDetails.scholarships?.description}</div>
              </div>
            </DashboardCard>
            {/* Student Documents */}
            <DashboardCard>
              {/* --- Student Documents --- */}
              <h3 className="text-xl font-bold text-[#05294E] mb-4">Student Documents</h3>
              <ul className="space-y-6">
                {DOCUMENTS_INFO.map((doc) => {
                  let docData = Array.isArray(applicationDetails.documents)
                    ? applicationDetails.documents.find((d: any) => d.type === doc.key)
                    : null;
                  if (!docData && Array.isArray(applicationDetails.user_profiles?.documents)) {
                    docData = applicationDetails.user_profiles.documents.find((d: any) => d.type === doc.key);
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
                                href="#"
                                className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-xs font-medium"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  await handleForceDownload(docData.url, docData.url.split('/').pop() || 'document.pdf');
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
            </DashboardCard>
          </>
        )}
        {activeTab === 'i20' && applicationDetails && applicationDetails.status === 'enrolled' && (
          <DashboardCard>
            <h3 className="text-xl font-bold text-[#05294E] mb-4">I-20 Control Fee</h3>
            
            {!hasPaid ? (
              <>
                <div className="mb-3 text-sm text-slate-700">
                  The <strong>I-20 Control Fee</strong> is a mandatory fee required for the issuance and management of your I-20 document, which is essential for the F-1 student visa process in the United States. <br />
                  <span className="font-semibold">You have up to <span className="text-blue-700">10 days</span> after paying your Scholarship Fee to pay the I-20 Control Fee.</span> The timer below shows exactly how much time you have left to complete this payment. <br />
                  Paying this fee ensures that your I-20 will be processed and sent correctly by the university. If you have any questions about this process, please contact support or chat with the university below.
                </div>
                {/* Cronômetro e botão lado a lado (invertidos) */}
                <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-2 w-full mt-4">
                  <div className="flex-1 flex items-center justify-center">
                    <button
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium w-full md:w-auto min-w-[140px] max-w-xs shadow-md border border-blue-200"
                      onClick={handlePayI20}
                      disabled={i20Loading}
                      style={{height: '44px'}}>
                      {i20Loading ? 'Processing...' : 'Pay I-20 Control Fee'}
                    </button>
                  </div>
                  {scholarshipFeeDeadline && (
                    <div className={`flex-1 min-w-[140px] max-w-xs p-3 rounded-xl shadow-md text-center border ${i20Countdown === 'Expired' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}
                         style={{height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      {i20Countdown === 'Expired' ? (
                        <span className="text-red-600 font-bold text-sm md:text-base">The deadline to pay the I-20 Control Fee has expired!</span>
                      ) : (
                        <span className="font-mono text-base md:text-lg text-[#05294E] tracking-widest">
                          {i20Countdown}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {dueDate && (
                  <span className="text-xs text-slate-600">Due date: {new Date(dueDate).toLocaleDateString()}</span>
                )}
                {i20Error && <div className="text-center text-red-500 py-2">{i20Error}</div>}
              </>
            ) : (
              <>
                <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="text-lg font-bold text-green-800">I-20 Control Fee Paid Successfully!</h4>
                  </div>
                  <p className="text-green-700 mb-3">
                    Your I-20 Control Fee payment has been processed successfully. Your I-20 document will now be prepared and sent to you by the university.
                  </p>
                  <div className="text-sm text-green-600">
                    <strong>Next steps:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Wait for the university to process your I-20 document</li>
                      <li>You will receive your I-20 document via email</li>
                      <li>Use the I-20 to apply for your F-1 student visa</li>
                      <li>Contact the university if you have any questions about the process</li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h5 className="font-semibold text-blue-900 mb-2">Payment Information</h5>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div><strong>Amount Paid:</strong> $900</div>
                    <div><strong>Payment Date:</strong> {paymentDate ? new Date(paymentDate).toLocaleDateString() : 'N/A'}</div>
                    <div><strong>Status:</strong> <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Completed</span></div>
                  </div>
                </div>
              </>
            )}
          </DashboardCard>
        )}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 p-0 w-full flex-1 h-full flex flex-col">
            <div className="flex-1 flex flex-col justify-between gap-0 h-full">
          <ApplicationChat
            messages={messages}
            onSend={(text: string, file?: File | null) => sendMessage(text, file ?? null)}
            loading={loading}
            isSending={isSending}
            error={error}
              currentUserId={user?.id}
                messageContainerClassName="gap-6 py-4"
          />
            </div>
        </div>
        )}
        {activeTab === 'documents' && applicationDetails && (
          <DashboardCard>
            <h3 className="text-xl font-bold text-[#05294E] mb-4">Document Requests</h3>
            <DocumentRequestsCard 
              applicationId={applicationId} 
              isSchool={false} 
              currentUserId={user.id} 
              studentType={applicationDetails.student_process_type || 'initial'}
            />
          </DashboardCard>
        )}
        {previewUrl && (
          <ImagePreviewModal imageUrl={previewUrl || ''} onClose={() => setPreviewUrl(null)} />
        )}
      </div>
    </div>
  );
};

export default ApplicationChatPage; 