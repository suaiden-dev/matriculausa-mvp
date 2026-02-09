import Header from "@/components/cos/Header";
import PromiseSection from "@/components/shared/PromiseSection";
import ProcessSteps from "@/components/cos/ProcessSteps";
import FundsSummary from "@/components/cos/FundsSummary";
import ValuesSummary from "@/components/cos/ValuesSummary";
import ClientsSection from "@/components/shared/ClientsSection";
import ContactForm from "@/components/shared/ContactForm";
import Footer from "@/components/cos/Footer";
import Chatbot from "@/components/shared/Chatbot";

const COS_PROMISE = "Trocar seu status dentro dos EUA não precisa ser um labirinto. Aqui você encontra um guia completo com todas as etapas, todos os valores e o suporte necessário para fazer seu COS com segurança, planejamento financeiro e acompanhamento jurídico até a resposta do USCIS.";

const Cos = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PromiseSection text={COS_PROMISE} />
      <ClientsSection />
      <ProcessSteps />
      <FundsSummary />
      <ValuesSummary />
      <ContactForm />
      <Footer />
    </div>
  );
};

export default Cos;
