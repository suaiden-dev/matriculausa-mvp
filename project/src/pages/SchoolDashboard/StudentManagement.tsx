import React from 'react';
import { Application } from '../../types';

interface StudentManagementProps {
  applications: Application[];
}

const StudentManagement: React.FC<StudentManagementProps> = ({ applications }) => {
  if (!applications) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Student Management</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p>Loading student data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Student Management</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p>{applications.length} student applications found.</p>
      </div>
    </div>
  );
};

export default StudentManagement; 