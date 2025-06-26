import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Application, Scholarship } from '../../types';
import { useUniversity } from '../../context/UniversityContext';

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
  const { applications } = useUniversity();
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
          return (
            <Link to={`/school/dashboard/student/${app.id}`} key={app.id} className="block bg-white rounded-xl shadow flex flex-col md:flex-row items-center md:items-stretch p-4 md:p-6 border border-slate-100 hover:shadow-lg transition-all">
              <div className="flex-1">
                <div className="font-semibold text-lg text-[#05294E]">{student?.full_name || student?.name || 'Unknown Student'}</div>
                <div className="text-sm text-gray-500">ID: {student?.id}</div>
                {student?.phone && <div className="text-sm text-gray-600">Phone: {student.phone}</div>}
                {student?.country && <div className="text-sm text-gray-600">Country: {student.country}</div>}
                {scholarship && (
                  <div className="text-sm text-blue-700 mt-2 font-medium">Bolsa: {scholarship.title}</div>
                )}
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