import React from 'react';

interface AcademicProfileSectionProps {
  fieldOfInterest?: string;
  academicLevel?: string;
  gpa?: string;
  englishProficiency?: string;
}

const AcademicProfileSection: React.FC<AcademicProfileSectionProps> = ({
  fieldOfInterest,
  academicLevel,
  gpa,
  englishProficiency
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Academic Profile</h3>
      <div className="space-y-3">
        <div>
          <dt className="text-sm font-medium text-slate-600">Field of Interest</dt>
          <dd className="text-base text-slate-900 mt-1">{fieldOfInterest || 'Not specified'}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">Academic Level</dt>
          <dd className="text-base text-slate-900 mt-1">{academicLevel || 'Not specified'}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">GPA</dt>
          <dd className="text-base text-slate-900 mt-1">{gpa || 'Not provided'}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">English Proficiency</dt>
          <dd className="text-base text-slate-900 mt-1">{englishProficiency || 'Not specified'}</dd>
        </div>
      </div>
    </div>
  );
};

export default AcademicProfileSection;
