import React from 'react';
import { useSystemType } from '../hooks/useSystemType';

interface ConditionalPackageDisplayProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that only shows package-related content for legacy system
 * Hides package selection for simplified system
 */
export const ConditionalPackageDisplay: React.FC<ConditionalPackageDisplayProps> = ({ 
  children, 
  fallback = null 
}) => {
  const { systemType } = useSystemType();
  
  // Only show packages for legacy system
  if (systemType === 'legacy') {
    return <>{children}</>;
  }
  
  // For simplified system, show fallback or nothing
  return <>{fallback}</>;
};

/**
 * Component that only shows simplified system content
 * Hides for legacy system
 */
export const SimplifiedSystemOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { systemType } = useSystemType();
  
  if (systemType === 'simplified') {
    return <>{children}</>;
  }
  
  return null;
};

/**
 * Component that only shows legacy system content
 * Hides for simplified system
 */
export const LegacySystemOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { systemType } = useSystemType();
  
  if (systemType === 'legacy') {
    return <>{children}</>;
  }
  
  return null;
};
