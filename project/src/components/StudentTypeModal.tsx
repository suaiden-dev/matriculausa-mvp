import React, { useState } from 'react';

const options = [
  { value: 'initial', label: 'Initial (I am outside the US and need an F-1 student visa)' },
  { value: 'transfer', label: 'Transfer (I am already in the US with an F-1 visa and want to transfer schools)' },
  { value: 'status_change', label: 'Status Change (I am in the US with another visa and want to change to student)' },
];

interface StudentTypeModalProps {
  onConfirm: (type: string) => void;
  onClose: () => void;
}

const StudentTypeModal: React.FC<StudentTypeModalProps> = ({ onConfirm, onClose }) => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
        <h2 className="text-xl font-bold mb-4 text-center">What type of student are you?</h2>
        <div className="space-y-3 mb-6">
          {options.map(opt => (
            <label key={opt.value} className="flex items-center">
              <input
                type="radio"
                name="studentType"
                value={opt.value}
                checked={selected === opt.value}
                onChange={() => setSelected(opt.value)}
                className="mr-2"
              />
              {opt.label}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200">Cancel</button>
          <button
            onClick={() => selected && onConfirm(selected)}
            className="px-4 py-2 rounded bg-blue-600 text-white"
            disabled={!selected}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentTypeModal; 