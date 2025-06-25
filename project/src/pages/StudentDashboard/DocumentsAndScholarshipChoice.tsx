import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCartStore } from '../../stores/applicationStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const DocumentsAndScholarshipChoice: React.FC = () => {
  const { userProfile } = useAuth();
  const { cart, clearCart } = useCartStore();
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
      const { data: application, error } = await supabase
        .from('scholarship_applications')
        .select('id')
        .eq('student_id', userProfile?.user_id)
        .order('applied_at', { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      if (application) {
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
      {processType && !documentsApproved && !showUploadModal && (
        <div className="text-center mt-8">
          {/* Redirecionamento já ocorre após o Next, então não precisa mais do botão aqui */}
        </div>
      )}
      {processType && documentsApproved && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 animate-fade-in">
          <h2 className="text-2xl font-bold mb-6 text-slate-800 text-center">Select Your Scholarship</h2>
          <p className="text-slate-600 text-center mb-4">Choose one scholarship to continue your application process.</p>
          <ul className="mb-6 space-y-4">
            {cart.map((item) => (
              <li key={item.scholarships.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${selectedScholarshipId === item.scholarships.id ? 'border-blue-600 bg-blue-50 shadow-lg' : 'border-slate-200 bg-slate-50'}`}>
                <div>
                  <div className="font-bold text-slate-900 text-lg">{item.scholarships.title}</div>
                  <div className="text-slate-600 text-sm">{item.scholarships.universities?.name || 'Unknown University'}</div>
                </div>
                <button
                  onClick={() => setSelectedScholarshipId(item.scholarships.id)}
                  className={`px-5 py-2 rounded-xl font-bold transition-all duration-200 ${selectedScholarshipId === item.scholarships.id ? 'bg-blue-600 text-white shadow' : 'bg-slate-200 text-slate-700 hover:bg-blue-100'}`}
                >
                  {selectedScholarshipId === item.scholarships.id ? 'Selected' : 'Select'}
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={async () => {
              if (selectedScholarshipId && processType) {
                try {
                  // Verifica se já existe aplicação para o aluno e bolsa
                  const { data: existing, error: fetchError } = await supabase
                    .from('scholarship_applications')
                    .select('id')
                    .eq('student_id', userProfile.id)
                    .eq('scholarship_id', selectedScholarshipId)
                    .maybeSingle();
                  if (fetchError) throw fetchError;
                  if (!existing) {
                    // Cria nova aplicação
                    const { data, error } = await supabase
                      .from('scholarship_applications')
                      .insert({
                        student_id: userProfile.id,
                        scholarship_id: selectedScholarshipId,
                        status: 'pending',
                        applied_at: new Date().toISOString(),
                        student_process_type: processType,
                      })
                      .select('id')
                      .single();
                    if (error) {
                      alert('Erro ao criar aplicação: ' + error.message);
                      return;
                    }
                  }
                  // Salva escolhas no localStorage e redireciona
                  window.localStorage.setItem('selectedScholarshipId', selectedScholarshipId);
                  window.localStorage.setItem('studentProcessType', processType);
                  navigate('/student/dashboard/college-enrollment-checkout');
                } catch (e: any) {
                  alert('Erro ao processar sua escolha. Detalhes: ' + (e?.message || e));
                }
              }
            }}
            disabled={!selectedScholarshipId}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-extrabold text-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 shadow-lg"
          >
            Continue to Application Fee Payment
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentsAndScholarshipChoice; 