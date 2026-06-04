import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import KanbanColumn from '../../../components/AdminDashboard/KanbanColumn';
import {
  APPLICATION_FLOW_STAGES,
  ApplicationFlowStageKey
} from '../../../utils/applicationFlowStages';
import { getSchoolStepStatus } from '../../../utils/schoolApplicationFlowStages';
import { StudentRecord } from '../../../components/AdminDashboard/hooks/useStudentApplicationsQueries';
import { UserX, RefreshCw } from 'lucide-react';

interface SchoolApplicationKanbanViewProps {
  students: StudentRecord[];
  getUnreadCount: (studentId: string) => number;
  getGlobalUnreadCount: (studentId: string) => number;
  onRefresh: () => Promise<void>;
}

const SchoolApplicationKanbanView: React.FC<SchoolApplicationKanbanViewProps> = ({
  students,
  getUnreadCount,
  getGlobalUnreadCount,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasRestoredScroll = useRef(false);

  // Restaurar posição do scroll horizontal
  useEffect(() => {
    if (students.length > 0 && !hasRestoredScroll.current && scrollContainerRef.current) {
      const savedScroll = sessionStorage.getItem('kanban_scroll_position');
      if (savedScroll) {
        const timer = setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = parseInt(savedScroll, 10);
            hasRestoredScroll.current = true;
          }
        }, 100);
        return () => clearTimeout(timer);
      } else {
        hasRestoredScroll.current = true;
      }
    }
  }, [students]);

  // Salvar posição do scroll ao rolar horizontalmente
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    sessionStorage.setItem('kanban_scroll_position', e.currentTarget.scrollLeft.toString());
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };


  // Função centralizada para pegar unread counts
  const getStudentTotalUnread = (studentId: string) => {
    return getUnreadCount(studentId) + getGlobalUnreadCount(studentId);
  };

  // Separar dropped dos demais
  const droppedStudents = useMemo(() => {
    return students.filter(s => {
      const selectedAppId = (s as any).selected_application_id;
      const choseAnother = !!selectedAppId && selectedAppId !== s.application_id;
      return s.is_dropped || s.status === 'rejected' || choseAnother;
    });
  }, [students]);

  // Filtramos apenas os alunos ativos no pipeline da faculdade
  const displayStudents = useMemo(() => {
    return students.filter(s => {
      const selectedAppId = (s as any).selected_application_id;
      const choseAnother = !!selectedAppId && selectedAppId !== s.application_id;
      return !s.is_dropped && s.status !== 'rejected' && !choseAnother;
    });
  }, [students]);

  // Filter out stages that should be hidden or are not relevant
  // For university view, we only show specific stages based on user request:
  // - review (Scholarship Eligibility)
  // - application_fee (Awaiting Application Fee)
  // - placement_fee (Awaiting Placement Fee)
  // - reinstatement_fee (Awaiting Reinstatement Fee)
  // - docs_approval (Document Approval)
  // - send_acceptance_letter (Send Acceptance Letter to Student)
  // - student_sends_letter (Transfer Form)
  // - sevis_transfer (Awaiting SEVIS Transfer)
  // - receive_acceptance_letter (Receive Acceptance Letter)
  // - visa_approval (Awaiting Visa Approval)
  // - enrollment (Admitted Enrollment)
  const allowedStageKeys = [
    'review',
    'application_fee',
    'placement_fee',
    'reinstatement_fee',
    'docs_approval',
    'send_acceptance_letter',
    'i20_fee',
    'student_sends_letter',
    'sevis_transfer',
    'visa_approval',
    'enrollment'
  ];

  const visibleStages = useMemo(() => {
    return APPLICATION_FLOW_STAGES.filter(stage =>
      allowedStageKeys.includes(stage.key)
    ).map(stage => {
      if (stage.key === 'docs_approval') {
        return {
          ...stage,
          label: 'Global Document Approval'
        };
      }
      return stage;
    });
  }, []);

  // Organize students by their current stage (first non-completed visible stage)
  const studentsByStage = useMemo(() => {
    const stageMap = new Map<ApplicationFlowStageKey, StudentRecord[]>();

    // Initialize only visible stages
    visibleStages.forEach(stage => {
      stageMap.set(stage.key, []);
    });

    displayStudents.forEach(student => {
      let placed = false;

      // School kanban gate: once approved, a student only advances past 'review'
      // if they explicitly confirmed intent to proceed with THIS specific application.
      // Signal: selected_application_id on user_profiles matches this application's id (app.id).
      // Without this gate, all approved students (even those considering other universities) would
      // incorrectly appear in 'Awaiting Application Fee'.
      const thisApplicationId = student.application_id;
      const selectedApplicationId = (student as any).selected_application_id as string | null;
      const studentSelectedThisApplication =
        !!selectedApplicationId &&
        selectedApplicationId === thisApplicationId;
      const studentCommitted = student.is_application_fee_paid || studentSelectedThisApplication;

      if (
        student.application_status === 'approved' &&
        !studentCommitted &&
        stageMap.has('review')
      ) {
        stageMap.get('review')!.push(student);
        return;
      }

      // Find first visible non-completed stage (current stage)
      for (const stageDef of visibleStages) {
        // Skip transfer_form if not transfer student
        if (stageDef.requiresTransfer && student.student_process_type !== 'transfer') {
          continue;
        }
        // Skip process-type-specific stages
        if (stageDef.requiresProcessType && student.student_process_type !== stageDef.requiresProcessType) {
          continue;
        }

        const stepStatus = getSchoolStepStatus(student, stageDef.key);

        if (stepStatus === 'skipped') {
          continue;
        }

        if (stepStatus !== 'completed') {
          stageMap.get(stageDef.key)!.push(student);
          placed = true;
          break;
        }
      }

      // All stages completed → enrollment
      if (!placed && stageMap.has('enrollment')) {
        stageMap.get('enrollment')!.push(student);
      }
    });

    return stageMap;
  }, [displayStudents, visibleStages]);

  const lastLoggedRef = useRef<string>('');

  useEffect(() => {
    if (students.length === 0) return;

    const debugInfo: any[] = [];

    // Track normal stages
    visibleStages.forEach(stage => {
      const stageStudents = studentsByStage.get(stage.key) || [];
      stageStudents.forEach((student, index) => {
        debugInfo.push({
          id: student.student_id,
          name: student.student_name,
          email: student.student_email,
          column: stage.label,
          position: index + 1
        });
      });
    });

    // Track Lost/Dropped column
    droppedStudents.forEach((student, index) => {
      debugInfo.push({
        id: student.student_id,
        name: student.student_name,
        email: student.student_email,
        column: 'Lost',
        position: index + 1
      });
    });

    const stringified = JSON.stringify(debugInfo);
    if (lastLoggedRef.current !== stringified) {
      console.log('[KANBAN_DEBUG] Render Positions:', debugInfo);
      lastLoggedRef.current = stringified;
    }
  }, [studentsByStage, droppedStudents, visibleStages, students.length]);

  const handleStudentClick = (student: StudentRecord) => {
    // Navigate to student detail page on the university dashboard
    if (student.status === 'enrolled') {
      navigate(`/school/dashboard/student/${student.application_id}`);
    } else {
      // Wait, there is no generic application detail path yet? 
      // The old view did modal in SelectionProcess. We can't do modal easily here without bringing all the code.
      // Wait, SchoolDashboard has `/school/dashboard/student/:applicationId` which renders StudentDetails
      navigate(`/school/dashboard/student/${student.application_id}`);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Summary Stats + Refresh */}
      <div className="px-1 pb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">
          {displayStudents.length} students in pipeline
          {droppedStudents.length > 0 && (
            <span className="ml-2 text-red-400">· {droppedStudents.length} dropped</span>
          )}
        </span>
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Kanban Board - Horizontal Scrollable */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-x-auto overflow-y-hidden pb-6"
      >
        <div className="flex gap-4 h-full min-w-max">
          {visibleStages.map(stage => {
            const studentsInStage = studentsByStage.get(stage.key) || [];

            return (
              <div
                key={stage.key}
                className="flex-shrink-0 w-80"
                style={{ height: 'calc(100vh - 280px)' }}
              >
                <KanbanColumn
                  stage={stage}
                  students={studentsInStage}
                  onStudentClick={handleStudentClick}
                  getUnreadCount={getStudentTotalUnread}
                  showSelectionTags={false}
                  showTeamLabel={false}
                />
              </div>
            );
          })}

          {/* Coluna especial: Dropped */}
          <div className="flex-shrink-0 w-80" style={{ height: 'calc(100vh - 280px)' }}>
            <KanbanColumn
              stage={{
                key: 'dropped' as ApplicationFlowStageKey,
                label: 'Lost',
                shortLabel: 'Lost',
                icon: UserX,
                description: 'Students who dropped out or were rejected',
                actor: 'admin',
              } as any}
              students={droppedStudents}
              onStudentClick={handleStudentClick}
              getUnreadCount={getStudentTotalUnread}
              isDropped
              showTeamLabel={false}
            />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {displayStudents.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="text-slate-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No students found
            </h3>
            <p className="text-sm text-slate-500">
              Adjust filters or wait for new applications to appear in your pipeline
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolApplicationKanbanView;
