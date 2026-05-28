import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import KanbanColumn from './KanbanColumn';
import {
  APPLICATION_FLOW_STAGES,
  getStepStatus,
  ApplicationFlowStageKey
} from '../../utils/applicationFlowStages';
import { StudentRecord, useStudentDocsStats } from './hooks/useStudentApplicationsQueries';

import { queryKeys } from '../../lib/queryKeys';
import { UserX, UserPlus, RefreshCw } from 'lucide-react';


interface StudentApplicationsKanbanViewProps {
  students: StudentRecord[];
  getUnreadCount: (studentId: string) => number;
  getGlobalUnreadCount: (studentId: string) => number;
}

const StudentApplicationsKanbanView: React.FC<StudentApplicationsKanbanViewProps> = ({
  students,
  getUnreadCount,
  getGlobalUnreadCount,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: docsStatsMap, refetch: refetchDocs } = useStudentDocsStats(students);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
      refetchDocs(),
    ]);
    setIsRefreshing(false);
  };

  // Merge doc stats into student records
  const studentsWithDocs = useMemo(() => {
    if (!docsStatsMap) return students;
    return students.map(s => {
      const stats = docsStatsMap.get(s.student_id);
      return stats ? { ...s, ...stats } : s;
    });
  }, [students, docsStatsMap]);

  // Função centralizada para pegar unread counts
  const getStudentTotalUnread = (studentId: string) => {
    return getUnreadCount(studentId) + getGlobalUnreadCount(studentId);
  };

  // Separar dropped dos demais
  const droppedStudents = useMemo(() => {
    return studentsWithDocs.filter(s => s.is_dropped);
  }, [studentsWithDocs]);

  // Alunos registrados mas que ainda não pagaram a selection process fee
  const registeredStudents = useMemo(() => {
    return studentsWithDocs.filter(s =>
      !s.is_dropped &&
      !s.has_paid_selection_process_fee &&
      s.application_status !== 'enrolled' &&
      s.source !== 'migma'
    );
  }, [studentsWithDocs]);

  // Filtramos apenas os que pagaram a selection fee ou estão inscritos, excluindo dropped
  const displayStudents = useMemo(() => {
    return studentsWithDocs.filter(s =>
      !s.is_dropped &&
      (s.has_paid_selection_process_fee || s.application_status === 'enrolled' || s.source === 'migma')
    );
  }, [studentsWithDocs]);

  // Filter out stages that should be hidden
  const visibleStages = useMemo(() => {
    return APPLICATION_FLOW_STAGES.filter(stage =>
      stage.key !== 'scholarship_fee'
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
      // Alunos já matriculados → vão direto para Enrollment
      // Exception: transfer students who haven't completed SEVIS must still pass through sevis_transfer
      const isTransferPendingSevis =
        student.student_process_type === 'transfer' && !student.sevis_transfer_completed;
      if (student.application_status === 'enrolled' && !isTransferPendingSevis && stageMap.has('enrollment')) {
        stageMap.get('enrollment')!.push(student);
        return;
      }

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
    // Navigate to student detail page
    navigate(`/admin/dashboard/students/${student.student_id}`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Summary Stats + Color Legend */}
      <div className="px-1 pb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-500">
          {studentsWithDocs.filter(s => !s.is_dropped && (s.has_paid_selection_process_fee || s.application_status === 'enrolled' || s.source === 'migma')).length} students in pipeline
          {registeredStudents.length > 0 && (
            <span className="ml-2 text-blue-400">· {registeredStudents.length} registered</span>
          )}
          {droppedStudents.length > 0 && (
            <span className="ml-2 text-red-400">· {droppedStudents.length} dropped</span>
          )}
        </span>
        <div className="flex items-center gap-4">
          {/* Color legend */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-white border border-gray-300" />
              Student
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-blue-50 border border-blue-200" />
              Admin
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-purple-50 border border-purple-200" />
              Both
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Kanban Board - Horizontal Scrollable */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-6">
        <div className="flex gap-4 h-full min-w-max">
          {/* Coluna especial: Registered (primeiro) */}
          <div className="flex-shrink-0 w-80" style={{ height: 'calc(100vh - 280px)' }}>
            <KanbanColumn
              stage={{
                key: 'registered' as ApplicationFlowStageKey,
                label: 'Registered',
                shortLabel: 'Registered',
                icon: UserPlus,
                description: 'Students registered but haven\'t paid the Selection Process Fee yet',
                team: 'Closer',
                actor: 'student',
              } as any}
              students={registeredStudents}
              onStudentClick={handleStudentClick}
              getUnreadCount={getStudentTotalUnread}
            />
          </div>

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
                  showSelectionTags={stage.key === 'selection_fee'}
                />
              </div>
            );
          })}

          {/* Coluna especial: Dropped */}
          <div className="flex-shrink-0 w-80" style={{ height: 'calc(100vh - 280px)' }}>
            <KanbanColumn
              stage={{
                key: 'dropped' as ApplicationFlowStageKey,
                label: 'Dropped',
                shortLabel: 'Dropped',
                icon: UserX,
                description: 'Students who dropped out of the process',
                team: 'Admin',
                actor: 'admin',
              } as any}
              students={droppedStudents}
              onStudentClick={handleStudentClick}
              getUnreadCount={getStudentTotalUnread}
              isDropped
            />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {displayStudents.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No students found
            </h3>
            <p className="text-sm text-gray-500">
              Adjust filters to see students in the pipeline
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentApplicationsKanbanView;
