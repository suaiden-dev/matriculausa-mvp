import { useMemo, useState } from 'react';
import { useStudentsQuery, StudentRecord } from '../../../../components/AdminDashboard/hooks/useStudentApplicationsQueries';
import { getCurrentStage, APPLICATION_FLOW_STAGES } from '../../../../utils/applicationFlowStages';

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  stage: string;
  scholarship: string;
  university: string;
  partner: string;
}

export interface ChartData {
  name: string;
  value: number;
  percentage?: number;
}

export function useReportsData() {
  const { data: students, isLoading, error } = useStudentsQuery();
  
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: '',
    dateTo: '',
    stage: 'all',
    scholarship: 'all',
    university: 'all',
    partner: 'all',
  });

  const processedData = useMemo(() => {
    if (!students) return {
      filteredStudents: [],
      stageChart: [],
      partnerChart: [],
      scholarshipChart: [],
      scholarshipValueChart: [],
      universityChart: [],
      totals: { count: 0, applicationFees: 0, placementFees: 0, scholarshipFees: 0, totalScholarshipValue: 0 }
    };

    // Filter students
    let filtered = students.filter(student => !student.student_email.includes('@uorak.com')); // Remove tests

    if (filters.dateFrom) {
      filtered = filtered.filter(s => new Date(s.student_created_at) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => new Date(s.student_created_at) <= dateTo);
    }
    if (filters.scholarship && filters.scholarship !== 'all') {
      filtered = filtered.filter(s => s.scholarship_title === filters.scholarship);
    }
    if (filters.university && filters.university !== 'all') {
      filtered = filtered.filter(s => s.university_name === filters.university);
    }
    if (filters.partner && filters.partner !== 'all') {
      if (filters.partner === 'direct') {
        filtered = filtered.filter(s => !s.agency_name);
      } else {
        filtered = filtered.filter(s => s.agency_name === filters.partner);
      }
    }

    // Attach stage info for table and further filtering
    const studentsWithStage = filtered.map(s => {
      const { stage } = getCurrentStage(s);
      const stageDef = APPLICATION_FLOW_STAGES.find(def => def.key === stage);
      return {
        ...s,
        currentStageKey: stage,
        currentStageLabel: stageDef?.label || 'Unknown',
        currentStageShort: stageDef?.shortLabel || 'Unknown'
      };
    });

    // Filter by stage if requested
    let finalStudents = studentsWithStage;
    if (filters.stage && filters.stage !== 'all') {
      finalStudents = studentsWithStage.filter(s => s.currentStageKey === filters.stage);
    }

    // Aggregations
    const stagesMap = new Map<string, number>();
    const partnersMap = new Map<string, number>();
    const scholarshipsMap = new Map<string, number>();
    const scholarshipValueMap = new Map<string, number>(); // scholarship_title → total $ value
    const universitiesMap = new Map<string, number>();

    let totalAppFees = 0;
    let totalPlaceFees = 0;
    let totalScholFees = 0;
    let totalScholarshipValue = 0;

    finalStudents.forEach(s => {
      if (s.is_application_fee_paid) totalAppFees += (s.application_fee_amount || 0);
      if (s.is_placement_fee_paid) totalPlaceFees += (s.placement_fee_amount || 0);
      if (s.is_scholarship_fee_paid) totalScholFees += (s.scholarship_fee_amount || 0);
      totalScholarshipValue += (s.scholarship_fee_amount || 0);

      stagesMap.set(s.currentStageShort, (stagesMap.get(s.currentStageShort) || 0) + 1);

      const partnerName = s.agency_name || 'Direct / Sem Agência';
      partnersMap.set(partnerName, (partnersMap.get(partnerName) || 0) + 1);

      if (s.scholarship_title) {
        scholarshipsMap.set(s.scholarship_title, (scholarshipsMap.get(s.scholarship_title) || 0) + 1);
        scholarshipValueMap.set(
          s.scholarship_title,
          (scholarshipValueMap.get(s.scholarship_title) || 0) + (s.scholarship_fee_amount || 0)
        );
      }

      if (s.university_name) {
        universitiesMap.set(s.university_name, (universitiesMap.get(s.university_name) || 0) + 1);
      }
    });

    const formatChartData = (map: Map<string, number>, total: number): ChartData[] =>
      Array.from(map.entries())
        .map(([name, value]) => ({ name, value, percentage: total > 0 ? (value / total) * 100 : 0 }))
        .sort((a, b) => b.value - a.value);

    const totalCount = finalStudents.length;

    return {
      filteredStudents: finalStudents,
      stageChart: formatChartData(stagesMap, totalCount),
      partnerChart: formatChartData(partnersMap, totalCount),
      scholarshipChart: formatChartData(scholarshipsMap, totalCount),
      scholarshipValueChart: formatChartData(scholarshipValueMap, totalScholarshipValue),
      universityChart: formatChartData(universitiesMap, totalCount),
      totals: {
        count: totalCount,
        applicationFees: totalAppFees,
        placementFees: totalPlaceFees,
        scholarshipFees: totalScholFees,
        totalScholarshipValue
      }
    };
  }, [students, filters]);

  // Options for filters (unique values from all non-filtered students)
  const filterOptions = useMemo(() => {
    if (!students) return { stages: [], scholarships: [], universities: [], partners: [] };
    const noTestStudents = students.filter(student => !student.student_email.includes('@uorak.com'));
    
    return {
      stages: APPLICATION_FLOW_STAGES.map(s => ({ value: s.key, label: s.label })),
      scholarships: Array.from(new Set(noTestStudents.map(s => s.scholarship_title).filter(Boolean))),
      universities: Array.from(new Set(noTestStudents.map(s => s.university_name).filter(Boolean))),
      partners: Array.from(new Set(noTestStudents.map(s => s.agency_name).filter(Boolean)))
    };
  }, [students]);

  return {
    isLoading,
    error,
    filters,
    setFilters,
    ...processedData,
    filterOptions
  };
}
