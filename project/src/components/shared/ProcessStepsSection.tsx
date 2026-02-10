import { ReactNode } from "react";
import ProcessStep from "./ProcessStep";
import ConversionButton from "./ConversionButton";

interface Step {
  step: number;
  title: string;
  price: string;
  description: string;
  items: string[];
  colorClass: string;
  icon: ReactNode;
  note?: string;
  isOptional?: boolean;
}

interface ProcessStepsSectionProps {
  title: string;
  description: string;
  steps: Step[];
  conversionProps?: {
    title: string;
    description: string;
    buttonText: string;
    gradientClass: string;
    variant?: 'full' | 'minimal' | 'banner';
  };
}

const ProcessStepsSection = ({
  title,
  description,
  steps,
  conversionProps,
}: ProcessStepsSectionProps) => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {title && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {title}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {description}
            </p>
          </div>
        )}

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

        {conversionProps && (
          <div className="mt-4">
            <ConversionButton 
              {...conversionProps} 
              variant={conversionProps.variant || 'banner'} 
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default ProcessStepsSection;
