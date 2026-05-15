import React from 'react';

interface PersonalInfoSectionProps {
  fullName: string;
  email?: string;
  phone?: string;
  country?: string;
}

const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  fullName,
  email,
  phone,
  country
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Personal Details</h3>
      <div className="space-y-3">
        <div>
          <dt className="text-sm font-medium text-slate-600">Full Name</dt>
          <dd className="text-base font-semibold text-slate-900 mt-1">{fullName}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">Email</dt>
          <dd className="text-base text-slate-900 mt-1">{email || 'Not provided'}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">Phone</dt>
          <dd className="text-base text-slate-900 mt-1">{phone || 'Not provided'}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">Country</dt>
          <dd className="text-base text-slate-900 mt-1">{country || 'Not specified'}</dd>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoSection;
