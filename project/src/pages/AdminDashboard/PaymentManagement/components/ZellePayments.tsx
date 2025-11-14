import React, { useMemo } from 'react';
import { CreditCard, Clock, CheckCircle2, XCircle, Grid3X3, List, Eye, CheckCircle, User, MessageSquare } from 'lucide-react';
import { PaginationBar } from './PaginationBar';
import { formatCentsToDollars } from '../../../../utils/currency';
import ZellePaymentsSkeleton from '../../../../components/ZellePaymentsSkeleton';
import { useEnvironment } from '../../../../hooks/useEnvironment';

export interface ZellePaymentsProps {
	zellePayments: any[];
	loadingZellePayments: boolean;
	zelleViewMode: 'grid' | 'list';
	setZelleViewMode: (mode: 'grid' | 'list') => void;
	openZelleProofModal: (id: string) => void;
	openZelleReviewModal: (id: string) => void;
	openZelleNotesModal: (id: string) => void;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
}

function ZellePaymentsBase(props: ZellePaymentsProps) {
	const {
		zellePayments,
		loadingZellePayments,
		zelleViewMode,
		setZelleViewMode,
		openZelleProofModal,
		openZelleReviewModal,
		openZelleNotesModal,
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    itemsPerPage = 20,
    onPageChange,
    onItemsPerPageChange,
	} = props;

  const { isDevelopment } = useEnvironment();

	// Filtrar pagamentos Zelle: excluir usuários com email @uorak.com (exceto em localhost)
	// IMPORTANTE: Os dados já vêm paginados do servidor, então este filtro só remove itens da página atual
	const filteredZellePayments = useMemo(() => {
		if (isDevelopment) {
			// Em localhost, mostrar todos os itens da página atual
			return zellePayments;
		}
		// Em produção/staging, excluir pagamentos de estudantes com email @uorak.com da página atual
		return zellePayments.filter((payment: any) => {
			const email = payment.student_email?.toLowerCase() || '';
			return !email.includes('@uorak.com');
		});
	}, [zellePayments, isDevelopment]);

	// Calcular índices para paginação (baseado no total do servidor, não no filtrado local)
	const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage, itemsPerPage]);
	const endIndex = useMemo(() => Math.min(currentPage * itemsPerPage, totalItems), [currentPage, itemsPerPage, totalItems]);

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<div className="bg-white p-6 rounded-xl shadow border">
					<div className="flex items-center">
						<div className="p-2 bg-blue-100 rounded-lg">
							<CreditCard className="w-6 h-6 text-blue-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Total Zelle Payments</p>
							<p className="text-2xl font-bold text-gray-900">{filteredZellePayments.length}</p>
						</div>
					</div>
				</div>
				<div className="bg-white p-6 rounded-xl shadow border">
					<div className="flex items-center">
						<div className="p-2 bg-yellow-100 rounded-lg">
							<Clock className="w-6 h-6 text-yellow-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Pending Review</p>
							<p className="text-2xl font-bold text-gray-900">{filteredZellePayments.filter(p => p.zelle_status === 'pending_verification').length}</p>
						</div>
					</div>
				</div>
				<div className="bg-white p-6 rounded-xl shadow border">
					<div className="flex items-center">
						<div className="p-2 bg-green-100 rounded-lg">
							<CheckCircle2 className="w-6 h-6 text-green-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Approved</p>
							<p className="text-2xl font-bold text-gray-900">{filteredZellePayments.filter(p => p.zelle_status === 'approved').length}</p>
						</div>
					</div>
				</div>
				<div className="bg-white p-6 rounded-xl shadow border">
					<div className="flex items-center">
						<div className="p-2 bg-red-100 rounded-lg">
							<XCircle className="w-6 h-6 text-red-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Rejected</p>
							<p className="text-2xl font-bold text-gray-900">{filteredZellePayments.filter(p => p.zelle_status === 'rejected').length}</p>
						</div>
					</div>
				</div>
			</div>

			<div className="bg-white rounded-xl shadow border">
				<div className="p-6 border-b border-gray-200">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-lg font-semibold text-gray-900">Zelle Payments</h2>
							<p className="text-gray-600 mt-1">Review and approve Zelle payment proofs</p>
						</div>
						<div className="flex bg-gray-100 border border-gray-200 rounded-xl p-1">
							<button onClick={() => setZelleViewMode('grid')} className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${zelleViewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="Grid view"><Grid3X3 className="h-4 w-4" /></button>
							<button onClick={() => setZelleViewMode('list')} className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${zelleViewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="List view"><List className="h-4 w-4" /></button>
						</div>
					</div>
				</div>

				{loadingZellePayments ? (
					<ZellePaymentsSkeleton />
				) : filteredZellePayments.length === 0 ? (
					<div className="text-center py-12">
						<CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
						<h3 className="text-lg font-medium text-gray-900 mb-2">No Zelle Payments</h3>
						<p className="text-gray-500">No Zelle payments are currently pending review.</p>
					</div>
				) : (
					<div className="p-6">
						{zelleViewMode === 'grid' ? (
							<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
								{filteredZellePayments.map((payment: any) => (
									<div key={payment.id} className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors cursor-pointer border">
										<div className="flex items-start justify-between mb-4">
											<div className="flex-1">
												<h3 className="font-semibold text-gray-900 text-lg mb-1">{payment.student_name}</h3>
												<p className="text-sm text-gray-500">{payment.student_email}</p>
												<p className="text-sm text-gray-500">{payment.university_name}</p>
											</div>
											<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
												payment.zelle_status === 'pending_verification' ? 'bg-yellow-100 text-yellow-800' :
												payment.zelle_status === 'approved' ? 'bg-green-100 text-green-800' :
												payment.zelle_status === 'rejected' ? 'bg-red-100 text-red-800' :
												'bg-gray-100 text-gray-800'
											}` }>
												{payment.zelle_status === 'pending_verification' && <Clock className="w-3 h-3 mr-1" />}
												{payment.zelle_status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
												{payment.zelle_status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
												{payment.zelle_status === 'pending_verification' ? 'Pending Review' : payment.zelle_status === 'approved' ? 'Approved' : payment.zelle_status === 'rejected' ? 'Rejected' : payment.zelle_status}
											</span>
										</div>

										<div className="mb-4">
											<div className="text-2xl font-bold text-gray-900 mb-2">${formatCentsToDollars(payment.amount)}</div>
											<p className="text-sm text-gray-600 capitalize">{payment.fee_type.replace('_', ' ')}</p>
										</div>

										<div className="text-sm text-gray-500 mb-4">{new Date(payment.created_at).toLocaleDateString()}</div>

										{payment.payment_proof_url && (
											<div className="mb-4">
												<button onClick={() => openZelleProofModal(payment.id)} className="text-blue-600 hover:text-blue-900 flex items-center gap-1"><Eye size={16} />Proof</button>
											</div>
										)}

										{payment.admin_notes && (
											<div className="mb-4 p-3 bg-blue-50 rounded-lg">
												<p className="text-sm text-blue-800"><strong>Admin Notes:</strong> {payment.admin_notes}</p>
											</div>
										)}

										{payment.zelle_status === 'pending_verification' && (
											<div className="mt-4 pt-4 border-t border-gray-200">
												<button onClick={() => openZelleReviewModal(payment.id)} className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" />Review Payment</button>
											</div>
										)}

										<div className="mt-4 pt-4 border-t border-gray-200">
											<button onClick={() => openZelleNotesModal(payment.id)} className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Add Notes</button>
										</div>
									</div>
								))}
						</div>
						) : (
							<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee Type</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
												<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{filteredZellePayments.map((payment: any) => (
												<tr key={payment.id} className="hover:bg-gray-50 transition-colors">
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
													<td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900 capitalize">{payment.fee_type.replace('_', ' ')}</div></td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">${formatCentsToDollars(payment.amount)}</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
															payment.zelle_status === 'pending_verification' ? 'bg-yellow-100 text-yellow-800' :
															payment.zelle_status === 'approved' ? 'bg-green-100 text-green-800' :
															payment.zelle_status === 'rejected' ? 'bg-red-100 text-red-800' :
															'bg-gray-100 text-gray-800'
														}` }>
															{payment.zelle_status === 'pending_verification' ? 'Pending Review' : payment.zelle_status === 'approved' ? 'Approved' : payment.zelle_status === 'rejected' ? 'Rejected' : payment.zelle_status}
														</span>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</td>
													<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
														<div className="flex items-center justify-end space-x-2">
															{payment.payment_proof_url && (<button onClick={() => openZelleProofModal(payment.id)} className="text-blue-600 hover:text-blue-900 flex items-center gap-1"><Eye size={16} />Proof</button>)}
															{payment.zelle_status === 'pending_verification' && (<button onClick={() => openZelleReviewModal(payment.id)} className="text-blue-600 hover:text-blue-900 flex items-center gap-1"><CheckCircle size={16} />Review</button>)}
															<button onClick={() => openZelleNotesModal(payment.id)} className="text-gray-600 hover:text-gray-900 flex items-center gap-1"><MessageSquare size={16} />Notes</button>
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}

            {totalPages > 1 && (
              <div className="mt-6">
                <PaginationBar
                  currentPage={currentPage}
                  totalPages={totalPages}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalItems={totalItems || filteredZellePayments.length}
                  itemsPerPage={itemsPerPage}
                  onFirst={() => onPageChange && onPageChange(1)}
                  onPrev={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
                  onNext={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))}
                  onLast={() => onPageChange && onPageChange(totalPages)}
                  onGoTo={(p) => onPageChange && onPageChange(p)}
                  onItemsPerPageChange={(newItemsPerPage) => onItemsPerPageChange && onItemsPerPageChange(newItemsPerPage)}
                  pageNumbers={(() => {
                    // Mostrar até 10 páginas ao redor da página atual
                    const maxPages = 10;
                    const halfRange = Math.floor(maxPages / 2);
                    let start = Math.max(1, currentPage - halfRange);
                    let end = Math.min(totalPages, start + maxPages - 1);
                    
                    // Ajustar início se estiver muito próximo do final
                    if (end - start < maxPages - 1) {
                      start = Math.max(1, end - maxPages + 1);
                    }
                    
                    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
                  })()}
                />
              </div>
            )}
					</div>
				)}
			</div>
		</div>
	);
}

export const ZellePayments = React.memo(ZellePaymentsBase);
export default ZellePayments;


