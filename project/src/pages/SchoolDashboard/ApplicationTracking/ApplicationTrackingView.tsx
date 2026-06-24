import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUniversity } from '../../../context/UniversityContext';
import { useStudentUnreadMessages } from '../../../hooks/useStudentUnreadMessages';
import { useGlobalStudentUnread } from '../../../hooks/useGlobalStudentUnread';
import SchoolApplicationKanbanView from './SchoolApplicationKanbanView';
import SchoolApplicationTableView from './SchoolApplicationTableView';
import { StudentRecord } from '../../../components/AdminDashboard/hooks/useStudentApplicationsQueries';
import ProfileCompletionGuard from '../../../components/ProfileCompletionGuard';
import { Search, LayoutGrid, Table, GraduationCap } from 'lucide-react';
import { Scholarship } from '../../../types';

const HIDDEN_SCHOLARSHIPS = ['Current Students Scholarship'];

const SchoolApplicationTrackingView: React.FC = () => {
  const { applications, university, refreshData } = useUniversity();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScholarship, setSelectedScholarship] = useState<string>(
    searchParams.get('scholarship') || ''
  );
  const [selectedProcessType, setSelectedProcessType] = useState<string>('');
  const [showCurrentStudents, setShowCurrentStudents] = useState(false);
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

  // Map Context Applications to StudentRecord format, grouped by student
  const studentRecords: StudentRecord[] = useMemo(() => {
    // Group applications by student_id
    const studentMap = new Map<string, { student: any; apps: any[] }>();

    applications.forEach((app: any) => {
      const student = app.user_profiles || {};
      const studentId = student.id;
      if (!studentId) return;

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, { student, apps: [] });
      }
      studentMap.get(studentId)!.apps.push(app);
    });

    const groupedRecords: StudentRecord[] = [];

    studentMap.forEach(({ student, apps }) => {
      // Pick the "main" application (same priority as admin dashboard)
      const mainApp =
        apps.find((a: any) => a.status === 'enrolled') ||
        apps.find((a: any) => a.is_application_fee_paid && a.acceptance_letter_url) ||
        apps.find((a: any) => a.is_application_fee_paid) ||
        apps.find((a: any) => a.status === 'approved') ||
        apps.find((a: any) => a.status === 'under_review') ||
        apps.find((a: any) => a.status !== 'rejected') ||
        apps[0];

      const scholarship = mainApp.scholarships || {};
      const status = mainApp.status;

      const universityDocs = Array.isArray(mainApp.documents) ? mainApp.documents : [];
      const docsUploaded = universityDocs.length;

      const getMostRecentActivity = () => {
        const dates: Date[] = [];
        if (student.updated_at) dates.push(new Date(student.updated_at));
        apps.forEach((a: any) => {
          if (a.updated_at) dates.push(new Date(a.updated_at));
          if (a.created_at) dates.push(new Date(a.created_at));
        });
        return dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date(mainApp.created_at || Date.now());
      };
      const mostRecentActivity = getMostRecentActivity();

      // Aggregate doc stats across all applications
      const docStats = apps.reduce((acc: any, a: any) => {
        const s = a.university_document_stats;
        if (!s) return acc;
        return {
          required: acc.required + (s.required || 0),
          uploaded: acc.uploaded + (s.uploaded || 0),
          approved: acc.approved + (s.approved || 0),
          rejected: acc.rejected + (s.rejected || 0),
          under_review: acc.under_review + (s.under_review || 0),
        };
      }, { required: 0, uploaded: 0, approved: 0, rejected: 0, under_review: 0 });

      const isDropped = apps.every((a: any) => a.status === 'rejected' || a.status === 'dropped') || student.is_dropped === true;

      groupedRecords.push({
        student_id: student.id,
        user_id: student.user_id,
        student_name: student.full_name || student.name || 'Unknown',
        student_email: student.email || '',
        student_created_at: mainApp.created_at,
        has_paid_selection_process_fee: student.is_selection_process_fee_paid || false,
        has_paid_i20_control_fee: student.has_paid_i20_control_fee || false,
        selected_scholarship_id: student.selected_scholarship_id || null,
        selected_application_id: student.selected_application_id || null,
        seller_referral_code: null,

        application_id: mainApp.id,
        scholarship_id: mainApp.scholarship_id,
        university_id: university?.id || scholarship.university_id || null,
        status: status,
        application_status: status,
        applied_at: mainApp.created_at,
        is_application_fee_paid: mainApp.is_application_fee_paid || student.is_application_fee_paid || false,
        is_placement_fee_paid: student.is_placement_fee_paid === true || mainApp.is_placement_fee_paid === true || false,
        placement_fee_flow: student.placement_fee_flow === true || mainApp.is_placement_fee_paid === true || scholarship.placement_fee_flow === true,
        is_scholarship_fee_paid: mainApp.is_scholarship_fee_paid || student.is_scholarship_fee_paid || false,
        acceptance_letter_status: mainApp.acceptance_letter_status || null,
        acceptance_letter_url: mainApp.acceptance_letter_url || null,
        payment_status: null,
        student_process_type: mainApp.student_process_type || student.student_process_type || 'initial',
        transfer_form_status: mainApp.transfer_form_status || null,
        scholarship_title: scholarship.title || 'Unknown',
        course_name: null,
        university_name: university?.name || null,
        reviewed_at: null,
        reviewed_by: null,

        is_locked: false,
        total_applications: apps.length,
        all_applications: apps,
        is_archived: false,
        is_dropped: isDropped,
        assigned_to_admin_id: null,
        assigned_to_admin_name: null,
        placement_fee_pending_balance: student.placement_fee_pending_balance || 0,
        placement_fee_due_date: student.placement_fee_due_date || null,
        placement_fee_installment_number: student.placement_fee_installment_number || 0,
        placement_fee_installment_enabled: student.placement_fee_installment_enabled || false,

        docs_total_required: docStats.required,
        docs_total_uploaded: docStats.uploaded,
        docs_total_approved: docStats.approved,
        docs_total_rejected: docStats.rejected,
        docs_total_under_review: docStats.under_review,

        has_sent_docs_to_university: mainApp.has_sent_docs_to_university || false,
        sevis_transfer_completed: mainApp.sevis_transfer_completed || false,
        visa_approved: mainApp.visa_approved || false,
        documents_uploaded: docsUploaded > 0,
        source: student.source || mainApp.source || null,

        visa_transfer_active: student.visa_transfer_active,
        has_paid_reinstatement_package: student.has_paid_reinstatement_package || false,
        has_paid_ds160_package: student.has_paid_ds160_package || false,
        has_paid_i539_cos_package: student.has_paid_i539_cos_package || false,
        most_recent_activity: mostRecentActivity,
      } as StudentRecord);
    });

    groupedRecords.sort((a: any, b: any) => {
      const dateA = a.most_recent_activity || new Date(a.student_created_at);
      const dateB = b.most_recent_activity || new Date(b.student_created_at);
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return groupedRecords;
  }, [applications, university]);

  // Apply filters
  const filteredStudents = useMemo(() => {
    let filtered = studentRecords;

    if (!showCurrentStudents) {
      filtered = filtered.filter((s) => !s.scholarship_title || !HIDDEN_SCHOLARSHIPS.includes(s.scholarship_title));
    }

    if (selectedScholarship) {
      filtered = filtered.filter((s) => s.scholarship_id === selectedScholarship);
    }

    if (selectedProcessType) {
      filtered = filtered.filter((s) => s.student_process_type === selectedProcessType);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((s) =>
        s.student_name.toLowerCase().includes(term) ||
        s.student_email.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [studentRecords, selectedScholarship, selectedProcessType, searchTerm, showCurrentStudents]);

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

                <select
                  value={selectedProcessType}
                  onChange={(e) => setSelectedProcessType(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] bg-white"
                >
                  <option value="">All Process Types</option>
                  <option value="initial">Initial (F-1)</option>
                  <option value="transfer">Transfer</option>
                  <option value="change_of_status">Change of Status</option>
                  <option value="reinstatement">Reinstatement</option>
                </select>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showCurrentStudents"
                    checked={showCurrentStudents}
                    onChange={(e) => setShowCurrentStudents(e.target.checked)}
                    className="h-4 w-4 text-[#05294E] focus:ring-[#05294E] border-gray-300 rounded"
                  />
                  <label htmlFor="showCurrentStudents" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <GraduationCap className="h-4 w-4 text-blue-600" />
                    <span>Show Current Students Scholarship</span>
                  </label>
                </div>
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
