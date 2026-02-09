import { useMemo } from 'react';
import {
  ApplicationFlowStageKey,
  StageStatus,
  StudentRecord,
  getStepStatus,
  getCurrentStage,
  isStudentInStage
} from '../utils/applicationFlowStages';

interface UseApplicationFlowStageResult {
  currentStage: ApplicationFlowStageKey | null;
  currentStatus: StageStatus;
  getStageStatus: (stage: ApplicationFlowStageKey) => StageStatus;
  isInStage: (stage: ApplicationFlowStageKey, status?: StageStatus) => boolean;
}

/**
 * Hook para determinar e trabalhar com estágios do application flow de um estudante
 */
export function useApplicationFlowStage(
  student: StudentRecord | null | undefined
): UseApplicationFlowStageResult {
  const result = useMemo(() => {
    if (!student) {
      return {
        currentStage: null,
        currentStatus: 'pending' as StageStatus,
        getStageStatus: () => 'pending' as StageStatus,
        isInStage: () => false
      };
    }

    const current = getCurrentStage(student);

    return {
      currentStage: current.stage,
      currentStatus: current.status,
      getStageStatus: (stage: ApplicationFlowStageKey) => getStepStatus(student, stage),
      isInStage: (stage: ApplicationFlowStageKey, status?: StageStatus) =>
        isStudentInStage(student, stage, status)
    };
  }, [student]);

  return result;
}





