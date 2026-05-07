import React, { useState, useRef, useEffect } from 'react';
import { Building, GraduationCap, Calendar, UserCheck, ChevronDown, AlertCircle, UserX, RotateCcw, Camera, FileText } from 'lucide-react';
import { StudentRecord } from './StudentApplicationsView';

import { toast } from 'react-hot-toast';
import { useAssignAdminMutation, useDropStudentMutation } from './hooks/useStudentApplicationsQueries';
import { useAuth } from '../../hooks/useAuth';

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
}

const StudentCard: React.FC<StudentCardProps> = ({ student, onClick, unreadMessages = 0, internalAdmins = [], showSelectionTags = false }) => {
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const assignAdminMutation = useAssignAdminMutation();
  const dropStudentMutation = useDropStudentMutation();
  const { userProfile } = useAuth();
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
      toast.success(newDropped ? 'Aluno marcado como dropped' : 'Aluno restaurado');
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleAssignAdmin = async (adminId: string | null) => {
    setShowAdminDropdown(false);
    try {
      await assignAdminMutation.mutateAsync({ studentId: student.student_id, adminId });
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

  // Generate a consistent color for the avatar based on student ID
  const getProcessTypeTag = (processType: string | null) => {
    switch (processType) {
      case 'initial':
        return { label: 'Initial', className: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'change_of_status':
        return { label: 'COS', className: 'bg-violet-50 text-violet-700 border-violet-200' };
      case 'transfer':
        return { label: 'Transfer', className: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'resident':
        return { label: 'Resident', className: 'bg-teal-50 text-teal-700 border-teal-200' };
      default:
        return null;
    }
  };

  const getProcessTypeBorder = (processType: string | null) => {
    switch (processType) {
      case 'initial':         return 'border-l-sky-400';
      case 'change_of_status': return 'border-l-violet-400';
      case 'transfer':        return 'border-l-amber-400';
      case 'resident':        return 'border-l-teal-400';
      default:                return 'border-l-gray-200';
    }
  };

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
      className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${getProcessTypeBorder(student.student_process_type ?? null)} p-3 cursor-pointer hover:shadow-md transition-shadow duration-200 relative group`}
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
                <span className={`flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${tag.className}`}>
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

      {/* Scholarship info */}
      {student.scholarship_title && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <GraduationCap className="w-3 h-3 flex-shrink-0" />
          <span className="truncate" title={student.scholarship_title}>{student.scholarship_title}</span>
        </div>
      )}

      {/* Photo + Form tags — específico da coluna Selection Process Payment */}
      {showSelectionTags && (
        <div className="flex flex-col gap-1 mb-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-gray-200 bg-gray-50 text-gray-600">
            <Camera className="w-3 h-3 flex-shrink-0" />
            {student.has_uploaded_photo ? 'Photo uploaded' : 'Pending: photo upload'}
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border border-gray-200 bg-gray-50 text-gray-600">
            <FileText className="w-3 h-3 flex-shrink-0" />
            {student.has_submitted_form ? 'Form submitted' : 'Pending: fill & submit form'}
          </div>
        </div>
      )}

      {/* Footer with badges */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>{getRelativeTime(student.student_created_at)}</span>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {student.total_applications > 0 && (
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
