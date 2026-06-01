import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const FooterCTA: React.FC = () => {
  const { t } = useTranslation(['common', 'home']);

  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-16 pb-2 md:pb-4">
        <Link
          to="/selection-fee-registration"
          className="group relative block overflow-hidden bg-gradient-to-br from-[#05294E] via-[#0A3669] to-[#2E5BBF] text-white rounded-2xl md:rounded-3xl px-6 sm:px-10 md:px-14 py-10 md:py-14 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          {/* University image — right side, fades into navy via mask + multiply blend */}
          <div className="absolute inset-y-0 right-0 w-1/2 md:w-2/3 pointer-events-none">
            <img
              src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/college_friends_enjoying_the_sun_%20campus_walk.webp"
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-80 transition-transform duration-700 group-hover:scale-105"
              style={{
                WebkitMaskImage:
                  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 30%, #000 70%)',
                maskImage:
                  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 30%, #000 70%)',
              }}
            />
          </div>

          {/* Decorative glow */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#D0151C]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-2xl">
            <span className="inline-block bg-[#D0151C] text-white text-[11px] md:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
              {t('footerCTA.badge', 'Oferta por tempo limitado')}
            </span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black leading-tight mb-3 tracking-tight">
              {t('footerCTA.title', 'Garanta sua vaga no Processo Seletivo')}
            </h2>
            <p className="text-sm md:text-base text-blue-100/90 leading-relaxed mb-4">
              {t(
                'footerCTA.description',
                'Desbloqueie acesso completo às bolsas, candidate-se a múltiplas universidades e dê o primeiro passo rumo aos EUA.'
              )}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-blue-100/70 text-sm">{t('footerCTA.priceLabel', 'A partir de')}</span>
              <span className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight">$400</span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
};

export default FooterCTA;
