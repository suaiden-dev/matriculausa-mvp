import React, { useState } from 'react';

interface SmartChatProps {
  isStudentPage?: boolean;
}

const SmartChat: React.FC<SmartChatProps> = ({isStudentPage = false}) => {
  const [isHelpExpanded, setIsHelpExpanded] = useState(false);

  const openChat = () => {
    // Abrir Smart Assistant em uma nova aba
    const smartAssistantUrl = '/smart-assistant';
    window.open(smartAssistantUrl, '_blank', 'noopener,noreferrer');
  };

  const toggleHelp = () => {
    setIsHelpExpanded(!isHelpExpanded);
  };

  return (
    <>
      {/* Botão de Ajuda - Dropdown para cima */}
      <div className="fixed flex items-center gap-3 z-[1000] font-['Montserrat',Arial,sans-serif]"
        style={{
          position: 'fixed',
          bottom: isStudentPage ? '100px' : '20px',
          right: '20px',
          zIndex: 10002,
        }}
      >
        {/* Botão de Ajuda */}
        <div
          onClick={toggleHelp}
          className={`w-16 h-16 rounded-full bg-[#193156] text-white flex items-center justify-center cursor-pointer shadow-[0_0_0_2.5px_#f7f7f7,0_6px_20px_rgba(25,49,86,0.4)] z-[1000] font-['Montserrat',Arial,sans-serif] transition-all duration-300 group relative hover:scale-105 ${
            isHelpExpanded ? 'rotate-180 scale-110' : ''
          }`}
          style={{
            width: '64px',
            height: '64px',
            background: '#193156',
            boxShadow: '0 0 0 2.5px #f7f7f7, 0 6px 20px rgba(25,49,86,0.4)'
          }}
          title={"Help & Support Options"}
        >
          {/* Ícone de Ajuda */}
          <svg 
            width="28" 
            height="28" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`transition-transform duration-300 ${isHelpExpanded ? 'rotate-180' : ''}`}
          >
            {/* Círculo de fundo */}
            <circle cx="12" cy="12" r="12" fill="#193156" />
            
            {/* Borda branca */}
            <circle cx="12" cy="12" r="11" fill="none" stroke="white" strokeWidth="2" />
            
            {/* Interrogação branca */}
            <path 
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" 
              fill="white"
            />
          </svg>
        </div>
      </div>

      {/* Smart Assistant Chat Bubble - Com animação de dropdown */}
      <div
        onClick={openChat}
        className={`fixed w-16 h-16 rounded-full bg-gradient-to-br from-[#193156] via-[#193156] to-[#a41e22] text-[#f7f7f7] flex items-center justify-center cursor-pointer z-[1000] font-['Montserrat',Arial,sans-serif] transition-all duration-500 ease-out group relative hover:scale-105`}
        style={{
          position: 'fixed',
          bottom: isHelpExpanded 
            ? (isStudentPage ? '256px' : '200px') 
            : (isStudentPage ? '100px' : '20px'),
          right: '20px',
          width: '64px',
          height: '64px',
          zIndex: 10001,
          background: 'linear-gradient(135deg, #193156 60%, #a41e22 100%)',
          boxShadow: '0 0 0 2.5px #f7f7f7, 0 6px 20px rgba(10,20,40,0.6)',
          transform: `translateY(${isHelpExpanded ? '0px' : '0px'})`,
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        title="Smart Assistant - Ask me anything!"
      >
        {/* Tooltip */}
        <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-2 px-3 py-1 bg-[#161d29] text-[#f7f7f7] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-[#2e3f60] shadow-lg">
          Smart Assistant
          <div className="absolute top-1/2 left-full transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-[#161d29]"></div>
        </div>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="currentColor"/>
          <path d="M7 9H17V11H7V9ZM7 12H13V14H7V12Z" fill="currentColor"/>
          <circle cx="9" cy="9" r="1" fill="currentColor"/>
          <circle cx="15" cy="9" r="1" fill="currentColor"/>
        </svg>
      </div>

      {/* WhatsApp Button - Com animação de dropdown */}
      <div
        className="fixed rounded-full bg-[#25D366] text-white flex items-center justify-center cursor-pointer shadow-[0_0_0_0,0_6px_20px_rgba(10,20,40,0.6)] z-[1000] font-['Montserrat',Arial,sans-serif] hover:scale-105 transition-all duration-500 ease-out border-[3px] border-white group relative"
        style={{
          position: 'fixed',
          bottom: isHelpExpanded 
            ? (isStudentPage ? '180px' : '120px') 
            : (isStudentPage ? '100px' : '20px'),
          right: '20px',
          width: '64px',
          height: '64px',
          zIndex: 10000,
          backgroundColor: '#25D366',
          boxShadow: '0 0 0 0, 0 6px 20px rgba(10,20,40,0.6)',
          transform: `translateY(${isHelpExpanded ? '0px' : '0px'})`,
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        title="Contact us via WhatsApp"
      >
        {/* Tooltip */}
        <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-2 px-3 py-1 bg-[#161d29] text-[#f7f7f7] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-[#2e3f60] shadow-lg">
          WhatsApp
          <div className="absolute top-1/2 left-full transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-[#161d29]"></div>
        </div>
        <a
          href="https://wa.me/12136762544"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-full flex items-center justify-center"
          aria-label="Contact us via WhatsApp"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="30" height="30" fill="white">
            <path d="M16.001 3.2c-7.11 0-12.8 5.689-12.8 12.8 0 2.226.584 4.344 1.696 6.24L3.2 28.8l6.832-1.744c1.824.96 3.872 1.472 5.969 1.472 7.11 0 12.8-5.689 12.8-12.8s-5.69-12.8-12.8-12.8zm0 23.2c-1.761 0-3.481-.455-5.024-1.328l-.36-.2-4.063 1.04 1.072-3.952-.208-.376c-1.016-1.808-1.552-3.856-1.552-5.936 0-6.065 4.935-11 11-11s11 4.935 11 11-4.936 11-11 11zm6.225-8.145c-.339-.17-2.004-.988-2.316-1.104-.311-.113-.536-.17-.76.17-.226.339-.87 1.104-1.068 1.33-.197.226-.394.254-.733.085s-1.429-.526-2.723-1.678c-1.006-.896-1.684-2.003-1.881-2.343-.197-.34-.021-.522.149-.691.154-.152.339-.395.509-.593.17-.198.226-.34.339-.566.113-.226.057-.425-.028-.593-.084-.17-.76-1.833-1.04-2.512-.273-.654-.55-.566-.76-.577l-.648-.011c-.226 0-.593.085-.903.425s-1.184 1.155-1.184 2.82 1.211 3.267 1.379 3.494c.17.226 2.379 3.632 5.767 5.088.807.348 1.438.557 1.929.713.81.258 1.548.221 2.131.134.65-.097 2.004-.818 2.288-1.608.283-.79.283-1.47.198-1.609-.085-.14-.311-.226-.65-.396z"/>
          </svg>
        </a>
      </div>
    </>
  );
};

export default SmartChat; 