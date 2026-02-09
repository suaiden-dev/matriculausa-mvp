import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ValueItem {
  label: string;
  value: string;
  included: boolean;
}

interface ProcessValuesSummaryProps {
  description: string;
  values: ValueItem[];
}

const ProcessValuesSummary = ({
  description,
  values,
}: ProcessValuesSummaryProps) => {
  const { t } = useTranslation();
  
  const totalRequired = values
    .filter((item) => item.included)
    .reduce((acc, item) => acc + parseInt(item.value.replace(/[^0-9]/g, "")), 0);

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('processPages.common.valuesSummary')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
            {/* Values List */}
            <div className="divide-y divide-border">
              {values.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        item.included ? "bg-accent" : "bg-muted"
                      }`}
                    >
                      <Check
                        className={`w-4 h-4 ${
                          item.included ? "text-accent-foreground" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <span className="text-foreground">
                      {item.label}
                      {!item.included && (
                        <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {t('processPages.common.optional')}
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="bg-muted p-6">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('processPages.common.total')}</span>
                <span className="text-2xl font-bold text-gradient">
                  ${totalRequired.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessValuesSummary;
