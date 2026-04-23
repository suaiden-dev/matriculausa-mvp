import { useState, useMemo } from 'react';
import { useFinancialAnalytics } from './FinancialAnalytics/hooks/useFinancialAnalytics';

import { TimePeriodFilter } from './FinancialAnalytics/components/TimePeriodFilter';
import { MetricsGrid } from './FinancialAnalytics/components/MetricsGrid';
import { RevenueTrendChart } from './FinancialAnalytics/components/RevenueTrendChart';
import { PaymentMethodsChart } from './FinancialAnalytics/components/PaymentMethodsChart';
import { FeeTypesChart } from './FinancialAnalytics/components/FeeTypesChart';
import { UserGrowthChart } from './FinancialAnalytics/components/UserGrowthChart';
import { FinancialTransactionsTable } from './FinancialAnalytics/components/FinancialTransactionsTable';
import { ConversionFunnelChart } from './FinancialAnalytics/components/ConversionFunnelChart';
import { RevenueByUniversityChart } from './FinancialAnalytics/components/RevenueByUniversityChart';
import { AffiliateSalesChart } from './FinancialAnalytics/components/AffiliateSalesChart';
import { CohortRetentionChart } from './FinancialAnalytics/components/CohortRetentionChart';
import { buildFilterBadges } from './FinancialAnalytics/utils/buildFilterBadges';
import FinancialAnalyticsSkeleton from '../../components/FinancialAnalyticsSkeleton';

const FinancialAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');

  const {
    loading,
    refreshing,
    metrics,
    revenueData,
    paymentMethodData,
    feeTypeData,
    transactions,
    timeFilter,
    showCustomDate,
    customDateFrom,
    customDateTo,
    filterFeeType,
    filterPaymentMethod,
    filterValueMin,
    filterValueMax,
    handleRefresh,
    handleExport,
    handleTimeFilterChange,
    handleCustomDateToggle,
    setCustomDateFrom,
    setCustomDateTo,
    toggleFeeType,
    clearFeeType,
    togglePaymentMethod,
    clearPaymentMethod,
    filterAffiliate,
    toggleAffiliate,
    clearAffiliate,
    setFilterValueMin,
    setFilterValueMax,
    affiliates,
    availableFeeTypes,
    availablePaymentMethods,
    arpu,
    funnelData,
    universityRevenueData,
    affiliateSalesData,
    cohortRetentionData
  } = useFinancialAnalytics();

  // Badges dos filtros ativos — recomputados apenas quando os filtros mudam
  const activeFilters = useMemo(
    () => buildFilterBadges(filterFeeType, filterPaymentMethod, filterAffiliate, affiliates, filterValueMin, filterValueMax),
    [filterFeeType, filterPaymentMethod, filterAffiliate, affiliates, filterValueMin, filterValueMax]
  );

  if (loading) {
    return <FinancialAnalyticsSkeleton />;
  }

  return (
    <div className="p-6 space-y-6">
      <TimePeriodFilter
        timeFilter={timeFilter}
        showCustomDate={showCustomDate}
        customDateFrom={customDateFrom}
        customDateTo={customDateTo}
        filterFeeType={filterFeeType}
        filterPaymentMethod={filterPaymentMethod}
        filterValueMin={filterValueMin}
        filterValueMax={filterValueMax}
        filterAffiliate={filterAffiliate}
        affiliates={affiliates}
        availableFeeTypes={availableFeeTypes}
        availablePaymentMethods={availablePaymentMethods}
        onTimeFilterChange={handleTimeFilterChange}
        onCustomDateToggle={handleCustomDateToggle}
        onCustomDateFromChange={setCustomDateFrom}
        onCustomDateToChange={setCustomDateTo}
        onToggleFeeType={toggleFeeType}
        onClearFeeType={clearFeeType}
        onTogglePaymentMethod={togglePaymentMethod}
        onClearPaymentMethod={clearPaymentMethod}
        onFilterValueMinChange={setFilterValueMin}
        onFilterValueMaxChange={setFilterValueMax}
        onToggleAffiliate={toggleAffiliate}
        onClearAffiliate={clearAffiliate}
        onRefresh={handleRefresh}
        onExport={handleExport}
        refreshing={refreshing}
      />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Transaction Details
          </button>
        </nav>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Row 1: KPI Cards */}
          <MetricsGrid metrics={metrics} arpu={arpu} />

          {/* Row 2: Revenue Trend */}
          <RevenueTrendChart revenueData={revenueData} activeFilters={activeFilters} />

          {/* Row 3: User Growth */}
          <UserGrowthChart data={revenueData} activeFilters={activeFilters} />

          {/* Row 4: Payment Methods + Fee Types */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PaymentMethodsChart paymentMethodData={paymentMethodData} activeFilters={activeFilters} />
            <FeeTypesChart feeTypeData={feeTypeData} activeFilters={activeFilters} />
          </div>

          {/* Row 5: Conversion Funnel + Revenue by University */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ConversionFunnelChart funnelData={funnelData} totalStudents={metrics.totalStudents} activeFilters={activeFilters} />
            <RevenueByUniversityChart data={universityRevenueData} activeFilters={activeFilters} />
          </div>

          {/* Row 6: Affiliate Sales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AffiliateSalesChart affiliateSalesData={affiliateSalesData} activeFilters={activeFilters} />
          </div>

          {/* Row 7: Cohort Retention */}
          <CohortRetentionChart data={cohortRetentionData} />

        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          <FinancialTransactionsTable
            transactions={transactions}
            loading={loading || refreshing}
          />
        </div>
      )}
    </div>
  );
};

export default FinancialAnalytics;
