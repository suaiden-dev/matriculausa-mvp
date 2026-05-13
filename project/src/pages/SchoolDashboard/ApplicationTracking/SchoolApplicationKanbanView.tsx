import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KanbanColumn from '../../../components/AdminDashboard/KanbanColumn';
import {
  APPLICATION_FLOW_STAGES,
  getStepStatus,
  ApplicationFlowStageKey
} from '../../../utils/applicationFlowStages';
import { StudentRecord } from '../../../components/AdminDashboard/StudentApplicationsView';
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
    return students.filter(s => s.is_dropped || s.status === 'rejected');
  }, [students]);

  // Filtramos apenas os alunos ativos no pipeline da faculdade
  const displayStudents = useMemo(() => {
    return students.filter(s => !s.is_dropped && s.status !== 'rejected');
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
    'student_sends_letter',
    'sevis_transfer',
    'visa_approval',
    'enrollment'
  ];

  const visibleStages = useMemo(() => {
    return APPLICATION_FLOW_STAGES.filter(stage =>
      allowedStageKeys.includes(stage.key)
    );
  }, []);

  // Organize students by their current stage (first non-completed visible stage)
  const studentsByStage = useMemo(() => {
    const stageMap = new Map<ApplicationFlowStageKey, StudentRecord[]>();

    // Initialize only visible stages
    visibleStages.forEach(stage => {
      stageMap.set(stage.key, []);
    });

    displayStudents.forEach(student => {
      // Find first visible non-completed stage (current stage)
      let placed = false;
      for (const stageDef of visibleStages) {
        // Skip transfer_form if not transfer student
        if (stageDef.requiresTransfer && student.student_process_type !== 'transfer') {
          continue;
        }
        // Skip process-type-specific stages
        if (stageDef.requiresProcessType && student.student_process_type !== stageDef.requiresProcessType) {
          continue;
        }

        const stepStatus = getStepStatus(student as any, stageDef.key);

        if (student.student_email === 'alcor8232@uorak.com') {
          console.log(`🔍 [DEBUG_FINAL] Etapa: ${stageDef.key} | Status: ${stepStatus}`, {
            paid: (student as any).is_placement_fee_paid,
            flow: (student as any).placement_fee_flow,
            docs_app: (student as any).docs_total_approved,
            docs_req: (student as any).docs_total_required
          });
        }

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

  const handleStudentClick = (student: StudentRecord) => {
    // Navigate to student detail page on the university dashboard
    // using the existing selection process page or a new detail page if available.
    // For now, we link to the SelectionProcess detail (which we might adapt later if needed)
    navigate(`/school/dashboard/selection-process`);
    // Ideally it would be: navigate(`/school/dashboard/student/${student.application_id}`);
    // I am setting it to the existing routing which handles selection-process details or enrolled details
    
    // We will use the common student view path:
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
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-6">
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
                  internalAdmins={[]}
                  showSelectionTags={false}
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
              internalAdmins={[]}
              isDropped
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
