import React from "react";
import { X, Award, Star } from "lucide-react";

interface MatriculaRewardsInvitePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  variant?: "onboarding" | "dashboard";
}

const MatriculaRewardsInvitePopup: React.FC<
  MatriculaRewardsInvitePopupProps
> = ({ isOpen, onClose, onAccept, variant = "onboarding" }) => {
  if (!isOpen) return null;

  const isOnboarding = variant === "onboarding";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden relative shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="bg-[#05294E] px-6 pt-8 pb-10 text-center">
          <div className="mx-auto w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center mb-4 shadow-lg">
            {isOnboarding ? (
              <Award className="h-8 w-8 text-[#05294E]" />
            ) : (
              <Star className="h-8 w-8 text-[#05294E]" />
            )}
          </div>

          {isOnboarding ? (
            <>
              <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-2">
                Parabéns!
              </p>
              <h2 className="text-white text-lg font-bold leading-snug">
                A universidade selecionada por você
                <br />
                participa do{" "}
                <span className="text-amber-400">
                  Programa Embaixadoras
                </span>{" "}
                MatrículaUSA
              </h2>
            </>
          ) : (
            <>
              <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-2">
                Você foi selecionado
              </p>
              <h2 className="text-white text-lg font-bold leading-snug">
                para ser um <span className="text-amber-400">embaixador</span>
                <br />
                do Matrícula EUA
              </h2>
            </>
          )}
        </div>

        {/* Body */}
        <div className="-mt-4 bg-white rounded-t-2xl px-6 pt-6 pb-8">
          {isOnboarding ? (
            <>
              <p className="text-slate-600 text-base text-center mb-5">
                Indique amigos para estudar nos EUA e ganhe{" "}
                <span className="font-semibold text-slate-800">
                  100 MatriculaCoins
                </span>{" "}
                por cada um que se matricular. Converta em desconto direto na
                sua tuition.
              </p>
            </>
          ) : (
            <>
              <p className="text-slate-600 text-sm text-center mb-6">
                Através do Programa Embaixadoras você acumula MatriculaCoins ao
                indicar amigos e converte em desconto direto na sua tuition.
              </p>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 text-center">
                <p className="text-xs text-amber-700 font-medium uppercase tracking-wide mb-1">
                  Sua vaga como embaixador está reservada
                </p>
                <p className="text-sm text-slate-600">
                  Clique abaixo para conhecer os próximos passos e ativar sua
                  participação.
                </p>
              </div>
            </>
          )}

          <button
            onClick={onAccept}
            className="w-full bg-amber-400 hover:bg-amber-500 text-[#05294E] font-bold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {isOnboarding ? "Quero participar" : "Ver como funciona"}
          </button>

          <button
            onClick={onClose}
            className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
          >
            Talvez depois
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatriculaRewardsInvitePopup;
