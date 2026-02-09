import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

interface ConversionButtonProps {
  title?: string;
  description?: string;
  buttonText?: string;
  showReferralBadge?: boolean;
}

const ConversionButton: React.FC<ConversionButtonProps> = ({
  title = "Pronto para começar seu processo?",
  description = "Clique no botão abaixo para iniciar sua jornada rumo aos Estados Unidos com todo o suporte necessário.",
  buttonText = "Começar Agora",
  showReferralBadge = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleClick = () => {
    if (user) {
      // Usuário autenticado: redireciona para dashboard com modal aberto
      navigate('/student/overview?openModal=selection_process');
    } else {
      // Usuário não autenticado: redireciona para registro
      navigate('/auth?mode=register');
    }
  };

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-primary/10" id="conversion">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 animate-fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {title}
            </h2>
            <p className="text-lg text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="flex flex-col items-center gap-6 animate-scale-in">

            {/* Botão principal */}
            <button
              onClick={handleClick}
              className="w-full sm:w-auto min-w-[280px] gradient-primary hover:opacity-90 text-primary-foreground font-bold py-4 px-8 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-95"
            >
              {buttonText}
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Texto adicional */}
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {user ? (
                "Você será direcionado para a área do estudante para realizar o pagamento do processo seletivo."
              ) : (
                "Você será direcionado para criar sua conta. É rápido e gratuito!"
              )}
            </p>
          </div>

          {/* Informações de segurança/confiança */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-card rounded-xl border border-border">
              <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-1">Processo Transparente</h4>
              <p className="text-sm text-muted-foreground">Todos os custos detalhados desde o início</p>
            </div>

            <div className="text-center p-4 bg-card rounded-xl border border-border">
              <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-1">Suporte Completo</h4>
              <p className="text-sm text-muted-foreground">Acompanhamento em todas as etapas</p>
            </div>

            <div className="text-center p-4 bg-card rounded-xl border border-border">
              <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-1">Pagamento Seguro</h4>
              <p className="text-sm text-muted-foreground">Métodos confiáveis e protegidos</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConversionButton;
