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

function EnhancedStudentTracking(props) {
  const { userId } = props || {};
  const { user } = useAuth();
  const [expandedSellers, setExpandedSellers] = useState(new Set());
  const [activeTab, setActiveTab] = useState('details');

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

  // Obter dados filtrados e ordenados
  const { filteredSellers, filteredStudents } = getFilteredAndSortedData(sellers, students, filters);

  // Carregar defaults de taxas (sem userId) para usar quando não houver override
  const { feeConfig } = useFeeConfig();

  // Map de overrides por student_id
  const [overridesMap, setOverridesMap] = useState({});
  // Map de dependentes por profile_id
  const [dependentsMap, setDependentsMap] = useState({});

  // Buscar overrides para os estudantes atualmente filtrados
  useEffect(() => {
    const loadOverrides = async () => {
      try {
        const uniqueIds = Array.from(new Set((filteredStudents || []).map((s) => s.id).filter(Boolean)));
        if (uniqueIds.length === 0) {
          setOverridesMap({});
          return;
        }

        const results = await Promise.allSettled(
          uniqueIds.map(async (userId) => {
            const { data, error } = await supabase.rpc('get_user_fee_overrides', { user_id_param: userId });
            return { userId, data: error ? null : data };
          })
        );

        const map = {};
        results.forEach((res) => {
          if (res.status === 'fulfilled') {
            const v = res.value;
            const userId = v.userId;
            const data = v.data;
            if (data) {
              map[userId] = {
                selection_process_fee: data.selection_process_fee != null ? Number(data.selection_process_fee) : undefined,
                application_fee: data.application_fee != null ? Number(data.application_fee) : undefined,
                scholarship_fee: data.scholarship_fee != null ? Number(data.scholarship_fee) : undefined,
                i20_control_fee: data.i20_control_fee != null ? Number(data.i20_control_fee) : undefined
              };
            }
          }
        });

        setOverridesMap(map);
      } catch (e) {
        setOverridesMap({});
      }
    };
    loadOverrides();
  }, [filteredStudents]);

  // Buscar dependentes para os estudantes filtrados (via profile_id)
  useEffect(() => {
    const loadDependents = async () => {
      try {
        const profileIds = Array.from(new Set((filteredStudents || []).map((s) => s.profile_id).filter(Boolean)));
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
  }, [filteredStudents]);

  // Calcular receita ajustada por estudante usando overrides quando existirem
  const adjustedStudents = useMemo(() => {
    return (filteredStudents || []).map((s) => {
      const o = overridesMap[s.id] || {};
      const dependents = Number(dependentsMap[s.profile_id]) || 0;
      const selectionAmount = o.selection_process_fee ?? feeConfig.selection_process_fee;
      const scholarshipAmount = o.scholarship_fee ?? feeConfig.scholarship_fee_default;
      const i20Amount = o.i20_control_fee ?? feeConfig.i20_control_fee;

      let total = 0;
      if (s.has_paid_selection_process_fee) {
        // Se houver override para selection, usar exatamente o override;
        // caso contrário, somar +150 por dependente
        const sel = o.selection_process_fee != null
          ? Number(selectionAmount)
          : Number(selectionAmount) + (dependents * 150);
        total += sel || 0;
      }
      // Application fee NÃO entra no somatório de receita deste dashboard
      if (s.is_scholarship_fee_paid) total += Number(scholarshipAmount) || 0;
      if (s.has_paid_i20_control_fee) total += Number(i20Amount) || 0;

      return { ...s, total_paid_adjusted: total };
    });
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
              i20ControlFeeDeadline={i20ControlFeeDeadline}
              onBack={backToList}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onViewDocument={handleViewDocument}
              onDownloadDocument={handleDownloadDocument}
            />
          )}
          
          {activeTab === 'documents' && (
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
                />
              </div>
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
            onToggleSellerExpansion={toggleSellerExpansion}
            onViewStudentDetails={loadStudentDetails}
          />
        </div>
      </div>
    </div>
  );
};

export default EnhancedStudentTracking;
