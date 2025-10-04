import React, { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Share2, QrCode } from 'lucide-react';
import { useSystemType } from '../hooks/useSystemType';
import { useSimplifiedFees } from '../hooks/useSimplifiedFees';

interface SimplifiedReferralLinkProps {
  sellerCode: string;
  sellerName: string;
  onFeeSelect?: (fee: number) => void;
  selectedFee?: number;
}

/**
 * Component for simplified system referral links
 * Shows fixed fees and generates referral links
 */
export const SimplifiedReferralLink: React.FC<SimplifiedReferralLinkProps> = ({
  sellerCode,
  sellerName,
  onFeeSelect,
  selectedFee
}) => {
  const { systemType } = useSystemType();
  const { fee350, fee550, fee900, loading } = useSimplifiedFees();
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    // Get base URL from current location
    setBaseUrl(window.location.origin);
  }, []);

  // Only show for simplified system
  if (systemType !== 'simplified') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const fees = [
    { value: fee350, label: 'Basic Package', description: 'Essential services' },
    { value: fee550, label: 'Standard Package', description: 'Most popular choice' },
    { value: fee900, label: 'Premium Package', description: 'Full service package' }
  ];

  const generateReferralLink = (fee: number) => {
    return `${baseUrl}/auth?ref=${sellerCode}&fee=${fee}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareLink = (fee: number) => {
    const link = generateReferralLink(fee);
    const text = `Join me on Matrícula USA! Use my referral link: ${link}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Matrícula USA Referral',
        text: text,
        url: link
      });
    } else {
      copyToClipboard(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Share Your Referral Link</h2>
        <p className="text-gray-600 mt-2">
          Choose a package and share your referral link with students
        </p>
      </div>

      {/* Package Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fees.map((fee) => (
          <div
            key={fee.value}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
              selectedFee === fee.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => onFeeSelect?.(fee.value)}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                ${fee.value}
              </div>
              <div className="text-sm font-medium text-gray-700 mt-1">
                {fee.label}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {fee.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Referral Link Generation */}
      {selectedFee && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Referral Link
          </h3>
          
          <div className="space-y-4">
            {/* Link Display */}
            <div className="flex items-center space-x-2">
              <div className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <code className="text-sm text-gray-700 break-all">
                  {generateReferralLink(selectedFee)}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(generateReferralLink(selectedFee))}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Copy link"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => shareLink(selectedFee)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Link
              </button>
              
              <button
                onClick={() => window.open(generateReferralLink(selectedFee), '_blank')}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Test Link
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Share your referral link with students</li>
                <li>2. Students click the link and register normally</li>
                <li>3. Students will see the fixed fee: ${selectedFee}</li>
                <li>4. You earn commission when they complete payment</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Seller Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold">
              {sellerName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{sellerName}</p>
            <p className="text-sm text-gray-500">Referral Code: {sellerCode}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Component for displaying QR code for referral link
 */
export const SimplifiedReferralQR: React.FC<{ link: string }> = ({ link }) => {
  const [qrCode, setQrCode] = useState<string>('');

  useEffect(() => {
    // Generate QR code using a simple approach
    // In a real implementation, you'd use a QR code library
    const generateQR = async () => {
      try {
        // This is a placeholder - in real implementation, use a QR code library
        setQrCode(`data:image/svg+xml;base64,${btoa(`
          <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="200" fill="white"/>
            <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12">
              QR Code for: ${link}
            </text>
          </svg>
        `)}`);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };

    generateQR();
  }, [link]);

  return (
    <div className="text-center">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">QR Code</h3>
      {qrCode && (
        <div className="inline-block p-4 bg-white border border-gray-200 rounded-lg">
          <img src={qrCode} alt="QR Code" className="w-32 h-32" />
        </div>
      )}
      <p className="text-sm text-gray-500 mt-2">
        Students can scan this QR code to access your referral link
      </p>
    </div>
  );
};
