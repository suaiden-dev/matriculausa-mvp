import { Check } from "lucide-react";

const values = [
  { label: "Processo Seletivo", value: "$350", included: true },
  { label: "Application Fee + I-20", value: "$350", included: true },
  { label: "Taxa da Bolsa", value: "$550", included: true },
  { label: "Control Fee", value: "$900", included: true },
];

const ValuesSummary = () => {
  const totalRequired = 350 + 350 + 550 + 900;

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Resumo de Valores
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Todos os custos envolvidos no processo de Transfer
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
                          Opcional
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
                <span className="text-muted-foreground">Total:</span>
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

export default ValuesSummary;
