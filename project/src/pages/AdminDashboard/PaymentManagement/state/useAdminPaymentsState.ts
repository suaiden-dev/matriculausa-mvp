import { useState, useCallback, useMemo } from 'react';

// Placeholder types to be refined during wiring without changing UI contracts
type AnyRecord = Record<string, any>;

export interface AdminPaymentsFilters extends AnyRecord {}

export interface AdminPaymentsStateReturn {
	filters: AdminPaymentsFilters;
	setFilters: (updater: (prev: AdminPaymentsFilters) => AdminPaymentsFilters) => void;
	loading: boolean;
	setLoading: (value: boolean) => void;
	currentPage: number;
	setCurrentPage: (page: number) => void;
	pageSize: number;
	setPageSize: (size: number) => void;
	selectedPayments: Set<string>;
	setSelectedPayments: (next: Set<string>) => void;
	selectAll: boolean;
	setSelectAll: (value: boolean) => void;
	showDetails: boolean;
	setShowDetails: (value: boolean) => void;
	selectedPayment: any;
	setSelectedPayment: (value: any) => void;
	viewMode: 'grid' | 'list';
	setViewMode: (value: 'grid' | 'list') => void;
	activeTab: string;
	setActiveTab: (tab: string) => void;
}

export function useAdminPaymentsState(): AdminPaymentsStateReturn {
	const [filters, setFiltersState] = useState<AdminPaymentsFilters>({});
	const [loading, setLoading] = useState<boolean>(false);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [pageSize, setPageSize] = useState<number>(25);
	const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
	const [selectAll, setSelectAll] = useState<boolean>(false);
	const [showDetails, setShowDetails] = useState<boolean>(false);
	const [selectedPayment, setSelectedPayment] = useState<any>(null);
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
	const [activeTab, setActiveTab] = useState<string>('payments');

	const setFilters = useCallback(
		(updater: (prev: AdminPaymentsFilters) => AdminPaymentsFilters) => {
			setFiltersState(prev => updater(prev));
		},
		[]
	);

	useMemo(() => selectedPayments, [selectedPayments]);

	return {
		filters,
		setFilters,
		loading,
		setLoading,
		currentPage,
		setCurrentPage,
		pageSize,
		setPageSize,
		selectedPayments,
		setSelectedPayments,
		selectAll,
		setSelectAll,
		showDetails,
		setShowDetails,
		selectedPayment,
		setSelectedPayment,
		viewMode,
		setViewMode,
		activeTab,
		setActiveTab,
	};
}


