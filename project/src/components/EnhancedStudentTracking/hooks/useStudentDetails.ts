import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { filenameFromUrl } from '../../../lib/urlUtils';
import { useAuth } from '../../../hooks/useAuth';
import { StudentInfo, ScholarshipApplication, FeePayment } from '../types';

export const useStudentDetails = () => {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<StudentInfo | null>(null);
  const [feeHistory, setFeeHistory] = useState<FeePayment[]>([]);
  const [scholarshipApplication, setScholarshipApplication] = useState<ScholarshipApplication | null>(null);
  const [studentDocuments, setStudentDocuments] = useState<any[]>([]);
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [i20ControlFeeDeadline, setI20ControlFeeDeadline] = useState<Date | null>(null);
  const [allApplications, setAllApplications] = useState<any[]>([]);


  // Usar o contexto de autenticação
  const { user, supabaseUser, isAuthenticated } = useAuth();

  // Carregar detalhes de um estudante específico
  const loadStudentDetails = useCallback(async (studentId: string, profile_id: string) => {
    try {
      
      setLoadingStudentDetails(true);
      setSelectedStudent(studentId);

      // Verificar se o usuário está autenticado
      if (!isAuthenticated || !supabaseUser) {
        setError('User not authenticated');
        return;
      }

      // Primeiro, tentar usar as funções SQL criadas para obter detalhes do estudante
      let studentData = null;
      let studentError = null;
      
      try {
        const { data: sqlData, error: sqlError } = await supabase.rpc(
          'get_student_detailed_info',
          { target_student_id: studentId }
        );

        if (!sqlError && sqlData && sqlData.length > 0) {
          studentData = sqlData[0];
          
          // ✅ CORREÇÃO: Calcular taxas com overrides e system_type
          const dependents = studentData.dependents || 0;
          const systemType = studentData.system_type || 'legacy';

          // Buscar overrides do usuário
          const { data: feeOverrides } = await supabase.rpc('get_user_fee_overrides', { 
            target_user_id: studentData.student_id 
          });

          // Selection Process Fee (com dependentes se não houver override)
          let selectionProcessFeeAmount = 0;
          if (feeOverrides?.selection_process_fee) {
            selectionProcessFeeAmount = feeOverrides.selection_process_fee;
          } else {
            const baseFee = systemType === 'simplified' ? 350 : 400;
            // ✅ CORREÇÃO: Para simplified, Selection Process Fee é fixo ($350), sem dependentes
            // Dependentes só afetam Application Fee ($100 por dependente)
            selectionProcessFeeAmount = systemType === 'simplified' ? baseFee : baseFee + (dependents * 150);
          }

          // I-20 Control Fee (sem dependentes, com override)
          let i20ControlFeeAmount = 0;
          if (feeOverrides?.i20_control_fee) {
            i20ControlFeeAmount = feeOverrides.i20_control_fee;
          } else {
            i20ControlFeeAmount = 900;
          }

          // Scholarship Fee (com override)
          let scholarshipFeeAmount = 0;
          if (feeOverrides?.scholarship_fee) {
            scholarshipFeeAmount = feeOverrides.scholarship_fee;
          } else {
            scholarshipFeeAmount = systemType === 'simplified' ? 550 : 900;
          }

          // Calcular total paid
          let calculatedTotalPaid = 0;
          if (studentData.has_paid_selection_process_fee) {
            calculatedTotalPaid += selectionProcessFeeAmount;
          }
          if (studentData.has_paid_i20_control_fee) {
            calculatedTotalPaid += i20ControlFeeAmount;
          }
          if (studentData.is_scholarship_fee_paid) {
            calculatedTotalPaid += scholarshipFeeAmount;
          }
          
          // Adicionar campos calculados
          studentData.dependents = dependents;
          studentData.selection_process_fee_amount = selectionProcessFeeAmount;
          studentData.i20_control_fee_amount = i20ControlFeeAmount;
          studentData.scholarship_fee_amount = scholarshipFeeAmount;
          studentData.total_fees_paid = calculatedTotalPaid;
          
          // ✅ CORREÇÃO: Adicionar campos da acceptance letter da função SQL
          studentData.acceptance_letter_status = studentData.acceptance_letter_status || 'pending';
          studentData.acceptance_letter_url = studentData.acceptance_letter_url || null;
          studentData.acceptance_letter_sent_at = studentData.acceptance_letter_sent_at || null;
          
          // Debug: Verificar dados da acceptance letter
          console.log('🔍 [ACCEPTANCE_LETTER_DEBUG] studentData from SQL:', {
            acceptance_letter_status: studentData.acceptance_letter_status,
            acceptance_letter_url: studentData.acceptance_letter_url,
            acceptance_letter_sent_at: studentData.acceptance_letter_sent_at,
            application_status: studentData.application_status
          });
          
          // Adicionar dados do scholarship se disponíveis
          if (studentData.application_fee_amount || studentData.scholarship_fee_amount) {
            studentData.scholarship = {
              application_fee_amount: studentData.application_fee_amount,
              scholarship_fee_amount: studentData.scholarship_fee_amount
            };
          }
          
        } else {
          studentError = sqlError;
        }
      } catch (sqlException) {
        studentError = sqlException;
      }

      // Se a função SQL falhou ou retornou dados vazios, usar fallback robusto
      if (!studentData) {
        // Buscar dados básicos do estudante (usando profile_id ao invés de user_id)
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', profile_id)
          .single();

        if (profileError) {
          setError('Failed to load student profile');
          return;
        }

        // ✅ CORREÇÃO: Buscar TODAS as aplicações para verificar se QUALQUER uma foi paga
        const { data: allApplications, error: applicationError } = await supabase
          .from('scholarship_applications')
          .select(`
            *,
            transfer_form_url,
            transfer_form_status,
            transfer_form_sent_at,
            scholarships (
              id,
              title,
              field_of_study,
              annual_value_with_scholarship,
              application_fee_amount,
              scholarship_fee_amount,
              placement_fee_amount,
              universities (
                id,
                name
              )
            )
          `)
          .eq('student_id', profile_id)
          .order('created_at', { ascending: false });

        // ✅ CORREÇÃO: Verificar se QUALQUER aplicação foi paga
        const hasAnyScholarshipPaid = allApplications?.some((app: any) => app.is_scholarship_fee_paid) || false;
        const hasAnyApplicationPaid = allApplications?.some((app: any) => app.is_application_fee_paid) || false;
        
        // Usar a aplicação mais recente para dados de exibição
        const applicationData = allApplications?.[0] || null;

        // ✅ NOVO: Armazenar todas as aplicações para exibição (fallback)
        setAllApplications(allApplications || []);

        let sellerData = null;
        if (profileData.seller_referral_code) {
          const { data: sellerResult } = await supabase
            .from('sellers')
            .select('name')
            .eq('referral_code', profileData.seller_referral_code)
            .single();
          
          if (sellerResult) {
            sellerData = sellerResult;
          }
        }

        // Buscar histórico de taxas (usando user_id do profileData)
        const { data: feesData, error: feesError } = await supabase
          .from('stripe_connect_transfers')
          .select('*')
          .eq('user_id', profileData.user_id)
          .eq('status', 'succeeded');

        // Extrair documentos da aplicação principal
        let documentsData: any = applicationData?.documents;

        // ✅ CORREÇÃO: Calcular taxas com overrides e system_type no fallback
        const dependents = profileData.dependents || 0;
        const systemType = profileData.system_type || 'legacy';

        // Buscar overrides do usuário
        const { data: feeOverrides } = await supabase.rpc('get_user_fee_overrides', { 
          target_user_id: profileData.user_id 
        });

        // Selection Process Fee (com dependentes se não houver override)
        let selectionProcessFeeAmount = 0;
        if (feeOverrides?.selection_process_fee) {
          selectionProcessFeeAmount = feeOverrides.selection_process_fee;
        } else {
          const baseFee = systemType === 'simplified' ? 350 : 400;
          // ✅ CORREÇÃO: Para simplified, Selection Process Fee é fixo ($350), sem dependentes
          // Dependentes só afetam Application Fee ($100 por dependente)
          selectionProcessFeeAmount = systemType === 'simplified' ? baseFee : baseFee + (dependents * 150);
        }

        // I-20 Control Fee (sem dependentes, com override)
        let i20ControlFeeAmount = 0;
        if (feeOverrides?.i20_control_fee) {
          i20ControlFeeAmount = feeOverrides.i20_control_fee;
        } else {
          i20ControlFeeAmount = 900;
        }

        // Scholarship Fee (com override)
        let scholarshipFeeAmount = 0;
        if (feeOverrides?.scholarship_fee) {
          scholarshipFeeAmount = feeOverrides.scholarship_fee;
        } else {
          scholarshipFeeAmount = systemType === 'simplified' ? 550 : 900;
        }
        
        // Calcular total paid
        let calculatedTotalPaid = 0;
        if (profileData.has_paid_selection_process_fee) {
          calculatedTotalPaid += selectionProcessFeeAmount;
        }
        if (profileData.has_paid_i20_control_fee) {
          calculatedTotalPaid += i20ControlFeeAmount;
        }
        if (profileData.is_scholarship_fee_paid) {
          calculatedTotalPaid += scholarshipFeeAmount;
        }

        // Construir objeto de dados do estudante
        studentData = {
          student_id: profileData.user_id,
          full_name: profileData.full_name || 'Name not available',
          email: profileData.email || 'Email not available',
          phone: profileData.phone || 'Phone not available',
          country: profileData.country || 'Country not available',
          field_of_interest: profileData.field_of_interest || 'Field not specified',
          academic_level: profileData.academic_level || 'Level not specified',
          gpa: profileData.gpa || 0,
          english_proficiency: profileData.english_proficiency || 'Not specified',
          registration_date: profileData.created_at || new Date().toISOString(),
          current_status: profileData.status || 'active',
          seller_referral_code: profileData.seller_referral_code || '',
          seller_name: sellerData?.name || 'Seller not available',
          total_fees_paid: calculatedTotalPaid, // ✅ Usar o valor calculado
          fees_count: feesData ? feesData.length : 0,
          scholarship_title: applicationData?.scholarships?.title || 'Scholarship not specified',
          university_name: applicationData?.scholarships?.universities?.name || 'University not specified',
          selected_scholarship_id: applicationData?.scholarship_id || null,
          documents_status: profileData.documents_status || 'Not started',
          // ✅ CORREÇÃO: Usar flags de QUALQUER aplicação paga
          is_application_fee_paid: hasAnyApplicationPaid,
          is_scholarship_fee_paid: hasAnyScholarshipPaid,
          has_paid_selection_process_fee: profileData.has_paid_selection_process_fee || false,
          has_paid_i20_control_fee: profileData.has_paid_i20_control_fee || false,
          student_process_type: applicationData?.student_process_type || 'Not specified',
          application_status: applicationData?.status || 'Pending',
          status: applicationData?.status || 'Pending', // ✅ Adicionar status da aplicação
          acceptance_letter_status: applicationData?.acceptance_letter_status || 'pending', // ✅ Adicionar status da carta de aceite
          documents: documentsData || [],
          dependents: dependents, // ✅ Adicionar campo dependents
          selection_process_fee_amount: selectionProcessFeeAmount, // ✅ Adicionar campo da taxa calculada
          i20_control_fee_amount: i20ControlFeeAmount, // ✅ Adicionar campo I-20 Control Fee
          scholarship_fee_amount: scholarshipFeeAmount, // ✅ Adicionar campo Scholarship Fee
          scholarship: applicationData?.scholarships ? {
            application_fee_amount: applicationData.scholarships?.application_fee_amount,
            scholarship_fee_amount: applicationData.scholarships?.scholarship_fee_amount
          } : undefined
        };
        
        setStudentDocuments(applicationData?.documents);
      }
      
      if (studentData) {
        // ✅ CORREÇÃO: Buscar TODAS as aplicações para verificar se QUALQUER uma foi paga
        const { data: allApplications, error: applicationError } = await supabase
          .from('scholarship_applications')
          .select(`
            *,
            acceptance_letter_status,
            acceptance_letter_url,
            acceptance_letter_sent_at,
            transfer_form_url,
            transfer_form_status,
            transfer_form_sent_at,
            status,
            scholarships (
              id,
              title,
              field_of_study,
              annual_value_with_scholarship,
              application_fee_amount,
              scholarship_fee_amount,
              placement_fee_amount,
              universities (
                id,
                name
              )
            )
          `)
          .eq('student_id', profile_id)
          // ✅ CORREÇÃO: Priorizar aplicações enrolled > approved > pending > rejected
          .order('status', { ascending: false }) // enrolled vem antes de pending
          .order('created_at', { ascending: false });

        // ✅ CORREÇÃO: Verificar se QUALQUER aplicação foi paga
        const hasAnyScholarshipPaid = allApplications?.some((app: any) => app.is_scholarship_fee_paid) || false;
        const hasAnyApplicationPaid = allApplications?.some((app: any) => app.is_application_fee_paid) || false;
        
        // ✅ CORREÇÃO: Priorizar aplicação com carta de aceite, senão usar a mais recente
        let applicationData = allApplications?.[0] || null;
        if (allApplications && allApplications.length > 0) {
          // Buscar aplicação com carta de aceite primeiro
          const appWithAcceptanceLetter = allApplications.find((app: any) => 
            app.acceptance_letter_url && app.acceptance_letter_url.trim() !== ''
          );
          if (appWithAcceptanceLetter) {
            applicationData = appWithAcceptanceLetter;
            console.log('✅ [ACCEPTANCE_LETTER] Found application with acceptance letter:', applicationData.id);
          }
        }

        // ✅ NOVO: Armazenar todas as aplicações para exibição
        setAllApplications(allApplications || []);

        studentData.documents = applicationData?.documents;
        setStudentDocuments(applicationData?.documents);

        // Buscar document requests da universidade para este estudante
        // ✅ CORREÇÃO: Buscar requests para TODAS as aplicações, não apenas a primeira
        if (allApplications && allApplications.length > 0) {
          
          try {
            // ✅ CORREÇÃO: Buscar document_requests para TODAS as aplicações do estudante
            const applicationIds = allApplications.map(app => app.id).filter(Boolean);
            
            let requestsForApp: any[] = [];
            if (applicationIds.length > 0) {
              const { data: requestsData, error: requestsError } = await supabase
                .from('document_requests')
                .select('*')
                .in('scholarship_application_id', applicationIds);
              
              if (requestsError) {
                console.log('❌ [DOCUMENT REQUEST] Error fetching requests:', requestsError);
              } else {
                console.log('✅ [DOCUMENT REQUEST] Requests found for all applications:', requestsData);
                requestsForApp = requestsData || [];
              }
            } else {
              console.log('⚠️ [DOCUMENT REQUEST] No application IDs found');
            }
            
            // Buscar requests globais de todas as universidades das aplicações
            let globalRequests: any[] = [];
            const universityIds = allApplications
              .map(app => {
                const scholarship = app.scholarships 
                  ? (Array.isArray(app.scholarships) ? app.scholarships[0] : app.scholarships)
                  : null;
                return scholarship?.universities?.id;
              })
              .filter(Boolean)
              .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicatas
            
            if (universityIds.length > 0) {
              console.log('🔍 [DOCUMENT REQUEST] Fetching global requests for universities:', universityIds);
              
              const { data: globalData, error: globalError } = await supabase
                .from('document_requests')
                .select('*')
                .eq('is_global', true)
                .in('university_id', universityIds);
              
              if (globalError) {
                console.log('❌ [DOCUMENT REQUEST] Error fetching global requests:', globalError);
              } else {
                console.log('✅ [DOCUMENT REQUEST] Global requests found:', globalData);
                globalRequests = globalData || [];
              }
            }

            // Buscar requests específicos do estudante criados pelo super admin para TODAS as aplicações
            let studentSpecificRequests: any[] = [];
            if (applicationIds.length > 0) {
              console.log('🔍 [DOCUMENT REQUEST] Fetching student-specific requests for all applications:', applicationIds);
              
              const { data: studentData, error: studentError } = await supabase
                .from('document_requests')
                .select('*')
                .in('scholarship_application_id', applicationIds)
                .eq('is_global', false);
              
              if (studentError) {
                console.log('❌ [DOCUMENT REQUEST] Error fetching student-specific requests:', studentError);
              } else {
                console.log('✅ [DOCUMENT REQUEST] Student-specific requests found:', studentData);
                studentSpecificRequests = studentData || [];
              }
            }

            // Combinar requests específicos, globais e específicos do estudante
            const allRequestsForApp = [...(requestsForApp || []), ...globalRequests, ...studentSpecificRequests];
            
            // ✅ CORREÇÃO: Buscar uploads para cada request encontrado (APENAS DO ESTUDANTE ATUAL)
            let uploads: any[] = [];
            if (allRequestsForApp && allRequestsForApp.length > 0) {
              const requestIds = allRequestsForApp.map(req => req.id);
              
              // ✅ CORREÇÃO CRÍTICA: Filtrar uploads apenas do estudante atual
              // uploaded_by pode ser user_id (auth.users) ou profile_id (user_profiles)
              // Buscar usando ambos os IDs possíveis
              const studentUserId = studentData.student_id; // user_id do auth.users
              const studentProfileId = profile_id; // id da tabela user_profiles
              const searchIds = [studentUserId];
              if (studentProfileId && studentProfileId !== studentUserId) {
                searchIds.push(studentProfileId);
              }
              
              console.log('🔍 [DOCUMENT REQUEST] Searching uploads with IDs:', searchIds);
              
              const { data: uploadsForRequests, error: uploadsError } = await supabase
                .from('document_request_uploads')
                .select('*')
                .in('document_request_id', requestIds)
                .in('uploaded_by', searchIds);  // ✅ Filtrar por estudante (user_id ou profile_id)
              
              if (uploadsError) {
                console.log('❌ [DOCUMENT REQUEST] Error fetching uploads for requests:', uploadsError);
              } else {
                console.log('✅ [DOCUMENT REQUEST] Uploads found for THIS STUDENT:', uploadsForRequests);
                console.log('✅ [DOCUMENT REQUEST] Filtered by uploaded_by:', studentData.student_id);
                uploads = uploadsForRequests || [];
              }
            }
            
            // ✅ CORREÇÃO: Se não encontrou nada pelos requests, tentar buscar por uploaded_by
            if (uploads.length === 0) {
              console.log('🔄 [AFFILIATE_DEBUG] No uploads found for requests, trying uploaded_by =', studentId);
              
              // ✅ CORREÇÃO: Usar user_id do profile ao invés de buscar auth.users
              let authUserId = null;
              if (studentData?.student_id) {
                // O student_id já é o user_id do auth.users
                authUserId = studentData.student_id;
                console.log('✅ [AFFILIATE_DEBUG] Using student_id as auth user ID:', authUserId);
              } else {
                console.log('⚠️ [AFFILIATE_DEBUG] Could not determine auth user ID');
              }
              
              // Buscar uploads usando ambos os IDs possíveis
              const searchIds = [studentId];
              if (authUserId && authUserId !== studentId) {
                searchIds.push(authUserId);
              }
              
              
              // Teste 1: Buscar apenas document_request_uploads
              let { data: simpleUploads, error: simpleError } = await supabase
                .from('document_request_uploads')
                .select('*')
                .in('uploaded_by', searchIds);
              
              // Teste 2: Buscar com join para document_requests
              let { data: uploadsByUser, error: error1 } = await supabase
                .from('document_request_uploads')
                .select(`
                  *,
                  document_requests(
                    id,
                    title,
                    description,
                    created_at,
                    is_global,
                    university_id,
                    scholarship_application_id,
                    attachment_url,
                    due_date
                  )
                `)
                .in('uploaded_by', searchIds);
              

              if (error1) {
                console.log('❌ [DOCUMENT REQUEST] Error fetching by uploaded_by:', error1);
              } else if (uploadsByUser && uploadsByUser.length > 0) {
                console.log('✅ [DOCUMENT REQUEST] Uploads found by uploaded_by:', uploadsByUser);
                uploads = uploadsByUser;
              } else {
                console.log('⚠️ [DOCUMENT REQUEST] No uploads found by uploaded_by');
                
                // Se ainda não encontrou, usar os dados simples se disponível
                if (simpleUploads && simpleUploads.length > 0) {
                  console.log('🔄 [DOCUMENT REQUEST] Using simple query results instead');
                  uploads = simpleUploads;
                }
              }
            }
            
            console.log('📋 [DOCUMENT REQUEST] Final uploads count:', uploads.length);

            // Buscar também a carta de aceite da aplicação
            let acceptanceLetterDoc = null;
            if (applicationData.acceptance_letter_url && applicationData.acceptance_letter_url.trim() !== '') {
              acceptanceLetterDoc = {
                id: `acceptance_letter_${applicationData.id}`,
                filename: filenameFromUrl(applicationData.acceptance_letter_url, 'Acceptance Letter'),
                file_url: applicationData.acceptance_letter_url,
                status: applicationData.acceptance_letter_status || 'sent',
                uploaded_at: applicationData.acceptance_letter_sent_at || new Date().toISOString(),
                request_title: 'Acceptance Letter',
                request_description: 'Official acceptance letter from the university',
                request_created_at: applicationData.acceptance_letter_sent_at || new Date().toISOString(),
                is_global: false,
                request_type: 'Acceptance Letter',
                is_acceptance_letter: true
              };
              console.log('✅ [DOCUMENT REQUEST] Acceptance letter found:', acceptanceLetterDoc);
            }

            // Combinar uploads com a carta de aceite
            let allDocuments = [...uploads];
            if (acceptanceLetterDoc) {
              allDocuments.unshift(acceptanceLetterDoc);
            }

            console.log('📊 [DOCUMENT REQUEST] Summary:', {
              uploadsCount: uploads.length,
              acceptanceLetterFound: !!acceptanceLetterDoc,
              totalDocuments: allDocuments.length
            });

            if (!allDocuments || allDocuments.length === 0) {
              console.log('⚠️ [DOCUMENT REQUEST] No documents found for student');
            //   setDocumentRequests([]);
            } else {
              // ✅ CORREÇÃO: Usar os requests encontrados para estruturar os documentos
              const documentRequestsMap = new Map();
              
              // Primeiro, adicionar os requests encontrados
              if (allRequestsForApp && allRequestsForApp.length > 0) {
                allRequestsForApp.forEach(request => {
                  documentRequestsMap.set(request.id, {
                    id: request.id,
                    title: request.title,
                    description: request.description,
                    is_global: request.is_global,
                    status: 'open',
                    attachment_url: request.attachment_url,
                    due_date: request.due_date,
                    document_request_uploads: []
                  });
                });
              }
              
              // ✅ CORREÇÃO: NÃO adicionar acceptance letter aos document requests
              // O acceptance letter tem sua própria seção
              
              // Por fim, distribuir os uploads pelos requests correspondentes
              uploads.forEach(upload => {
                const requestId = upload.document_request_id;
                console.log('🔍 [DOCUMENT REQUEST] Processing upload:', {
                  uploadId: upload.id,
                  requestId: requestId,
                  hasRequestInMap: requestId ? documentRequestsMap.has(requestId) : false,
                  status: upload.status
                });
                
                if (requestId && documentRequestsMap.has(requestId)) {
                  // Formatar o upload para exibição
                  let filename = 'Document';
                  if (upload.file_url) {
                    const urlParts = upload.file_url.split('/');
                    filename = urlParts[urlParts.length - 1] || 'Document';
                  }
                  
                  const formattedUpload = {
                    id: upload.id,
                    filename: filename,
                    file_url: upload.file_url,
                    status: upload.status || 'under_review',
                    uploaded_at: upload.uploaded_at || upload.created_at,
                    request_title: documentRequestsMap.get(requestId)?.title || 'Document Request',
                    request_description: documentRequestsMap.get(requestId)?.description || '',
                    request_created_at: documentRequestsMap.get(requestId)?.created_at || upload.created_at,
                    is_global: documentRequestsMap.get(requestId)?.is_global || false,
                    request_type: 'document',
                    is_acceptance_letter: false
                  };
                  
                  documentRequestsMap.get(requestId).document_request_uploads.push(formattedUpload);
                  console.log('✅ [DOCUMENT REQUEST] Upload added to request:', requestId);
                } else {
                  console.log('⚠️ [DOCUMENT REQUEST] Upload not associated with any request:', {
                    uploadId: upload.id,
                    requestId: requestId,
                    availableRequestIds: Array.from(documentRequestsMap.keys())
                  });
                }
              });
              
              const finalDocumentRequests = Array.from(documentRequestsMap.values());
              console.log('🎯 [AFFILIATE_DEBUG] Final document requests:', finalDocumentRequests);
              console.log('🔍 [AFFILIATE_DEBUG] Final document requests count:', finalDocumentRequests.length);
              console.log('🔍 [AFFILIATE_DEBUG] Final document requests structure:', finalDocumentRequests.map(req => ({
                id: req.id,
                title: req.title,
                uploadsCount: req.document_request_uploads?.length || 0,
                uploads: req.document_request_uploads
              })));
              setDocumentRequests(finalDocumentRequests);
            }
            
          } catch (error) {
            console.error("❌ [DOCUMENT REQUEST] Error in document requests logic:", error);
            // setDocumentRequests([]);
          }
        } else {
          console.log('🔄 [DOCUMENT REQUEST] No scholarship_id found - trying alternative approach');
          
          // Busca alternativa para estudantes sem aplicação de bolsa
          try {
            console.log('🔍 [DOCUMENT REQUEST] Alternative approach: searching by uploaded_by =', studentId);
            
            // Buscar todos os uploads deste estudante
            const { data: uploadsByUser, error: uploadsError } = await supabase
              .from('document_request_uploads')
              .select(`
                *,
                document_requests(
                  id,
                  title,
                  description,
                  created_at,
                  is_global,
                  university_id,
                  scholarship_application_id,
                  attachment_url,
                  due_date
                )
              `)
              .eq('uploaded_by', studentId);
            
            if (uploadsError) {
              console.log('❌ [DOCUMENT REQUEST] Error fetching uploads by uploaded_by:', uploadsError);
            //   setDocumentRequests([]);
            } else if (uploadsByUser && uploadsByUser.length > 0) {
              console.log('✅ [DOCUMENT REQUEST] Uploads found by uploaded_by (alternative):', uploadsByUser);
              
              // Formatar os documentos para exibição
              const formattedDocuments = uploadsByUser.map(doc => {
                let filename = 'Document';
                if (doc.file_url) {
                  const urlParts = doc.file_url.split('/');
                  filename = urlParts[urlParts.length - 1] || 'Document';
                }
                
                const formatted = {
                  id: doc.id,
                  filename: filename,
                  file_url: doc.file_url,
                  status: doc.status || 'under_review',
                  uploaded_at: doc.uploaded_at || doc.created_at,
                  request_title: doc.document_requests?.title || 'Document Request',
                  request_description: doc.document_requests?.description || '',
                  request_created_at: doc.document_requests?.created_at || doc.created_at,
                  is_global: doc.document_requests?.is_global || false,
                  request_type: 'document',
                  is_acceptance_letter: false,
                  document_request_id: doc.document_request_id
                };
                
                return formatted;
              });

              console.log('📋 [DOCUMENT REQUEST] Formatted documents (alternative):', formattedDocuments);
              
              // Agrupar documentos por document request
              const documentRequestsMap = new Map();
              
              formattedDocuments.forEach(doc => {
                const requestId = doc.document_request_id || 'general';
                if (!documentRequestsMap.has(requestId)) {
                  // Buscar o document_request original para obter attachment_url e outros campos
                  const originalRequest = uploadsByUser.find(u => u.document_request_id === requestId)?.document_requests;
                  
                  documentRequestsMap.set(requestId, {
                    id: requestId,
                    title: doc.request_title || 'Document Request',
                    description: doc.request_description || '',
                    is_global: doc.is_global || false,
                    status: 'open',
                    attachment_url: originalRequest?.attachment_url || null,
                    due_date: originalRequest?.due_date || null,
                    document_request_uploads: []
                  });
                }
                documentRequestsMap.get(requestId).document_request_uploads.push(doc);
              });
              
              const finalDocumentRequests = Array.from(documentRequestsMap.values());
              console.log('🎯 [DOCUMENT REQUEST] Final document requests (alternative):', finalDocumentRequests);
            //   setDocumentRequests(finalDocumentRequests);
            } else {
              console.log('⚠️ [DOCUMENT REQUEST] No uploads found for student (alternative)');
            //   setDocumentRequests([]);
            }
            
          } catch (error) {
            console.error("❌ [DOCUMENT REQUEST] Error in alternative document requests logic:", error);
            // setDocumentRequests([]);
          }
        }

        console.log('🔍 [AFFILIATE_DEBUG] Setting student details:', studentData);
        setStudentDetails(studentData);

        // Calcular deadline do I-20 usando os dados que já vêm da função SQL
        try {
          console.log('🔍 [I20_DEADLINE] Calculating deadline from student data:', {
            has_paid_i20_control_fee: studentData.has_paid_i20_control_fee,
            acceptance_letter_sent_at: studentData.acceptance_letter_sent_at,
            acceptance_letter_status: studentData.acceptance_letter_status,
            i20_control_fee_due_date: studentData.i20_control_fee_due_date
          });

          // Se o I-20 já foi pago, não há deadline
          if (studentData.has_paid_i20_control_fee) {
            setI20ControlFeeDeadline(null);
            console.log('🔍 [I20_DEADLINE] I-20 already paid, no deadline');
          }

          // Se a carta de aceite foi enviada, devemos mostrar o deadline
          if (studentData.acceptance_letter_sent_at && 
              (studentData.acceptance_letter_status === 'sent' || studentData.acceptance_letter_status === 'approved')) {
            
            // Se já tem deadline específico do I-20, usar ele
            if (studentData.i20_control_fee_due_date) {
              const deadline = new Date(studentData.i20_control_fee_due_date);
              setI20ControlFeeDeadline(deadline);
              console.log('🔍 [I20_DEADLINE] Using specific I20 deadline:', deadline);
            } else {
              // Calcular deadline baseado na data de envio da carta de aceite + 10 dias
              const acceptanceDate = new Date(studentData.acceptance_letter_sent_at);
              const deadline = new Date(acceptanceDate.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 dias
              setI20ControlFeeDeadline(deadline);
              console.log('🔍 [I20_DEADLINE] Calculated deadline from acceptance letter:', deadline);
            }
          } else {
            setI20ControlFeeDeadline(null);
            console.log('🔍 [I20_DEADLINE] No acceptance letter sent yet');
          }
        } catch (error) {
          console.error('❌ [I20_DEADLINE] Error calculating deadline:', error);
          setI20ControlFeeDeadline(null);
        }

        // Definir aplicação de bolsa usando os dados reais da aplicação
        console.log('🔍 [AFFILIATE_DEBUG] Checking applicationData:', !!applicationData, applicationData);
        if (applicationData) {
          const scholarshipApp = {
            id: applicationData.id,
            status: applicationData.status || 'pending',
            student_process_type: applicationData.student_process_type || 'Not specified',
            applied_at: applicationData.applied_at || new Date().toISOString(),
            reviewed_at: applicationData.reviewed_at || new Date().toISOString(),
            notes: applicationData.notes || '',
            documents: applicationData.documents || [],
            acceptance_letter_status: applicationData.acceptance_letter_status || 'pending',
            acceptance_letter_url: applicationData.acceptance_letter_url || '',
            acceptance_letter_sent_at: applicationData.acceptance_letter_sent_at || null,
            // ✅ CORREÇÃO: Incluir campos de transfer form
            transfer_form_url: applicationData.transfer_form_url || null,
            transfer_form_status: applicationData.transfer_form_status || null,
            transfer_form_sent_at: applicationData.transfer_form_sent_at || null,
            // ✅ CORREÇÃO: Usar flags de QUALQUER aplicação paga
            is_application_fee_paid: hasAnyApplicationPaid,
            is_scholarship_fee_paid: hasAnyScholarshipPaid,
            paid_at: applicationData.paid_at || new Date().toISOString(),
            payment_status: applicationData.payment_status || 'pending',
            has_paid_selection_process_fee: studentData.has_paid_selection_process_fee || false,
            has_paid_i20_control_fee: studentData.has_paid_i20_control_fee || false,
            // ✅ CORREÇÃO: Incluir dados de scholarships e universities
            scholarships: applicationData.scholarships || null
          };
          
          console.log('🔍 [AFFILIATE_DEBUG] Setting scholarship application:', scholarshipApp);
          console.log('🔍 [AFFILIATE_DEBUG] Scholarship app scholarships:', scholarshipApp.scholarships);
          console.log('🔍 [AFFILIATE_DEBUG] Scholarship app is_application_fee_paid:', scholarshipApp.is_application_fee_paid);
          console.log('🔍 [AFFILIATE_DEBUG] Scholarship app is_scholarship_fee_paid:', scholarshipApp.is_scholarship_fee_paid);
          console.log('🔍 [TRANSFER_FORM_DEBUG] Transfer form data:', {
            transfer_form_url: scholarshipApp.transfer_form_url,
            transfer_form_status: scholarshipApp.transfer_form_status,
            transfer_form_sent_at: scholarshipApp.transfer_form_sent_at,
            student_process_type: scholarshipApp.student_process_type
          });
          setScholarshipApplication(scholarshipApp);
        } else {
          console.log('🔍 [AFFILIATE_DEBUG] No applicationData found, scholarshipApplication will remain null');
        }

        // Definir histórico de taxas
        if (studentData.total_fees_paid > 0) {
          setFeeHistory([{
            payment_id: 'fallback',
            fee_type: 'application',
            fee_name: 'Application Fee',
            amount_paid: studentData.total_fees_paid,
            currency: 'USD',
            payment_status: 'succeeded',
            payment_date: studentData.registration_date,
            stripe_payment_intent: 'fallback',
            notes: 'Fee payment recorded'
          }]);
        } else {
          setFeeHistory([]);
        }
      } else {
        setError('Student details not found');
      }

    } catch (error: any) {
      console.error('❌ [AFFILIATE_DEBUG] Error loading student details:', error);
      setError('Failed to load student details');
    } finally {
      setLoadingStudentDetails(false);
    }
  }, [isAuthenticated, supabaseUser]);

  // Voltar para lista
  const backToList = useCallback(() => {
    setSelectedStudent(null);
    setStudentDetails(null);
    setFeeHistory([]);
    setScholarshipApplication(null);
    setStudentDocuments([]);
    setDocumentRequests([]);
    setI20ControlFeeDeadline(null);
    setAllApplications([]);
    setError(null);
  }, []);

  return {
    selectedStudent,
    studentDetails,
    feeHistory,
    scholarshipApplication,
    studentDocuments,
    documentRequests,
    i20ControlFeeDeadline,
    allApplications,
    loadingStudentDetails,
    error,
    loadStudentDetails,
    backToList
  };
};
