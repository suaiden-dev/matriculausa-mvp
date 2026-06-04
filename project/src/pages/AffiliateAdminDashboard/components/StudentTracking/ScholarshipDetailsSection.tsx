import React from 'react';

interface ScholarshipDetailsSectionProps {
  scholarshipTitle?: string;
  universityName?: string;
  applicationStatus?: string;
}

const ScholarshipDetailsSection: React.FC<ScholarshipDetailsSectionProps> = ({
  scholarshipTitle,
  universityName,
  applicationStatus
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="bg-gradient-to-r rounded-t-2xl from-slate-700 to-slate-800 px-6 py-4">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Scholarship Details
        </h2>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
            <div className="flex-1">
              <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {scholarshipTitle && scholarshipTitle !== 'Scholarship not specified'
                  ? scholarshipTitle
                  : 'Scholarship information not available'
                }
              </dd>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
            <div className="flex-1">
              <dt className="text-sm font-medium text-slate-600">University</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {universityName && universityName !== 'University not specified'
                  ? universityName
                  : 'University not specified'
                }
              </dd>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
            <div className="flex-1">
              <dt className="text-sm font-medium text-slate-600">Application Status</dt>
              <dd className="text-base text-slate-700">
                {applicationStatus && applicationStatus !== 'Not specified'
                  ? applicationStatus.charAt(0).toUpperCase() + applicationStatus.slice(1)
                  : 'Pending'
                }
              </dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScholarshipDetailsSection;
