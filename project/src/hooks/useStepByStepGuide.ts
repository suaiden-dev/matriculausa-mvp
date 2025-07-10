import { useState, useEffect, useCallback } from 'react';

export const useStepByStepGuide = () => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);

  // Verificar se o usuário já viu o guia
  useEffect(() => {
    const seen = localStorage.getItem('stepByStepGuideSeen');
    if (seen === 'true') {
      setHasSeenGuide(true);
    }
  }, []);

  // Verificar se deve mostrar o guia automaticamente
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldShowGuide = params.get('guide') === 'show' || 
                           (!hasSeenGuide && params.get('new') === 'true');
    
    if (shouldShowGuide) {
      setIsGuideOpen(true);
    }
  }, [hasSeenGuide]);

  const openGuide = useCallback(() => {
    setIsGuideOpen(true);
  }, []);

  const closeGuide = useCallback(() => {
    setIsGuideOpen(false);
    setHasSeenGuide(true);
    localStorage.setItem('stepByStepGuideSeen', 'true');
  }, []);

  const resetGuide = useCallback(() => {
    localStorage.removeItem('stepByStepGuideSeen');
    setHasSeenGuide(false);
    setIsGuideOpen(false);
  }, []);

  const showGuideForNewUser = useCallback(() => {
    if (!hasSeenGuide) {
      setIsGuideOpen(true);
    }
  }, [hasSeenGuide]);

  return {
    isGuideOpen,
    hasSeenGuide,
    openGuide,
    closeGuide,
    resetGuide,
    showGuideForNewUser
  };
}; 