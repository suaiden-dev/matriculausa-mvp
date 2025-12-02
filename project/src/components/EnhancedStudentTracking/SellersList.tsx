import React from 'react';
import { User, ChevronDown, ChevronRight, MapPin, DollarSign, CheckCircle2, ChevronRight as ArrowRight, Building, Sparkles } from 'lucide-react';
import { useFeeConfig } from '../../hooks/useFeeConfig';

interface SellersListProps {
  filteredSellers: any[];
  filteredStudents: any[];
  expandedSellers: Set<string>;
  expandedStudents: Set<string>;
  onToggleSellerExpansion: (sellerId: string) => void;
  onToggleStudentExpansion: (studentId: string) => void;
  onViewStudentDetails: (studentId: string, profileId: string) => void;
  blackCouponUsers?: Set<string>;
}

const SellersList: React.FC<SellersListProps> = ({
  filteredSellers,
  filteredStudents,
  expandedSellers,
  expandedStudents,
  onToggleSellerExpansion,
  onToggleStudentExpansion,
  onViewStudentDetails,
  blackCouponUsers = new Set()
}) => {
  const { getFeeAmount } = useFeeConfig();
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  // Função para determinar quais taxas estão faltando para um aluno
  const getMissingFees = (student: any) => {
    const missingFees = [];
    
    // ✅ ORDEM CORRETA: Selection Process → Application → Scholarship → I-20 Control
    
    // 1. Verificar Selection Process Fee - usar apenas o flag booleano
    if (!student.has_paid_selection_process_fee) {
      missingFees.push({ name: 'Selection Process', amount: getFeeAmount('selection_process'), color: 'red' });
    }
    
    // 2. Verificar Application Fee - usar apenas o flag booleano
    if (!student.is_application_fee_paid) {
      missingFees.push({ name: 'Application', amount: getFeeAmount('application_fee'), color: 'gray' });
    }
    
    // 3. Verificar Scholarship Fee - usar apenas o flag booleano
    if (!student.is_scholarship_fee_paid) {
      missingFees.push({ name: 'Scholarship', amount: getFeeAmount('scholarship_fee'), color: 'blue' });
    }
    
    // 4. Verificar I20 Control Fee - usar apenas o flag booleano
    if (!student.has_paid_i20_control_fee) {
      missingFees.push({ name: 'I20 Control', amount: getFeeAmount('i20_control_fee'), color: 'orange' });
    }
    
    // Debug: Log do resultado final
    
    return missingFees;
  };

  if (filteredSellers.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No sellers found</h3>
        <p className="text-slate-600">
          Try adjusting the search filters.
        </p>
      </div>
    );
  }


  
  return (
    <div className="space-y-4">
      {filteredSellers.map((seller) => {
        const sellerStudents = filteredStudents.filter((student: any) => 
          student.referred_by_seller_id === seller.id
        );

        return (
          <div key={seller.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header do vendedor */}
            <div 
              className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => onToggleSellerExpansion(seller.id)}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-slate-900 truncate">{seller.name}</h3>
                    <p className="text-sm text-slate-500 truncate">{seller.email}</p>
                    <p className="text-xs text-slate-400 font-mono truncate">{seller.referral_code}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between lg:justify-end space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-slate-500">Students</p>
                    <p className="text-2xl font-bold text-blue-600">{sellerStudents.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-500">Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {(() => {
                        // Somar receita ajustada dos alunos do seller se disponível
                        const studentsForSeller = filteredStudents.filter((student: any) => 
                          student.referred_by_seller_id === seller.id
                        );
                        const adjusted = studentsForSeller.reduce((sum: number, st: any) => {
                          const val = Number(st.total_paid_adjusted ?? st.total_paid ?? 0);
                          return sum + (isNaN(val) ? 0 : val);
                        }, 0);
                        return formatCurrency(adjusted);
                      })()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-500">Registered</p>
                    <p className="text-sm font-medium text-slate-900">{formatDate(seller.created_at)}</p>
                  </div>
                  {expandedSellers.has(seller.id) ? (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Lista de estudantes (expandível) */}
            {expandedSellers.has(seller.id) && (
              <div className="border-t border-slate-200">
                {sellerStudents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Code Used
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Revenue
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Missing Fees
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Registered on
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            I-20 Deadline
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {sellerStudents.map((student) => (
                          <React.Fragment key={student.id}>
                            <tr 
                              className="hover:bg-blue-50 hover:shadow-sm cursor-pointer transition-all duration-200 group"
                              onClick={() => {
                                
                                if (student.hasMultipleApplications) {
                                  // Se tem múltiplas aplicações, expandir/contrair dropdown
                                  onToggleStudentExpansion(student.id);
                                } else {
                                  // Se tem apenas uma aplicação, ir direto para os detalhes
                                  onViewStudentDetails(student.id, student.profile_id);
                                }
                              }}
                            >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                  <span className="text-sm font-medium text-green-600">
                                    {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                                  </span>
                                </div>
                                <div className="ml-4 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="text-sm font-medium text-slate-900">{student.full_name}</div>
                                    {(() => {
                                      const studentUserId = student.user_id || student.id || student.student_id;
                                      const hasBlackCoupon = studentUserId && blackCouponUsers.has(studentUserId);
                                      
                                      return hasBlackCoupon ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md" title="Student used BLACK promotional coupon">
                                          <Sparkles className="h-3 w-3 mr-1" />
                                          BLACK
                                        </span>
                                      ) : null;
                                    })()}
                                    {student.hasMultipleApplications && (
                                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
                                        {student.applicationCount} Applications
                                        <svg 
                                          className={`ml-1 h-3 w-3 transform transition-transform duration-200 ${expandedStudents.has(student.id) ? 'rotate-180' : ''}`}
                                          fill="none" 
                                          stroke="currentColor" 
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-slate-500">{student.email}</div>
                                  {student.country && (
                                    <div className="flex items-center text-xs text-slate-400 mt-1">
                                      <MapPin className="h-3 w-3 mr-1" />
                                      {student.country}
                                    </div>
                                  )}
                                  {student.hasMultipleApplications && (
                                    <div className="flex items-center text-xs text-slate-400 mt-1">
                                      <Building className="h-3 w-3 mr-1" />
                                      Multiple Universities
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded">
                                {student.referral_code_used}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                                <span className="text-sm font-medium text-slate-900">
                                  {formatCurrency(Number(student.total_paid_adjusted ?? student.total_paid ?? 0))}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-wrap gap-1">
                                {(() => {
                                  const missingFees = getMissingFees(student);
                                  if (missingFees.length === 0) {
                                    return (
                                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        All Paid
                                      </span>
                                    );
                                  }
                                  return missingFees.map((fee, index) => (
                                    <span
                                      key={index}
                                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                        fee.color === 'red' ? 'text-red-700 bg-red-100' :
                                        fee.color === 'orange' ? 'text-orange-700 bg-orange-100' :
                                        fee.color === 'blue' ? 'text-blue-700 bg-blue-100' :
                                        'text-gray-700 bg-gray-100'
                                      }`}
                                    >
                                      {fee.name}
                                    </span>
                                  ));
                                })()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(student.status)}`}>
                                {student.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              {formatDate(student.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center justify-between">
                                <div>
                                  {(() => {
                                    // Calcular data limite do I-20 (10 dias após scholarship fee pago)
                                    if (student.is_scholarship_fee_paid && !student.has_paid_i20_control_fee) {
                                      // Para simplificar, vamos mostrar apenas se há deadline ativo
                                      // A data exata será calculada no componente de detalhes
                                      return (
                                        <div className="flex items-center space-x-2">
                                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                          <span className="text-orange-700 font-medium text-xs">Active Deadline</span>
                                        </div>
                                      );
                                    } else if (student.has_paid_i20_control_fee) {
                                      return (
                                        <div className="flex items-center space-x-2">
                                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                          <span className="text-green-700 font-medium text-xs">Paid</span>
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <span className="text-slate-400 text-xs">Not applicable</span>
                                      );
                                    }
                                  })()}
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                              </div>
                            </td>
                            </tr>
                            
                            {/* Dropdown inline para múltiplas aplicações */}
                            {student.hasMultipleApplications && expandedStudents.has(student.id) && (
                              <tr>
                                <td colSpan={7} className="px-6 py-4 bg-slate-50">
                                  <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-slate-700">All Applications:</h4>
                                    {student.allApplications?.map((app: any, appIndex: number) => (
                                      <div 
                                        key={`${app.application_id}-${appIndex}`}
                                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
                                      >
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm text-slate-900">
                                              {app.scholarship_title || 'No scholarship selected'}
                                            </span>
                                            {app.university_name && (
                                              <span className="text-xs text-slate-600">
                                                @ {app.university_name}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex gap-2 mt-1">
                                            {app.is_application_fee_paid && (
                                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                                                Application Fee Paid
                                              </span>
                                            )}
                                            {app.is_scholarship_fee_paid && (
                                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                                                Scholarship Fee Paid
                                              </span>
                                            )}
                                            {!app.is_application_fee_paid && !app.is_scholarship_fee_paid && (
                                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
                                                Pending Payment
                                              </span>
                                            )}
                                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                              app.application_status === 'approved' ? 'bg-green-100 text-green-800' :
                                              app.application_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-gray-100 text-gray-800'
                                            }`}>
                                              {app.application_status || 'pending'}
                                            </span>
                                          </div>
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onViewStudentDetails(student.id, student.profile_id);
                                          }}
                                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                                        >
                                          View Details
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">No students found for this seller.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SellersList;
