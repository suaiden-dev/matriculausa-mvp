import React from 'react';
import { XCircle } from 'lucide-react';
import { formatCentsToDollars } from '../../../../utils/currency';
import type { PaymentRecord } from '../data/types';

export interface PaymentDetailsModalProps {
	open: boolean;
	payment: PaymentRecord | null;
	onClose: () => void;
	FEE_TYPES: { value: string; label: string; color?: string }[];
}

export function PaymentDetailsModal(props: PaymentDetailsModalProps) {
	const { open, payment, onClose, FEE_TYPES } = props;

	if (!open || !payment) {
		return null;
	}

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
			<div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				<div className="p-6">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600"
							title="Close modal"
							aria-label="Close payment details modal"
						>
							<XCircle size={24} />
						</button>
					</div>

					<div className="space-y-6">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-500">Student</label>
								<p className="mt-1 text-sm text-gray-900">{payment.student_name}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-500">Email</label>
								<p className="mt-1 text-sm text-gray-900">{payment.student_email}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-500">University</label>
								<p className="mt-1 text-sm text-gray-900">{payment.university_name}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-500">Scholarship</label>
								<p className="mt-1 text-sm text-gray-900">{payment.scholarship_title || 'N/A'}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-500">Fee Type</label>
								<p className="mt-1 text-sm text-gray-900">
									{FEE_TYPES.find(ft => ft.value === payment.fee_type)?.label || payment.fee_type}
								</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-500">Amount</label>
								<p className="mt-1 text-sm text-gray-900 font-semibold">${formatCentsToDollars(payment.amount)}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-500">Status</label>
								<p className="mt-1">
									<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
										payment.status === 'paid' 
											? 'bg-green-100 text-green-800' 
											: payment.status === 'pending'
											? 'bg-yellow-100 text-yellow-800'
											: 'bg-red-100 text-red-800'
									}`}>
										{payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
									</span>
								</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-500">Payment Method</label>
								<p className="mt-1 text-sm text-gray-900">
									{
										payment.payment_method === 'manual' 
											? 'Outside'
											: payment.payment_method === 'zelle'
											? 'Zelle'
											: payment.payment_method === 'stripe'
											? 'Stripe'
											: payment.payment_method
											? String(payment.payment_method).charAt(0).toUpperCase() + String(payment.payment_method).slice(1)
											: 'N/A'
									}
								</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-500">Payment Date</label>
								<p className="mt-1 text-sm text-gray-900">
									{payment.payment_date 
										? new Date(payment.payment_date).toLocaleString('en-US', { timeZone: 'America/Phoenix', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
										: 'Not paid yet'
									}
								</p>
							</div>
						</div>

						{payment.stripe_session_id && (
							<div>
								<label className="block text-sm font-medium text-gray-500">Stripe Session ID</label>
								<p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
									{payment.stripe_session_id}
								</p>
							</div>
						)}
					</div>

					<div className="mt-6 flex justify-end">
						<button
							onClick={onClose}
							className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
						>
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default PaymentDetailsModal;


