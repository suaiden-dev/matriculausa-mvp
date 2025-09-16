import React, { useState } from 'react';
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

const EnhancedStudentTracking: React.FC<{ userId?: string }> = ({ userId }) => {
  const [expandedSellers, setExpandedSellers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');

  // Hooks personalizados
  const { sellers, students, universities, loading } = useStudentData(userId);
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

  // Toggle expandir vendedor
  const toggleSellerExpansion = (sellerId: string) => {
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
      <div className="min-h-screen bg-slate-50">
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
                  onClick={() => setActiveTab(tab.id as 'details' | 'documents')}
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
              scholarshipApplication={scholarshipApplication}
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
    <div className="min-h-screen bg-slate-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-slate-200 rounded-t-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-4 min-w-0 w-full">
              <div className="min-w-0 w-full">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight break-words">
                  Student Tracking Dashboard
                </h1>
                <p className="mt-1 text-sm text-slate-600 break-words">
                  Monitor and manage students referred by your affiliate sellers
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Stats Cards */}
          <StatsCards filteredStudents={filteredStudents} />

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
              filteredStudentsCount={filteredStudents.length}
            />
          </div>

          {/* Lista de vendedores */}
          <SellersList
            filteredSellers={filteredSellers}
            filteredStudents={filteredStudents}
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
