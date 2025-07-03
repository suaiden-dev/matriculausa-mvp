import React from 'react';
import { Shield } from 'lucide-react';

const PrivacyPolicy: React.FC = () => (
  <div className="min-h-screen bg-[#05294E] flex flex-col items-center py-16 px-4">
    <div className="flex items-center mb-6">
      <Shield className="h-10 w-10 text-[#D0151C] mr-3" />
      <h1 className="text-4xl md:text-5xl font-black text-white">Privacy Policy</h1>
    </div>
    <div className="bg-white/90 rounded-2xl shadow-xl p-8 max-w-2xl w-full border-l-4 border-[#D0151C]">
      <p className="text-lg text-slate-700 mb-4">Your privacy is important to us. MatriculaUSA collects only the necessary information to provide our services, such as your name, contact details, and academic records. We do not share your personal data with third parties except as required to process your application or by law.</p>
      <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
        <li>We use secure technologies to protect your data.</li>
        <li>You can request to access, update, or delete your information at any time.</li>
        <li>For questions about your privacy, contact: info@matriculausa.com</li>
      </ul>
      <p className="text-slate-600">For the full policy, please check our website or contact our support team.</p>
    </div>
  </div>
);

export default PrivacyPolicy; 