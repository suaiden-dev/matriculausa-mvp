import React from 'react';
import { FileText } from 'lucide-react';

const TermsOfService: React.FC = () => (
  <div className="min-h-screen bg-[#05294E] flex flex-col items-center py-16 px-4">
    <div className="flex items-center mb-6">
      <FileText className="h-10 w-10 text-[#D0151C] mr-3" />
      <h1 className="text-4xl md:text-5xl font-black text-white">Terms of Service</h1>
    </div>
    <div className="bg-white/90 rounded-2xl shadow-xl p-8 max-w-2xl w-full border-l-4 border-[#D0151C]">
      <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
        <li>You must provide accurate and truthful information.</li>
        <li>All fees paid are final and non-refundable.</li>
        <li>MatriculaUSA is not responsible for decisions made by partner universities.</li>
        <li>You are responsible for keeping your login credentials secure.</li>
        <li>Misuse of the platform may result in account suspension.</li>
      </ul>
      <p className="text-slate-600">For the complete Terms of Service, please contact us at info@matriculausa.com.</p>
    </div>
  </div>
);

export default TermsOfService; 