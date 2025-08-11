import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Application, Scholarship } from '../../types';
import { useUniversity } from '../../context/UniversityContext';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';

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
  scholarship_id?: string;
  scholarships?: Scholarship;
}

const StudentManagement: React.FC = () => {
  const { applications, university } = useUniversity();
  // Extrai bolsas únicas das aplicações
  const scholarships: Scholarship[] = Array.from(
    applications
      .map(app => app.scholarships)
      .filter((s): s is Scholarship => !!s)
      .reduce((map, scholarship) => {
        if (!map.has(scholarship.id)) map.set(scholarship.id, scholarship);
        return map;
      }, new Map<string, Scholarship>()).values()
  );

  const [selectedScholarship, setSelectedScholarship] = useState<string>('');

  // Filtra aplicações conforme bolsa selecionada
  const filteredApplications = selectedScholarship
    ? applications.filter(app => app.scholarship_id === selectedScholarship)
    : applications;

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Complete your profile to manage students"
      description="Finish setting up your university profile to view and manage student applications"
    >
      <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Student Management</h1>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <p>{filteredApplications.length} student applications found.</p>
        {scholarships.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Filtrar por bolsa:</label>
            <select
              className="border rounded px-3 py-2 w-full max-w-xs"
              value={selectedScholarship}
              onChange={e => setSelectedScholarship(e.target.value)}
              title="Filter by scholarship"
            >
              <option value="">Todas as bolsas</option>
              {scholarships.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="space-y-4">
        {filteredApplications.length === 0 && (
          <div className="text-gray-500">No students found.</div>
        )}
        {filteredApplications.map((app) => {
          const student = (app as any).user_profiles;
          const scholarship = app.scholarships;
          // Novo: lógica para status e badge
          let badgeText = '';
          let badgeClass = '';
          if (app.status === 'enrolled') {
            badgeText = 'Enrolled';
            badgeClass = 'bg-green-100 text-green-700';
          } else {
            badgeText = 'Waiting for acceptance letter';
            badgeClass = 'bg-yellow-100 text-yellow-700';
          }
          // LOG DETALHADO PARA DEBUG
          console.log('[StudentManagement] Application:', {
            id: app.id,
            status: app.status,
            acceptance_letter_status: app.acceptance_letter_status,
            badgeText,
            badgeClass,
            student: student?.full_name || student?.name,
          });
          return (
            <Link to={`/school/dashboard/student/${app.id}`} key={app.id} className="bg-white rounded-xl shadow flex flex-col md:flex-row items-center md:items-stretch p-4 md:p-6 border border-slate-100 hover:shadow-lg transition-all">
              <div className="flex-1">
                <div className="font-semibold text-lg text-[#05294E]">{student?.full_name || student?.name || 'Unknown Student'}</div>
                <div className="text-sm text-gray-500">ID: {student?.id}</div>
                {student?.phone && <div className="text-sm text-gray-600">Phone: {student.phone}</div>}
                {student?.country && <div className="text-sm text-gray-600">Country: {student.country}</div>}
                {scholarship && (
                  <div className="text-sm text-blue-700 mt-2 font-medium">Scholarship: {scholarship.title}</div>
                )}
              </div>
              <div className="mt-2 md:mt-0 md:ml-6 flex flex-col items-end">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${badgeClass}`}>{badgeText}</span>
              </div>
            </Link>
          );
        })}
      </div>
      </div>
    </ProfileCompletionGuard>
  );
};

export default StudentManagement; 