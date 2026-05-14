import React, { useState, useMemo } from 'react';
import { ApplicationFlowStage, ApplicationFlowStageKey } from '../../utils/applicationFlowStages';
import StudentCard from './StudentCard';
import { StudentRecord } from './hooks/useStudentApplicationsQueries';
import { ArrowDownUp, ArrowUp, ArrowDown } from 'lucide-react';


interface KanbanColumnProps {
  stage: ApplicationFlowStage;
  students: StudentRecord[];
  onStudentClick: (student: StudentRecord) => void;
  getUnreadCount: (studentId: string) => number;
  isDropped?: boolean;
  showSelectionTags?: boolean;
}

const actorHeaderStyles = {
  student: {
    header: 'bg-white border-gray-200',
    icon: 'text-gray-600',
    title: 'text-gray-900',
    badge: 'bg-gray-200 text-gray-800',
  },
  admin: {
    header: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-800',
  },
  both: {
    header: 'bg-purple-50 border-purple-200',
    icon: 'text-purple-500',
    title: 'text-purple-900',
    badge: 'bg-purple-100 text-purple-800',
  },
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({ stage, students, onStudentClick, getUnreadCount, isDropped = false, showSelectionTags = false }) => {
  const Icon = stage.icon;
  const actor = (stage as any).actor as 'student' | 'admin' | 'both' | undefined;
  const styles = isDropped
    ? { header: 'bg-red-50 border-red-200', icon: 'text-red-400', title: 'text-red-700', badge: 'bg-red-100 text-red-700' }
    : actorHeaderStyles[actor ?? 'student'];

  const [sortOrder, setSortOrder] = useState<'default' | 'pendingFirst' | 'completedFirst'>('default');

  const handleSortToggle = () => {
    if (sortOrder === 'default') setSortOrder('pendingFirst');
    else if (sortOrder === 'pendingFirst') setSortOrder('completedFirst');
    else setSortOrder('default');
  };

  const sortedStudents = useMemo(() => {
    if (sortOrder === 'default' || !showSelectionTags) return students;
    
    return [...students].sort((a, b) => {
      // Score based on completion (0 = nothing, 1 = half, 2 = both)
      const getScore = (s: StudentRecord) => {
        let score = 0;
        if (s.has_uploaded_photo) score++;
        if (s.has_submitted_form) score++;
        return score;
      };

      const scoreA = getScore(a);
      const scoreB = getScore(b);
      
      if (scoreA === scoreB) return 0;
      
      if (sortOrder === 'pendingFirst') {
        return scoreA - scoreB; // Most pending (score 0) first
      } else {
        return scoreB - scoreA; // Most completed (score 2) first
      }
    });
  }, [students, sortOrder, showSelectionTags]);

  return (
    <div className={`flex flex-col rounded-lg border h-full ${isDropped ? 'bg-red-50/40 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
      {/* Column Header */}
      <div className={`sticky top-0 border-b px-4 py-3 rounded-t-lg z-10 ${styles.header}`}>
        <div className="flex flex-col mb-1.5">
          {stage.team && (
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-900 mb-0.5">
              {stage.team}
            </span>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${styles.icon}`} />
              <h3 className={`font-semibold text-sm ${styles.title}`}>
                {stage.label}
              </h3>
            </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
              {students.length}
            </span>
            {showSelectionTags && (
              <button 
                onClick={handleSortToggle}
                className={`p-1 rounded hover:bg-black/5 transition-colors flex items-center justify-center ${sortOrder !== 'default' ? 'text-gray-900 bg-black/5' : 'text-gray-400'}`}
                title={sortOrder === 'default' ? 'Sort by completion status' : sortOrder === 'pendingFirst' ? 'Pending first' : 'Completed first'}
              >
                {sortOrder === 'default' && <ArrowDownUp className="w-3 h-3" />}
                {sortOrder === 'pendingFirst' && <ArrowUp className="w-3 h-3 text-amber-600" />}
                {sortOrder === 'completedFirst' && <ArrowDown className="w-3 h-3 text-green-600" />}
              </button>
            )}
          </div>
        </div>
      </div>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2" title={stage.description}>
          {stage.description}
        </p>
      </div>

      {/* Column Body - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {sortedStudents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Icon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum estudante nesta etapa</p>
          </div>
        ) : (
          sortedStudents.map((student) => (
            <StudentCard
              key={student.student_id}
              student={student}
              onClick={() => onStudentClick(student)}
              unreadMessages={getUnreadCount(student.student_id)}
              showSelectionTags={showSelectionTags}
              currentStageKey={stage.key as ApplicationFlowStageKey}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
