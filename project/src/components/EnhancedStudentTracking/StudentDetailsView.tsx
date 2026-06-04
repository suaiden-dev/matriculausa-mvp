import React, { useState, useEffect } from 'react';
import { User, FileText } from 'lucide-react';
import { StudentInfo } from './types';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { supabase } from '../../lib/supabase';

// New Sub-components
import PersonalInfoSection from '../../pages/AffiliateAdminDashboard/components/StudentTracking/PersonalInfoSection';
import AcademicProfileSection from '../../pages/AffiliateAdminDashboard/components/StudentTracking/AcademicProfileSection';
import ApplicationStatusSection from '../../pages/AffiliateAdminDashboard/components/StudentTracking/ApplicationStatusSection';
import ScholarshipDetailsSection from '../../pages/AffiliateAdminDashboard/components/StudentTracking/ScholarshipDetailsSection';
import DocumentsListSection from '../../pages/AffiliateAdminDashboard/components/StudentTracking/DocumentsListSection';
import SummarySidebar from '../../pages/AffiliateAdminDashboard/components/StudentTracking/SummarySidebar';
import PackageManagementSection from '../../pages/AffiliateAdminDashboard/components/StudentTracking/PackageManagementSection';
import FeeStatusSection from '../../pages/AffiliateAdminDashboard/components/StudentTracking/FeeStatusSection';

export interface StudentDetailsViewProps {
  studentDetails: StudentInfo;
  studentDocuments: any[];
  scholarshipApplication?: any;
  i20ControlFeeDeadline: Date | null;
  onBack: () => void;
  activeTab: 'details' | 'documents';
  onTabChange: (tab: 'details' | 'documents') => void;
  onViewDocument: (doc: any) => void;
  onDownloadDocument: (doc: any) => void;
  realPaidAmounts?: { selection_process?: number; scholarship?: number; i20_control?: number };
}

const StudentDetailsView: React.FC<StudentDetailsViewProps> = ({
  studentDetails,
  studentDocuments,
  scholarshipApplication,
  activeTab,
  onTabChange,
  onViewDocument,
  onDownloadDocument,
}) => {
  // Hook para configurações dinâmicas de taxas
  const { formatFeeAmount } = useFeeConfig(studentDetails?.student_id);

  // Estado para armazenar as taxas do pacote do estudante
  const [studentPackageFees, setStudentPackageFees] = useState<any>(null);
  const [studentDependents, setStudentDependents] = useState<number>(0);

  // Estados para edição de pacote
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isUpdatingPackage, setIsUpdatingPackage] = useState(false);

  // Sincronizar dependentes
  useEffect(() => {
    if (studentDetails?.dependents !== undefined) {
      setStudentDependents(studentDetails.dependents);
    }
  }, [studentDetails?.dependents]);

  // Função para buscar o desired_scholarship_range do estudante
  const loadStudentPackageFees = async (profileId: string) => {
    if (!profileId) return;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('desired_scholarship_range, dependents')
        .eq('id', profileId)
        .single();

      if (profileError || !profileData.desired_scholarship_range) {
        setStudentPackageFees(null);
        return;
      }

      setStudentDependents(Number(profileData.dependents) || 0);

      const dependents = Number(profileData.dependents) || 0;
      const systemType = (studentDetails as any)?.system_type || 'legacy';
      const isSimplified = systemType === 'simplified';

      const baseSelectionFee = isSimplified ? 350 : 400;
      const selectionProcessFee = isSimplified ? baseSelectionFee : baseSelectionFee + (dependents * 150);
      const desiredRange = Number(profileData.desired_scholarship_range);
      const scholarshipFee = isSimplified ? 550 : 900;
      const i20ControlFee = 900;

      setStudentPackageFees({
        id: `range-${desiredRange}`,
        selection_process_fee: selectionProcessFee,
        i20_control_fee: i20ControlFee,
        scholarship_fee: scholarshipFee,
        total_paid: selectionProcessFee + i20ControlFee + scholarshipFee,
        scholarship_amount: desiredRange,
        package_name: `Scholarship Range $${desiredRange}+`,
        dependents: dependents
      });
    } catch (error) {
      console.error('Error loading student package fees:', error);
      setStudentPackageFees(null);
    }
  };

  useEffect(() => {
    if (studentDetails?.profile_id) {
      loadStudentPackageFees(studentDetails.profile_id);
    }
  }, [studentDetails?.profile_id]);

  const handleStartEditPackage = () => {
    setIsEditingPackage(true);
    setSelectedPackageId(studentPackageFees?.id || null);
  };

  const handleCancelEditPackage = () => {
    setIsEditingPackage(false);
    setSelectedPackageId(studentPackageFees?.id || null);
  };

  const handleSavePackageChange = async () => {
    if (!selectedPackageId || !studentDetails?.profile_id) return;
    setIsUpdatingPackage(true);
    try {
      const rangeValue = selectedPackageId.replace('range-', '');
      const { error } = await supabase
        .from('user_profiles')
        .update({ desired_scholarship_range: Number(rangeValue) })
        .eq('id', studentDetails.profile_id);

      if (error) throw error;
      await loadStudentPackageFees(studentDetails.profile_id);
      setIsEditingPackage(false);
    } catch (error) {
      console.error('Error updating package:', error);
    } finally {
      setIsUpdatingPackage(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'details' ? (
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
                    <PersonalInfoSection
                      fullName={studentDetails.full_name}
                      email={studentDetails.email}
                      phone={studentDetails.phone}
                      country={studentDetails.country}
                    />
                    <AcademicProfileSection
                      fieldOfInterest={studentDetails.field_of_interest}
                      academicLevel={studentDetails.academic_level}
                      gpa={studentDetails.gpa}
                      englishProficiency={studentDetails.english_proficiency}
                    />
                    <ApplicationStatusSection
                      studentProcessType={studentDetails.student_process_type}
                      isApplicationFeePaid={studentDetails.is_application_fee_paid}
                      documentsStatus={studentDetails.documents_status}
                      acceptanceLetterStatus={(studentDetails as any)?.acceptance_letter_status}
                      applicationStatus={(studentDetails as any)?.application_status}
                      studentDocuments={studentDocuments}
                    />
                  </div>
                </div>
              </div>

              <ScholarshipDetailsSection
                scholarshipTitle={studentDetails.scholarship_title}
                universityName={studentDetails.university_name}
                applicationStatus={studentDetails.application_status}
              />

              <DocumentsListSection
                studentDocuments={studentDocuments}
                onViewDocument={onViewDocument}
                onDownloadDocument={onDownloadDocument}
              />
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-4 space-y-4">
              <SummarySidebar
                registrationDate={studentDetails.registration_date}
                onTabChange={onTabChange}
              />

              <PackageManagementSection
                isEditingPackage={isEditingPackage}
                selectedPackageId={selectedPackageId}
                isUpdatingPackage={isUpdatingPackage}
                studentPackageFees={studentPackageFees}
                onStartEdit={handleStartEditPackage}
                onCancelEdit={handleCancelEditPackage}
                onSaveChange={handleSavePackageChange}
                onSelectPackage={setSelectedPackageId}
              />

              <FeeStatusSection
                hasPaidSelectionProcessFee={studentDetails.has_paid_selection_process_fee}
                isScholarshipFeePaid={studentDetails.is_scholarship_fee_paid}
                hasPaidI20ControlFee={studentDetails.has_paid_i20_control_fee}
                isApplicationFeePaid={studentDetails.is_application_fee_paid}
                scholarshipFeeAmount={studentPackageFees?.scholarship_fee}
                i20ControlFeeAmount={studentPackageFees?.i20_control_fee}
                selectionProcessFeeAmount={studentPackageFees?.selection_process_fee}
                applicationFeeAmount={studentPackageFees?.application_fee}
                systemType={(studentDetails as any)?.system_type}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <DocumentsListSection
              studentDocuments={studentDocuments}
              onViewDocument={onViewDocument}
              onDownloadDocument={onDownloadDocument}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetailsView;
