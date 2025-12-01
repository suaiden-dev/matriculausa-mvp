import React from 'react';
import { AlertCircle, User, Building2, Eye, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { formatCentsToDollars } from '../../../../utils/currency';

export interface PaymentsTableProps {
	viewMode: 'grid' | 'list';
	currentPayments: any[];
	selectAll: boolean;
	handleSelectAll: () => void;
	selectedPayments: Set<string>;
	handleSelectPayment: (id: string) => void;
	handleSort: (field: any) => void;
	sortBy: any;
	sortOrder: 'asc' | 'desc';
	FEE_TYPES: { value: string; label: string; color?: string }[];
	handleViewDetails: (payment: any) => void;
	isLoading?: boolean; // ✅ NOVO: Estado de loading para mostrar skeletons
}

function PaymentsTableBase(props: PaymentsTableProps) {
	const {
		viewMode,
		currentPayments,
		selectAll,
		handleSelectAll,
		selectedPayments,
		handleSelectPayment,
		handleSort,
		sortBy,
		sortOrder,
		FEE_TYPES,
		handleViewDetails,
	} = props;

	if (viewMode !== 'list') {
		return null;
	}

	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								<input
									type="checkbox"
									checked={selectAll}
									onChange={handleSelectAll}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
							</th>
							<th 
								className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
								onClick={() => handleSort('student_name')}
							>
								<div className="flex items-center gap-1">
									Student
									{sortBy === 'student_name' && (
										<span className="text-blue-600">
											{sortOrder === 'asc' ? '↑' : '↓'}
										</span>
									)}
								</div>
							</th>
							<th 
								className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
								onClick={() => handleSort('university_name')}
							>
								<div className="flex items-center gap-1">
									University
									{sortBy === 'university_name' && (
										<span className="text-blue-600">
											{sortOrder === 'asc' ? '↑' : '↓'}
										</span>
									)}
								</div>
							</th>
							<th 
								className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
								onClick={() => handleSort('fee_type')}
							>
								<div className="flex items-center gap-1">
									Fee Type
									{sortBy === 'fee_type' && (
										<span className="text-blue-600">
											{sortOrder === 'asc' ? '↑' : '↓'}
										</span>
									)}
								</div>
							</th>
							<th 
								className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
								onClick={() => handleSort('amount')}
							>
								<div className="flex items-center gap-1">
									Amount
									{sortBy === 'amount' && (
										<span className="text-blue-600">
											{sortOrder === 'asc' ? '↑' : '↓'}
										</span>
									)}
								</div>
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Method
							</th>
							<th 
								className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
								onClick={() => handleSort('status')}
							>
								<div className="flex items-center gap-1">
									Status
									{sortBy === 'status' && (
										<span className="text-blue-600">
											{sortOrder === 'asc' ? '↑' : '↓'}
										</span>
									)}
								</div>
							</th>
							<th 
								className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
								onClick={() => handleSort('payment_date')}
							>
								<div className="flex items-center gap-1">
									Date
									{sortBy === 'payment_date' && (
										<span className="text-blue-600">
											{sortOrder === 'asc' ? '↑' : '↓'}
										</span>
									)}
								</div>
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{currentPayments.length === 0 ? (
							<tr>
								<td colSpan={9} className="px-6 py-12 text-center">
									<AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
									<h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
									<p className="mt-1 text-sm text-gray-500">
										Try adjusting your search criteria or filters.
									</p>
								</td>
							</tr>
						) : (
							currentPayments.map((payment: any) => (
								<tr key={payment.id} className="hover:bg-gray-50 transition-colors">
									<td className="px-6 py-4 whitespace-nowrap">
										<input
											type="checkbox"
											checked={selectedPayments.has(payment.id)}
											onChange={() => handleSelectPayment(payment.id)}
											className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
										/>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="flex items-center">
											<div className="flex-shrink-0 h-10 w-10">
												<div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
													<User className="h-5 w-5 text-gray-600" />
												</div>
											</div>
											<div className="ml-4">
												<div className="text-sm font-medium text-gray-900">{payment.student_name}</div>
												<div className="text-sm text-gray-500">{payment.student_email}</div>
											</div>
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="flex items-center">
											<Building2 className="h-4 w-4 text-gray-400 mr-2" />
											<div className="text-sm text-gray-900">{payment.university_name}</div>
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
											FEE_TYPES.find((ft: any) => ft.value === payment.fee_type)?.color || 'bg-gray-100 text-gray-800'
										}` }>
											{FEE_TYPES.find((ft: any) => ft.value === payment.fee_type)?.label || payment.fee_type}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
										{props.isLoading ? (
											<div className="animate-pulse bg-slate-200 h-4 w-16 rounded"></div>
										) : (
											`$${formatCentsToDollars(payment.amount)}`
										)}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										{(() => {
											const paymentMethod = payment.payment_method || 'manual';
											const chipClass = paymentMethod === 'zelle'
												? 'bg-purple-100 text-purple-800'
												: paymentMethod === 'stripe'
												? 'bg-blue-100 text-blue-800'
												: 'bg-gray-100 text-gray-800';
											const label = paymentMethod === 'manual'
												? 'Outside'
												: paymentMethod
													? paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)
													: 'N/A';
											return (
												<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${chipClass}`}>
													{label}
												</span>
											);
										})()}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
											payment.status === 'paid' 
												? 'bg-green-100 text-green-800' 
												: payment.status === 'pending'
												? 'bg-yellow-100 text-yellow-800'
												: 'bg-red-100 text-red-800'
										}`}>
											{payment.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
											{payment.status === 'pending' && <XCircle className="w-3 h-3 mr-1" />}
											{payment.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
											{payment.status ? payment.status.charAt(0).toUpperCase() + payment.status.slice(1) : 'N/A'}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										<div className="flex items-center">
											<Calendar className="h-4 w-4 mr-1" />
											{payment.payment_date 
												? new Date(payment.payment_date).toLocaleString('en-US', { timeZone: 'America/Phoenix', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
												: 'N/A'
											}
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
										<button
											onClick={() => handleViewDetails(payment)}
											className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
										>
											<Eye size={16} />
											Details
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export const PaymentsTable = React.memo(PaymentsTableBase);
export default PaymentsTable;


