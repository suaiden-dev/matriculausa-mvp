import React, { useRef, useEffect, useCallback } from 'react';
import { Brain, MessageSquare } from 'lucide-react';

interface TabNavigationProps {
  activeTab: 'agents' | 'whatsapp';
  onTabChange: (tab: 'agents' | 'whatsapp') => void;
}

export const TabNavigation = ({ activeTab, onTabChange }: TabNavigationProps) => {
  const tabNavRef = useRef<HTMLElement>(null);

  // Hook para detectar overflow nas abas
  useEffect(() => {
    const checkOverflow = () => {
      if (tabNavRef.current) {
        const hasOverflow = tabNavRef.current.scrollWidth > tabNavRef.current.clientWidth;
        tabNavRef.current.classList.toggle('has-overflow', hasOverflow);
      }
    };

    // Verificar overflow inicial
    checkOverflow();

    // Verificar overflow quando a janela é redimensionada
    const handleResize = () => {
      setTimeout(checkOverflow, 100);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activeTab]);

  // Hook para gerenciar o efeito fade dinâmico das abas
  useEffect(() => {
    const scrollContainer = tabNavRef.current;

    const handleScroll = () => {
      if (!scrollContainer) return;

      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
      const isOverflowing = scrollWidth > clientWidth;

      if (!isOverflowing) {
        scrollContainer.classList.remove('is-scrolled-from-start', 'is-scrolled-to-end');
      } else {
        const isAtStart = scrollLeft === 0;
        const isAtEnd = scrollLeft + clientWidth >= scrollWidth;

        scrollContainer.classList.toggle('is-scrolled-from-start', !isAtStart);
        scrollContainer.classList.toggle('is-scrolled-to-end', isAtEnd);
      }
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      handleScroll(); // Verificar estado inicial

      const handleResize = () => {
        setTimeout(handleScroll, 100);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [activeTab]);

  return (
    <div className="mb-4 md:mb-6">
      <div className="border-b border-gray-200">
        <nav 
          ref={tabNavRef}
          className={`-mb-px flex space-x-6 md:space-x-8 overflow-x-auto whitespace-nowrap scrollbar-hide tab-scroll-container bg-white horizontal-scroll-fade ${
            activeTab === 'whatsapp' ? 'whatsapp-active' : ''
          }`}
        >
          <button
            onClick={() => onTabChange('agents')}
            className={`flex-shrink-0 py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-1.5 md:gap-2 ${
              activeTab === 'agents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Brain className="h-3.5 w-3.5 md:h-4 md:w-4" />
            AI Agents
          </button>
          <button
            onClick={() => onTabChange('whatsapp')}
            className={`flex-shrink-0 py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-1.5 md:gap-2 ${
              activeTab === 'whatsapp'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4" />
            WhatsApp Connection
          </button>
        </nav>
      </div>
    </div>
  );
};