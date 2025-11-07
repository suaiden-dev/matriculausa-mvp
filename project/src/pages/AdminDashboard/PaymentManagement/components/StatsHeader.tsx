import React from 'react';
import { DollarSign, CreditCard, CheckCircle, TrendingUp } from 'lucide-react';
import { formatCentsToDollars } from '../../../../utils/currency';

export interface StatsHeaderProps {
	stats: any;
	payments: any[];
}

function StatsHeaderBase({ stats, payments }: StatsHeaderProps) {
	const allPaid = (payments || []).filter((p: any) => p.status === 'paid');
	const totalsByMethod = allPaid.reduce(
		(acc: Record<string, { count: number; amount: number }>, p: any) => {
			const method = (p.payment_method || 'manual').toLowerCase();
			// ✅ CORREÇÃO: Mapear 'pix' para 'stripe' (Pix é processado via Stripe)
			const normalizedMethod = method === 'pix' ? 'stripe' : method;
			if (!acc[normalizedMethod]) acc[normalizedMethod] = { count: 0, amount: 0 };
			acc[normalizedMethod].count += 1;
			acc[normalizedMethod].amount += p.amount || 0;
			return acc;
		},
		{}
	);

	const stripeData = totalsByMethod.stripe || { count: 0, amount: 0 };
	const zelleData = totalsByMethod.zelle || { count: 0, amount: 0 };

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			<div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-blue-100 text-sm font-medium">Total Revenue</p>
						<p className="text-2xl font-bold">${formatCentsToDollars(stats?.totalRevenue || 0).toLocaleString()}</p>
					</div>
					<DollarSign size={32} className="text-blue-200" />
				</div>
			</div>

			<div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-blue-100 text-sm font-medium">Stripe Payments</p>
						<p className="text-2xl font-bold">${formatCentsToDollars(stripeData.amount).toLocaleString()}</p>
						<p className="text-blue-200 text-xs">{stripeData.count} payments</p>
					</div>
					<CreditCard size={32} className="text-blue-200" />
				</div>
			</div>

			<div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-purple-100 text-sm font-medium">Zelle Payments</p>
						<p className="text-2xl font-bold">${formatCentsToDollars(zelleData.amount).toLocaleString()}</p>
						<p className="text-purple-200 text-xs">{zelleData.count} payments</p>
					</div>
					<CheckCircle size={32} className="text-purple-200" />
				</div>
			</div>

			<div className="bg-[#05294E] rounded-xl p-6 text-white">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-purple-100 text-sm font-medium">Outside Payments</p>
						<p className="text-2xl font-bold">${formatCentsToDollars(stats?.manualRevenue || 0).toLocaleString()}</p>
					</div>
					<TrendingUp size={32} className="text-purple-200" />
				</div>
			</div>
		</div>
	);
}

export const StatsHeader = React.memo(StatsHeaderBase);
export default StatsHeader;


