import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import SelectionSurveyView from '../../components/AdminDashboard/SelectionSurveyView';
import { DetailsTab } from '../../components/AdminDashboard/StudentDetails/DetailsTab';
import { DocumentsTab } from '../../components/AdminDashboard/StudentDetails/DocumentsTab';
import { StudentDetailsModals } from '../../components/AdminDashboard/StudentDetails/StudentDetailsModals';
import { useSchoolStudentData } from '../../hooks/useSchoolStudentData';
import { useApplicationProgress } from '../../hooks/useApplicationProgress';
import { useSchoolDocumentActions } from '../../hooks/useSchoolDocumentActions';
import { useSchoolAcceptanceLetter } from '../../hooks/useSchoolAcceptanceLetter';
import { UserCircle, Files, ClipboardList, CheckCircle2, ArrowLeft } from 'lucide-react';

const TABS = [
  { id: 'details', label: 'Details', icon: UserCircle },
  { id: 'documents', label: 'Documents', icon: Files },
  { id: 'survey', label: 'Selection Survey', icon: ClipboardList },
];

const StudentDetails: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'documents' | 'survey'>('details');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const acceptanceLetterRef = useRef<HTMLDivElement>(null);
  const transferFormRef = useRef<HTMLDivElement>(null);
  const documentReviewRef = useRef<HTMLDivElement>(null);

  // Data hook
  const data = useSchoolStudentData(applicationId);
  const {
    application, setApplication,
    loading, error,
    allStudentApplications, setAllStudentApplications,
    studentDocs, setStudentDocs,
    documentRequests, setDocumentRequests,
    studentDocuments, setStudentDocuments,
    transferForm, setTransferForm,
    transferFormUploads,
    studentRecord,
    installmentPlans,
    realPaidAmounts, loadingPaidAmounts,
    isChoseAnother,
    latestDocByType,
    fetchApplicationDetails,
    fetchDocumentRequests,
    fetchStudentDocuments,
    fetchTransferForm,
    fetchTransferFormUploads,
    feeConfig: { getFeeAmount, formatFeeAmount, hasOverride },
  } = data;

  const activeTabs = isChoseAnother ? TABS.filter(tab => tab.id !== 'documents') : TABS;

  useEffect(() => {
    if (isChoseAnother && activeTab === 'documents') {
      setActiveTab('details');
    }
  }, [isChoseAnother, activeTab]);

  // URL param handling (scroll-to-section)
  useEffect(() => {
    if (loading || !application) return;
    const tab = searchParams.get('tab') as 'details' | 'documents' | 'survey' | null;
    const section = searchParams.get('section');
    if (!tab && !section) return;

    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }

    if (section) {
      const scrollTimeout = setTimeout(() => {
        const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
          acceptance_letter: acceptanceLetterRef,
          transfer_form: transferFormRef,
          document_review: documentReviewRef,
        };
        const targetRef = refMap[section];
        targetRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);

      setSearchParams({}, { replace: true });
      return () => clearTimeout(scrollTimeout);
    }

    setSearchParams({}, { replace: true });
  }, [loading, application]);

  // Clear acceptance letter file when switching tabs
  useEffect(() => {
    if (activeTab !== 'documents') {
      letterActions.setAcceptanceLetterFile(null);
    }
  }, [activeTab]);

  // Progress hook
  const progress = useApplicationProgress(
    application,
    allStudentApplications,
    setApplication,
    setAllStudentApplications,
    applicationId,
  );

  // Document actions hook
  const docActions = useSchoolDocumentActions({
    application,
    applicationId,
    allStudentApplications,
    studentDocs,
    studentDocuments,
    documentRequests,
    setApplication,
    setAllStudentApplications,
    setStudentDocs,
    setStudentDocuments,
    setDocumentRequests,
    setPreviewUrl,
    latestDocByType,
  });

  // Acceptance letter hook
  const letterActions = useSchoolAcceptanceLetter({
    application,
    applicationId,
    setApplication,
    setPreviewUrl,
    fetchStudentDocuments,
    fetchApplicationDetails,
    fetchDocumentRequests,
    fetchTransferForm,
    fetchTransferFormUploads,
    transferForm,
    setTransferForm,
  });

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E] mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p>Application not found.</p>
      </div>
    );
  }

  if (!application.user_profiles) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-slate-600">Student profile not found</p>
          <p className="text-sm text-slate-500 mt-2">Please check the application data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto">
      {isChoseAnother && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-4 sm:px-6 lg:px-8">
          <div className="max-w-full mx-auto flex items-center gap-3">
            <div className="flex p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="font-medium text-amber-800 text-sm md:text-base leading-snug">
              This application is inactive because the student has chosen to proceed with another university's scholarship. Access to their documents, progress tracking, and payment details is restricted.
            </p>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-slate-200 rounded-t-3xl">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-slate-500 hover:text-slate-700 mb-4 transition-colors group"
              >
                <ArrowLeft className="w-5 h-5 mr-1 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm font-medium">Back to students</span>
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Student Details
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Review and manage {application?.user_profiles?.full_name || 'Student'}'s application details
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {application.status === 'enrolled' || application.acceptance_letter_status === 'approved' ? (
                <div className="flex items-center px-6 py-2.5 rounded-full text-base font-bold bg-green-600 text-white shadow-lg shadow-green-100 ring-4 ring-green-50">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Enrolled
                </div>
              ) : application.status === 'approved' ? (
                <div className="flex items-center px-6 py-2.5 rounded-full text-base font-bold bg-green-600 text-white shadow-lg shadow-green-100 ring-4 ring-green-50">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Application Approved
                </div>
              ) : application.status === 'rejected' ? (
                <div className="flex items-center px-6 py-2.5 rounded-full text-base font-bold bg-red-600 text-white shadow-lg shadow-red-100 ring-4 ring-red-50">
                  <div className="w-2.5 h-2.5 bg-white rounded-full mr-2"></div>
                  Application Rejected
                </div>
              ) : (
                <div className="flex items-center px-6 py-2.5 rounded-full text-base font-bold bg-slate-100 text-slate-700 border border-slate-300">
                  <div className="w-3 h-3 bg-slate-400 rounded-full mr-2 animate-pulse"></div>
                  Pending Review
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-300 rounded-b-3xl">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto" role="tablist">
            {activeTabs.map(tab => (
              <button
                key={tab.id}
                className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
                    ? 'border-[#05294E] text-[#05294E]'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                onClick={() => setActiveTab(tab.id as any)}
                type="button"
                aria-selected={activeTab === tab.id}
                role="tab"
              >
                <tab.icon className={`w-5 h-5 mr-2 transition-colors ${activeTab === tab.id ? 'text-[#05294E]' : 'text-slate-400 group-hover:text-slate-600'
                  }`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'details' && (
          <DetailsTab
            application={application}
            allStudentApplications={allStudentApplications}
            isChoseAnother={isChoseAnother}
            studentRecord={studentRecord}
            steps={progress.steps}
            getStepStatus={progress.getStepStatus}
            getCurrentStep={progress.getCurrentStep}
            isProgressExpanded={progress.isProgressExpanded}
            setIsProgressExpanded={progress.setIsProgressExpanded}
            realPaidAmounts={realPaidAmounts}
            loadingPaidAmounts={loadingPaidAmounts}
            installmentPlans={installmentPlans}
            hasOverride={hasOverride}
            formatFeeAmount={formatFeeAmount}
            getFeeAmount={getFeeAmount}
            expandedAppDocs={docActions.expandedAppDocs}
            setExpandedAppDocs={docActions.setExpandedAppDocs}
            updating={docActions.updating}
            approveDoc={docActions.approveDoc}
            handleViewDocument={docActions.handleViewDocument}
            setPendingRejectType={docActions.setPendingRejectType}
            setPendingRejectDocAppId={docActions.setPendingRejectDocAppId}
            setShowReasonModal={docActions.setShowReasonModal}
            approvingApplication={progress.approvingApplication}
            setPendingApproveAppId={progress.setPendingApproveAppId}
            setShowApproveConfirmModal={progress.setShowApproveConfirmModal}
            setPendingRejectAppId={progress.setPendingRejectAppId}
            setShowRejectStudentModal={docActions.setShowRejectStudentModal}
            documentReviewRef={documentReviewRef}
          />
        )}

        {activeTab === 'survey' && (
          <SelectionSurveyView
            userId={application?.user_profiles?.user_id || ''}
            surveyPassed={application?.user_profiles?.selection_survey_passed}
          />
        )}

        {activeTab === 'documents' && !isChoseAnother && (
          <DocumentsTab
            application={application}
            studentRecord={studentRecord}
            documentRequests={documentRequests}
            expandedRequests={docActions.expandedRequests}
            setExpandedRequests={docActions.setExpandedRequests}
            expandedHistory={docActions.expandedHistory}
            setExpandedHistory={docActions.setExpandedHistory}
            handleViewUpload={docActions.handleViewUpload}
            handleDownloadTemplate={docActions.handleDownloadTemplate}
            handleApproveDocument={docActions.handleApproveDocument}
            approvingDocumentId={docActions.approvingDocumentId}
            rejectingDocumentId={docActions.rejectingDocumentId}
            setPendingRejectDocumentId={docActions.setPendingRejectDocumentId}
            setShowRejectDocumentModal={docActions.setShowRejectDocumentModal}
            setShowNewRequestModal={letterActions.setShowNewRequestModal}
            handleViewDocument={docActions.handleViewDocument}
            handleDownloadDocument={docActions.handleDownloadDocument}
            acceptanceLetterUploaded={letterActions.acceptanceLetterUploaded}
            acceptanceLetterFile={letterActions.acceptanceLetterFile}
            uploadingAcceptanceLetter={letterActions.uploadingAcceptanceLetter}
            isFileSelecting={letterActions.isFileSelecting}
            replacingAcceptanceLetter={letterActions.replacingAcceptanceLetter}
            replaceAcceptanceLetterFile={letterActions.replaceAcceptanceLetterFile}
            setReplaceAcceptanceLetterFile={letterActions.setReplaceAcceptanceLetterFile}
            handleAcceptanceLetterFileSelect={letterActions.handleAcceptanceLetterFileSelect}
            handleProcessAcceptanceLetter={letterActions.handleProcessAcceptanceLetter}
            handleReplaceAcceptanceLetter={letterActions.handleReplaceAcceptanceLetter}
            handleViewAcceptanceLetter={letterActions.handleViewAcceptanceLetter}
            handleDownloadAcceptanceLetter={letterActions.handleDownloadAcceptanceLetter}
            transferForm={transferForm}
            transferFormUploads={transferFormUploads}
            selectedTransferFormFile={letterActions.selectedTransferFormFile}
            setSelectedTransferFormFile={letterActions.setSelectedTransferFormFile}
            uploadingTransferForm={letterActions.uploadingTransferForm}
            handleUploadTransferForm={letterActions.handleUploadTransferForm}
            handleApproveTransferFormUpload={letterActions.handleApproveTransferFormUpload}
            setPreviewUrl={setPreviewUrl}
            fetchApplicationDetails={fetchApplicationDetails}
            acceptanceLetterRef={acceptanceLetterRef}
            transferFormRef={transferFormRef}
          />
        )}
      </div>

      {/* Modals */}
      <StudentDetailsModals
        application={application}
        allStudentApplications={allStudentApplications}
        previewUrl={previewUrl}
        setPreviewUrl={setPreviewUrl}
        showReasonModal={docActions.showReasonModal}
        setShowReasonModal={docActions.setShowReasonModal}
        rejectReason={docActions.rejectReason}
        setRejectReason={docActions.setRejectReason}
        pendingRejectType={docActions.pendingRejectType}
        setPendingRejectType={docActions.setPendingRejectType}
        pendingRejectDocAppId={docActions.pendingRejectDocAppId}
        setPendingRejectDocAppId={docActions.setPendingRejectDocAppId}
        requestChangesDoc={docActions.requestChangesDoc}
        showRejectStudentModal={docActions.showRejectStudentModal}
        setShowRejectStudentModal={docActions.setShowRejectStudentModal}
        rejectStudentReason={docActions.rejectStudentReason}
        setRejectStudentReason={docActions.setRejectStudentReason}
        pendingRejectAppId={progress.pendingRejectAppId}
        setPendingRejectAppId={progress.setPendingRejectAppId}
        rejectStudent={progress.rejectStudent}
        showNewRequestModal={letterActions.showNewRequestModal}
        setShowNewRequestModal={letterActions.setShowNewRequestModal}
        newDocumentRequest={letterActions.newDocumentRequest}
        setNewDocumentRequest={letterActions.setNewDocumentRequest}
        creatingDocumentRequest={letterActions.creatingDocumentRequest}
        handleCreateDocumentRequest={letterActions.handleCreateDocumentRequest}
        showRejectDocumentModal={docActions.showRejectDocumentModal}
        setShowRejectDocumentModal={docActions.setShowRejectDocumentModal}
        rejectDocumentReason={docActions.rejectDocumentReason}
        setRejectDocumentReason={docActions.setRejectDocumentReason}
        pendingRejectDocumentId={docActions.pendingRejectDocumentId}
        setPendingRejectDocumentId={docActions.setPendingRejectDocumentId}
        rejectingDocumentId={docActions.rejectingDocumentId}
        handleRejectDocument={docActions.handleRejectDocument}
        handleRejectTransferFormUpload={letterActions.handleRejectTransferFormUpload}
        transferFormUploads={transferFormUploads}
        showApproveConfirmModal={progress.showApproveConfirmModal}
        setShowApproveConfirmModal={progress.setShowApproveConfirmModal}
        pendingApproveAppId={progress.pendingApproveAppId}
        setPendingApproveAppId={progress.setPendingApproveAppId}
        approvingApplication={progress.approvingApplication}
        handleApproveApplication={progress.handleApproveApplication}
      />
    </div>
  );
};

export default StudentDetails;
