import React from 'react';
import { MessageCircle } from 'lucide-react';

interface StudentDetailsHeaderProps {
  studentName: string;
  onOpenChat: () => void;
  onBack: () => void;
}

/**
 * StudentDetailsHeader - Header component for student details page
 * Displays student name and action buttons (Send Message, Back)
 */
const StudentDetailsHeader: React.FC<StudentDetailsHeaderProps> = React.memo(({
  studentName,
  onOpenChat,
  onBack,
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Details</h1>
        <p className="text-slate-600">Detailed view for {studentName}</p>
      </div>
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenChat}
          className="group relative px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl flex items-center space-x-3 transition-all duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-100 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2"
          title="Send message to student"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </div>
          <span className="font-medium text-sm relative z-10">Send Message</span>
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

