import React from 'react';
import { Link } from 'react-router-dom';

interface StudentProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone?: string;
  country?: string;
}

interface Application {
  id: string;
  status: string;
  user_profiles?: StudentProfile;
}

interface StudentManagementProps {
  applications: Application[];
}

const StudentManagement: React.FC<StudentManagementProps> = ({ applications }) => {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Student Management</h1>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <p>{applications.length} student applications found.</p>
      </div>
      <div className="space-y-4">
        {applications.length === 0 && (
          <div className="text-gray-500">No students found.</div>
        )}
        {applications.map((app) => {
          const student = app.user_profiles;
          return (
            <Link to={`/school/dashboard/student/${app.id}`} key={app.id} className="block bg-white rounded-xl shadow flex flex-col md:flex-row items-center md:items-stretch p-4 md:p-6 border border-slate-100 hover:shadow-lg transition-all">
              <div className="flex-1">
                <div className="font-semibold text-lg text-[#05294E]">{student?.full_name || 'Unknown Student'}</div>
                <div className="text-sm text-gray-500">ID: {student?.id}</div>
                {student?.phone && <div className="text-sm text-gray-600">Phone: {student.phone}</div>}
                {student?.country && <div className="text-sm text-gray-600">Country: {student.country}</div>}
              </div>
              <div className="mt-2 md:mt-0 md:ml-6 flex flex-col items-end">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default StudentManagement; 