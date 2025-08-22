import React, { useState } from 'react';
import { Share2, Copy, Check, Facebook, Instagram, Send, Mail, MessageSquare, Link2 } from 'lucide-react';

interface ReferralToolsProps {
  sellerProfile: any;
  stats: any;
}

const ReferralTools: React.FC<ReferralToolsProps> = ({ sellerProfile, stats }) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const referralCode = sellerProfile?.referral_code || '';
  const referralUrl = `${window.location.origin}/?ref=${referralCode}`;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      alert('Error copying');
    }
  };

  const messages = {
    whatsapp: `🎓 Want to study in the USA? Meet MatriculaUSA!\n\nWith my referral code ${referralCode}, you have access to exclusive study scholarships and complete support to realize your American dream.\n\n🔗 ${referralUrl}\n\n#StudyInUSA #MatriculaUSA #Education`,
    
    email: `Subject: Realize your dream of studying in the USA!\n\nHello!\n\nI hope you're doing well. I wanted to share an incredible opportunity for those who dream of studying in the United States.\n\nMatriculaUSA is a platform that connects Brazilian students to American universities, offering study scholarships and complete support throughout the entire process.\n\nWith my referral code ${referralCode}, you'll have access to:\n• Exclusive study scholarships\n• Personalized support\n• Simplified process\n• Complete follow-up\n\nAccess now: ${referralUrl}\n\nAny questions, I'm available!\n\nBest regards,\n${sellerProfile?.name}`,
    
    social: `🇺🇸 Dream of studying in the USA? MatriculaUSA can help you!\n\n✅ Exclusive study scholarships\n✅ Personalized support\n✅ Simplified process\n\nUse my code: ${referralCode}\nLink: ${referralUrl}\n\n#StudyInUSA #MatriculaUSA #Education #Opportunity`
  };

  const shareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(messages.whatsapp)}`;
    window.open(url, '_blank');
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`;
    window.open(url, '_blank');
  };

  const shareToEmail = () => {
    const subject = 'Realize your dream of studying in the USA!';
    const body = messages.email;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Referral Tools</h1>
        <p className="mt-1 text-sm text-slate-600">
          Use these tools to share your code and maximize your referrals
        </p>
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-red-50 to-blue-50 rounded-xl border border-red-200 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{stats.totalStudents}</p>
            <p className="text-sm text-slate-600">Students</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{stats.monthlyStudents}</p>
            <p className="text-sm text-slate-600">This Month</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{referralCode}</p>
            <p className="text-sm text-slate-600">Your Code</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">{stats.conversionRate}%</p>
            <p className="text-sm text-slate-600">Conversion</p>
          </div>
        </div>
      </div>

      {/* Quick Share Buttons */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Sharing</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={shareToWhatsApp}
            className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
          >
            <MessageSquare className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-sm font-medium text-slate-900">WhatsApp</span>
          </button>

          <button
            onClick={shareToFacebook}
            className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
          >
            <Facebook className="h-8 w-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-slate-900">Facebook</span>
          </button>

          <button
            onClick={shareToEmail}
            className="flex flex-col items-center p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
          >
            <Mail className="h-8 w-8 text-slate-600 mb-2" />
            <span className="text-sm font-medium text-slate-900">Email</span>
          </button>

          <button
            onClick={() => copyToClipboard(referralUrl, 'link')}
            className="flex flex-col items-center p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group"
          >
            {copiedText === 'link' ? (
              <Check className="h-8 w-8 text-green-600 mb-2" />
            ) : (
              <Link2 className="h-8 w-8 text-red-600 mb-2" />
            )}
            <span className="text-sm font-medium text-slate-900">
              {copiedText === 'link' ? 'Copied!' : 'Copy Link'}
            </span>
          </button>
        </div>
      </div>

      {/* Referral Code and Link */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Referral Code</h3>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-bold text-red-600">{referralCode}</span>
              <button
                onClick={() => copyToClipboard(referralCode, 'code')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                {copiedText === 'code' ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Referral Link</h3>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={referralUrl}
                readOnly
                className="flex-1 bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono"
              />
              <button
                onClick={() => copyToClipboard(referralUrl, 'url')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded transition-colors"
                title="Copy link"
              >
                {copiedText === 'url' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message Templates */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-900">Message Templates</h3>

        {/* WhatsApp Template */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-slate-900 flex items-center">
              <MessageSquare className="h-5 w-5 text-green-600 mr-2" />
              WhatsApp Message
            </h4>
            <button
              onClick={() => copyToClipboard(messages.whatsapp, 'whatsapp')}
              className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              {copiedText === 'whatsapp' ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{messages.whatsapp}</pre>
          </div>
        </div>

        {/* Social Media Template */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-slate-900 flex items-center">
              <Share2 className="h-5 w-5 text-blue-600 mr-2" />
              Social Media
            </h4>
            <button
              onClick={() => copyToClipboard(messages.social, 'social')}
              className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              {copiedText === 'social' ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{messages.social}</pre>
          </div>
        </div>

        {/* Email Template */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-slate-900 flex items-center">
              <Mail className="h-5 w-5 text-slate-600 mr-2" />
              Email Template
            </h4>
            <button
              onClick={() => copyToClipboard(messages.email, 'email')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              {copiedText === 'email' ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{messages.email}</pre>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">💡 Sharing Tips</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">🎯 Be Authentic</h4>
            <p className="text-sm text-slate-600">
              Share your own experience and why you recommend MatriculaUSA
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">📱 Use Multiple Channels</h4>
            <p className="text-sm text-slate-600">
              Share on different platforms to reach more people
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">⏰ Timing Matters</h4>
            <p className="text-sm text-slate-600">
              Share during peak online activity hours (6pm-9pm)
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">👥 Engagement</h4>
            <p className="text-sm text-slate-600">
              Answer questions and maintain active conversations about the topic
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralTools;
