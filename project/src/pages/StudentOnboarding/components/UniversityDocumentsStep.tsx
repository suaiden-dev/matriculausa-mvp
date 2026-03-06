import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, Award, Info, Home, FolderOpen, GraduationCap, Download, 
  ShieldCheck, ArrowRight, LayoutDashboard, Building, MapPin, 
  Star, Eye, CheckCircle2, Clock, Mail, Phone, Globe, ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { StepProps } from '../types';
import { useTranslation } from 'react-i18next';
import { useStudentLogs } from '../../../hooks/useStudentLogs';
import { useFeeConfig } from '../../../hooks/useFeeConfig';
import { ExpandableTabs } from '../../../components/ui/expandable-tabs';
import DocumentRequestsCard from '../../../components/DocumentRequestsCard';
import DocumentViewerModal from '../../../components/DocumentViewerModal';
// Removidos ícones de pagamento I-20

export const UniversityDocumentsStep: React.FC<StepProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { logAction } = useStudentLogs(userProfile?.id || '');
  const { formatFeeAmount, getFeeAmount } = useFeeConfig();
  
  const [loading, setLoading] = useState(true);
  const [applicationDetails, setApplicationDetails] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'welcome' | 'details' | 'documents' | 'acceptance'>('welcome');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  // Pagamento I-20 removido
  useEffect(() => {
    fetchApplicationDetails();
  }, [userProfile?.id]);

  const fetchApplicationDetails = async (isRefresh = false) => {
    if (!userProfile?.id) return;
    
    try {
      if (!isRefresh) setLoading(true);
      
      const selectedId = localStorage.getItem('selected_application_id');
      
      let query = supabase
        .from('scholarship_applications')
        .select(`*, user_profiles!student_id(*), scholarships(*, internal_fees, universities(*))`)
        .eq('student_id', userProfile.id);

      if (selectedId) {
        query = query.eq('id', selectedId);
      } else {
        // 1. Fallback para a aplicação ativa (a mais recente) se não houver seleção explícita
        query = query.order('created_at', { ascending: false }).limit(1);
      }

      const { data, error } = await query.single();

      if (error) throw error;

      if (data) {
        setApplicationDetails(data);


        
        // Buscar solicitações de documentos para verificar status real de conclusão
        const { data: reqs } = await supabase
          .from('document_requests')
          .select('id, title, status, document_request_uploads(status)')
          .eq('scholarship_application_id', data.id);
        
        if (reqs) {
          setDocumentRequests(reqs);
        }
      }

    } catch (err: any) {
      console.error('Error fetching university documents details:', err);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };



  const getRelativePath = (fullUrl: string, bucketName: string) => {
    const baseUrl = `https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/${bucketName}/`;
    if (fullUrl.startsWith(baseUrl)) {
      return fullUrl.replace(baseUrl, '');
    }
    return fullUrl;
  };

  const handleViewDocument = async (docUrl: string, bucketName = 'student-documents') => {
    if (!docUrl) return;
    
    try {
      if (docUrl.includes(`supabase.co/storage/v1/object/public/${bucketName}/`)) {
        const filePath = getRelativePath(docUrl, bucketName);
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 60 * 60);
        
        if (error) throw error;
        setPreviewUrl(data.signedUrl);
      } else {
        setPreviewUrl(docUrl);
      }
    } catch (err) {
      console.error('Error viewing document:', err);
      alert('Erro ao visualizar documento');
    }
  };

  const handleDownloadDocument = async (docUrl: string, fileName: string, bucketName = 'student-documents') => {
    if (!docUrl) return;
    
    try {
      let downloadUrl = docUrl;
      
      if (docUrl.includes(`supabase.co/storage/v1/object/public/${bucketName}/`)) {
        const filePath = getRelativePath(docUrl, bucketName);
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 60 * 60);
        
        if (error) throw error;
        downloadUrl = data.signedUrl;
      }
      
      const response = await fetch(downloadUrl);
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
      alert('Erro ao baixar documento');
    }
  };





  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-slate-800" />
          </div>
        </div>
        <p className="text-slate-600 font-medium mt-4">Carregando portal de gerenciamento...</p>
      </div>
    );
  }

  if (!applicationDetails) {
    return (
      <div className="max-w-4xl mx-auto p-12 bg-white/10 backdrop-blur-md rounded-[2.5rem] border border-white/20 text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-amber-500" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Nenhuma Aplicação Encontrada</h3>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          Você ainda não possui uma aplicação ativa. Por favor, volte ao passo anterior ou entre em contato com o suporte.
        </p>
        <button onClick={onBack} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all">
          Voltar
        </button>
      </div>
    );
  }

  const TABS = [
    { title: t('studentDashboard.applicationChatPage.tabs.welcome'), icon: Home },
    { title: t('studentDashboard.applicationChatPage.tabs.details'), icon: Info },
    { title: t('studentDashboard.applicationChatPage.tabs.documents'), icon: FolderOpen },
    { title: 'Carta de Aceite', icon: Award }
  ];

  const tabIds: ('welcome' | 'details' | 'documents' | 'acceptance')[] = ['welcome', 'details', 'documents', 'acceptance'];
  const activeTabIndex = tabIds.indexOf(activeTab as any);

  // 1. Verifica os documentos "core" (JSONB)
  const coreDocs = (applicationDetails?.documents || []) as any[];
  
  // 2. Verifica as solicitações dinâmicas
  const hasPendingRequests = documentRequests.some(req => {
    const uploads = req.document_request_uploads || [];
    const hasValidUpload = uploads.some((u: any) => u.status === 'approved' || u.status === 'under_review');
    return !hasValidUpload;
  });

  // O passo é considerado "Concluído" (para o estudante) se:
  // - Todas as solicitações dinâmicas tiverem pelo menos um envio em análise ou aprovado
  // (Ignora-se o status 'rejected' dos docs core aqui pois, se houver rejeição, 
  // haverá uma solicitação pendente no hasPendingRequests para o aluno agir)
  const allDocsDone = !hasPendingRequests;
  const allDocsApproved = !hasPendingRequests && 
                        coreDocs.every(d => d.status === 'approved') && 
                        (documentRequests.length === 0 || documentRequests.every(req => (req.document_request_uploads || []).some((u: any) => u.status === 'approved')));





  return (
    <div className="space-y-8 pb-24">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter leading-none">
            Minha <span className="text-blue-600">Aplicação</span>
          </h2>

        </div>

      </div>

      {/* Tabs Navigation */}
      <div className="flex justify-center">
        <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl">
          <ExpandableTabs 
            tabs={TABS as any} 
            defaultSelected={activeTabIndex >= 0 ? activeTabIndex : 0}
            onChange={(index: number | null) => {
              if (index !== null) setActiveTab(tabIds[index]);
            }}
          />
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="min-h-[500px]"
        >
          {activeTab === 'welcome' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Main Welcome Card */}
              <div className="md:col-span-12 space-y-6">
                <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden border border-slate-200">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                  
                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-8">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="hidden md:flex w-16 h-16 bg-blue-600 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/20">
                          <LayoutDashboard className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                            Parabéns {userProfile?.full_name || 'Estudante'},<br/> você foi <span className="text-emerald-600">aprovado</span> na <span className="text-blue-600">{applicationDetails?.scholarships?.universities?.name || 'Universidade'}</span>
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-14">
                        <p className="text-gray-600 leading-relaxed text-lg">
                          Falta muito pouco para tudo ficar pronto! Nesta etapa final você pode rever os detalhes da universidade que escolheu e enviar a documentação obrigatória. Assim que tudo estiver certo, sua Carta de Aceite estará liberada aqui mesmo para você baixar.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button 
                            onClick={() => setActiveTab('documents')}
                            className="flex items-center gap-4 p-5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all text-left group"
                          >
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                              <FolderOpen className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Enviar Documentos</p>
                              <p className="text-xs text-gray-500 font-medium">Documentos solicitados</p>
                            </div>
                          </button>

                          <button 
                            onClick={() => setActiveTab('details')}
                            className="flex items-center gap-4 p-5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all text-left group"
                          >
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Info className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Detalhes da Bolsa</p>
                              <p className="text-xs text-gray-500 font-medium">Requisitos e valores</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col justify-center">
                      <div className="bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] p-8 py-12 text-white flex flex-col justify-center">
                        <h4 className="text-xs font-black uppercase tracking-widest text-white-400 mb-4">Precisa de Ajuda?</h4>
                        <p className="text-sm text-white-400 mb-6">Nossos mentores estão prontos para ajudar com qualquer dúvida sobre este processo.</p>
                        <button 
                          onClick={() => navigate('/student/dashboard/chat')}
                          className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                          Falar com Suporte
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline simplified */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-2xl shadow-blue-900/5">
                   <h4 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                     Próximas Etapas
                   </h4>
                   <div className="space-y-4">
                     {[
                       { 
                         title: 'Envio de Documentos', 
                         status: allDocsApproved ? 'Concluído' : (allDocsDone ? 'Em Análise' : 'Ação Necessária'), 
                         variant: allDocsApproved ? 'success' : (allDocsDone ? 'success' : 'warning'),
                         tab: 'documents' 
                       },
                       { 
                         title: 'Recebimento da Carta de Aceite', 
                         status: applicationDetails.acceptance_letter_url ? 'Disponível' : 'Liberação em Andamento', 
                         variant: applicationDetails.acceptance_letter_url ? 'success' : 'warning',
                         tab: 'acceptance' 
                       }
                     ].map((step, i) => {
                       const isClickable = true;
                       const isLetterAvailable = step.tab === 'acceptance' && applicationDetails.acceptance_letter_url;
                       
                       const variantStyles = {
                         success: {
                           container: 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50',
                           iconBg: 'bg-emerald-100 text-emerald-600',
                           status: 'text-emerald-600',
                           indicator: 'bg-emerald-500'
                         },
                         warning: {
                           container: 'bg-amber-50/50 border-amber-200 hover:border-amber-300 hover:bg-amber-50',
                           iconBg: 'bg-amber-100 text-amber-600',
                           status: 'text-amber-600',
                           indicator: 'bg-amber-500'
                         },
                         error: {
                           container: 'bg-red-50/50 border-red-200 hover:border-red-300 hover:bg-red-50',
                           iconBg: 'bg-red-100 text-red-600',
                           status: 'text-red-600',
                           indicator: 'bg-red-500'
                         },
                         highlighted: {
                            container: 'bg-gradient-to-br from-emerald-50/60 to-teal-50/60 backdrop-blur-xl border border-emerald-400/40 shadow-[0_10px_40px_rgba(16,185,129,0.15)] hover:shadow-emerald-500/30 hover:border-emerald-500 transform hover:scale-[1.02] transition-all duration-500 relative overflow-hidden group ring-2 ring-white/50',
                            iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-emerald-400/30',
                            status: 'text-emerald-700 font-black tracking-tight',
                            indicator: 'bg-emerald-600 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                         },
                         default: {
                           container: 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-white',
                           iconBg: 'bg-slate-100 text-slate-400',
                           status: 'text-slate-400',
                           indicator: 'bg-slate-300'
                         }
                       };

                       const styles = isLetterAvailable 
                        ? variantStyles.highlighted 
                        : (variantStyles[step.variant as keyof typeof variantStyles] || variantStyles.default);
                       
                       return (
                         <div 
                           key={i} 
                           onClick={() => isClickable && setActiveTab(step.tab as any)}
                           className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all cursor-pointer hover:shadow-lg gap-3 ${styles.container}`}
                         >
                            {/* Emerald Shine effect */}
                            {isLetterAvailable && (
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
                            )}

                           <div className="flex items-center gap-3 relative z-10">
                             <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${styles.iconBg} ${isLetterAvailable ? 'group-hover:scale-110' : ''}`}>
                               {isLetterAvailable ? <Award className="w-5 h-5 text-white animate-bounce-slow" /> : <span className="text-xs font-bold">{i + 1}</span>}
                             </div>
                             <div className="flex flex-col">
                               <span className={`text-sm font-bold uppercase tracking-tight ${isLetterAvailable ? 'text-emerald-950' : 'text-gray-900'}`}>{step.title}</span>
                               {isLetterAvailable && (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                                    <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-widest">Documento Disponível</span>
                                  </div>
                               )}
                             </div>
                           </div>
                           <div className="flex items-center gap-2 relative z-10 sm:ml-0 ml-[52px]">
                              <div className={`w-2 h-2 rounded-full ${styles.indicator}`} />
                              <span className={`text-[10px] font-black uppercase tracking-widest ${styles.status}`}>{step.status}</span>
                              {isLetterAvailable && <ArrowRight className="w-4 h-4 text-emerald-600 ml-2 group-hover:translate-x-1 transition-transform" />}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                </div>
              </div>




          </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-8 pb-12">
              {/* University Hero Card */}
              <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden group">
                <div className="bg-gradient-to-r from-[#05294E] to-[#08427e] p-8 md:p-12 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <Building className="w-96 h-96 -right-24 -bottom-24 absolute rotate-12" />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center p-2 transform group-hover:scale-105 transition-transform duration-500">
                      {applicationDetails.scholarships?.image_url || applicationDetails.scholarships?.universities?.logo_url ? (
                        <img 
                          src={applicationDetails.scholarships.image_url || applicationDetails.scholarships.universities.logo_url} 
                          alt={applicationDetails.scholarships.universities?.name || ''}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <Building className="w-20 h-20 text-[#05294E]" />
                      )}
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-4">
                      <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/20">University Partner</span>
                        {applicationDetails.scholarships?.delivery_mode && (
                           <span className="px-3 py-1 bg-emerald-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/30">
                             {applicationDetails.scholarships.delivery_mode === 'in_person' ? 'Presencial' : 'Online'}
                           </span>
                        )}
                        {applicationDetails.scholarships?.is_exclusive && (
                          <span className="px-3 py-1 bg-amber-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-amber-400 uppercase tracking-widest border border-amber-500/30 flex items-center gap-1">
                            <Star className="w-3 h-3" /> Exclusiva
                          </span>
                        )}
                      </div>
                      <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
                        {applicationDetails.scholarships?.universities?.name || 'Universidade Candidatada'}
                      </h2>
                      <div className="flex flex-wrap justify-center md:justify-start items-center gap-6 text-white/70">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-400" />
                            <span className="font-bold uppercase tracking-widest text-xs">
                              {applicationDetails.scholarships?.universities?.address?.city || applicationDetails.scholarships?.universities?.location || 'Cidade não informada'}, {applicationDetails.scholarships?.universities?.address?.country || 'USA'}
                            </span>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 md:p-12">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                     {/* Left: Program Info */}
                     <div className="lg:col-span-2 space-y-12">
                        {/* Meta Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: 'Nível', val: applicationDetails.scholarships?.level || 'N/A' },
                            { label: 'Modalidade', val: applicationDetails.scholarships?.delivery_mode === 'in_person' ? 'Presencial' : 'Online' },
                            { label: 'Prazo', val: applicationDetails.scholarships?.deadline ? new Date(applicationDetails.scholarships.deadline).toLocaleDateString() : 'N/A' }
                          ].map((item, i) => (
                            <div key={i} className={`bg-white p-4 rounded-[2rem] border border-slate-300 shadow-sm ${i === 2 ? 'col-span-2 md:col-span-1' : ''}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{item.label}</span>
                              </div>
                              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.val}</p>
                            </div>
                          ))}
                        </div>

                        <div className="border border-slate-300 rounded-[2rem] p-8 space-y-12 bg-white shadow-sm relative overflow-hidden">
                          <section className="space-y-6">
                            <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight border-b border-slate-200 pb-4">
                              Detalhes da Bolsa
                            </h4>
                           <div className="bg-slate-50 p-6 rounded-2xl mb-4">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Título da Bolsa</p>
                              <p className="text-xl font-black text-slate-900 uppercase leading-tight">{applicationDetails.scholarships?.title || applicationDetails.scholarships?.name || 'N/A'}</p>
                           </div>

                           {applicationDetails.scholarships?.course && (
                             <div className="bg-blue-50 p-6 rounded-2xl mb-4">
                               <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Curso / Área de Estudo</p>
                               <p className="text-xl font-black text-blue-900 uppercase leading-tight">{applicationDetails.scholarships.course}</p>
                             </div>
                           )}
                           
                           {applicationDetails.scholarships?.description && (
                             <div className="bg-slate-50 p-6 rounded-2xl mb-4">
                               <div className="mb-2">
                                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                   {t('studentDashboard.applicationChatPage.details.scholarshipDetails.description')}
                                 </span>
                               </div>
                               <div className="text-sm font-medium text-gray-700 leading-relaxed">
                                 {applicationDetails.scholarships.description}
                               </div>
                             </div>
                           )}

                           {/* Application Fee (Enrollment Fee) */}
                           {applicationDetails.scholarships?.application_fee_amount && (
                             <div className="bg-slate-50 p-6 rounded-2xl mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
                               <div className="flex items-start gap-3">
                                 <div>
                                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Taxa de Matrícula</p>
                                   <p className="text-xs font-semibold text-gray-900">
                                     {Number(applicationDetails.scholarships.application_fee_amount) !== 350
                                       ? t('scholarshipsPage.scholarshipCard.customFee') 
                                       : t('scholarshipsPage.scholarshipCard.standardFee')}
                                   </p>
                                 </div>
                               </div>
                               <div className="text-xl font-black text-gray-900 bg-white px-4 py-2 rounded-xl shadow-sm whitespace-nowrap">
                                 {formatFeeAmount(
                                   getFeeAmount('application_fee', applicationDetails.scholarships.application_fee_amount)
                                 )}
                               </div>
                             </div>
                           )}
                        </section>



                        {/* Internal Fees */}
                        {applicationDetails.scholarships?.internal_fees && Array.isArray(applicationDetails.scholarships.internal_fees) && applicationDetails.scholarships.internal_fees.length > 0 && (
                          <section className="space-y-6">
                            <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                              Taxas Internas da Instituição
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {applicationDetails.scholarships.internal_fees.map((fee: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-6 bg-white rounded-2xl border border-slate-200 shadow-sm group hover:border-blue-200 transition-colors">
                                   <div className="min-w-0 mr-4">
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{fee.frequency || fee.details || 'Pagamento Único'}</p>
                                     <p className="text-sm font-black text-gray-900 uppercase truncate" title={fee.category || fee.name}>{fee.category || fee.name}</p>
                                   </div>
                                   <span className="text-xl font-black text-gray-900 whitespace-nowrap">${Number(fee.amount).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-3">
                              <Info className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs font-medium text-sky-700 leading-relaxed">
                                Estas taxas são informadas pela universidade e pagas diretamente a eles. Elas não fazem parte do serviço de mentoria da Matricula USA.
                              </p>
                            </div>
                          </section>
                        )}
                        </div>

                        {/* Documents Progress Summary */}
                        <div className="border border-slate-300 rounded-[2rem] p-8 space-y-12 bg-white shadow-sm relative overflow-hidden">
                        <section className="space-y-6">
                            <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight border-b border-slate-200 pb-4">
                              Documentos do Estudante
                            </h4>
                           <div className="flex flex-col gap-4">
                              {[
                                { key: 'diploma', label: 'Diploma / Certificado (High School)' },
                                { key: 'passport', label: 'Passaporte (Cópia Colorida)' },
                                { key: 'funds_proof', label: 'Extrato Bancário (Financial Statement)' }
                              ].map((doc) => {
                                const docData = (applicationDetails.documents || []).find((d: any) => d.type === doc.key) || 
                                                (applicationDetails.user_profiles?.documents || []).find((d: any) => d.type === doc.key);
                                const status = docData?.status || 'not_submitted';
                                const fileUrl = docData?.file_url || docData?.url;
                                
                                return (
                                  <div key={doc.key} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                        status === 'approved' ? 'text-slate-900' :
                                        status === 'under_review' ? 'text-blue-600' :
                                        status === 'changes_requested' ? 'text-amber-600' :
                                        'text-slate-400'
                                      }`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{doc.label}</span>
                                        {docData?.uploaded_at && (
                                          <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                                            Enviado em: {new Date(docData.uploaded_at).toLocaleDateString('pt-BR')}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {fileUrl && (
                                        <div className="flex items-center gap-1 border-r border-slate-100 pr-3 mr-1">
                                          <button 
                                            onClick={() => handleViewDocument(fileUrl)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Visualizar"
                                          >
                                            <Eye className="w-6 h-6" />
                                          </button>
                                          <button 
                                            onClick={() => handleDownloadDocument(fileUrl, doc.label)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Baixar"
                                          >
                                            <Download className="w-6 h-6" />
                                          </button>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1">
                                        {status === 'approved' ? (
                                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                        ) : status === 'under_review' ? (
                                          <Clock className="w-6 h-6 text-blue-500" />
                                        ) : status === 'changes_requested' ? (
                                          <AlertCircle className="w-6 h-6 text-amber-500" />
                                        ) : (
                                          <div className="w-2 h-2 rounded-full bg-slate-200" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                           </div>
                        </section>
                        </div>
                     </div>

                     {/* Right: Financial & Sidebar */}
                     <div className="space-y-8">
                       {/* Financial Summary Table */}
                        <div className="bg-white rounded-[2rem] p-8 text-slate-900 border border-slate-300 shadow-sm relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full -mr-16 -mt-16 blur-xl" />
                           <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6 pb-2 border-b border-slate-100 flex items-center justify-between">
                             Resumo Financeiro
                           </h4>
                           <div className="space-y-6">
                             <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                                <div>
                                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Custo Anual Original</p>
                                  <p className="text-xl font-black text-slate-900 line-through tracking-tighter">${(applicationDetails.scholarships?.original_annual_value || 0).toLocaleString()}</p>
                                </div>
                             </div>
                             
                             <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Com Bolsa Exclusiva</p>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-emerald-600 tracking-tighter">${(applicationDetails.scholarships?.annual_value_with_scholarship || 0).toLocaleString()}</span>
                                     <span className="text-sm text-emerald-600 font-bold uppercase">/ano</span>
                                  </div>
                                </div>
                                {applicationDetails.scholarships?.original_value_per_credit && (
                                   <div className="text-right">
                                     <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Por Crédito</p>
                                     <p className="text-xs font-bold text-slate-900">${applicationDetails.scholarships.original_value_per_credit}</p>
                                   </div>
                                )}
                             </div>
                             
                             <div>
                               <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Economia Anual Garantida</p>
                               <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                                 + $ {((applicationDetails.scholarships?.original_annual_value || 0) - (applicationDetails.scholarships?.annual_value_with_scholarship || 0)).toLocaleString()}
                               </p>
                             </div>
                           </div>
                        </div>

                       {/* Contact & Support */}
                       <div className="space-y-4">
                         <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-300">
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 border-b border-slate-300 pb-2">Instituição</h4>
                            <div className="space-y-4">
                               {applicationDetails.scholarships?.universities?.contact?.email && (
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                                      <Mail className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                                      <p className="text-sm font-bold text-slate-900 truncate" title={applicationDetails.scholarships.universities.contact.email}>
                                        {applicationDetails.scholarships.universities.contact.email}
                                      </p>
                                    </div>
                                 </div>
                               )}
                               {applicationDetails.scholarships?.universities?.contact?.phone && (
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                                      <Phone className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Telefone</p>
                                      <p className="text-sm font-bold text-slate-900">{applicationDetails.scholarships.universities.contact.phone}</p>
                                    </div>
                                 </div>
                               )}
                               {applicationDetails.scholarships?.universities?.website && (
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                                      <Globe className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Website</p>
                                      <a href={applicationDetails.scholarships.universities.website} target="_blank" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1 truncate">
                                        {applicationDetails.scholarships.universities.website.replace('https://', '')}
                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                      </a>
                                    </div>
                                 </div>
                               )}

                            </div>
                         </div>


                       </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* Bloco da aba I-20 removido */}

          {activeTab === 'documents' && (
            <div className="space-y-8">
              {/* Main Documents Component with Header integrated */}
              <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-300 overflow-hidden">
                 {/* Header moved here */}
                 <div className="p-8 md:p-12 relative overflow-hidden border-b border-slate-200">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                      <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                        <FolderOpen className="w-10 h-10 text-white" />
                      </div>
                      <div className="flex-1 text-center md:text-left space-y-2">
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Envio de <span className="text-blue-600">Documentos</span></h3>
                        <p className="text-gray-600 font-medium">Envie os documentos solicitados pela universidade para análise e aprovação final.</p>
                      </div>
                    </div>
                 </div>

                <DocumentRequestsCard 
                  applicationId={applicationDetails.id} 
                  isSchool={false} 
                  currentUserId={user?.id || ''} 
                  studentType={applicationDetails.student_process_type || 'initial'}
                  showAcceptanceLetter={false}
                  onDocumentUploaded={async (requestId: string, fileName: string, isResubmission: boolean) => {
                    try {
                      if (logAction && user?.id) {
                        await logAction(
                          isResubmission ? 'document_resubmitted' : 'document_uploaded',
                          `Document "${fileName}" ${isResubmission ? 'resubmitted' : 'uploaded'} for document request`,
                          user.id,
                          'student',
                          {
                            request_id: requestId,
                            file_name: fileName,
                            is_resubmission: isResubmission,
                            application_id: applicationDetails.id
                          }
                        );
                      }
                      await fetchApplicationDetails(true);
                    } catch (e) {
                      console.error('Failed to log document upload action:', e);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'acceptance' && (
            <div className="space-y-8 pb-12">
              <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-80 h-80 bg-slate-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
                
                {/* Header Card */}
                <div className="bg-slate-50 px-8 py-10 md:p-12 border-b border-slate-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-500/20 transition-transform">
                        <Award className="w-10 h-10 text-white" />
                      </div>
                      <div className="text-center md:text-left">
                        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">Carta de <span className="text-blue-600">Aceite</span></h2>
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm transition-all duration-500 ${
                      applicationDetails.acceptance_letter_url 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                      {applicationDetails.acceptance_letter_url ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Disponível
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4" />
                          Liberação em Andamento
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content Info */}
                <div className="p-8 md:p-16 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                        Sua Confirmação de Sucesso
                      </h4>
                      <p className="text-gray-600 leading-relaxed font-medium">
                        A Carta de Aceite é o documento oficial emitido pela universidade que confirma sua admissão. Ela contém detalhes importantes sobre seu curso e é fundamental para o processo de visto.
                      </p>
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl flex items-start gap-4">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <ShieldCheck className="w-5 h-5 text-slate-400" />
                         </div>
                         <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-wider">
                           Este documento é emitido oficialmente pela universidade após a análise da sua documentação.
                         </p>
                      </div>
                    </div>

                    <div className="space-y-8">
                       {/* Status indicator block */}
                       {applicationDetails.acceptance_letter_url && (
                         <div className="bg-emerald-50 border-2 border-emerald-200 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in duration-500">
                           <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-200 rounded-2xl flex items-center justify-center animate-bounce-slow">
                             <Award className="w-8 h-8 text-emerald-600" />
                           </div>
                           <div className="text-center space-y-2">
                             <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Documento Disponível</span>
                             <p className="text-sm text-emerald-800 font-bold">Sua carta de aceite já pode ser baixada!</p>
                           </div>
                           <button 
                             onClick={() => handleDownloadDocument(applicationDetails.acceptance_letter_url, 'acceptance_letter', 'document-attachments')}
                             className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg flex items-center justify-center gap-2 group"
                           >
                             <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                             Baixar PDF
                           </button>
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


      {/* Legacy/Modals support */}







      {/* Global CSS for animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}} />

      {previewUrl && (
        <DocumentViewerModal documentUrl={previewUrl || ''} onClose={() => setPreviewUrl(null)} />
      )}
    </div>
  );
};

