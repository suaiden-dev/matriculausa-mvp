import { FileText, CreditCard, Shield, Scale, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";
import ProcessHeader from "@/components/shared/ProcessHeader";
import PromiseSection from "@/components/shared/PromiseSection";
import ProcessStepsSection from "@/components/shared/ProcessStepsSection";
import ProcessFundsSummary from "@/components/shared/ProcessFundsSummary";
import ProcessValuesSummary from "@/components/shared/ProcessValuesSummary";
import ClientsSection from "@/components/shared/ClientsSection";
import ConversionButton from "@/components/shared/ConversionButton";
import ProcessFooter from "@/components/shared/ProcessFooter";
import { useReferralCapture } from "@/hooks/useReferralCapture";

const Initial = () => {
  const { t } = useTranslation();
  const { referralCode, isValid } = useReferralCapture();

  const INITIAL_STEPS = [
    {
      step: 1,
      title: t('processPages.common.selectionProcess'),
      price: "$350",
      description: t('processPages.initial.steps.list.step1.description'),
      items: t('processPages.initial.steps.list.step1.items', { returnObjects: true }) as string[],
      colorClass: "bg-coral",
      icon: <FileText className="w-6 h-6" />,
    },
    {
      step: 2,
      title: t('processPages.common.applicationFeeI20'),
      price: "$350",
      description: t('processPages.initial.steps.list.step2.description'),
      items: t('processPages.initial.steps.list.step2.items', { returnObjects: true }) as string[],
      colorClass: "bg-emerald-500",
      icon: <Receipt className="w-6 h-6" />,
    },
    {
      step: 3,
      title: t('processPages.common.scholarshipFee'),
      price: "$550",
      description: t('processPages.initial.steps.list.step3.description'),
      items: t('processPages.initial.steps.list.step3.items', { returnObjects: true }) as string[],
      colorClass: "bg-gold",
      icon: <CreditCard className="w-6 h-6" />,
    },
    {
      step: 4,
      title: t('processPages.common.controlFee'),
      price: "$900",
      description: t('processPages.initial.steps.list.step4.description'),
      items: t('processPages.initial.steps.list.step4.items', { returnObjects: true }) as string[],
      colorClass: "bg-teal",
      icon: <Shield className="w-6 h-6" />,
    },
    {
      step: 5,
      title: t('processPages.common.legalFees'),
      price: "$1.800",
      description: t('processPages.initial.steps.list.step5.description'),
      items: t('processPages.initial.steps.list.step5.items', { returnObjects: true }) as string[],
      colorClass: "bg-purple",
      icon: <Scale className="w-6 h-6" />,
    },
  ];

  const INITIAL_VALUES = [
    { label: t('processPages.common.selectionProcess'), value: "$350", included: true },
    { label: t('processPages.common.applicationFeeI20'), value: "$350", included: true },
    { label: t('processPages.common.scholarshipFee'), value: "$550", included: true },
    { label: t('processPages.common.controlFee'), value: "$900", included: true },
    { label: t('processPages.common.legalFees'), value: "$1.800", included: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ProcessHeader 
        title={t('processPages.initial.header.title')}
        subtitle={t('processPages.initial.header.subtitle')}
        description={t('processPages.initial.header.description')}
        gradientClass="gradient-coral-gold"
      />
      <PromiseSection text={t('processPages.initial.promise')} />
      <ClientsSection />
      <ProcessStepsSection 
        title={t('processPages.initial.steps.title')}
        description={t('processPages.initial.steps.description')}
        steps={INITIAL_STEPS}
      />
      <ProcessFundsSummary 
        description={t('processPages.initial.funds.description')}
        mainApplicantGradient="gradient-coral-gold"
        dependentGradient="gradient-primary"
        noteText={t('processPages.initial.funds.note')}
        noteBorderColor="border-coral"
      />
      <ProcessValuesSummary 
        description={t('processPages.initial.values.description')}
        values={INITIAL_VALUES}
      />
      <ConversionButton showReferralBadge={!!(isValid && referralCode)} />
      <ProcessFooter gradientClass="gradient-coral-gold" />
    </div>
  );
};

export default Initial;
