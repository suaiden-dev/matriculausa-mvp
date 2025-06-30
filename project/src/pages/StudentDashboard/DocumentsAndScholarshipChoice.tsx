import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCartStore } from '../../stores/applicationStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import DocumentUploadModal from '../../components/DocumentUploadModal';

const DocumentsAndScholarshipChoice: React.FC = () => {
  const { userProfile } = useAuth();
  const { cart, fetchCart } = useCartStore();
  const [documentsApproved, setDocumentsApproved] = useState(userProfile?.documents_status === 'approved');
  const [selectedScholarshipId, setSelectedScholarshipId] = useState<string | null>(null);
  const [processType, setProcessType] = useState<string | null>(window.localStorage.getItem('studentProcessType'));
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [studentType, setStudentType] = useState<string | null>(null);
  const [isSavingType, setIsSavingType] = useState(false);
  const navigate = useNavigate();

  // Carregar cart quando componente monta
  useEffect(() => {
    if (userProfile?.user_id) {
      fetchCart(userProfile.user_id);
    }
  }, [userProfile?.user_id, fetchCart]);

  // Atualizar estado quando userProfile muda
  useEffect(() => {
    setDocumentsApproved(userProfile?.documents_status === 'approved');
  }, [userProfile?.documents_status]);

  // Função para salvar o tipo de estudante na aplicação do usuário
  const saveStudentType = async (type: string) => {
    setIsSavingType(true);
    try {
      // Buscar a aplicação ativa do usuário
      const { data: applications, error } = await supabase
        .from('scholarship_applications')
        .select('id')
        .eq('student_id', userProfile?.id)
        .order('applied_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error fetching applications:', error);
        // Continua mesmo com erro, salva só no localStorage
      } else if (applications && applications.length > 0) {
        const application = applications[0];
        const { error: updateError } = await supabase
          .from('scholarship_applications')
          .update({ student_process_type: type })
          .eq('id', application.id);
        
        if (updateError) {
          console.error('Error updating student_process_type:', updateError);
        } else {
          console.log('student_process_type saved successfully:', type);
        }
      }
      setProcessType(type);
      window.localStorage.setItem('studentProcessType', type);
      
      // Se documentos já aprovados, vai direto para pagamento
      if (documentsApproved) {
        navigate('/student/dashboard/application-fee');
      } else {
        // Se não, mostra modal de upload
        setShowUploadModal(true);
      }
    } catch (e) {
      console.error('Error in saveStudentType:', e);
      alert('Failed to save student type. Please try again.');
    } finally {
      setIsSavingType(false);
    }
  };

  const handleUploadSuccess = () => {
    setDocumentsApproved(true);
    setShowUploadModal(false);
    // Redireciona para a página de pagamento
    navigate('/student/dashboard/application-fee');
  };

  if (!userProfile) return null;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-extrabold mb-8 text-center text-slate-800">Application Process Setup</h1>
      
      {!processType && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 mb-8">
          <h2 className="text-xl font-bold mb-6 text-slate-800">What is your current status in the US?</h2>
          <p className="text-slate-600 mb-6">Please select your current immigration status to help us provide the best guidance for your application process.</p>
          <div className="space-y-4">
            <label className={`flex items-start p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
              studentType === 'initial' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
            }`}>
              <input
                type="radio"
                name="processType"
                value="initial"
                checked={studentType === 'initial'}
                onChange={() => setStudentType('initial')}
                className="mt-1 mr-4 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={isSavingType}
              />
              <div>
                <div className="font-semibold text-slate-800">First-time F-1 Visa Application</div>
                <div className="text-sm text-slate-600 mt-1">I am outside the US and need an F-1 student visa to study in America.</div>
              </div>
            </label>
            <label className={`flex items-start p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
              studentType === 'transfer' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
            }`}>
              <input
                type="radio"
                name="processType"
                value="transfer"
                checked={studentType === 'transfer'}
                onChange={() => setStudentType('transfer')}
                className="mt-1 mr-4 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={isSavingType}
              />
              <div>
                <div className="font-semibold text-slate-800">School Transfer</div>
                <div className="text-sm text-slate-600 mt-1">I am already in the US with an F-1 student visa and want to transfer schools.</div>
              </div>
            </label>
            <label className={`flex items-start p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
              studentType === 'status_change' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
            }`}>
              <input
                type="radio"
                name="processType"
                value="status_change"
                checked={studentType === 'status_change'}
                onChange={() => setStudentType('status_change')}
                className="mt-1 mr-4 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={isSavingType}
              />
              <div>
                <div className="font-semibold text-slate-800">Status Change</div>
                <div className="text-sm text-slate-600 mt-1">I am already in the US with another visa (e.g., tourist) and want to change my status to student.</div>
              </div>
            </label>
          </div>
          <div className="text-center mt-6">
            <button
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!studentType || isSavingType}
              onClick={() => studentType && saveStudentType(studentType)}
            >
              {isSavingType ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      )}
      
      {processType && !documentsApproved && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 text-center">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Upload Required Documents</h2>
          <p className="mb-6 text-slate-700 text-lg font-medium">
            Great! Now we need you to upload the required documents to continue with your application process.
          </p>
          <button
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300"
            onClick={() => setShowUploadModal(true)}
          >
            Upload Documents
          </button>
        </div>
      )}
      
      {processType && documentsApproved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-green-800 text-center animate-fade-in">
          <h2 className="text-xl font-bold mb-2 text-green-700">Documents Approved! ✅</h2>
          <p className="text-green-700 font-medium">
            Excellent! Your documents have been approved and you're ready to proceed with the application fee payment.
          </p>
          <button
            onClick={() => navigate('/student/dashboard/application-fee')}
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition-all duration-300"
          >
            Proceed to Payment
          </button>
        </div>
      )}

      {showUploadModal && (
        <DocumentUploadModal 
          onSuccess={handleUploadSuccess} 
          onClose={() => setShowUploadModal(false)} 
        />
      )}
    </div>
  );
};

export default DocumentsAndScholarshipChoice; 