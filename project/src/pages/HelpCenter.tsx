import React from 'react';
import { User, FileText, CreditCard, UploadCloud, CheckCircle } from 'lucide-react';

const HelpCenter: React.FC = () => (
  <div className="min-h-screen bg-[#05294E] flex flex-col items-center py-16 px-4">
    <img
      src="https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=800&q=80"
      alt="Student using computer"
      className="rounded-3xl shadow-2xl w-full max-w-2xl mb-10"
      style={{objectFit: 'cover', maxHeight: 220}}
    />
    <h1 className="text-4xl md:text-5xl font-black text-white mb-8">Help Center</h1>
    <div className="max-w-2xl w-full grid gap-8">
      <div className="bg-white/90 rounded-2xl shadow-lg p-6 flex items-center border-l-4 border-[#D0151C]">
        <User className="h-8 w-8 text-[#05294E] mr-4" />
        <div>
          <h2 className="font-bold text-xl text-[#05294E] mb-1">Creating your profile</h2>
          <p className="text-slate-700">Step-by-step guidance to set up your academic and personal information.</p>
        </div>
      </div>
      <div className="bg-white/90 rounded-2xl shadow-lg p-6 flex items-center border-l-4 border-[#D0151C]">
        <FileText className="h-8 w-8 text-[#05294E] mr-4" />
        <div>
          <h2 className="font-bold text-xl text-[#05294E] mb-1">Understanding the application process</h2>
          <p className="text-slate-700">Learn how to apply, track your progress, and what to expect at each stage.</p>
        </div>
      </div>
      <div className="bg-white/90 rounded-2xl shadow-lg p-6 flex items-center border-l-4 border-[#D0151C]">
        <CreditCard className="h-8 w-8 text-[#05294E] mr-4" />
        <div>
          <h2 className="font-bold text-xl text-[#05294E] mb-1">Paying fees</h2>
          <p className="text-slate-700">How to pay, check payment status, and understand non-refundable fees.</p>
        </div>
      </div>
      <div className="bg-white/90 rounded-2xl shadow-lg p-6 flex items-center border-l-4 border-[#D0151C]">
        <UploadCloud className="h-8 w-8 text-[#05294E] mr-4" />
        <div>
          <h2 className="font-bold text-xl text-[#05294E] mb-1">Uploading documents</h2>
          <p className="text-slate-700">Tips for uploading transcripts, IDs, and other required files.</p>
        </div>
      </div>
      <div className="bg-white/90 rounded-2xl shadow-lg p-6 flex items-center border-l-4 border-[#D0151C]">
        <CheckCircle className="h-8 w-8 text-[#05294E] mr-4" />
        <div>
          <h2 className="font-bold text-xl text-[#05294E] mb-1">Tracking your application</h2>
          <p className="text-slate-700">Monitor your status and next steps after submission.</p>
        </div>
      </div>
      <p className="text-slate-200 text-center mt-8">If you need further assistance, please check our FAQ or contact our support team.</p>
    </div>
  </div>
);

export default HelpCenter; 