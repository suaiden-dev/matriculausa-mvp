/*
PROMPT PARA IA DESIGNER:

Você é um designer de UI/UX especializado em landing pages para empresas de educação internacional. 
Precisa melhorar o design desta página "For Universities" seguindo estas diretrizes:

OBJETIVO: Página para universidades se tornarem parceiras de uma plataforma de recrutamento internacional

MELHORIAS SOLICITADAS:
1. Layout mais moderno e clean
2. Melhor hierarquia visual
3. Micro-interações e animações sutis
4. Melhor uso de espaçamento e tipografia
5. Cards mais atrativos e interativos
6. Gradientes e cores mais sofisticados
7. Melhor responsividade mobile
8. Elementos visuais mais premium

RESTRIÇÕES:
- NÃO altere o conteúdo/texto existente
- Mantenha as cores da marca (#05294E e #D0151C)
- Preserve toda a funcionalidade existente
- Mantenha a estrutura de seções atual

FOQUE EM:
- Animações CSS/JS sutis
- Melhor uso de sombras e profundidade
- Cards com hover effects mais elegantes
- Tipografia mais moderna
- Layout mais dinâmico
- Elementos visuais premium

NÃO SABE O CONTEÚDO ESPECÍFICO - FOQUE APENAS NO DESIGN VISUAL
*/

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain, Zap, Clock, MessageCircle, Mail, Smartphone, Target, TrendingUp, Shield, Users, FileText, CheckCircle, ArrowRight, Star, Rocket, Settings, BarChart3, Bot, Phone, Send, Heart, History, Cog, Plus, X
} from 'lucide-react';

const AISolutions: React.FC = () => {
  const [selectedSolution, setSelectedSolution] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
      color: 'from-green-500 to-emerald-600'
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
      color: 'from-blue-500 to-indigo-600'
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
      color: 'from-purple-500 to-violet-600'
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
      color: 'from-teal-500 to-cyan-600'
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
      color: 'from-pink-500 to-rose-600'
    },
  ];

  const benefits = [
    {
      icon: Zap,
      title: 'Increased Efficiency',
      description: 'Automate repetitive tasks and reduce manual work by up to 80%'
    },
    {
      icon: Users,
      title: 'Better Student Experience',
      description: 'Provide 24/7 support and personalized assistance to students'
    },
    {
      icon: TrendingUp,
      title: 'Data-Driven Decisions',
      description: 'Get insights and analytics to make informed strategic decisions'
    },
    {
      icon: Shield,
      title: 'Cost Reduction',
      description: 'Reduce operational costs while improving service quality'
    }
  ];

  const processSteps = [
    {
      step: '01',
      title: 'Discovery & Analysis',
      description: 'We analyze your current processes and identify AI opportunities'
    },
    {
      step: '02',
      title: 'Solution Design',
      description: 'We design a customized AI solution for your specific needs'
    },
    {
      step: '03',
      title: 'Implementation',
      description: 'Our team implements the solution in 48-72 hours'
    },
    {
      step: '04',
      title: 'Training & Support',
      description: 'We provide training and ongoing support for your team'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section - Enhanced with premium design */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#05294E] via-slate-800 to-[#05294E] py-24 lg:py-32">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#D0151C]/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-[#05294E]/20 to-[#D0151C]/20 rounded-full blur-3xl animate-pulse"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex justify-center mb-8">
              <div className="bg-gradient-to-br from-[#D0151C] to-[#B01218] p-4 rounded-3xl shadow-2xl transform hover:scale-110 transition-all duration-300">
                <Brain className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight">
              AI Solutions for
              <span className="bg-gradient-to-r from-[#D0151C] to-[#B01218] bg-clip-text text-transparent"> Universities</span>
            </h1>
            <p className="text-xl lg:text-2xl text-blue-100 mb-10 max-w-4xl mx-auto leading-relaxed font-light">
              Transform your university operations with cutting-edge AI solutions. 
              From student engagement to administrative efficiency, we have the tools you need.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button className="group bg-gradient-to-r from-[#D0151C] to-[#B01218] text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-[#D0151C]/25 transform hover:scale-105 transition-all duration-300">
                Get Started
                <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Solutions Section - Enhanced accordion with premium design */}
      <section className="py-24 bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-20 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-8">
              The Only AI Made to <span className="bg-gradient-to-r from-[#05294E] to-[#1e40af] bg-clip-text text-transparent">Increase University Enrollments</span>
            </h2>
            <p className="text-xl lg:text-2xl text-slate-600 max-w-4xl mx-auto font-light leading-relaxed">
              Intelligent service and automation, created specifically for educational institutions. 
              Transform your student recruitment with cutting-edge AI solutions.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left Side - Enhanced Dropdown Accordion */}
            <div className={`${!selectedSolution ? 'min-h-[600px] flex flex-col justify-center' : ''} transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              {aiSolutions.map((solution, index) => (
                <div 
                  key={solution.id}
                  className={`bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 mb-6 overflow-hidden border border-white/20 hover:border-[#05294E]/20 group ${
                    index < aiSolutions.length - 1 ? '' : ''
                  }`}
                >
                  {/* Enhanced Dropdown Header */}
                  <button
                    onClick={() => setSelectedSolution(selectedSolution === solution.id ? '' : solution.id)}
                    className="w-full p-6 flex items-center justify-between transition-all duration-300 hover:bg-gradient-to-r hover:from-[#05294E]/5 hover:to-[#D0151C]/5"
                  >
                    <div className="flex items-center space-x-5">
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 transform"
                        style={{ backgroundColor: "#BCDBFB" }}
                      >
                        <solution.icon className="h-7 w-7 text-[#05294E]" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#05294E] transition-colors">{solution.title}</h3>
                        <p className="text-slate-600 group-hover:text-slate-700 transition-colors">{solution.description}</p>
                      </div>
                    </div>
                    <div className="ml-6">
                      <div className="relative w-6 h-6">
                        <Plus 
                          className={`absolute inset-0 h-6 w-6 text-[#05294E] transition-all duration-300 ${
                            selectedSolution === solution.id 
                              ? 'rotate-45 opacity-0 scale-75' 
                              : 'rotate-0 opacity-100 scale-100'
                          }`} 
                        />
                        <X 
                          className={`absolute inset-0 h-6 w-6 text-[#D0151C] transition-all duration-300 ${
                            selectedSolution === solution.id 
                              ? 'rotate-0 opacity-100 scale-100' 
                              : 'rotate-45 opacity-0 scale-75'
                          }`} 
                        />
                      </div>
                    </div>
                  </button>
                  
                  {/* Enhanced Dropdown Content */}
                  <div 
                    className={`transition-all duration-500 ease-out overflow-hidden ${
                      selectedSolution === solution.id 
                        ? 'max-h-96 opacity-100' 
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-8 pb-8 border-t border-slate-200/50">
                      <div className="pt-6 space-y-6">
                        {/* Enhanced Features List */}
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center">
                            <CheckCircle className="h-4 w-4 text-[#05294E] mr-2" />
                            Principais funcionalidades:
                          </h4>
                          <div className="space-y-3">
                            {solution.features.map((feature, featureIndex) => (
                              <div key={featureIndex} className="flex items-start space-x-3 group">
                                <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0 group-hover:scale-150 transition-transform duration-200"></div>
                                <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 pt-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-4 border border-slate-200/50">
                          <Clock className="h-5 w-5 text-[#05294E]" />
                          <span className="text-sm font-medium text-slate-700">Implementation: {solution.implementation}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Right Side - Enhanced Selected Solution Image */}
            <div className={`hidden lg:block lg:sticky lg:top-8 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="min-h-[600px] flex flex-col justify-center">
                {selectedSolution ? (
                  <div className="w-full">
                    {(() => {
                      const solution = aiSolutions.find(s => s.id === selectedSolution);
                      return solution ? (
                        <div className="relative w-full h-[550px] rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 transition-all duration-500">
                          <img 
                            src={solution.image} 
                            alt={solution.title}
                            className="w-full h-full object-cover transition-all duration-700"
                          />
                          {/* Enhanced overlay with premium gradients */}
                          <div className="absolute inset-0 bg-gradient-to-br from-[#05294E]/50 via-[#05294E]/30 to-[#D0151C]/40 mix-blend-overlay"></div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                          
                          {/* Content overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                            <h3 className="text-2xl font-bold mb-2">{solution.title}</h3>
                            <p className="text-blue-100 opacity-90">{solution.description}</p>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <div className="w-full h-[550px] bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-300 shadow-lg">
                    <div className="text-center">
                      <div className="w-28 h-28 mx-auto mb-6 bg-gradient-to-br from-[#05294E] to-[#1e40af] rounded-3xl flex items-center justify-center shadow-2xl">
                        <Brain className="h-14 w-14 text-white" />
                      </div>
                      <p className="text-slate-500 font-medium text-lg">Selecione uma solução de IA para visualizar</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Benefits Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-20 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8">
              Why Choose Our <span className="bg-gradient-to-r from-[#05294E] to-[#1e40af] bg-clip-text text-transparent">AI Solutions?</span>
            </h2>
            <p className="text-xl lg:text-2xl text-slate-600 max-w-4xl mx-auto font-light leading-relaxed">
              Our AI solutions are designed to transform your university operations 
              and provide measurable results from day one.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div 
                key={index} 
                className={`text-center group transition-all duration-1000 delay-${index * 100} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              >
                <div className="bg-gradient-to-br from-[#05294E] to-[#1e40af] w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:shadow-[#05294E]/25 transform group-hover:scale-110 transition-all duration-300">
                  <benefit.icon className="h-10 w-10 text-white group-hover:rotate-12 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-[#05294E] transition-colors">{benefit.title}</h3>
                <p className="text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Process Section */}
      <div className="py-24 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-20 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8">
              Simple <span className="bg-gradient-to-r from-[#05294E] to-[#1e40af] bg-clip-text text-transparent">Implementation Process</span>
            </h2>
            <p className="text-xl lg:text-2xl text-slate-600 max-w-4xl mx-auto font-light leading-relaxed">
              Get your AI solution up and running in just 4 simple steps. 
              Our team handles everything from setup to training.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step, index) => (
              <div key={index} className="relative group">
                <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-white/50">
                  <div className="bg-gradient-to-br from-[#05294E] to-[#D0151C] w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:shadow-xl transition-all duration-300">
                    <span className="text-white font-bold text-xl">{step.step}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-[#05294E] transition-colors">{step.title}</h3>
                  <p className="text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors">{step.description}</p>
                </div>
                {index < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 group-hover:translate-x-1 transition-transform duration-300">
                    <ArrowRight className="h-10 w-10 text-[#05294E] group-hover:scale-110 transition-transform duration-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced CTA Section */}
      <div className="py-24 bg-gradient-to-br from-[#05294E] via-[#1e40af] to-[#05294E] text-white relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#D0151C]/20 rounded-full blur-xl animate-pulse"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
              Ready to Transform Your University?
            </h2>
            <p className="text-xl lg:text-2xl text-blue-100 mb-10 font-light leading-relaxed">
              Join hundreds of universities already using our AI solutions. 
              Get started today and see the difference AI can make.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <button className="group bg-gradient-to-r from-[#D0151C] to-[#B01218] text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-[#D0151C]/25 transform hover:scale-105 transition-all duration-300">
                Request Free Consultation
                <ArrowRight className="inline-block ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-blue-200">
              <div className="flex flex-col items-center space-y-3 group">
                <div className="w-16 h-16 bg-yellow-400/20 rounded-2xl flex items-center justify-center group-hover:bg-yellow-400/30 transition-colors duration-300">
                  <Star className="h-8 w-8 text-yellow-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <span className="font-semibold text-lg">4.9/5 Rating</span>
              </div>
              <div className="flex flex-col items-center space-y-3 group">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-colors duration-300">
                  <Users className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <span className="font-semibold text-lg">500+ Universities</span>
              </div>
              <div className="flex flex-col items-center space-y-3 group">
                <div className="w-16 h-16 bg-[#D0151C]/20 rounded-2xl flex items-center justify-center group-hover:bg-[#D0151C]/30 transition-colors duration-300">
                  <Rocket className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <span className="font-semibold text-lg">48-72h Implementation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISolutions; 