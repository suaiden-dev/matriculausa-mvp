import React from 'react';
import { ApplicationFlowStage } from '../../utils/applicationFlowStages';
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

const KanbanColumn: React.FC<KanbanColumnProps> = ({ stage, students, onStudentClick, getUnreadCount, internalAdmins = [], isDropped = false, showSelectionTags = false }) => {
  const Icon = stage.icon;

  return (
    <div className={`flex flex-col rounded-lg border h-full ${isDropped ? 'bg-red-50/40 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
      {/* Column Header */}
      <div className={`sticky top-0 border-b px-4 py-3 rounded-t-lg z-10 ${isDropped ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${isDropped ? 'text-red-400' : 'text-gray-600'}`} />
            <h3 className={`font-semibold text-sm ${isDropped ? 'text-red-700' : 'text-gray-900'}`}>
              {stage.label}
            </h3>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDropped ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-800'}`}>
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
            />
          ))
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
