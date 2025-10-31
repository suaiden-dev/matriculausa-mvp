import React from 'react';
import { CheckSquare } from 'lucide-react';
import { formatCentsToDollars } from '../../../../utils/currency';

export interface SelectedTotals {
	totalCount: number;
	totalAmount: number;
	breakdownByMethod: Record<string, { amount: number; count: number }>;
}

export interface BulkActionsBarProps {
	selectedTotals: SelectedTotals;
	onClearSelection: () => void;
}

function BulkActionsBarBase({ selectedTotals, onClearSelection }: BulkActionsBarProps) {
	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
					<CheckSquare size={20} />
					Selected Payments Summary
				</h2>
				<div className="flex items-center gap-2">
					<div className="text-sm text-gray-600">
						{selectedTotals.totalCount} selected
					</div>
					<button
						onClick={onClearSelection}
						className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
					>
						Clear Selection
					</button>
				</div>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-green-50 rounded-lg p-4">
					<div className="text-sm font-medium text-green-600 mb-1">Total Selected</div>
					<div className="text-2xl font-bold text-green-900">
						${formatCentsToDollars(selectedTotals.totalAmount).toLocaleString()}
					</div>
				</div>
				{Object.entries(selectedTotals.breakdownByMethod).map(([method, data]) => {
					const methodLabel = method === 'manual' ? 'Outside' :
						method === 'zelle' ? 'Zelle' :
						method === 'stripe' ? 'Stripe' :
						method.charAt(0).toUpperCase() + method.slice(1);
					const methodColor = method === 'manual' ? 'gray' :
						method === 'zelle' ? 'purple' :
						method === 'stripe' ? 'blue' : 'green';
					return (
						<div key={method} className={`bg-${methodColor}-50 rounded-lg p-4`}>
							<div className={`text-sm font-medium text-${methodColor}-600 mb-1`}>
								{methodLabel}
							</div>
							<div className={`text-xl font-bold text-${methodColor}-900`}>
								${formatCentsToDollars(data.amount).toLocaleString()}
							</div>
							<div className={`text-xs text-${methodColor}-600`}>
								{data.count} payments
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export const BulkActionsBar = React.memo(BulkActionsBarBase);
export default BulkActionsBar;


