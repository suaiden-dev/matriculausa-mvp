import React from 'react';
import { useFinancialAnalytics } from './FinancialAnalytics/hooks/useFinancialAnalytics';
import { Header } from './FinancialAnalytics/components/Header';
import { TimePeriodFilter } from './FinancialAnalytics/components/TimePeriodFilter';
import { MetricsGrid } from './FinancialAnalytics/components/MetricsGrid';
import { RevenueTrendChart } from './FinancialAnalytics/components/RevenueTrendChart';
import { PaymentMethodsChart } from './FinancialAnalytics/components/PaymentMethodsChart';
import { FeeTypesChart } from './FinancialAnalytics/components/FeeTypesChart';
import { StripeAnalytics } from './FinancialAnalytics/components/StripeAnalytics';
import FinancialAnalyticsSkeleton from '../../components/FinancialAnalyticsSkeleton';

const FinancialAnalytics: React.FC = () => {
  console.log('🚀 [FinancialAnalytics] Componente renderizado');
  
  const {
    loading,
    refreshing,
    metrics,
    stripeMetrics,
    revenueData,
    paymentMethodData,
    feeTypeData,
    timeFilter,
    showCustomDate,
    customDateFrom,
    customDateTo,
    handleRefresh,
    handleExport,
    handleTimeFilterChange,
    handleCustomDateToggle,
    setCustomDateFrom,
    setCustomDateTo
  } = useFinancialAnalytics();
  
  console.log('🚀 [FinancialAnalytics] Estado do hook:', { loading, refreshing });

  if (loading) {
    return <FinancialAnalyticsSkeleton />;
  }

  return (
    <div className="p-6 space-y-6">
      <Header 
        onRefresh={handleRefresh}
        onExport={handleExport}
        refreshing={refreshing}
      />

      <TimePeriodFilter
        timeFilter={timeFilter}
        showCustomDate={showCustomDate}
        customDateFrom={customDateFrom}
        customDateTo={customDateTo}
        onTimeFilterChange={handleTimeFilterChange}
        onCustomDateToggle={handleCustomDateToggle}
        onCustomDateFromChange={setCustomDateFrom}
        onCustomDateToChange={setCustomDateTo}
      />

      <MetricsGrid metrics={metrics} />

      <RevenueTrendChart revenueData={revenueData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentMethodsChart paymentMethodData={paymentMethodData} />
        <FeeTypesChart feeTypeData={feeTypeData} />
      </div>
    </div>
  );
};

export default FinancialAnalytics;
