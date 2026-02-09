import React from "react";

interface PromiseSectionProps {
  text: string;
}

const PromiseSection: React.FC<PromiseSectionProps> = ({ text }) => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xl md:text-2xl text-slate-500/90 leading-relaxed font-light animate-fade-up">
            {text}
          </p>
        </div>
      </div>
    </section>
  );
};

export default PromiseSection;
