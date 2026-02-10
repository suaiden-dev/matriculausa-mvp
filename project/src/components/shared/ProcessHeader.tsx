

interface ProcessHeaderProps {
  title: string;
  subtitle: string;
  description: string;
  gradientClass: string;
}

const ProcessHeader = ({
  title,
  subtitle,
  description,
  gradientClass,
}: ProcessHeaderProps) => {
  return (
    <header className={`${gradientClass} py-16 md:py-24 text-primary-foreground relative overflow-hidden`}>
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-white blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-center mb-8">
          <a href="https://thefutureofenglish.com/" className="bg-white p-4 md:p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <img 
              src="/logo_tfoe.png" 
              alt="The Future of English" 
              className="h-12 md:h-20 w-auto animate-fade-in"
            />
          </a>
        </nav>

        {/* Title */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-up">
            {title}
          </h1>
          <p className="text-xl md:text-2xl font-light opacity-90 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            {subtitle}
          </p>
          <p className="mt-6 text-lg opacity-80 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.2s' }}>
            {description}
          </p>
        </div>
      </div>
    </header>
  );
};

export default ProcessHeader;
