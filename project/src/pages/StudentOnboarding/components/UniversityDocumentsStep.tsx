import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, GraduationCap, 
  Clock, CreditCard, Sparkles,
  ArrowRight, ArrowLeft, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
import ScholarshipInfoCard from './ScholarshipInfoCard';
import { ZelleCheckout } from '../../../components/ZelleCheckout';

export const UniversityDocumentsStep: React.FC<StepProps> = ({ onBack }) => {
    console.log('[UniversityDocumentsStep] Renderizando...');
    const { t } = useTranslation(['registration', 'common', 'scholarships', 'dashboard', 'auth']);
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const { getFeeAmount } = useFeeConfig(user?.id);

    // 1. ESTADOS
    // 1. ESTADOS
    const [dataState, setDataState] = useState({
        loading: true,
        applicationDetails: null as any,
        documentRequests: [] as any[],
        ds160PackagePaid: false,
        i539PackagePaid: false,
        hasPendingZelle: false,
    });

    // Destructuring para manter compatibilidade com o resto do código
    const { 
        loading, 
        applicationDetails, 
        documentRequests, 
        ds160PackagePaid, 
        i539PackagePaid, 
        hasPendingZelle 
    } = dataState;

    const [activeTab, setActiveTab] = useState<'welcome' | 'details' | 'documents' | 'i20' | 'ds160' | 'i539' | 'cos' | 'acceptance' | 'placement_installment' | 'i20_document'>('welcome');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
    const placementFeePendingBalance = (userProfile as any)?.placement_fee_pending_balance ?? 0;
    const hasPlacementInstallmentPending = placementFeePendingBalance > 0;


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

    const studentProcessType = userProfile?.student_process_type || applicationDetails?.student_process_type || 'initial';
    const showDs160Tab = isPlacementFlow && studentProcessType === 'initial';
    const showI539Tab = isPlacementFlow && (studentProcessType === 'change_of_status' || (studentProcessType === 'transfer' && userProfile?.visa_transfer_active === false));
    const packageFeeRequired = (showDs160Tab && !ds160PackagePaid) || (showI539Tab && !i539PackagePaid);
    const showI20DocumentTab = studentProcessType === 'change_of_status';
    const i20DocumentAvailable = !!applicationDetails?.i20_document_url;
    
    // Status da carta de aceite consolidado (Libera taxa quando 'enrolled' ou URL presente)
    const isAcceptanceReady = !!applicationDetails?.acceptance_letter_url || applicationDetails?.status === 'enrolled';

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

        // 2. CARTA DE ACEITE PRONTA (Gatilho para Pagamento do Pacote ou Download Final)
        if (isAcceptanceReady) {
            // 2.1 Pagamento do Pacote Pendente (DS160/I539)
            if (packageFeeRequired) {
                const feeName = 'Control Fee'; // 16/04/2026: Alterado visualmente para aparecer apenas 'Control Fee' independentemente do tipo de pacote 

                return { 
                    status: 'pending_package_fee' as const, 
                    title: t('dashboard:studentDashboard.myApplicationStep.status.pendingFee.title'), 
                    description: t('dashboard:studentDashboard.myApplicationStep.status.pendingFee.description', { feeName }), 
                    nextStepLabel: t('dashboard:studentDashboard.myApplicationStep.status.pendingFee.button'), 
                    action: () => setActiveTab(showDs160Tab ? 'ds160' : 'i539') 
                };
            }
            
            // 2.2 Download Disponível (Taxas pagas e URL presente)
            if (applicationDetails.acceptance_letter_url) {
                return { 
                    status: 'approved' as const, 
                    title: t('dashboard:studentDashboard.myApplicationStep.status.approved.title'), 
                    description: t('dashboard:studentDashboard.myApplicationStep.status.approved.description'), 
                    nextStepLabel: t('dashboard:studentDashboard.myApplicationStep.status.approved.button'), 
                    action: () => setActiveTab('acceptance') 
                };
            }

            // 2.3 Carta marcada como enviada mas arquivo ainda não disponível
            return {
                status: 'waiting_acceptance' as const,
                title: t('dashboard:studentDashboard.myApplicationStep.status.waiting_acceptance.title'),
                description: t('dashboard:studentDashboard.myApplicationStep.status.waiting_acceptance.description'),
                nextStepLabel: '',
                action: () => {}
            };
        }

        // 3. Status de Matrícula Concluída (Só mostra se houver URL para download)
        if (applicationDetails.status === 'enrolled' && applicationDetails.acceptance_letter_url) {
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
            return {
                status: 'pending_documents' as const,
                title: t('dashboard:studentDashboard.myApplicationStep.status.pendingDocs.title'),
                description: t('dashboard:studentDashboard.myApplicationStep.status.pendingDocs.description'),
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
            status: 'waiting_acceptance' as const,
            title: t('dashboard:studentDashboard.myApplicationStep.status.waiting_acceptance.title'),
            description: t('dashboard:studentDashboard.myApplicationStep.status.waiting_acceptance.description'),
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
                : (hasPendingUploads 
                    ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.actionRequired') 
                    : (hasUnderReviewDocs ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.underReview') : t('dashboard:studentDashboard.myApplicationStep.welcome.status.inProgress'))), 
            variant: (allDocsApproved ? 'success' : (hasUnderReviewDocs ? 'warning' : 'info')) as any 
        },
        {
            id: 'acceptance',
            title: t('dashboard:studentDashboard.myApplicationStep.tabs.acceptanceLetter'),
            status: applicationDetails?.acceptance_letter_url
                ? t('dashboard:studentDashboard.myApplicationStep.welcome.documentAvailable')
                : t('dashboard:studentDashboard.myApplicationStep.welcome.status.inProgress'),
            variant: 'info' as any,
            disabled: !allDocsApproved && !applicationDetails?.acceptance_letter_url
        },
        ...(showI20DocumentTab ? [{
            id: 'i20_document',
            title: 'I-20 Document',
            status: i20DocumentAvailable
                ? t('dashboard:studentDashboard.myApplicationStep.welcome.documentAvailable')
                : t('dashboard:studentDashboard.myApplicationStep.welcome.status.inProgress'),
            variant: (i20DocumentAvailable ? 'success' : 'info') as any,
            disabled: !i20DocumentAvailable
        }] : []),
        ...(showDs160Tab ? [{ 
            id: 'ds160', 
            title: 'Control Fee', // 16/04/2026: Alterado visualmente para aparecer apenas 'Control Fee' 
            status: ds160PackagePaid 
                ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.completed') 
                : (!isAcceptanceReady 
                    ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.inProgress')
                    : t('dashboard:studentDashboard.myApplicationStep.welcome.status.actionRequired')), 
            variant: (ds160PackagePaid ? 'success' : 'info') as any,
            disabled: !isAcceptanceReady && !ds160PackagePaid
        }] : []),
        ...(showI539Tab ? [{ 
            id: 'i539', 
            title: 'Control Fee', // 16/04/2026: Alterado visualmente para aparecer apenas 'Control Fee' 
            status: i539PackagePaid 
                ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.completed') 
                : (!isAcceptanceReady 
                    ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.inProgress')
                    : t('dashboard:studentDashboard.myApplicationStep.welcome.status.actionRequired')), 
            variant: (i539PackagePaid ? 'success' : 'info') as any,
            disabled: !isAcceptanceReady && !i539PackagePaid
        }] : []),
        ...(hasPlacementInstallmentPending ? [{
            id: 'placement_installment',
            title: `2ª Parcela do Placement Fee — $${placementFeePendingBalance.toFixed(0)}`,
            status: 'AÇÃO NECESSÁRIA',
            variant: 'warning' as any,
            completed: false,
        }] : []),
    ], [t, allDocsApproved, documentRequests.length, showDs160Tab, ds160PackagePaid, showI539Tab, i539PackagePaid, showI20DocumentTab, i20DocumentAvailable, applicationDetails?.acceptance_letter_url, applicationDetails?.status, studentProcessType, userProfile?.visa_transfer_active, packageFeeRequired, isAcceptanceReady, hasPlacementInstallmentPending, placementFeePendingBalance]);

    const fetchApplicationDetails = useCallback(async (isRefresh = false) => {
        if (!userProfile?.id) {
            if (!isRefresh) setDataState(prev => ({ ...prev, loading: false }));
            return;
        }

        try {
            if (!isRefresh) setDataState(prev => ({ ...prev, loading: true }));

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

                let ds160PaidFinal = !!(userProfile as any)?.has_paid_ds160_package;
                let i539PaidFinal = !!(userProfile as any)?.has_paid_i539_cos_package;
                let hasPendingZelleFinal = false;

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

                        ds160PaidFinal = ds160Paid || !!(userProfile as any)?.has_paid_ds160_package;
                        i539PaidFinal = i539Paid || !!(userProfile as any)?.has_paid_i539_cos_package;
                        hasPendingZelleFinal = hasPending;
                    }
                }

                // ✅ ATUALIZAÇÃO ÚNICA: Consolidando todos os dados em um único render
                setDataState(prev => ({
                    ...prev,
                    applicationDetails: data,
                    documentRequests: reqs || [],
                    ds160PackagePaid: ds160PaidFinal,
                    i539PackagePaid: i539PaidFinal,
                    hasPendingZelle: hasPendingZelleFinal,
                    loading: false
                }));
            } else {
                setDataState(prev => ({ ...prev, loading: false }));
            }

        } catch (err: any) {
            console.error('Error fetching university documents details:', err);
            setDataState(prev => ({ ...prev, loading: false }));
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
                        success_url: `${window.location.origin}/student/onboarding?step=my_applications&payment=success&session_id={CHECKOUT_SESSION_ID}`,
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
                        showButton={currentStatusInfo.status !== 'under_review' && currentStatusInfo.status !== 'waiting_acceptance'} 
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
                                    {/* Detalhes da Bolsa Selecionada */}
                                    {applicationDetails?.scholarships && (
                                        <ScholarshipInfoCard
                                            scholarship={applicationDetails.scholarships}
                                            userProfile={userProfile}
                                            acceptanceLetter={{
                                                url: applicationDetails.acceptance_letter_url,
                                                onView: handleViewDocument,
                                                onDownload: handleDownloadDocument,
                                            }}
                                        />
                                    )}

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
                                                <div className="flex flex-col gap-3 md:gap-4">
                                                    {sidebarSteps.map((step, idx) => {
                                                        const isCurrent = (step.id === 'documents' && !allDocsApproved) ||
                                                                        (step.id === 'acceptance' && allDocsApproved && !applicationDetails?.acceptance_letter_url) ||
                                                                        (step.id === 'ds160' && allDocsApproved && !!applicationDetails?.acceptance_letter_url && !ds160PackagePaid && !i539PackagePaid) ||
                                                                        (step.id === 'i539' && allDocsApproved && !!applicationDetails?.acceptance_letter_url && !i539PackagePaid && !ds160PackagePaid) ||
                                                                        (step.id === 'placement_installment' && hasPlacementInstallmentPending);

                                                        return (
                                                            <motion.button 
                                                                key={step.id} 
                                                                whileHover={step.variant !== 'error' ? { scale: 1.02, y: -2 } : {}}
                                                                whileTap={step.variant !== 'error' ? { scale: 0.98 } : {}}
                                                                onClick={() => {
                                                                    if (step.variant !== 'error' && !(step as any).disabled) {
                                                                        setActiveTab(step.id as any);
                                                                    }
                                                                }}
                                                                className={`group flex items-center gap-4 p-6 rounded-[2rem] border-2 transition-all text-left w-full relative overflow-hidden ${
                                                                    isCurrent 
                                                                        ? 'bg-gradient-to-br from-blue-50 to-white border-blue-400 shadow-2xl shadow-blue-500/10 ring-4 ring-blue-500/5' 
                                                                        : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50 shadow-sm'
                                                                } ${(step.variant === 'error' || (step as any).disabled) ? 'cursor-not-allowed opacity-40 grayscale translate-y-0 shadow-none' : 'cursor-pointer hover:shadow-2xl hover:shadow-blue-500/5'}`}
                                                            >
                                                                {/* Efeito de destaque para o step atual */}
                                                                {isCurrent && (
                                                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                )}

                                                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-black text-sm md:text-lg shrink-0 transition-all ${
                                                                    (step as any).completed 
                                                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 rotate-12 group-hover:rotate-0' 
                                                                        : isCurrent 
                                                                            ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 ring-4 ring-blue-500/20' 
                                                                            : 'bg-slate-100 text-slate-400 shadow-inner border border-slate-200'
                                                                }`}>
                                                                    {(step as any).completed ? '✓' : idx + 1}
                                                                </div>
                                                                
                                                                <div className="flex-1 min-w-0 relative z-10">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <div className="flex flex-col">
                                                                            <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${
                                                                                (step as any).completed ? 'text-emerald-600' : isCurrent ? 'text-blue-600' : 'text-slate-400'
                                                                            }`}>
                                                                                {step.status}
                                                                            </span>
                                                                            {isCurrent && !(step as any).completed && (
                                                                                <div className="w-8 h-1 bg-blue-600 rounded-full mt-1 animate-pulse" />
                                                                            )}
                                                                        </div>
                                                                        
                                                                        
                                                                        {(step as any).completed && (
                                                                             <div className="bg-emerald-100 p-1 rounded-full">
                                                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                             </div>
                                                                        )}
                                                                        
                                                                        {step.variant === 'error' && (
                                                                             <div className="bg-slate-50 p-1 rounded-full border border-slate-100">
                                                                                <Clock className="w-3 h-3 text-slate-300" />
                                                                             </div>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <h4 className={`font-black uppercase tracking-tight text-base md:text-xl truncate ${
                                                                        isCurrent ? 'text-blue-900' : 'text-slate-900 group-hover:text-blue-700'
                                                                    }`}>
                                                                        {step.title}
                                                                    </h4>
                                                                </div>
                                                                
                                                                {step.variant !== 'error' && !(step as any).completed && (
                                                                    <ArrowRight className={`w-4 h-4 shrink-0 transition-all ${
                                                                        isCurrent ? 'text-blue-400' : 'text-slate-200 group-hover:text-blue-400 group-hover:translate-x-1'
                                                                    }`} />
                                                                )}
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Card de Suporte - Menor e em linha */}
                                                <div className="pt-4">
                                                    <div className="bg-white rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 border justify-center border-slate-100 shadow-sm relative overflow-hidden">
                                                        <div className="flex items-center gap-3 w-full md:w-auto overflow-hidden">
                                                            <div className="flex flex-col min-w-0 text-left">
                                                                <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{t('dashboard:studentDashboard.myApplicationStep.welcome.needHelp')}</h4>
                                                                <p className="font-medium text-[11px] md:text-xs text-slate-400/80 truncate mt-0.5">{t('dashboard:studentDashboard.myApplicationStep.welcome.supportDescription')}</p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => navigate('/student/dashboard/chat')} className="w-full md:w-auto px-6 py-2.5 bg-white text-slate-500 rounded-xl font-bold uppercase tracking-widest text-[9px] hover:bg-slate-50 hover:text-blue-600 border-2 border-slate-100 transition-colors shrink-0">
                                                            {t('dashboard:studentDashboard.myApplicationStep.welcome.talkToSupport')}
                                                        </button>
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
                                    feeLabel="Control Fee" // 16/04/2026: Alterado visualmente para aparecer apenas 'Control Fee' 
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
                                    feeLabel="Control Fee" // 16/04/2026: Alterado visualmente para aparecer apenas 'Control Fee' 
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
                                <div className="pb-12">
                                    {applicationDetails?.scholarships && (
                                        <ScholarshipInfoCard
                                            scholarship={applicationDetails.scholarships}
                                            userProfile={userProfile}
                                            acceptanceLetter={{
                                                url: applicationDetails.acceptance_letter_url,
                                                onView: handleViewDocument,
                                                onDownload: handleDownloadDocument,
                                            }}
                                        />
                                    )}
                                </div>
                            )}

                            {activeTab === 'i20_document' && showI20DocumentTab && (
                                <div className="pb-12">
                                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-slate-100">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900">
                                                I-20 Document
                                            </h3>
                                        </div>

                                        {i20DocumentAvailable ? (
                                            <div className="space-y-4">
                                                <p className="text-slate-600">
                                                    Your I-20 document is available for download. You will need this document to proceed with your Change of Status (I-539) application.
                                                </p>
                                                <div className="bg-slate-50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-slate-900 truncate">
                                                            {applicationDetails.i20_document_url?.split('/').pop() || 'I-20 Document'}
                                                        </p>
                                                        {applicationDetails.i20_document_sent_at && (
                                                            <p className="text-sm text-slate-500">
                                                                Sent on {new Date(applicationDetails.i20_document_sent_at).toLocaleDateString('pt-BR')}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleViewDocument(applicationDetails.i20_document_url)}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-blue-700 transition-all"
                                                        >
                                                            View
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadDocument(
                                                                applicationDetails.i20_document_url,
                                                                applicationDetails.i20_document_url?.split('/').pop() || 'i20.pdf'
                                                            )}
                                                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-slate-300 transition-all"
                                                        >
                                                            Download
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                                                    </svg>
                                                </div>
                                                <p className="font-bold text-slate-700 uppercase tracking-tight">Pending</p>
                                                <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
                                                    Your I-20 document will be available here once it has been issued by the university.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'placement_installment' && hasPlacementInstallmentPending && (
                                <div className="pb-12 space-y-6">
                                    <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 md:p-8">
                                        <h3 className="text-xl font-black text-amber-900 uppercase tracking-tight mb-2">
                                            2ª Parcela do Placement Fee
                                        </h3>
                                        <p className="text-sm text-amber-700 mb-6">
                                            Sua 1ª parcela foi aprovada. Pague a 2ª parcela para liberar o download da sua Carta de Aceite e demais documentos finais.
                                        </p>
                                        <ZelleCheckout
                                            feeType="placement_fee"
                                            amount={placementFeePendingBalance}
                                            metadata={{ installment_number: 2, is_installment: true }}
                                            ignoreApprovedState={true}
                                            onSuccess={() => window.location.reload()}
                                        />
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
