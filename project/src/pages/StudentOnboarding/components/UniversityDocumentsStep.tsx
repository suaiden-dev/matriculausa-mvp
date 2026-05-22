import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, GraduationCap,
  Clock, CreditCard, Sparkles,
  ArrowRight, ArrowLeft, CheckCircle2, RefreshCw
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
import { getExchangeRate, calculateCardAmountWithFees, calculatePIXTotalWithIOF } from '../../../utils/stripeFeeCalculator';
import { PackageFeeTab } from './PackageFeeTab';
import { ApplicationSidebar } from './ApplicationSidebar';
import { ApplicationStatusHero } from './ApplicationStatusHero';
import ScholarshipInfoCard from './ScholarshipInfoCard';
import { ZelleCheckout } from '../../../components/ZelleCheckout';
import { formatPlacementFee } from '../../../utils/placementFeeCalculator';
import PayerAlternativeForm, { PayerInfo } from '../../../components/PayerAlternativeForm';
import { generateDecryptedPDFImage } from '../../../utils/pdfThumbnail';
import { computeInstallmentAmounts, InstallmentPlan } from '../../../config/installmentConfig';

// ─── Payment icons (2nd installment) ───────────────────────────────────────
const PixIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z" />
        <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z" />
        <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z" />
    </svg>
);
const ZelleIcon2 = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path fill="#a0f" d="M35,42H13c-3.866,0-7-3.134-7-7V13c0-3.866,3.134-7,7-7h22c3.866,0,7,3.134,7,7v22C42,38.866,38.866,42,35,42z" />
        <path fill="#fff" d="M17.5,18.5h14c0.552,0,1-0.448,1-1V15c0-0.552-0.448-1-1-1h-14c-0.552,0-1,0.448-1,1v2.5C16.5,18.052,16.948,18.5,17.5,18.5z" />
        <path fill="#fff" d="M17,34.5h14.5c0.552,0,1-0.448,1-1V31c0-0.552-0.448-1-1-1H17c-0.552,0-1,0.448-1,1v2.5C16,34.052,16.448,34.5,17,34.5z" />
        <path fill="#fff" d="M22.25,11v6c0,0.276,0.224,0.5,0.5,0.5h3.5c0.276,0,0.5-0.224,0.5-0.5v-6c0-0.276-0.224-0.5-0.5-0.5h-3.5C22.474,10.5,22.25,10.724,22.25,11z" />
        <path fill="#fff" d="M22.25,32v6c0,0.276,0.224,0.5,0.5,0.5h3.5c0.276,0,0.5-0.224,0.5-0.5v-6c0-0.276-0.224-0.5-0.5-0.5h-3.5C22.474,31.5,22.25,31.724,22.25,32z" />
        <path fill="#fff" d="M16.578,30.938H22l10.294-12.839c0.178-0.222,0.019-0.552-0.266-0.552H26.5L16.275,30.298C16.065,30.553,16.247,30.938,16.578,30.938z" />
    </svg>
);
const ParcelowIcon2 = ({ className }: { className?: string }) => (
    <div className={`${className} flex items-center justify-center bg-white rounded-lg overflow-hidden p-0.5 border border-gray-100`}>
        <img src="/parcelow_share.webp" alt="Parcelow" className="w-full h-full object-contain scale-110" />
    </div>
);
const StripeIcon2 = ({ className }: { className?: string }) => (
    <div className={`${className} flex items-center justify-center bg-[#635bff] rounded-lg overflow-hidden shadow-sm shadow-[#635bff]/20`}>
        <span className="text-white font-black text-[28px] leading-[0] select-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', transform: 'translateY(-1.5px)' }}>S</span>
    </div>
);

export const UniversityDocumentsStep: React.FC<StepProps> = ({ onBack }) => {
    console.log('[UniversityDocumentsStep] Renderizando...');
    const { t } = useTranslation(['registration', 'common', 'scholarships', 'dashboard', 'auth', 'payment']);
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const { getFeeAmount, formatFeeAmount } = useFeeConfig(user?.id);

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
    const [blurredPreviewUrl, setBlurredPreviewUrl] = useState<string | null>(null);
    const [blurredPreviewLoading, setBlurredPreviewLoading] = useState(false);

    const [i20Loading, setI20Loading] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | 'pix' | 'parcelow' | null>(null);
    const [exchangeRate, setExchangeRate] = useState<number>(0);
    const [, setShowZelleCheckout] = useState(false);

    // Estados para PackageFeeTab (DS160/I539)
    const [packageLoading, setPackageLoading] = useState(false);
    const [packageError, setPackageError] = useState<string | null>(null);
    const [showZelle, setShowZelle] = useState(false);
    const [showInlineCpf, setShowInlineCpf] = useState(false);
    const [inlineCpf, setInlineCpf] = useState('');
    const [savingCpf, setSavingCpf] = useState(false);
    const [cpfError, setCpfError] = useState<string | null>(null);

    // Estados do pagamento da 2ª parcela (installment)
    const [installmentZelleActive, setInstallmentZelleActive] = useState(false);
    const [installmentShowCpf, setInstallmentShowCpf] = useState(false);
    const [installmentProcessing, setInstallmentProcessing] = useState<string | null>(null);
    const [installmentPayerInfo, setInstallmentPayerInfo] = useState<PayerInfo | null>(null);

    // 2. HOOKS DE CÁLCULO (Sempre No Topo)
    const isPlacementFlow = !!(userProfile as any)?.placement_fee_flow;

    // Plano de parcelamento ativo (novo sistema dinâmico)
    const [activePlacementPlan, setActivePlacementPlan] = useState<InstallmentPlan | null>(null);
    useEffect(() => {
        if (!userProfile?.user_id) return;
        supabase
            .from('fee_installment_plans')
            .select('*')
            .eq('user_id', userProfile.user_id)
            .eq('fee_type', 'placement_fee')
            .eq('status', 'active')
            .maybeSingle()
            .then(({ data }) => setActivePlacementPlan(data ?? null));
    }, [userProfile?.user_id]);

    // Valor a pagar nesta parcela (próxima parcela do plano)
    const currentInstallmentNumber = (activePlacementPlan?.installments_paid ?? 0) + 1;
    const totalInstallments = activePlacementPlan?.total_installments ?? 2;

    // Calcular o valor da próxima parcela usando a mesma lógica de divisão
    const remainingAmount = activePlacementPlan
        ? Math.max(0, activePlacementPlan.total_amount - activePlacementPlan.amount_paid)
        : 0;
    // Amount for THIS specific installment (evenly divided, last absorbs rounding)
    const placementFeePendingBalance = activePlacementPlan
        ? computeInstallmentAmounts(activePlacementPlan.total_amount, totalInstallments)[currentInstallmentNumber - 1] ?? remainingAmount
        : ((userProfile as any)?.placement_fee_pending_balance ?? 0); // backward compat

    const hasPlacementInstallmentPending = activePlacementPlan
        ? activePlacementPlan.status === 'active' && activePlacementPlan.installments_paid < activePlacementPlan.total_installments
        : (userProfile as any)?.placement_fee_pending_balance > 0; // backward compat

    const installmentCardAmount = hasPlacementInstallmentPending ? calculateCardAmountWithFees(placementFeePendingBalance) : 0;
    const installmentPixInfo = hasPlacementInstallmentPending && exchangeRate > 0
        ? calculatePIXTotalWithIOF(placementFeePendingBalance, exchangeRate)
        : { totalWithIOF: 99999 };


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
    const canDownloadOriginal = !hasPlacementInstallmentPending && !packageFeeRequired;
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
            const allUploads = req.document_request_uploads || [];
            // Para docs globais, filtrar apenas os uploads do aluno atual
            const uploads = allUploads.filter((u: any) => !u.uploaded_by || u.uploaded_by === userProfile?.user_id);
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
    }, [documentRequests, userProfile?.user_id]);

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
        // Só ignora docs pendentes se houver URL de carta ou pacote pago — não apenas status 'enrolled'
        if (isAcceptanceReady && !hasPendingUploads && !hasUnderReviewDocs) {
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
        ...(hasPlacementInstallmentPending ? [{
            id: 'placement_installment',
            title: `Placement Fee — Parcela ${currentInstallmentNumber}/${totalInstallments} — $${placementFeePendingBalance.toFixed(0)}`,
            status: 'AÇÃO NECESSÁRIA',
            variant: 'warning' as any,
            completed: false,
        }] : []),
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
            title: i20DocumentAvailable && applicationDetails?.i20_document_url === 'blocked' 
                ? t('registration:i20Preview.title') 
                : 'I-20 Document',
            status: i20DocumentAvailable
                ? (applicationDetails?.i20_document_url === 'blocked' 
                    ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.actionRequired') 
                    : t('dashboard:studentDashboard.myApplicationStep.welcome.documentAvailable'))
                : t('dashboard:studentDashboard.myApplicationStep.welcome.status.inProgress'),
            variant: (i20DocumentAvailable 
                ? (applicationDetails?.i20_document_url === 'blocked' ? 'warning' : 'success') 
                : 'info') as any,
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
    ], [t, allDocsApproved, documentRequests.length, showDs160Tab, ds160PackagePaid, showI539Tab, i539PackagePaid, showI20DocumentTab, i20DocumentAvailable, applicationDetails?.acceptance_letter_url, applicationDetails?.i20_document_url, applicationDetails?.status, studentProcessType, userProfile?.visa_transfer_active, packageFeeRequired, isAcceptanceReady, hasPlacementInstallmentPending, placementFeePendingBalance]);

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
                    .select('id, title, status, document_request_uploads(status, uploaded_by)');

                if (universityId) {
                    reqQuery.or(
                        `scholarship_application_id.eq.${data.id},and(is_global.eq.true,or(university_id.eq.${universityId},university_id.is.null))`
                    );
                } else {
                    reqQuery.or(
                        `scholarship_application_id.eq.${data.id},and(is_global.eq.true,university_id.is.null)`
                    );
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

                // ✅ SEGURANÇA: Ocultar URL real do I-20 se não foi pago
                // Usar sentinel 'blocked' para manter i20DocumentAvailable = true
                // mas sem expor a URL real no Network tab
                const isI539COS = data?.student_process_type === 'change_of_status' || (data?.student_process_type === 'transfer' && userProfile?.visa_transfer_active === false);
                const hasPaidI20 = !!(userProfile as any)?.has_paid_i20_control_fee || (isI539COS && i539PaidFinal);
                
                const hasPlacementDebt = ((userProfile as any)?.placement_fee_pending_balance ?? 0) > 0;
                if (data && !hasPaidI20 && data.i20_document_url) {
                    data.i20_document_url = 'blocked';
                }
                if (data && hasPlacementDebt && data.i20_document_url && data.i20_document_url !== 'blocked') {
                    data.i20_document_url = 'blocked';
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

    const processInstallmentCheckout = async (method: 'stripe' | 'pix' | 'parcelow') => {
        if (!user?.id || !applicationDetails) return;
        setInstallmentProcessing(method);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            if (!token) throw new Error('User not authenticated');

            const isParcelow = method === 'parcelow';
            const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${isParcelow ? 'parcelow-checkout-placement-fee' : 'stripe-checkout-placement-fee'}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    scholarships_ids: [applicationDetails.scholarship_id],
                    amount: placementFeePendingBalance,
                    payment_method: method,
                    success_url: `${window.location.origin}/student/onboarding?step=my_applications&payment=success&session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${window.location.origin}/student/onboarding?step=my_applications&payment=cancelled`,
                    metadata: {
                        application_id: applicationDetails.id,
                        selected_scholarship_id: applicationDetails.scholarship_id,
                        fee_type: 'placement_fee',
                        final_amount: placementFeePendingBalance.toString(),
                        installment_number: String(currentInstallmentNumber),
                        total_installments: String(totalInstallments),
                        is_installment: 'true',
                    },
                    ...(isParcelow && installmentPayerInfo && { payer_info: installmentPayerInfo }),
                    payment_type: 'placement_fee',
                    fee_type: 'placement_fee',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error creating checkout session');
            }

            const data = await response.json();
            const redirectUrl = data.session_url || data.checkout_url || data.url;
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                throw new Error('Checkout URL not found');
            }
        } catch (err: any) {
            console.error('[Installment2Checkout] Error:', err);
            alert(err.message || 'Erro ao processar pagamento. Tente novamente.');
        } finally {
            setInstallmentProcessing(null);
        }
    };

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
                                                url: canDownloadOriginal ? applicationDetails.acceptance_letter_url : applicationDetails.acceptance_letter_preview_url,
                                                onView: () => {
                                                    const urlToView = canDownloadOriginal ? applicationDetails.acceptance_letter_url : applicationDetails.acceptance_letter_preview_url;
                                                    if (!urlToView) {
                                                        alert('Preview deste documento ainda está sendo gerado ou não está disponível. Por favor, contate o suporte.');
                                                        return;
                                                    }
                                                    handleViewDocument(urlToView);
                                                },
                                                onDownload: canDownloadOriginal ? handleDownloadDocument : undefined,
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
                                                url: canDownloadOriginal ? applicationDetails.acceptance_letter_url : applicationDetails.acceptance_letter_preview_url,
                                                onView: () => {
                                                    const urlToView = canDownloadOriginal ? applicationDetails.acceptance_letter_url : applicationDetails.acceptance_letter_preview_url;
                                                    if (!urlToView) {
                                                        alert('Preview deste documento ainda está sendo gerado ou não está disponível. Por favor, contate o suporte.');
                                                        return;
                                                    }
                                                    handleViewDocument(urlToView);
                                                },
                                                onDownload: canDownloadOriginal ? handleDownloadDocument : undefined,
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
                                                    {applicationDetails.i20_document_url !== 'blocked' 
                                                        ? 'Your I-20 document is available for download. You will need this document to proceed with your Change of Status (I-539) application.'
                                                        : 'Sua via prévia (limitada) do I-20 está disponível para verificação. Efetue o pagamento da taxa para liberar o documento original.'}
                                                </p>
                                                <div className="bg-slate-50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full overflow-hidden">
                                                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                                                        <p className="font-medium text-slate-900 truncate whitespace-nowrap block max-w-full" title={applicationDetails.i20_document_url !== 'blocked' ? (applicationDetails.i20_document_url?.split('/').pop() || 'I-20 Document') : (applicationDetails.i20_document_preview_url?.split('/').pop() || 'I-20_Preview.svg')}>
                                                            {applicationDetails.i20_document_url !== 'blocked'
                                                                ? (applicationDetails.i20_document_url?.split('/').pop() || 'I-20 Document')
                                                                : (applicationDetails.i20_document_preview_url?.split('/').pop() || 'I-20_Preview.svg')}
                                                        </p>
                                                        {applicationDetails.i20_document_sent_at && (
                                                            <p className="text-sm text-slate-500 mt-0.5">
                                                                Sent on {new Date(applicationDetails.i20_document_sent_at).toLocaleDateString('pt-BR')}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
                                                         <button
                                                            onClick={async () => {
                                                                const isBlocked = applicationDetails.i20_document_url === 'blocked';
                                                                if (isBlocked) {
                                                                    // Mostrar PDF real embaçado via Edge Function + Decrypt no client
                                                                    setBlurredPreviewLoading(true);
                                                                    try {
                                                                        const { data, error } = await supabase.functions.invoke('get-i20-preview', {
                                                                            body: { applicationId: applicationDetails.id },
                                                                        });
                                                                        
                                                                        if (error || !data?.scrambledData) throw error || new Error('Sem dados embaralhados');
                                                                        
                                                                        // Descriptografar e gerar Imagem Blob
                                                                        const imageBlob = await generateDecryptedPDFImage(
                                                                            data.scrambledData, 
                                                                            "matriculausa-secure-i20-key",
                                                                            t('registration:i20Preview.watermark')
                                                                        );
                                                                        const objectUrl = URL.createObjectURL(imageBlob);
                                                                        
                                                                        setBlurredPreviewUrl(objectUrl);
                                                                    } catch (err) {
                                                                        console.error('[I20Preview] Error:', err);
                                                                        alert('Não foi possível carregar o preview. Tente novamente.');
                                                                    } finally {
                                                                        setBlurredPreviewLoading(false);
                                                                    }
                                                                    return;
                                                                }
                                                                const urlToView = applicationDetails.i20_document_url;
                                                                if (!urlToView) return;
                                                                handleViewDocument(urlToView);
                                                            }}
                                                            className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${blurredPreviewLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                                                            disabled={blurredPreviewLoading}
                                                        >
                                                            {blurredPreviewLoading ? (
                                                                <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />Carregando...</>
                                                            ) : (
                                                                applicationDetails.i20_document_url !== 'blocked' ? t('common:labels.view') : t('registration:i20Preview.viewPreview')
                                                            )}
                                                        </button>
                                                        {applicationDetails.i20_document_url !== 'blocked' && (
                                                            <button
                                                                onClick={() => handleDownloadDocument(
                                                                    applicationDetails.i20_document_url,
                                                                    applicationDetails.i20_document_url?.split('/').pop() || 'i20.pdf'
                                                                )}
                                                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-slate-300 transition-all"
                                                            >
                                                                {t('common:labels.download')}
                                                            </button>
                                                        )}
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
                                                <p className="font-bold text-slate-700 uppercase tracking-tight">{t('common:status.waiting_acceptance')}</p>
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
                                    <div className="group relative bg-white border border-slate-200 rounded-[2rem] px-4 py-8 md:p-8 shadow-sm hover:shadow-xl transition-all">
                                        <div className="flex flex-col gap-8">
                                            {/* Header: logo + scholarship name + amount */}
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                <div className="flex flex-col md:flex-row md:items-center gap-6">
                                                    {applicationDetails.scholarships?.universities?.logo_url || applicationDetails.scholarships?.image_url ? (
                                                        <div className="w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center border border-gray-100/50 overflow-hidden shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform duration-500 mx-auto md:mx-0">
                                                            <img
                                                                src={applicationDetails.scholarships.universities?.logo_url || applicationDetails.scholarships.image_url || ''}
                                                                alt=""
                                                                className="w-full h-full object-contain p-2"
                                                                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-28 h-28 bg-slate-50 rounded-[2rem] flex items-center justify-center flex-shrink-0 mx-auto md:mx-0">
                                                            <GraduationCap className="w-16 h-16 text-slate-300" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1 text-center md:text-left">
                                                        <h3 className="text-2xl font-black text-gray-900 truncate uppercase tracking-tight">
                                                            {applicationDetails.scholarships?.title || 'Scholarship'}
                                                        </h3>
                                                        <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">
                                                            {applicationDetails.scholarships?.universities?.name || 'University'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-center md:items-end">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">
                                                        {t('payment:placementFeeStep.title')} — 2nd Installment (50%)
                                                    </span>
                                                    <div className="text-4xl font-black text-slate-900 tracking-tighter">
                                                        {formatPlacementFee(placementFeePendingBalance)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payment methods */}
                                            <div className="space-y-3">
                                                {/* Stripe / Credit Card */}
                                                <button
                                                    onClick={() => processInstallmentCheckout('stripe')}
                                                    disabled={!!installmentProcessing}
                                                    className="group/btn relative bg-white border border-gray-200 px-4 py-5 md:p-5 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 block w-full"
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-4 sm:gap-5 -ml-1 md:ml-0">
                                                            <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl group-hover/btn:bg-slate-100 transition-colors shrink-0">
                                                                <StripeIcon2 className="w-9 h-9" />
                                                            </div>
                                                            <div>
                                                                <div className="font-black text-slate-900 text-base uppercase tracking-tight">{t('payment:paymentStep.creditCard')}</div>
                                                                <div className="hidden md:block text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide leading-tight">{t('payment:paymentStep.creditCardFees')}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="text-slate-900 text-xl font-black uppercase tracking-tight">{formatFeeAmount(installmentCardAmount, true)}</div>
                                                        </div>
                                                    </div>
                                                    <div className="md:hidden mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
                                                        {t('payment:paymentStep.creditCardFees')}
                                                    </div>
                                                    {installmentProcessing === 'stripe' && (
                                                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                                            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                                                        </div>
                                                    )}
                                                </button>

                                                {/* PIX */}
                                                {installmentPixInfo.totalWithIOF <= 3000 && (
                                                    <button
                                                        onClick={() => processInstallmentCheckout('pix')}
                                                        disabled={!!installmentProcessing}
                                                        className="group/btn relative bg-white border border-gray-200 px-4 py-5 md:p-5 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 block w-full"
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-4 sm:gap-5 -ml-1 md:ml-0">
                                                                <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl group-hover/btn:bg-slate-100 transition-colors shrink-0">
                                                                    <PixIcon className="w-9 h-9" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-black text-slate-900 text-base uppercase tracking-tight">PIX</div>
                                                                    <div className="hidden md:block text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide leading-tight">{t('payment:paymentStep.pixFees')}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <div className="text-slate-900 text-xl font-black uppercase tracking-tight">
                                                                    R$ {installmentPixInfo.totalWithIOF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="md:hidden mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
                                                            {t('payment:paymentStep.pixFees')}
                                                        </div>
                                                        {installmentProcessing === 'pix' && (
                                                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                                                <RefreshCw className="w-8 h-8 text-[#4db6ac] animate-spin" />
                                                            </div>
                                                        )}
                                                    </button>
                                                )}

                                                {/* Parcelow */}
                                                <div className="group/parcelow flex flex-col gap-0">
                                                    <button
                                                        onClick={() => setInstallmentShowCpf(v => !v)}
                                                        disabled={!!installmentProcessing}
                                                        className={`group/btn relative bg-white border border-gray-200 px-4 py-5 md:p-5 text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 block w-full ${installmentShowCpf ? 'rounded-t-[2rem] border-b-0 shadow-none ring-1 ring-blue-600/20 bg-blue-50/5' : 'rounded-[2rem]'}`}
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-4 sm:gap-5 -ml-1 md:ml-0">
                                                                <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl group-hover/btn:bg-slate-100 transition-colors px-2 shrink-0">
                                                                    <ParcelowIcon2 className="w-full h-10" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-black text-slate-900 text-base uppercase tracking-tight">Parcelow</div>
                                                                    <div className="hidden md:block text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide leading-tight">{t('payment:paymentStep.parcelowFees')}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex flex-col items-end shrink-0">
                                                                <div className="text-slate-900 text-xl font-black uppercase tracking-tight">{formatFeeAmount(placementFeePendingBalance, true)}</div>
                                                                <span className="text-[10px] font-bold text-slate-900 mt-1 block uppercase tracking-widest leading-tight">{t('payment:paymentStep.parcelowInstallments')}</span>
                                                            </div>
                                                        </div>
                                                        <div className="md:hidden mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
                                                            {t('payment:paymentStep.parcelowFees')}
                                                        </div>
                                                        {installmentProcessing === 'parcelow' && (
                                                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                                                <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                                                            </div>
                                                        )}
                                                    </button>
                                                    {installmentShowCpf && (
                                                        <div className="border border-slate-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm p-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <PayerAlternativeForm
                                                                onPayerInfoChange={setInstallmentPayerInfo}
                                                                initialCpf={userProfile?.cpf_document || ''}
                                                                onPayButtonClick={() => processInstallmentCheckout('parcelow')}
                                                                isProcessing={installmentProcessing === 'parcelow'}
                                                            />
                                                            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                                                                Você será redirecionado para o ambiente seguro da Parcelow
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Zelle */}
                                                <div className="flex flex-col">
                                                    <button
                                                        onClick={() => setInstallmentZelleActive(v => !v)}
                                                        disabled={!!installmentProcessing}
                                                        className={`group/btn relative bg-white border px-4 py-5 md:p-5 text-left hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 block w-full ${installmentZelleActive ? 'rounded-t-[2rem] border-slate-200 border-b-0 bg-slate-50/30' : 'rounded-[2rem] border-gray-200'}`}
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-4 sm:gap-5 -ml-1 md:ml-0">
                                                                <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl group-hover/btn:bg-slate-100 transition-colors shrink-0">
                                                                    <ZelleIcon2 className="w-9 h-9" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-black text-slate-900 text-base uppercase tracking-tight">Zelle</div>
                                                                    <div className="hidden md:flex text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wide leading-tight items-center gap-1">
                                                                        <AlertCircle className="w-3 h-3" />
                                                                        {t('payment:paymentStep.zelleProcessingTime')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <div className="text-slate-900 text-xl font-black uppercase tracking-tight">{formatPlacementFee(placementFeePendingBalance)}</div>
                                                                <span className="text-[10px] font-bold text-slate-900 mt-1 block uppercase tracking-widest leading-tight">{t('payment:paymentStep.zelleNoFees')}</span>
                                                            </div>
                                                        </div>
                                                        <div className="md:hidden mt-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" />
                                                            {t('payment:paymentStep.zelleProcessingTime')}
                                                        </div>
                                                    </button>
                                                    {installmentZelleActive && (
                                                        <div className="border border-slate-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm">
                                                            <ZelleCheckout
                                                                feeType="placement_fee"
                                                                amount={placementFeePendingBalance}
                                                                metadata={{ installment_number: 2, is_installment: true }}
                                                                ignoreApprovedState={true}
                                                                onSuccess={() => window.location.reload()}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
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

            {blurredPreviewUrl && createPortal(
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center transition-opacity z-[9999999]"
                    onClick={() => setBlurredPreviewUrl(null)}
                >
                    <div
                        className="relative bg-white rounded-xl shadow-2xl w-[98vw] md:w-[90vw] max-w-[700px] h-[85vh] flex flex-col overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header estilo DocumentViewerModal para manter o padrão */}
                        <div className="flex flex-col border-b border-gray-200 bg-gray-50 shrink-0">
                            <div className="flex items-center justify-between p-4">
                                <h3 className="text-lg font-semibold text-gray-800 truncate">
                                    {t('registration:i20Preview.title')}
                                </h3>
                                <button
                                    onClick={() => setBlurredPreviewUrl(null)}
                                    className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2"
                                    title="Fechar"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Fechar
                                </button>
                            </div>
                        </div>

                        {/* Corpo do Modal - Conteúdo Embaçado */}
                        <div className="flex-1 bg-gray-100 flex items-center justify-center relative overflow-hidden">
                            <img
                                src={blurredPreviewUrl}
                                alt="I-20 Preview"
                                className="w-full h-full object-cover filter brightness-95 scale-105"
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                            />
                            
                            {/* Overlay de bloqueio */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div style={{
                                background: 'white',
                                borderRadius: 24,
                                padding: '40px 48px',
                                textAlign: 'center',
                                maxWidth: 420,
                                boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
                            }}>
                                <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
                                <h3 style={{ fontWeight: 900, fontSize: 22, color: '#1e293b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                                    {t('registration:i20Preview.title')}
                                </h3>
                                <p style={{ color: '#64748b', fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
                                    {t('registration:i20Preview.description')}
                                </p>
                                <button
                                    onClick={() => { setBlurredPreviewUrl(null); setActiveTab('ds160'); }}
                                    style={{ background: '#1e40af', color: 'white', border: 'none', borderRadius: 12, padding: '14px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1, width: '100%' }}
                                >
                                    {t('registration:i20Preview.payButton')}
                                </button>
                            </div>
                        </div>
                        {/* Fecha Corpo do Modal */}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
