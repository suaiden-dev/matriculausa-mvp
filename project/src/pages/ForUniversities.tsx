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

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Globe, 
  Users, 
  FileText, 
  TrendingUp, 
  Target, 
  CheckCircle, 
  Award, 
  Building2, 
  GraduationCap,
  ArrowRight,
  Star,
  Shield,
  Zap,
  Heart,
  Phone,
  Mail,
  MessageCircle,
  Smartphone,
  Bot,
  BarChart3
} from 'lucide-react';
import SmartChat from '../components/SmartChat';
import { useAuth } from '../hooks/useAuth';

const ForUniversities: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Função para determinar o destino do botão
  const getButtonDestination = () => {
    if (!isAuthenticated) {
      return '/register';
    }
    
    if (user?.role === 'school') {
      return '/school/dashboard';
    }
    
    return '/';
  };

  const handleButtonClick = () => {
    navigate(getButtonDestination());
  };

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-50 via-blue-50 to-red-50 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-[#05294E]/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#D0151C]/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center">
            <div className="inline-flex items-center bg-white/80 backdrop-blur-sm rounded-full px-6 py-2 mb-8 border border-[#05294E]/20 shadow-lg">
              <Building2 className="h-4 w-4 mr-2 text-[#05294E]" />
              <span className="text-sm font-bold text-slate-700">University Partnership</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-8 leading-tight text-slate-900">
              Recruit Quality
              <br />
              <span className="text-[#05294E]">International Students</span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-10 text-slate-600 leading-relaxed max-w-4xl mx-auto">
              Partner with MatriculaUSA to diversify your campus with high-caliber international students. 
              Our platform streamlines the recruitment process and connects you with qualified candidates worldwide.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button
                onClick={handleButtonClick}
                className="group bg-[#D0151C] text-white px-10 py-5 rounded-2xl text-xl font-black hover:bg-[#B01218] transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center justify-center"
              >
                Become Our Partner
                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Unique Platform Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Our <span className="text-[#05294E]">Unique Platform</span> Features
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Discover what makes MatriculaUSA different from traditional recruitment agencies
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-3xl border border-blue-200 hover:shadow-xl transition-all duration-300">
              <div className="bg-[#05294E] w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Smart Document Processing</h3>
              <p className="text-slate-600 leading-relaxed">
                Our AI-powered system automatically reviews and organizes student documents, ensuring completeness before submission to your university.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-3xl border border-green-200 hover:shadow-xl transition-all duration-300">
              <div className="bg-[#D0151C] w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Real-Time Chat Support</h3>
              <p className="text-slate-600 leading-relaxed">
                Students get instant support through our intelligent chat system, reducing your administrative burden and improving application quality.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-8 rounded-3xl border border-purple-200 hover:shadow-xl transition-all duration-300">
              <div className="bg-[#05294E] w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Secure Payment System</h3>
              <p className="text-slate-600 leading-relaxed">
                Integrated Stripe payment processing for application fees, scholarship fees, and other charges - all handled securely on our platform.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-8 rounded-3xl border border-orange-200 hover:shadow-xl transition-all duration-300">
              <div className="bg-[#D0151C] w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Target className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Pre-Matched Applications</h3>
              <p className="text-slate-600 leading-relaxed">
                Our algorithm matches students with programs based on their academic background, ensuring higher acceptance rates and better fit.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-8 rounded-3xl border border-teal-200 hover:shadow-xl transition-all duration-300">
              <div className="bg-[#05294E] w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Performance Analytics</h3>
              <p className="text-slate-600 leading-relaxed">
                Get detailed insights into application performance, student engagement, and recruitment success rates through our dashboard.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-8 rounded-3xl border border-rose-200 hover:shadow-xl transition-all duration-300">
              <div className="bg-[#D0151C] w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Student Success Focus</h3>
              <p className="text-slate-600 leading-relaxed">
                We prioritize student success with comprehensive support throughout the entire application and enrollment process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Solutions Section */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              AI-Powered <span className="text-[#05294E]">Solutions</span> for Universities
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Transform your university operations with cutting-edge AI solutions designed specifically for educational institutions
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">WhatsApp AI Assistant</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Automate WhatsApp customer service with intelligent AI responses, 24/7 support, and seamless integration with your university database.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">Multi-language support</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">Sentiment analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">48-72h implementation</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Email AI Management</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Intelligent email management with automatic categorization, context-based responses, and integration with your university CRM.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">Priority analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">Performance reports</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">48-72h implementation</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="bg-gradient-to-br from-purple-500 to-violet-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Smartphone className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">SMS AI Campaigns</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Intelligent and personalized SMS campaigns with automatic student segmentation and real-time engagement analysis.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">Student segmentation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">Academic calendar integration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">48-72h implementation</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Advanced AI Chatbot</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Intelligent chatbot for websites and applications with natural conversations and integration with academic systems.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">Natural conversations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">Multi-language support</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">72-96h implementation</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="bg-gradient-to-br from-teal-500 to-cyan-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">AI Analytics & Insights</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Predictive analysis and insights for strategic decisions with automated personalized reports and intelligent alerts.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">Predictive enrollment analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">Real-time dashboard</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">96-120h implementation</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">AI Document Processing</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Intelligent processing of academic documents with automatic data extraction, validation, and advanced OCR capabilities.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">Automatic data extraction</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">Document validation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">72-96h implementation</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <button className="bg-gradient-to-r from-[#05294E] to-[#D0151C] text-white px-8 py-4 rounded-2xl font-semibold hover:scale-105 transition-all duration-300 shadow-lg">
              View All AI Solutions
            </button>
          </div>
        </div>
      </section>

      {/* Trusted Universities Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Trusted by <span className="text-[#05294E]">Leading Universities</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Join 75+ institutions already partnered with MatriculaUSA
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[
              'Adelphi University', 'Anderson University', 'Campbellsville University', 'Cumberland University',
              'Fairleigh Dickinson University', 'Florida Tech', 'Purdue University', 'Radford University',
              'Liberty University', 'Hult International Business School', 'Webster University', 'Murray State University'
            ].map((university, index) => (
              <div key={index} className="bg-white p-4 rounded-2xl border border-slate-200 hover:shadow-lg transition-all duration-300">
                <div className="bg-[#05294E] w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xs font-semibold text-slate-900 text-center leading-tight">{university}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Get Started Section */}
      <section className="py-24 bg-gradient-to-br from-slate-50 via-blue-50 to-red-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Ready to <span className="text-[#05294E]">Transform</span> Your Recruitment?
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Join leading universities worldwide and start receiving high-quality international student applications today.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Right Side - CTA & Contact Info */}
            <div className="space-y-8 lg:col-span-2">
              <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">
                  Start Your Partnership Today
                </h3>
                
                <div className="space-y-6">
                  <button
                    onClick={handleButtonClick}
                    className="w-full bg-gradient-to-r from-[#D0151C] to-[#B01218] text-white py-6 px-8 rounded-2xl font-bold text-xl hover:scale-105 transition-all duration-300 flex items-center justify-center shadow-lg group"
                  >
                    <Building2 className="mr-3 h-7 w-7 group-hover:rotate-12 transition-transform" />
                    Get Started Now
                    <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  </button>
                  
                  <div className="text-center space-y-3">
                    <p className="text-slate-600 text-sm">Join 75+ universities already partnered with us</p>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="flex -space-x-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="w-8 h-8 bg-gradient-to-br from-[#05294E] to-[#D0151C] rounded-full border-2 border-white flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-white" />
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-slate-500">Trusted by leading institutions</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Contact Methods */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-500 w-10 h-10 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">W</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">WhatsApp</p>
                      <p className="text-sm text-slate-600">+1 (213) 676-2544</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-500 w-10 h-10 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">M</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Messenger</p>
                      <p className="text-sm text-slate-600">matriculausa</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center space-x-3">
                    <div className="bg-slate-500 w-10 h-10 rounded-full flex items-center justify-center">
                      <Phone className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Phone</p>
                      <p className="text-sm text-slate-600">+1 (213) 676-2544</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
                  <div className="flex items-center space-x-3">
                    <div className="bg-red-500 w-10 h-10 rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Email</p>
                      <p className="text-sm text-slate-600">info@matriculausa.com</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SmartChat />
    </div>
  );
};

export default ForUniversities; 