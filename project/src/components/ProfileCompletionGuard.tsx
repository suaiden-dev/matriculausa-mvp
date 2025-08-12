import React from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
  isProfileCompleted: boolean | undefined;
  title?: string;
  description?: string;
}

const ProfileCompletionGuard: React.FC<ProfileCompletionGuardProps> = ({ 
  children, 
  isProfileCompleted,
  title = "Profile setup required",
  description = "Complete your university profile to access this feature"
}) => {
  // Verificação mais rigorosa: mostrar guard se profile_completed não for explicitamente true
  if (isProfileCompleted !== true) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Settings className="h-10 w-10 text-orange-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">{title}</h3>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          {description}
        </p>
        <Link
          to="/school/setup-profile"
          className="bg-gradient-to-r from-[#05294E] to-blue-700 text-white px-8 py-4 rounded-xl hover:from-[#05294E]/90 hover:to-blue-600 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Complete University Profile
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProfileCompletionGuard;


