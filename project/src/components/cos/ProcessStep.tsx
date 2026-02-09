import { ReactNode } from "react";

interface ProcessStepProps {
  step: number;
  title: string;
  price: string;
  description: string;
  items: string[];
  note?: string;
  colorClass: string;
  icon: ReactNode;
  isOptional?: boolean;
}

const ProcessStep = ({
  step,
  title,
  price,
  description,
  items,
  note,
  colorClass,
  icon,
  isOptional = false,
}: ProcessStepProps) => {
  return (
    <div 
      className="group bg-card rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-border hover:-translate-y-1"
    >
      {/* Header */}
      <div className={`${colorClass} p-6 text-white relative overflow-hidden`}>
        <div className="absolute top-0 right-0 opacity-20 transform translate-x-4 -translate-y-4">
          <div className="w-24 h-24 rounded-full bg-white" />
        </div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium opacity-80">Etapa {step}</span>
                {isOptional && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    Opcional
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold">{title}</h3>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold">{price}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <p className="text-muted-foreground mb-4">{description}</p>
        
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-accent mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm text-foreground">{item}</span>
            </li>
          ))}
        </ul>

        {note && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground italic">{note}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessStep;