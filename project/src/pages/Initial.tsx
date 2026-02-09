import Header from "@/components/initial/Header";
import PromiseSection from "@/components/shared/PromiseSection";
import ProcessSteps from "@/components/initial/ProcessSteps";
import FundsSummary from "@/components/initial/FundsSummary";
import ValuesSummary from "@/components/initial/ValuesSummary";
import ClientsSection from "@/components/shared/ClientsSection";
import ContactForm from "@/components/shared/ContactForm";
import Footer from "@/components/initial/Footer";
import ChatBot from "@/components/shared/Chatbot";

const INITIAL_PROMISE = "Se o seu plano é chegar aos Estados Unidos já com o visto F1 aprovado, nós organizamos o caminho desde a escolha da escola até o agendamento no consulado. Com nosso guia, você entende cada etapa, todos os custos e recebe orientação para montar uma aplicação forte e coerente com o seu projeto de vida.";

const Initial = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PromiseSection text={INITIAL_PROMISE} />
      <ClientsSection />
      <ProcessSteps />
      <FundsSummary />
      <ValuesSummary />
      <ContactForm />
      <Footer />
      <ChatBot />
    </div>
  );
};

export default Initial;
