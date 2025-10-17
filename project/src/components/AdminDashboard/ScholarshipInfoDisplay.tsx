import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface ScholarshipInfoDisplayProps {
  scholarshipId: string;
  metadata?: any;
}

interface ScholarshipData {
  id: string;
  title: string;
  description?: string;
  amount: number;
  field_of_study?: string;
  level?: string;
  universities?: {
    name: string;
  };
  application_fee_amount?: number;
  scholarship_fee_amount?: number;
  annual_value_with_scholarship?: number;
}

const ScholarshipInfoDisplay: React.FC<ScholarshipInfoDisplayProps> = ({ scholarshipId, metadata }) => {
  const [scholarship, setScholarship] = useState<ScholarshipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchScholarship = async () => {
      if (!scholarshipId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const { data, error: fetchError } = await supabase
          .from('scholarships')
          .select(`
            id,
            title,
            description,
            amount,
            field_of_study,
            level,
            application_fee_amount,
            scholarship_fee_amount,
            annual_value_with_scholarship,
            universities(name)
          `)
          .eq('id', scholarshipId)
          .single();

        if (fetchError) throw fetchError;
        setScholarship(data);
      } catch (err) {
        console.error('Error fetching scholarship:', err);
        setError('Failed to load scholarship details');
      } finally {
        setLoading(false);
      }
    };

    fetchScholarship();
  }, [scholarshipId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getLevelLabel = (level?: string) => {
    switch (level) {
      case 'undergraduate': return 'Undergraduate';
      case 'graduate': return 'Graduate';
      case 'doctorate': return 'Doctorate';
      default: return level;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-slate-600 mt-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
        <span>Loading scholarship details...</span>
      </div>
    );
  }

  if (error || !scholarship) {
    return (
      <div className="text-sm text-red-600 mt-2">
        {error || 'Scholarship not found'}
      </div>
    );
  }

  return (
    <div className="mt-2">
      {/* Dropdown Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-slate-500" />
          )}
          <div>
            <span className="text-sm font-medium text-slate-900">{scholarship.title}</span>
            {scholarship.universities?.name && (
              <span className="text-xs text-slate-600 ml-2">• {scholarship.universities.name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">

          <span className="text-xs text-slate-400">ID: {scholarship.id.slice(0, 8)}...</span>
        </div>
      </button>

      {/* Dropdown Content */}
      {isExpanded && (
        <div className="mt-2 bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
          <div className="space-y-3">
            {/* Academic Details */}
            {(scholarship.field_of_study || scholarship.level) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {scholarship.field_of_study && (
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 mb-1">Field of Study</span>
                    <span className="text-sm font-medium text-slate-900">{scholarship.field_of_study}</span>
                  </div>
                )}
                
                {scholarship.level && (
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 mb-1">Level</span>
                    <span className="text-sm font-medium text-slate-900">{getLevelLabel(scholarship.level)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Financial Information */}
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Financial Details</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                
                {scholarship.annual_value_with_scholarship && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-slate-600">Annual Value</span>
                    <span className="text-sm font-medium text-slate-700">
                      {formatCurrency(scholarship.annual_value_with_scholarship)}
                    </span>
                  </div>
                )}
                
                {scholarship.application_fee_amount && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-slate-600">Application Fee</span>
                    <span className="text-sm font-medium text-slate-700">
                      {formatCurrency(scholarship.application_fee_amount)}
                    </span>
                  </div>
                )}
                
                {scholarship.scholarship_fee_amount && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-slate-600">Scholarship Fee</span>
                    <span className="text-sm font-medium text-slate-700">
                      {formatCurrency(scholarship.scholarship_fee_amount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Additional metadata from logs */}
            {metadata?.package_name && (
              <div className="pt-2 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">Package</span>
                  <span className="text-sm font-medium text-blue-600">{metadata.package_name}</span>
                </div>
              </div>
            )}

            {/* Description if available */}
            {scholarship.description && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500 mb-1 block">Description</span>
                <p className="text-sm text-slate-700 leading-relaxed">{scholarship.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarshipInfoDisplay;
