import Header from "@/components/transfer/Header";
import PromiseSection from "@/components/shared/PromiseSection";
import ProcessSteps from "@/components/transfer/ProcessSteps";
import FundsSummary from "@/components/transfer/FundsSummary";
import ValuesSummary from "@/components/transfer/ValuesSummary";
import ClientsSection from "@/components/shared/ClientsSection";
import ConversionButton from "@/components/shared/ConversionButton";
import Footer from "@/components/transfer/Footer";
import Chatbot from "@/components/shared/Chatbot";
import { useReferralCapture } from "@/hooks/useReferralCapture";

const TRANSFER_PROMISE = "Quer transferir seu I-20 sem interromper seus estudos nem correr risco com seu status? Nós mostramos, passo a passo, quando e como fazer a transferência, quais taxas considerar e como manter sua carga horária e datas em ordem, para que você continue estudando com tranquilidade na nova escola.";

const Transfer = () => {
  const { referralCode, isValid } = useReferralCapture();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PromiseSection text={TRANSFER_PROMISE} />
      <ClientsSection />
      <ProcessSteps />
      <FundsSummary />
      <ValuesSummary />
      <ConversionButton showReferralBadge={isValid && !!referralCode} />
      <Footer />
    </div>
  );
};

export default Transfer;
