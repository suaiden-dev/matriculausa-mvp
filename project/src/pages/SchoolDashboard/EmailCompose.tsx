import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useMsal } from '@azure/msal-react';
import { graphScopes } from '../../lib/msalConfig';
import GraphService from '../../lib/graphService';

interface EmailConfiguration {
  id: string;
  name: string;
  email_address: string;
  provider_type: 'gmail' | 'microsoft';
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_auth_user: string;
  smtp_auth_pass: string;
  oauth_access_token?: string;
  microsoft_account_id?: string;
}

interface ReceivedEmail {
  id: string;
  from_name: string;
  from_address: string;
  subject: string;
  text_content: string;
  received_date: string;
}

interface FormData {
  to_addresses: string[];
  cc_addresses: string[];
  bcc_addresses: string[];
  subject: string;
  text_content: string;
  html_content: string;
  reply_to: string;
}

const EmailCompose = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { instance, accounts } = useMsal();
  const configId = searchParams.get('config');
  const replyToId = searchParams.get('reply');
  
  const [configurations, setConfigurations] = useState<EmailConfiguration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState(configId || '');
  const [loading, setLoading] = useState(false);
  const [originalEmail, setOriginalEmail] = useState<ReceivedEmail | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    to_addresses: [''],
    cc_addresses: [],
    bcc_addresses: [],
    subject: '',
    text_content: '',
    html_content: '',
    reply_to: ''
  });

  useEffect(() => {
    loadConfigurations();
    if (replyToId) {
      loadOriginalEmail();
    }
  }, []);

  const validateMicrosoftTokens = async (configs: EmailConfiguration[]) => {
    const corruptedConfigs = [];
    
    for (const config of configs) {
      if (config.provider_type === 'microsoft' && config.oauth_access_token) {
        try {
          const token = config.oauth_access_token;
          
          // Basic validation: ensure it's not empty and has reasonable length
          if (!token || token.length < 50) {
            console.warn(`❌ Invalid token length for ${config.email_address}: token too short`);
            corruptedConfigs.push(config);
            continue;
          }
          
          // Microsoft tokens can be in different formats:
          // 1. JWT format (3 parts separated by dots)
          // 2. Microsoft Graph access tokens (starting with 'Ew' and base64 encoded)
          
          const tokenParts = token.split('.');
          const isJWT = tokenParts.length === 3;
          const isMicrosoftToken = token.startsWith('Ew') && token.length > 100;
          
          if (!isJWT && !isMicrosoftToken) {
            console.warn(`❌ Unrecognized token format for ${config.email_address}: not JWT or Microsoft Graph token`);
            corruptedConfigs.push(config);
            continue;
          }
          
          // If it's a JWT, validate the structure
          if (isJWT) {
            try {
              const header = JSON.parse(atob(tokenParts[0]));
              if (!header.alg || !header.typ) {
                console.warn(`❌ Invalid JWT header for ${config.email_address}`);
                corruptedConfigs.push(config);
              }
            } catch (decodeError) {
              console.warn(`❌ Cannot decode JWT header for ${config.email_address}:`, decodeError);
              corruptedConfigs.push(config);
            }
          }
          
          console.log(`✅ Valid ${isJWT ? 'JWT' : 'Microsoft Graph'} token for ${config.email_address}`);
          
        } catch (error) {
          console.warn(`❌ Error validating token for ${config.email_address}:`, error);
          corruptedConfigs.push(config);
        }
      }
    }
    
    if (corruptedConfigs.length > 0) {
      const emailList = corruptedConfigs.map(c => c.email_address).join(', ');
      console.warn(`⚠️ Found ${corruptedConfigs.length} Microsoft account(s) with corrupted tokens: ${emailList}`);
      
      // Show user notification about corrupted accounts
      alert(
        `⚠️ Microsoft Authentication Issue\n\n` +
        `The following Microsoft account(s) have corrupted authentication tokens:\n` +
        `${emailList}\n\n` +
        `To fix this issue:\n` +
        `1. Go to Email Management\n` +
        `2. Delete these account(s)\n` +
        `3. Add them again to refresh authentication\n\n` +
        `This will resolve any email sending issues.`
      );
    }
  };

  const loadConfigurations = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('email_configurations')
        .select('id, name, email_address, provider_type, smtp_host, smtp_port, smtp_secure, smtp_auth_user, smtp_auth_pass, oauth_access_token, microsoft_account_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setConfigurations(data || []);
      
      // Validate Microsoft tokens
      if (data && data.length > 0) {
        await validateMicrosoftTokens(data);
      }
      
      // If configId was passed via URL, select automatically
      if (configId && data?.find(c => c.id === configId)) {
        setSelectedConfig(configId);
      }
    } catch (error) {
      setConfigurations([]);
    }
  };

  const loadOriginalEmail = async () => {
    if (!replyToId) return;
    
    try {
      const { data, error } = await supabase
        .from('received_emails')
        .select('*')
        .eq('id', replyToId)
        .single();

      if (error) {
        throw error;
      }

      setOriginalEmail(data);
      
      // Fill fields for reply
      setFormData(prev => ({
        ...prev,
        to_addresses: [data.from_address],
        subject: data.subject?.startsWith('Re: ') ? data.subject : `Re: ${data.subject || ''}`,
        text_content: `\n\n--- Original message ---\n${data.text_content || ''}`,
        reply_to: data.from_address
      }));
    } catch (error) {
      setOriginalEmail(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleArrayChange = (field: keyof Pick<FormData, 'to_addresses' | 'cc_addresses' | 'bcc_addresses'>, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addEmailField = (field: keyof Pick<FormData, 'to_addresses' | 'cc_addresses' | 'bcc_addresses'>) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeEmailField = (field: keyof Pick<FormData, 'to_addresses' | 'cc_addresses' | 'bcc_addresses'>, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const validateEmails = (emails: string[]) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.filter(email => email.trim()).every(email => emailRegex.test(email.trim()));
  };

  const sendEmailViaGraph = async (config: EmailConfiguration, toEmails: string[], ccEmails: string[], bccEmails: string[]) => {
    try {
      // Check if we have a valid OAuth token in the configuration
      if (!config.oauth_access_token) {
        throw new Error('Microsoft account not properly configured. Please reconfigure the account in Email Settings.');
      }

      console.log('📤 Using Microsoft Graph API for email:', {
        email: config.email_address,
        hasToken: !!config.oauth_access_token,
        tokenPreview: config.oauth_access_token.substring(0, 20) + '...',
        msalAccounts: accounts?.length || 0
      });

      let accessToken = null;
      
      // First, try to get a fresh token via MSAL if available
      if (accounts && accounts.length > 0) {
        try {
          const response = await instance.acquireTokenSilent({
            scopes: graphScopes,
            account: accounts[0],
          });
          accessToken = response.accessToken;
          console.log('✅ Got fresh token from MSAL');
        } catch (msalError) {
          console.warn('⚠️ Could not get fresh token from MSAL:', msalError);
          
          // Try interactive login if silent fails
          try {
            console.log('🔄 Attempting interactive Microsoft login...');
            const interactiveResponse = await instance.acquireTokenPopup({
              scopes: graphScopes,
              prompt: 'select_account'
            });
            accessToken = interactiveResponse.accessToken;
            console.log('✅ Got token via interactive login');
          } catch (interactiveError) {
            console.warn('⚠️ Interactive login also failed:', interactiveError);
          }
        }
      }
      
      // If we couldn't get fresh token, check if stored token is valid
      if (!accessToken) {
        // Validate stored token format
        const storedToken = config.oauth_access_token;
        
        // Microsoft tokens can be in different formats:
        // 1. JWT format (3 parts separated by dots)
        // 2. Microsoft Graph access tokens (starting with 'Ew' and base64 encoded)
        
        // Basic validation: ensure it's not empty and has reasonable length
        if (!storedToken || storedToken.length < 50) {
          throw new Error('Stored Microsoft token is empty or too short. Please delete and reconfigure your Microsoft account in Email Settings.');
        }
        
        // Check if it's a JWT format
        const tokenParts = storedToken.split('.');
        const isJWT = tokenParts.length === 3;
        
        // Check if it's a Microsoft Graph token (typically starts with 'Ew' and is base64)
        const isMicrosoftToken = storedToken.startsWith('Ew') && storedToken.length > 100;
        
        // For Microsoft Graph tokens, we'll be more permissive and try to use them
        if (isMicrosoftToken) {
          console.log('🔍 Detected Microsoft Graph access token format, proceeding with token');
          accessToken = storedToken;
        } else if (isJWT) {
          // If it's a JWT, validate the structure
          try {
            const header = JSON.parse(atob(tokenParts[0]));
            if (!header.alg || !header.typ) {
              throw new Error('Invalid JWT header structure');
            }
            accessToken = storedToken;
          } catch (decodeError) {
            throw new Error('Stored Microsoft token is not a valid JWT. Please delete and reconfigure your Microsoft account in Email Settings.');
          }
        } else {
          // For other formats, if the token looks reasonable, let's try to use it
          if (storedToken.length > 100 && !storedToken.includes(' ')) {
            console.log('🔍 Unknown token format but appears valid, attempting to use');
            accessToken = storedToken;
          } else {
            throw new Error('Stored Microsoft token format is not recognized. Please delete and reconfigure your Microsoft account in Email Settings.');
          }
        }
        console.log(`🔄 Using stored OAuth token (${isJWT ? 'JWT' : isMicrosoftToken ? 'Microsoft Graph' : 'Unknown'} format)`);
      }

      console.log(`🔍 Final token details for sending:`, {
        tokenLength: accessToken?.length,
        tokenPreview: accessToken?.substring(0, 20) + '...',
        isJWT: accessToken?.split('.').length === 3,
        startsWith: accessToken?.substring(0, 5)
      });

      const graphService = new GraphService(accessToken);
      
      // Prepare recipients
      const toRecipients = toEmails.map(email => ({
        emailAddress: {
          address: email.trim()
        }
      }));

      const ccRecipients = ccEmails.map(email => ({
        emailAddress: {
          address: email.trim()
        }
      }));

      const bccRecipients = bccEmails.map(email => ({
        emailAddress: {
          address: email.trim()
        }
      }));

      // Create email message
      const emailMessage = {
        message: {
          subject: formData.subject,
          body: {
            contentType: formData.html_content.trim() ? 'HTML' : 'Text',
            content: formData.html_content.trim() || formData.text_content.replace(/\n/g, '<br>')
          },
          toRecipients: toRecipients,
          ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
          bccRecipients: bccRecipients.length > 0 ? bccRecipients : undefined
        },
        saveToSentItems: true
      };

      // Send email via Microsoft Graph
      try {
        await graphService.sendEmail(emailMessage);
        console.log('✅ Email sent successfully via Microsoft Graph');
        return true;
      } catch (firstAttemptError) {
        console.error('❌ First attempt failed:', firstAttemptError);
        
        // If authentication failed and we have MSAL accounts, try to get a fresh token and retry once
        if (firstAttemptError instanceof Error && accounts.length > 0) {
          const errorMessage = firstAttemptError.message.toLowerCase();
          
          // Check for JWT format errors or authentication failures
          const needsTokenRefresh = (
            errorMessage.includes('401') || 
            errorMessage.includes('unauthorized') || 
            errorMessage.includes('token') ||
            errorMessage.includes('expired') ||
            errorMessage.includes('jwt is not well formed') ||
            errorMessage.includes('no dots') ||
            errorMessage.includes('compact serialization')
          );
          
          if (needsTokenRefresh && !config.oauth_access_token?.includes('retry_attempted')) {
            
            console.log('🔄 Token/authentication error detected, attempting to get fresh token and retry...');
            
            try {
              // Try to get a fresh token with interactive login
              const tokenRequest = {
                scopes: ['https://graph.microsoft.com/Mail.Send', 'https://graph.microsoft.com/User.Read'],
                account: accounts[0],
              };

              // Try silent first, then interactive if that fails
              let tokenResponse;
              try {
                tokenResponse = await instance.acquireTokenSilent(tokenRequest);
              } catch (silentError) {
                console.log('🔄 Silent token acquisition failed, trying interactive...');
                tokenResponse = await instance.acquireTokenPopup(tokenRequest);
              }
              
              if (tokenResponse?.accessToken) {
                console.log('✅ Got fresh token, retrying email send...');
                console.log('🔍 New token details:', {
                  tokenLength: tokenResponse.accessToken.length,
                  tokenPreview: tokenResponse.accessToken.substring(0, 20) + '...',
                  isJWT: tokenResponse.accessToken.split('.').length === 3
                });
                
                const retryGraphService = new GraphService(tokenResponse.accessToken);
                
                await retryGraphService.sendEmail(emailMessage);
                console.log('✅ Email sent successfully on retry with fresh token');
                return true;
              }
            } catch (retryError) {
              console.warn('❌ Failed to get fresh token for retry:', retryError);
              // Continue to original error handling with firstAttemptError
            }
          }
        }
        
        // If retry failed or wasn't attempted, throw the original error
        throw firstAttemptError;
      }
    } catch (error) {
      console.error('❌ Error sending email via Microsoft Graph:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // JWT/Token format errors
        if (errorMessage.includes('jwt is not well formed') || 
            errorMessage.includes('no dots') ||
            errorMessage.includes('compact serialization')) {
          throw new Error('Microsoft token is corrupted or invalid. Please delete and reconfigure your Microsoft account in Email Settings.');
        }
        
        // Authentication/Authorization errors
        if (errorMessage.includes('401') || 
            errorMessage.includes('unauthorized') || 
            errorMessage.includes('token') ||
            errorMessage.includes('expired')) {
          throw new Error('Microsoft authentication expired. Please reconfigure your Microsoft account in Email Settings.');
        }
        
        // Permission errors
        if (errorMessage.includes('403') || 
            errorMessage.includes('forbidden') ||
            errorMessage.includes('permission')) {
          throw new Error('Insufficient permissions to send email. Please check Microsoft account permissions.');
        }
        
        throw new Error('Failed to send email via Microsoft Graph: ' + error.message);
      }
      
      throw new Error('Failed to send email via Microsoft Graph: Unknown error');
    }
  };

  const sendEmailViaSmtp = async (config: EmailConfiguration, toEmails: string[], ccEmails: string[], bccEmails: string[]) => {
    // Prepare data for SMTP endpoint
    const emailData: any = {
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      user: config.smtp_auth_user,
      password: config.smtp_auth_pass,
      to: toEmails.join(', '),
      subject: formData.subject,
      text: formData.text_content.trim() || undefined,
      html: formData.html_content.trim() || undefined
    };

    // Add CC and BCC if they exist
    if (ccEmails.length > 0) {
      emailData.cc = ccEmails.join(', ');
    }
    if (bccEmails.length > 0) {
      emailData.bcc = bccEmails.join(', ');
    }

    console.log('📤 SMTP Email data:', emailData);

    // Send email via SMTP endpoint
    const response = await fetch('https://4a7505bb5c9f.ngrok-free.app/send-smtp?key=7D127C861C1D6CB5B12C3FE3189D8', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SMTP Server error: ${response.status} - ${errorText}`);
    }

    await response.json();
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedConfig) {
      alert('Select an email configuration');
      return;
    }

    const toEmails = formData.to_addresses.filter(email => email.trim());
    if (toEmails.length === 0) {
      alert('Add at least one recipient');
      return;
    }

    if (!validateEmails(toEmails)) {
      alert('Check the recipient email addresses');
      return;
    }

    const ccEmails = formData.cc_addresses.filter(email => email.trim());
    const bccEmails = formData.bcc_addresses.filter(email => email.trim());

    if (!validateEmails(ccEmails) || !validateEmails(bccEmails)) {
      alert('Check the CC/BCC email addresses');
      return;
    }

    if (!formData.text_content.trim() && !formData.html_content.trim()) {
      alert('Add content to the email');
      return;
    }

    setLoading(true);

    try {
      // Find selected configuration
      const config = configurations.find(c => c.id === selectedConfig);
      if (!config) {
        throw new Error('Email configuration not found');
      }

      console.log('📤 Sending email with config:', {
        provider: config.provider_type,
        email: config.email_address,
        name: config.name,
        hasOAuthToken: !!config.oauth_access_token,
        hasMicrosoftId: !!config.microsoft_account_id
      });

      // Send email based on provider type
      if (config.provider_type === 'microsoft') {
        await sendEmailViaGraph(config, toEmails, ccEmails, bccEmails);
      } else {
        await sendEmailViaSmtp(config, toEmails, ccEmails, bccEmails);
      }

      // Save sent email to database
      await saveSentEmail(config, toEmails, ccEmails, bccEmails);

      alert('Email sent successfully!');
      navigate('/school/dashboard/email/inbox');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Error sending email: ' + errorMessage);
      console.error('Send email error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSentEmail = async (config: EmailConfiguration, toEmails: string[], ccEmails: string[], bccEmails: string[]) => {
    try {
      const emailData = {
        email_config_id: config.id,
        to_addresses: toEmails,
        cc_addresses: ccEmails.length > 0 ? ccEmails : null,
        bcc_addresses: bccEmails.length > 0 ? bccEmails : null,
        subject: formData.subject,
        text_content: formData.text_content.trim() || null,
        html_content: formData.html_content.trim() || null,
        reply_to: formData.reply_to || null,
        sent_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('sent_emails')
        .insert([emailData]);

      if (error) {
        // Don't fail the send because of this
      }
    } catch (error) {
      // Don't fail the send because of this
    }
  };

  const selectedConfigData = configurations.find(c => c.id === selectedConfig);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/school/dashboard/email/inbox')}
                className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ←
              </button>
              
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                  {originalEmail ? 'Reply' : 'New Message'}
                </h1>
                {selectedConfigData && (
                  <p className="text-sm text-slate-600 mt-1">
                    From: {selectedConfigData.name} ({selectedConfigData.email_address})
                  </p>
                )}
              </div>
            </div>

            {/* Account Selector - Moved to header for better UX */}
            <div className="min-w-64">
              <select
                value={selectedConfig}
                onChange={(e) => setSelectedConfig(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              >
                <option value="">Select account</option>
                {configurations.map(config => (
                  <option key={config.id} value={config.id}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Original Email Preview - Compact */}
        {originalEmail && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium text-blue-900">Replying to:</span>
                <span className="text-blue-700 ml-2">{originalEmail.from_name || originalEmail.from_address}</span>
                <span className="text-blue-600 ml-2">• {originalEmail.subject}</span>
              </div>
              <span className="text-xs text-blue-600">
                {new Date(originalEmail.received_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {/* Main Compose Area */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            {/* Email Headers - Compact Layout */}
            <div className="p-6 border-b border-slate-200 space-y-4">
              {/* Recipients Row */}
              <div className="grid grid-cols-12 gap-4 items-start">
                <label className="col-span-2 text-sm font-medium text-slate-700 pt-2">To</label>
                <div className="col-span-10">
                  {formData.to_addresses.map((email, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => handleArrayChange('to_addresses', index, e.target.value)}
                        placeholder="recipient@email.com"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        required={index === 0}
                      />
                      {formData.to_addresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEmailField('to_addresses', index)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addEmailField('to_addresses')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add recipient
                  </button>
                </div>
              </div>

              {/* CC/BCC Toggle */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-2"></div>
                <div className="col-span-10">
                  <div className="flex gap-4">
                    {formData.cc_addresses.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, cc_addresses: [''] }));
                        }}
                        className="text-sm text-slate-600 hover:text-slate-800"
                      >
                        + CC
                      </button>
                    )}
                    {formData.bcc_addresses.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, bcc_addresses: [''] }));
                        }}
                        className="text-sm text-slate-600 hover:text-slate-800"
                      >
                        + BCC
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* CC Fields - Show only if populated */}
              {formData.cc_addresses.length > 0 && (
                <div className="grid grid-cols-12 gap-4 items-start">
                  <label className="col-span-2 text-sm font-medium text-slate-700 pt-2">CC</label>
                  <div className="col-span-10">
                    {formData.cc_addresses.map((email, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => handleArrayChange('cc_addresses', index, e.target.value)}
                          placeholder="cc@email.com"
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeEmailField('cc_addresses', index)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addEmailField('cc_addresses')}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add CC
                    </button>
                  </div>
                </div>
              )}

              {/* BCC Fields - Show only if populated */}
              {formData.bcc_addresses.length > 0 && (
                <div className="grid grid-cols-12 gap-4 items-start">
                  <label className="col-span-2 text-sm font-medium text-slate-700 pt-2">BCC</label>
                  <div className="col-span-10">
                    {formData.bcc_addresses.map((email, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => handleArrayChange('bcc_addresses', index, e.target.value)}
                          placeholder="bcc@email.com"
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeEmailField('bcc_addresses', index)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addEmailField('bcc_addresses')}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add BCC
                    </button>
                  </div>
                </div>
              )}

              {/* Subject */}
              <div className="grid grid-cols-12 gap-4">
                <label className="col-span-2 text-sm font-medium text-slate-700 pt-2">Subject</label>
                <div className="col-span-10">
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Email subject"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="p-6">
              <textarea
                name="text_content"
                value={formData.text_content}
                onChange={handleChange}
                rows={15}
                placeholder="Type your message here..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                required
              />
              
              {/* Optional HTML content toggle */}
              <div className="mt-4">
                <details className="group">
                  <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-800">
                    Advanced: Add HTML content
                  </summary>
                  <div className="mt-3">
                    <textarea
                      name="html_content"
                      value={formData.html_content}
                      onChange={handleChange}
                      rows={6}
                      placeholder="<p>Optional HTML content...</p>"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                  </div>
                </details>
              </div>
            </div>

            {/* Action Bar */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={loading || !selectedConfig}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => navigate('/school/dashboard/email/inbox')}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                <div className="text-sm text-slate-500">
                  {formData.text_content.length} characters
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Original Email Content - Collapsible */}
        {originalEmail && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200">
            <details className="group">
              <summary className="cursor-pointer p-4 border-b border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Show original message
              </summary>
              <div className="p-6 text-sm text-slate-600">
                <div className="mb-4 pb-4 border-b border-slate-200">
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div><strong>From:</strong> {originalEmail.from_name || originalEmail.from_address}</div>
                    <div><strong>Date:</strong> {new Date(originalEmail.received_date).toLocaleString()}</div>
                  </div>
                  <div><strong>Subject:</strong> {originalEmail.subject}</div>
                </div>
                <div className="whitespace-pre-wrap">
                  {originalEmail.text_content}
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailCompose;
