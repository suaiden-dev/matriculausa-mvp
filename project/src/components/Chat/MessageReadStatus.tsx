import React from 'react';

interface MessageReadStatusProps {
    isRead: boolean;
    isSent: boolean;
    className?: string;
}

const MessageReadStatus: React.FC<MessageReadStatusProps> = ({
    isRead,
    isSent,
    className = ''
}) => {
    if (!isSent) return null;

    if (isRead) {
        // WhatsApp Official Blue Double Check
        return (
            <div className={`flex items-center text-[#34B7F1] ${className}`} title="Visualizado">
                <svg width="22" height="14" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M11.01 3.3L6.47 8.12L3.82 5.92L3.01 6.74L6.47 9.61L11.83 4.12L11.01 3.3Z"
                        fill="currentColor"
                    />
                    <path
                        d="M15.01 3.3L10.47 8.12L7.82 5.92L7.01 6.74L10.47 9.61L15.83 4.12L15.01 3.3Z"
                        fill="currentColor"
                    />
                </svg>
            </div>
        );
    }

    // WhatsApp Official Single Check
    // Usamos currentColor para permitir que o pai controle a cor do cinza (ex: text-slate-400 no inbox ou text-white/70 no chat)
    return (
        <div className={`flex items-center ${className}`} title="Enviado">
            <svg width="18" height="14" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M10 3.3L5.46 8.12L2.81 5.92L2 6.74L5.46 9.61L10.82 4.12L10 3.3Z"
                    fill="currentColor"
                />
            </svg>
        </div>
    );
};

export default MessageReadStatus;
