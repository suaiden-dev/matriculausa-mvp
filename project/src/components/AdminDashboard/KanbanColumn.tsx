import React from 'react';
import { ApplicationFlowStage, ApplicationFlowStageKey } from '../../utils/applicationFlowStages';
import StudentCard from './StudentCard';
import { StudentRecord } from './StudentApplicationsView';

interface InternalAdmin {
  id: string;
  name: string;
  email: string;
}

interface KanbanColumnProps {
  stage: ApplicationFlowStage;
  students: StudentRecord[];
  onStudentClick: (student: StudentRecord) => void;
  getUnreadCount: (studentId: string) => number;
  internalAdmins?: InternalAdmin[];
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

const KanbanColumn: React.FC<KanbanColumnProps> = ({ stage, students, onStudentClick, getUnreadCount, internalAdmins = [], isDropped = false, showSelectionTags = false }) => {
  const Icon = stage.icon;
  const actor = (stage as any).actor as 'student' | 'admin' | 'both' | undefined;
  const styles = isDropped
    ? { header: 'bg-red-50 border-red-200', icon: 'text-red-400', title: 'text-red-700', badge: 'bg-red-100 text-red-700' }
    : actorHeaderStyles[actor ?? 'student'];

  return (
    <div className={`flex flex-col rounded-lg border h-full ${isDropped ? 'bg-red-50/40 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
      {/* Column Header */}
      <div className={`sticky top-0 border-b px-4 py-3 rounded-t-lg z-10 ${styles.header}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${styles.icon}`} />
            <h3 className={`font-semibold text-sm ${styles.title}`}>
              {stage.label}
            </h3>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
            {students.length}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2" title={stage.description}>
          {stage.description}
        </p>
      </div>

      {/* Column Body - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {students.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Icon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum estudante nesta etapa</p>
          </div>
        ) : (
          students.map((student) => (
            <StudentCard
              key={student.student_id}
              student={student}
              onClick={() => onStudentClick(student)}
              unreadMessages={getUnreadCount(student.student_id)}
              internalAdmins={internalAdmins}
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
