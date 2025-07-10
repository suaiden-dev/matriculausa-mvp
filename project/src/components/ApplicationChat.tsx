import React, { useRef, useState } from 'react';
import ImagePreviewModal from './ImagePreviewModal';

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  message: string;
  sentAt: string;
  isOwn: boolean;
  status?: 'pending' | 'sent' | 'error';
  attachments?: { file_url: string; file_name?: string; uploaded_at?: string }[];
}

interface ApplicationChatProps {
  messages: ChatMessage[];
  onSend: (text: string, file?: File) => void;
  loading?: boolean;
  isSending?: boolean;
  error?: string | null;
  currentUserId: string;
  messageContainerClassName?: string;
}

interface I20ControlFeeCardProps {
  hasPaid: boolean;
  dueDate: string | null;
  onPay: () => void;
  isExpired: boolean;
  isLoading: boolean;
  paymentDate?: string | null;
}

const I20ControlFeeCard: React.FC<I20ControlFeeCardProps> = ({ hasPaid, dueDate, onPay, isExpired, isLoading, paymentDate }) => {
  const [now, setNow] = React.useState<Date>(new Date());
  React.useEffect(() => {
    if (!dueDate || hasPaid) return;
    const interval = setInterval(() => setNow(new Date()), 1000 * 60);
    return () => clearInterval(interval);
  }, [dueDate, hasPaid]);

  let content = null;
  let badge = null;
  let cardColor = 'border-red-200';
  let titleColor = 'text-red-700';
  let buttonColor = 'bg-red-500 hover:bg-red-600';
  let badgeColor = 'bg-red-100 text-red-700';

  if (hasPaid) {
    badge = <span className="mt-2 inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Paid</span>;
    cardColor = 'border-green-200';
    titleColor = 'text-green-700';
    buttonColor = 'bg-green-500 hover:bg-green-600';
    badgeColor = 'bg-green-100 text-green-700';
    content = (
      <>
        <span className={`font-semibold text-lg ${titleColor}`}>I-20 Control Fee Paid</span>
        {paymentDate && <span className="text-xs text-gray-500 mt-1">Paid on {new Date(paymentDate).toLocaleDateString()}</span>}
        {badge}
      </>
    );
  } else if (isExpired) {
    badge = <span className="mt-2 inline-block bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Expired</span>;
    content = (
      <>
        <span className="font-semibold text-lg text-red-700">I-20 Control Fee Expired</span>
        {badge}
      </>
    );
  } else {
    let timeLeft = '';
    if (dueDate) {
      const due = new Date(dueDate);
      const diff = due.getTime() - now.getTime();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        timeLeft = `${days}d ${hours}h left`;
      }
    }
    badge = <span className={`mt-2 inline-block ${badgeColor} px-3 py-1 rounded-full text-xs font-bold`}>Pending</span>;
    content = (
      <>
        <span className={`font-semibold text-lg ${titleColor}`}>I-20 Control Fee Pending</span>
        {dueDate && <span className="text-xs text-gray-500 mt-1">Due: {new Date(dueDate).toLocaleDateString()} {timeLeft && `(${timeLeft})`}</span>}
        <button
          className={`mt-3 ${buttonColor} text-white px-5 py-2 rounded-full text-base font-bold disabled:opacity-60 transition`}
          onClick={onPay}
          disabled={isLoading}
        >
          {isLoading ? 'Redirecting...' : 'Pay I-20 Control Fee'}
        </button>
        {badge}
      </>
    );
  }
  return (
    <div className={`w-full max-w-md mx-auto mb-8 p-6 bg-white ${cardColor} border-2 rounded-2xl shadow flex flex-col items-center justify-center`}>
      {content}
    </div>
  );
};

const ApplicationChat: React.FC<ApplicationChatProps & {
  i20ControlFee?: {
    hasPaid: boolean;
    dueDate: string | null;
    isExpired: boolean;
    isLoading: boolean;
    onPay: () => void;
    paymentDate?: string | null;
  }
}> = ({
  messages,
  onSend,
  loading = false,
  isSending = false,
  error = null,
  currentUserId,
  i20ControlFee,
  messageContainerClassName,
}) => {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() || file) {
      onSend(text.trim(), file || undefined);
      setText('');
      setFile(null);
    }
  };

  const isImage = (fileName?: string) => {
    if (!fileName) return false;
    const extension = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
  };

  return (
    <>
      {i20ControlFee && (
        <I20ControlFeeCard
          hasPaid={i20ControlFee.hasPaid}
          dueDate={i20ControlFee.dueDate}
          isExpired={i20ControlFee.isExpired}
          isLoading={i20ControlFee.isLoading}
          onPay={i20ControlFee.onPay}
          paymentDate={i20ControlFee.paymentDate}
        />
      )}
      <div className="flex flex-col h-full max-h-[80vh] w-full bg-gray-50 rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Messages */}
        <div className={`flex-1 overflow-y-auto p-3 space-y-2 bg-white ${messageContainerClassName || ''}`} style={{ minHeight: '300px', maxHeight: '60vh' }}>
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-8">No messages yet.</div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${msg.isOwn ? 'self-end items-end' : 'self-start items-start'}`}
            >
              <div
                className={`rounded-lg px-4 py-2 shadow-sm mb-1 text-sm whitespace-pre-line break-words transition-opacity duration-300 ${
                  msg.isOwn
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-900'
                } ${msg.status === 'pending' ? 'opacity-70' : 'opacity-100'}`}
              >
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-2">
                    {msg.attachments.map((att, i) => (
                      <div key={att.file_url + i}>
                        {isImage(att.file_name) ? (
                          <button onClick={() => setSelectedImage(att.file_url)} className="cursor-pointer">
                            <img
                              src={att.file_url}
                              alt={att.file_name || 'Attached image'}
                              className="max-w-xs max-h-48 rounded-md object-cover"
                            />
                          </button>
                        ) : (
                          <a
                            href={att.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                          >
                            <DocumentIcon />
                            <span className="text-sm text-gray-800 break-all">
                              {att.file_name || 'Attachment'}
                            </span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {msg.message}
              </div>
              <div className="flex items-center gap-1.5 pr-1">
                <span className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(msg.sentAt).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.isOwn && msg.status && (
                  <div className="mt-0.5">
                    {msg.status === 'pending' && <ClockIcon />}
                    {msg.status === 'error' && <ErrorIcon />}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {/* Input */}
        <form
          onSubmit={handleSend}
          className="border-t bg-white px-4 py-3 flex items-center gap-2 sticky bottom-0 z-10"
        >
          <label className="flex items-center cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept="*"
            />
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a4 4 0 10-5.656-5.656l-6.586 6.586a6 6 0 108.485 8.485l6.586-6.586" />
              </svg>
            </span>
          </label>
          <input
            type="text"
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-100"
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
            maxLength={1000}
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
            disabled={loading || isSending || (!text.trim() && !file)}
          >
            Send
          </button>
        </form>
        {file && (
          <div className="px-3 py-1 text-xs text-gray-600 bg-gray-100 border-t border-gray-200 flex items-center gap-2">
            <span>Attachment: {file.name}</span>
            <button
              type="button"
              className="text-red-500 hover:underline ml-2"
              onClick={() => setFile(null)}
            >
              Remove
            </button>
          </div>
        )}
        {error && (
          <div className="px-3 py-1 text-xs text-red-600 bg-red-50 border-t border-red-200">{error}</div>
        )}
      </div>

      {selectedImage && (
        <ImagePreviewModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </>
  );
};

const DocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export default ApplicationChat; 