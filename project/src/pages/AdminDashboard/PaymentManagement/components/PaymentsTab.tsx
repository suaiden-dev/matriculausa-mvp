import React from 'react';
import { StatsHeader } from './StatsHeader';
import { FiltersBar } from './FiltersBar';
import { BulkActionsBar } from './BulkActionsBar';
import { PaymentsTable } from './PaymentsTable';
import { PaymentsGrid } from './PaymentsGrid';
import type { PaymentRecord, PaymentStats } from '../data/types';
import { PaginationBar } from './PaginationBar';

type ViewMode = 'grid' | 'list';

interface PaymentsTabProps {
  stats: PaymentStats;
  payments: PaymentRecord[];
  sortedPayments: PaymentRecord[];
  currentPayments: PaymentRecord[];
  universities: any[];
  affiliates: any[];
  filters: any;
  setFilters: (next: any) => void;
  viewMode: ViewMode;
  handleViewModeChange: (mode: ViewMode) => void;
  FEE_TYPES: { value: string; label: string; color: string }[];
  STATUS_OPTIONS: { value: string; label: string }[];
  selectedPayments: Set<string>;
  selectAll: boolean;
  handleSelectAll: () => void;
  handleSelectPayment: (id: string) => void;
  handleSort: (field: keyof PaymentRecord) => void;
  sortBy: keyof PaymentRecord;
  sortOrder: 'asc' | 'desc';
  handleExport: () => void;
  handleViewDetails: (payment: PaymentRecord) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  calculateSelectedTotals: () => { totalAmount: number; breakdownByMethod: Record<string, { count: number; amount: number }>; totalCount: number };
  currentPage: number;
  totalPages: number;
  backendTotalCount: number | null;
  startIndex: number;
  endIndex: number;
  itemsPerPage: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onGoTo: (page: number) => void;
  pageNumbers: number[];
  onItemsPerPageChange: (n: number) => void;
  isLoading?: boolean; // ✅ NOVO: Estado de loading para mostrar skeletons nos valores
}

export function PaymentsTab(props: PaymentsTabProps) {
  const {
    stats,
    payments,
    sortedPayments,
    currentPayments,
    universities,
    affiliates,
    filters,
    setFilters,
    viewMode,
    handleViewModeChange,
    FEE_TYPES,
    STATUS_OPTIONS,
    selectedPayments,
    selectAll,
    handleSelectAll,
    handleSelectPayment,
    handleSort,
    sortBy,
    sortOrder,
    handleExport,
    handleViewDetails,
    showFilters,
    setShowFilters,
    calculateSelectedTotals,
    currentPage,
    totalPages,
    backendTotalCount,
    startIndex,
    endIndex,
    itemsPerPage,
    onFirst,
    onPrev,
    onNext,
    onLast,
    onGoTo,
    pageNumbers,
    onItemsPerPageChange,
  } = props;

  return (
    <>
      <StatsHeader stats={stats} payments={payments} />

      {selectedPayments.size > 0 && (
        <BulkActionsBar selectedTotals={calculateSelectedTotals()} onClearSelection={() => {}} />
      )}

      <FiltersBar
        showFilters={showFilters}
        setShowFilters={setShowFilters as any}
        handleExport={handleExport}
        viewMode={viewMode}
        handleViewModeChange={handleViewModeChange}
        filters={filters}
        setFilters={(next: any) => { setFilters(next); }}
        universities={universities}
        affiliates={affiliates}
        FEE_TYPES={FEE_TYPES}
        STATUS_OPTIONS={STATUS_OPTIONS}
        resetFilters={() => setFilters({ search: '', university: 'all', feeType: 'all', status: 'paid', dateFrom: undefined, dateTo: undefined, affiliate: 'all', paymentMethod: 'all' })}
        sortedPayments={sortedPayments}
        payments={payments}
        currentPage={currentPage}
        totalPages={totalPages}
        backendTotalCount={backendTotalCount}
      />

      {viewMode === 'list' ? (
        <PaymentsTable
          viewMode={viewMode}
          currentPayments={currentPayments}
          selectAll={selectAll}
          handleSelectAll={handleSelectAll}
          selectedPayments={selectedPayments}
          handleSelectPayment={handleSelectPayment}
          handleSort={handleSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
          FEE_TYPES={FEE_TYPES}
          handleViewDetails={handleViewDetails}
          isLoading={props.isLoading} // ✅ NOVO: Passar estado de loading
        />
      ) : (
        <PaymentsGrid currentPayments={currentPayments} FEE_TYPES={FEE_TYPES} handleViewDetails={handleViewDetails} isLoading={props.isLoading} /> // ✅ NOVO: Passar estado de loading
      )}

      {sortedPayments.length > 0 && totalPages > 1 && (
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={sortedPayments.length}
          itemsPerPage={itemsPerPage}
          onFirst={onFirst}
          onPrev={onPrev}
          onNext={onNext}
          onLast={onLast}
          onGoTo={onGoTo}
          onItemsPerPageChange={onItemsPerPageChange}
          pageNumbers={pageNumbers}
        />
      )}
    </>
  );
}


