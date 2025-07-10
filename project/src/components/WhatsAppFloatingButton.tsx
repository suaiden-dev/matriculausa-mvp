import React from 'react';
import { MessageCircle } from 'lucide-react';

interface WhatsAppFloatingButtonProps {
  phoneNumber?: string;
  className?: string;
}

const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({ 
  phoneNumber = "12136762544", 
  className = "" 
}) => {
  const whatsappUrl = `https://wa.me/${phoneNumber}`;

  return (
    <>
      {/* Área de proteção para o botão */}
      <div className="floating-whatsapp-area" />
      
      {/* Botão flutuante WhatsApp */}
      <div 
        className={`floating-whatsapp-button ${className}`}
        data-testid="cart-icon"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 99999,
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            backgroundColor: '#25D366',
            color: 'white',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid white',
            boxShadow: '0 8px 32px rgba(37, 211, 102, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            zIndex: 99999,
            minWidth: '60px',
            minHeight: '60px',
            textDecoration: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(37, 211, 102, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(37, 211, 102, 0.3)';
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onTouchStart={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
          aria-label="Contact us via WhatsApp"
        >
          <MessageCircle style={{ width: '28px', height: '28px', color: 'white' }} />
        </a>
      </div>
    </>
  );
};

export default WhatsAppFloatingButton; 