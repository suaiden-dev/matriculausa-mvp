import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, Award, GraduationCap, Download, 
  MapPin, Clock, Mail, Globe, CreditCard, Sparkles,
  ArrowRight, ArrowLeft, CheckCircle2, Lock
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
    const { getFeeAmount, formatFeeAmount } = useFeeConfig(user?.id);

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

    const scholarshipAmount = useMemo(() => {
        const scholarship = applicationDetails?.scholarships;
        if (!scholarship) return 0;

        return Number(
            scholarship.annual_value_with_scholarship ??
            scholarship.amount ??
            scholarship.annual_value ??
            scholarship.scholarship_amount ??
            0
        );
    }, [applicationDetails]);

    const getRelativePath = (fullUrl: string, bucketName = 'document-attachments') => {
        const baseUrl = `https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/${bucketName}/`;
        if (!fullUrl) return '';
        if (fullUrl.startsWith(baseUrl)) return fullUrl.replace(baseUrl, '');

        if (fullUrl.includes('/storage/v1/object/public/')) {
            const parts = fullUrl.split('/storage/v1/object/public/');
            if (parts.length > 1) {
                const pathParts = parts[1].split('/');
                pathParts.shift();
                return pathParts.join('/');
            }
        }

        return fullUrl.startsWith('/') ? fullUrl.slice(1) : fullUrl;
    };

    const handleViewDocument = async (docUrl: string, bucketName = 'document-attachments') => {
        if (!docUrl) return;
        try {
            let previewSource = docUrl;
            if (docUrl.includes(`supabase.co/storage/v1/object/public/${bucketName}/`)) {
                const filePath = getRelativePath(docUrl, bucketName);
                const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(filePath, 60 * 60);
                if (error || !data?.signedUrl) throw error || new Error('Failed to create signed URL');
                previewSource = data.signedUrl;
            }
            setPreviewUrl(previewSource);
        } catch (err) {
            console.error('Error viewing document:', err);
            alert(t('dashboard:studentDashboard.documentRequests.errors.errorViewingDocument') || 'Erro ao visualizar documento');
        }
    };

    const handleDownloadDocument = async (docUrl: string, fileName = 'acceptance_letter.pdf', bucketName = 'document-attachments') => {
        if (!docUrl) return;
        try {
            let downloadUrl = docUrl;
            if (docUrl.includes(`supabase.co/storage/v1/object/public/${bucketName}/`)) {
                const filePath = getRelativePath(docUrl, bucketName);
                const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(filePath, 60 * 60);
                if (error || !data?.signedUrl) throw error || new Error('Failed to create signed URL');
                downloadUrl = data.signedUrl;
            }
            const response = await fetch(downloadUrl);
            if (!response.ok) throw new Error('Failed to download document');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading document:', err);
            alert(t('dashboard:studentDashboard.documentRequests.errors.errorDownloadingDocument') || 'Erro ao baixar documento');
        }
    };

    const studentProcessType = applicationDetails?.student_process_type;
    const showDs160Tab = isPlacementFlow && studentProcessType === 'initial';
    const showI539Tab = isPlacementFlow && (studentProcessType === 'change_of_status' || (studentProcessType === 'transfer' && userProfile?.visa_transfer_active === false));
    const packageFeeRequired = (showDs160Tab && !ds160PackagePaid) || (showI539Tab && !i539PackagePaid);

    const { hasPendingUploads, hasUnderReviewDocs, allDocsApproved, pendingDocNames } = useMemo(() => {
        if (!documentRequests || documentRequests.length === 0) {
            return { hasPendingUploads: false, hasUnderReviewDocs: false, allDocsApproved: false, pendingDocNames: [] };
        }

        const pendingNames: string[] = [];
        let hasPending = false;
        let hasReview = false;
        let allApproved = true;

        documentRequests.forEach(req => {
            const uploads = req.document_request_uploads || [];
            const isApproved = uploads.some((u: any) => u.status === 'approved');
            const isUnderReview = uploads.some((u: any) => u.status === 'under_review');

            if (isApproved) {
                // Ok
            } else if (isUnderReview) {
                hasReview = true;
                allApproved = false;
            } else {
                // Pending or Rejected without new upload
                hasPending = true;
                allApproved = false;
                pendingNames.push(req.title);
            }
        });

        return {
            hasPendingUploads: hasPending,
            hasUnderReviewDocs: hasReview,
            allDocsApproved: allApproved,
            pendingDocNames: pendingNames
        };
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

        // 1. Pagamento em Verificação (Zelle)
        if (hasPendingZelle) return { 
            status: 'under_review' as const, 
            title: t('dashboard:studentDashboard.myApplicationStep.status.verifyingPayment.title'), 
            description: t('dashboard:studentDashboard.myApplicationStep.status.verifyingPayment.description'), 
            nextStepLabel: '', 
            action: () => {} 
        };

        // 2. CARTA DE ACEITE DISPONÍVEL (Prioridade Máxima após Zelle)
        if (applicationDetails.acceptance_letter_url) {
            // 2.1 Pagamento do Pacote Pendente (DS160/I539)
            if (packageFeeRequired) {
                const feeName = showDs160Tab 
                    ? t('scholarships:scholarshipsPage.modal.ds160Package') 
                    : t('scholarships:scholarshipsPage.modal.i539COSPackage');

                return { 
                    status: 'pending_package_fee' as const, 
                    title: t('dashboard:studentDashboard.myApplicationStep.status.pendingFee.title'), 
                    description: t('dashboard:studentDashboard.myApplicationStep.status.pendingFee.description', { feeName }), 
                    nextStepLabel: t('dashboard:studentDashboard.myApplicationStep.status.pendingFee.button'), 
                    action: () => setActiveTab(showDs160Tab ? 'ds160' : 'i539') 
                };
            }
            
            // 2.2 Tudo pronto (Carta emitida e Taxas pagas)
            return { 
                status: 'approved' as const, 
                title: t('dashboard:studentDashboard.myApplicationStep.status.approved.title'), 
                description: t('dashboard:studentDashboard.myApplicationStep.status.approved.description'), 
                nextStepLabel: t('dashboard:studentDashboard.myApplicationStep.status.approved.button'), 
                action: () => setActiveTab('acceptance') 
            };
        }

        // 3. Status de Matrícula Concluída (Fallback de sucesso sem carta explícita)
        if (applicationDetails.status === 'enrolled') {
            return {
                status: 'approved' as const,
                title: t('dashboard:studentDashboard.myApplicationStep.status.approved.title'),
                description: t('dashboard:studentDashboard.myApplicationStep.status.approved.description'),
                nextStepLabel: t('dashboard:studentDashboard.myApplicationStep.status.approved.button'),
                action: () => setActiveTab('acceptance')
            };
        }

        // 4. Ação Necessária: Documentos Pendentes/Rejeitados
        if (hasPendingUploads) {
            const docList = pendingDocNames.length > 0 ? ` (${pendingDocNames.join(', ')})` : '';
            return { 
                status: 'pending_documents' as const, 
                title: t('dashboard:studentDashboard.myApplicationStep.status.pendingDocs.title'), 
                description: `${t('dashboard:studentDashboard.myApplicationStep.status.pendingDocs.description')}${docList}`, 
                nextStepLabel: t('dashboard:studentDashboard.myApplicationStep.status.pendingDocs.button'), 
                action: () => setActiveTab('documents') 
            };
        }

        // 5. Documentos em Análise (Aguardando Admin)
        if (hasUnderReviewDocs) return {
            status: 'under_review_docs' as const,
            title: t('dashboard:studentDashboard.myApplicationStep.status.generalWait.title'),
            description: t('dashboard:studentDashboard.myApplicationStep.status.generalWait.description'),
            nextStepLabel: '',
            action: () => {}
        };

        // 6. Aguardando Carta de Aceite (Docs aprovados, mas sem carta ainda)
        if (allDocsApproved) return {
            status: 'under_review' as const,
            title: t('dashboard:studentDashboard.myApplicationStep.status.waitingAcceptance.title'),
            description: t('dashboard:studentDashboard.myApplicationStep.status.waitingAcceptance.description'),
            nextStepLabel: '',
            action: () => {}
        };

        // 7. Espera Inicial (Nenhum documento solicitado ainda)
        if (documentRequests.length === 0) {
            const hoursElapsed = applicationDetails?.created_at
                ? Math.min(
                    Math.floor((Date.now() - new Date(applicationDetails.created_at).getTime()) / (1000 * 60 * 60)),
                    24
                  )
                : 0;
            return {
                status: 'under_review' as const,
                title: t('dashboard:studentDashboard.myApplicationStep.status.initialAnalysis.title'),
                description: t('dashboard:studentDashboard.myApplicationStep.status.initialAnalysis.description'),
                nextStepLabel: '',
                action: () => {},
                progress: {
                  current: hoursElapsed,
                  total: 24,
                  label: "Processamento"
                }
            };
        }

        return { 
            status: 'under_review' as const, 
            title: t('dashboard:studentDashboard.myApplicationStep.status.generalWait.title'), 
            description: t('dashboard:studentDashboard.myApplicationStep.status.generalWait.description'), 
            nextStepLabel: '', 
            action: () => { } 
        };
    }, [pendingDocNames, hasPendingUploads, hasUnderReviewDocs, hasPendingZelle, packageFeeRequired, applicationDetails, t, showDs160Tab, documentRequests.length, allDocsApproved]);

    const sidebarSteps = useMemo(() => [
        { 
            id: 'documents', 
            title: t('dashboard:studentDashboard.myApplicationStep.welcome.actionDocuments'), 
            status: allDocsApproved 
                ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.completed') 
                : (hasUnderReviewDocs ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.underReview') : t('dashboard:studentDashboard.myApplicationStep.welcome.status.inProgress')), 
            variant: (allDocsApproved ? 'success' : (hasUnderReviewDocs ? 'warning' : 'info')) as any 
        },
        { 
            id: 'acceptance', 
            title: t('dashboard:studentDashboard.myApplicationStep.tabs.acceptanceLetter'),
            status: applicationDetails?.acceptance_letter_url 
                ? t('dashboard:studentDashboard.myApplicationStep.welcome.documentAvailable') 
                : (!allDocsApproved
                    ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.blocked')
                    : t('dashboard:studentDashboard.myApplicationStep.welcome.status.inProgress')), 
            variant: (applicationDetails?.acceptance_letter_url ? 'success' : (!allDocsApproved ? 'error' : 'info')) as any,
            completed: !!applicationDetails?.acceptance_letter_url
        },
        ...(showDs160Tab ? [{ 
            id: 'ds160', 
            title: t('scholarships:scholarshipsPage.modal.ds160Package'), 
            status: ds160PackagePaid 
                ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.completed') 
                : (!applicationDetails?.acceptance_letter_url 
                    ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.blocked')
                    : t('dashboard:studentDashboard.myApplicationStep.welcome.status.actionRequired')), 
            variant: (ds160PackagePaid ? 'success' : (!applicationDetails?.acceptance_letter_url ? 'error' : 'warning')) as any 
        }] : []),
        ...(showI539Tab ? [{ 
            id: 'i539', 
            title: (studentProcessType === 'transfer' && userProfile?.visa_transfer_active === false)
                ? t('registration:studentOnboarding.stepper.steps.reinstatement_fee')
                : t('scholarships:scholarshipsPage.modal.i539COSPackage'), 
            status: i539PackagePaid 
                ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.completed') 
                : (!applicationDetails?.acceptance_letter_url 
                    ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.blocked')
                    : t('dashboard:studentDashboard.myApplicationStep.welcome.status.actionRequired')), 
            variant: (i539PackagePaid ? 'success' : (!applicationDetails?.acceptance_letter_url ? 'error' : 'warning')) as any 
        }] : []),
    ], [t, allDocsApproved, documentRequests.length, showDs160Tab, ds160PackagePaid, showI539Tab, i539PackagePaid, applicationDetails?.acceptance_letter_url, studentProcessType, userProfile?.visa_transfer_active, packageFeeRequired]);

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

                const universityId = (data.scholarships as any)?.university_id
                    || (data.scholarships as any)?.universities?.id;

                const reqQuery = supabase
                    .from('document_requests')
                    .select('id, title, status, document_request_uploads(status)');

                if (universityId) {
                    reqQuery.or(
                        `scholarship_application_id.eq.${data.id},and(is_global.eq.true,university_id.eq.${universityId})`
                    );
                } else {
                    reqQuery.eq('scholarship_application_id', data.id);
                }

                const { data: reqs } = await reqQuery;

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
                <p className="text-slate-600 max-w-md mx-auto">{t('dashboard:studentDashboard.myApplicationStep.noApplication.description')}</p>
                <button onClick={onBack} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all">
                    {t('common:labels.back')}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 pb-24 max-w-[1600px] mx-auto px-4 md:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mt-2 md:mt-0">
                <h2 className="text-2xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                    {t('dashboard:studentDashboard.myApplicationStep.header.my')} <span className="text-blue-600">{t('dashboard:studentDashboard.myApplicationStep.header.application')}</span>
                </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <main className="lg:col-span-9 space-y-8">
                    {activeTab !== 'welcome' && (
                        <button 
                            onClick={() => setActiveTab('welcome')}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-2 group w-fit"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {t('dashboard:studentDashboard.myApplicationStep.navigation.backToSteps')}
                            </span>
                        </button>
                    )}

                    <ApplicationStatusHero 
                        status={currentStatusInfo.status}
                        title={currentStatusInfo.title}
                        description={currentStatusInfo.description}
                        nextStepLabel={currentStatusInfo.nextStepLabel}
                        onNextStepClick={currentStatusInfo.action} 
                        showButton={currentStatusInfo.status !== 'under_review'} 
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
                                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 shadow-2xl relative overflow-hidden group border border-slate-100">
                                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-12">
                                            <div className="lg:col-span-12 space-y-6 md:space-y-10">
                                                <div className="flex items-center gap-4 md:gap-6">
                                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl transform group-hover:rotate-6 transition-transform">
                                                        <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-white" />
                                                    </div>
                                                    <h3 className="text-xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter">
                                                        {t('dashboard:studentDashboard.myApplicationStep.welcome.congratsMessage')}
                                                    </h3>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                                    {sidebarSteps.map((step, idx) => {
                                                        const isCurrent = (step.id === 'documents' && !allDocsApproved) || 
                                                                        (step.id === 'acceptance' && allDocsApproved && !applicationDetails?.acceptance_letter_url) ||
                                                                        (step.id === 'ds160' && allDocsApproved && !!applicationDetails?.acceptance_letter_url && !ds160PackagePaid && !i539PackagePaid) ||
                                                                        (step.id === 'i539' && allDocsApproved && !!applicationDetails?.acceptance_letter_url && !i539PackagePaid && !ds160PackagePaid);
                                                        const isLastOdd = sidebarSteps.length % 2 !== 0 && idx === sidebarSteps.length - 1;

                                                        return (
                                                            <motion.button 
                                                                key={step.id} 
                                                                whileHover={step.variant !== 'error' ? { scale: 1.02, y: -2 } : {}}
                                                                whileTap={step.variant !== 'error' ? { scale: 0.98 } : {}}
                                                                onClick={() => {
                                                                    if (step.variant !== 'error') {
                                                                        setActiveTab(step.id as any);
                                                                    }
                                                                }}
                                                                className={`group flex items-center gap-4 p-6 rounded-[2rem] border-2 transition-all text-left w-full relative overflow-hidden ${
                                                                    isCurrent 
                                                                        ? 'bg-gradient-to-br from-blue-50 to-white border-blue-400 shadow-2xl shadow-blue-500/10 ring-4 ring-blue-500/5' 
                                                                        : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50 shadow-sm'
                                                                } ${step.variant === 'error' ? 'cursor-not-allowed opacity-40 grayscale translate-y-0 shadow-none' : 'cursor-pointer hover:shadow-2xl hover:shadow-blue-500/5'} ${isLastOdd ? 'md:col-span-2' : 'col-span-1'}`}
                                                            >
                                                                {/* Efeito de destaque para o step atual */}
                                                                {isCurrent && (
                                                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                )}

                                                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-black text-sm md:text-lg shrink-0 transition-all ${
                                                                    step.completed 
                                                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 rotate-12 group-hover:rotate-0' 
                                                                        : isCurrent 
                                                                            ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 ring-4 ring-blue-500/20' 
                                                                            : 'bg-slate-100 text-slate-400 shadow-inner border border-slate-200'
                                                                }`}>
                                                                    {step.completed ? '✓' : idx + 1}
                                                                </div>
                                                                
                                                                <div className="flex-1 min-w-0 relative z-10">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <div className="flex flex-col">
                                                                            <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${
                                                                                step.completed ? 'text-emerald-600' : isCurrent ? 'text-blue-600' : 'text-slate-400'
                                                                            }`}>
                                                                                {step.status}
                                                                            </span>
                                                                            {isCurrent && !step.completed && (
                                                                                <div className="w-8 h-1 bg-blue-600 rounded-full mt-1 animate-pulse" />
                                                                            )}
                                                                        </div>
                                                                        
                                                                        {step.variant !== 'error' && !step.completed && isCurrent && (
                                                                            <span className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black text-white uppercase tracking-tight bg-blue-600 px-3 py-1.5 rounded-full border border-blue-500 shadow-lg shadow-blue-500/20 group-hover:bg-blue-700 transition-all animate-bounce-subtle">
                                                                                {t('common:labels.clickToAccess')}
                                                                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                                                            </span>
                                                                        )}
                                                                        
                                                                        {step.completed && (
                                                                             <div className="bg-emerald-100 p-1 rounded-full">
                                                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                             </div>
                                                                        )}
                                                                        
                                                                        {step.variant === 'error' && (
                                                                             <div className="bg-slate-100 p-1 rounded-full">
                                                                                <Lock className="w-3 h-3 text-slate-400" />
                                                                             </div>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <h4 className={`font-black uppercase tracking-tight text-base md:text-xl truncate ${
                                                                        isCurrent ? 'text-blue-900' : 'text-slate-900 group-hover:text-blue-700'
                                                                    }`}>
                                                                        {step.title}
                                                                    </h4>
                                                                </div>
                                                                
                                                                {step.variant !== 'error' && !step.completed && (
                                                                    <ArrowRight className={`w-4 h-4 shrink-0 transition-all ${
                                                                        isCurrent ? 'text-blue-400' : 'text-slate-200 group-hover:text-blue-400 group-hover:translate-x-1'
                                                                    }`} />
                                                                )}
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Card de Suporte - Menor e centralizado */}
                                                <div className="pt-4">
                                                    <div className="bg-gray-900 rounded-[2rem] p-6 text-white space-y-4 shadow-2xl max-w-md mx-auto border border-gray-800">
                                                        <div className="flex flex-col items-center text-center space-y-3">
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">{t('dashboard:studentDashboard.myApplicationStep.welcome.needHelp')}</h4>
                                                            <p className="font-bold text-sm leading-tight">{t('dashboard:studentDashboard.myApplicationStep.welcome.supportDescription')}</p>
                                                            <button onClick={() => navigate('/student/dashboard/chat')} className="w-full py-3 bg-white text-gray-900 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-50 transition-colors shadow-lg shadow-white/5">
                                                                {t('dashboard:studentDashboard.myApplicationStep.welcome.talkToSupport')}
                                                            </button>
                                                        </div>
                                                    </div>
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
                                        <h3 className="text-3xl font-black uppercase tracking-tight mb-4">{t('dashboard:studentDashboard.applicationChatPage.tabs.i20')}</h3>
                                        <p className="text-slate-600 mb-8 max-w-md mx-auto">{t('dashboard:studentDashboard.applicationChatPage.welcome.i20ControlFee.description')}</p>
                                        <button
                                            disabled={i20Loading}
                                            onClick={handleProceedPayment}
                                            className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-500/20 disabled:opacity-50"
                                        >
                                            {i20Loading ? t('common:labels.loading') : t('dashboard:studentDashboard.applicationChatPage.welcome.i20ControlFee.button')}
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
                                    universityLogo={applicationDetails.scholarships?.universities?.logo_url || applicationDetails.scholarships?.image_url}
                                    universityName={applicationDetails.scholarships?.universities?.name}
                                    scholarshipTitle={applicationDetails.scholarships?.title}
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
                                    universityLogo={applicationDetails.scholarships?.universities?.logo_url || applicationDetails.scholarships?.image_url}
                                    universityName={applicationDetails.scholarships?.universities?.name}
                                    scholarshipTitle={applicationDetails.scholarships?.title}
                                />
                            )}
                            {activeTab === 'acceptance' && (
                                <div className="space-y-8 pb-12">
                                    {/* University Details (Unificado) */}
                                    <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200">
                                        <div className="bg-slate-900 p-6 md:p-12 text-white relative">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 hidden md:block">
                                                <GraduationCap className="w-48 h-48" />
                                            </div>
                                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
                                                <div className="w-20 h-20 md:w-32 md:h-32 bg-white rounded-2xl md:rounded-3xl p-4 shadow-2xl flex items-center justify-center">
                                                    <GraduationCap className="w-10 h-10 md:w-16 md:h-16 text-blue-600" />
                                                </div>
                                                <div className="space-y-3 md:space-y-4">
                                                    <h3 className="text-2xl md:text-5xl font-black uppercase tracking-tighter leading-tight md:leading-none">
                                                        {applicationDetails.scholarships?.universities?.name}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 text-white/60 font-bold uppercase tracking-widest text-[9px] md:text-xs">
                                                        <span className="flex items-center gap-1.5 md:gap-2"><MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />{applicationDetails.scholarships?.universities?.location}</span>
                                                        <span className="flex items-center gap-1.5 md:gap-2"><Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />{format(new Date(applicationDetails.created_at), 'dd/MM/yyyy')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 border-b border-slate-100">
                                            <div className="space-y-8">
                                                <div>
                                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{t('dashboard:studentDashboard.myApplicationStep.details.scholarshipInfo')}</h4>
                                                    <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                                                        <div className="flex justify-between font-bold"><span>{t('dashboard:studentDashboard.myApplicationStep.details.program')}</span><span className="text-blue-600 uppercase">{applicationDetails.scholarships?.degree_type}</span></div>
                                                            <div className="flex justify-between font-bold"><span>{t('scholarships:scholarships.amount')}</span><span className="text-emerald-600">{formatFeeAmount(scholarshipAmount)}</span></div>
                                                            {applicationDetails.scholarships?.application_fee_amount != null && (
                                                                <div className="flex justify-between font-semibold text-sm"><span>{t('scholarships:scholarshipsPage.scholarshipCard.applicationFee')}</span><span className="text-blue-600">{formatFeeAmount(getFeeAmount('application_fee', applicationDetails.scholarships.application_fee_amount))}</span></div>
                                                            )}
                                                            {applicationDetails.scholarships?.placement_fee_amount != null && (
                                                                <div className="flex justify-between font-semibold text-sm"><span>{t('scholarships:scholarshipsPage.scholarshipCard.placementFee')}</span><span className="text-blue-600">{formatFeeAmount(getFeeAmount('placement_fee', applicationDetails.scholarships.placement_fee_amount))}</span></div>
                                                            )}
                                                            {Array.isArray(applicationDetails.scholarships?.internal_fees) && applicationDetails.scholarships.internal_fees.length > 0 && (
                                                                <div className="space-y-1">
                                                                    <span className="block text-xs text-slate-500 uppercase tracking-widest">{t('scholarships:scholarshipsPage.modal.internalFeesTitle', 'Internal fees')}</span>
                                                                    {applicationDetails.scholarships.internal_fees.map((fee: any, idx: number) => (
                                                                        <div key={idx} className="flex justify-between text-sm"><span>{fee.category || fee.name}</span><span>{formatFeeAmount(Number(fee.amount))}</span></div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-8">
                                                <div>
                                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{t('dashboard:studentDashboard.myApplicationStep.details.institution.details')}</h4>
                                                    <div className="bg-slate-50 p-6 rounded-2xl space-y-4 font-bold text-sm">
                                                        <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-slate-400" />{applicationDetails.scholarships?.universities?.contact?.email}</div>
                                                        <div className="flex items-center gap-3"><Globe className="w-4 h-4 text-slate-400" />{applicationDetails.scholarships?.universities?.website}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status da Carta (Integrado) */}
                                        <div className="p-8 md:p-12 text-center">
                                            <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                                                <Award className={`w-8 h-8 md:w-10 md:h-10 ${applicationDetails?.acceptance_letter_url ? 'text-emerald-500' : 'text-slate-300'}`} />
                                            </div>
                                            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight mb-3 md:mb-4">{t('dashboard:studentDashboard.myApplicationStep.tabs.acceptanceLetter')}</h3>
                                            
                                            {applicationDetails?.acceptance_letter_url ? (
                                                <div className="space-y-6">
                                                    <p
                                                        className="text-emerald-600 font-bold cursor-pointer hover:underline"
                                                        role="button"
                                                        title={t('dashboard:studentDashboard.myApplicationStep.welcome.documentAvailable')}
                                                        onClick={() => handleViewDocument(applicationDetails.acceptance_letter_url)}
                                                    >
                                                        {t('dashboard:studentDashboard.myApplicationStep.welcome.documentAvailableAction')}
                                                    </p>
                                                    <button
                                                        onClick={() => handleDownloadDocument(applicationDetails.acceptance_letter_url, 'acceptance_letter.pdf')}
                                                        className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg hover:rotate-1"
                                                    >
                                                        <Download className="w-5 h-5" /> {t('common:labels.download')}
                                                    </button>
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
