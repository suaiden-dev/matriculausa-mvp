import Header from "@/components/initial/Header";
import PromiseSection from "@/components/shared/PromiseSection";
import ProcessSteps from "@/components/initial/ProcessSteps";
import FundsSummary from "@/components/initial/FundsSummary";
import ValuesSummary from "@/components/initial/ValuesSummary";
import ClientsSection from "@/components/shared/ClientsSection";
import ConversionButton from "@/components/shared/ConversionButton";
import Footer from "@/components/initial/Footer";
import Chatbot from "@/components/shared/Chatbot";
import { useReferralCapture } from "@/hooks/useReferralCapture";

const INITIAL_PROMISE = "Se o seu plano é chegar aos Estados Unidos já com o visto F1 aprovado, nós organizamos o caminho desde a escolha da escola até o agendamento no consulado. Com nosso guia, você entende cada etapa, todos os custos e recebe orientação para montar uma aplicação forte e coerente com o seu projeto de vida.";

const Initial = () => {
  const { referralCode, isValid } = useReferralCapture();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PromiseSection text={INITIAL_PROMISE} />
      <ClientsSection />
      <ProcessSteps />
      <FundsSummary />
      <ValuesSummary />
      <ConversionButton showReferralBadge={isValid && !!referralCode} />
      <Footer />
    </div>
  );
};

export default Initial;
