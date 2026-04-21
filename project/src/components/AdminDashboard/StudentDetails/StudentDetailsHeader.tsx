import React from 'react';
import { MessageCircle, UserCheck, Loader2 } from 'lucide-react';

interface StudentDetailsHeaderProps {
  studentName: string;
  onOpenChat: () => void;
  onBack: () => void;
  assignedAdminId?: string | null;
  internalAdmins?: Array<{ id: string; name: string }>;
  onAssignAdmin?: (adminId: string | null) => void;
  isAssigning?: boolean;
}

/**
 * StudentDetailsHeader - Header component for student details page
 * Displays student name and action buttons (Send Message, Back)
 * Now includes admin assignment selector
 */
const StudentDetailsHeader: React.FC<StudentDetailsHeaderProps> = React.memo(({
  studentName,
  onOpenChat,
  onBack,
  assignedAdminId,
  internalAdmins = [],
  onAssignAdmin,
  isAssigning = false,
}) => {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-slate-900 truncate">Student Details</h1>
        <p className="text-slate-600 truncate">Detailed view for {studentName}</p>
      </div>
      <div className="flex items-center space-x-3 ml-4">
        {/* Admin Assignment Selector */}
        {internalAdmins.length > 0 && (
          <div className="relative hidden md:flex items-center">
            <div className={`flex items-center px-3 py-2 bg-white border ${isAssigning ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-slate-200'} rounded-xl transition-all duration-200 hover:border-slate-300 focus-within:ring-2 focus-within:ring-slate-200`}>
              {isAssigning ? (
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin mr-2" />
              ) : (
                <UserCheck className="w-4 h-4 text-slate-400 mr-2" />
              )}
              <select
                value={assignedAdminId || ''}
                disabled={isAssigning}
                onChange={(e) => onAssignAdmin?.(e.target.value || null)}
                className="bg-transparent border-none p-0 pr-8 text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                title="Atribuir responsável"
              >
                <option value="">Sem responsável</option>
                {internalAdmins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <button
          onClick={onOpenChat}
          className="group relative px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl flex items-center space-x-3 transition-all duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-100 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2"
          title="Send message to student"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </div>
          <span className="font-medium text-sm relative z-10 whitespace-nowrap">Send Message</span>
        </button>
        <button
          onClick={onBack}
          className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2"
        >
          <span className="font-medium text-sm">Back</span>
        </button>
      </div>
    </div>
  );
});

StudentDetailsHeader.displayName = 'StudentDetailsHeader';

export default StudentDetailsHeader;

