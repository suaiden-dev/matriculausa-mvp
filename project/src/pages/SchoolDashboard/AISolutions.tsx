import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain, Zap, Clock, MessageCircle, Mail, Smartphone, Target, TrendingUp, Shield, Users, FileText, CheckCircle, ArrowRight, Star, Rocket, Settings, BarChart3, Bot, Phone, Send, Heart, History, Cog, Plus, X
} from 'lucide-react';

const AISolutions: React.FC = () => {
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
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#05294E] via-slate-800 to-[#05294E] py-20">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#D0151C]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-[#D0151C] p-3 rounded-2xl">
                <Brain className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              AI Solutions for
              <span className="text-[#D0151C]"> Universities</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Transform your university operations with cutting-edge AI solutions. 
              From student engagement to administrative efficiency, we have the tools you need.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center"></div>
          </div>
        </div>
      </div>




      {/* AI Solutions Section */}
  {/* AI Solutions Section - Accordion/Dropdown */}
  <section className="py-20 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
                  The Only AI Made to <span className="text-[#05294E]">Increase University Enrollments</span>
                </h2>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                  Intelligent service and automation, created specifically for educational institutions. 
                  Transform your student recruitment with cutting-edge AI solutions.
                </p>
              </div>
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
                        onClick={() => setSelectedSolution(selectedSolution === solution.id ? '' : solution.id)}
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
                              <h4 className="text-sm font-semibold text-slate-900 mb-3">Principais funcionalidades:</h4>
                              <div className="space-y-2">
                                {solution.features.map((feature, featureIndex) => (
                                  <div key={featureIndex} className="flex items-start space-x-3">
                                    <CheckCircle className="h-4 w-4 text-[#05294E] mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-slate-600">{feature}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span className="text-xs text-slate-500">{solution.implementation}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Right Side - Selected Solution Image */}
                <div className="hidden lg:block lg:sticky lg:top-8">
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
                          <p className="text-slate-500 font-medium">Selecione uma solução de IA para visualizar</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

      {/* Benefits Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Why Choose Our AI Solutions?
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Our AI solutions are designed to transform your university operations 
              and provide measurable results from day one.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="bg-[#05294E] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <benefit.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{benefit.title}</h3>
                <p className="text-slate-600 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Process Section */}
      <div className="py-20 bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Simple Implementation Process
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Get your AI solution up and running in just 4 simple steps. 
              Our team handles everything from setup to training.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="bg-gradient-to-br from-[#05294E] to-[#D0151C] w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                    <span className="text-white font-bold text-lg">{step.step}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">{step.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{step.description}</p>
                </div>
                {index < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="h-8 w-8 text-[#05294E]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-[#05294E] text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your University?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join hundreds of universities already using our AI solutions. 
            Get started today and see the difference AI can make.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-[#D0151C] text-white px-8 py-4 rounded-2xl font-semibold hover:bg-[#B01218] transition-all duration-300 transform hover:scale-105">
              Request Free Consultation
            </button>
          </div>
          <div className="mt-8 flex items-center justify-center space-x-4 text-blue-200">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-400" />
              <span>4.9/5 Rating</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>500+ Universities</span>
            </div>
            <div className="flex items-center space-x-2">
              <Rocket className="h-5 w-5" />
              <span>48-72h Implementation</span>
            </div>
          </div>
        </div>
      </div>
  </div>
  );
};

export default AISolutions; 