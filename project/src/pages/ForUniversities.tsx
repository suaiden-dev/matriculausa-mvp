import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUniversityLogos } from '../hooks/useUniversityLogos';
import SmartChat from '../components/SmartChat';
import {
  ForUniversitiesHero,
  ForUniversitiesProcess,
  ForUniversitiesAISolutions,
  ForUniversitiesLaunchOffer,
  ForUniversitiesGuarantee,
  ForUniversitiesResults,
  ForUniversitiesFAQ,
  ForUniversitiesFinalCTA,
  ForUniversitiesScheduleModal
} from '../components/ForUniversities';

const ForUniversities: React.FC = () => {
  const { universities, loading } = useUniversityLogos();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Função para scroll suave para uma seção
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Método simples e direto
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      // Ajustar offset após o scroll
      setTimeout(() => {
        window.scrollBy(0, -100);
      }, 100);
    }
  };


  const handleButtonClick = () => {
    
    // Usar setTimeout para garantir que o DOM esteja renderizado
    setTimeout(() => {
      scrollToSection('final-cta-section');
    }, 100);
  };

  const handleScheduleClick = () => {
    setIsScheduleModalOpen(true);
  };

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <ForUniversitiesHero onButtonClick={handleButtonClick} onScheduleClick={handleScheduleClick} />

      {/* How It Works - 5 Simple Steps */}
      <ForUniversitiesProcess />

      {/* AI Solutions Section */}
      <ForUniversitiesAISolutions />

      {/* Trusted Universities Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#05294E]/3 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 bg-[#D0151C]/3 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-gradient-to-r from-[#05294E]/10 to-[#D0151C]/10 backdrop-blur-sm rounded-full px-6 py-3 mb-8 border border-[#05294E]/20">
              <span className="text-sm font-bold text-slate-700">Trusted Partner Network</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-6 leading-tight">
              Trusted by <span className="text-[#05294E]">Leading Universities</span>
              <br />
              <span className="text-2xl md:text-3xl lg:text-4xl font-normal text-slate-600">Worldwide</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
              Join 75+ prestigious institutions already partnered with MatriculaUSA to recruit 
              high-quality international students and transform their global presence.
            </p>
          </div>

          {/* University Logos Grid */}
          <div className="relative">
            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
                {Array.from({ length: 15 }).map((_, index) => (
                  <div key={index} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                    <div className="animate-pulse">
                      <div className="bg-slate-200 h-20 w-full rounded-xl mb-6"></div>
                      <div className="bg-slate-200 h-4 w-3/4 rounded mx-auto"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* University Cards */}
            {!loading && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
                {universities.map((university, index) => (
                  <div 
                    key={index} 
                    className="group bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#05294E]/20 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2"
                  >
                    <div className="relative h-16 flex items-center justify-center overflow-hidden rounded-xl transition-colors duration-300">
                      {university.isLoading ? (
                        <div className="animate-pulse bg-slate-200 h-full w-full rounded-xl"></div>
                      ) : university.logoUrl ? (
                        <img
                          src={university.logoUrl}
                          alt={`${university.name} logo`}
                          className="max-h-full max-w-36 bg-inherit object-contain filter group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      
                      {/* Fallback Icon */}
                      <div 
                        className={`${university.logoUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full bg-gradient-to-br from-[#05294E] to-slate-700 rounded-xl`}
                        style={{ display: university.logoUrl ? 'none' : 'flex' }}
                      >
                        <span className="text-white font-bold text-lg">U</span>
                      </div>
                    </div>

                    {/* Hover Effect Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#05294E]/5 to-[#D0151C]/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Call to Action */}
            <div className="text-center pt-10">
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-3xl p-8 border border-slate-200 max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                  Join Our Elite Partner Network
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Be part of a select group of universities that are transforming international education. 
                  Start recruiting qualified students from around the world with our proven platform.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Launch Offer Section */}
      <ForUniversitiesLaunchOffer onButtonClick={handleButtonClick} onScheduleClick={handleScheduleClick} />

      {/* Guarantee Section */}
      <ForUniversitiesGuarantee />

      {/* Results & Before/After Section */}
      <ForUniversitiesResults />

      {/* FAQ Section */}
      <ForUniversitiesFAQ onScheduleClick={handleScheduleClick} />

      {/* Final CTA Section */}
      <ForUniversitiesFinalCTA 
        id="final-cta-section"
        onScheduleClick={handleScheduleClick} 
        onButtonClick={handleButtonClick} 
      />

      {/* SmartChat Component */}
      <SmartChat />

      {/* Schedule Modal */}
      <ForUniversitiesScheduleModal 
        isOpen={isScheduleModalOpen} 
        onClose={() => setIsScheduleModalOpen(false)} 
      />
    </div>
  );
};

export default ForUniversities; 