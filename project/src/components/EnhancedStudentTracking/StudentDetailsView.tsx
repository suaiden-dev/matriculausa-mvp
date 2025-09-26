import React, { useState, useEffect } from 'react';
import { User, FileText, Edit3, Check, X } from 'lucide-react';
import { getDocumentStatusDisplay } from '../../utils/documentStatusMapper';
import { StudentInfo } from './types';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { supabase } from '../../lib/supabase';
import I20DeadlineTimer from './I20DeadlineTimer';

export interface StudentDetailsViewProps {
  studentDetails: StudentInfo;
  studentDocuments: any[];
  i20ControlFeeDeadline: Date | null;
  onBack: () => void;
  activeTab: 'details' | 'documents';
  onTabChange: (tab: 'details' | 'documents') => void;
  onViewDocument: (doc: any) => void;
  onDownloadDocument: (doc: any) => void;
}

const StudentDetailsView: React.FC<StudentDetailsViewProps> = ({
  studentDetails,
  studentDocuments,
  i20ControlFeeDeadline,
  activeTab,
  onTabChange,
  onViewDocument,
  onDownloadDocument
}) => {
  // Hook para configurações dinâmicas de taxas (usando student_id para ver overrides do estudante)
  const { getFeeAmount, formatFeeAmount, userFeeOverrides, hasOverride } = useFeeConfig(studentDetails?.student_id);
  
  // Debug: Verificar se os overrides estão sendo carregados
  useEffect(() => {
    if (studentDetails?.student_id) {
      console.log('🔍 [StudentDetailsView] Debug - Student ID:', studentDetails.student_id);
      console.log('🔍 [StudentDetailsView] Debug - Email:', studentDetails.email);
      console.log('🔍 [StudentDetailsView] Debug - User Fee Overrides:', userFeeOverrides);
      console.log('🔍 [StudentDetailsView] Debug - getFeeAmount(selection_process):', getFeeAmount('selection_process'));
      console.log('🔍 [StudentDetailsView] Debug - getFeeAmount(scholarship_fee):', getFeeAmount('scholarship_fee'));
      console.log('🔍 [StudentDetailsView] Debug - getFeeAmount(i20_control_fee):', getFeeAmount('i20_control_fee'));
    }
  }, [studentDetails?.student_id, studentDetails?.email, userFeeOverrides, getFeeAmount]);
  
  
  // Estado para armazenar as taxas do pacote do estudante
  const [studentPackageFees, setStudentPackageFees] = useState<any>(null);
  
  // Estado para armazenar os dependentes do estudante
  const [studentDependents, setStudentDependents] = useState<number>(0);
  
  // ✅ Sincronizar dependentes do studentDetails com estado local
  useEffect(() => {
    if (studentDetails?.dependents !== undefined) {
      setStudentDependents(studentDetails.dependents);
      console.log('🔍 [StudentDetailsView] Dependents updated from studentDetails:', studentDetails.dependents);
    }
  }, [studentDetails?.dependents]);
  
  // Estados para edição de pacote
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isUpdatingPackage, setIsUpdatingPackage] = useState(false);
  
  // ✅ CORREÇÃO: Função para calcular valor com dependentes priorizando overrides
  // - Se há override: usar exatamente o valor do override (já inclui dependentes se foi configurado assim)
  // - Se não há override: aplicar regra de dependentes (Selection Process: +150 por dependente, I-20: sem adicionais)
  const calculateFeeWithDependents = (baseFee: number, dependents: number = 0, feeType: 'selection_process' | 'i20_control_fee') => {
    // ✅ Se há override para este tipo de taxa, usar exatamente o valor do override (não adicionar dependentes)
    if (hasOverride && hasOverride(feeType)) {
      return baseFee; // baseFee já vem com o valor do override através do getFeeAmount
    }
    
    // ✅ Sem override: aplicar regra de dependentes
    if (feeType === 'selection_process') {
      const dependentCost = dependents * 150;
      return baseFee + dependentCost;
    }
    if (feeType === 'i20_control_fee') {
      return baseFee; // I-20 nunca tem dependentes
    }
    return baseFee;
  };
  
  // Função para buscar o desired_scholarship_range do estudante
  const loadStudentPackageFees = async (profileId: string) => {
    if (!profileId) return;
    try {
      // Buscar o perfil do estudante com desired_scholarship_range
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('desired_scholarship_range, dependents')
        .eq('id', profileId)
        .single();

      if (profileError) {
        console.error('Error loading student profile:', profileError);
        setStudentPackageFees(null);
        return;
      }

      console.log('🔍 [StudentDetailsView] Profile data loaded:', profileData);
      
      // Atualizar dependentes
      setStudentDependents(Number(profileData.dependents) || 0);
      
      // Se não tem desired_scholarship_range, retornar null
      if (!profileData.desired_scholarship_range) {
        console.log('🔍 [StudentDetailsView] No desired scholarship range set');
        setStudentPackageFees(null);
        return;
      }

      // ✅ CORREÇÃO: Calcular selection process fee priorizando overrides
      const dependents = Number(profileData.dependents) || 0;
      let selectionProcessFee;
      
      // Verificar se há override para este estudante
      if (hasOverride && hasOverride('selection_process')) {
        // Se há override, usar o valor do override (já inclui dependentes se configurado)
        selectionProcessFee = getFeeAmount('selection_process');
      } else {
        // Sem override: usar valor padrão + dependentes
        const baseFee = getFeeAmount('selection_process');
        selectionProcessFee = baseFee + (dependents * 150);
      }
      
      // Criar dados do pacote baseado no desired_scholarship_range
      const desiredRange = Number(profileData.desired_scholarship_range);
      
      // ✅ CORREÇÃO: Calcular outras fees considerando overrides também
      const i20ControlFee = getFeeAmount('i20_control_fee'); // já considera override se existir
      const scholarshipFee = getFeeAmount('scholarship_fee'); // já considera override se existir
      
      const packageFees = {
        id: `range-${desiredRange}`, // ID baseado no range
        selection_process_fee: selectionProcessFee, // ✅ Valor calculado considerando override e dependentes
        i20_control_fee: i20ControlFee, // ✅ Valor considerando override
        scholarship_fee: scholarshipFee, // ✅ Valor considerando override
        total_paid: selectionProcessFee + i20ControlFee + scholarshipFee, // ✅ Total correto com overrides
        scholarship_amount: desiredRange,
        package_name: `Scholarship Range $${desiredRange}+`,
        dependents: dependents // ✅ Informação dos dependentes
      };
      
      console.log('🔍 [StudentDetailsView] Package fees set:', packageFees);
      setStudentPackageFees(packageFees);
    } catch (error) {
      console.error('Error loading student package fees:', error);
      setStudentPackageFees(null);
    }
  };
  
  // Carregar as taxas do pacote quando o componente montar
  useEffect(() => {
    if (studentDetails?.profile_id) {
      loadStudentPackageFees(studentDetails.profile_id);
    }
  }, [studentDetails?.profile_id]);

  // Função para iniciar edição de pacote
  const handleStartEditPackage = () => {
    setIsEditingPackage(true);
    setSelectedPackageId(studentPackageFees?.id || null);
  };

  // Função para cancelar edição
  const handleCancelEditPackage = () => {
    setIsEditingPackage(false);
    setSelectedPackageId(studentPackageFees?.id || null);
  };

  // Função para salvar alteração de pacote
  const handleSavePackageChange = async () => {
    if (!selectedPackageId || !studentDetails?.profile_id) return;

    setIsUpdatingPackage(true);
    try {
      // Extrair o valor do range do ID selecionado (formato: range-3800)
      const rangeValue = selectedPackageId.replace('range-', '');
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ desired_scholarship_range: Number(rangeValue) })
        .eq('id', studentDetails.profile_id);

      if (error) {
        console.error('Error updating package:', error);
        alert('Error updating package. Please try again.');
        return;
      }

      // Recarregar os dados do pacote
      await loadStudentPackageFees(studentDetails.profile_id);
      setIsEditingPackage(false);
      alert('Package updated successfully!');
    } catch (error) {
      console.error('Error updating package:', error);
      alert('Error updating package. Please try again.');
    } finally {
      setIsUpdatingPackage(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Section */}


      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        {/* <div className="bg-white shadow-sm border-b border-slate-200 rounded-t-3xl mb-6">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-4 min-w-0 w-full">
                <div className="min-w-0 w-full">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight break-words">
                    Student Details
                  </h1>
                  <p className="mt-1 text-sm text-slate-600 break-words">
                    Review and manage student application details
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 sm:justify-end flex-wrap">
                <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200 whitespace-nowrap shrink-0">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {studentDetails?.application_status === 'enrolled' ? 'Enrolled' : 'Active'}
                </div>
              </div>
            </div>
          </div>
        </div> */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-6">
              {/* Student Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <User className="w-6 h-6 mr-3" />
                    Student Information
                  </h2>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Personal Details</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Full Name</dt>
                          <dd className="text-base font-semibold text-slate-900 mt-1">{studentDetails.full_name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Email</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentDetails.email || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Phone</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentDetails.phone || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Country</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentDetails.country || 'Not specified'}</dd>
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Academic Profile</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Field of Interest</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentDetails.field_of_interest || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Academic Level</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentDetails.academic_level || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">GPA</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentDetails.gpa || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">English Proficiency</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentDetails.english_proficiency || 'Not specified'}</dd>
                        </div>
                      </div>
                    </div>

                    {/* Application & Status */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Application Status</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Student Type</dt>
                          <dd className="text-base text-slate-900 mt-1">
                            {(() => {
                              if (studentDetails?.student_process_type && studentDetails.student_process_type !== 'Not specified') {
                                if (studentDetails.student_process_type === 'initial') {
                                  return 'Initial - F-1 Visa Required';
                                } else if (studentDetails.student_process_type === 'transfer') {
                                  return 'Transfer - Current F-1 Student';
                                } else if (studentDetails.student_process_type === 'change_of_status') {
                                  return 'Change of Status - From Other Visa';
                                } else {
                                  return studentDetails.student_process_type;
                                }
                              }
                              return 'Not specified';
                            })()}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Application Fee</dt>
                          <dd className="mt-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                studentDetails.is_application_fee_paid ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <span className={`text-sm font-medium ${
                                studentDetails.is_application_fee_paid ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {studentDetails.is_application_fee_paid ? 'Paid' : 'Pending'}
                              </span>
                            </div>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Documents Status</dt>
                          <dd className="mt-1">
                            <div className="flex items-center space-x-2">
                              {(() => {
                                // Calcular status baseado nos documentos disponíveis (prioriza props recentes)
                                const requiredDocs = ['passport', 'diploma', 'funds_proof'];
                                const appDocuments = (studentDetails as any)?.documents || [];
                                const docsFromProps = Array.isArray(studentDocuments) ? studentDocuments : [];
                                
                                let documentsStatus: string | undefined = undefined;
                                
                                // Preferir documentos vindos por props (estão mais atualizados)
                                if (Array.isArray(docsFromProps) && docsFromProps.length > 0) {
                                  const allApproved = requiredDocs.every((t) => {
                                    const d = docsFromProps.find((x: any) => x.type === t);
                                    return d && (d.status || '').toLowerCase() === 'approved';
                                  });
                                  if (allApproved) {
                                    documentsStatus = 'approved';
                                  } else {
                                    const hasChanges = requiredDocs.some((t) => {
                                      const d = docsFromProps.find((x: any) => x.type === t);
                                      return d && (d.status || '').toLowerCase() === 'changes_requested';
                                    });
                                    if (hasChanges) {
                                      documentsStatus = 'changes_requested';
                                    } else {
                                      const anySubmitted = requiredDocs.some((t) => {
                                        const d = docsFromProps.find((x: any) => x.type === t);
                                        return !!d && !!(d.file_url || d.url);
                                      });
                                      documentsStatus = anySubmitted ? 'under_review' : 'pending';
                                    }
                                  }
                                } else if (Array.isArray(appDocuments) && appDocuments.length > 0) {
                                  // Fallback para documentos do studentDetails
                                  const allApproved = requiredDocs.every((t) => {
                                    const d = appDocuments.find((x: any) => x.type === t);
                                    return d && (d.status || '').toLowerCase() === 'approved';
                                  });
                                  if (allApproved) {
                                    documentsStatus = 'approved';
                                  } else {
                                    const hasChanges = requiredDocs.some((t) => {
                                      const d = appDocuments.find((x: any) => x.type === t);
                                      return d && (d.status || '').toLowerCase() === 'changes_requested';
                                    });
                                    if (hasChanges) {
                                      documentsStatus = 'changes_requested';
                                    } else {
                                      const anySubmitted = requiredDocs.some((t) => {
                                        const d = appDocuments.find((x: any) => x.type === t);
                                        return !!d && !!(d.file_url || d.url);
                                      });
                                      documentsStatus = anySubmitted ? 'under_review' : 'pending';
                                    }
                                  }
                                } else {
                                  // Último recurso: usar documents_status vindo do perfil
                                  documentsStatus = studentDetails?.documents_status || 'pending';
                                }
                                
                                const statusDisplay = getDocumentStatusDisplay(documentsStatus);
                                return (
                                  <>
                                    <div className={`w-2 h-2 rounded-full ${statusDisplay.bgColor}`}></div>
                                    <span className={`text-sm font-medium ${statusDisplay.color}`}>
                                      {statusDisplay.text}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Enrollment Status</dt>
                          <dd className="mt-1">
                            {(() => {
                              const acceptanceStatus = (studentDetails as any)?.acceptance_letter_status as string | undefined;
                              const appStatus = (studentDetails as any)?.status || (studentDetails as any)?.application_status as string | undefined;
                              const documentsStatus = (studentDetails as any)?.documents_status as string | undefined;
                              
                              // Para usuários com aplicação de bolsa: verificar status da aplicação
                              // Para usuários sem aplicação de bolsa: verificar documents_status
                              const isEnrolled = appStatus === 'enrolled' || 
                                                acceptanceStatus === 'approved' || 
                                                (documentsStatus === 'approved' && !appStatus);
                              const label = isEnrolled ? 'Enrolled' : 'Pending Acceptance';
                              const color = isEnrolled ? 'text-green-700' : 'text-yellow-700';
                              const dot = isEnrolled ? 'bg-green-500' : 'bg-yellow-500';
                              
                              return (
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${dot}`}></div>
                                  <span className={`text-sm font-medium ${color}`}>{label}</span>
                                </div>
                              );
                            })()}
                          </dd>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scholarship Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-700 to-slate-800 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Scholarship Details
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
                        <dd className="text-lg font-semibold text-slate-900">
                          {studentDetails?.scholarship_title && studentDetails.scholarship_title !== 'Scholarship not specified'
                            ? studentDetails.scholarship_title
                            : 'Scholarship information not available'
                          }
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">University</dt>
                        <dd className="text-lg font-semibold text-slate-900">
                          {studentDetails?.university_name && studentDetails.university_name !== 'University not specified'
                            ? studentDetails.university_name
                            : 'University not specified'
                          }
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Application Status</dt>
                        <dd className="text-base text-slate-700">
                          {studentDetails?.application_status && studentDetails.application_status !== 'Not specified'
                            ? studentDetails.application_status.charAt(0).toUpperCase() + studentDetails.application_status.slice(1)
                            : 'Pending'
                          }
                        </dd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Documents Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#041f38] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Student Documents
                  </h2>
                  <p className="text-slate-200 text-sm mt-1">View student submitted documents and their current status</p>
                </div>
                <div className="p-4 sm:p-6">
                  {studentDocuments && studentDocuments.length > 0 ? (
                    <div className="space-y-2">
                      {studentDocuments.map((doc: any, index: number) => (
                        <div key={doc.id || index} className="mb-4 last:mb-0">
                          <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200">
                            <div className="flex flex-col sm:flex-row items-start gap-4">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap gap-2 mb-1">
                                  <p className="text-sm font-medium text-slate-600 capitalize">{doc.type || 'Document'}</p>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                    doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Submitted'}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600">Document uploaded for university review</p>
                                {doc.uploaded_at && (
                                  <p className="text-xs text-slate-400 mt-1">
                                    Uploaded: {formatDate(doc.uploaded_at)}
                                  </p>
                                )}
                                
                                {/* Botões de visualização e download */}
                                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                                  {doc.url && (
                                    <button 
                                      onClick={() => onViewDocument(doc)}
                                      className="bg-[#05294E] hover:bg-[#041f38] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                                    >
                                      View Document
                                    </button>
                                  )}
                                  {doc.url && (
                                    <button 
                                      onClick={() => onDownloadDocument(doc)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                                    >
                                      Download
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {index < (studentDetails.documents?.length || 0) - 1 && (
                            <div className="border-t border-slate-200"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-slate-600 font-medium">No documents uploaded yet</p>
                      <p className="text-sm text-slate-500 mt-1">Documents will appear here when the student uploads them</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-4 space-y-4">
              {/* Quick Stats Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#041f38] px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Application Summary</h3>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Submitted</span>
                    <span className="text-sm text-slate-900">
                      {formatDate(studentDetails.registration_date)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-600 to-slate-700 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-900">Application submitted</p>
                        <p className="text-xs text-slate-500">{formatDate(studentDetails.registration_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-900">Last updated</p>
                        <p className="text-xs text-slate-500">{formatDate(studentDetails.registration_date)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-500 to-slate-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <button
                      onClick={() => onTabChange('documents')}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-slate-600" />
                        <span className="text-sm font-medium text-slate-900">Documents</span>
                      </div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Package Management Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Scholarship Range</h3>
                    {!isEditingPackage && (
                      <button
                        onClick={handleStartEditPackage}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                        title="Edit package"
                      >
                        <Edit3 className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {isEditingPackage ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Select Scholarship Range
                        </label>
                        <div className="space-y-2">
                          {[3800, 4200, 4500, 5000, 5500].map((range) => (
                            <div
                              key={`range-${range}`}
                              className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                selectedPackageId === `range-${range}`
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => setSelectedPackageId(`range-${range}`)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-slate-900">Scholarship Range ${range}+</h4>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSavePackageChange}
                          disabled={isUpdatingPackage || !selectedPackageId}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isUpdatingPackage ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Save
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleCancelEditPackage}
                          disabled={isUpdatingPackage}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studentPackageFees ? (
                        <>
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-blue-900">{studentPackageFees.package_name}</h4>
                              <span className="text-sm text-blue-600">Current</span>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500 text-center">
                            Click edit to change scholarship range
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <div className="text-slate-400 mb-2">No scholarship range set</div>
                          <div className="text-sm text-slate-500">Click edit to set scholarship range</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Fee Status Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-500 to-slate-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Fee Status</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {/* Selection Process Fee Status */}
                    <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${studentDetails?.has_paid_selection_process_fee ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm font-medium text-slate-900">Selection Process Fee</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-medium ${studentDetails?.has_paid_selection_process_fee ? 'text-green-700' : 'text-red-700'}`}>
                            {studentDetails?.has_paid_selection_process_fee ? 'Paid' : 'Pending'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {(() => {
                              // ✅ CORREÇÃO: Mostrar valor sempre, prioritizando overrides
                              const baseFee = getFeeAmount('selection_process'); // já considera overrides
                              const finalAmount = calculateFeeWithDependents(baseFee, studentDependents, 'selection_process');
                              console.log('🔍 [StudentDetailsView] Selection Process - Base (with override):', baseFee, 'Final:', finalAmount, 'Dependents:', studentDependents, 'Has Override:', hasOverride && hasOverride('selection_process'));
                              return formatFeeAmount(finalAmount);
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Application Fee Status */}
                    <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${studentDetails?.is_application_fee_paid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm font-medium text-slate-900">Application Fee</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-medium ${studentDetails?.is_application_fee_paid ? 'text-green-700' : 'text-red-700'}`}>
                            {studentDetails?.is_application_fee_paid ? 'Paid' : 'Pending'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {(() => {
                              // ✅ CORREÇÃO: Mostrar valor sempre, priorizando scholarship amount
                              if (studentDetails?.scholarship?.application_fee_amount) {
                                const amount = Number(studentDetails.scholarship.application_fee_amount);
                                return formatFeeAmount(amount);
                              } else {
                                return formatFeeAmount(getFeeAmount('application_fee'));
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Scholarship Fee Status */}
                    <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${studentDetails?.is_scholarship_fee_paid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm font-medium text-slate-900">Scholarship Fee</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-medium ${studentDetails?.is_scholarship_fee_paid ? 'text-green-700' : 'text-red-700'}`}>
                            {studentDetails?.is_scholarship_fee_paid ? 'Paid' : 'Pending'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {(() => {
                              // ✅ CORREÇÃO: Mostrar valor sempre, considerando overrides
                              if (studentDetails?.scholarship?.scholarship_fee_amount) {
                                const amount = Number(studentDetails.scholarship.scholarship_fee_amount);
                                return formatFeeAmount(amount);
                              } else {
                                return formatFeeAmount(getFeeAmount('scholarship_fee'));
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* I-20 Control Fee Status */}
                    <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${studentDetails?.has_paid_i20_control_fee ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm font-medium text-slate-900">I-20 Control Fee</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-medium ${studentDetails?.has_paid_i20_control_fee ? 'text-green-700' : 'text-red-700'}`}>
                            {studentDetails?.has_paid_i20_control_fee ? 'Paid' : 'Pending'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {(() => {
                              // ✅ CORREÇÃO: Mostrar valor sempre, prioritizando overrides  
                              const baseFee = getFeeAmount('i20_control_fee'); // já considera overrides
                              const finalAmount = calculateFeeWithDependents(baseFee, studentDependents, 'i20_control_fee');
                              console.log('🔍 [StudentDetailsView] I-20 Control - Base (with override):', baseFee, 'Final:', finalAmount, 'Has Override:', hasOverride && hasOverride('i20_control_fee'));
                              return formatFeeAmount(finalAmount);
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* I-20 Control Fee Deadline Timer */}
                    <I20DeadlineTimer 
                      deadline={i20ControlFeeDeadline} 
                      hasPaid={studentDetails?.has_paid_i20_control_fee || false} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetailsView;
