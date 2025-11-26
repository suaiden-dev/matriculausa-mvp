import React, { useState } from 'react';
import { useFinancialAnalytics } from './FinancialAnalytics/hooks/useFinancialAnalytics';
import { Header } from './FinancialAnalytics/components/Header';
import { TimePeriodFilter } from './FinancialAnalytics/components/TimePeriodFilter';
import { MetricsGrid } from './FinancialAnalytics/components/MetricsGrid';
import { RevenueTrendChart } from './FinancialAnalytics/components/RevenueTrendChart';
import { PaymentMethodsChart } from './FinancialAnalytics/components/PaymentMethodsChart';
import { FeeTypesChart } from './FinancialAnalytics/components/FeeTypesChart';
import { StripeAnalytics } from './FinancialAnalytics/components/StripeAnalytics';
import { FinancialTransactionsTable } from './FinancialAnalytics/components/FinancialTransactionsTable';
import FinancialAnalyticsSkeleton from '../../components/FinancialAnalyticsSkeleton';

const FinancialAnalytics: React.FC = () => {
  console.log('🚀 [FinancialAnalytics] Componente renderizado');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
  
  const {
    loading,
    refreshing,
    metrics,
    stripeMetrics,
    revenueData,
    paymentMethodData,
    feeTypeData,
    transactions,
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Transações Detalhadas
          </button>
        </nav>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <MetricsGrid metrics={metrics} />

          <RevenueTrendChart revenueData={revenueData} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PaymentMethodsChart paymentMethodData={paymentMethodData} />
            <FeeTypesChart feeTypeData={feeTypeData} />
          </div>
          <StripeAnalytics metrics={stripeMetrics} loading={loading || refreshing} />
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
