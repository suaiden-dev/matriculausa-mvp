import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCartStore } from '../../stores/applicationStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import DocumentUploadModal from '../../components/DocumentUploadModal';

const DocumentsAndScholarshipChoice: React.FC = () => {
  const { userProfile } = useAuth();
  const { cart } = useCartStore();
  const [documentsApproved, setDocumentsApproved] = useState(userProfile?.documents_status === 'approved');
  const [selectedScholarshipId, setSelectedScholarshipId] = useState<string | null>(null);
  const [processType, setProcessType] = useState<string | null>(window.localStorage.getItem('studentProcessType'));
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [studentType, setStudentType] = useState<string | null>(null);
  const [isSavingType, setIsSavingType] = useState(false);
  const navigate = useNavigate();

  // Função para salvar o tipo de estudante na aplicação do usuário
  const saveStudentType = async (type: string) => {
    setIsSavingType(true);
    try {
      // Buscar a aplicação ativa do usuário
      const { data: applications, error } = await supabase
        .from('scholarship_applications')
        .select('id')
        .eq('student_id', userProfile?.user_id)
        .order('applied_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error fetching applications:', error);
        // Continua mesmo com erro, salva só no localStorage
      } else if (applications && applications.length > 0) {
        const application = applications[0];
        await supabase
          .from('scholarship_applications')
          .update({ student_process_type: type })
          .eq('id', application.id);
      }
      setProcessType(type);
      window.localStorage.setItem('studentProcessType', type);
      // Redireciona para a nova página de upload de documentos
      navigate('/student/dashboard/upload-documents');
    } catch (e) {
      alert('Failed to save student type. Please try again.');
    } finally {
      setIsSavingType(false);
    }
  };

  const handleUploadSuccess = () => {
    setDocumentsApproved(true);
    setShowUploadModal(false);
    // Redireciona para a nova página de pagamento
    navigate('/student/dashboard/application-fee');
  };

  if (!userProfile) return null;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-extrabold mb-8 text-center text-slate-800">Required Documents & Scholarship Choice</h1>
      {!processType && (
        <div className="mb-8">
          <label className="block font-bold mb-2 text-slate-800">What is your current status in the US?</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="processType"
                value="initial"
                checked={studentType === 'initial'}
                onChange={() => setStudentType('initial')}
                className="mr-2"
                disabled={isSavingType}
              />
              I am outside the US and need an F-1 student visa.
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="processType"
                value="transfer"
                checked={studentType === 'transfer'}
                onChange={() => setStudentType('transfer')}
                className="mr-2"
                disabled={isSavingType}
              />
              I am already in the US with an F-1 student visa and want to transfer schools.
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="processType"
                value="status_change"
                checked={studentType === 'status_change'}
                onChange={() => setStudentType('status_change')}
                className="mr-2"
                disabled={isSavingType}
              />
              I am already in the US with another visa (e.g., tourist) and want to change my status to student.
            </label>
          </div>
          <div className="text-center mt-4">
            <button
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300 disabled:opacity-50"
              disabled={!studentType || isSavingType}
              onClick={() => studentType && saveStudentType(studentType)}
            >
              {isSavingType ? 'Saving...' : 'Next'}
            </button>
          </div>
        </div>
      )}
      {processType && !documentsApproved && (
        <div className="text-center mt-8">
          <p className="mb-6 text-slate-700 text-lg font-medium">
            To continue, please upload the required documents using the button below.
          </p>
          <button
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300"
            onClick={() => setShowUploadModal(true)}
          >
            Upload Documents
          </button>
          {showUploadModal && (
            <DocumentUploadModal onSuccess={handleUploadSuccess} onClose={() => setShowUploadModal(false)} />
          )}
        </div>
      )}
      {processType && documentsApproved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-green-800 font-semibold text-center animate-fade-in">
          Documents uploaded successfully! Now select your scholarship to continue.
        </div>
      )}
    </div>
  );
};

export default DocumentsAndScholarshipChoice; 