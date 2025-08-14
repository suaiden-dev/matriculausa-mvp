import React, { useState } from 'react';
import {
  Brain, Zap, Clock, MessageCircle, Mail, Smartphone, Target, TrendingUp, Shield, Users, FileText, CheckCircle, ArrowRight, Star, Rocket, Settings, BarChart3, Bot, Phone, Send, Heart, History, Cog
} from 'lucide-react';

const ForUniversitiesAISolutions: React.FC = () => {
  const [selectedSolution, setSelectedSolution] = useState<string>('');

  const aiSolutions = [
    {
      id: 'whatsapp',
      title: 'WhatsApp AI Assistant',
      description: 'Automate WhatsApp customer service with intelligent AI',
      icon: MessageCircle,
      image: '/freepik__the-style-is-candid-image-photography-with-natural__75620.png',
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
      color: 'from-orange-500 to-red-600'
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
    }
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
    <section className="py-24 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* AI Solutions Section */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiSolutions.map((solution) => (
            <div 
              key={solution.id}
              className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden border border-slate-200 cursor-pointer"
              onClick={() => setSelectedSolution(solution.id)}
            >
              {/* Image Section */}
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={solution.image} 
                  alt={solution.title}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${solution.color} opacity-20`}></div>
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm w-12 h-12 rounded-xl flex items-center justify-center">
                  <solution.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              
              {/* Content Section */}
              <div className="p-6">
                <h4 className="text-xl font-bold mb-3 text-slate-900">{solution.title}</h4>
                <p className="text-slate-600 mb-4 leading-relaxed text-sm">{solution.description}</p>
                
                <div className="space-y-2 mb-4">
                  {solution.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-xs text-slate-600">{feature}</span>
                    </div>
                  ))}
                  {solution.features.length > 3 && (
                    <div className="text-xs text-slate-500">
                      +{solution.features.length - 3} more features
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-500">{solution.implementation}</span>
                  </div>
                  <div 
                    className={`bg-gradient-to-r ${solution.color} text-white px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity`}
                  >
                    Learn more
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Why Choose Our AI Solutions?
            </h3>
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
                <h4 className="text-xl font-bold text-slate-900 mb-4">{benefit.title}</h4>
                <p className="text-slate-600 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Process Section */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Simple Implementation Process
            </h3>
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
                  <h4 className="text-xl font-bold text-slate-900 mb-4">{step.title}</h4>
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
    </section>
  );
};

export default ForUniversitiesAISolutions;
