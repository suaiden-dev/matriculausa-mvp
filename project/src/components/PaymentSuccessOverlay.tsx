import React from 'react';
import { useTranslation } from 'react-i18next';
import TransactionAnimation from './TransactionAnimation';

interface PaymentSuccessOverlayProps {
  isSuccess: boolean;
  title: string;
  message: string;
}

const PaymentSuccessOverlay: React.FC<PaymentSuccessOverlayProps> = ({
  isSuccess,
  title,
  message
}) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4">
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-white/20" />
      
      {/* Conteúdo com animação */}
      <div className="relative z-20 flex flex-col items-center w-full max-w-2xl mx-auto">
        <TransactionAnimation isSuccess={isSuccess} />
        
        {/* Mensagem abaixo da animação */}
        <div className="mt-8 text-center animate-textContainer px-4 max-w-lg">
          <h2 className={`text-2xl md:text-3xl font-bold mb-3 animate-titleSlide ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
            {title}
          </h2>
          <p className="text-slate-700 text-base md:text-lg mb-2 animate-messageSlide">
            {message}
          </p>
          <p className="text-slate-500 text-sm animate-redirectSlide">
            {t('successPages.common.redirecting')}
          </p>
        </div>

        <style>{`
          @keyframes textContainerFade {
            0% {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes titleSlideIn {
            0% {
              opacity: 0;
              transform: translateY(-15px);
              filter: blur(2px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
              filter: blur(0);
            }
          }

          @keyframes messageSlideIn {
            0% {
              opacity: 0;
              transform: translateX(-20px);
              filter: blur(1px);
            }
            100% {
              opacity: 1;
              transform: translateX(0);
              filter: blur(0);
            }
          }

          @keyframes redirectSlideIn {
            0% {
              opacity: 0;
              transform: translateY(10px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-textContainer {
            animation: textContainerFade 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 2s both;
          }

          .animate-titleSlide {
            animation: titleSlideIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 2.8s both;
          }

          .animate-messageSlide {
            animation: messageSlideIn 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) 3.4s both;
          }

          .animate-redirectSlide {
            animation: redirectSlideIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 4.2s both;
          }

          /* Animações de saída suaves */
          .text-exit {
            animation: fadeOut 0.4s ease-in-out forwards;
          }

          @keyframes fadeOut {
            0% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            100% {
              opacity: 0;
              transform: translateY(-10px) scale(0.98);
            }
          }

          /* Melhor responsividade para textos */
          @media (max-width: 640px) {
            .animate-textContainer {
              margin-top: 1.5rem;
              padding: 0 1rem;
            }
          }

          @media (max-width: 360px) {
            .animate-textContainer {
              margin-top: 1rem;
              padding: 0 0.75rem;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default PaymentSuccessOverlay;