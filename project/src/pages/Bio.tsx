import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ClipboardCheck, Instagram, Linkedin } from 'lucide-react';
import LanguageSelector from '../components/LanguageSelector';
import WhatsAppIcon from '../components/icons/WhatsApp';

const BioPage: React.FC = () => {
  const { t } = useTranslation(['common']);

  const links = [
    {
      title: t('bio.site'),
      url: '/',
      icon: Globe,
      color: 'hover:border-blue-500 hover:text-blue-600',
      external: false,
    },
    {
      title: 'WhatsApp',
      url: 'https://wa.me/12136762544',
      icon: WhatsAppIcon,
      color: 'hover:border-emerald-500 hover:text-emerald-600',
      external: true,
    },
    {
      title: t('bio.quiz'),
      url: '/pre-qualification',
      icon: ClipboardCheck,
      color: 'hover:border-red-500 hover:text-red-600',
      external: false,
    },
  ];

  const socials = [
    { icon: Instagram, url: 'https://instagram.com/matriculausa', label: 'Instagram' },
    { icon: Linkedin, url: 'https://www.linkedin.com/company/matriculausa', label: 'LinkedIn' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05294E] from-50% to-[#1b4360] flex flex-col justify-between py-12 px-4 sm:px-6 relative overflow-hidden">
      {/* Seletor de Idioma no Topo Direito */}
      <div className="absolute top-4 right-4 z-20 bg-white rounded-xl border border-slate-200/80 p-0.5 shadow-md hover:shadow-lg transition-all duration-200">
        <LanguageSelector variant="compact" showLabel={false} />
      </div>

      <div className="max-w-md md:max-w-xl w-full mx-auto flex-grow flex flex-col justify-center items-center z-10 gap-8">
        {/* Header da Página */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center w-40 h-40 bg-white rounded-full shadow-md border border-slate-100 mb-8 transition-transform duration-500 hover:scale-105 p-4 mx-auto overflow-hidden">
            <img
              src="/logo.png.png"
              alt="Matrícula USA Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="mt-4 text-sm text-blue-100 font-medium max-w-xs md:max-w-md mx-auto opacity-90 leading-relaxed">
            {t('bio.description')}
          </p>
        </div>

        {/* Links Principais */}
        <div className="w-full space-y-4">
          {links.map((link, index) => {
            const Icon = link.icon;
            const isExternal = link.external;
            
            return (
              <a
                key={index}
                href={link.url}
                target={isExternal ? '_blank' : '_self'}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className={`relative flex items-center justify-center py-5 px-16 bg-white rounded-full border border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group w-full ${link.color}`}
              >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 bg-slate-50 rounded-full group-hover:bg-current/5 transition-colors flex items-center justify-center">
                  <Icon className="w-5 h-5 text-slate-600 group-hover:text-inherit transition-colors" />
                </div>
                <span className="font-bold text-slate-800 text-base group-hover:text-inherit transition-colors text-center">
                  {link.title}
                </span>
              </a>
            );
          })}
        </div>

        {/* Links de Redes Sociais */}
        <div className="flex items-center space-x-6">
          {socials.map((social, idx) => {
            const Icon = social.icon;
            return (
              <a
                key={idx}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-white rounded-full border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-400 hover:shadow-sm transition-all duration-200"
                aria-label={social.label}
              >
                <Icon className="w-5 h-5" />
              </a>
            );
          })}
        </div>
      </div>

      {/* Footer simples no rodapé da página */}
      <div className="text-center mt-12 text-[11px] text-slate-400 font-semibold tracking-wider uppercase z-10">
        {t('bio.copyright', { year: new Date().getFullYear() })}
      </div>
    </div>
  );
};

export default BioPage;
