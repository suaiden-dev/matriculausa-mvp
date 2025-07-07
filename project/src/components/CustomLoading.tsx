import React from 'react';

interface CustomLoadingProps {
  color?: string;
  title?: string;
  message?: string;
}

const CustomLoading: React.FC<CustomLoadingProps> = ({
  color = 'green',
  title = 'Verifying Payment...',
  message = 'Please wait while we confirm your payment.'
}) => {
  const colorClass = color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-600' : 'text-blue-600';
  const titleClass = color === 'green' ? 'text-green-700' : color === 'red' ? 'text-red-700' : 'text-blue-700';
  return (
    <>
      <svg className={`h-16 w-16 ${colorClass} mb-4 animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      </svg>
      <h1 className={`text-3xl font-bold ${titleClass} mb-2`}>{title}</h1>
      <p className="text-slate-700 mb-6 text-center">{message}</p>
    </>
  );
};

export default CustomLoading; 