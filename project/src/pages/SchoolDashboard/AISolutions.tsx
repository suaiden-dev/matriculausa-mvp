import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain, Zap, Clock, MessageCircle, Mail, Smartphone, Target, TrendingUp, Shield, Users, FileText, CheckCircle, ArrowRight, Star, Rocket, Settings, BarChart3, Bot, Phone, Send, Heart, History, Cog
} from 'lucide-react';

const AISolutions: React.FC = () => {
  const [selectedSolution, setSelectedSolution] = useState<string>('');

  const aiSolutions = [
    {
      id: 'whatsapp',
      title: 'WhatsApp AI Assistant',
      description: 'Automate WhatsApp customer service with intelligent AI',
      icon: MessageCircle,
      image: '/freepik__closeup-of-a-smartphone-showcasing-an-automated-te__75623.png',
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
      image: '/freepik__the-style-is-candid-image-photography-with-natural__75620.png',
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
    },
    {
      id: 'student-matching',
      title: 'AI Student Matching',
      description: 'Intelligent matching between students and programs',
      icon: Target,
      image: '/freepik__the-style-is-candid-image-photography-with-natural__75627.jpeg',
      features: [
        'Academic profile analysis',
        'Personalized recommendations',
        'Academic success prediction',
        'Scholarship matching',
        'Slot optimization'
      ],
      implementation: '96-120 hours',
      color: 'from-indigo-500 to-purple-600'
    },
    {
      id: 'automation',
      title: 'Process Automation',
      description: 'Intelligent automation of administrative processes',
      icon: Settings,
      image: '/freepik__the-style-is-candid-image-photography-with-natural__75628.jpeg',
      features: [
        'Workflow automation',
        'System integration',
        'Manual task reduction',
        'Real-time monitoring',
        'Efficiency reports'
      ],
      implementation: '120-144 hours',
      color: 'from-slate-500 to-gray-600'
    },
    {
      id: 'voice-assistant',
      title: 'AI Voice Assistant',
      description: 'Voice assistant for phone support',
      icon: Phone,
      image: '/freepik__futuristic-ai-voice-assistant-device-with-a-hologr__75630.jpeg',
      features: [
        'Natural voice support',
        'Multi-language recognition',
        'Telephony system integration',
        'Automatic transcription',
        'Voice sentiment analysis'
      ],
      implementation: '96-120 hours',
      color: 'from-yellow-500 to-amber-600'
    },
    {
      id: 'predictive-maintenance',
      title: 'Predictive Maintenance',
      description: 'Predictive maintenance for infrastructure',
      icon: Shield,
      image: '/freepik__the-style-is-candid-image-photography-with-natural__75629.jpeg',
      features: [
        'Equipment monitoring',
        'Maintenance alerts',
        'Resource optimization',
        'Downtime reduction',
        'Efficiency reports'
      ],
      implementation: '144-168 hours',
      color: 'from-emerald-500 to-green-600'
    },
    {
      id: 'content-generation',
      title: 'AI Content Generation',
      description: 'Automatic generation of academic content',
      icon: FileText,
      image: '/freepik__the-style-is-candid-image-photography-with-natural__75631.jpeg',
      features: [
        'Course description generation',
        'Promotional material creation',
        'Content personalization',
        'SEO optimization',
        'Multiple output formats'
      ],
      implementation: '72-96 hours',
      color: 'from-cyan-500 to-blue-600'
    },
    {
      id: 'sentiment-analysis',
      title: 'Sentiment Analysis',
      description: 'Sentiment analysis in feedback and social media',
      icon: Heart,
      image: '/freepik__the-style-is-candid-image-photography-with-natural__75632.jpeg',
      features: [
        'Social media monitoring',
        'Student feedback analysis',
        'Reputation crisis alerts',
        'Satisfaction reports',
        'Improvement insights'
      ],
      implementation: '48-72 hours',
      color: 'from-rose-500 to-pink-600'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/school/dashboard/ai-settings" className="bg-[#D0151C] text-white px-8 py-4 rounded-2xl font-semibold hover:bg-[#B01218] transition-all duration-300 transform hover:scale-105">
                Configure AI Settings
              </Link>
              <Link to="/school/dashboard/ai-conversations" className="bg-white text-[#05294E] px-8 py-4 rounded-2xl font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105">
                View AI Conversations
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Active AI Features Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Active AI Features
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              These AI features are currently available and ready to use in your university.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <Link to="/school/dashboard/ai-settings" className="group">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 text-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <Cog className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">AI Email Management</h3>
                <p className="text-blue-100 mb-6">
                  Configure intelligent email responses and automation for your university inbox.
                </p>
                <div className="flex items-center text-blue-100 group-hover:text-white transition-colors">
                  <span className="font-semibold">Configure Settings</span>
                  <ArrowRight className="h-5 w-5 ml-2" />
                </div>
              </div>
            </Link>

            <Link to="/school/dashboard/ai-conversations" className="group">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-8 text-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <History className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">AI Conversations</h3>
                <p className="text-green-100 mb-6">
                  View and analyze all AI-processed email conversations and responses.
                </p>
                <div className="flex items-center text-green-100 group-hover:text-white transition-colors">
                  <span className="font-semibold">View History</span>
                  <ArrowRight className="h-5 w-5 ml-2" />
                </div>
              </div>
            </Link>

            <Link to="/school/dashboard/inbox" className="group">
              <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-3xl p-8 text-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <Mail className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Smart Inbox</h3>
                <p className="text-purple-100 mb-6">
                  Manage your emails with AI assistance and automated responses.
                </p>
                <div className="flex items-center text-purple-100 group-hover:text-white transition-colors">
                  <span className="font-semibold">Open Inbox</span>
                  <ArrowRight className="h-5 w-5 ml-2" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* AI Solutions Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Future AI Solutions
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Choose from our range of AI solutions designed specifically for educational institutions. 
              Each solution is customizable and can be implemented in 48-72 hours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {aiSolutions.map((solution) => (
              <div 
                key={solution.id}
                className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 overflow-hidden border border-slate-200"
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
                  <h3 className="text-xl font-bold mb-3 text-slate-900">{solution.title}</h3>
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
                    <div className={`bg-gradient-to-r ${solution.color} text-white px-3 py-1 rounded-full text-xs font-medium`}>
                      Learn more
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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