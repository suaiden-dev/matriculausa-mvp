import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { useAuthToken } from '../../hooks/useAuthToken';
import { GraphService } from '../../lib/services/GraphService';
import { User, Mail, LogOut, Loader2 } from 'lucide-react';

interface UserProfileData {
  displayName: string;
  mail: string;
  userPrincipalName: string;
}

export default function MicrosoftUserProfile() {
  const { instance, accounts } = useMsal();
  const { getToken } = useAuthToken();
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (accounts.length > 0) {
      loadUserProfile();
    }
  }, [accounts]);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const accessToken = await getToken();
      const graphService = new GraphService(accessToken);
      const profile = await graphService.getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    instance.logoutPopup({
      postLogoutRedirectUri: window.location.origin,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span className="text-gray-600">Carregando perfil...</span>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {userProfile.displayName}
            </h3>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Mail className="w-3 h-3" />
              <span>{userProfile.mail || userProfile.userPrincipalName}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  );
}
