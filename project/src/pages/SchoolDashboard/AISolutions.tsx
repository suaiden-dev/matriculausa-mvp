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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#05294E] rounded-full mb-6">
            <Brain className="h-10 w-10 text-white" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            AI Solutions for{' '}
            <span className="text-[#05294E]">
              Universities
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Transform your university operations with cutting-edge AI solutions. 
            From student engagement to administrative efficiency, we have the tools you need.
          </p>
        </div>

        {/* AI Solutions Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            The Only AI Made to Increase University Enrollments
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto text-center leading-relaxed mb-12">
            Intelligent service and automation, created specifically for educational institutions. 
            Transform your student recruitment with cutting-edge AI solutions.
          </p>
          
          {/* AI Solutions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {aiSolutions.map((solution, index) => (
              <div 
                key={solution.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow hover:border-[#05294E]/20 overflow-hidden"
              >
                {/* Image */}
                <div className="h-48 w-full overflow-hidden">
                  <img 
                    src={solution.image} 
                    alt={solution.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-[#05294E]/10 rounded-lg flex items-center justify-center">
                      <solution.icon className="h-5 w-5 text-[#05294E]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{solution.title}</h3>
                      <p className="text-gray-600 text-sm">{solution.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {solution.features.slice(0, 3).map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-[#05294E] font-medium">
                    <Clock className="h-4 w-4" />
                    <span>Implementation: {solution.implementation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Why Choose Our AI Solutions?
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto text-center leading-relaxed mb-12">
            Our AI solutions are designed to transform your university operations 
            and provide measurable results from day one.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="bg-[#05294E] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <benefit.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Process Section */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Simple Implementation Process
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto text-center leading-relaxed mb-12">
            Get your AI solution up and running in just 4 simple steps. 
            Our team handles everything from setup to training.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="bg-[#05294E] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-white font-bold text-xl">{step.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Ready to Transform Your University?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
            Join hundreds of universities already using our AI solutions. 
            Get started today and see the difference AI can make.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <button className="bg-[#05294E] text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              Request Free Consultation
              <ArrowRight className="inline-block ml-3 h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-gray-600">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center">
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
              <span className="font-semibold text-lg">4.9/5 Rating</span>
            </div>
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <span className="font-semibold text-lg">500+ Universities</span>
            </div>
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
                <Rocket className="h-8 w-8 text-red-500" />
              </div>
              <span className="font-semibold text-lg">48-72h Implementation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISolutions; 