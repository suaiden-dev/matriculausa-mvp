import React, { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Share2, Link as LinkIcon, Package } from 'lucide-react';

/**
 * Component for Direct Sales link generation
 * Shows the SUAIDEN referral link for admin advertisements
 * Package 3 is automatically applied to students who register with this link
 */
const DirectSalesLink: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const referralCode = 'SUAIDEN';
  const packageNumber = 3;

  useEffect(() => {
    // Get base URL from current location
    setBaseUrl(window.location.origin);
  }, []);

  const generateDirectSalesLink = () => {
    // Link simples: apenas o código SUAIDEN (o sistema detecta automaticamente e aplica Package 3)
    return `${baseUrl}/register?ref=${referralCode}`;
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

  const shareLink = () => {
    const link = generateDirectSalesLink();
    const text = `Join Matrícula USA! Register using this link: ${link}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Matrícula USA - Direct Registration',
        text: text,
        url: link
      }).catch((err) => {
        console.error('Error sharing:', err);
        copyToClipboard(link);
      });
    } else {
      copyToClipboard(link);
    }
  };

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
            <h3 className="font-semibold text-blue-900 mb-1">Automatic Package 3</h3>
            <p className="text-sm text-blue-800">
              Students who register through this link will automatically receive Package 3 
              (${4500} scholarship range) and must provide dependents information.
            </p>
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

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={shareLink}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Link
        </button>
        
        <button
          onClick={() => window.open(generateDirectSalesLink(), '_blank')}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Test Link
        </button>
      </div>

      {/* Technical Details */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Referral Code:</strong> {referralCode}</p>
          <p><strong>Package:</strong> Package 3 (${4500} scholarship range)</p>
          <p><strong>Dependents:</strong> Required (minimum 1)</p>
        </div>
      </div>
    </div>
  );
};

export default DirectSalesLink;

