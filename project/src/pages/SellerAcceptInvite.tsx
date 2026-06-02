import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Mail, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

type PageState = 'loading' | 'form' | 'submitting' | 'error';

const SellerAcceptInvite: React.FC = () => {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [inviteAgencyId, setInviteAgencyId] = useState('');

  const [form, setForm] = useState({
    email: '',
    full_name: '',
    password: '',
    confirm_password: '',
    phone: '',
  });

  // Parse parameters from query string or URL hash
  useEffect(() => {
    const initSession = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const agencyId = searchParams.get('agency');
        const emailParam = searchParams.get('email');

        // Flow 1: Direct link registration (Option B) - unlogged, clean register
        if (agencyId && emailParam) {
          const email = decodeURIComponent(emailParam).toLowerCase().trim();
          setForm(prev => ({ ...prev, email }));
          setInviteAgencyId(agencyId);

          // Force logout if logged in as a different user to prevent session overwrites
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && session.user.email?.toLowerCase().trim() !== email) {
            await supabase.auth.signOut();
            // Clear local cache variables
            localStorage.removeItem('cached_user');
            localStorage.removeItem('cached_user_profile');
          }

          // Fetch agency name for a personalized message
          try {
            const { data: agencyData, error: agencyError } = await supabase
              .from('affiliate_admins')
              .select('company_name')
              .eq('id', agencyId)
              .maybeSingle();

            if (!agencyError && agencyData?.company_name) {
              setAgencyName(agencyData.company_name);
            } else {
              setAgencyName('');
            }
          } catch (e) {
            setAgencyName('');
          }

          setPageState('form');
          return;
        }

        // Flow 2: Backward compatibility with hash parameters from Supabase direct invite link
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (accessToken && refreshToken && type === 'invite') {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;

          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setForm(prev => ({ ...prev, email: user.email || '' }));
            const metaAgencyId = user.user_metadata?.affiliate_admin_id;
            if (metaAgencyId) {
              setInviteAgencyId(metaAgencyId);
              try {
                const { data: agencyData } = await supabase
                  .from('affiliate_admins')
                  .select('company_name')
                  .eq('id', metaAgencyId)
                  .maybeSingle();
                if (agencyData?.company_name) {
                  setAgencyName(agencyData.company_name);
                }
              } catch (e) {}
            }
          }

          setPageState('form');
          return;
        }

        // Flow 3: If no parameters but they are already logged in (fallback check)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setForm(prev => ({ ...prev, email: session.user.email || '' }));
          const metaAgencyId = session.user.user_metadata?.affiliate_admin_id;
          if (metaAgencyId) {
            setInviteAgencyId(metaAgencyId);
          }
          setPageState('form');
          return;
        }

        // No parameters found
        setErrorMessage('Invite link is invalid or expired. Please ask your agency administrator to invite you again.');
        setPageState('error');
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to parse invitation details.');
        setPageState('error');
      }
    };

    initSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.full_name.trim() || !form.password || !form.confirm_password) return;
    if (form.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    setPageState('submitting');
    setErrorMessage('');

    try {
      let activeUser = null;

      // Check if we are already logged in via Session (Flow 2 / Hash)
      const { data: { session } } = await supabase.auth.getSession();

      // Only reuse the session if it matches the invited email address!
      if (session?.user && session.user.email?.toLowerCase().trim() === form.email.toLowerCase().trim()) {
        // Just update password and user metadata in Auth since session exists
        const { error: updateError } = await supabase.auth.updateUser({
          password: form.password,
          data: { full_name: form.full_name.trim() },
        });
        if (updateError) throw updateError;
        activeUser = session.user;
      } else {
        // If there's an active session of a different user, sign out first
        if (session) {
          await supabase.auth.signOut();
        }

        // Clean Register flow (Option B / Query parameters)
        // 1. SignUp
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: form.email.toLowerCase().trim(),
          password: form.password,
          options: {
            data: {
              role: 'seller',
              affiliate_admin_id: inviteAgencyId,
              full_name: form.full_name.trim(),
            }
          }
        });
        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error('Failed to create account.');

        // 2. Auto-confirm email via Edge Function (so they do not have to confirm email manually)
        const { error: confirmError } = await supabase.functions.invoke('auto-confirm-student-email', {
          body: { userId: signUpData.user.id, role: 'seller' }
        });
        if (confirmError) throw confirmError;

        // 3. Login using the newly created credentials
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email.toLowerCase().trim(),
          password: form.password
        });
        if (signInError) throw signInError;
        activeUser = signInData.user;
      }

      if (!activeUser) throw new Error('Failed to establish session.');

      const affiliate_admin_id = inviteAgencyId || activeUser.user_metadata?.affiliate_admin_id;
      if (!affiliate_admin_id) throw new Error('Invite metadata missing. Please contact your agency.');

      // 4. Create or update user_profiles record
      const { error: profileError } = await supabase.from('user_profiles').upsert({
        user_id: activeUser.id,
        email: activeUser.email,
        full_name: form.full_name.trim(),
        role: 'seller',
        status: 'active',
      }, { onConflict: 'user_id' });
      if (profileError) throw profileError;

      // 5. Generate unique referral code
      const { data: referralCode, error: codeError } = await supabase.rpc('generate_unique_seller_code');
      if (codeError) throw codeError;

      // 6. Create sellers record
      const { error: sellerError } = await supabase.from('sellers').insert({
        user_id: activeUser.id,
        email: activeUser.email,
        name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        affiliate_admin_id,
        referral_code: referralCode,
        is_active: true,
      });
      if (sellerError) throw sellerError;

      // 7. Clear localStorage or caches if any
      localStorage.removeItem('cached_user');
      localStorage.removeItem('cached_user_profile');

      // 8. Redirect to seller dashboard
      navigate('/seller/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
      setPageState('form');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <img src="/logo.png.png" alt="Matrícula USA" className="h-12 w-auto" />
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          {/* Loading state */}
          {pageState === 'loading' && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <Loader2 className="h-10 w-10 text-[#05294E] animate-spin" />
              <p className="text-slate-600 text-sm">Verifying your invite link...</p>
            </div>
          )}

          {/* Error state */}
          {pageState === 'error' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Invalid Invite</h2>
                <p className="text-slate-600 text-sm">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Form state */}
          {(pageState === 'form' || pageState === 'submitting') && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Concluir Cadastro</h2>
                {agencyName ? (
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Olá! Você foi convidado pela agência <strong className="text-[#05294E]">{agencyName}</strong> para ser um parceiro de vendas (Seller) na Matrícula USA. Preencha os dados abaixo para criar sua conta:
                  </p>
                ) : (
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Olá! Você foi convidado para ser um parceiro de vendas (Seller) na Matrícula USA. Preencha os dados abaixo para criar sua conta:
                  </p>
                )}
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {errorMessage}
                </div>
              )}

              {/* Email (Readonly) */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Email Address
                </label>
                <div className="relative bg-slate-50 border border-slate-200 rounded-xl">
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="email"
                    disabled
                    value={form.email}
                    className="w-full pl-12 pr-4 py-3.5 bg-transparent rounded-xl text-slate-500 cursor-not-allowed text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Your full name"
                    className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-slate-900 placeholder-slate-400 text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Create a password (min. 6 characters)"
                    className="w-full pl-12 pr-12 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-slate-900 placeholder-slate-400 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={form.confirm_password}
                    onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                    placeholder="Confirm your password"
                    className="w-full pl-12 pr-12 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-slate-900 placeholder-slate-400 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Phone (optional) */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Phone <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <PhoneInput
                    international
                    defaultCountry="US"
                    addInternationalOption={false}
                    limitMaxLength={true}
                    maxLength={20}
                    value={form.phone}
                    onChange={(value) => setForm({ ...form, phone: value || '' })}
                    className="quick-registration-phone w-full px-4 py-3.5 border border-slate-300 rounded-xl outline-none focus-within:outline-none focus-within:ring-2 focus-within:ring-[#05294E] focus-within:border-[#05294E] text-slate-900 transition-all duration-300 text-sm"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
               {/* Submit */}
              <button
                type="submit"
                disabled={pageState === 'submitting' || !form.full_name.trim() || !form.password || !form.confirm_password}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-[#05294E] text-white rounded-xl font-semibold hover:bg-[#041f3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm"
              >
                {pageState === 'submitting' ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating your account...
                  </>
                ) : (
                  'Complete Registration'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerAcceptInvite;
