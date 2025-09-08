import React, { useState } from 'react';
import { 
  Settings, 
  Shield, 
  Bell, 
  Database, 
  Mail, 
  Server, 
  Users, 
  FileText, 
  Save, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  Star,
  Building,
  GraduationCap
} from 'lucide-react';
import FeaturedScholarshipsManagement from './FeaturedScholarshipsManagement';
import FeaturedUniversitiesManagement from './FeaturedUniversitiesManagement';

const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    // Platform Settings
    autoApproveUniversities: false,
    emailNotifications: true,
    maintenanceMode: false,
    allowRegistrations: true,
    
    // Security Settings
    requireEmailVerification: true,
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    
    // Email Settings
    emailProvider: 'supabase',
    emailFromName: 'Matrícula USA',
    emailFromAddress: 'noreply@matriculausa.com',
    
    // System Settings
    maxFileSize: 10,
    backupFrequency: 'daily',
    logRetention: 30
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSaving(false);
    setSaved(true);
    
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    {
      id: 'general',
      label: 'General Settings',
      icon: Settings,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'featured-scholarships',
      label: 'Featured Scholarships',
      icon: Star,
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      id: 'featured-universities',
      label: 'Featured Universities',
      icon: Building,
      color: 'bg-green-100 text-green-600'
    }
  ];

  const settingSections = [
    {
      title: 'Platform Configuration',
      icon: Settings,
      color: 'bg-blue-100 text-blue-600',
      settings: [
        {
          key: 'autoApproveUniversities',
          label: 'Auto-approve Universities',
          description: 'Automatically approve university registrations without manual review',
          type: 'toggle'
        },
        {
          key: 'emailNotifications',
          label: 'Email Notifications',
          description: 'Send email notifications for important events',
          type: 'toggle'
        },
        {
          key: 'maintenanceMode',
          label: 'Maintenance Mode',
          description: 'Put the platform in maintenance mode',
          type: 'toggle'
        },
        {
          key: 'allowRegistrations',
          label: 'Allow New Registrations',
          description: 'Allow new users to register on the platform',
          type: 'toggle'
        }
      ]
    },
    {
      title: 'Security Settings',
      icon: Shield,
      color: 'bg-green-100 text-green-600',
      settings: [
        {
          key: 'requireEmailVerification',
          label: 'Require Email Verification',
          description: 'Users must verify their email before accessing the platform',
          type: 'toggle'
        },
        {
          key: 'sessionTimeout',
          label: 'Session Timeout (hours)',
          description: 'How long user sessions remain active',
          type: 'number',
          min: 1,
          max: 168
        },
        {
          key: 'maxLoginAttempts',
          label: 'Max Login Attempts',
          description: 'Maximum failed login attempts before account lockout',
          type: 'number',
          min: 3,
          max: 10
        }
      ]
    },
    {
      title: 'Email Configuration',
      icon: Mail,
      color: 'bg-purple-100 text-purple-600',
      settings: [
        {
          key: 'emailProvider',
          label: 'Email Provider',
          description: 'Email service provider for sending notifications',
          type: 'select',
          options: [
            { value: 'supabase', label: 'Supabase' },
            { value: 'sendgrid', label: 'SendGrid' },
            { value: 'mailgun', label: 'Mailgun' }
          ]
        },
        {
          key: 'emailFromName',
          label: 'From Name',
          description: 'Name displayed in outgoing emails',
          type: 'text'
        },
        {
          key: 'emailFromAddress',
          label: 'From Email Address',
          description: 'Email address used for outgoing emails',
          type: 'email'
        }
      ]
    },
    {
      title: 'System Configuration',
      icon: Server,
      color: 'bg-orange-100 text-orange-600',
      settings: [
        {
          key: 'maxFileSize',
          label: 'Max File Size (MB)',
          description: 'Maximum file size for uploads',
          type: 'number',
          min: 1,
          max: 100
        },
        {
          key: 'backupFrequency',
          label: 'Backup Frequency',
          description: 'How often to backup the database',
          type: 'select',
          options: [
            { value: 'hourly', label: 'Hourly' },
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' }
          ]
        },
        {
          key: 'logRetention',
          label: 'Log Retention (days)',
          description: 'How long to keep system logs',
          type: 'number',
          min: 7,
          max: 365
        }
      ]
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'featured-scholarships':
        return <FeaturedScholarshipsManagement />;
      case 'featured-universities':
        return <FeaturedUniversitiesManagement />;
      default:
        return (
          <>
            {/* System Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                <Database className="h-5 w-5 mr-2 text-green-500" />
                System Status
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Database</p>
                      <p className="text-xs text-green-600">Operational</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">API Services</p>
                      <p className="text-xs text-green-600">Operational</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Email Service</p>
                      <p className="text-xs text-green-600">Operational</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">File Storage</p>
                      <p className="text-xs text-green-600">Operational</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Settings Sections */}
            {settingSections.map((section, sectionIndex) => {
              const Icon = section.icon;
              
              return (
                <div key={sectionIndex} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${section.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {section.title}
                  </h3>
                  
                  <div className="space-y-6">
                    {section.settings.map((setting, settingIndex) => (
                      <div key={settingIndex} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-b-0">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-slate-900 block mb-1">
                            {setting.label}
                          </label>
                          <p className="text-sm text-slate-500">{setting.description}</p>
                        </div>
                        
                        <div className="ml-6">
                          {setting.type === 'toggle' && (
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={settings[setting.key as keyof typeof settings] as boolean}
                                onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#05294E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#05294E]"></div>
                            </label>
                          )}
                          
                          {setting.type === 'number' && (
                            <input
                              type="number"
                              min={setting.min}
                              max={setting.max}
                              value={settings[setting.key as keyof typeof settings] as number}
                              onChange={(e) => handleSettingChange(setting.key, parseInt(e.target.value))}
                              className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#112335] text-sm"
                            />
                          )}
                          
                          {setting.type === 'text' && (
                            <input
                              type="text"
                              value={settings[setting.key as keyof typeof settings] as string}
                              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                              className="w-64 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#112335] text-sm"
                            />
                          )}
                          
                          {setting.type === 'email' && (
                            <input
                              type="email"
                              value={settings[setting.key as keyof typeof settings] as string}
                              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                              className="w-64 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#112335] text-sm"
                            />
                          )}
                          
                          {setting.type === 'select' && (
                            <select
                              value={settings[setting.key as keyof typeof settings] as string}
                              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                              className="w-40 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#112335] text-sm"
                            >
                              {setting.options?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Warning Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 mb-2">Important Notice</h4>
                  <p className="text-sm text-yellow-700">
                    Changes to system settings may affect platform functionality. Please review all changes carefully before saving. 
                    Some settings may require a system restart to take effect.
                  </p>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
          <p className="text-slate-600">Configure platform settings and preferences</p>
        </div>
        
        {activeTab === 'general' && (
          <div className="flex items-center space-x-3">
            {saved && (
              <div className="flex items-center text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Settings saved</span>
              </div>
            )}
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#05294E] text-white px-6 py-3 rounded-xl hover:bg-[#112335] transition-colors font-medium flex items-center disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#05294E] text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-white bg-opacity-20' : tab.color
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default SystemSettings;