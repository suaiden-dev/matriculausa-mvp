import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="gradient-coral-gold py-16 md:py-24 text-primary-foreground relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-white blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-center gap-4 md:gap-6 mb-8 flex-wrap">
          <span className="text-sm font-medium tracking-widest uppercase opacity-80">The Future</span>
        </nav>

        {/* Title */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-up">
            Processo Initial
          </h1>
          <p className="text-xl md:text-2xl font-light opacity-90 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Visto de Estudante F-1 — Aplicação do Exterior
          </p>
          <p className="mt-6 text-lg opacity-80 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Guia completo com todas as etapas e valores para obter seu visto de estudante F-1 aplicando de fora dos Estados Unidos
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;
