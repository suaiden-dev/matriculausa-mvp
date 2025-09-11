import { useState, useEffect, useRef } from 'react';
import { PaymentRecord } from '../types/payment';
import { supabase } from '../lib/supabase';

export const useZellePayments = () => {
  const [zellePayments, setZellePayments] = useState<PaymentRecord[]>([]);
  const [loadingZellePayments, setLoadingZellePayments] = useState(false);
  const [selectedZellePayment, setSelectedZellePayment] = useState<PaymentRecord | null>(null);
  const [zelleViewMode, setZelleViewMode] = useState<'grid' | 'list'>('list');

  // Estados para modais de Zelle
  const [showZelleNotesModal, setShowZelleNotesModal] = useState(false);
  const [showZelleReviewModal, setShowZelleReviewModal] = useState(false);
  const [zelleAdminNotes, setZelleAdminNotes] = useState('');
  const [zelleActionLoading, setZelleActionLoading] = useState(false);
  const [zelleRejectReason, setZelleRejectReason] = useState('');

  // Estados para modal de comprovante Zelle
  const [showZelleProofModal, setShowZelleProofModal] = useState(false);
  const [selectedZelleProofUrl, setSelectedZelleProofUrl] = useState<string>('');
  const [selectedZelleProofFileName, setSelectedZelleProofFileName] = useState<string>('');

  const hasLoadedZellePayments = useRef(false);

  const loadZellePayments = async () => {
    try {
      setLoadingZellePayments(true);
      console.log('🔍 Loading Zelle payments...');

      // Buscar pagamentos Zelle sem join, filtrando apenas registros com valores > 0
      const { data: zellePaymentsData, error: zelleError } = await supabase
        .from('zelle_payments')
        .select('*')
        .gt('amount', 0)
        .order('created_at', { ascending: false });

      if (zelleError) {
        console.error('Error in zelle payments query:', zelleError);
        throw zelleError;
      }

      console.log('📊 Zelle payments data:', zellePaymentsData);

      // Converter pagamentos Zelle em registros de pagamento
      const zellePaymentRecords: PaymentRecord[] = [];
      
      if (zellePaymentsData && zellePaymentsData.length > 0) {
        // Buscar dados dos usuários em uma única consulta
        const userIds = zellePaymentsData.map(p => p.user_id).filter(Boolean);
        const studentProfileIds = zellePaymentsData.map(p => p.student_profile_id).filter(Boolean);
        const allUserIds = [...new Set([...userIds, ...studentProfileIds])];

        console.log('🔍 User IDs to fetch:', allUserIds);

        let userProfiles: any[] = [];
        if (allUserIds.length > 0) {
          // Buscar por user_id (que corresponde ao auth.users.id) e também por id (que é o user_profiles.id)
          // Incluir também informações da universidade
          const { data: profilesData, error: profilesError } = await supabase
            .from('user_profiles')
            .select('id, user_id, full_name, email, university_id')
            .in('user_id', allUserIds);

          if (profilesError) {
            console.error('Error loading user profiles:', profilesError);
          } else {
            userProfiles = profilesData || [];
            console.log('👥 User profiles loaded:', userProfiles);
          }
        }

        // Processar cada pagamento Zelle
        zellePaymentsData.forEach((zellePayment: any) => {          
          // Buscar o perfil do usuário pelo user_id (auth.users.id)
          const student = userProfiles.find(p => p.user_id === zellePayment.user_id);
          
          // Determinar o nome do estudante (usar email se full_name for igual ao email ou estiver vazio)
          const studentName = student?.full_name && student.full_name !== student?.email 
            ? student.full_name 
            : student?.email || 'Unknown User';
         
          const paymentRecord: PaymentRecord = {
            id: zellePayment.id,
            student_id: student?.id || zellePayment.student_profile_id || '',
            user_id: zellePayment.user_id, // Campo necessário para a função approveZellePayment
            student_name: studentName,
            student_email: student?.email || 'Email not available',
            university_id: student?.university_id || '',
            university_name: 'N/A', // TODO: Implementar busca de universidade separadamente
            fee_type: zellePayment.fee_type || 'selection_process',
            fee_type_global: zellePayment.fee_type_global, // Campo necessário para a função approveZellePayment
            amount: parseFloat(zellePayment.amount) || 0,
            status: 'pending',
            payment_date: zellePayment.created_at,
            created_at: zellePayment.created_at,
            payment_method: 'zelle',
            payment_proof_url: zellePayment.screenshot_url,
            admin_notes: zellePayment.admin_notes,
            zelle_status: zellePayment.status,
            reviewed_by: zellePayment.admin_approved_by,
            reviewed_at: zellePayment.admin_approved_at
          };

          zellePaymentRecords.push(paymentRecord);
        });
      }

      setZellePayments(zellePaymentRecords);
      console.log('✅ Zelle payments loaded:', zellePaymentRecords.length);
    } catch (error) {
      console.error('❌ Error loading Zelle payments:', error);
    } finally {
      setLoadingZellePayments(false);
    }
  };

  const addZelleAdminNotes = async (paymentId: string, userId: string) => {
    try {
      setZelleActionLoading(true);
      
      const payment = zellePayments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment not found');

      // Atualizar as notas do admin na tabela zelle_payments
      const { error } = await supabase
        .from('zelle_payments')
        .update({
          admin_notes: zelleAdminNotes,
          admin_approved_by: userId,
          admin_approved_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      // Recarregar pagamentos Zelle
      await loadZellePayments();
      setShowZelleNotesModal(false);
      setZelleAdminNotes('');
      
      console.log('📝 Zelle payment notes added successfully');
    } catch (error: any) {
      console.error('Error adding Zelle payment notes:', error);
    } finally {
      setZelleActionLoading(false);
    }
  };

  const openZelleReviewModal = (paymentId: string) => {
    const payment = zellePayments.find(p => p.id === paymentId);
    setSelectedZellePayment(payment || null);
    setShowZelleReviewModal(true);
  };

  const openZelleNotesModal = (paymentId: string) => {
    const payment = zellePayments.find(p => p.id === paymentId);
    if (payment) {
      setSelectedZellePayment(payment);
      setZelleAdminNotes(payment.admin_notes || '');
      setShowZelleNotesModal(true);
    }
  };

  const openZelleProofModal = (paymentId: string) => {
    const payment = zellePayments.find(p => p.id === paymentId);
    if (payment && payment.payment_proof_url) {
      // Se payment_proof_url já é uma URL completa, usar diretamente
      // Se é um caminho relativo, construir URL completa
      let fullUrl = payment.payment_proof_url;
      if (!payment.payment_proof_url.startsWith('http')) {
        fullUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/zelle_comprovantes/${payment.payment_proof_url}`;
      }
      setSelectedZelleProofUrl(fullUrl);
      setSelectedZelleProofFileName(`Zelle Payment Proof - ${payment.student_name}`);
      setShowZelleProofModal(true);
    }
  };

  const handleZelleReviewSuccess = () => {
    // Recarregar os pagamentos Zelle após aprovação/rejeição
    loadZellePayments();
    setShowZelleReviewModal(false);
    setSelectedZellePayment(null);
  };

  // Força recarregamento
  const forceRefresh = () => {
    hasLoadedZellePayments.current = false;
    loadZellePayments();
    hasLoadedZellePayments.current = true;
  };

  useEffect(() => {
    if (!hasLoadedZellePayments.current) {
      loadZellePayments();
      hasLoadedZellePayments.current = true;
    }
  }, []);

  return {
    // Estados
    zellePayments,
    loadingZellePayments,
    selectedZellePayment,
    setSelectedZellePayment,
    zelleViewMode,
    setZelleViewMode,

    // Estados de modais
    showZelleNotesModal,
    setShowZelleNotesModal,
    showZelleReviewModal,
    setShowZelleReviewModal,
    zelleAdminNotes,
    setZelleAdminNotes,
    zelleActionLoading,
    zelleRejectReason,
    setZelleRejectReason,
    showZelleProofModal,
    setShowZelleProofModal,
    selectedZelleProofUrl,
    selectedZelleProofFileName,

    // Funções
    loadZellePayments,
    addZelleAdminNotes,
    openZelleReviewModal,
    openZelleNotesModal,
    openZelleProofModal,
    handleZelleReviewSuccess,
    forceRefresh,
  };
};
