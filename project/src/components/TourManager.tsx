import React from 'react';
import OnboardingTour, { TOUR_STEPS } from './OnboardingTour/OnboardingTour';
import { useOnboardingTour } from '../hooks/useOnboardingTour';
import TourTestButton from './TourTestButton';

const TourManager: React.FC = () => {
  const { runTour, setRunTour, finishTour } = useOnboardingTour();

  const handleSetRunTour = (val: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof val === 'function' ? val(runTour) : val;
    setRunTour(newValue);
    if (!newValue) {
      finishTour();
    }
  };

  return (
    <>
      <OnboardingTour run={runTour} setRun={handleSetRunTour} steps={TOUR_STEPS} />
      {process.env.NODE_ENV === 'development' && (
        <TourTestButton onStartTour={() => setRunTour(true)} />
      )}
    </>
  );
};

export default TourManager; 