import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ApplicationChat from '../../components/ApplicationChat';
import { useApplicationChat } from '../../hooks/useApplicationChat';
import { useAuth } from '../../hooks/useAuth';
import DocumentRequestsCard from '../../components/DocumentRequestsCard';
import { supabase } from '../../lib/supabase';
import ImagePreviewModal from '../../components/ImagePreviewModal';
import { STRIPE_PRODUCTS } from '../../stripe-config';

const DOCUMENTS_INFO = [
  {
    key: 'passport',
    label: 'Passport',
    description: "A valid copy of the student's passport. Used for identification and visa purposes."
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

  // Lógica de exibição do card
  const hasPaid = !!userProfile?.has_paid_i20_control_fee;
  const dueDate = userProfile?.i20_control_fee_due_date || null;
  const paymentDate = userProfile?.i20_control_fee_due_date || null;
  const isExpired = !hasPaid && dueDate ? new Date(dueDate) < new Date() : false;

  // AGORA podemos ter o return condicional - todos os hooks já foram chamados
  if (!user) {
    return <div className="text-center text-gray-500 py-10">Authenticating...</div>;
  }

  return (
    <div className="p-4 md:p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Student Application Details
        </h2>
        {/* Student & Scholarship Info */}
        {applicationDetails && (
          <>
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-bold text-[#05294E] mb-4">Student Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>Name:</strong> {applicationDetails.user_profiles?.full_name}</div>
                <div><strong>Email:</strong> {applicationDetails.user_profiles?.email}</div>
                <div><strong>Phone:</strong> {applicationDetails.user_profiles?.phone || 'N/A'}</div>
                <div><strong>Country:</strong> {applicationDetails.user_profiles?.country || 'N/A'}</div>
                <div><strong>Student Type:</strong> {
                  applicationDetails.student_process_type === 'initial' ? 'Initial - F-1 Visa Required' :
                  applicationDetails.student_process_type === 'transfer' ? 'Transfer - Current F-1 Student' :
                  applicationDetails.student_process_type === 'status_change' ? 'Status Change - From Other Visa' :
                  applicationDetails.student_process_type || 'N/A'
                }</div>
              </div>
            </div>
            {/* University Information */}
            {applicationDetails.scholarships?.universities && (
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-[#05294E] mb-4">University Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><strong>Name:</strong> {applicationDetails.scholarships.universities.name || 'N/A'}</div>
                  <div><strong>Country:</strong> {applicationDetails.scholarships.universities.address?.country || 'N/A'}</div>
                  <div><strong>City:</strong> {applicationDetails.scholarships.universities.address?.city || 'N/A'}</div>
                  <div><strong>Website:</strong> {applicationDetails.scholarships.universities.website ? (
                    <a href={applicationDetails.scholarships.universities.website} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{applicationDetails.scholarships.universities.website}</a>
                  ) : 'N/A'}</div>
                  <div><strong>Email:</strong> {applicationDetails.scholarships.universities.contact?.email || applicationDetails.scholarships.universities.contact?.admissionsEmail || 'N/A'}</div>
                  <div><strong>Phone:</strong> {applicationDetails.scholarships.universities.contact?.phone || 'N/A'}</div>
                </div>
              </div>
            )}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-bold text-[#05294E] mb-4">Scholarship Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>Scholarship:</strong> {applicationDetails.scholarships?.title || applicationDetails.scholarships?.name}</div>
                {applicationDetails.scholarships?.course && <div><strong>Course:</strong> {applicationDetails.scholarships.course}</div>}
                {applicationDetails.scholarships?.country && <div><strong>Country:</strong> {applicationDetails.scholarships.country}</div>}
                <div className="md:col-span-2"><strong>Description:</strong> {applicationDetails.scholarships?.description}</div>
              </div>
            </div>
            {/* Student Documents */}
            <div className="bg-white p-6 rounded-xl shadow-md">
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
                                href={docData.url}
                                download
                                className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-xs font-medium"
                                target="_blank"
                                rel="noopener noreferrer"
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
          </>
        )}
        {/* Document Requests */}
        {applicationId && (
          <DocumentRequestsCard 
            applicationId={applicationId} 
            isSchool={false} 
            currentUserId={user.id} 
          />
        )}
        {/* I-20 Payment Area */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold text-[#05294E] mb-4">I-20 Control Fee</h3>
          <div className="mb-3 text-sm text-slate-700">
            The <strong>I-20 Control Fee</strong> is a mandatory fee required for the issuance and management of your I-20 document, which is essential for the F-1 student visa process in the United States. <br />
            <span className="font-semibold">You have up to <span className="text-blue-700">10 days</span> after paying your Scholarship Fee to pay the I-20 Control Fee.</span> The timer below shows exactly how much time you have left to complete this payment. <br />
            Paying this fee ensures that your I-20 will be processed and sent correctly by the university. If you have any questions about this process, please contact support or chat with the university below.
          </div>
          {/* Cronômetro e botão lado a lado (invertidos) */}
          <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-2 w-full mt-4">
            <div className="flex-1 flex items-center justify-center">
              {hasPaid ? (
                <span className="text-green-600 font-semibold">I-20 Control Fee Paid</span>
              ) : (
                <button
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium w-full md:w-auto min-w-[140px] max-w-xs shadow-md border border-blue-200"
                  onClick={handlePayI20}
                  disabled={i20Loading}
                  style={{height: '44px'}}
                >
                  {i20Loading ? 'Processing...' : 'Pay I-20 Control Fee'}
                </button>
              )}
            </div>
            {!hasPaid && scholarshipFeeDeadline && (
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
        </div>
        {/* Chat Section */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold text-[#05294E] mb-4">Chat with University</h3>
          <ApplicationChat
            messages={messages}
            onSend={sendMessage}
            loading={loading}
            isSending={isSending}
            error={error}
            currentUserId={user.id}
          />
        </div>
        {previewUrl && (
          <ImagePreviewModal imageUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
        )}
      </div>
    </div>
  );
};

export default ApplicationChatPage; 