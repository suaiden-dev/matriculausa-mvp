import React from 'react';
import { Filter, Download, Search, List, Grid3X3 } from 'lucide-react';

export interface FiltersBarProps {
	showFilters: boolean;
	setShowFilters: (v: boolean) => void;
	handleExport: () => void;
	viewMode: 'grid' | 'list';
	handleViewModeChange: (mode: 'grid' | 'list') => void;
	filters: any;
	setFilters: (next: any) => void;
	universities: any[];
	affiliates: any[];
	FEE_TYPES: { value: string; label: string }[];
	STATUS_OPTIONS: { value: string; label: string }[];
	resetFilters: () => void;
	sortedPayments: any[];
	payments: any[];
	currentPage: number;
	totalPages: number;
  backendTotalCount?: number | null;
}

function FiltersBarBase(props: FiltersBarProps) {
	const {
		showFilters,
		setShowFilters,
		handleExport,
		viewMode,
		handleViewModeChange,
		filters,
		setFilters,
		universities,
		affiliates,
		FEE_TYPES,
		STATUS_OPTIONS,
		resetFilters,
		sortedPayments,
		payments,
		currentPage,
		totalPages,
    backendTotalCount,
	} = props;

	const searchTimeoutRef = React.useRef<number | null>(null);
	// Estado local para feedback visual imediato no input
	const [localSearchValue, setLocalSearchValue] = React.useState(filters.search || '');

	// Sincronizar estado local quando filtro externo mudar (ex: reset)
	React.useEffect(() => {
		setLocalSearchValue(filters.search || '');
	}, [filters.search]);

	const handleSearchChange = (value: string) => {
		// Atualizar input imediatamente para feedback visual
		setLocalSearchValue(value);
		
		// Limpar timeout anterior
		if (searchTimeoutRef.current) {
			window.clearTimeout(searchTimeoutRef.current);
		}
		
		// Aplicar filtro apenas após 600ms sem digitação (aumentado de 300ms para melhor performance)
		searchTimeoutRef.current = window.setTimeout(() => {
			setFilters({ ...filters, search: value });
		}, 600);
	};

	// Cleanup do timeout ao desmontar
	React.useEffect(() => {
		return () => {
			if (searchTimeoutRef.current) {
				window.clearTimeout(searchTimeoutRef.current);
			}
		};
	}, []);

	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
					<Filter size={20} />
					Filters & Search
				</h2>
				<div className="flex gap-2">
					<button
						onClick={() => setShowFilters(!showFilters)}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
					>
						{showFilters ? 'Hide Filters' : 'Show Filters'}
					</button>
					<button
						onClick={handleExport}
						className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
					>
						<Download size={16} />
						Export CSV
					</button>
					<div className="flex bg-gray-100 border border-gray-200 rounded-xl p-1">
						<button
							onClick={() => handleViewModeChange('grid')}
							className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
								viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
							}`}
							title="Grid view"
						>
							<Grid3X3 className="h-4 w-4" />
						</button>
						<button
							onClick={() => handleViewModeChange('list')}
							className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
								viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
							}`}
							title="List view"
						>
							<List className="h-4 w-4" />
						</button>
					</div>
				</div>
			</div>

			<div className="relative mb-4">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
				<input
					type="text"
					placeholder="Search by student name, email, university, or scholarship..."
					className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					value={localSearchValue}
					onChange={(e) => handleSearchChange(e.target.value)}
				/>
			</div>

			{showFilters && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 pt-4 border-t border-gray-200">
					<div className="lg:col-span-6 mb-4">
						<h3 className="text-sm font-medium text-gray-700 mb-3">Ordenação</h3>
						<div className="flex flex-wrap gap-4">
							{/* Ordenação é controlada fora; mantemos UI visualmente idêntica se estiver dentro */}
						</div>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">University</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							value={filters.university}
							onChange={(e) => setFilters({ ...filters, university: e.target.value })}
							title="Filter by university"
							aria-label="Filter by university"
						>
							<option value="all">All Universities</option>
							{universities.map((uni: any) => (
								<option key={uni.id} value={uni.id}>{uni.name}</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Fee Type</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							value={filters.feeType}
							onChange={(e) => setFilters({ ...filters, feeType: e.target.value })}
							title="Filter by fee type"
							aria-label="Filter by fee type"
						>
							<option value="all">All Fee Types</option>
							{FEE_TYPES.map((fee: any) => (
								<option key={fee.value} value={fee.value}>{fee.label}</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							value={filters.status}
							onChange={(e) => setFilters({ ...filters, status: e.target.value })}
							title="Filter by payment status"
							aria-label="Filter by payment status"
						>
							{STATUS_OPTIONS.map((status: any) => (
								<option key={status.value} value={status.value}>{status.label}</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Admin Affiliate</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							value={filters.affiliate}
							onChange={(e) => setFilters({ ...filters, affiliate: e.target.value })}
							title="Filter by admin affiliate"
							aria-label="Filter by admin affiliate"
						>
							<option value="all">All Affiliates</option>
							{affiliates.map((affiliate: any) => (
								<option key={affiliate.id} value={affiliate.id}>
									{affiliate.name || affiliate.email || 'Unknown'}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
						<input
							type="date"
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							value={filters.dateFrom}
							onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
							title="Filter from date"
							placeholder="Select start date"
							aria-label="Filter from date"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
						<input
							type="date"
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							value={filters.dateTo}
							onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
							title="Filter to date"
							placeholder="Select end date"
							aria-label="Filter to date"
						/>
					</div>

					<div className="lg:col-span-6 flex justify-end">
						<button
							onClick={resetFilters}
							className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
						>
							Reset Filters
						</button>
					</div>
				</div>
			)}

			<div className="mt-4 text-sm text-gray-600">
				{backendTotalCount != null ? (
					<>
						Showing {payments.length} of {backendTotalCount} payments
					</>
				) : (
					<>Showing {sortedPayments.length} of {payments.length} payments</>
				)}
				{totalPages > 1 && (
					<>
						<span className="mx-2">•</span>
						<span>
							Page {currentPage} of {totalPages}
						</span>
					</>
				)}
			</div>
		</div>
	);
}

export const FiltersBar = React.memo(FiltersBarBase);
export default FiltersBar;


