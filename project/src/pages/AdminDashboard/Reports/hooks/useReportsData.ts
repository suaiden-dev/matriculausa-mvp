import { useDeferredValue, useMemo, useState } from 'react';
import {
  useStudentsQuery,
  useStudentDocsStats,
  StudentRecord,
} from '../../../../components/AdminDashboard/hooks/useStudentApplicationsQueries';
import {
  APPLICATION_FLOW_STAGES,
  getStepStatus,
} from '../../../../utils/applicationFlowStages';

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  stage: string;
  scholarship: string;
  university: string;
  partner: string;
  showTestUsers: boolean;
}

export interface ChartData {
  name: string;
  value: number;
  percentage?: number;
  subtitle?: string;
}

const HIDDEN_STAGES = new Set(['scholarship_fee']);
const visibleStages = APPLICATION_FLOW_STAGES.filter(s => !HIDDEN_STAGES.has(s.key));

function getKanbanStage(student: StudentRecord): string {
  const isTransferPendingSevis =
    student.student_process_type === 'transfer' && !student.sevis_transfer_completed;

  if (student.application_status === 'enrolled' && !isTransferPendingSevis) {
    return 'enrollment';
  }

  for (const stageDef of visibleStages) {
    if (stageDef.requiresTransfer && student.student_process_type !== 'transfer') continue;
    if (stageDef.requiresProcessType && student.student_process_type !== stageDef.requiresProcessType) continue;

    const status = getStepStatus(student as any, stageDef.key);
    if (status === 'skipped') continue;
    if (status !== 'completed') return stageDef.key;
  }

  return 'enrollment';
}

export function useReportsData() {
  const { data: students, isLoading, error } = useStudentsQuery();
  const { data: docsStatsMap, isLoading: docsLoading } = useStudentDocsStats(students ?? []);

  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: '',
    dateTo: '',
    stage: 'all',
    scholarship: 'all',
    university: 'all',
    partner: 'all',
    showTestUsers: false,
  });

  // Step 1: merge doc stats — runs only when raw data changes
  const studentsWithDocs = useMemo(() => {
    if (!students) return [];
    if (!docsStatsMap) return students;
    return students.map(s => {
      const stats = docsStatsMap.get(s.student_id);
      return stats ? { ...s, ...stats } : s;
    });
  }, [students, docsStatsMap]);

  // Defer filters so UI stays responsive — expensive recomputation runs as low-priority task
  const deferredFilters = useDeferredValue(filters);

  // Step 2: compute kanban stage for ALL students — expensive, runs only when data changes
  // Filters are NOT a dependency here — this is the key optimization
  const allStudentsWithStage = useMemo(() => {
    return studentsWithDocs
      .filter(s =>
        !(s as any).is_dropped &&
        (s.has_paid_selection_process_fee || s.application_status === 'enrolled' || (s as any).source === 'migma')
      )
      .map(s => {
        const stageKey = getKanbanStage(s as StudentRecord);
        const stageDef = APPLICATION_FLOW_STAGES.find(def => def.key === stageKey);
        return {
          ...s,
          currentStageKey: stageKey,
          currentStageLabel: stageDef?.label || 'Unknown',
          currentStageShort: stageDef?.shortLabel || 'Unknown',
        };
      });
  }, [studentsWithDocs]);

  // Step 3: apply filters + aggregate — cheap, runs on every filter change
  const processedData = useMemo(() => {
    const nullState = {
      filteredStudents: [] as typeof allStudentsWithStage,
      stageChart: [] as ChartData[],
      partnerChart: [] as ChartData[],
      scholarshipChart: [] as ChartData[],
      universityChart: [] as ChartData[],
      totals: { count: 0, applicationFees: 0, placementFees: 0, scholarshipFees: 0, totalScholarshipValue: 0 }
    };

    if (!allStudentsWithStage.length) return nullState;

    const isTest = (email: string) => !deferredFilters.showTestUsers && email.includes('@uorak.com');

    let filtered = allStudentsWithStage.filter(s => !isTest(s.student_email));

    if (deferredFilters.dateFrom) {
      filtered = filtered.filter(s => new Date(s.student_created_at) >= new Date(deferredFilters.dateFrom));
    }
    if (deferredFilters.dateTo) {
      const dateTo = new Date(deferredFilters.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => new Date(s.student_created_at) <= dateTo);
    }
    if (deferredFilters.scholarship && deferredFilters.scholarship !== 'all') {
      filtered = filtered.filter(s => s.scholarship_title === deferredFilters.scholarship);
    }
    if (deferredFilters.university && deferredFilters.university !== 'all') {
      filtered = filtered.filter(s => s.university_name === deferredFilters.university);
    }
    if (deferredFilters.partner && deferredFilters.partner !== 'all') {
      if (deferredFilters.partner === 'direct') {
        filtered = filtered.filter(s => !s.agency_name && (s as any).source !== 'migma');
      } else if (deferredFilters.partner === 'migma') {
        filtered = filtered.filter(s => (s as any).source === 'migma');
      } else {
        filtered = filtered.filter(s => s.agency_name === deferredFilters.partner);
      }
    }
    if (deferredFilters.stage && deferredFilters.stage !== 'all') {
      filtered = filtered.filter(s => s.currentStageKey === deferredFilters.stage);
    }

    // Aggregations
    const stagesMap = new Map<string, number>();
    const partnersMap = new Map<string, number>();
    const scholarshipsMap = new Map<string, { name: string; subtitle: string; count: number }>();
    const universitiesMap = new Map<string, number>();

    visibleStages.forEach(stage => stagesMap.set(stage.shortLabel, 0));
    stagesMap.set('Admitted', 0);

    let totalAppFees = 0;
    let totalPlaceFees = 0;
    let totalScholFees = 0;
    let totalScholarshipValue = 0;

    filtered.forEach(s => {
      if (s.is_application_fee_paid) totalAppFees += (s.application_fee_amount || 0);
      if (s.is_placement_fee_paid) totalPlaceFees += (s.placement_fee_amount || 0);
      if (s.is_scholarship_fee_paid) totalScholFees += (s.scholarship_fee_amount || 0);
      totalScholarshipValue += (s.scholarship_fee_amount || 0);

      stagesMap.set(s.currentStageShort, (stagesMap.get(s.currentStageShort) || 0) + 1);

      const partnerName = (s as any).source === 'migma' ? 'Migma' : (s.agency_name || 'Direct / No Agency');
      partnersMap.set(partnerName, (partnersMap.get(partnerName) || 0) + 1);

      if (s.scholarship_title) {
        const schlKey = `${s.scholarship_title}||${s.university_name || ''}`;
        const existing = scholarshipsMap.get(schlKey);
        const subtitleParts = [s.university_name, (s as any).course_name].filter(Boolean);
        scholarshipsMap.set(schlKey, {
          name: s.scholarship_title,
          subtitle: subtitleParts.join(' • '),
          count: (existing?.count || 0) + 1,
        });
      }

      if (s.university_name) {
        universitiesMap.set(s.university_name, (universitiesMap.get(s.university_name) || 0) + 1);
      }
    });

    const totalCount = filtered.length;

    const formatChartData = (map: Map<string, number>, total: number): ChartData[] =>
      Array.from(map.entries())
        .map(([name, value]) => ({ name, value, percentage: total > 0 ? (value / total) * 100 : 0 }))
        .sort((a, b) => b.value - a.value);

    const stageChartData: ChartData[] = Array.from(stagesMap.entries())
      .map(([name, value]) => ({ name, value, percentage: totalCount > 0 ? (value / totalCount) * 100 : 0 }));

    const scholarshipChart: ChartData[] = Array.from(scholarshipsMap.entries())
      .map(([, { name, subtitle, count }]) => ({
        name,
        subtitle,
        value: count,
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      filteredStudents: filtered,
      stageChart: stageChartData,
      partnerChart: formatChartData(partnersMap, totalCount),
      scholarshipChart,
      universityChart: formatChartData(universitiesMap, totalCount),
      totals: {
        count: totalCount,
        applicationFees: totalAppFees,
        placementFees: totalPlaceFees,
        scholarshipFees: totalScholFees,
        totalScholarshipValue
      }
    };
  }, [allStudentsWithStage, deferredFilters]);

  // Filter options — computed from all students (ignore active filters except showTestUsers)
  const filterOptions = useMemo(() => {
    const isTest = (email: string) => !deferredFilters.showTestUsers && email.includes('@uorak.com');
    const active = allStudentsWithStage.filter(s => !isTest(s.student_email));

    return {
      stages: visibleStages.map(s => ({ value: s.key, label: s.label })),
      scholarships: Array.from(new Set(active.map(s => s.scholarship_title).filter(Boolean))),
      universities: Array.from(new Set(active.map(s => s.university_name).filter(Boolean))),
      partners: [
        ...(active.some(s => (s as any).source === 'migma') ? ['migma'] : []),
        ...Array.from(new Set(active.map(s => s.agency_name).filter(Boolean)))
      ]
    };
  }, [allStudentsWithStage, deferredFilters.showTestUsers]);

  return {
    isLoading: isLoading || docsLoading,
    isStale: filters !== deferredFilters, // true enquanto reprocessamento está pendente
    error,
    filters,
    setFilters,
    ...processedData,
    filterOptions
  };
}
