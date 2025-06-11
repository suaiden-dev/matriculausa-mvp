import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Zap, Shield, Award } from 'lucide-react';

const Footer: React.FC = () => {
  const navigate = useNavigate();

  // Scroll to top after navigation for login/register
  const handleAuthLinkClick = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(to);
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }, 80);
  };

  return (
    <footer className="bg-[#05294E] text-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#D0151C]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center">
              <img 
                src="/favicon-branco.png" 
                alt="Matrícula USA" 
                className="h-10 w-auto"
              />
            </div>
            <p className="text-slate-300 leading-relaxed">
              Revolutionary SaaS platform connecting international students with American educational opportunities through AI-powered matching and exclusive scholarship programs.
            </p>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <Shield className="h-4 w-4 mr-2 text-[#D0151C]" />
                <span className="text-xs font-medium text-slate-300">Verified Platform</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <Award className="h-4 w-4 mr-2 text-yellow-400" />
                <span className="text-xs font-medium text-slate-300">Award Winning</span>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <a href="#" className="bg-white/10 backdrop-blur-sm p-3 rounded-xl hover:bg-white/20 transition-all duration-300 group">
                <Facebook className="h-5 w-5 text-slate-300 group-hover:text-white" />
              </a>
              <a href="#" className="bg-white/10 backdrop-blur-sm p-3 rounded-xl hover:bg-white/20 transition-all duration-300 group">
                <Twitter className="h-5 w-5 text-slate-300 group-hover:text-white" />
              </a>
              <a href="#" className="bg-white/10 backdrop-blur-sm p-3 rounded-xl hover:bg-white/20 transition-all duration-300 group">
                <Instagram className="h-5 w-5 text-slate-300 group-hover:text-white" />
              </a>
              <a href="#" className="bg-white/10 backdrop-blur-sm p-3 rounded-xl hover:bg-white/20 transition-all duration-300 group">
                <Linkedin className="h-5 w-5 text-slate-300 group-hover:text-white" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <Zap className="h-5 w-5 mr-2 text-[#D0151C]" />
              Platform
            </h3>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">About Us</Link></li>
              <li><Link to="/schools" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Partner Universities</Link></li>
              <li><Link to="/scholarships" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block flex items-center">
                Scholarships <Zap className="ml-1 h-3 w-3 text-yellow-400" />
              </Link></li>
              <li><Link to="/process" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Application Process</Link></li>
              <li><Link to="/services" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Legal Services</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Support Center</h3>
            <ul className="space-y-3">
              <li><Link to="/faq" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">FAQ</Link></li>
              <li><Link to="/contact" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Contact Us</Link></li>
              <li><Link to="/help" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Help Center</Link></li>
              <li><Link to="/privacy" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-slate-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Get in Touch</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 group">
                <div className="bg-[#D0151C]/20 p-2 rounded-lg group-hover:bg-[#D0151C]/30 transition-colors">
                  <Mail className="h-5 w-5 text-[#D0151C]" />
                </div>
                <span className="text-slate-300">info@matriculausa.com</span>
              </div>
              <div className="flex items-center space-x-3 group">
                <div className="bg-green-600/20 p-2 rounded-lg group-hover:bg-green-600/30 transition-colors">
                  <Phone className="h-5 w-5 text-green-400" />
                </div>
                <span className="text-slate-300">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3 group">
                <div className="bg-[#D0151C]/20 p-2 rounded-lg group-hover:bg-[#D0151C]/30 transition-colors">
                  <MapPin className="h-5 w-5 text-[#D0151C]" />
                </div>
                <span className="text-slate-300">New York, NY, USA</span>
              </div>
            </div>
            
            {/* Newsletter */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <h4 className="font-bold text-white mb-2">Stay Updated</h4>
              <p className="text-sm text-slate-300 mb-3">Get the latest scholarship opportunities</p>
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Your email"
                  className="flex-1 bg-white/10 border border-white/20 rounded-l-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#D0151C]"
                />
                <button className="bg-[#D0151C] px-4 py-2 rounded-r-lg text-sm font-bold hover:bg-[#B01218] transition-all duration-300">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-slate-400 text-sm">
              © 2024 Matrícula USA. All rights reserved. | Empowering international education through technology.
            </p>
            <div className="flex items-center space-x-6 text-sm text-slate-400">
              <span className="flex items-center">
                <Shield className="h-4 w-4 mr-1 text-green-400" />
                SSL Secured
              </span>
              <span className="flex items-center">
                <Award className="h-4 w-4 mr-1 text-yellow-400" />
                Trusted Platform
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;