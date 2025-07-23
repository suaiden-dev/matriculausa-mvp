/**
 * Utility functions for date formatting with US timezone (UTC-7)
 */

/**
 * Format a date string to show relative time in US timezone
 * @param dateString - ISO date string
 * @returns Formatted relative time string
 */
export const formatDateUS = (dateString: string): string => {
  // Convert to US timezone (UTC-7)
  const date = new Date(dateString);
  const now = new Date();
  
  // Adjust to UTC-7 (PST/PDT)
  const usTimezone = 'America/Los_Angeles';
  const dateInUS = new Date(date.toLocaleString('en-US', { timeZone: usTimezone }));
  const nowInUS = new Date(now.toLocaleString('en-US', { timeZone: usTimezone }));
  
  const diffInHours = (nowInUS.getTime() - dateInUS.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 0) {
    // Handle future dates (shouldn't happen with emails, but just in case)
    return 'Just now';
  } else if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60);
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 168) {
    const days = Math.floor(diffInHours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    return dateInUS.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      timeZone: usTimezone 
    });
  }
};

/**
 * Format a date string to show full date and time in US timezone
 * @param dateString - ISO date string
 * @returns Formatted date and time string
 */
export const formatDateTimeUS = (dateString: string): string => {
  const date = new Date(dateString);
  const usTimezone = 'America/Los_Angeles';
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: usTimezone
  });
};

/**
 * Get current time in US timezone
 * @returns Current date in US timezone
 */
export const getCurrentTimeUS = (): Date => {
  const now = new Date();
  const usTimezone = 'America/Los_Angeles';
  return new Date(now.toLocaleString('en-US', { timeZone: usTimezone }));
};

/**
 * Check if a date is today in US timezone
 * @param dateString - ISO date string
 * @returns True if the date is today
 */
export const isTodayUS = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  
  const usTimezone = 'America/Los_Angeles';
  const dateInUS = new Date(date.toLocaleDateString('en-US', { timeZone: usTimezone }));
  const nowInUS = new Date(now.toLocaleDateString('en-US', { timeZone: usTimezone }));
  
  return dateInUS.getTime() === nowInUS.getTime();
}; 