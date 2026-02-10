import { FileText, CreditCard, Shield, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";
import ProcessHeader from "@/components/shared/ProcessHeader";
import PromiseSection from "@/components/shared/PromiseSection";
import ProcessStepsSection from "@/components/shared/ProcessStepsSection";
import ProcessFundsSummary from "@/components/shared/ProcessFundsSummary";
import ProcessValuesSummary from "@/components/shared/ProcessValuesSummary";
import ClientsSection from "@/components/shared/ClientsSection";
import ConversionButton from "@/components/shared/ConversionButton";
import { useReferralCapture } from "@/hooks/useReferralCapture";

const Transfer = () => {
  const { t } = useTranslation();
  const { referralCode, isValid } = useReferralCapture();

  const TRANSFER_STEPS = [
    {
      step: 1,
      title: t('processPages.common.selectionProcess'),
      price: "$350",
      description: t('processPages.transfer.steps.list.step1.description'),
      items: t('processPages.transfer.steps.list.step1.items', { returnObjects: true }) as string[],
      colorClass: "bg-teal",
      icon: <FileText className="w-6 h-6" />,
    },
    {
      step: 2,
      title: t('processPages.common.applicationFeeI20'),
      price: "$350",
      description: t('processPages.transfer.steps.list.step2.description'),
      items: t('processPages.transfer.steps.list.step2.items', { returnObjects: true }) as string[],
      colorClass: "bg-emerald-500",
      icon: <Receipt className="w-6 h-6" />,
    },
    {
      step: 3,
      title: t('processPages.common.scholarshipFee'),
      price: "$550",
      description: t('processPages.transfer.steps.list.step3.description'),
      items: t('processPages.transfer.steps.list.step3.items', { returnObjects: true }) as string[],
      colorClass: "bg-coral",
      icon: <CreditCard className="w-6 h-6" />,
    },
    {
      step: 4,
      title: t('processPages.common.controlFee'),
      price: "$900",
      description: t('processPages.transfer.steps.list.step4.description'),
      items: t('processPages.transfer.steps.list.step4.items', { returnObjects: true }) as string[],
      colorClass: "bg-purple",
      icon: <Shield className="w-6 h-6" />,
    },
  ];

  const TRANSFER_VALUES = [
    { label: t('processPages.common.selectionProcess'), value: "$350", included: true },
    { label: t('processPages.common.applicationFeeI20'), value: "$350", included: true },
    { label: t('processPages.common.scholarshipFee'), value: "$550", included: true },
    { label: t('processPages.common.controlFee'), value: "$900", included: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ProcessHeader 
        title={t('processPages.transfer.header.title')}
        subtitle={t('processPages.transfer.header.subtitle')}
        description={t('processPages.transfer.header.description')}
        gradientClass="gradient-teal-purple"
      />
      <PromiseSection text={t('processPages.transfer.promise')} />
      <ClientsSection />
      <ProcessStepsSection 
        title={t('processPages.transfer.steps.title')}
        description={t('processPages.transfer.steps.description')}
        steps={TRANSFER_STEPS}
        conversionProps={{
          title: t('processPages.common.conversion.afterSteps.title'),
          description: t('processPages.common.conversion.afterSteps.description'),
          buttonText: t('processPages.common.conversion.afterSteps.buttonText'),
          gradientClass: "gradient-teal-purple",
          variant: "banner"
        }}
      />
      <ProcessFundsSummary 
        description={t('processPages.transfer.funds.description')}
        mainApplicantGradient="gradient-teal-purple"
        dependentGradient="gradient-primary"
        noteText={t('processPages.transfer.funds.note')}
        noteBorderColor="border-teal"
        conversionProps={{
          title: t('processPages.common.conversion.afterFunds.title'),
          description: t('processPages.common.conversion.afterFunds.description'),
          buttonText: t('processPages.common.conversion.afterFunds.buttonText'),
          gradientClass: "gradient-teal-purple",
          variant: "minimal"
        }}
      />

      <ProcessValuesSummary 
        description={t('processPages.transfer.values.description')}
        values={TRANSFER_VALUES}
      />
      <ConversionButton 
        showReferralBadge={!!(isValid && referralCode)} 
        gradientClass="gradient-teal-purple"
      />
    </div>
  );
};

export default Transfer;
