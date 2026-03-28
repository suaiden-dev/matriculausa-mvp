import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, Award, GraduationCap, Download, 
  MapPin, Clock, Mail, Globe, CreditCard, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { StepProps } from '../types';
import { useTranslation } from 'react-i18next';
import { useFeeConfig } from '../../../hooks/useFeeConfig';
import DocumentRequestsCard from '../../../components/DocumentRequestsCard';
import DocumentViewerModal from '../../../components/DocumentViewerModal';
import { STRIPE_PRODUCTS } from '../../../stripe-config';
import { getExchangeRate } from '../../../utils/stripeFeeCalculator';
import { PackageFeeTab } from './PackageFeeTab';
import { ApplicationSidebar } from './ApplicationSidebar';
import { ApplicationStatusHero } from './ApplicationStatusHero';

export const UniversityDocumentsStep: React.FC<StepProps> = ({ onBack }) => {
    console.log('[UniversityDocumentsStep] Renderizando...');
    const { t } = useTranslation(['registration', 'common', 'scholarships', 'dashboard', 'auth']);
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const { getFeeAmount } = useFeeConfig();

    // 1. ESTADOS
    const [loading, setLoading] = useState(true);
    const [applicationDetails, setApplicationDetails] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'welcome' | 'details' | 'documents' | 'i20' | 'ds160' | 'i539' | 'cos' | 'acceptance'>('welcome');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [documentRequests, setDocumentRequests] = useState<any[]>([]);
    const [ds160PackagePaid, setDs160PackagePaid] = useState<boolean>(false);
    const [i539PackagePaid, setI539PackagePaid] = useState<boolean>(false);
    const [hasPendingZelle, setHasPendingZelle] = useState<boolean>(false);

    const [i20Loading, setI20Loading] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | 'pix' | 'parcelow' | null>(null);
    const [, setExchangeRate] = useState<number | null>(null);
    const [, setShowZelleCheckout] = useState(false);

    // Estados para PackageFeeTab (DS160/I539)
    const [packageLoading, setPackageLoading] = useState(false);
    const [packageError, setPackageError] = useState<string | null>(null);
    const [showZelle, setShowZelle] = useState(false);
    const [showInlineCpf, setShowInlineCpf] = useState(false);
    const [inlineCpf, setInlineCpf] = useState('');
    const [savingCpf, setSavingCpf] = useState(false);
    const [cpfError, setCpfError] = useState<string | null>(null);

    // 2. HOOKS DE CÁLCULO (Sempre No Topo)
    const isPlacementFlow = !!(userProfile as any)?.placement_fee_flow;

    const studentProcessType = applicationDetails?.student_process_type;
    const showDs160Tab = isPlacementFlow && studentProcessType === 'initial';
    const showI539Tab = isPlacementFlow && (studentProcessType === 'change_of_status' || (studentProcessType === 'transfer' && userProfile?.visa_transfer_active === false));
    const packageFeeRequired = (showDs160Tab && !ds160PackagePaid) || (showI539Tab && !i539PackagePaid);

    const hasPendingRequests = useMemo(() => {
        if (!documentRequests || documentRequests.length === 0) return false;
        return documentRequests.some(req => {
            const uploads = req.document_request_uploads || [];
            return !uploads.some((u: any) => u.status === 'approved');
        });
    }, [documentRequests]);

    const allDocsApproved = useMemo(() => {
        if (!documentRequests || documentRequests.length === 0) return false;
        return documentRequests.every(req => (req.document_request_uploads || []).some((u: any) => u.status === 'approved'));
    }, [documentRequests]);

    const currentStatusInfo = useMemo(() => {
        if (!applicationDetails) {
            return {
                status: 'under_review' as const,
                title: t('common:labels.loading'),
                description: '',
                nextStepLabel: '',
                action: () => {}
            };
        }

        // 1. Pagamento em Verificação (Prioridade Máxima)
        if (hasPendingZelle) return { 
            status: 'under_review' as const, 
            title: t('dashboard:studentDashboard.myApplicationStep.status.verifyingPayment.title'), 
            description: t('dashboard:studentDashboard.myApplicationStep.status.verifyingPayment.description'), 
            nextStepLabel: '', 
            action: () => {} 
        };

        // 2. Documentos Pendentes
        if (hasPendingRequests) return { 
            status: 'pending_documents' as const, 
            title: t('dashboard:studentDashboard.myApplicationStep.status.pendingDocs.title'), 
            description: t('dashboard:studentDashboard.myApplicationStep.status.pendingDocs.description'), 
            nextStepLabel: t('dashboard:studentDashboard.myApplicationStep.status.pendingDocs.button'), 
            action: () => setActiveTab('documents') 
        };

        // 3. Análise Inicial (Nenhum documento solicitado ainda)
        // Se documentRequests.length === 0, significa que estamos no status de espera das 24h
        if (documentRequests.length === 0) return { 
            status: 'under_review' as const, 
            title: t('dashboard:studentDashboard.myApplicationStep.status.initialAnalysis.title'), 
            description: t('dashboard:studentDashboard.myApplicationStep.status.initialAnalysis.description'), 
            nextStepLabel: '', 
            action: () => {},
            progress: {
              current: 12, // Mocking some progress for demo, ideally this would come from backend
              total: 24,
              label: "Processamento"
            }
        };

        // 4. Pagamento do Pacote (Só após docs estarem ok)
        if (packageFeeRequired && allDocsApproved) return { 
            status: 'pending_package_fee' as const, 
            title: t('dashboard:studentDashboard.myApplicationStep.status.pendingFee.title'), 
            description: t('dashboard:studentDashboard.myApplicationStep.status.pendingFee.description'), 
            nextStepLabel: t('dashboard:studentDashboard.myApplicationStep.status.pendingFee.button'), 
            action: () => setActiveTab(showDs160Tab ? 'ds160' : 'i539') 
        };

        // 5. Aprovado / Download
        if (applicationDetails.acceptance_letter_url) return { 
            status: 'approved' as const, 
            title: t('dashboard:studentDashboard.myApplicationStep.status.approved.title'), 
            description: t('dashboard:studentDashboard.myApplicationStep.status.approved.description'), 
            nextStepLabel: t('dashboard:studentDashboard.myApplicationStep.status.approved.button'), 
            action: () => setActiveTab('acceptance') 
        };

        return { 
            status: 'under_review' as const, 
            title: t('dashboard:studentDashboard.myApplicationStep.status.generalWait.title'), 
            description: t('dashboard:studentDashboard.myApplicationStep.status.generalWait.description'), 
            nextStepLabel: '', 
            action: () => { } 
        };
    }, [hasPendingRequests, hasPendingZelle, packageFeeRequired, applicationDetails, t, showDs160Tab, documentRequests.length, allDocsApproved]);

    const sidebarSteps = useMemo(() => [
        { 
            id: 'documents', 
            title: t('studentDashboard.myApplicationStep.welcome.actionDocuments'), 
            status: allDocsApproved 
                ? t('studentDashboard.myApplicationStep.welcome.status.completed') 
                : (documentRequests.length > 0 ? t('studentDashboard.myApplicationStep.welcome.status.underReview') : t('studentDashboard.myApplicationStep.welcome.status.inProgress')), 
            variant: (allDocsApproved ? 'success' : (documentRequests.length > 0 ? 'warning' : 'info')) as any 
        },
        ...(showDs160Tab ? [{ 
            id: 'ds160', 
            title: t('scholarships:scholarshipsPage.modal.ds160Package'), 
            status: ds160PackagePaid 
                ? t('registration:studentDashboard.myApplicationStep.welcome.status.completed') 
                : t('registration:studentDashboard.myApplicationStep.welcome.status.actionRequired'), 
            variant: (ds160PackagePaid ? 'success' : 'warning') as any 
        }] : []),
        ...(showI539Tab ? [{ 
            id: 'i539', 
            title: (studentProcessType === 'transfer' && userProfile?.visa_transfer_active === false)
                ? t('registration:studentOnboarding.stepper.steps.reinstatement_fee')
                : t('scholarships:scholarshipsPage.modal.i539COSPackage'), 
            status: i539PackagePaid 
                ? t('registration:studentDashboard.myApplicationStep.welcome.status.completed') 
                : t('registration:studentDashboard.myApplicationStep.welcome.status.actionRequired'), 
            variant: (i539PackagePaid ? 'success' : 'warning') as any 
        }] : []),
        { 
            id: 'acceptance', 
            title: t('studentDashboard.myApplicationStep.tabs.acceptanceLetter'), 
            status: applicationDetails?.acceptance_letter_url 
                ? t('dashboard:studentDashboard.myApplicationStep.welcome.documentAvailable') 
                : t('dashboard:studentDashboard.myApplicationStep.welcome.status.inProgress'), 
            variant: (applicationDetails?.acceptance_letter_url ? 'success' : 'info') as any 
        }
    ], [t, allDocsApproved, documentRequests.length, showDs160Tab, ds160PackagePaid, showI539Tab, i539PackagePaid, applicationDetails?.acceptance_letter_url, studentProcessType, userProfile?.visa_transfer_active]);

    const fetchApplicationDetails = useCallback(async (isRefresh = false) => {
        if (!userProfile?.id) {
            if (!isRefresh) setLoading(false);
            return;
        }

        try {
            if (!isRefresh) setLoading(true);

            const selectedId = userProfile.selected_application_id;

            let query = supabase
                .from('scholarship_applications')
                .select(`*, user_profiles!student_id(*), scholarships(*, internal_fees, universities(*))`)
                .eq('student_id', userProfile.id);

            if (selectedId) {
                query = query.eq('id', selectedId);
            } else {
                query = query.order('is_application_fee_paid', { ascending: false })
                    .order('created_at', { ascending: false })
                    .limit(1);
            }

            const { data, error } = await query.maybeSingle();
            if (error) throw error;

            if (data) {
                setApplicationDetails(data);

                const { data: reqs } = await supabase
                    .from('document_requests')
                    .select('id, title, status, document_request_uploads(status)')
                    .eq('scholarship_application_id', data.id);

                if (reqs) {
                    setDocumentRequests(reqs);
                }

                if (userProfile?.user_id) {
                    const { data: packagePayments } = await supabase
                        .from('individual_fee_payments')
                        .select('fee_type, parcelow_status, payment_method')
                        .eq('user_id', userProfile.user_id)
                        .in('fee_type', ['ds160_package', 'i539_cos_package']);

                    if (packagePayments) {
                        const ds160Paid = packagePayments.some(
                            (p: any) => p.fee_type === 'ds160_package' &&
                                (p.parcelow_status === 'paid' || p.payment_method === 'stripe' || p.payment_method === 'zelle')
                        );
                        const i539Paid = packagePayments.some(
                            (p: any) => p.fee_type === 'i539_cos_package' &&
                                (p.parcelow_status === 'paid' || p.payment_method === 'stripe' || p.payment_method === 'zelle')
                        );

                        const hasPending = packagePayments.some(
                            (p: any) => (p.fee_type === 'ds160_package' || p.fee_type === 'i539_cos_package') && 
                                (p.parcelow_status === 'pending' || p.payment_method === 'zelle') &&
                                !ds160Paid && !i539Paid
                        );

                        setDs160PackagePaid(ds160Paid || !!(userProfile as any)?.has_paid_ds160_package);
                        setI539PackagePaid(i539Paid || !!(userProfile as any)?.has_paid_i539_cos_package);
                        setHasPendingZelle(hasPending);
                    } else {
                        setDs160PackagePaid(!!(userProfile as any)?.has_paid_ds160_package);
                        setI539PackagePaid(!!(userProfile as any)?.has_paid_i539_cos_package);
                        setHasPendingZelle(false);
                    }
                }
            }

        } catch (err: any) {
            console.error('Error fetching university documents details:', err);
        } finally {
            if (!isRefresh) setLoading(false);
        }
    }, [userProfile?.id, userProfile?.selected_application_id, userProfile?.user_id, (userProfile as any)?.has_paid_ds160_package, (userProfile as any)?.has_paid_i539_cos_package]);

    // 3. EFEITOS
    useEffect(() => {
        getExchangeRate().then(rate => setExchangeRate(rate));
    }, []);

    useEffect(() => {
        fetchApplicationDetails();
    }, [fetchApplicationDetails]);

    // 4. HANDLERS
    const handleProceedPayment = useCallback(async () => {
        if (!selectedPaymentMethod || !applicationDetails) return;
        setI20Loading(true);
        try {
            if (selectedPaymentMethod === 'zelle') {
                setShowZelleCheckout(true);
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-i20-control-fee`;

                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        success_url: `${window.location.origin}/student/onboarding?step=my_applications&payment=success`,
                        cancel_url: `${window.location.origin}/student/onboarding?step=my_applications&payment=cancelled`,
                        price_id: STRIPE_PRODUCTS.controlFee.priceId,
                        amount: getFeeAmount('i20_control_fee'),
                        payment_method: selectedPaymentMethod
                    }),
                });
                const data = await res.json();
                if (data.session_url) window.location.href = data.session_url;
            }
        } catch (err) {
            console.error('Payment error:', err);
        } finally {
            setI20Loading(false);
        }
    }, [selectedPaymentMethod, applicationDetails, getFeeAmount]);

    if (loading) return <div className="flex justify-center py-20 animate-pulse"><GraduationCap className="w-12 h-12 text-blue-600 animate-bounce" /></div>;

    if (!applicationDetails) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <AlertCircle className="w-16 h-16 text-amber-500" />
                <h3 className="text-2xl font-black uppercase tracking-tight">{t('common:errors.unexpected')}</h3>
                <p className="text-slate-600 max-w-md mx-auto">{t('studentDashboard.myApplicationStep.welcome.noApplicationFound')}</p>
                <button onClick={onBack} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all">
                    {t('common:labels.back')}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-24 max-w-[1600px] mx-auto px-4 md:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-6 md:mt-0">
                <h2 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                    {t('studentDashboard.myApplicationStep.header.my')} <span className="text-blue-600">{t('studentDashboard.myApplicationStep.header.application')}</span>
                </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <main className="lg:col-span-9 space-y-8">
                    <ApplicationStatusHero 
                        status={currentStatusInfo.status}
                        title={currentStatusInfo.title}
                        description={currentStatusInfo.description}
                        nextStepLabel={currentStatusInfo.nextStepLabel}
                        onNextStepClick={currentStatusInfo.action} 
                        showButton={currentStatusInfo.status !== 'under_review'} 
                        progress={(currentStatusInfo as any).progress}
                    />

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === 'welcome' && (
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group border border-slate-100">
                                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
                                            <div className="lg:col-span-8 space-y-10">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl transform group-hover:rotate-6 transition-transform">
                                                        <Sparkles className="w-8 h-8 text-white" />
                                                    </div>
                                                    <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
                                                        {t('dashboard:studentDashboard.myApplicationStep.welcome.congratsMessage')}
                                                    </h3>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 gap-4">
                                                    {[
                                                        { 
                                                            id: 'payment', 
                                                            label: t('dashboard:studentDashboard.myApplicationStep.welcome.checklist.payment'),
                                                            completed: true,
                                                            current: false,
                                                            status: t('dashboard:studentDashboard.myApplicationStep.welcome.status.completed')
                                                        },
                                                        { 
                                                            id: 'waitingForms', 
                                                            label: t('dashboard:studentDashboard.myApplicationStep.welcome.checklist.waitingForms'),
                                                            completed: documentRequests.length > 0,
                                                            current: documentRequests.length === 0,
                                                            status: documentRequests.length === 0 ? t('common:labels.nextStep') : t('dashboard:studentDashboard.myApplicationStep.welcome.status.completed')
                                                        },
                                                        { 
                                                            id: 'uploadDocs', 
                                                            label: t('dashboard:studentDashboard.myApplicationStep.welcome.checklist.uploadDocs'),
                                                            completed: allDocsApproved,
                                                            current: documentRequests.length > 0 && !allDocsApproved,
                                                            status: allDocsApproved ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.completed') : (documentRequests.length > 0 ? t('common:labels.nextStep') : t('dashboard:studentDashboard.myApplicationStep.welcome.status.blocked'))
                                                        },
                                                        { 
                                                            id: 'acceptance', 
                                                            label: t('dashboard:studentDashboard.myApplicationStep.welcome.checklist.acceptance'),
                                                            completed: !!applicationDetails.acceptance_letter_url,
                                                            current: allDocsApproved && !applicationDetails.acceptance_letter_url,
                                                            status: !!applicationDetails.acceptance_letter_url ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.completed') : (allDocsApproved ? t('common:labels.nextStep') : t('dashboard:studentDashboard.myApplicationStep.welcome.status.blocked'))
                                                        }
                                                    ].map((step, idx) => (
                                                        <div 
                                                            key={step.id} 
                                                            className={`flex items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
                                                                step.current 
                                                                    ? 'bg-blue-50 border-blue-200 shadow-lg shadow-blue-500/5' 
                                                                    : 'bg-slate-50 border-slate-100'
                                                            } ${!step.completed && !step.current ? 'opacity-40' : ''}`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                                                                step.completed 
                                                                    ? 'bg-emerald-500 text-white' 
                                                                    : step.current 
                                                                        ? 'bg-blue-600 text-white animate-pulse' 
                                                                        : 'bg-slate-200 text-slate-500'
                                                            }`}>
                                                                {step.completed ? '✓' : idx + 1}
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className={`font-bold uppercase tracking-tight text-sm ${
                                                                    step.current ? 'text-blue-900' : 'text-slate-700'
                                                                }`}>
                                                                    {step.label}
                                                                </h4>
                                                            </div>
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                                step.completed ? 'text-emerald-600' : step.current ? 'text-blue-600' : 'text-slate-400'
                                                            }`}>
                                                                {step.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="lg:col-span-4">
                                                <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-white/40">{t('studentDashboard.myApplicationStep.welcome.needHelp')}</h4>
                                                    <p className="font-bold text-lg leading-tight">{t('studentDashboard.myApplicationStep.welcome.supportDescription')}</p>
                                                    <button onClick={() => navigate('/student/dashboard/chat')} className="w-full py-4 bg-white text-gray-900 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-50 transition-colors">
                                                        {t('studentDashboard.myApplicationStep.welcome.talkToSupport')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}



                            {activeTab === 'documents' && (
                                <div className="space-y-8">
                                    <DocumentRequestsCard 
                                        applicationId={applicationDetails.id}
                                        currentUserId={user?.id || ''}
                                        isSchool={false}
                                        studentType={applicationDetails.student_process_type}
                                        studentUserId={applicationDetails.student_id}
                                    />
                                </div>
                            )}

                            {activeTab === 'i20' && (
                                <div className="space-y-8 pb-12">
                                    <div className="bg-white rounded-[2.5rem] p-12 shadow-2xl border border-slate-200 text-center">
                                        <CreditCard className="w-16 h-16 text-blue-600 mx-auto mb-6" />
                                        <h3 className="text-3xl font-black uppercase tracking-tight mb-4">{t('studentDashboard.applicationChatPage.tabs.i20ControlFee')}</h3>
                                        <p className="text-slate-600 mb-8 max-w-md mx-auto">{t('studentDashboard.applicationChatPage.i20ControlFee.description')}</p>
                                        <button 
                                            disabled={i20Loading}
                                            onClick={handleProceedPayment} 
                                            className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-500/20 disabled:opacity-50"
                                        >
                                            {i20Loading ? t('common:labels.loading') : t('studentDashboard.applicationChatPage.i20ControlFee.button')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'ds160' && (
                                <PackageFeeTab 
                                    feeType="ds160_package" 
                                    amount={getFeeAmount('ds160_package')}
                                    feeLabel={t('scholarships:scholarshipsPage.modal.ds160Package')}
                                    isPaid={ds160PackagePaid}
                                    loading={packageLoading}
                                    setLoading={setPackageLoading}
                                    error={packageError}
                                    setError={setPackageError}
                                    selectedPaymentMethod={selectedPaymentMethod as any}
                                    setSelectedPaymentMethod={setSelectedPaymentMethod as any}
                                    showZelle={showZelle}
                                    setShowZelle={setShowZelle}
                                    showInlineCpf={showInlineCpf}
                                    setShowInlineCpf={setShowInlineCpf}
                                    inlineCpf={inlineCpf}
                                    setInlineCpf={setInlineCpf}
                                    savingCpf={savingCpf}
                                    setSavingCpf={setSavingCpf}
                                    cpfError={cpfError}
                                    setCpfError={setCpfError}
                                    userProfile={userProfile}
                                    onPaymentSuccess={fetchApplicationDetails}
                                    currentStep="my_applications"
                                />
                            )}
                            {activeTab === 'i539' && (
                                <PackageFeeTab 
                                    feeType="i539_cos_package" 
                                    amount={getFeeAmount('i539_cos_package')}
                                    feeLabel={t('scholarships:scholarshipsPage.modal.i539COSPackage')}
                                    isPaid={i539PackagePaid}
                                    loading={packageLoading}
                                    setLoading={setPackageLoading}
                                    error={packageError}
                                    setError={setPackageError}
                                    selectedPaymentMethod={selectedPaymentMethod as any}
                                    setSelectedPaymentMethod={setSelectedPaymentMethod as any}
                                    showZelle={showZelle}
                                    setShowZelle={setShowZelle}
                                    showInlineCpf={showInlineCpf}
                                    setShowInlineCpf={setShowInlineCpf}
                                    inlineCpf={inlineCpf}
                                    setInlineCpf={setInlineCpf}
                                    savingCpf={savingCpf}
                                    setSavingCpf={setSavingCpf}
                                    cpfError={cpfError}
                                    setCpfError={setCpfError}
                                    userProfile={userProfile}
                                    onPaymentSuccess={fetchApplicationDetails}
                                    currentStep="my_applications"
                                />
                            )}
                            {activeTab === 'acceptance' && (
                                <div className="space-y-8 pb-12">
                                    {/* University Details (Unificado) */}
                                    <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200">
                                        <div className="bg-slate-900 p-8 md:p-12 text-white relative">
                                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                                <GraduationCap className="w-48 h-48" />
                                            </div>
                                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                                                <div className="w-32 h-32 bg-white rounded-3xl p-4 shadow-2xl flex items-center justify-center">
                                                    <GraduationCap className="w-16 h-16 text-blue-600" />
                                                </div>
                                                <div className="space-y-4 text-center md:text-left">
                                                    <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                                                        {applicationDetails.scholarships?.universities?.name}
                                                    </h3>
                                                    <div className="flex items-center justify-center md:justify-start gap-4 text-white/60 font-bold uppercase tracking-widest text-xs">
                                                        <span className="flex items-center gap-2"><MapPin className="w-4 h-4" />{applicationDetails.scholarships?.universities?.location}</span>
                                                        <span className="flex items-center gap-2"><Clock className="w-4 h-4" />{format(new Date(applicationDetails.created_at), 'dd/MM/yyyy')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-12 border-b border-slate-100">
                                            <div className="space-y-8">
                                                <div>
                                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{t('studentDashboard.myApplicationStep.details.scholarshipInfo')}</h4>
                                                    <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                                                        <div className="flex justify-between font-bold"><span>{t('studentDashboard.myApplicationStep.details.program')}</span><span className="text-blue-600 uppercase">{applicationDetails.scholarships?.degree_type}</span></div>
                                                        <div className="flex justify-between font-bold"><span>{t('scholarships:scholarshipsPage.labels.amount')}</span><span className="text-emerald-600">${applicationDetails.scholarships?.amount}</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-8">
                                                <div>
                                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{t('studentDashboard.myApplicationStep.details.institution.details')}</h4>
                                                    <div className="bg-slate-50 p-6 rounded-2xl space-y-4 font-bold text-sm">
                                                        <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-slate-400" />{applicationDetails.scholarships?.universities?.contact?.email}</div>
                                                        <div className="flex items-center gap-3"><Globe className="w-4 h-4 text-slate-400" />{applicationDetails.scholarships?.universities?.website}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status da Carta (Integrado) */}
                                        <div className="p-12 text-center">
                                            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <Award className={`w-10 h-10 ${applicationDetails?.acceptance_letter_url ? 'text-emerald-500' : 'text-slate-300'}`} />
                                            </div>
                                            <h3 className="text-2xl font-black uppercase tracking-tight mb-4">{t('studentDashboard.myApplicationStep.tabs.acceptanceLetter')}</h3>
                                            
                                            {applicationDetails?.acceptance_letter_url ? (
                                                <div className="space-y-6">
                                                    <p className="text-emerald-600 font-bold">{t('dashboard:studentDashboard.myApplicationStep.welcome.documentAvailable')}</p>
                                                    <a href={applicationDetails.acceptance_letter_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg hover:rotate-1">
                                                        <Download className="w-5 h-5" /> {t('common:labels.download')}
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="max-w-md mx-auto p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                                    <Clock className="w-6 h-6 text-slate-400 mx-auto mb-3" />
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                                                        {t('dashboard:studentDashboard.myApplicationStep.welcome.status.inProgress')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>

                <aside className="w-full lg:w-80 lg:sticky lg:top-8 shrink-0">
                    <ApplicationSidebar 
                        steps={sidebarSteps} 
                        activeStep={activeTab} 
                        onStepClick={setActiveTab} 
                    />
                </aside>
            </div>

            {previewUrl && <DocumentViewerModal documentUrl={previewUrl} onClose={() => setPreviewUrl(null)} />}
        </div>
    );
};
