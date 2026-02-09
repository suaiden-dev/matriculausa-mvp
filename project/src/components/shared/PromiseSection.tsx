import React from "react";

interface PromiseSectionProps {
  text: string;
}

const PromiseSection: React.FC<PromiseSectionProps> = ({ text }) => {
  return (
    <section className="py-16 md:py-24 bg-muted">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 leading-relaxed italic animate-fade-up">
            "{text}"
          </h2>
          <div className="w-24 h-1.5 gradient-coral-gold mx-auto rounded-full animate-scale-in" />
        </div>
      </div>
    </section>
  );
};

export default PromiseSection;
