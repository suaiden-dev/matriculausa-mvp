import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModal } from '../contexts/ModalContext';
import type { UserProfile } from '../hooks/useAuth';
import type { User } from '../types';
import ScholarshipDetailView from './ScholarshipDetailView';

interface ScholarshipDetailModalProps {
  scholarship: any;
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile | null;
  user?: User | null;
  userRole?: string | null;
}

const ScholarshipDetailModal: React.FC<ScholarshipDetailModalProps> = ({
  scholarship,
  isOpen,
  onClose,
  userProfile,
  user,
  userRole
}) => {
  const { openModal, closeModal } = useModal();

  React.useEffect(() => {
    if (isOpen) {
      openModal();
      const originalOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        closeModal();
        document.body.style.overflow = originalOverflow || '';
        document.documentElement.style.overflow = originalHtmlOverflow || '';
      };
    }
  }, [isOpen, openModal, closeModal]);

  if (!scholarship) return null;

  // Trava de segurança para bolsas de teste (is_test)
  const isUorakUser = user?.email?.toLowerCase().endsWith('@uorak.com') || (userProfile as any)?.email?.toLowerCase().endsWith('@uorak.com');
  const isAdmin = userRole === 'admin';
  
  if (scholarship?.is_test && !isUorakUser && !isAdmin) {
    return null;
  }

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2.5 bg-white/80 hover:bg-white text-slate-900 shadow-lg rounded-full transition-all z-20 backdrop-blur-sm border border-slate-200 active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex-1 overflow-y-auto">
              <ScholarshipDetailView
                scholarship={scholarship}
                userProfile={userProfile}
                user={user}
                userRole={userRole}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ScholarshipDetailModal;
