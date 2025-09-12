import React from 'react';

interface AnalyzingLoaderProps {
  message?: string;
}

export const AnalyzingLoader: React.FC<AnalyzingLoaderProps> = ({ message = 'Analyzing uploaded documents...' }) => (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[1000]">
    <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 relative animate-fade-in flex flex-col items-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-6"></div>
      <h2 className="text-2xl font-extrabold mb-2 text-slate-800 text-center">{message}</h2>
      <p className="text-slate-500 text-center">This may take up to 1 minute.</p>
    </div>
  </div>
);

export default AnalyzingLoader;
