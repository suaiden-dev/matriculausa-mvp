import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import StoriesCarousel from '../ui/StoriesCarousel';

const ForUniversitiesProcess: React.FC = () => {
  // Estado para controlar quais esferas estão animadas
  const [animatedSpheres, setAnimatedSpheres] = useState<boolean[]>(new Array(5).fill(false));
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Hook para observar scroll e animar esferas
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-step-index') || '0');
            setAnimatedSpheres(prev => {
              const newState = [...prev];
              newState[index] = true;
              return newState;
            });
          }
        });
      },
      {
        threshold: 0.3, // Anima quando 30% da seção está visível
        rootMargin: '-50px 0px -50px 0px' // Margem para ajustar o ponto de ativação
      }
    );

    // Observar cada seção
    stepRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      stepRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  // Fechar preview com ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Carousel data for step 1
  const step1CarouselStories = [
    {
      id: "step-1",
      image: "step_1_creation_scholarships.png",
      title: "Basic Information",
      description: "Fill in the essential details for your scholarship or course."
    },
    {
      id: "step-2",
      image: "step_2_creation_scholarships.png",
      title: "Financial Details",
      description: "Set values, discounts, and payment options."
    },
    {
      id: "step-3",
      image: "step_3_creation_scholarships.png",
      title: "Eligibility & Requirements",
      description: "Establish eligibility criteria and requirements."
    },
    {
      id: "step-4",
      image: "step_4_creation_scholarships.png",
      title: "Benefits & Options",
      description: "Highlight the benefits and available options."
    }
  ];

  // Carousel data for step 4
  const step4CarouselStories = [
    {
      id: "step-4-1",
      image: "student_application_1.png",
      title: "Team Review",
      description: "University team reviewing pre-qualified student applications with detailed profiles."
    },
    {
      id: "step-4-2", 
      image: "student_application_2.png",
      title: "Student Selection",
      description: "Final selection process with qualified candidates ready for enrollment."
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Publish Opportunities",
      description: "Register courses and scholarships, defining admission criteria",
      imageAlt: "University administrator creating scholarship opportunity on MatriculaUSA platform",
      imagePlaceholder: "https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/step-by-step/scholarships_all.png",
      side: "left"
    },
    {
      number: "2", 
      title: "Global Promotion",
      description: "We promote to millions of qualified candidates ready to enroll",
      imageAlt: "Global network showing students from different countries accessing opportunities",
      imagePlaceholder: "scholarships_2.png",
      side: "right"
    },
    {
      number: "3",
      title: "AI Filtering", 
      description: "Our exclusive AI eliminates candidates outside your profile",
      imageAlt: "AI system analyzing and filtering student applications automatically",
      imagePlaceholder: "student_management.png",
      side: "left"
    },
    {
      number: "4",
      title: "Ready Leads Delivery",
      description: "Your team selects only the best students",
      imageAlt: "University team reviewing pre-qualified student applications",
      imagePlaceholder: "https://images.pexels.com/photos/7688465/pexels-photo-7688465.jpeg?auto=compress&cs=tinysrgb&w=800",
      side: "right"
    },
    {
      number: "5",
      title: "Continuous Optimization",
      description: "ROI reports and automatic adjustments to increase conversion",
      imageAlt: "Analytics dashboard showing recruitment performance and ROI metrics",
      imagePlaceholder: "create_new_agent.png",
      side: "left"
    }
  ];

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            How It Works - <span className="text-[#05294E]">5 Simple Steps</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Our proven process makes international student recruitment simple, efficient, and results-driven
          </p>
        </div>
        
        {/* Process Steps - Split Screen Layout with Timeline */}
        <div className="relative">
          {/* Vertical Timeline Line */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-1 bg-slate-200 transform -translate-x-1/2 z-0"></div>
          
          {/* Animated Timeline Progress */}
          <div 
            className="hidden lg:block absolute left-1/2 top-0 w-1 bg-gradient-to-b from-[#05294E] via-[#05294E] to-[#D0151C] transform -translate-x-1/2 z-0 transition-all duration-1000 ease-out"
            style={{
              height: `${(animatedSpheres.filter(Boolean).length / steps.length) * 100}%`
            }}
          ></div>
          
          <div className="space-y-32">
            {steps.map((step, index) => (
              <div 
                key={index}
                ref={(el) => { stepRefs.current[index] = el; }}
                data-step-index={index}
                className={`relative flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${
                  step.side === 'right' ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* Timeline Node */}
                <div className="hidden lg:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className={`w-8 h-8 bg-white border-4 border-[#05294E] rounded-full shadow-lg overflow-hidden relative ${
                    animatedSpheres[index] ? 'animate-pulse' : ''
                  }`}>
                    {/* Círculo de fundo branco */}
                    <div className="absolute inset-0 bg-white rounded-full"></div>
                    
                    {/* Círculo preenchido animado */}
                    <div 
                      className={`absolute inset-0 bg-gradient-to-br from-[#05294E] to-[#0a3a5c] rounded-full transition-all duration-1000 ease-out ${
                        animatedSpheres[index] ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                      }`}
                      style={{
                        transformOrigin: 'center center',
                        transitionDelay: `${index * 200}ms` // Delay escalonado para efeito cascata
                      }}
                    ></div>
                    
                    {/* Efeito de brilho */}
                    {animatedSpheres[index] && (
                      <div className="absolute inset-0 bg-white rounded-full opacity-30 animate-ping" 
                           style={{ animationDuration: '2s', animationIterationCount: '1' }}></div>
                    )}
                  </div>
                </div>

                {/* Content Side */}
                <div className="flex-1 space-y-6">
                  {/* Step Number */}
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-[#05294E] text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">
                      {step.number}
                    </div>
                    <div className="h-px bg-[#05294E] flex-1 max-w-20"></div>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                    {step.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
                    {step.description}
                  </p>
                </div>
                
                {/* Image Side */}
                <div className="flex-1">
                  {index === 0 ? (
                    /* First step with carousel */
                    <StoriesCarousel 
                      stories={step1CarouselStories}
                      autoPlay={true}
                      autoPlayInterval={3000}
                      className="w-full"
                      onImageClick={(url) => setPreviewImage(url)}
                    />
                  ) : index === 3 ? (
                    /* Fourth step with carousel */
                    <StoriesCarousel 
                      stories={step4CarouselStories}
                      autoPlay={true}
                      autoPlayInterval={4000}
                      className="w-full"
                      onImageClick={(url) => setPreviewImage(url)}
                    />
                  ) : (
                    /* Other steps with regular image */
                    <div className="relative group">
                      {/* Main Image Container */}
                      <div className={`relative overflow-hidden rounded-3xl shadow-2xl ${(index === 1 || index === 2 || index === 4) ? 'bg-slate-100 h-80 md:h-96 flex items-center justify-center' : 'bg-slate-100'}`}>
                        <img
                          src={step.imagePlaceholder}
                          alt={step.imageAlt}
                          className={`${(index === 1 || index === 2 || index === 4) ? 'max-h-full max-w-full object-contain bg-white p-4 rounded-2xl shadow-lg cursor-zoom-in' : 'w-full h-80 md:h-96 object-cover cursor-zoom-in'} transition-transform duration-700 group-hover:scale-105`}
                          style={(index === 1 || index === 2 || index === 4) ? {margin: 'auto'} : {}}
                          onClick={() => setPreviewImage(step.imagePlaceholder)}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://via.placeholder.com/600x400/${step.side === 'left' ? '05294E' : 'D0151C'}/ffffff?text=Step+${step.number}`;
                          }}
                        />
                        
                        {/* Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${(index === 1 || index === 2 || index === 4) ? 'pointer-events-none' : ''}`}></div>
                      </div>
                      
                      {/* Floating Element */}
                      <div className={`absolute -bottom-6 ${step.side === 'left' ? '-right-6' : '-left-6'} bg-white rounded-2xl p-4 shadow-xl border border-slate-200 max-w-48`}>
                        <div className="text-sm font-semibold text-slate-900">
                          {index === 4 ? 'Use AI to Scale Your Business' : step.title}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          {index === 1 ? '40,000+ students found their perfect scholarship' : 
                           index === 4 ? 'Leverage artificial intelligence to grow enrollment' : 'Automated Process'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
              </div>
            ))}
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="text-center mt-24">
          <div className="bg-slate-50 rounded-3xl p-8 md:p-12 border border-slate-200 max-w-2xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              Ready to Start Your Recruitment Journey?
            </h3>
            <p className="text-slate-600 mb-8 leading-relaxed text-lg">
              Join hundreds of universities already growing with our proven 5-step process
            </p>
            <button className="bg-[#05294E] hover:bg-[#D0151C] text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 shadow-lg flex items-center mx-auto group">
              Start My Free Trial
              <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Preview de Imagem */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage}
              alt="Preview"
              className="w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
            <button
              className="absolute top-3 right-3 bg-white/90 hover:bg-white text-slate-900 text-sm font-semibold px-3 py-1.5 rounded-lg shadow"
              onClick={() => setPreviewImage(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default ForUniversitiesProcess;
