import React from 'react';
import { Play } from 'lucide-react';

interface TourTestButtonProps {
  onStartTour: () => void;
}

const TourTestButton: React.FC<TourTestButtonProps> = ({ onStartTour }) => {
  return (
    <button
      onClick={onStartTour}
      className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 z-50 flex items-center gap-2"
      title="Testar Tour de Onboarding"
    >
      <Play className="h-4 w-4" />
      <span className="hidden sm:inline">Testar Tour</span>
    </button>
  );
};

export default TourTestButton; 