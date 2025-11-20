import React, { useState, useEffect } from 'react';
import { Copy, Check, Link as LinkIcon, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAffiliateAdminId } from '../../hooks/useAffiliateAdminId';

/**
 * Component for Direct Sales link generation
 * Shows the Direct Sales referral link for admin advertisements
 * Only shows if the admin has a Direct Sales seller configured
 */
const DirectSalesLink: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [directSalesSeller, setDirectSalesSeller] = useState<{
    referral_code: string;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { affiliateAdminId, affiliateAdminInfo } = useAffiliateAdminId();
  const isSimplified = affiliateAdminInfo?.system_type === 'simplified';

  useEffect(() => {
    // Get base URL from current location
    setBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    const loadDirectSalesSeller = async () => {
      if (!affiliateAdminId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Buscar sellers que são Direct Sales (sem user_id, apenas vinculados ao affiliate_admin)
        const { data, error } = await supabase
          .from('sellers')
          .select('referral_code, name')
          .eq('affiliate_admin_id', affiliateAdminId)
          .is('user_id', null) // Direct Sales sellers não têm user_id
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao buscar Direct Sales seller:', error);
          setDirectSalesSeller(null);
        } else if (data) {
          setDirectSalesSeller({
            referral_code: data.referral_code,
            name: data.name
          });
        } else {
          setDirectSalesSeller(null);
        }
      } catch (err) {
        console.error('Erro ao carregar Direct Sales seller:', err);
        setDirectSalesSeller(null);
      } finally {
        setLoading(false);
      }
    };

    loadDirectSalesSeller();
  }, [affiliateAdminId]);

  const generateDirectSalesLink = () => {
    if (!directSalesSeller) return '';
    return `${baseUrl}/register?ref=${directSalesSeller.referral_code}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Não mostrar o componente se não houver Direct Sales configurado
  if (loading) {
    return null; // Ou um loading spinner se preferir
  }

  if (!directSalesSeller) {
    return null; // Não mostrar se não houver Direct Sales configurado
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <LinkIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Direct Sales Link</h2>
          <p className="text-sm text-gray-500">For advertisement campaigns</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Direct Sales - {directSalesSeller.name}</h3>
            {isSimplified ? (
              <p className="text-sm text-blue-800">
                Students who register through this link must provide dependents information (0-5 dependents).
              </p>
            ) : (
              <p className="text-sm text-blue-800">
                Students who register through this link will automatically receive Package 3 
                (${4500} scholarship range) and must provide dependents information.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Link Display */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Registration Link
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <code className="text-sm text-gray-700 break-all">
              {generateDirectSalesLink()}
            </code>
          </div>
          <button
            onClick={() => copyToClipboard(generateDirectSalesLink())}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
            title="Copy link"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        {copied && (
          <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
            <Check className="w-4 h-4" />
            Link copied to clipboard!
          </p>
        )}
      </div>

      {/* Technical Details */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Referral Code:</strong> {directSalesSeller.referral_code}</p>
          {!isSimplified && (
            <p><strong>Package:</strong> Package 3 (${4500} scholarship range)</p>
          )}
          <p><strong>Dependents:</strong> Required (0-5 dependents)</p>
        </div>
      </div>
    </div>
  );
};

export default DirectSalesLink;

