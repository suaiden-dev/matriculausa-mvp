import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  
  // Footer links rely on global scroll-to-top in App

  return (
    <footer className="bg-[#05294E] text-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#D0151C]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center">
              <img 
                src="/favicon-branco.png" 
                alt="Matrícula USA" 
                className="h-10 w-auto"
              />
            </div>
            <p className="text-slate-300 leading-relaxed">
              {t('footer.company.description')}
            </p>
            
            <div className="flex space-x-4">
              <a href="https://facebook.com/matriculausa" target="_blank" rel="noopener noreferrer" className="bg-white/10 backdrop-blur-sm p-3 rounded-xl hover:bg-white/20 transition-all duration-300 group">
                <Facebook className="h-5 w-5 text-slate-300 group-hover:text-white" />
              </a>
              <a href="https://twitter.com/matriculausa" target="_blank" rel="noopener noreferrer" className="bg-white/10 backdrop-blur-sm p-3 rounded-xl hover:bg-white/20 transition-all duration-300 group">
                <Twitter className="h-5 w-5 text-slate-300 group-hover:text-white" />
              </a>
              <a href="https://www.instagram.com/matriculausa?igsh=MWJram91MGhxMXloOQ==" target="_blank" rel="noopener noreferrer" className="bg-white/10 backdrop-blur-sm p-3 rounded-xl hover:bg-white/20 transition-all duration-300 group">
                <Instagram className="h-5 w-5 text-slate-300 group-hover:text-white" />
              </a>
              <a href="https://linkedin.com/company/matriculausa" target="_blank" rel="noopener noreferrer" className="bg-white/10 backdrop-blur-sm p-3 rounded-xl hover:bg-white/20 transition-all duration-300 group">
                <Linkedin className="h-5 w-5 text-slate-300 group-hover:text-white" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <Zap className="h-5 w-5 mr-2 text-[#D0151C]" />
              {t('footer.company.title')}
            </h3>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.company.about')}</Link></li>
              <li><Link to="/schools" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.universities.partners')}</Link></li>
              <li><Link to="/for-universities" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.universities.title')}</Link></li>
              <li><Link to="/scholarships" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 flex items-center">
                {t('footer.students.scholarships')} <Zap className="ml-1 h-3 w-3 text-yellow-400" />
              </Link></li>
              <li><Link to="/matricula-rewards" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 flex items-center">
                {t('footer.students.matriculaRewards')} <Zap className="ml-1 h-3 w-3 text-yellow-400" />
              </Link></li>
              <li><Link to="/how-it-works" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.students.howItWorks')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">{t('footer.students.support')}</h3>
            <ul className="space-y-3">
              <li><Link to="/faq" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.students.faq')}</Link></li>
              <li><Link to="/contact-us" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.company.contact')}</Link></li>
              <li><Link to="/help-center" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.students.helpCenter')}</Link></li>
              <li><Link to="/privacy-policy" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.legal.privacy')}</Link></li>
              <li><Link to="/terms-of-service" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.legal.terms')}</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">{t('footer.company.contact')}</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 group">
                <div className="bg-[#D0151C]/20 p-2 rounded-lg group-hover:bg-[#D0151C]/30 transition-colors">
                  <Mail className="h-5 w-5 text-[#D0151C]" />
                </div>
                <span className="text-slate-300">{t('footer.contact.email')}</span>
              </div>
              <div className="flex items-center space-x-3 group">
                <div className="bg-green-600/20 p-2 rounded-lg group-hover:bg-green-600/30 transition-colors">
                  <Phone className="h-5 w-5 text-green-400" />
                </div>
                <span className="text-slate-300">{t('footer.contact.phone')}</span>
              </div>
              <div className="flex items-center space-x-3 group">
                <div className="bg-[#D0151C]/20 p-2 rounded-lg group-hover:bg-[#D0151C]/30 transition-colors">
                  <MapPin className="h-5 w-5 text-[#D0151C]" />
                </div>
                <span className="text-slate-300">{t('footer.contact.address')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-slate-400 text-sm">
              {t('footer.copyright')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;