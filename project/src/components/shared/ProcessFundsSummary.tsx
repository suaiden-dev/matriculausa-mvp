import { DollarSign, Users, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import ConversionButton from "./ConversionButton";

interface ProcessFundsSummaryProps {
  description: string;
  mainApplicantGradient: string;
  dependentGradient: string;
  noteText: string;
  noteBorderColor: string;
  conversionProps?: {
    title: string;
    description: string;
    buttonText: string;
    gradientClass: string;
    variant?: 'full' | 'minimal' | 'banner';
  };
}

const ProcessFundsSummary = ({
  description,
  mainApplicantGradient,
  dependentGradient,
  noteText,
  noteBorderColor,
  conversionProps,
}: ProcessFundsSummaryProps) => {
  const { t } = useTranslation();

  return (
    <section className="py-16 md:py-24 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('processPages.common.fundsProof')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Main Applicant */}
          <div className="bg-card rounded-2xl p-8 shadow-lg border border-border group hover:shadow-xl transition-all duration-300">
            <div className={`w-16 h-16 rounded-full ${mainApplicantGradient} flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300`}>
              <DollarSign className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-bold text-center text-foreground mb-2">
              {t('processPages.initial.funds.mainApplicant')}
            </h3>
            <p className="text-4xl font-bold text-center text-gradient mb-2">
              {t('processPages.initial.funds.minAmount')}
            </p>
            <p className="text-sm text-center text-muted-foreground">
              {t('processPages.initial.funds.minBankAccount')}
            </p>
          </div>

          {/* Per Dependent */}
          <div className="bg-card rounded-2xl p-8 shadow-lg border border-border group hover:shadow-xl transition-all duration-300">
            <div className={`w-16 h-16 rounded-full ${dependentGradient} flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300`}>
              <Users className="w-8 h-8 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-bold text-center text-foreground mb-2">
              {t('processPages.initial.funds.perDependent')}
            </h3>
            <p className="text-4xl font-bold text-center text-gradient mb-2">
              {t('processPages.initial.funds.dependentAmount')}
            </p>
            <p className="text-sm text-center text-muted-foreground">
              {t('processPages.initial.funds.additionalPerDependent')}
            </p>
          </div>
        </div>

        {/* Note */}
        <div className="mt-8 max-w-2xl mx-auto">
          <div className={`bg-card border-l-4 ${noteBorderColor} rounded-lg p-4 flex items-start gap-3`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5`} style={{ color: "var(--tw-border-opacity)" }} />
            <p className="text-sm text-muted-foreground">
              {noteText}
            </p>
          </div>
        </div>

        {conversionProps && (
          <div className="mt-8">
            <ConversionButton 
              {...conversionProps} 
              variant={conversionProps.variant || 'minimal'} 
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default ProcessFundsSummary;
