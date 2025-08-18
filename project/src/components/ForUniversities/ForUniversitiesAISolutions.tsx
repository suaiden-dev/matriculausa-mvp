import React, { useState } from 'react';
import {
  Brain, MessageCircle, Mail, Smartphone, FileText, CheckCircle, BarChart3, Bot, Plus, X
} from 'lucide-react';

const ForUniversitiesAISolutions: React.FC = () => {
  const [selectedSolution, setSelectedSolution] = useState<string>('');

  const aiSolutions = [
    {
      id: 'whatsapp',
      title: 'WhatsApp AI Assistant',
      description: 'Automate WhatsApp customer service with intelligent AI',
      icon: MessageCircle,
      image: '/pexels-cottonbro-5053740.jpg',
      features: [
        '24/7 automatic responses',
        'Integration with university database',
        'Multi-language support',
        'Sentiment analysis',
        'Escalation to humans when needed'
      ],
      implementation: '48-72 hours',
    },
    {
      id: 'email',
      title: 'Email AI Management',
      description: 'Intelligent email management and response system',
      icon: Mail,
      image: '/freepik__a-futuristic-smart-email-management-system-with-ai__75621.png',
      features: [
        'Automatic email categorization',
        'Context-based personalized responses',
        'Integration with university CRM',
        'Priority and urgency analysis',
        'Performance reports'
      ],
      implementation: '48-72 hours',
    },
    {
      id: 'sms',
      title: 'SMS AI Campaigns',
      description: 'Intelligent and personalized SMS campaigns',
      icon: Smartphone,
      image: '/freepik__closeup-of-a-smartphone-showcasing-an-automated-te__75623.png',
      features: [
        'Automatic student segmentation',
        'Personalized messages by profile',
        'Real-time engagement analysis',
        'Academic calendar integration',
        'Regulatory compliance'
      ],
      implementation: '48-72 hours',
    },
    {
      id: 'chatbot',
      title: 'Advanced AI Chatbot',
      description: 'Intelligent chatbot for websites and applications',
      icon: Bot,
      image: '/freepik__friendly-ai-chatbot-interface-with-soft-blue-tones__75624.png',
      features: [
        'Natural and contextual conversations',
        'Integration with academic systems',
        'Multi-language support',
        'User intent analysis',
        'Enrollment calendar integration'
      ],
      implementation: '72-96 hours',
    },
    {
      id: 'analytics',
      title: 'AI Analytics & Insights',
      description: 'Predictive analysis and insights for strategic decisions',
      icon: BarChart3,
      image: '/freepik__data-analytics-dashboard-with-ai-insights-business__75625.png',
      features: [
        'Predictive enrollment analysis',
        'Behavior pattern identification',
        'Automated personalized reports',
        'Intelligent alerts',
        'Real-time executive dashboard'
      ],
      implementation: '96-120 hours',
    },
    {
      id: 'document-processing',
      title: 'AI Document Processing',
      description: 'Intelligent processing of academic documents',
      icon: FileText,
      image: '/freepik__artificial-intelligence-analyzing-documents-with-d__75626.png',
      features: [
        'Automatic data extraction',
        'Document validation',
        'Advanced OCR for documents',
        'Automatic classification',
        'Legacy system integration'
      ],
      implementation: '72-96 hours',
    }
  ];

  const toggleSolution = (solutionId: string) => {
    setSelectedSolution(selectedSolution === solutionId ? '' : solutionId);
  };

  return (
    <section className="py-24 bg-slate-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            The Only AI Made to <span className="text-[#05294E]">Increase University Enrollments</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Intelligent service and automation, created specifically for educational institutions. 
            Transform your student recruitment with cutting-edge AI solutions.
          </p>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* Left Side - Dropdown Accordion */}
          <div className={`${!selectedSolution ? 'min-h-[600px] flex flex-col justify-center' : ''}`}>
            {aiSolutions.map((solution, index) => (
              <div 
                key={solution.id}
                className={`bg-inherit overflow-hidden transition-all duration-300 ${
                  index < aiSolutions.length - 1 ? 'border-b border-slate-200' : ''
                }`}
              >
                {/* Dropdown Header */}
                <button
                  onClick={() => toggleSolution(solution.id)}
                  className="w-full p-5 flex items-center justify-between transition-colors duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: "#BCDBFB" }}
                    >
                      <solution.icon className="h-6 w-6 text-[#05294E]" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-slate-900">{solution.title}</h3>
                      <p className="text-sm text-slate-600">{solution.description}</p>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="relative w-5 h-5">
                      <Plus 
                        className={`absolute inset-0 h-5 w-5 text-[#05294E] transition-all duration-300 ${
                          selectedSolution === solution.id 
                            ? 'rotate-45 opacity-0' 
                            : 'rotate-0 opacity-100'
                        }`} 
                      />
                      <X 
                        className={`absolute inset-0 h-5 w-5 text-[#D0151C] transition-all duration-300 ${
                          selectedSolution === solution.id 
                            ? 'rotate-0 opacity-100' 
                            : 'rotate-45 opacity-0'
                        }`} 
                      />
                    </div>
                  </div>
                </button>

                {/* Dropdown Content */}
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    selectedSolution === solution.id 
                      ? 'max-h-96 opacity-100' 
                      : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-6 pb-6 border-t border-slate-200">
                    <div className="pt-4 space-y-4">
                      {/* Features List */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Key Features:</h4>
                        <div className="space-y-2">
                          {solution.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex items-start space-x-3">
                              <CheckCircle className="h-4 w-4 text-[#05294E] mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-slate-600">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Side - Selected Solution Image */}
          <div className="lg:sticky lg:top-8">
            <div className="min-h-[600px] flex flex-col justify-center">
              {selectedSolution ? (
                <div className="w-full">
                  {(() => {
                    const solution = aiSolutions.find(s => s.id === selectedSolution);
                    return solution ? (
                      <div className="relative w-full h-[550px] rounded-2xl overflow-hidden">
                        <img 
                          src={solution.image} 
                          alt={solution.title}
                          className="w-full h-full object-cover transition-all duration-500"
                        />
                        {/* Overlay com cores da paleta */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#05294E]/40 via-[#05294E]/20 to-[#D0151C]/30 mix-blend-overlay"></div>
                        {/* Overlay adicional para harmonizar */}
                        <div className="absolute inset-0 bg-[#05294E]/10"></div>
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : (
                <div className="w-full h-[550px] bg-slate-100 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-[#05294E] rounded-2xl flex items-center justify-center">
                      <Brain className="h-12 w-12 text-white" />
                    </div>
                    <p className="text-slate-500 font-medium">Select an AI solution to preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForUniversitiesAISolutions;
