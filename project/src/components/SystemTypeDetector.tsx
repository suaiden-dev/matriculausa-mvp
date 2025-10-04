import React from 'react';
import { useSystemType } from '../hooks/useSystemType';

interface SystemTypeDetectorProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const SystemTypeDetector: React.FC<SystemTypeDetectorProps> = ({ 
  children, 
  fallback = <div>Loading system type...</div> 
}) => {
  const { systemType, loading, error } = useSystemType();

  if (loading) {
    return <>{fallback}</>;
  }

  if (error) {
    console.error('System type detection error:', error);
    // Default to legacy system on error
    return <>{children}</>;
  }

  return <>{children}</>;
};

// Componente para mostrar apenas em sistema legacy
export const LegacySystemOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { systemType } = useSystemType();
  
  if (systemType === 'legacy') {
    return <>{children}</>;
  }
  
  return null;
};

// Componente para mostrar apenas em sistema simplified
export const SimplifiedSystemOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { systemType } = useSystemType();
  
  if (systemType === 'simplified') {
    return <>{children}</>;
  }
  
  return null;
};
