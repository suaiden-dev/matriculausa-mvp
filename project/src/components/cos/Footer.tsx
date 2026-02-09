import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="gradient-primary py-12 text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="text-center">
          {/* Logo */}
          <div className="mb-6">
            <span className="text-lg font-semibold tracking-wide">The Future</span>
          </div>

          {/* Contact */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Mail className="w-5 h-5" />
            <a
              href="mailto:info@thefutureofenglish.com"
              className="hover:underline transition-all"
            >
              info@thefutureofenglish.com
            </a>
          </div>

          {/* Divider */}
          <div className="w-16 h-0.5 bg-white/30 mx-auto mb-6" />

          {/* Copyright */}
          <p className="text-sm opacity-70">
            © {new Date().getFullYear()} The Future. Todos os direitos reservados.
          </p>

          {/* Admin Link */}
          <Link 
            to="/auth" 
            className="text-xs opacity-50 hover:opacity-100 transition-opacity mt-4 inline-block"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;