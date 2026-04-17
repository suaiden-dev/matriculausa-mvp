import { useState, useRef, useEffect } from 'react';
import { Filter, ChevronRight, Calendar, Tag, CreditCard, Users, DollarSign, X, RefreshCw, Download } from 'lucide-react';
import type { TimeFilter } from '../data/types';
import { formatPeriodLabel } from '../utils/dateRange';

export interface TimePeriodFilterProps {
  timeFilter: TimeFilter;
  showCustomDate: boolean;
  customDateFrom: string;
  customDateTo: string;
  filterFeeType: string[];
  filterPaymentMethod: string[];
  filterValueMin: string;
  filterValueMax: string;
  filterAffiliate: string[];
  affiliates: any[];
  onTimeFilterChange: (filter: TimeFilter) => void;
  onCustomDateToggle: () => void;
  onCustomDateFromChange: (date: string) => void;
  onCustomDateToChange: (date: string) => void;
  onToggleFeeType: (feeType: string) => void;
  onClearFeeType: () => void;
  onTogglePaymentMethod: (method: string) => void;
  onClearPaymentMethod: () => void;
  onFilterValueMinChange: (value: string) => void;
  onFilterValueMaxChange: (value: string) => void;
  onToggleAffiliate: (affiliateId: string) => void;
  onClearAffiliate: () => void;
  onRefresh: () => void;
  onExport: () => void;
  refreshing: boolean;
  availableFeeTypes: string[];
  availablePaymentMethods: string[];
}

export function TimePeriodFilter({
  timeFilter,
  showCustomDate,
  customDateFrom,
  customDateTo,
  filterFeeType,
  filterPaymentMethod,
  filterValueMin,
  filterValueMax,
  filterAffiliate,
  affiliates,
  onTimeFilterChange,
  onCustomDateToggle,
  onCustomDateFromChange,
  onCustomDateToChange,
  onToggleFeeType,
  onClearFeeType,
  onTogglePaymentMethod,
  onClearPaymentMethod,
  onFilterValueMinChange,
  onFilterValueMaxChange,
  onToggleAffiliate,
  onClearAffiliate,
  onRefresh,
  onExport,
  refreshing,
  availableFeeTypes,
  availablePaymentMethods
}: TimePeriodFilterProps) {
  const [isFeeTypeOpen, setIsFeeTypeOpen] = useState(false);
  const [isPaymentMethodOpen, setIsPaymentMethodOpen] = useState(false);
  const [isAffiliateOpen, setIsAffiliateOpen] = useState(false);

  const feeTypeRef = useRef<HTMLDivElement>(null);
  const paymentMethodRef = useRef<HTMLDivElement>(null);
  const affiliateRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (feeTypeRef.current && !feeTypeRef.current.contains(event.target as Node)) {
        setIsFeeTypeOpen(false);
      }
      if (paymentMethodRef.current && !paymentMethodRef.current.contains(event.target as Node)) {
        setIsPaymentMethodOpen(false);
      }
      if (affiliateRef.current && !affiliateRef.current.contains(event.target as Node)) {
        setIsAffiliateOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format fee type label
  const formatFeeType = (type: string) => {
    switch (type) {
      case 'selection_process_fee':
      case 'selection_process':
        return 'Selection Process';
      case 'application_fee':
      case 'application':
        return 'Application Fee';
      case 'scholarship_fee':
      case 'scholarship':
        return 'Scholarship Fee';
      case 'i20_control_fee':
      case 'i20_control':
        return 'I-20 Control Fee';
      case 'ds160_package':
        return 'DS-160 Package';
      case 'i539_package':
        return 'I-539 Package';
      case 'placement':
      case 'placement_fee':
        return 'Placement Fee';
      case 'reinstatement_fee':
      case 'reinstatement':
      case 'reinstatement_package':
        return 'Reinstatement Fee';
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatPaymentMethod = (method: string) => {
    if (!method || method === 'manual') return 'Outside Payments';
    return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
  };


  const hasActiveFilters = filterFeeType.length > 0 || 
                           filterPaymentMethod.length > 0 || 
                           filterAffiliate.length > 0 || 
                           filterValueMin || 
                           filterValueMax;

  const clearAllFilters = () => {
    onClearFeeType();
    onClearPaymentMethod();
    onClearAffiliate();
    onFilterValueMinChange('');
    onFilterValueMaxChange('');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
      {/* Dashboard Header Style */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Filter className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">Analytics Filters</h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Configure your data view</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 mr-2">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm hover:shadow"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'REFRESHING...' : 'REFRESH'}
            </button>
            
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
            >
              <Download className="h-3.5 w-3.5" />
              EXPORT
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">Period: {formatPeriodLabel(timeFilter, showCustomDate)}</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
            >
              <X className="h-3.5 w-3.5" />
              CLEAR ALL
            </button>
          )}
        </div>
      </div>
      
      <div className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Section 1: Time & Period (4 cols) */}
        <div className="xl:col-span-4 space-y-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Time Period</span>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-5 gap-1 p-1 bg-gray-100 rounded-xl">
              {(['7d', '30d', '90d', '1y', 'all'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => onTimeFilterChange(period)}
                  className={`py-2 text-[10px] font-bold rounded-lg transition-all ${
                    timeFilter === period && !showCustomDate
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {period === '7d' ? '7D' :
                   period === '30d' ? '30D' :
                   period === '90d' ? '90D' :
                   period === '1y' ? '1Y' : 'ALL'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">From</label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => {
                    onCustomDateFromChange(e.target.value);
                    if (!showCustomDate) onCustomDateToggle();
                  }}
                  className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${
                    showCustomDate ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">To</label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => {
                    onCustomDateToChange(e.target.value);
                    if (!showCustomDate) onCustomDateToggle();
                  }}
                  className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${
                    showCustomDate ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Categories (4 cols) */}
        <div className="xl:col-span-4 space-y-4 xl:border-x xl:px-8 border-gray-100">
          <div className="flex items-center gap-2 text-gray-400">
            <Tag className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Classification</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Fee Type */}
            <div className="space-y-1" ref={feeTypeRef}>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Fee Category</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsFeeTypeOpen(!isFeeTypeOpen);
                    setIsPaymentMethodOpen(false);
                    setIsAffiliateOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm border rounded-xl transition-all bg-white ${
                    filterFeeType.length > 0 ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500' : 'border-gray-200'
                  }`}
                >
                  <span className="truncate font-medium text-gray-700">
                    {filterFeeType.length === 0 ? 'All Categories' : `${filterFeeType.length} Selected`}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isFeeTypeOpen ? 'rotate-90' : ''}`} />
                </button>

                {isFeeTypeOpen && (
                  <div className="absolute left-0 mt-2 p-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 w-full min-w-[240px] max-h-64 overflow-y-auto transform origin-top animate-in fade-in zoom-in duration-200">
                      {availableFeeTypes.map(type => (
                        <label key={type} className={`flex items-center gap-3 p-2.5 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors ${filterFeeType.includes(type) ? 'bg-blue-50/50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={filterFeeType.includes(type)}
                            onChange={() => onToggleFeeType(type)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded-md focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">{formatFeeType(type)}</span>
                        </label>
                      ))}
                    </div>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-1" ref={paymentMethodRef}>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Payment Method</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsPaymentMethodOpen(!isPaymentMethodOpen);
                    setIsFeeTypeOpen(false);
                    setIsAffiliateOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm border rounded-xl transition-all bg-white ${
                    filterPaymentMethod.length > 0 ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500' : 'border-gray-200'
                  }`}
                >
                  <span className="truncate font-medium text-gray-700">
                    {filterPaymentMethod.length === 0 ? 'All Methods' : `${filterPaymentMethod.length} Selected`}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isPaymentMethodOpen ? 'rotate-90' : ''}`} />
                </button>

                {isPaymentMethodOpen && (
                  <div className="absolute left-0 mt-2 p-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 w-full min-w-[200px] max-h-64 overflow-y-auto transform origin-top animate-in fade-in zoom-in duration-200">
                      {availablePaymentMethods.map(method => (
                        <label key={method} className={`flex items-center gap-3 p-2.5 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors ${filterPaymentMethod.includes(method) ? 'bg-blue-50/50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={filterPaymentMethod.includes(method)}
                            onChange={() => onTogglePaymentMethod(method)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded-md focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">{formatPaymentMethod(method)}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Entity & Values (4 cols) */}
        <div className="xl:col-span-4 space-y-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Details & Value</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Affiliate */}
            <div className="space-y-1" ref={affiliateRef}>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Admin Affiliate</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsAffiliateOpen(!isAffiliateOpen);
                    setIsFeeTypeOpen(false);
                    setIsPaymentMethodOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm border rounded-xl transition-all bg-white ${
                    filterAffiliate.length > 0 ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500' : 'border-gray-200'
                  }`}
                >
                  <span className="truncate font-medium text-gray-700">
                    {filterAffiliate.length === 0 ? 'All Affiliates' : `${filterAffiliate.length} Selected`}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isAffiliateOpen ? 'rotate-90' : ''}`} />
                </button>

                {isAffiliateOpen && (
                  <div className="absolute right-0 mt-2 p-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 w-full min-w-[240px] max-h-64 overflow-y-auto transform origin-top animate-in fade-in zoom-in duration-200">
                      {affiliates.map(affiliate => (
                        <label key={affiliate.id} className={`flex items-center gap-3 p-2.5 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors ${filterAffiliate.includes(affiliate.id) ? 'bg-blue-50/50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={filterAffiliate.includes(affiliate.id)}
                            onChange={() => onToggleAffiliate(affiliate.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded-md focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">{affiliate.name || affiliate.email}</span>
                        </label>
                      ))}
                    </div>
                )}
              </div>
            </div>

            {/* Value Range */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Value Range (USD)</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="number"
                    placeholder="Min"
                    value={filterValueMin}
                    onChange={(e) => onFilterValueMinChange(e.target.value)}
                    className={`w-full pl-8 pr-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${
                      filterValueMin ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white'
                    }`}
                  />
                </div>
                <div className="h-px w-4 bg-gray-200" />
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filterValueMax}
                    onChange={(e) => onFilterValueMaxChange(e.target.value)}
                    className={`w-full pl-8 pr-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${
                      filterValueMax ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
