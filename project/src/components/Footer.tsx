import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation(['common']);

  // Footer links rely on global scroll-to-top in App

  return (
    <footer className="bg-white text-[#05294E] relative overflow-hidden footer-custom-14">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-16 pb-16">
        {/* Legal Disclaimer */}
        <div className="mb-8 md:mb-12 pb-6 md:pb-8 border-b border-[#05294E]/10 text-slate-600 text-xs sm:text-sm leading-relaxed">
          <h4 className="text-slate-900 font-bold text-sm sm:text-base mb-2">Legal Disclaimer</h4>
          <p>
            MatriculaUSA is not a law firm, does not offer legal advice, does not guarantee approval, and does not represent the client before consulates or USCIS. Human support is only operational. We offer educational consulting and school application assistance only.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 md:gap-12">

          {/* Coluna 1: A Plataforma */}
          <div className="space-y-6 col-start-1 lg:col-auto">
            <h3 className="text-xl font-bold text-slate-900">{t('footer.sections.platform')}</h3>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-slate-600 hover:text-[#05294E] transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.company.about')}</Link></li>
              <li><Link to="/how-it-works" className="text-slate-600 hover:text-[#05294E] transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.students.howItWorks')}</Link></li>
              <li><Link to="/for-students" className="text-slate-600 hover:text-[#05294E] transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.students.forStudents')}</Link></li>
              <li><Link to="/for-universities" className="text-slate-600 hover:text-[#05294E] transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.universities.title')}</Link></li>
            </ul>
          </div>

          {/* Coluna 2: Ajuda e Contato */}
          <div className="space-y-6 col-start-2 lg:col-auto">
            <h3 className="text-xl font-bold text-slate-900">{t('footer.sections.helpContact')}</h3>
            <ul className="space-y-3">
              <li><Link to="/help" className="text-slate-600 hover:text-[#05294E] transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.students.helpCenter')}</Link></li>
              <li><Link to="/faq" className="text-slate-600 hover:text-[#05294E] transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.students.faq')}</Link></li>
              <li><Link to="/contact" className="text-slate-600 hover:text-[#05294E] transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.company.contact')}</Link></li>
              <li><Link to="/selection-fee-registration?ref=TFOE" className="text-slate-600 hover:text-[#05294E] transition-colors hover:translate-x-1 transform duration-200 block">Checkout</Link></li>
            </ul>
          </div>

          {/* Coluna 3: Explore */}
          <div className="space-y-6 col-start-1 lg:col-auto">
            <h3 className="text-xl font-bold text-slate-900">{t('footer.sections.explore')}</h3>
            <ul className="space-y-3">
              <li><Link to="/scholarships" className="text-slate-600 hover:text-[#05294E] transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.students.scholarships')}</Link></li>
              <li><Link to="/schools" className="text-slate-600 hover:text-[#05294E] transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.universities.partners')}</Link></li>
              <li><Link to="/matricula-rewards" className="text-slate-600 hover:text-[#05294E] transition-colors hover:translate-x-1 transform duration-200 block">{t('footer.students.matriculaRewards')}</Link></li>
              <li><Link to="/affiliate/register" className="text-slate-600 hover:text-[#05294E] transition-colors hover:translate-x-1 transform duration-200 block">Torne-se Afiliado</Link></li>
            </ul>
          </div>

          {/* Coluna 4: Redes Sociais */}
          <div className="space-y-6 col-start-1 lg:col-auto">
            <h3 className="text-xl font-bold text-slate-900">{t('footer.sections.followUs')}</h3>
            <div className="flex space-x-5">
              <a href="https://facebook.com/matriculausa" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-[#05294E] transition-all duration-300">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://www.instagram.com/matriculausa?igsh=MWJram91MGhxMXloOQ==" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-[#05294E] transition-all duration-300">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

        </div>

        {/* Barra inferior */}
        <div className="border-t border-[#05294E]/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2">
              <img src="/favicon-branco.png" alt="Matrícula USA" className="h-7 w-auto" />
              <p className="text-center md:text-left">
                {t('footer.copyright')}
              </p>
              <div className="flex space-x-6">
                <Link to="/privacy-policy" className="hover:text-[#05294E] transition-colors duration-200">
                  {t('footer.legal.privacy')}
                </Link>
                <Link to="/terms-of-service" className="hover:text-[#05294E] transition-colors duration-200">
                  {t('footer.legal.terms')}
                </Link>
              </div>
            </div>
            <p className="text-center md:text-right font-medium text-slate-500 text-sm">
              {t('footer.madeWithLove')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
