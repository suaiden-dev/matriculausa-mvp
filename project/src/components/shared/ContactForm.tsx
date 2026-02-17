import React from "react";
import { Send } from "lucide-react";

const ContactForm: React.FC = () => {
  return (
    <section className="py-16 md:py-24 bg-background" id="contact">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 animate-fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ficou com alguma dúvida?
            </h2>
            <p className="text-lg text-muted-foreground">
              Entre em contato conosco e receba orientação personalizada para o seu processo.
            </p>
          </div>

          <form className="space-y-6 bg-card p-8 rounded-3xl border border-border shadow-xl animate-scale-in">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nome Completo</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                  placeholder="Seu nome aqui"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">E-mail</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                  placeholder="exemplo@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mensagem</label>
              <textarea 
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
                placeholder="Como podemos te ajudar?"
              />
            </div>

            <button 
              type="submit"
              className="w-full gradient-primary hover:opacity-90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-95"
            >
              Enviar Mensagem
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
