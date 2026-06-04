import React, { useState, useEffect } from 'react';
import {
  Search,
  Edit3,
  Save,
  X,
  Users,
  AlertCircle,
  CheckCircle,
  Info,
  Eye,
  Calendar
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useFeeConfig } from '../../hooks/useFeeConfig';

interface Student {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  dependents?: number;
  has_paid_selection_process_fee: boolean;
  has_paid_i20_control_fee: boolean;
  is_application_fee_paid?: boolean;
  seller_referral_code?: string | null;
  system_type?: string;
  placement_fee_flow?: boolean;
  is_placement_fee_paid?: boolean;
}

interface FeeOverride {
  user_id: string;
  selection_process_fee?: number;
  scholarship_fee?: number;
  i20_control_fee?: number;
}

interface StudentWithFees extends Student {
  feeOverrides?: FeeOverride;
  calculatedFees: {
    selection_process: number;
    application: number;
    scholarship: number;
    i20_control: number;
  };
}


interface InstallmentPlanWithProfile {
  id: string;
  user_id: string;
  fee_type: string;
  total_amount: number;
  total_installments: number;
  installments_paid: number;
  amount_paid: number;
  status: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  student: {
    id: string;
    full_name: string | null;
    email: string | null;
    placement_fee_due_date: string | null;
  } | null;
}

const FeeManagement: React.FC = () => {
  const [students, setStudents] = useState<StudentWithFees[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [affiliateFilter, setAffiliateFilter] = useState<string>('all');
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editingFees, setEditingFees] = useState<FeeOverride | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Novos estados para parcelamento
  const [activeTab, setActiveTab] = useState<'overrides' | 'installments'>('overrides');
  const [installments, setInstallments] = useState<InstallmentPlanWithProfile[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  
  const { getFeeAmount } = useFeeConfig();

  useEffect(() => {
    fetchStudents();
    fetchAffiliates();
    fetchInstallmentPlans();
  }, []);

  const fetchInstallmentPlans = async () => {
    try {
      setLoadingInstallments(true);
      const { data: plans, error: plansError } = await supabase
        .from('fee_installment_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;

      if (!plans || plans.length === 0) {
        setInstallments([]);
        return;
      }

      const userIds = Array.from(new Set(plans.map(p => p.user_id)));
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, user_id, full_name, email, placement_fee_due_date')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const consolidated: InstallmentPlanWithProfile[] = plans.map(plan => {
        const profile = (profiles || []).find(p => p.user_id === plan.user_id);
        return {
          ...plan,
          student: profile ? {
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            placement_fee_due_date: profile.placement_fee_due_date
          } : null
        };
      });

      setInstallments(consolidated);
    } catch (err) {
      console.error('Error fetching installment plans:', err);
      toast.error('Error loading installment plans');
    } finally {
      setLoadingInstallments(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);

      // Buscar todos os estudantes
      const { data: studentsData, error: studentsError } = await supabase
        .from('user_profiles')
        .select('id, user_id, full_name, email, dependents, has_paid_selection_process_fee, has_paid_i20_control_fee, is_application_fee_paid, seller_referral_code, system_type, placement_fee_flow, is_placement_fee_paid, created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (studentsError) throw studentsError;

      // Buscar overrides de taxas existentes
      const { data: overridesData, error: overridesError } = await supabase
        .from('user_fee_overrides')
        .select('*');

      if (overridesError) {
        console.warn('Tabela user_fee_overrides não existe ainda, será criada automaticamente');
      }

      // Combinar dados
      const studentsWithFees: StudentWithFees[] = (studentsData || []).map(student => {
        const override = (overridesData || []).find(o => o.user_id === student.user_id);
        const dependents = student.dependents || 0;
        // ✅ CORREÇÃO: Para simplified, Selection Process Fee é fixo ($350), sem dependentes
        // Dependentes só afetam Application Fee ($100 por dependente)
        const systemType = student.system_type || 'legacy';
        const dependentsExtra = systemType === 'simplified' ? 0 : (dependents * 150); // $150 por dependente apenas no Selection Process (legacy)

        // Determinar valores base baseado no system_type do estudante
        const baseSelectionFee = systemType === 'simplified' ? 350 : 400;
        const baseScholarshipFee = systemType === 'simplified' ? 550 : 900;
        const baseI20Fee = 900; // Sempre 900 para ambos os sistemas
        const baseApplicationFee = Number(getFeeAmount('application_fee')) || 0;
        const applicationDependentsExtra = dependents > 0 ? dependents * 100 : 0; // $100 por dependente para ambos os sistemas

        return {
          ...student,
          feeOverrides: override || undefined,
          calculatedFees: {
            selection_process: override?.selection_process_fee || (baseSelectionFee + dependentsExtra),
            application: baseApplicationFee + applicationDependentsExtra,
            scholarship: override?.scholarship_fee || baseScholarshipFee,
            i20_control: override?.i20_control_fee || baseI20Fee
          }
        };
      });

      setStudents(studentsWithFees);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAffiliates = async () => {
    try {
      // Buscar usuários com role affiliate_admin
      const { data: affiliateAdminsData, error: affiliateAdminsError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email')
        .eq('role', 'affiliate_admin')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (affiliateAdminsError) return;

      const affiliatesWithSellers = await Promise.all(
        (affiliateAdminsData || []).map(async (admin: any) => {
          const { data: affiliateAdminData } = await supabase
            .from('affiliate_admins')
            .select('id')
            .eq('user_id', admin.user_id)
            .maybeSingle();

          let sellers: any[] = [];
          if (affiliateAdminData) {
            const { data: sellersData } = await supabase
              .from('sellers')
              .select('id, referral_code, name, email')
              .eq('affiliate_admin_id', affiliateAdminData.id)
              .eq('is_active', true);
            sellers = sellersData || [];
          }
          if (sellers.length === 0) {
            const { data: sellersByEmail } = await supabase
              .from('sellers')
              .select('id, referral_code, name, email')
              .eq('email', admin.email)
              .eq('is_active', true);
            sellers = sellersByEmail || [];
          }
          return {
            id: admin.user_id,
            user_id: admin.user_id,
            name: admin.full_name || admin.email,
            email: admin.email,
            referral_code: sellers[0]?.referral_code || null,
            sellers
          };
        })
      );
      setAffiliates(affiliatesWithSellers);
    } catch (e) {
      // silencioso
    }
  };

  const startEditing = (student: StudentWithFees) => {
    setEditingStudent(student.id);
    setEditingFees({
      user_id: student.user_id,
      selection_process_fee: student.calculatedFees.selection_process,
      scholarship_fee: student.calculatedFees.scholarship,
      i20_control_fee: student.calculatedFees.i20_control
    });
  };

  const cancelEditing = () => {
    setEditingStudent(null);
    setEditingFees(null);
  };

  const saveFeeOverrides = async () => {
    if (!editingFees) return;

    try {
      setSaving(true);

      // Criar tabela se não existir
      const { error: createTableError } = await supabase.rpc('create_user_fee_overrides_table_if_not_exists');

      if (createTableError) {
        console.warn('Erro ao criar tabela, tentando continuar:', createTableError);
      }

      // Salvar ou atualizar override
      const { error } = await supabase
        .from('user_fee_overrides')
        .upsert({
          user_id: editingFees.user_id,
          selection_process_fee: editingFees.selection_process_fee,
          scholarship_fee: editingFees.scholarship_fee,
          i20_control_fee: editingFees.i20_control_fee,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Atualizar estado local
      setStudents(prev => prev.map(student => {
        if (student.user_id === editingFees.user_id) {
          return {
            ...student,
            feeOverrides: editingFees,
            calculatedFees: {
              selection_process: editingFees.selection_process_fee ?? student.calculatedFees.selection_process,
              application: student.calculatedFees.application,
              scholarship: editingFees.scholarship_fee ?? student.calculatedFees.scholarship,
              i20_control: editingFees.i20_control_fee ?? student.calculatedFees.i20_control
            }
          };
        }
        return student;
      }));

      cancelEditing();
      toast.success('Taxas personalizadas salvas com sucesso');
    } catch (error) {
      console.error('Error saving fee overrides:', error);
      toast.error('Erro ao salvar as taxas personalizadas');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async (userId: string) => {
    try {
      setSaving(true);

      // Remover override do banco
      const { error } = await supabase
        .from('user_fee_overrides')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // Atualizar estado local
      setStudents(prev => prev.map(student => {
        if (student.user_id === userId) {
          return {
            ...student,
            feeOverrides: undefined,
            calculatedFees: {
              selection_process: student.calculatedFees.selection_process,
              application: student.calculatedFees.application,
              scholarship: student.calculatedFees.scholarship,
              i20_control: student.calculatedFees.i20_control
            }
          };
        }
        return student;
      }));

      // Cancelar edição se o estudante que teve o reset é o que está sendo editado
      const studentBeingReset = students.find(s => s.user_id === userId);
      if (studentBeingReset && editingStudent === studentBeingReset.id) {
        cancelEditing();
      }
      toast.success('Taxas resetadas com sucesso');
    } catch (error) {
      console.error('Error resetting fees:', error);
      toast.error('Erro ao resetar as taxas');
    } finally {
      setSaving(false);
    }
  };

  // Filtrar estudantes
  const filteredStudents = students.filter(student => {
    const matchesSearch = (student.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (student.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    if (affiliateFilter === 'all') return matchesSearch;

    // Se não tem referral code, exclui quando filtrando por um affiliate específico
    if (!student.seller_referral_code) return false;

    // Tenta casar pelo referral_code direto do affiliate
    let affiliate = affiliates.find((aff: any) => aff.referral_code === student.seller_referral_code);
    if (!affiliate) {
      // Senão, verifica sellers do affiliate
      affiliate = affiliates.find((aff: any) => aff.sellers?.some((s: any) => s.referral_code === student.seller_referral_code));
    }

    const matchesAffiliate = affiliate && affiliate.id === affiliateFilter;
    return matchesSearch && !!matchesAffiliate;
  });

  // Paginação
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  // Filtrar e paginar parcelas
  const filteredInstallments = installments.filter(inst => {
    const matchesSearch = (inst.student?.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (inst.student?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalInstallmentPages = Math.ceil(filteredInstallments.length / itemsPerPage);
  const startInstallmentIndex = (currentPage - 1) * itemsPerPage;
  const currentInstallments = filteredInstallments.slice(startInstallmentIndex, startInstallmentIndex + itemsPerPage);

  const handleTabChange = (tab: 'overrides' | 'installments') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading students...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fee Management</h2>
          <p className="text-gray-600">Customize fees and monitor installment plans for students</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {activeTab === 'overrides' ? `${filteredStudents.length} students found` : `${filteredInstallments.length} installment plans found`}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabChange('overrides')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'overrides'
                ? 'border-[#05294E] text-[#05294E]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Fee Overrides
          </button>
          <button
            onClick={() => handleTabChange('installments')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'installments'
                ? 'border-[#05294E] text-[#05294E]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Active Installments
          </button>
        </nav>
      </div>

      {activeTab === 'overrides' ? (
        <>
          {/* Info Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Info className="h-5 w-5 text-blue-600 mr-3" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Fee Override System</p>
                <p>
                  You can customize fees for individual students. Default values include $150 per dependent for Selection Process Fee and an additional $100 per dependent in Application Fee (display only).
                </p>
              </div>
            </div>
          </div>

          {/* Search and Affiliate Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by student name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Affiliate Admin</label>
                <select
                  value={affiliateFilter}
                  onChange={(e) => setAffiliateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-sm"
                >
                  <option value="all">All Affiliates</option>
                  {affiliates.map((affiliate: any) => (
                    <option key={affiliate.id} value={affiliate.id}>
                      {affiliate.name || affiliate.email || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Selection Process
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Application Fee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scholarship Fee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      I-20 Control
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <Users className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.full_name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.email || 'N/A'}
                            </div>
                            {(student.dependents || 0) > 0 && (
                              <div className="text-xs text-blue-600">
                                {student.dependents} dependent{(student.dependents || 0) > 1 ? 's' : ''}
                                <span className="ml-1 text-[11px] text-slate-500">(+$150 Selection, +$100 Application)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Selection Process Fee */}
                      <td className="px-6 py-4">
                        {editingStudent === student.id ? (
                          <input
                            type="number"
                            value={editingFees?.selection_process_fee || ''}
                            onChange={(e) => setEditingFees(prev => ({
                              ...prev!,
                              selection_process_fee: Number(e.target.value)
                            }))}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          <div className="flex items-center">
                            <span className={`text-sm font-medium ${student.feeOverrides ? 'text-blue-600' : 'text-gray-900'
                              }`}>
                              ${student.calculatedFees.selection_process.toFixed(2)}
                            </span>
                            {student.feeOverrides && (
                              <span className="ml-1 text-xs text-blue-500">(custom)</span>
                            )}
                            {student.has_paid_selection_process_fee && (
                              <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                            )}
                          </div>
                        )}
                      </td>

                      {/* Application Fee (somente referência; varia por bolsa) */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">Varies by scholarship</span>
                            {student.is_application_fee_paid && (
                              <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                            )}
                          </div>
                          <span className="text-xs text-slate-500">+ $100 per dependent (applied at checkout)</span>
                        </div>
                      </td>



                      {/* Scholarship Fee / I-20 ou Placement Fee baseado no fluxo */}
                      {(student as any).placement_fee_flow ? (
                        <td className="px-6 py-4" colSpan={2}>
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-purple-700">Placement Fee</span>
                            {(student as any).is_placement_fee_paid ? (
                              <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                            ) : (
                              <span className="ml-2 text-xs text-slate-400">Not paid</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">Placement fee flow</span>
                        </td>
                      ) : (
                        <>
                          <td className="px-6 py-4">
                            {editingStudent === student.id ? (
                              <input
                                type="number"
                                value={editingFees?.scholarship_fee || ''}
                                onChange={(e) => setEditingFees(prev => ({
                                  ...prev!,
                                  scholarship_fee: Number(e.target.value)
                                }))}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                min="0"
                                step="0.01"
                              />
                            ) : (
                              <div className="flex items-center">
                                <span className={`text-sm font-medium ${student.feeOverrides ? 'text-blue-600' : 'text-gray-900'}`}>
                                  ${student.calculatedFees.scholarship.toFixed(2)}
                                </span>
                                {student.feeOverrides && (
                                  <span className="ml-1 text-xs text-blue-500">(custom)</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingStudent === student.id ? (
                              <input
                                type="number"
                                value={editingFees?.i20_control_fee || ''}
                                onChange={(e) => setEditingFees(prev => ({
                                  ...prev!,
                                  i20_control_fee: Number(e.target.value)
                                }))}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                min="0"
                                step="0.01"
                              />
                            ) : (
                              <div className="flex items-center">
                                <span className={`text-sm font-medium ${student.feeOverrides ? 'text-blue-600' : 'text-gray-900'}`}>
                                  ${student.calculatedFees.i20_control.toFixed(2)}
                                </span>
                                {student.feeOverrides && (
                                  <span className="ml-1 text-xs text-blue-500">(custom)</span>
                                )}
                                {student.has_paid_i20_control_fee && (
                                  <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                                )}
                              </div>
                            )}
                          </td>
                        </>
                      )}


                      {/* Actions */}
                      <td className="px-6 py-4">
                        {editingStudent === student.id ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={saveFeeOverrides}
                              disabled={saving}
                              className="text-green-600 hover:text-green-800 p-1 rounded"
                              title="Save changes"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={saving}
                              className="text-gray-600 hover:text-gray-800 p-1 rounded"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => startEditing(student)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded"
                              title="Edit fees"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            {student.feeOverrides && (
                              <button
                                onClick={() => resetToDefault(student.user_id)}
                                disabled={saving}
                                className="text-orange-600 hover:text-orange-800 p-1 rounded"
                                title="Reset to default"
                              >
                                <AlertCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredStudents.length)} of {filteredStudents.length} results
                  </div>
                  <nav className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 border rounded text-sm ${currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Search for Installments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Plan</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                />
              </div>
            </div>
          </div>

          {/* Installments Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {loadingInstallments ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading installment plans...</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fee Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Progress
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Next Due Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentInstallments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                            No active installment plans found.
                          </td>
                        </tr>
                      ) : (
                        currentInstallments.map((inst) => (
                          <tr key={inst.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-gray-600" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {inst.student?.full_name || 'N/A'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {inst.student?.email || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                {inst.fee_type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-semibold text-slate-700">
                                  {inst.installments_paid} / {inst.total_installments}
                                </span>
                                <span className="text-xs text-slate-400">Paid</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                              ${Number(inst.total_amount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                              ${Number(inst.amount_paid).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {inst.student?.placement_fee_due_date ? (
                                <div className="flex items-center text-sm text-amber-600 font-medium bg-amber-50 px-2.5 py-1 rounded-lg w-fit">
                                  <Calendar className="w-4 h-4 mr-1.5 flex-shrink-0 text-amber-500" />
                                  {new Date(inst.student.placement_fee_due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {inst.student?.id && (
                                <button
                                  onClick={() => {
                                    window.location.href = `/admin/dashboard/students/${inst.student?.id}`;
                                  }}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-[#05294E] hover:bg-[#05294E]/90 focus:outline-none"
                                  title="View Student Details"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  View Student
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalInstallmentPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {startInstallmentIndex + 1} to {Math.min(startInstallmentIndex + itemsPerPage, filteredInstallments.length)} of {filteredInstallments.length} results
                      </div>
                      <nav className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        {Array.from({ length: Math.min(5, totalInstallmentPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 border rounded text-sm ${currentPage === page
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalInstallmentPages))}
                          disabled={currentPage === totalInstallmentPages}
                          className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FeeManagement;