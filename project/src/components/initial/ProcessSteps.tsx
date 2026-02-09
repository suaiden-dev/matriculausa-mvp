import { FileText, CreditCard, Shield, Scale, Receipt } from "lucide-react";
import ProcessStep from "../cos/ProcessStep";

const steps = [
  {
    step: 1,
    title: "Processo Seletivo",
    price: "$350",
    description: "Primeira etapa para verificar se você é elegível para o visto de estudante F-1.",
    items: [
      "Passaporte válido (mínimo 1 ano)",
      "Comprovante de fundos bancários ($22.000 mínimo)",
      "Endereço completo no país de origem",
      "Histórico escolar ou diploma",
      "Pagamento via Zelle para: info@thefutureofenglish.com",
    ],
    colorClass: "bg-coral",
    icon: <FileText className="w-6 h-6" />,
  },
  {
    step: 2,
    title: "Application Fee + I-20",
    price: "$350",
    description: "Taxa de aplicação e emissão do I-20 para entrevista no consulado.",
    items: [
      "Emissão do formulário I-20",
      "Processamento da matrícula",
      "$100 por cada dependente adicional",
    ],
    colorClass: "bg-emerald-500",
    icon: <Receipt className="w-6 h-6" />,
  },
  {
    step: 3,
    title: "Taxa da Bolsa",
    price: "$550",
    description: "Taxa referente à bolsa de estudos.",
    items: [
      "Formulário da matrícula na escola",
      "Demais documentações necessárias",
    ],
    colorClass: "bg-gold",
    icon: <CreditCard className="w-6 h-6" />,
  },
  {
    step: 4,
    title: "Control Fee",
    price: "$900",
    description: "Taxa de controle do I-20 durante todo o processo de visto.",
    items: [
      "Controle ativo do I-20",
      "Acompanhamento durante todo o processo",
      "Suporte para dúvidas e orientações",
      "Pagamento dessa taxa na emissão da carta de aceite pela instituição",
    ],
    colorClass: "bg-teal",
    icon: <Shield className="w-6 h-6" />,
  },
  {
    step: 5,
    title: "Honorários Jurídicos",
    price: "$1.800",
    description: "Acompanhamento jurídico completo do processo de visto.",
    items: [
      "$1.800 para o aplicante principal",
      "$100 por cada dependente adicional",
      "Preparação para entrevista no consulado",
      "Preparação de toda documentação",
    ],
    colorClass: "bg-purple",
    icon: <Scale className="w-6 h-6" />,
  },
];

const ProcessSteps = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Etapas do Processo
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Conheça todas as etapas necessárias para obter seu visto de estudante F-1
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="opacity-0 animate-fade-up"
              style={{ animationDelay: `${index * 0.15}s`, animationFillMode: 'forwards' }}
            >
              <ProcessStep {...step} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessSteps;
