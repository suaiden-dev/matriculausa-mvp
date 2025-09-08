// Utility function to map document status to user-friendly text
export const getDocumentStatusDisplay = (status: string): { text: string; color: string; bgColor: string } => {
  const statusMap: Record<string, { text: string; color: string; bgColor: string }> = {
    // Legacy statuses
    'approved': { text: 'Approved', color: 'text-green-700', bgColor: 'bg-green-500' },
    'rejected': { text: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-500' },
    'pending': { text: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-500' },
    'analyzing': { text: 'Under Review', color: 'text-blue-700', bgColor: 'bg-blue-500' },
    'under_review': { text: 'Under Review', color: 'text-blue-700', bgColor: 'bg-blue-500' },
    
    // New dynamic statuses from the database
    'all_pending': { text: 'All Documents Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-500' },
    'all_approved': { text: 'All Documents Approved', color: 'text-green-700', bgColor: 'bg-green-500' },
    'partially_approved': { text: 'Partially Approved', color: 'text-orange-700', bgColor: 'bg-orange-500' },
    'has_rejected': { text: 'Has Rejected Documents', color: 'text-red-700', bgColor: 'bg-red-500' },
    'no_documents': { text: 'No Documents', color: 'text-slate-600', bgColor: 'bg-slate-400' },
    
    // Fallback
    'default': { text: 'Not Started', color: 'text-slate-600', bgColor: 'bg-slate-400' }
  };

  return statusMap[status] || statusMap['default'];
};

// Function to get only the text for simple display
export const getDocumentStatusText = (status: string): string => {
  return getDocumentStatusDisplay(status).text;
};

// Function to get only the color classes for styling
export const getDocumentStatusColors = (status: string): { color: string; bgColor: string } => {
  const display = getDocumentStatusDisplay(status);
  return { color: display.color, bgColor: display.bgColor };
};
