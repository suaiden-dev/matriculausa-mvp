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
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PromotionalCoupon } from '../../types/coupon';
import { toast } from 'react-hot-toast';

const CouponManagement: React.FC = () => {
  const [coupons, setCoupons] = useState<PromotionalCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<PromotionalCoupon | null>(null);
  const [saving, setSaving] = useState(false);

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
    fetchCoupons();
  }, []);

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

  const filteredCoupons = coupons.filter(coupon => 
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Coupon Management</h2>
          <p className="text-slate-600">Create and manage promotional coupons</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-[#05294E] text-white rounded-lg hover:bg-[#0a3d70] transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Coupon
        </button>
      </div>

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
