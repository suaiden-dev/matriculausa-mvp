import React from 'react';
import { User, Building2, DollarSign, Calendar } from 'lucide-react';
import { formatCentsToDollars } from '../../../../utils/currency';

export interface PaymentsGridProps {
	currentPayments: any[];
	FEE_TYPES: { value: string; label: string; color?: string }[];
	handleViewDetails: (payment: any) => void;
}

function PaymentsGridBase({ currentPayments, FEE_TYPES, handleViewDetails }: PaymentsGridProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{currentPayments.map((payment: any) => (
				<div key={payment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
					<div>
						<div className="flex items-center gap-2 mb-2">
							<User className="h-5 w-5 text-gray-500" />
							<span className="font-bold text-gray-900">{payment.student_name}</span>
						</div>
						<div className="text-sm text-gray-600 mb-1">{payment.student_email}</div>
						<div className="flex items-center gap-2 mb-1">
							<Building2 className="h-4 w-4 text-gray-400" />
							<span className="text-gray-900">{payment.university_name}</span>
						</div>
						<div className="flex items-center gap-2 mb-1">
							<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${FEE_TYPES.find((ft: any) => ft.value === payment.fee_type)?.color || 'bg-gray-100 text-gray-800'}`}>{FEE_TYPES.find((ft: any) => ft.value === payment.fee_type)?.label || payment.fee_type}</span>
						</div>
						<div className="flex items-center gap-2 mb-1">
							<DollarSign className="h-4 w-4 text-green-500" />
							<span className="font-bold text-green-700">${formatCentsToDollars(payment.amount)}</span>
						</div>
						<div className="flex items-center gap-2 mb-1">
							<Calendar className="h-4 w-4 text-gray-400" />
							<span className="text-gray-900">{payment.payment_date ? new Date(payment.payment_date).toLocaleString('en-US', { timeZone: 'America/Phoenix', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
						</div>
						<div className="flex items-center gap-2 mb-1">
							<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${payment.status === 'paid' ? 'bg-green-100 text-green-800' : payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
						</div>
					</div>
					<button
						onClick={() => handleViewDetails(payment)}
						className="mt-4 w-full bg-blue-600 text-white py-2.5 px-4 rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
						title="View details"
					>
						Details
					</button>
				</div>
			))}
		</div>
	);
}

export const PaymentsGrid = React.memo(PaymentsGridBase);
export default PaymentsGrid;


