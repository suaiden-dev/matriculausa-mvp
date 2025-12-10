import React, { useMemo } from 'react';
import { Filter, Download, Search, List, Grid3X3, X } from 'lucide-react';

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

	// Helper functions para normalizar filtros (string ou array)
	const getFilterArray = (filter: string | string[] | undefined): string[] => {
		if (!filter) return [];
		if (Array.isArray(filter)) return filter;
		return filter === 'all' ? [] : [filter];
	};

	// Helper functions para toggle de filtros
	const toggleFilter = (filterKey: 'university' | 'feeType' | 'status' | 'paymentMethod' | 'affiliate', value: string) => {
		const currentArray = getFilterArray(filters[filterKey]);
		const newArray = currentArray.includes(value)
			? currentArray.filter(v => v !== value)
			: [...currentArray, value];
		setFilters({ ...filters, [filterKey]: newArray.length === 0 ? 'all' : newArray });
	};

	// Verificar se há filtros ativos
	const hasActiveFilters = useMemo(() => {
		// University é string única, não array
		const universityValue = Array.isArray(filters.university) ? (filters.university.length > 0 ? filters.university[0] : 'all') : (filters.university || 'all');
		const feeTypeArray = getFilterArray(filters.feeType);
		const statusArray = getFilterArray(filters.status);
		const paymentMethodArray = getFilterArray(filters.paymentMethod);
		const affiliateArray = getFilterArray(filters.affiliate);
		
		return universityValue !== 'all' ||
		       feeTypeArray.length > 0 || 
		       statusArray.length > 0 || 
		       paymentMethodArray.length > 0 || 
		       affiliateArray.length > 0 ||
		       filters.dateFrom ||
		       filters.dateTo;
	}, [filters]);

	// Obter métodos de pagamento únicos dos payments
	const uniquePaymentMethods = useMemo(() => {
		const methods = new Set<string>();
		let hasStripePayment = false;
		let hasPixPayment = false;
		
		payments.forEach((payment: any) => {
			if (payment.payment_method) {
				// Caso 1: payment_method é 'pix' diretamente
				if (payment.payment_method === 'pix') {
					hasPixPayment = true;
				}
				// Caso 2: payment_method é 'stripe'
				else if (payment.payment_method === 'stripe') {
					hasStripePayment = true;
					// Verificar se é PIX via metadata
					const isPix = payment.metadata?.payment_method === 'pix' || payment.metadata?.is_pix === true;
					if (isPix) {
						hasPixPayment = true;
					}
				} else if (payment.payment_method === 'zelle') {
					methods.add('zelle');
				} else if (payment.payment_method === 'manual') {
					methods.add('outside');
				} else {
					// Adicionar qualquer outro método encontrado
					methods.add(payment.payment_method);
				}
			}
		});
		
		// Sempre adicionar 'stripe' se houver qualquer pagamento com payment_method === 'stripe'
		// Isso garante que 'stripe' apareça mesmo que todos sejam PIX
		if (hasStripePayment) {
			methods.add('stripe');
		}
		// Adicionar 'pix' se houver pagamentos PIX (direto ou via metadata)
		if (hasPixPayment) {
			methods.add('pix');
		}
		
		// Se não houver nenhum método, adicionar os principais para garantir que sempre há opções
		if (methods.size === 0) {
			methods.add('stripe');
			methods.add('zelle');
			methods.add('outside');
		}
		
		return Array.from(methods).sort();
	}, [payments]);

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
						className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
							hasActiveFilters 
								? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100' 
								: 'text-gray-700 bg-gray-100 hover:bg-gray-200'
						}`}
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
				<div className="pt-4 border-t border-gray-200">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-sm font-medium text-gray-900">Filters</h3>
						<div className="flex items-center gap-2">
							{hasActiveFilters && (
								<button
									onClick={resetFilters}
									className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
								>
									Clear filters
								</button>
							)}
							<button
								onClick={() => setShowFilters(false)}
								className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
						{/* University Filter - Single Selection (Select) */}
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1.5">
								University
							</label>
							<select
								className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								value={Array.isArray(filters.university) ? (filters.university.length > 0 ? filters.university[0] : 'all') : (filters.university || 'all')}
								onChange={(e) => setFilters({ ...filters, university: e.target.value === 'all' ? 'all' : e.target.value })}
								title="Filter by university"
								aria-label="Filter by university"
							>
								<option value="all">All Universities</option>
								{universities.map((uni: any) => (
									<option key={uni.id} value={uni.id}>{uni.name}</option>
								))}
							</select>
						</div>

						{/* Fee Type Filter - Multiple Selection */}
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1.5">
								Fee Type {getFilterArray(filters.feeType).length > 0 && `(${getFilterArray(filters.feeType).length} selected)`}
							</label>
							<div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white p-2 space-y-2">
								{FEE_TYPES.length === 0 ? (
									<p className="text-xs text-gray-500 py-2">No types available</p>
								) : (
									FEE_TYPES.map((fee: any) => {
										const isSelected = getFilterArray(filters.feeType).includes(fee.value);
										return (
											<label
												key={fee.value}
												className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
											>
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() => toggleFilter('feeType', fee.value)}
													className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
												/>
												<span className="text-sm text-gray-700">{fee.label}</span>
											</label>
										);
									})
								)}
							</div>
							{getFilterArray(filters.feeType).length > 0 && (
								<button
									onClick={() => setFilters({ ...filters, feeType: 'all' })}
									className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
								>
									Clear selection
								</button>
							)}
						</div>

						{/* Status Filter - Multiple Selection */}
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1.5">
								Status {getFilterArray(filters.status).length > 0 && `(${getFilterArray(filters.status).length} selected)`}
							</label>
							<div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white p-2 space-y-2">
								{STATUS_OPTIONS.length === 0 ? (
									<p className="text-xs text-gray-500 py-2">No statuses available</p>
								) : (
									STATUS_OPTIONS.map((status: any) => {
										const isSelected = getFilterArray(filters.status).includes(status.value);
										return (
											<label
												key={status.value}
												className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
											>
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() => toggleFilter('status', status.value)}
													className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
												/>
												<span className="text-sm text-gray-700">{status.label}</span>
											</label>
										);
									})
								)}
							</div>
							{getFilterArray(filters.status).length > 0 && (
								<button
									onClick={() => setFilters({ ...filters, status: 'all' })}
									className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
								>
									Clear selection
								</button>
							)}
						</div>

						{/* Payment Method Filter - Multiple Selection */}
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1.5">
								Payment Method {getFilterArray(filters.paymentMethod).length > 0 && `(${getFilterArray(filters.paymentMethod).length} selected)`}
							</label>
							<div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white p-2 space-y-2">
								{uniquePaymentMethods.length === 0 ? (
									<p className="text-xs text-gray-500 py-2">No methods available</p>
								) : (
									uniquePaymentMethods.map((method: string) => {
										const isSelected = getFilterArray(filters.paymentMethod).includes(method);
										const methodLabel = method === 'pix' ? 'PIX' : 
										                   method === 'zelle' ? 'Zelle' : 
										                   method === 'outside' ? 'Outside' : 
										                   method === 'stripe' ? 'Stripe' : 
										                   method;
										return (
											<label
												key={method}
												className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
											>
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() => toggleFilter('paymentMethod', method)}
													className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
												/>
												<span className="text-sm text-gray-700 capitalize">{methodLabel}</span>
											</label>
										);
									})
								)}
							</div>
							{getFilterArray(filters.paymentMethod).length > 0 && (
								<button
									onClick={() => setFilters({ ...filters, paymentMethod: 'all' })}
									className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
								>
									Clear selection
								</button>
							)}
						</div>

						{/* Admin Affiliate Filter - Multiple Selection */}
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1.5">
								Admin Affiliate {getFilterArray(filters.affiliate).length > 0 && `(${getFilterArray(filters.affiliate).length} selected)`}
							</label>
							<div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white p-2 space-y-2">
								{affiliates.length === 0 ? (
									<p className="text-xs text-gray-500 py-2">No affiliates available</p>
								) : (
									affiliates.map((affiliate: any) => {
										const isSelected = getFilterArray(filters.affiliate).includes(affiliate.id);
										return (
											<label
												key={affiliate.id}
												className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
											>
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() => toggleFilter('affiliate', affiliate.id)}
													className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
												/>
												<span className="text-sm text-gray-700">{affiliate.name || affiliate.email || 'Unknown'}</span>
											</label>
										);
									})
								)}
							</div>
							{getFilterArray(filters.affiliate).length > 0 && (
								<button
									onClick={() => setFilters({ ...filters, affiliate: 'all' })}
									className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
								>
									Clear selection
								</button>
							)}
						</div>

						{/* Date From Filter */}
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1.5">
								Date From
							</label>
							<input
								type="date"
								value={filters.dateFrom || ''}
								onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
								className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						{/* Date To Filter */}
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1.5">
								Date To
							</label>
							<input
								type="date"
								value={filters.dateTo || ''}
								onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
								className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
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


