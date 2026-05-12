import React, { useState, useRef, useEffect } from 'react';
import { Building, GraduationCap, Calendar, UserCheck, ChevronDown, AlertCircle, UserX, RotateCcw, Camera, FileText, CheckCircle, XCircle, Clock, Send, RefreshCw, Shield } from 'lucide-react';
import { StudentRecord } from './StudentApplicationsView';
import { ApplicationFlowStageKey } from '../../utils/applicationFlowStages';

import { toast } from 'react-hot-toast';
import { useAssignAdminMutation, useDropStudentMutation, useMarkSentDocsToUniversityMutation, useMarkSevisCompletedMutation, useMarkVisaApprovedMutation } from './hooks/useStudentApplicationsQueries';
import { useAuth } from '../../hooks/useAuth';
import { useStudentLogs } from '../../hooks/useStudentLogs';

interface InternalAdmin {
  id: string;
  name: string;
  email: string;
}

interface StudentCardProps {
  student: StudentRecord;
  onClick: () => void;
  unreadMessages?: number;
  internalAdmins?: InternalAdmin[];
  showSelectionTags?: boolean;
  currentStageKey?: ApplicationFlowStageKey;
}

const StudentCard: React.FC<StudentCardProps> = ({ student, onClick, unreadMessages = 0, internalAdmins = [], showSelectionTags = false, currentStageKey }) => {
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const assignAdminMutation = useAssignAdminMutation();
  const dropStudentMutation = useDropStudentMutation();
  const markSentDocsMutation = useMarkSentDocsToUniversityMutation();
  const markSevisMutation = useMarkSevisCompletedMutation();
  const markVisaMutation = useMarkVisaApprovedMutation();
  const { userProfile } = useAuth();
  const { logAction } = useStudentLogs(student.student_id);
  const currentAdminProfileId = userProfile?.role === 'admin' ? userProfile.id : null;

  // Atribuído a outro admin: restringe se o atual for restrito
  const assignedToOther = student.assigned_to_admin_id &&
    student.assigned_to_admin_id !== currentAdminProfileId;
  
  // Pode editar se: não for admin (super), se o admin não for restrito, se não houver atribuição, ou se for pra ele mesmo
  const canEdit = !currentAdminProfileId ||
    userProfile?.is_restricted_admin === false ||
    !student.assigned_to_admin_id ||
    student.assigned_to_admin_id === currentAdminProfileId;

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAdminDropdown(false);
      }
    };
    if (showAdminDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAdminDropdown]);

  const handleToggleDrop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newDropped = !student.is_dropped;
    try {
      await dropStudentMutation.mutateAsync({ studentId: student.student_id, isDropped: newDropped });
      
      await logAction(
        newDropped ? 'student_dropped' : 'student_restored',
        newDropped ? 'Student was marked as dropped from the process' : 'Student was restored to the process',
        userProfile?.user_id || '',
        'admin',
        { 
          source: 'kanban_card',
          admin_name: userProfile?.full_name 
        }
      );
      
      toast.success(newDropped ? 'Aluno marcado como dropped' : 'Aluno restaurado');
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleMarkSentDocs = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!student.application_id) return;
    try {
      await markSentDocsMutation.mutateAsync(student.application_id);
      
      await logAction(
        'docs_sent_to_university',
        'Documents were marked as sent to the university',
        userProfile?.user_id || '',
        'admin',
        { 
          source: 'kanban_card',
          application_id: student.application_id,
          admin_name: userProfile?.full_name 
        }
      );

      toast.success('Docs marcados como enviados para a universidade');
    } catch {
      toast.error('Erro ao atualizar');
    }
  };

  const handleMarkSevis = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!student.application_id) return;
    try {
      await markSevisMutation.mutateAsync(student.application_id);
      
      await logAction(
        'sevis_transfer_completed',
        'SEVIS transfer was marked as completed',
        userProfile?.user_id || '',
        'admin',
        { 
          source: 'kanban_card',
          application_id: student.application_id,
          admin_name: userProfile?.full_name 
        }
      );

      toast.success('SEVIS transfer marcado como concluído');
    } catch {
      toast.error('Erro ao atualizar');
    }
  };


  const handleMarkVisa = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!student.application_id) return;
    try {
      await markVisaMutation.mutateAsync(student.application_id);
      
      await logAction(
        'visa_approved',
        'Visa was marked as approved',
        userProfile?.user_id || '',
        'admin',
        { 
          source: 'kanban_card',
          application_id: student.application_id,
          admin_name: userProfile?.full_name 
        }
      );

      toast.success('Visto marcado como aprovado');
    } catch {
      toast.error('Erro ao atualizar');
    }
  };


  const handleAssignAdmin = async (adminId: string | null) => {
    setShowAdminDropdown(false);
    try {
      await assignAdminMutation.mutateAsync({ studentId: student.student_id, adminId });
      
      let adminName = 'Unknown Admin';
      if (adminId) {
        const foundAdmin = internalAdmins.find(a => a.id === adminId);
        if (foundAdmin) adminName = foundAdmin.name;
      }

      await logAction(
        adminId ? 'admin_assigned' : 'admin_unassigned',
        adminId ? `Student assigned to admin: ${adminName}` : 'Student unassigned from admin',
        userProfile?.user_id || '',
        'admin',
        { 
          source: 'kanban_card',
          assigned_admin_id: adminId,
          assigned_admin_name: adminId ? adminName : null,
          admin_name: userProfile?.full_name 
        }
      );

      toast.success(adminId ? 'Aluno atribuído' : 'Atribuição removida');
    } catch {
      toast.error('Erro ao atribuir responsável');
    }
  };

  const getAdminInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };
  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return (parts[0] || name).substring(0, 2).toUpperCase();
  };

  const getProcessTypeTag = (processType: string | null) => {
    switch (processType) {
      case 'initial':          return { label: 'Initial',   className: 'text-sky-600' };
      case 'change_of_status': return { label: 'COS',       className: 'text-violet-600' };
      case 'transfer':         return { label: 'Transfer',  className: 'text-amber-600' };
      case 'resident':         return { label: 'Resident',  className: 'text-teal-600' };
      default:                 return null;
    }
  };

  // Generate a consistent color for the avatar based on student ID

  const getAvatarColor = (id: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
    ];
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Format date to relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return '1 dia atrás';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
    return `${Math.floor(diffDays / 365)} anos atrás`;
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow duration-200 relative group`}
    >
      {/* Unread messages indicator */}
      {unreadMessages > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md z-10">
          {unreadMessages > 9 ? '9+' : unreadMessages}
        </div>
      )}

      {/* Archive Button */}


      {/* Header with avatar and name */}
      <div className="flex items-start gap-3 mb-2">
        <div className={`${getAvatarColor(student.student_id)} w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 text-sm`}>
          {getInitials(student.student_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 truncate" title={`${student.student_name} · ${student.student_email}`}>
              {student.student_name}
            </h3>
            {student.source === 'migma' && (
              <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-black text-[#FFD700] border border-[#FFD700]/20 shadow-sm">
                Migma
              </span>
            )}
            {(() => {
              const tag = getProcessTypeTag(student.student_process_type ?? null);
              return tag ? (
                <span className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-wider ${tag.className}`}>
                  {tag.label}
                </span>
              ) : null;
            })()}
          </div>
          {student.university_name && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <Building className="w-3 h-3 flex-shrink-0" />
              <span className="truncate" title={student.university_name}>{student.university_name}</span>
            </div>
          )}
        </div>
        {/* Drop button */}
        <button
          onClick={handleToggleDrop}
          title={student.is_dropped ? 'Restaurar aluno' : 'Marcar como dropped'}
          className={`flex-shrink-0 p-1 rounded transition-colors ${
            student.is_dropped
              ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'
              : 'text-gray-300 hover:text-red-400 hover:bg-red-50'
          }`}
        >
          {student.is_dropped
            ? <RotateCcw className="w-3.5 h-3.5" />
            : <UserX className="w-3.5 h-3.5" />
          }
        </button>
      </div>

      {/* Course / Scholarship info */}
      {(student.course_name || student.scholarship_title) && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <GraduationCap className="w-3 h-3 flex-shrink-0" />
          <span className="truncate" title={student.course_name || student.scholarship_title || ''}>
            {student.course_name || student.scholarship_title}
          </span>
        </div>
      )}

      {/* Photo + Form tags — específico da coluna Selection Process Payment */}
      {showSelectionTags && (
        <div className="flex flex-col gap-1 mb-2">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border ${
            student.has_uploaded_photo 
              ? 'border-green-200 bg-green-50 text-green-700' 
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}>
            <Camera className="w-3 h-3 flex-shrink-0" />
            {student.has_uploaded_photo ? 'Photo uploaded' : 'Pending: photo upload'}
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border ${
            student.has_submitted_form 
              ? 'border-green-200 bg-green-50 text-green-700' 
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}>
            <FileText className="w-3 h-3 flex-shrink-0" />
            {student.has_submitted_form ? 'Form submitted' : 'Pending: fill & submit form'}
          </div>
        </div>
      )}

      {/* Doc status tags — Stage 1: university_docs */}
      {currentStageKey === 'university_docs' && (
        <div className="flex flex-col gap-1 mb-2">
          {(student.docs_total_rejected ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-red-200 bg-red-50 text-red-700">
              <XCircle className="w-3 h-3 flex-shrink-0" />
              {student.docs_total_rejected} doc(s) recusado(s)
            </div>
          )}
          {(() => {
            const pending = (student.docs_total_required ?? 0) - (student.docs_total_uploaded ?? 0);
            return pending > 0 ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-gray-200 bg-gray-50 text-gray-600">
                <Clock className="w-3 h-3 flex-shrink-0" />
                {pending} doc(s) pendente(s)
              </div>
            ) : null;
          })()}
          {(student.docs_total_under_review ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-yellow-200 bg-yellow-50 text-yellow-700">
              <Clock className="w-3 h-3 flex-shrink-0" />
              {student.docs_total_under_review} doc(s) em revisão
            </div>
          )}
        </div>
      )}

      {/* Doc status tags — Stage 2: docs_approval */}
      {currentStageKey === 'docs_approval' && (
        <div className="flex flex-col gap-1 mb-2">
          {(student.docs_total_under_review ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-yellow-200 bg-yellow-50 text-yellow-700">
              <Clock className="w-3 h-3 flex-shrink-0" />
              {student.docs_total_under_review} em revisão
            </div>
          )}
          {(student.docs_total_rejected ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-red-200 bg-red-50 text-red-700">
              <XCircle className="w-3 h-3 flex-shrink-0" />
              {student.docs_total_rejected} recusado(s)
            </div>
          )}
          {(student.docs_total_approved ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-green-200 bg-green-50 text-green-700">
              <CheckCircle className="w-3 h-3 flex-shrink-0" />
              {student.docs_total_approved}/{student.docs_total_required} aprovado(s)
            </div>
          )}
          {(() => {
            const pending = (student.docs_total_required ?? 0) - (student.docs_total_uploaded ?? 0);
            return pending > 0 ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-gray-200 bg-gray-50 text-gray-500">
                <Clock className="w-3 h-3 flex-shrink-0" />
                {pending} ainda pendente(s) de upload
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* Basic Doc status tags — Scholarship Eligibility (review) */}
      {currentStageKey === 'review' && (
        <div className="flex flex-col gap-1 mb-2">
          {(student.basic_docs_total_under_review ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-yellow-200 bg-yellow-50 text-yellow-700">
              <Clock className="w-3 h-3 flex-shrink-0" />
              {student.basic_docs_total_under_review} em revisão
            </div>
          )}
          {(student.basic_docs_total_rejected ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-red-200 bg-red-50 text-red-700">
              <XCircle className="w-3 h-3 flex-shrink-0" />
              {student.basic_docs_total_rejected} recusado(s)
            </div>
          )}
          {(student.basic_docs_total_approved ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-green-200 bg-green-50 text-green-700">
              <CheckCircle className="w-3 h-3 flex-shrink-0" />
              {student.basic_docs_total_approved}/{student.basic_docs_total_required} aprovado(s)
            </div>
          )}
          {(() => {
            const pending = (student.basic_docs_total_required ?? 0) - (student.basic_docs_total_uploaded ?? 0);
            return pending > 0 ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-gray-200 bg-gray-50 text-gray-500">
                <Clock className="w-3 h-3 flex-shrink-0" />
                {pending} documento(s) pendente(s)
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* Transfer form status tags — student_sends_letter */}
      {currentStageKey === 'student_sends_letter' && (
        <div className="flex flex-col gap-1 mb-2">
          {!student.transfer_form_status && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-gray-200 bg-gray-50 text-gray-500">
              <Clock className="w-3 h-3 flex-shrink-0" />
              Aguardando envio do transfer form
            </div>
          )}
          {student.transfer_form_status === 'sent' && (
            <>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-blue-200 bg-blue-50 text-blue-700">
                <CheckCircle className="w-3 h-3 flex-shrink-0" />
                Transfer form enviado ao aluno
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-yellow-200 bg-yellow-50 text-yellow-700">
                <Clock className="w-3 h-3 flex-shrink-0" />
                Aguardando devolução do aluno
              </div>
            </>
          )}
          {student.transfer_form_status === 'returned' && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-amber-200 bg-amber-50 text-amber-700">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              Form devolvido — pendente aprovação
            </div>
          )}
        </div>
      )}

      {/* Admin action button — Stage 3: send_docs_to_university */}
      {currentStageKey === 'send_docs_to_university' && !student.has_sent_docs_to_university && (
        <button
          onClick={handleMarkSentDocs}
          disabled={markSentDocsMutation.isPending}
          className="w-full mb-2 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <Send className="w-3 h-3 flex-shrink-0" />
          Marcar como enviado para universidade
        </button>
      )}

      {/* Admin action button — Stage 7: sevis_transfer */}
      {currentStageKey === 'sevis_transfer' && !student.sevis_transfer_completed && (
        <button
          onClick={handleMarkSevis}
          disabled={markSevisMutation.isPending}
          className="w-full mb-2 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
        >
          <RefreshCw className="w-3 h-3 flex-shrink-0" />
          Marcar SEVIS como transferido
        </button>
      )}

      {/* Admin action button — Stage 8: visa_approval */}
      {currentStageKey === 'visa_approval' && !student.visa_approved && (
        <button
          onClick={handleMarkVisa}
          disabled={markVisaMutation.isPending}
          className="w-full mb-2 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
        >
          <Shield className="w-3 h-3 flex-shrink-0" />
          Marcar visto como aprovado
        </button>
      )}

      {/* Footer with badges */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>{getRelativeTime(student.student_created_at)}</span>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {student.total_applications > 0 && !(['application_fee', 'placement_fee', 'reinstatement_fee', 'scholarship_fee', 'university_docs', 'docs_approval', 'send_docs_to_university', 'receive_acceptance_letter', 'send_acceptance_letter', 'i20_fee', 'student_sends_letter', 'sevis_transfer', 'visa_approval', 'enrollment'] as ApplicationFlowStageKey[]).includes(currentStageKey!) && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              {student.total_applications} app{student.total_applications > 1 ? 's' : ''}
            </span>
          )}
          {(student.placement_fee_pending_balance ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">
              <AlertCircle className="w-3 h-3" />
              Debt: ${(student.placement_fee_pending_balance ?? 0).toFixed(0)}
            </span>
          )}
        </div>
      </div>

      {/* Assigned admin row */}
      {internalAdmins.length > 0 && (
        <div className="pt-2 border-t border-gray-100 mt-1" ref={dropdownRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (canEdit) setShowAdminDropdown((v) => !v);
            }}
            disabled={!canEdit}
            className={`flex items-center justify-between gap-1.5 w-full text-left rounded-md border px-2 py-1 transition-colors text-xs
              ${assignedToOther && userProfile?.is_restricted_admin
                ? 'border-gray-100 bg-gray-50 cursor-default text-gray-600'
                : student.assigned_to_admin_name
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer'
                  : 'border-dashed border-gray-300 bg-white text-gray-500 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer'
              }`}
            title={assignedToOther && userProfile?.is_restricted_admin ? 'Atribuído a outro admin' : 'Clique para atribuir'}
          >
            <span className="flex items-center gap-1.5 truncate">
              <UserCheck className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {student.assigned_to_admin_name || 
                 internalAdmins.find(a => a.id === student.assigned_to_admin_id)?.name || 
                 'Atribuir responsável'}
              </span>
            </span>
            {canEdit && <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-60" />}
          </button>

          {showAdminDropdown && canEdit && (
            <div className="absolute z-20 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              {(student.assigned_to_admin_id === currentAdminProfileId || userProfile?.is_restricted_admin === false) && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAssignAdmin(null); }}
                    className="block w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                  >
                    Remover atribuição
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                </>
              )}
              {/* Admin restrito só vê a si mesmo; sem restrição vê todos */}
              {(userProfile?.is_restricted_admin === true
                ? internalAdmins.filter(a => a.id === currentAdminProfileId)
                : internalAdmins
              ).map((admin) => (
                <button
                  key={admin.id}
                  onClick={(e) => { e.stopPropagation(); handleAssignAdmin(admin.id); }}
                  className={`flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 ${
                    student.assigned_to_admin_id === admin.id ? 'text-indigo-700 font-semibold' : 'text-gray-700'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">
                    {getAdminInitials(admin.name)}
                  </span>
                  <span className="truncate">{admin.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default StudentCard;
