import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "react-i18next";

interface ConversionButtonProps {
  title?: string;
  description?: string;
  buttonText?: string;
  showReferralBadge?: boolean;
  gradientClass?: string;
  hideBenefits?: boolean;
  variant?: 'full' | 'minimal' | 'banner';
}



const ConversionButton: React.FC<ConversionButtonProps> = ({
  title,
  description,
  buttonText,
  showReferralBadge = false,
  gradientClass = "gradient-primary",
  hideBenefits = false,
  variant = 'full',
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const handleClick = () => {
    if (user) {
      // Usuário autenticado: redireciona para dashboard com modal aberto
      navigate('/student/dashboard/overview?openModal=selection_process');
    } else {
      // Usuário não autenticado: redireciona para registro com parâmetro de redirecionamento
      // para abrir o modal automaticamente após o login/registro
      const returnUrl = encodeURIComponent('/student/dashboard/overview?openModal=selection_process');
      
      // ✅ FALLBACK: Salvar no localStorage caso os parâmetros da URL se percam no fluxo de auth
      localStorage.setItem('pending_open_modal', 'selection_process');
      
      navigate(`/auth?mode=register&redirect=${returnUrl}`);
    }
  };

  if (variant === 'minimal') {
    return (
      <div className="flex flex-col items-center gap-4 mt-12 animate-fade-up">
        <h3 className="text-xl font-bold text-foreground text-center">
          {title}
        </h3>
        <button
          onClick={handleClick}
          className={`w-full sm:w-auto min-w-[240px] ${gradientClass} hover:opacity-90 text-primary-foreground font-bold py-3 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-95`}
        >
          {buttonText || t('processPages.common.conversion.buttonText')}
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-xs text-muted-foreground text-center max-w-sm">
          {description}
        </p>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className="mt-16 bg-card/50 backdrop-blur-sm rounded-3xl p-8 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-8 max-w-5xl mx-auto shadow-xl group hover:border-primary/40 transition-all duration-500">
        <div className="text-center md:text-left">
          <h3 className="text-2xl font-bold text-foreground mb-1">
            {title}
          </h3>
          <p className="text-muted-foreground">
            {description}
          </p>
        </div>
        <button
          onClick={handleClick}
          className={`w-full md:w-auto min-w-[220px] ${gradientClass} hover:opacity-90 text-primary-foreground font-bold py-4 px-8 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 transform hover:scale-105 active:scale-95 whitespace-nowrap`}
        >
          {buttonText || t('processPages.common.conversion.buttonText')}
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-primary/10" id="conversion">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 animate-fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {title || t('processPages.common.conversion.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {description || t('processPages.common.conversion.description')}
            </p>
          </div>

          <div className="flex flex-col items-center gap-6 animate-scale-in">

            {/* Botão principal */}
            <div className="relative">
              {showReferralBadge && (
                <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg z-20 animate-bounce">
                  {t('processPages.common.conversion.referralBadge')}
                </div>
              )}
              <button
                onClick={handleClick}
                className={`w-full sm:w-auto min-w-[280px] ${gradientClass} hover:opacity-90 text-primary-foreground font-bold py-4 px-8 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-95`}
              >
                {buttonText || t('processPages.common.conversion.buttonText')}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Texto adicional */}
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {user ? (
                t('processPages.common.conversion.redirectAuthenticated')
              ) : (
                t('processPages.common.conversion.redirectAnonymous')
              )}
            </p>
          </div>

          {/* Informações de segurança/confiança */}
          {!hideBenefits && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-card rounded-xl border border-border">
                <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">
                  {t('processPages.common.conversion.benefits.transparent.title')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t('processPages.common.conversion.benefits.transparent.description')}
                </p>
              </div>

              <div className="text-center p-4 bg-card rounded-xl border border-border">
                <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">
                  {t('processPages.common.conversion.benefits.support.title')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t('processPages.common.conversion.benefits.support.description')}
                </p>
              </div>

              <div className="text-center p-4 bg-card rounded-xl border border-border">
                <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">
                  {t('processPages.common.conversion.benefits.secure.title')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t('processPages.common.conversion.benefits.secure.description')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ConversionButton;
