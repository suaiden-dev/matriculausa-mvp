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
              <div className="flex items-center space-x-4">
                <button
                  onClick={backToList}
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100"
                >
                  <span className="text-sm md:text-base">← Back to list</span>
                </button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    Student Application
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
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
            <nav className="flex space-x-8 overflow-x-auto" role="tablist">
              {[
                { id: 'details', label: 'Details', icon: '👤' },
                { id: 'documents', label: 'Documents', icon: '📄' }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'border-[#05294E] text-[#05294E]' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                  onClick={() => setActiveTab(tab.id as 'details' | 'documents')}
                  type="button"
                  aria-selected={activeTab === tab.id}
                  role="tab"
                >
                  {tab.label}
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
            <DocumentsView
              studentDocuments={studentDocuments}
              documentRequests={documentRequests}
              scholarshipApplication={scholarshipApplication}
              studentId={selectedStudent}
              onViewDocument={handleViewDocument}
              onDownloadDocument={handleDownloadDocument}
            />
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Student Tracking Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Monitor and manage students referred by your affiliate sellers
              </p>
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
