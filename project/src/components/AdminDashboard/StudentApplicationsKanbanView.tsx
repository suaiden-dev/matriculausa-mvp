import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import KanbanColumn from './KanbanColumn';
import {
  APPLICATION_FLOW_STAGES,
  getCurrentStage,
  getStepStatus,
  ApplicationFlowStageKey
} from '../../utils/applicationFlowStages';
import { StudentRecord } from './StudentApplicationsView';

interface InternalAdmin {
  id: string;
  name: string;
  email: string;
}

interface StudentApplicationsKanbanViewProps {
  students: StudentRecord[];
  getUnreadCount: (studentId: string) => number;
  getGlobalUnreadCount: (studentId: string) => number;
  internalAdmins?: InternalAdmin[];
}

const StudentApplicationsKanbanView: React.FC<StudentApplicationsKanbanViewProps> = ({
  students,
  getUnreadCount,
  getGlobalUnreadCount,
  internalAdmins = [],
}) => {
  const navigate = useNavigate();

  // Função centralizada para pegar unread counts
  const getStudentTotalUnread = (studentId: string) => {
    return getUnreadCount(studentId) + getGlobalUnreadCount(studentId);
  };

  // Filtramos apenas os que pagaram a selection fee ou estão inscritos
  const displayStudents = useMemo(() => {
    return students.filter(s => s.has_paid_selection_process_fee || s.status === 'enrolled' || s.source === 'migma');
  }, [students]);

  // Filter out stages that should be hidden
  const visibleStages = useMemo(() => {
    return APPLICATION_FLOW_STAGES.filter(stage => 
      stage.key !== 'scholarship_fee' && 
      stage.key !== 'i20_fee'
    );
  }, []);

  // Organize students by their last completed stage (milestone)
  const studentsByStage = useMemo(() => {
    const stageMap = new Map<ApplicationFlowStageKey, StudentRecord[]>();

    // Initialize only visible stages
    visibleStages.forEach(stage => {
      stageMap.set(stage.key, []);
    });

    // Distribute students to their last completed stage that is ALSO VISIBLE
    displayStudents.forEach(student => {
      // Prioridade máxima: se o status principal é 'enrolled', vai direto para a coluna final
      if ((student.status === 'enrolled' || student.application_status === 'enrolled') && stageMap.has('enrollment')) {
        stageMap.get('enrollment')!.push(student);
        return;
      }

      let lastVisibleCompletedStage: ApplicationFlowStageKey | null = null;
      const { stage: currentStage } = getCurrentStage(student as any);

      for (const stageDef of APPLICATION_FLOW_STAGES) {
        // Pular transfer_form se não for transfer student
        if (stageDef.requiresTransfer && student.student_process_type !== 'transfer') {
          continue;
        }

        // Pular se o aluno pulou este estágio (ex: no flow de placement_fee)
        const stepStatus = getStepStatus(student as any, stageDef.key);
        if (stepStatus === 'skipped') {
          continue;
        }

        // Se o estágio foi completado e ele é visível, marcamos como o último visível completado
        if (stepStatus === 'completed' && visibleStages.some(vs => vs.key === stageDef.key)) {
          lastVisibleCompletedStage = stageDef.key;
        }

        // Se este é o estágio atual e NÃO está completado (ou seja, é o que falta fazer), paramos
        if (currentStage === stageDef.key && stepStatus !== 'completed') {
          break;
        }
      }

      if (lastVisibleCompletedStage && stageMap.has(lastVisibleCompletedStage)) {
        stageMap.get(lastVisibleCompletedStage)!.push(student);
      } else if (student.has_paid_selection_process_fee && stageMap.has('selection_fee')) {
        stageMap.get('selection_fee')!.push(student);
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
      {/* Summary Stats - Simplified */}
      <div className="px-1 pb-2">
        <span className="text-sm font-medium text-gray-500">
          {displayStudents.length} students in pipeline
        </span>
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
                  internalAdmins={internalAdmins}
                />
              </div>
            );
          })}
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
