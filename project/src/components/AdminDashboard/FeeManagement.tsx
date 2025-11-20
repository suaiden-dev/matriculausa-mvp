import React, { useState, useEffect } from 'react';
import {
  Search,
  Edit3,
  Save,
  X,
  Users,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
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
  const { getFeeAmount } = useFeeConfig();
  

  useEffect(() => {
    fetchStudents();
    fetchAffiliates();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);

      // Buscar todos os estudantes
      const { data: studentsData, error: studentsError } = await supabase
        .from('user_profiles')
        .select('id, user_id, full_name, email, dependents, has_paid_selection_process_fee, has_paid_i20_control_fee, is_application_fee_paid, seller_referral_code, system_type, created_at')
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
            .single();

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
              selection_process: editingFees.selection_process_fee || selectionProcessFee,
              application: 0, // Application fee é variável por universidade
              scholarship: editingFees.scholarship_fee || scholarshipFee,
              i20_control: editingFees.i20_control_fee || i20ControlFee
            }
          };
        }
        return student;
      }));

      cancelEditing();
    } catch (error) {
      console.error('Error saving fee overrides:', error);
      alert('Erro ao salvar as taxas personalizadas');
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
          const dependents = student.dependents || 0;
          const dependentsExtra = dependents * 150;

          return {
            ...student,
            feeOverrides: undefined,
            calculatedFees: {
              selection_process: selectionProcessFee + dependentsExtra,
              application: 0, // Application fee é variável por universidade
              scholarship: scholarshipFee,
              i20_control: i20ControlFee
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
    } catch (error) {
      console.error('Error resetting fees:', error);
      alert('Erro ao resetar as taxas');
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
          <p className="text-gray-600">Customize fees for individual students</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {filteredStudents.length} students found
          </span>
        </div>
      </div>

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
                        <span className={`text-sm font-medium ${
                          student.feeOverrides ? 'text-blue-600' : 'text-gray-900'
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



                  {/* Scholarship Fee */}
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
                        <span className={`text-sm font-medium ${
                          student.feeOverrides ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          ${student.calculatedFees.scholarship.toFixed(2)}
                        </span>
                        {student.feeOverrides && (
                          <span className="ml-1 text-xs text-blue-500">(custom)</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* I-20 Control Fee */}
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
                        <span className={`text-sm font-medium ${
                          student.feeOverrides ? 'text-blue-600' : 'text-gray-900'
                        }`}>
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
                      className={`px-3 py-1 border rounded text-sm ${
                        currentPage === page
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
    </div>
  );
};

export default FeeManagement;