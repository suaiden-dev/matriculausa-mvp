import React from 'react';
import { HelpCircle } from 'lucide-react';

const FAQ: React.FC = () => (
  <div className="min-h-screen bg-[#05294E] flex flex-col items-center py-16 px-4">
    <img
      src="https://images.unsplash.com/photo-1557064349-d835670beb60?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      alt="International student with USA flag"
      className="rounded-3xl shadow-2xl w-full max-w-2xl mb-10"
      style={{objectFit: 'cover', maxHeight: 260}}
    />
    <div className="flex items-center mb-6">
      <HelpCircle className="h-10 w-10 text-[#D0151C] mr-3" />
      <h1 className="text-4xl md:text-5xl font-black text-white">Frequently Asked Questions</h1>
    </div>
    <div className="max-w-2xl w-full grid gap-8 mt-8">
      {[{
        q: 'What is MatriculaUSA?',
        a: 'MatriculaUSA is a platform that helps international students apply to American universities, find scholarships, and manage the entire admission process online.'
      }, {
        q: 'Who can use MatriculaUSA?',
        a: 'Any student from outside the United States who wants to study at a partner university in the U.S.'
      }, {
        q: 'Are the application fees refundable?',
        a: 'No. All fees are final and non-refundable.'
      }, {
        q: 'How do I contact support?',
        a: 'You can reach our team via the Contact Us page or by email at info@matriculausa.com.'
      }, {
        q: 'How do I know if I am eligible for a scholarship?',
        a: "Eligibility depends on each scholarship's requirements. After creating your profile, you will see which scholarships you qualify for."
      }].map((item, idx) => (
        <div key={idx} className="bg-white/90 rounded-2xl shadow-lg p-6 border-l-4 border-[#D0151C]">
          <h2 className="font-bold text-xl text-[#05294E] mb-2">{item.q}</h2>
          <p className="text-slate-700 text-lg">{item.a}</p>
        </div>
      ))}
    </div>
  </div>
);

export default FAQ; 