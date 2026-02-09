import Header from "@/components/cos/Header";
import PromiseSection from "@/components/shared/PromiseSection";
import ProcessSteps from "@/components/cos/ProcessSteps";
import FundsSummary from "@/components/cos/FundsSummary";
import ValuesSummary from "@/components/cos/ValuesSummary";
import ClientsSection from "@/components/shared/ClientsSection";
import ConversionButton from "@/components/shared/ConversionButton";
import Footer from "@/components/cos/Footer";
import Chatbot from "@/components/shared/Chatbot";
import { useReferralCapture } from "@/hooks/useReferralCapture";

const COS_PROMISE = "Trocar seu status dentro dos EUA não precisa ser um labirinto. Aqui você encontra um guia completo com todas as etapas, todos os valores e o suporte necessário para fazer seu COS com segurança, planejamento financeiro e acompanhamento jurídico até a resposta do USCIS.";

const Cos = () => {
  const { referralCode, isValid } = useReferralCapture();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PromiseSection text={COS_PROMISE} />
      <ClientsSection />
      <ProcessSteps />
      <FundsSummary />
      <ValuesSummary />
      <ConversionButton showReferralBadge={isValid && !!referralCode} />
      <Footer />
    </div>
  );
};

export default Cos;
