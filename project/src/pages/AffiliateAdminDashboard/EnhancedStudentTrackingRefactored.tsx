// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  useStudentData,
  useStudentDetails,
  useFilters,
  getFilteredAndSortedData,
  handleViewDocument,
  handleDownloadDocument,
  StudentDetailsView,
  DocumentsView,
  AdvancedFilters,
  StatsCards,
  SellersList
} from '../../components/EnhancedStudentTracking';
import { supabase } from '../../lib/supabase';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useDynamicFeeCalculation, useDynamicFeeCalculationForUser } from '../../hooks/useDynamicFeeCalculation';

function EnhancedStudentTracking(props) {
  const { userId } = props || {};
  const { user } = useAuth();
  const [expandedSellers, setExpandedSellers] = useState(new Set());
  const [expandedStudents, setExpandedStudents] = useState(new Set());
  const [activeTab, setActiveTab] = useState('details');
  
  // Estados para Transfer Form
  const [transferFormUploads, setTransferFormUploads] = useState<any[]>([]);
  const [loadingTransferFormUploads, setLoadingTransferFormUploads] = useState(false);
  const [realScholarshipApplication, setRealScholarshipApplication] = useState<any>(null);

  // Hooks personalizados
  const effectiveUserId = userId || user?.id;
  const { sellers, students, universities, loading } = useStudentData(effectiveUserId);
  const {
    selectedStudent,
    studentDetails,
    scholarshipApplication,
    studentDocuments,
    documentRequests,
    i20ControlFeeDeadline,
    loadStudentDetails,
    backToList
  } = useStudentDetails();
  const {
    filters,
    showAdvancedFilters,
    updateFilters,
    resetFilters,
    toggleAdvancedFilters
  } = useFilters();

  // Obter dados filtrados e ordenados com memoização para evitar recálculos desnecessários
  const { filteredSellers, filteredStudents } = useMemo(() => {
    return getFilteredAndSortedData(sellers, students, filters);
  }, [sellers, students, filters]);

  // Carregar defaults de taxas (sem userId) para usar quando não houver override
  const { feeConfig } = useFeeConfig();

  // Map de overrides por student_id
  const [overridesMap, setOverridesMap] = useState({});
  // Map de dependentes por profile_id
  const [dependentsMap, setDependentsMap] = useState({});
  // Função para calcular taxas de um estudante específico
  const getStudentFees = (student: any) => {
    // Usar system_type do estudante para determinar os valores
    const systemType = student.system_type || 'legacy';
    const isSimplified = systemType === 'simplified';
    
    // Debug para jolie8862@uorak.com
    if (student.email === 'jolie8862@uorak.com') {
      console.log('🔍 [getStudentFees] jolie8862@uorak.com:', {
        systemType: systemType,
        isSimplified: isSimplified,
        studentData: student
      });
    }
    
    return {
      selectionProcessFee: isSimplified ? 350 : (Number(feeConfig.selection_process_fee) || 400),
      scholarshipFee: isSimplified ? 550 : (Number(feeConfig.scholarship_fee_default) || 900),
      i20ControlFee: 900, // Sempre 900 para ambos os sistemas
      isSimplified: isSimplified
    };
  };

  // Cache para overrides para evitar requisições desnecessárias
  const [overridesCache, setOverridesCache] = useState<Record<string, any>>({});

  // Buscar overrides para os estudantes (baseado nos students originais, não filtrados)
  useEffect(() => {
    const loadOverrides = async () => {
      try {
        const uniqueIds = Array.from(new Set((students || []).map((s) => s.user_id).filter(Boolean)));
        if (uniqueIds.length === 0) {
          setOverridesMap({});
          return;
        }

        // ✅ OTIMIZAÇÃO: Filtrar apenas IDs que não estão no cache
        const idsToFetch = uniqueIds.filter(id => !overridesCache[id]);

        if (idsToFetch.length === 0) {
          // Todos os overrides já estão no cache
          const cachedMap = {};
          uniqueIds.forEach(id => {
            if (overridesCache[id]) {
              cachedMap[id] = overridesCache[id];
            }
          });
          setOverridesMap(cachedMap);
          return;
        }

        const results = await Promise.allSettled(
          idsToFetch.map(async (userId) => {
            const { data, error } = await supabase.rpc('get_user_fee_overrides', { target_user_id: userId });
            return { userId, data: error ? null : data };
          })
        );

        const map = {};
        const newCacheEntries = {};
        
        results.forEach((res) => {
          if (res.status === 'fulfilled') {
            const v = res.value;
            const userId = v.userId;
            const data = v.data;
            // ✅ CORREÇÃO: get_user_fee_overrides pode retornar array ou objeto único
            const override = Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data;
            if (override) {
              const overrideData = {
                selection_process_fee: override.selection_process_fee != null ? Number(override.selection_process_fee) : undefined,
                application_fee: override.application_fee != null ? Number(override.application_fee) : undefined,
                scholarship_fee: override.scholarship_fee != null ? Number(override.scholarship_fee) : undefined,
                i20_control_fee: override.i20_control_fee != null ? Number(override.i20_control_fee) : undefined
              };
              map[userId] = overrideData;
              newCacheEntries[userId] = overrideData; // Adicionar ao cache
            } else {
              newCacheEntries[userId] = null; // Cache null para evitar requisições futuras
            }
          }
        });

        // ✅ OTIMIZAÇÃO: Atualizar cache com novos dados
        setOverridesCache(prev => ({ ...prev, ...newCacheEntries }));

        // ✅ OTIMIZAÇÃO: Incluir dados do cache existente
        uniqueIds.forEach(id => {
          if (overridesCache[id] && !map[id]) {
            map[id] = overridesCache[id];
          }
        });

        setOverridesMap(map);
      } catch (e) {
        console.error('🔍 OVERRIDES ERROR:', e);
        setOverridesMap({});
      }
    };
    loadOverrides();
  }, [students, overridesCache]);

  // Buscar dependentes para os estudantes (baseado nos students originais, não filtrados)
  useEffect(() => {
    const loadDependents = async () => {
      try {
        const profileIds = Array.from(new Set((students || []).map((s) => s.profile_id).filter(Boolean)));
        if (profileIds.length === 0) {
          setDependentsMap({});
          return;
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, dependents')
          .in('id', profileIds);

        if (error) {
          setDependentsMap({});
          return;
        }

        const map = {};
        (data || []).forEach((row) => {
          map[row.id] = Number(row.dependents) || 0;
        });
        setDependentsMap(map);
      } catch (e) {
        setDependentsMap({});
      }
    };
    loadDependents();
  }, [students]);

  // Calcular receita ajustada por estudante usando overrides quando existirem
  const adjustedStudents = useMemo(() => {
    
    const result = (filteredStudents || []).map((s) => {
      
      if (!s.user_id) {
        console.warn(`🔍 WARNING: Student ${s.email} has no user_id!`, s);
      }
      const o = overridesMap[s.user_id] || {};
      const dependents = Number(dependentsMap[s.profile_id]) || 0;

      // ✅ CORREÇÃO: Usar a mesma lógica simples do Seller Dashboard
      let total = 0;
      
      // Selection Process Fee
      if (s.has_paid_selection_process_fee) {
        const systemType = s.system_type || 'legacy';
        const baseSelectionFee = systemType === 'simplified' ? 350 : 400;
        total += baseSelectionFee + (dependents * 150);
      }
      
      // Scholarship Fee
      if (s.is_scholarship_fee_paid) {
        const systemType = s.system_type || 'legacy';
        const scholarshipFee = systemType === 'simplified' ? 550 : 900;
        total += scholarshipFee;
      }
      
      // I-20 Control Fee (só conta se scholarship foi pago)
      if (s.is_scholarship_fee_paid && s.has_paid_i20_control_fee) {
        total += 900; // Sempre $900 para ambos os sistemas
      }
      
      console.log(`🔍 [ENHANCED_TRACKING] Calculado para ${s.email}:`, {
          totalCalculated: total,
          breakdown: {
            selectionPaid: s.has_paid_selection_process_fee,
            scholarshipPaid: s.is_scholarship_fee_paid,  
            i20Paid: s.has_paid_i20_control_fee
          }
        });

      const adjusted = { 
        ...s, 
        total_paid_adjusted: total,
        // Preservar propriedades de múltiplas aplicações
        hasMultipleApplications: s.hasMultipleApplications,
        applicationCount: s.applicationCount,
        allApplications: s.allApplications
      };
      
      
      return adjusted;
    });
    
    
    return result;
  }, [filteredStudents, overridesMap, feeConfig, dependentsMap]);

  // Toggle expandir vendedor
  const toggleSellerExpansion = (sellerId) => {
    setExpandedSellers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sellerId)) {
        newSet.delete(sellerId);
      } else {
        newSet.add(sellerId);
      }
      return newSet;
    });
  };

  // Toggle expandir estudante
  const toggleStudentExpansion = (studentId) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Função para buscar aplicação real com campos de transfer form
  const fetchRealApplication = async (studentId) => {
    if (!studentId) return;
    
    try {
      // Verificar se studentId é user_id ou profile_id
      let profileData: any = null;
      let profileError: any = null;
      
      // Primeiro, tentar como user_id
      const { data: userProfileData, error: userProfileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', studentId)
        .single();
      
      if (!userProfileError && userProfileData) {
        profileData = userProfileData;
      } else {
        // Se não encontrou como user_id, tentar como profile_id (id)
        const { data: profileIdData, error: profileIdError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', studentId)
          .single();
        
        if (!profileIdError && profileIdData) {
          profileData = profileIdData;
        } else {
          profileError = profileIdError;
        }
      }
      
      if (profileError || !profileData) {
        console.error('❌ [TRANSFER_FORM] Error loading profile for student:', studentId, profileError);
        return;
      }
      
      // Buscar aplicação com campos de transfer form
      const { data: applications, error: applicationError } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          transfer_form_url,
          transfer_form_status,
          transfer_form_sent_at,
          scholarships(
            id,
            title,
            universities(
              id,
              name
            )
          )
        `)
        .eq('student_id', profileData.id)
        .order('status', { ascending: false }) // enrolled vem antes de approved
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!applicationError && applications && applications.length > 0) {
        const app = applications[0];
        console.log('🔍 [TRANSFER_FORM] Real application found:', {
          id: app.id,
          student_process_type: app.student_process_type,
          transfer_form_url: app.transfer_form_url,
          transfer_form_status: app.transfer_form_status,
          transfer_form_sent_at: app.transfer_form_sent_at
        });
        setRealScholarshipApplication(app);
      } else {
        console.log('❌ [TRANSFER_FORM] No application found for student');
        setRealScholarshipApplication(null);
      }
    } catch (err) {
      console.error('❌ [TRANSFER_FORM] Error fetching real application:', err);
      setRealScholarshipApplication(null);
    }
  };

  // Função para buscar transfer form uploads
  const fetchTransferFormUploads = async (applicationId) => {
    if (!applicationId) return;
    
    setLoadingTransferFormUploads(true);
    
    try {
      const { data, error } = await supabase
        .from('transfer_form_uploads')
        .select('*')
        .eq('application_id', applicationId)
        .order('uploaded_at', { ascending: false });
      
      if (!error && data) {
        setTransferFormUploads(data);
      } else if (error) {
        console.error('Erro ao buscar transfer form uploads:', error);
      }
    } catch (err) {
      console.error('Erro ao buscar transfer form uploads:', err);
    } finally {
      setLoadingTransferFormUploads(false);
    }
  };

  // Função para verificar se é aplicação de transfer
  const getTransferApplication = () => {
    // Usar a aplicação real se disponível, senão usar a passada como prop
    const currentApplication = realScholarshipApplication || scholarshipApplication;
    
    console.log('🔍 [TRANSFER_FORM_DEBUG] getTransferApplication called:', {
      scholarshipApplication: !!scholarshipApplication,
      realScholarshipApplication: !!realScholarshipApplication,
      currentApplication: !!currentApplication,
      student_process_type: currentApplication?.student_process_type,
      transfer_form_url: currentApplication?.transfer_form_url,
      transfer_form_status: currentApplication?.transfer_form_status
    });
    
    return currentApplication?.student_process_type === 'transfer' ? currentApplication : null;
  };

  // Buscar aplicação real quando um estudante for selecionado
  useEffect(() => {
    if (selectedStudent) {
      fetchRealApplication(selectedStudent);
    }
  }, [selectedStudent]);

  // Buscar transfer form uploads quando a aplicação real for carregada
  useEffect(() => {
    if (realScholarshipApplication?.id && realScholarshipApplication.student_process_type === 'transfer') {
      fetchTransferFormUploads(realScholarshipApplication.id);
    }
  }, [realScholarshipApplication?.id, realScholarshipApplication?.student_process_type]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      </div>
    );
  }

  // Se um estudante está selecionado, mostrar detalhes
  if (selectedStudent && studentDetails) {
    return (
      <div className="min-h-screen">
        {/* Header Section */}
        <div className="bg-white shadow-sm border-b border-slate-200 rounded-t-3xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-4 min-w-0 w-full">
                <button
                  onClick={backToList}
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100 mb-4 sm:mb-0 w-full sm:w-auto justify-start"
                >
                  <span className="text-sm md:text-base">← Back to list</span>
                </button>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight break-words">
                    Student Application
                  </h1>
                  <p className="mt-1 text-sm text-slate-600 break-words">
                    Review and manage {studentDetails.full_name}'s application details
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - SEMPRE VISÍVEIS */}
        <div className="bg-white border-b border-slate-300 rounded-b-3xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8 overflow-x-auto -mb-px" role="tablist">
              {[
                { id: 'details', label: 'Details', icon: '👤' },
                { id: 'documents', label: 'Documents', icon: '📄' }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap min-w-0 ${
                    activeTab === tab.id 
                      ? 'border-[#05294E] text-[#05294E]' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                  aria-selected={activeTab === tab.id}
                  role="tab"
                >
                  <span className="flex items-center gap-2">
                    <span className="hidden sm:inline">{tab.icon}</span>
                    <span className="break-words">{tab.label}</span>
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'details' && (
            <StudentDetailsView
              studentDetails={studentDetails}
              studentDocuments={studentDocuments}
              scholarshipApplication={scholarshipApplication}
              i20ControlFeeDeadline={i20ControlFeeDeadline}
              onBack={backToList}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onViewDocument={handleViewDocument}
              onDownloadDocument={handleDownloadDocument}
            />
          )}
          
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Document Management Section */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4 rounded-t-3xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center min-w-0">
                      <span className="text-white mr-3">📄</span>
                      <div>
                        <h2 className="text-xl font-semibold text-white break-words">Document Management</h2>
                        <p className="text-slate-200 text-sm mt-1 break-words">View student submitted documents and their current status</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <DocumentsView
                    studentDocuments={studentDocuments}
                    documentRequests={documentRequests}
                    scholarshipApplication={scholarshipApplication}
                    studentId={selectedStudent}
                    onViewDocument={handleViewDocument}
                    onDownloadDocument={handleDownloadDocument}
                    isAdmin={user?.role === 'affiliate_admin'}
                  />
                </div>
              </div>

              {/* Transfer Form Section - Only for Transfer Students */}
              {(() => {
                const transferApp = getTransferApplication();
                
                if (!transferApp) return null;
                
                return (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
                    <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4 rounded-t-3xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center min-w-0">
                          <div>
                            <h2 className="text-xl font-semibold text-white break-words">Transfer Form</h2>
                            <p className="text-slate-200 text-sm mt-1 break-words">Transfer application documents and student uploads</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6">
                      {/* Template enviado pelo admin/universidade */}
                      {transferApp.transfer_form_url && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-[#05294E] mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Transfer Form Template
                          </h3>
                          
                          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                            <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap gap-2 mb-1">
                                  <p className="font-medium text-slate-900 break-words">
                                    {transferApp.transfer_form_url.split('/').pop() || 'Transfer Form Template'}
                                  </p>
                                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 whitespace-nowrap">
                                    Available
                                  </span>
                                </div>
                                <p className="text-sm text-slate-500 break-words">
                                  Sent on {transferApp.transfer_form_sent_at ? new Date(transferApp.transfer_form_sent_at).toLocaleDateString('pt-BR') : 'N/A'}
                                </p>
                                
                                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                                  <button
                                    onClick={() => handleViewDocument({
                                      file_url: transferApp.transfer_form_url,
                                      filename: transferApp.transfer_form_url.split('/').pop() || 'Transfer Form Template'
                                    })}
                                    className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                                  >
                                    View Template
                                  </button>
                                  
                                  <button
                                    onClick={() => handleDownloadDocument({
                                      file_url: transferApp.transfer_form_url,
                                      filename: transferApp.transfer_form_url.split('/').pop() || 'Transfer Form Template'
                                    })}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                                  >
                                    Download Template
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Student Uploads */}
                      {loadingTransferFormUploads ? (
                        <div className="text-center py-8">
                          <div className="w-8 h-8 border-4 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-slate-600">Loading transfer form uploads...</p>
                        </div>
                      ) : transferFormUploads.length > 0 ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                          <h4 className="text-lg font-semibold text-[#05294E] mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2z" />
                            </svg>
                            Student Uploads
                          </h4>
                          
                          <div className="space-y-4">
                            {transferFormUploads.map((upload) => {
                              const statusColor = upload.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                                upload.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                                'bg-yellow-100 text-yellow-800 border-yellow-200';
                              
                              return (
                                <div key={upload.id} className="bg-white border border-slate-200 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2z" />
                                        </svg>
                                      </div>
                                      <div>
                                        <p className="font-medium text-slate-900">
                                          {upload.file_url.split('/').pop()}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                          Uploaded on {new Date(upload.uploaded_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColor}`}>
                                      {upload.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                    </span>
                                  </div>
                                  
                                  {upload.rejection_reason && (
                                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                      <p className="text-sm font-medium text-red-600 mb-1">Rejection reason:</p>
                                      <p className="text-sm text-red-700">{upload.rejection_reason}</p>
                                    </div>
                                  )}
                                  
                                  <div className="flex gap-2">
                                    <button
                                      className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                                      onClick={() => {
                                        const signedUrl = upload.file_url;
                                        if (signedUrl) {
                                          handleViewDocument({
                                            file_url: signedUrl,
                                            filename: upload.file_url.split('/').pop() || 'transfer_form.pdf'
                                          });
                                        }
                                      }}
                                    >
                                      View
                                    </button>
                                    <button
                                      className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                                      onClick={() => {
                                        const signedUrl = upload.file_url;
                                        if (signedUrl) {
                                          handleDownloadDocument({
                                            file_url: signedUrl,
                                            filename: upload.file_url.split('/').pop() || 'transfer_form.pdf'
                                          });
                                        }
                                      }}
                                    >
                                      Download
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-600 mb-2">No Student Uploads</h3>
                          <p className="text-sm text-slate-500">
                            The student hasn't uploaded any transfer form documents yet.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Lista principal de vendedores e estudantes
  return (
    <div className="min-h-screen">
      {/* Header + Tabs Section */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="max-w-full mx-auto bg-slate-50">
            {/* Header: title + note + counter */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  Student Tracking Dashboard
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600">
                  Monitor and manage students referred by your affiliate sellers.
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  Track student applications, documents, and progress through the scholarship process.
                </p>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="border-t border-slate-200 bg-white">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Student Management
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Comprehensive tracking and management of student applications and progress
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Stats Cards */}
          <StatsCards filteredStudents={adjustedStudents} />

          {/* Filtros Avançados */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
            <AdvancedFilters
              filters={filters}
              onFiltersChange={updateFilters}
              sellers={sellers}
              universities={universities}
              showAdvancedFilters={showAdvancedFilters}
              onToggleAdvancedFilters={toggleAdvancedFilters}
              onResetFilters={resetFilters}
              filteredStudentsCount={adjustedStudents.length}
            />
          </div>

          {/* Lista de vendedores */}
          <SellersList
            filteredSellers={filteredSellers}
            filteredStudents={adjustedStudents}
            expandedSellers={expandedSellers}
            expandedStudents={expandedStudents}
            onToggleSellerExpansion={toggleSellerExpansion}
            onToggleStudentExpansion={toggleStudentExpansion}
            onViewStudentDetails={loadStudentDetails}
          />
        </div>
      </div>
    </div>
  );
};

export default EnhancedStudentTracking;

