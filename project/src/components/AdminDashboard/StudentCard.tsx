import React from 'react';
import { Building, GraduationCap, Calendar } from 'lucide-react';
import { StudentRecord } from './StudentApplicationsView';

interface StudentCardProps {
  student: StudentRecord;
  onClick: () => void;
  unreadMessages?: number;
}

const StudentCard: React.FC<StudentCardProps> = ({ student, onClick, unreadMessages = 0 }) => {
  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Generate a consistent color for the avatar based on student ID
  const getAvatarColor = (id: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
    ];
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Format date to relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return '1 dia atrás';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
    return `${Math.floor(diffDays / 365)} anos atrás`;
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow duration-200 hover:border-blue-300 relative"
    >
      {/* Unread messages indicator */}
      {unreadMessages > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md z-10">
          {unreadMessages > 9 ? '9+' : unreadMessages}
        </div>
      )}

      {/* Header with avatar and name */}
      <div className="flex items-start gap-3 mb-2">
        <div className={`${getAvatarColor(student.student_id)} w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
          {getInitials(student.student_name)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate" title={student.student_name}>
            {student.student_name}
          </h3>
          <p className="text-xs text-gray-500 truncate" title={student.student_email}>
            {student.student_email}
          </p>
        </div>
      </div>

      {/* University/Scholarship info */}
      {(student.university_name || student.scholarship_title) && (
        <div className="space-y-1 mb-2">
          {student.university_name && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Building className="w-3 h-3 flex-shrink-0" />
              <span className="truncate" title={student.university_name}>
                {student.university_name}
              </span>
            </div>
          )}
          {student.scholarship_title && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <GraduationCap className="w-3 h-3 flex-shrink-0" />
              <span className="truncate" title={student.scholarship_title}>
                {student.scholarship_title}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Footer with badges */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>{getRelativeTime(student.student_created_at)}</span>
        </div>
        
        {student.total_applications > 0 && (
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              {student.total_applications} app{student.total_applications > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCard;
