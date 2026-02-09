import { DollarSign, Users, AlertCircle } from "lucide-react";

const FundsSummary = () => {
  return (
    <section className="py-16 md:py-24 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Comprovação de Fundos
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Requisitos mínimos de comprovação financeira para o visto F-1
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Main Applicant */}
          <div className="bg-card rounded-2xl p-8 shadow-lg border border-border group hover:shadow-xl transition-all duration-300">
            <div className="w-16 h-16 rounded-full gradient-coral-gold flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-bold text-center text-foreground mb-2">
              Aplicante Principal
            </h3>
            <p className="text-4xl font-bold text-center text-gradient mb-2">
              $22.000
            </p>
            <p className="text-sm text-center text-muted-foreground">
              Valor mínimo em conta bancária
            </p>
          </div>

          {/* Per Dependent */}
          <div className="bg-card rounded-2xl p-8 shadow-lg border border-border group hover:shadow-xl transition-all duration-300">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
              <Users className="w-8 h-8 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-bold text-center text-foreground mb-2">
              Por Dependente
            </h3>
            <p className="text-4xl font-bold text-center text-gradient mb-2">
              +$5.000
            </p>
            <p className="text-sm text-center text-muted-foreground">
              Valor adicional por cada dependente
            </p>
          </div>
        </div>

        {/* Note */}
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="bg-card border-l-4 border-coral rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Os valores devem ser comprovados através de extrato bancário atualizado. 
              O consulado americano exigirá esses documentos durante a entrevista de visto.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FundsSummary;
