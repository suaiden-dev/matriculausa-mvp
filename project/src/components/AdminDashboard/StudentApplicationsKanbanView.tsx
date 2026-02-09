import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import KanbanColumn from './KanbanColumn';
import { 
  APPLICATION_FLOW_STAGES, 
  getCurrentStage,
  ApplicationFlowStageKey 
} from '../../utils/applicationFlowStages';
import { useStudentUnreadMessages } from '../../hooks/useStudentUnreadMessages';
import { useGlobalStudentUnread } from '../../hooks/useGlobalStudentUnread';
import { StudentRecord } from './StudentApplicationsView';

interface StudentApplicationsKanbanViewProps {
  students: StudentRecord[];
}

const StudentApplicationsKanbanView: React.FC<StudentApplicationsKanbanViewProps> = ({ students }) => {
  const navigate = useNavigate();
  const { getUnreadCount } = useStudentUnreadMessages();
  const { getUnreadCount: getGlobalUnreadCount } = useGlobalStudentUnread();

  // Função centralizada para pegar unread counts
  const getStudentTotalUnread = (studentId: string) => {
    return getUnreadCount(studentId) + getGlobalUnreadCount(studentId); // Nota: useGlobalStudentUnread usa studentId como chave no Map
  };

  // Filtramos apenas os que pagaram a selection fee ou estão inscritos
  const displayStudents = useMemo(() => {
    return students.filter(s => s.has_paid_selection_process_fee || s.status === 'enrolled');
  }, [students]);

  // Organize students by their last completed stage (milestone)
  const studentsByStage = useMemo(() => {
    const stageMap = new Map<ApplicationFlowStageKey, StudentRecord[]>();
    
    // Initialize all stages with empty arrays
    APPLICATION_FLOW_STAGES.forEach(stage => {
      stageMap.set(stage.key, []);
    });

    // Distribute students to their last completed stages
    displayStudents.forEach(student => {
      let lastCompletedStage: ApplicationFlowStageKey | null = null;
      
      for (const stageDef of APPLICATION_FLOW_STAGES) {
        // Pular transfer_form se não for transfer student
        if (stageDef.requiresTransfer && student.student_process_type !== 'transfer') {
          continue;
        }

        // Usamos a lógica de status para ver se completou este degrau
        const { stage: currentStage } = getCurrentStage(student as any);
        
        // Se este é o estágio atual (pendente), então o anterior foi o último completado
        if (currentStage === stageDef.key) {
          break;
        }
        
        lastCompletedStage = stageDef.key;
      }

      if (lastCompletedStage && stageMap.has(lastCompletedStage)) {
        stageMap.get(lastCompletedStage)!.push(student);
      } else if (student.has_paid_selection_process_fee && stageMap.has('selection_fee')) {
        // Fallback: se pagou a taxa, pelo menos está no primeiro estágio
        stageMap.get('selection_fee')!.push(student);
      }
    });

    return stageMap;
  }, [displayStudents]);

  const handleStudentClick = (student: StudentRecord) => {
    // Navigate to student detail page
    navigate(`/admin/dashboard/students/${student.student_id}`);
  };

  // Filter out stages that should be hidden
  const visibleStages = APPLICATION_FLOW_STAGES.filter(stage => {
    // Hide enrollment column as requested
    if (stage.key === 'enrollment') return false;

    // Always show non-transfer stages
    if (!stage.requiresTransfer) return true;
    
    // For transfer stages, only show if there are transfer students in that stage
    const studentsInStage = studentsByStage.get(stage.key) || [];
    return studentsInStage.length > 0;
  });

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
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {students.length === 0 && (
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
