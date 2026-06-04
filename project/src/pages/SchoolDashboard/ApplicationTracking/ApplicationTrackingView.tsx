import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUniversity } from '../../../context/UniversityContext';
import { useStudentUnreadMessages } from '../../../hooks/useStudentUnreadMessages';
import { useGlobalStudentUnread } from '../../../hooks/useGlobalStudentUnread';
import SchoolApplicationKanbanView from './SchoolApplicationKanbanView';
import SchoolApplicationTableView from './SchoolApplicationTableView';
import { StudentRecord } from '../../../components/AdminDashboard/hooks/useStudentApplicationsQueries';
import ProfileCompletionGuard from '../../../components/ProfileCompletionGuard';
import { Search, LayoutGrid, Table } from 'lucide-react';
import { Scholarship } from '../../../types';

const SchoolApplicationTrackingView: React.FC = () => {
  const { applications, university, refreshData } = useUniversity();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScholarship, setSelectedScholarship] = useState<string>(
    searchParams.get('scholarship') || ''
  );
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>(() => {
    const urlView = searchParams.get('view') as 'kanban' | 'table' | null;
    if (urlView === 'kanban' || urlView === 'table') {
      localStorage.setItem('school_application_tracking_view_mode', urlView);
      return urlView;
    }
    const saved = localStorage.getItem('school_application_tracking_view_mode') as 'kanban' | 'table' | null;
    if (saved === 'kanban' || saved === 'table') return saved;
    return 'kanban';
  });

  const handleViewModeChange = (mode: 'kanban' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('school_application_tracking_view_mode', mode);
  };

  // Extract unique scholarships
  const scholarships: Scholarship[] = Array.from(
    applications
      .map((app) => app.scholarships)
      .filter((s): s is Scholarship => !!s)
      .reduce((map, scholarship) => {
        if (!map.has(scholarship.id)) map.set(scholarship.id, scholarship);
        return map;
      }, new Map<string, Scholarship>())
      .values()
  );

  // Map Context Applications to StudentRecord format
  const studentRecords: StudentRecord[] = useMemo(() => {
    const mappedRecords = applications.map((app: any) => {
      const student = app.user_profiles || {};
      const scholarship = app.scholarships || {};
      const status = app.status; // scholarship_applications status

      // For University View, we show ALL documents in the application
      const universityDocs = Array.isArray(app.documents) ? app.documents : [];
      const docsUploaded = universityDocs.length;

      const getMostRecentActivity = () => {
        const dates = [];
        if (student.updated_at) dates.push(new Date(student.updated_at));
        if (app.updated_at) dates.push(new Date(app.updated_at));
        if (app.created_at) dates.push(new Date(app.created_at));
        return dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date(app.created_at || Date.now());
      };
      const mostRecentActivity = getMostRecentActivity();

      return {
        student_id: student.id, // Student profile primary key id
        user_id: student.user_id,
        student_name: student.full_name || student.name || 'Unknown',
        student_email: student.email || '',
        student_created_at: app.created_at,
        has_paid_selection_process_fee: student.is_selection_process_fee_paid || false,
        has_paid_i20_control_fee: student.has_paid_i20_control_fee || false,
        selected_scholarship_id: student.selected_scholarship_id || null,
        selected_application_id: student.selected_application_id || null,
        seller_referral_code: null,

        application_id: app.id,
        scholarship_id: app.scholarship_id,
        university_id: university?.id || scholarship.university_id || null,
        status: status,
        application_status: status, // Keeping it simple, matching DB
        applied_at: app.created_at,
        is_application_fee_paid: app.is_application_fee_paid || student.is_application_fee_paid || false,
        is_placement_fee_paid: student.is_placement_fee_paid === true || app.is_placement_fee_paid === true || false,
        placement_fee_flow: student.placement_fee_flow === true || app.is_placement_fee_paid === true || scholarship.placement_fee_flow === true,
        is_scholarship_fee_paid: app.is_scholarship_fee_paid || student.is_scholarship_fee_paid || false,
        acceptance_letter_status: app.acceptance_letter_status || null,
        acceptance_letter_url: app.acceptance_letter_url || null,
        payment_status: null,
        student_process_type: app.student_process_type || student.student_process_type || 'initial',
        transfer_form_status: app.transfer_form_status || null,
        scholarship_title: scholarship.title || 'Unknown',
        course_name: null,
        university_name: university?.name || null,
        reviewed_at: null,
        reviewed_by: null,

        is_locked: false,
        total_applications: 1, 
        all_applications: [app],
        is_archived: false,
        is_dropped: status === 'rejected' || status === 'dropped' || student.is_dropped === true,
        assigned_to_admin_id: null,
        assigned_to_admin_name: null,
        placement_fee_pending_balance: student.placement_fee_pending_balance || 0,
        placement_fee_due_date: student.placement_fee_due_date || null,
        placement_fee_installment_number: student.placement_fee_installment_number || 0,
        placement_fee_installment_enabled: student.placement_fee_installment_enabled || false,

        // Doc aggregation - University Specific Docs only (new document_requests system)
        // Basic docs (passport, diploma) are managed by admin in the 'review' stage
        // and should not affect the school's docs_approval column logic
        docs_total_required: app.university_document_stats?.required || 0,
        docs_total_uploaded: app.university_document_stats?.uploaded || 0,
        docs_total_approved: app.university_document_stats?.approved || 0,
        docs_total_rejected: app.university_document_stats?.rejected || 0,
        docs_total_under_review: app.university_document_stats?.under_review || 0,

        has_sent_docs_to_university: app.has_sent_docs_to_university || false,
        sevis_transfer_completed: app.sevis_transfer_completed || false,
        visa_approved: app.visa_approved || false,
        documents_uploaded: docsUploaded > 0,
        source: student.source || app.source || null,

        // Novos campos para suportar etapas de visto e reintegração
        visa_transfer_active: student.visa_transfer_active,
        has_paid_reinstatement_package: student.has_paid_reinstatement_package || false,
        has_paid_ds160_package: student.has_paid_ds160_package || false,
        has_paid_i539_cos_package: student.has_paid_i539_cos_package || false,
        most_recent_activity: mostRecentActivity,
      } as StudentRecord;
    });

    mappedRecords.sort((a: any, b: any) => {
      const dateA = a.most_recent_activity || new Date(a.student_created_at);
      const dateB = b.most_recent_activity || new Date(b.student_created_at);
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return mappedRecords;
  }, [applications, university]);

  // Apply filters
  const filteredStudents = useMemo(() => {
    let filtered = studentRecords;

    if (selectedScholarship) {
      filtered = filtered.filter((s) => s.scholarship_id === selectedScholarship);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((s) =>
        s.student_name.toLowerCase().includes(term) ||
        s.student_email.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [studentRecords, selectedScholarship, searchTerm]);

  // Unread messages
  const { getUnreadCount } = useStudentUnreadMessages();
  const { getUnreadCount: getGlobalUnreadCount } = useGlobalStudentUnread();

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Complete your profile to track applications"
      description="Finish setting up your university profile to view the application pipeline"
    >
      <div className="min-h-screen bg-slate-50 flex flex-col h-full">
        {/* Header & Filters */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="w-full px-2 sm:px-4 py-4 sm:py-6">
            <div className="flex flex-col gap-4 sm:gap-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-center gap-4 text-center sm:text-left">
                <div className="flex flex-col items-center sm:items-start">
                  <h2 className="text-2xl font-bold text-slate-900">Application Tracking</h2>
                  <p className="text-slate-600">Monitor student applications through all stages of the process</p>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center bg-slate-100 rounded-lg p-1">
                    <button
                      onClick={() => handleViewModeChange('kanban')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'kanban'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      Kanban
                    </button>
                    <button
                      onClick={() => handleViewModeChange('table')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'table'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Table className="w-4 h-4" />
                      Table
                    </button>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]"
                  />
                </div>
                
                <select
                  value={selectedScholarship}
                  onChange={(e) => setSelectedScholarship(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] bg-white"
                >
                  <option value="">All Scholarships</option>
                  {scholarships.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>
        </div>

        {/* Board/Table Area */}
        <div className="flex-1 overflow-hidden py-4 px-0 w-full">
          {viewMode === 'kanban' ? (
            <SchoolApplicationKanbanView 
              students={filteredStudents}
              getUnreadCount={getUnreadCount}
              getGlobalUnreadCount={getGlobalUnreadCount}
              onRefresh={refreshData}
            />
          ) : (
            <SchoolApplicationTableView
              students={filteredStudents}
              getUnreadCount={getUnreadCount}
              getGlobalUnreadCount={getGlobalUnreadCount}
            />
          )}
        </div>

      </div>
    </ProfileCompletionGuard>
  );
};

export default SchoolApplicationTrackingView;
