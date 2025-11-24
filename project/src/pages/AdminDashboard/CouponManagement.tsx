import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Tag,
  Copy,
  Loader2,
  User,
  DollarSign
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PromotionalCoupon } from '../../types/coupon';
import { toast } from 'react-hot-toast';

interface CouponUsage {
  id: string;
  user_id: string;
  coupon_code: string;
  fee_type: string;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method: string;
  used_at: string;
  user_email?: string;
  user_name?: string;
  individual_fee_payment_id?: string;
  actual_paid_amount?: number; // Valor de gross_amount_usd ou amount de individual_fee_payments
}

const CouponManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'coupons' | 'usage'>('coupons');
  const [coupons, setCoupons] = useState<PromotionalCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<PromotionalCoupon | null>(null);
  const [saving, setSaving] = useState(false);

  // Usage tab state
  const [usageData, setUsageData] = useState<CouponUsage[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [usageFilters, setUsageFilters] = useState({
    search: '',
    couponCode: '',
    feeType: '',
    dateFrom: '',
    dateTo: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'fixed' as 'percentage' | 'fixed',
    discount_value: 0,
    max_uses: '',
    start_date: '',
    expiration_date: '',
    is_active: true,
    excluded_fee_types: [] as string[]
  });

  const feeTypes = [
    { id: 'selection_process', label: 'Selection Process Fee' },
    { id: 'application_fee', label: 'Application Fee' },
    { id: 'scholarship_fee', label: 'Scholarship Fee' },
    { id: 'i20_control', label: 'I-20 Control Fee' }
  ];

  useEffect(() => {
    if (activeTab === 'coupons') {
      fetchCoupons();
    } else {
      fetchUsage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'usage') {
      const timeoutId = setTimeout(() => {
        fetchUsage();
      }, 300); // Debounce de 300ms para evitar muitas requisições
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usageFilters.couponCode, usageFilters.feeType, usageFilters.dateFrom, usageFilters.dateTo]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promotional_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (coupon?: PromotionalCoupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        name: (coupon as any).name || '',
        description: coupon.description || '',
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        max_uses: coupon.max_uses ? coupon.max_uses.toString() : '',
        start_date: (coupon as any).valid_from ? new Date((coupon as any).valid_from).toISOString().slice(0, 16) : '',
        expiration_date: (coupon as any).valid_until ? new Date((coupon as any).valid_until).toISOString().slice(0, 16) : '',
        is_active: coupon.is_active,
        excluded_fee_types: (coupon as any).excluded_fee_types || []
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        discount_type: 'fixed',
        discount_value: 0,
        max_uses: '',
        start_date: '',
        expiration_date: '',
        is_active: true,
        excluded_fee_types: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.discount_value) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      
      const couponData = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        valid_from: formData.start_date || null,
        valid_until: formData.expiration_date || null,
        is_active: formData.is_active,
        excluded_fee_types: formData.excluded_fee_types
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from('promotional_coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);
        
        if (error) throw error;
        toast.success('Coupon updated successfully');
      } else {
        const { error } = await supabase
          .from('promotional_coupons')
          .insert([couponData]);
        
        if (error) throw error;
        toast.success('Coupon created successfully');
      }

      setIsModalOpen(false);
      fetchCoupons();
    } catch (error: any) {
      console.error('Error saving coupon:', error);
      toast.error(error.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const { error } = await supabase
        .from('promotional_coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon');
    }
  };

  const toggleFeeType = (feeId: string) => {
    setFormData(prev => {
      const fees = prev.excluded_fee_types.includes(feeId)
        ? prev.excluded_fee_types.filter(f => f !== feeId)
        : [...prev.excluded_fee_types, feeId];
      return { ...prev, excluded_fee_types: fees };
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Code copied to clipboard');
  };

  const fetchUsage = async () => {
    try {
      setLoadingUsage(true);
      
      // Buscar usos dos cupons
      let query = supabase
        .from('promotional_coupon_usage')
        .select('*')
        .order('used_at', { ascending: false });

      // Aplicar filtros
      if (usageFilters.couponCode) {
        query = query.ilike('coupon_code', `%${usageFilters.couponCode}%`);
      }
      if (usageFilters.feeType) {
        query = query.eq('fee_type', usageFilters.feeType);
      }
      if (usageFilters.dateFrom) {
        query = query.gte('used_at', usageFilters.dateFrom);
      }
      if (usageFilters.dateTo) {
        query = query.lte('used_at', usageFilters.dateTo + 'T23:59:59');
      }

      const { data: usageData, error } = await query;

      if (error) throw error;

      // Buscar informações dos usuários em lote
      const userIds = [...new Set((usageData || []).map((item: any) => item.user_id))];
      
      let userProfilesMap: Record<string, { email: string; full_name: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, email, full_name')
          .in('user_id', userIds);

        if (!profilesError && profiles) {
          profiles.forEach((profile: any) => {
            userProfilesMap[profile.user_id] = {
              email: profile.email || 'N/A',
              full_name: profile.full_name || 'N/A'
            };
          });
        }
      }

      // Buscar dados de individual_fee_payments
      // Primeiro, tentar usar individual_fee_payment_id se disponível
      const individualFeePaymentIds = [...new Set((usageData || [])
        .map((item: any) => item.individual_fee_payment_id)
        .filter((id: string | null) => id !== null && id !== undefined))];
      
      let individualFeePaymentsByIdMap: Record<string, { gross_amount_usd: number | null; amount: number }> = {};
      
      if (individualFeePaymentIds.length > 0) {
        const { data: feePayments, error: feePaymentsError } = await supabase
          .from('individual_fee_payments')
          .select('id, gross_amount_usd, amount')
          .in('id', individualFeePaymentIds);

        if (!feePaymentsError && feePayments) {
          feePayments.forEach((payment: any) => {
            individualFeePaymentsByIdMap[payment.id] = {
              gross_amount_usd: payment.gross_amount_usd,
              amount: payment.amount
            };
          });
        }
      }

      // Para registros sem individual_fee_payment_id, buscar por user_id, fee_type e data próxima
      const usageWithoutPaymentId = (usageData || []).filter((item: any) => !item.individual_fee_payment_id);
      
      // Buscar todos os pagamentos dos usuários e fee_types envolvidos
      const userIdsForPayments = usageWithoutPaymentId.length > 0 
        ? [...new Set(usageWithoutPaymentId.map((item: any) => item.user_id))]
        : [];
      
      // Normalizar fee_types e incluir ambos os valores (i20_control_fee e i20_control)
      const feeTypesForPayments = usageWithoutPaymentId.length > 0
        ? [...new Set(usageWithoutPaymentId.map((item: any) => {
            const normalized = item.fee_type === 'i20_control_fee' ? 'i20_control' : item.fee_type;
            return normalized;
          }))]
        : [];
      
      // Adicionar também os fee_types originais para garantir que capturemos todos
      const allFeeTypesForQuery = [...new Set([
        ...feeTypesForPayments,
        ...(usageWithoutPaymentId.map((item: any) => item.fee_type))
      ])];
      
      let allFeePayments: any[] = [];
      if (userIdsForPayments.length > 0 && allFeeTypesForQuery.length > 0) {
        const { data: payments, error: allPaymentsError } = await supabase
          .from('individual_fee_payments')
          .select('id, user_id, fee_type, payment_date, gross_amount_usd, amount')
          .in('user_id', userIdsForPayments)
          .in('fee_type', allFeeTypesForQuery)
          .order('payment_date', { ascending: false });

        if (!allPaymentsError && payments) {
          allFeePayments = payments;
        }
      }

      // Processar dados para incluir informações do usuário e valores reais pagos
      const processedData = (usageData || []).map((item: any) => {
        let feePayment: { gross_amount_usd: number | null; amount: number } | null = null;
        
        // Primeiro, tentar usar individual_fee_payment_id
        if (item.individual_fee_payment_id) {
          feePayment = individualFeePaymentsByIdMap[item.individual_fee_payment_id] || null;
        } 
        // Se não tiver, buscar o pagamento mais próximo no tempo
        else if (allFeePayments.length > 0) {
          const usageDate = new Date(item.used_at);
          
          // Normalizar fee_type para correspondência (i20_control_fee -> i20_control)
          const normalizedUsageFeeType = item.fee_type === 'i20_control_fee' ? 'i20_control' : item.fee_type;
          
          // Encontrar pagamentos do mesmo usuário e fee_type (normalizado)
          const matchingPayments = allFeePayments.filter((payment: any) => {
            const normalizedPaymentFeeType = payment.fee_type === 'i20_control_fee' ? 'i20_control' : payment.fee_type;
            return payment.user_id === item.user_id && 
                   normalizedPaymentFeeType === normalizedUsageFeeType;
          });

          if (matchingPayments.length > 0) {
            // Encontrar o pagamento mais próximo no tempo (dentro de 2 horas)
            let closestPayment: any = null;
            let minTimeDiff = Infinity;

            matchingPayments.forEach((payment: any) => {
              const paymentDate = new Date(payment.payment_date);
              const timeDiff = Math.abs(usageDate.getTime() - paymentDate.getTime());
              
              // Considerar apenas pagamentos dentro de 2 horas
              if (timeDiff <= 2 * 60 * 60 * 1000 && timeDiff < minTimeDiff) {
                minTimeDiff = timeDiff;
                closestPayment = payment;
              }
            });

            if (closestPayment) {
              feePayment = {
                gross_amount_usd: closestPayment.gross_amount_usd,
                amount: closestPayment.amount
              };
            }
          }
        }
        
        // Usar gross_amount_usd se disponível, senão usar amount
        const actualPaidAmount = feePayment
          ? (feePayment.gross_amount_usd !== null && feePayment.gross_amount_usd !== undefined
              ? Number(feePayment.gross_amount_usd)
              : Number(feePayment.amount))
          : null;

        return {
          ...item,
          user_email: userProfilesMap[item.user_id]?.email || 'N/A',
          user_name: userProfilesMap[item.user_id]?.full_name || 'N/A',
          actual_paid_amount: actualPaidAmount
        };
      });

      setUsageData(processedData);
    } catch (error) {
      console.error('Error fetching coupon usage:', error);
      toast.error('Failed to load coupon usage');
    } finally {
      setLoadingUsage(false);
    }
  };

  const filteredUsage = usageData.filter(usage => {
    if (usageFilters.search) {
      const searchLower = usageFilters.search.toLowerCase();
      return (
        usage.coupon_code.toLowerCase().includes(searchLower) ||
        usage.user_email?.toLowerCase().includes(searchLower) ||
        usage.user_name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const filteredCoupons = coupons.filter(coupon => 
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFeeType = (feeType: string) => {
    const feeTypeMap: Record<string, string> = {
      'selection_process': 'Selection Process',
      'application_fee': 'Application Fee',
      'scholarship_fee': 'Scholarship Fee',
      'i20_control': 'I-20 Control',
      'i20_control_fee': 'I-20 Control'
    };
    return feeTypeMap[feeType] || feeType;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Coupon Management</h2>
          <p className="text-slate-600">Create and manage promotional coupons</p>
        </div>
        {activeTab === 'coupons' && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-[#05294E] text-white rounded-lg hover:bg-[#0a3d70] transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Coupon
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'coupons'
                ? 'text-[#05294E] border-b-2 border-[#05294E] bg-slate-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Tag className="w-4 h-4" />
              <span>Coupons</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'usage'
                ? 'text-[#05294E] border-b-2 border-[#05294E] bg-slate-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span>Usage History</span>
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'coupons' ? (
        <>
          {/* Search and Filter */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search coupons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              />
            </div>
          </div>

          {/* Coupons List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="w-8 h-8 text-[#05294E] animate-spin" />
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="text-center p-12 text-slate-500">
            No coupons found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Discount</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Usage</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Validity</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900">{coupon.code}</span>
                        <button 
                          onClick={() => copyToClipboard(coupon.code)}
                          className="text-slate-400 hover:text-[#05294E]"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      {coupon.description && (
                        <p className="text-xs text-slate-500 mt-1">{coupon.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `$${coupon.discount_value}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {(coupon as any).current_uses || 0} / {coupon.max_uses || '∞'}
                    </td>
                    <td className="px-6 py-4">
                      {coupon.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3 mr-1" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex flex-col space-y-1">
                        {(coupon as any).valid_from && (
                          <span className="flex items-center text-xs">
                            <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                            From: {new Date((coupon as any).valid_from).toLocaleDateString()}
                          </span>
                        )}
                        {(coupon as any).valid_until && (
                          <span className="flex items-center text-xs">
                            <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                            To: {new Date((coupon as any).valid_until).toLocaleDateString()}
                          </span>
                        )}
                        {!(coupon as any).valid_from && !(coupon as any).valid_until && (
                          <span className="text-xs text-slate-400">Always valid</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleOpenModal(coupon)}
                          className="text-slate-400 hover:text-[#05294E]"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </div>
        </>
      ) : (
        <>
          {/* Usage Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by code, user..."
                  value={usageFilters.search}
                  onChange={(e) => setUsageFilters({...usageFilters, search: e.target.value})}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent text-sm"
                />
              </div>
              
              <div>
                <input
                  type="text"
                  placeholder="Coupon Code"
                  value={usageFilters.couponCode}
                  onChange={(e) => setUsageFilters({...usageFilters, couponCode: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent text-sm"
                />
              </div>

              <div>
                <select
                  value={usageFilters.feeType}
                  onChange={(e) => setUsageFilters({...usageFilters, feeType: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent text-sm"
                >
                  <option value="">All Fee Types</option>
                  {feeTypes.map((fee) => (
                    <option key={fee.id} value={fee.id}>{fee.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="date"
                  placeholder="From Date"
                  value={usageFilters.dateFrom}
                  onChange={(e) => setUsageFilters({...usageFilters, dateFrom: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent text-sm"
                />
              </div>

              <div>
                <input
                  type="date"
                  placeholder="To Date"
                  value={usageFilters.dateTo}
                  onChange={(e) => setUsageFilters({...usageFilters, dateTo: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Usage Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {loadingUsage ? (
              <div className="flex justify-center items-center p-12">
                <Loader2 className="w-8 h-8 text-[#05294E] animate-spin" />
              </div>
            ) : filteredUsage.length === 0 ? (
              <div className="text-center p-12 text-slate-500">
                No coupon usage found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Coupon Code</th>
                      <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Fee Type</th>
                      <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Original Amount</th>
                      <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Discount</th>
                      <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Final Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredUsage.map((usage) => (
                      <tr key={usage.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-600">
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                            {new Date(usage.used_at).toLocaleDateString()}
                            <span className="ml-2 text-xs text-slate-400">
                              {new Date(usage.used_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-slate-900">{usage.coupon_code}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <User className="w-3 h-3 text-slate-400" />
                            <div>
                              <div className="text-sm font-medium text-slate-900">{usage.user_name}</div>
                              <div className="text-xs text-slate-500">{usage.user_email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {formatFeeType(usage.fee_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {usage.actual_paid_amount !== null && usage.actual_paid_amount !== undefined
                            ? `$${usage.actual_paid_amount.toFixed(2)}`
                            : `$${Number(usage.original_amount).toFixed(2)}`}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-600">
                          -${Number(usage.discount_amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">
                          {usage.actual_paid_amount !== null && usage.actual_paid_amount !== undefined
                            ? `$${usage.actual_paid_amount.toFixed(2)}`
                            : `$${Number(usage.final_amount).toFixed(2)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Coupon Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent uppercase"
                    placeholder="e.g. SUMMER2025"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Coupon Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    placeholder="Display name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    placeholder="Internal note"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({...formData, discount_type: e.target.value as 'percentage' | 'fixed'})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                  >
                    <option value="fixed">Fixed Amount ($)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Discount Value</label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Uses (Optional)</label>
                  <input
                    type="number"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({...formData, max_uses: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    min="1"
                    placeholder="Unlimited"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="w-4 h-4 text-[#05294E] border-slate-300 rounded focus:ring-[#05294E]"
                    />
                    <span className="ml-2 text-sm font-medium text-slate-700">Active</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expiration Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Excluded Fee Types (leave unchecked to apply to all)</label>
                <div className="grid grid-cols-2 gap-3">
                  {feeTypes.map((fee) => (
                    <label key={fee.id} className="flex items-center p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={formData.excluded_fee_types.includes(fee.id)}
                        onChange={() => toggleFeeType(fee.id)}
                        className="w-4 h-4 text-[#05294E] border-slate-300 rounded focus:ring-[#05294E]"
                      />
                      <span className="ml-2 text-sm text-slate-700">Exclude {fee.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#05294E] text-white rounded-lg hover:bg-[#0a3d70] transition-colors flex items-center"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponManagement;
