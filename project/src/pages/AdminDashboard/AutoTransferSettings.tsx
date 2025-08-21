import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Clock, 
  DollarSign,
  Calendar,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface University {
  id: string;
  name: string;
  has_stripe_connect: boolean;
  has_bank_account: boolean;
  current_settings?: AutoTransferConfig;
}

interface AutoTransferConfig {
  id?: string;
  university_id: string;
  auto_transfer_enabled: boolean;
  minimum_transfer_amount: number; // em centavos
  transfer_frequency: 'daily' | 'weekly' | 'monthly';
  transfer_day_of_week?: number; // 1-7 (Monday-Sunday)
  transfer_day_of_month?: number; // 1-31
  last_auto_transfer_at?: string;
}

const AutoTransferSettings: React.FC = () => {
  const { user } = useAuth();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterByEnabled, setFilterByEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUniversities();
    }
  }, [user]);

  const loadUniversities = async () => {
    setLoading(true);
    try {
      // Simular carregamento de universidades com configurações
      const mockUniversities: University[] = [
        {
          id: 'univ_1',
          name: 'Harvard University',
          has_stripe_connect: true,
          has_bank_account: false,
          current_settings: {
            university_id: 'univ_1',
            auto_transfer_enabled: true,
            minimum_transfer_amount: 1000, // $10.00
            transfer_frequency: 'weekly',
            transfer_day_of_week: 1, // Monday
            last_auto_transfer_at: '2024-01-15T10:00:00Z'
          }
        },
        {
          id: 'univ_2',
          name: 'Stanford University',
          has_stripe_connect: false,
          has_bank_account: true,
          current_settings: {
            university_id: 'univ_2',
            auto_transfer_enabled: false,
            minimum_transfer_amount: 2000, // $20.00
            transfer_frequency: 'monthly',
            transfer_day_of_month: 1
          }
        },
        {
          id: 'univ_3',
          name: 'MIT',
          has_stripe_connect: true,
          has_bank_account: true,
          current_settings: {
            university_id: 'univ_3',
            auto_transfer_enabled: true,
            minimum_transfer_amount: 500, // $5.00
            transfer_frequency: 'daily'
          }
        },
        {
          id: 'univ_4',
          name: 'Yale University',
          has_stripe_connect: true,
          has_bank_account: false,
          current_settings: {
            university_id: 'univ_4',
            auto_transfer_enabled: false,
            minimum_transfer_amount: 1500, // $15.00
            transfer_frequency: 'weekly',
            transfer_day_of_week: 5 // Friday
          }
        }
      ];
      setUniversities(mockUniversities);
    } catch (error) {
      console.error('Error loading universities:', error);
      setMessage({ type: 'error', text: 'Failed to load universities' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (universityId: string, settings: AutoTransferConfig) => {
    setSaving(universityId);
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Atualizar no estado local
      setUniversities(prev => prev.map(uni => 
        uni.id === universityId 
          ? { ...uni, current_settings: settings }
          : uni
      ));

      setMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(null);
    }
  };

  const handleSettingsChange = (universityId: string, key: keyof AutoTransferConfig, value: any) => {
    setUniversities(prev => prev.map(uni => {
      if (uni.id === universityId) {
        const currentSettings = uni.current_settings || {
          university_id: universityId,
          auto_transfer_enabled: false,
          minimum_transfer_amount: 1000,
          transfer_frequency: 'weekly' as const
        };

        return {
          ...uni,
          current_settings: {
            ...currentSettings,
            [key]: value
          }
        };
      }
      return uni;
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const getPaymentMethodsText = (university: University) => {
    const methods = [];
    if (university.has_stripe_connect) methods.push('Stripe Connect');
    if (university.has_bank_account) methods.push('Bank Transfer');
    return methods.length > 0 ? methods.join(', ') : 'No payment method configured';
  };

  const getFrequencyText = (frequency: string, dayOfWeek?: number, dayOfMonth?: number) => {
    switch (frequency) {
      case 'daily':
        return 'Every day at 12:00 PM';
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Every ${days[dayOfWeek || 1]} at 12:00 PM`;
      case 'monthly':
        return `Every month on day ${dayOfMonth || 1} at 12:00 PM`;
      default:
        return 'Not configured';
    }
  };

  const filteredUniversities = universities.filter(uni => {
    const matchesSearch = uni.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterByEnabled === 'enabled') {
      return matchesSearch && uni.current_settings?.auto_transfer_enabled;
    } else if (filterByEnabled === 'disabled') {
      return matchesSearch && !uni.current_settings?.auto_transfer_enabled;
    }
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auto Transfer Settings</h1>
          <p className="text-gray-600">Configure automatic transfer rules for universities</p>
        </div>
        <button
          onClick={loadUniversities}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-md p-4 ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Universities
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Search by university name..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auto Transfer Status
            </label>
            <select
              value={filterByEnabled}
              onChange={(e) => setFilterByEnabled(e.target.value as any)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              aria-label="Filter by auto transfer status"
              title="Filter by auto transfer status"
            >
              <option value="all">All Universities</option>
              <option value="enabled">Auto Transfer Enabled</option>
              <option value="disabled">Auto Transfer Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Universities List */}
      <div className="space-y-4">
        {filteredUniversities.map((university) => {
          const settings = university.current_settings || {
            university_id: university.id,
            auto_transfer_enabled: false,
            minimum_transfer_amount: 1000,
            transfer_frequency: 'weekly' as const
          };

          return (
            <div key={university.id} className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{university.name}</h3>
                    <p className="text-sm text-gray-500">
                      Payment Methods: {getPaymentMethodsText(university)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingsChange(university.id, 'auto_transfer_enabled', !settings.auto_transfer_enabled)}
                    className="flex items-center"
                  >
                    {settings.auto_transfer_enabled ? (
                      <ToggleRight className="w-8 h-8 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-400" />
                    )}
                    <span className={`ml-2 text-sm font-medium ${settings.auto_transfer_enabled ? 'text-green-700' : 'text-gray-500'}`}>
                      {settings.auto_transfer_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </button>
                </div>

                {settings.auto_transfer_enabled && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Minimum Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Minimum Transfer Amount
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          value={(settings.minimum_transfer_amount / 100).toFixed(2)}
                          onChange={(e) => handleSettingsChange(university.id, 'minimum_transfer_amount', Math.round(parseFloat(e.target.value || '0') * 100))}
                          className="pl-7 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="10.00"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Current: {formatCurrency(settings.minimum_transfer_amount)}
                      </p>
                    </div>

                    {/* Frequency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Transfer Frequency
                      </label>
                      <select
                        value={settings.transfer_frequency}
                        onChange={(e) => handleSettingsChange(university.id, 'transfer_frequency', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        aria-label="Transfer frequency"
                        title="Transfer frequency"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    {/* Day Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {settings.transfer_frequency === 'weekly' ? 'Day of Week' : 
                         settings.transfer_frequency === 'monthly' ? 'Day of Month' : 'Schedule'}
                      </label>
                      {settings.transfer_frequency === 'weekly' ? (
                        <select
                          value={settings.transfer_day_of_week || 1}
                          onChange={(e) => handleSettingsChange(university.id, 'transfer_day_of_week', parseInt(e.target.value))}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          aria-label="Day of week for transfers"
                          title="Day of week for transfers"
                        >
                          <option value={1}>Monday</option>
                          <option value={2}>Tuesday</option>
                          <option value={3}>Wednesday</option>
                          <option value={4}>Thursday</option>
                          <option value={5}>Friday</option>
                          <option value={6}>Saturday</option>
                          <option value={0}>Sunday</option>
                        </select>
                      ) : settings.transfer_frequency === 'monthly' ? (
                        <select
                          value={settings.transfer_day_of_month || 1}
                          onChange={(e) => handleSettingsChange(university.id, 'transfer_day_of_month', parseInt(e.target.value))}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          aria-label="Day of month for transfers"
                          title="Day of month for transfers"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <option key={day} value={day}>Day {day}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm text-gray-500 py-2">
                          Transfers will occur daily at 12:00 PM
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {settings.auto_transfer_enabled && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Schedule Summary</h4>
                    <p className="text-sm text-blue-700">
                      {getFrequencyText(settings.transfer_frequency, settings.transfer_day_of_week, settings.transfer_day_of_month)}
                    </p>
                    <p className="text-sm text-blue-700">
                      Minimum amount: {formatCurrency(settings.minimum_transfer_amount)}
                    </p>
                    {settings.last_auto_transfer_at && (
                      <p className="text-xs text-blue-600 mt-1">
                        Last transfer: {new Date(settings.last_auto_transfer_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleSaveSettings(university.id, settings)}
                    disabled={saving === university.id}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving === university.id ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUniversities.length === 0 && (
        <div className="text-center py-12">
          <Settings className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No universities found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'No universities match the current filters.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default AutoTransferSettings;
