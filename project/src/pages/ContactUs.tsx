import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

const ContactUs: React.FC = () => (
  <div className="min-h-screen bg-[#05294E] flex flex-col items-center py-16 px-4">
    <img
      src="https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?auto=format&fit=crop&w=800&q=80"
      alt="Support team"
      className="rounded-3xl shadow-2xl w-full max-w-xl mb-10"
      style={{objectFit: 'cover', maxHeight: 220}}
    />
    <h1 className="text-4xl md:text-5xl font-black text-white mb-8">Contact Us</h1>
    <div className="bg-white/90 rounded-2xl shadow-xl p-8 max-w-xl w-full flex flex-col items-center border-l-4 border-[#D0151C]">
      <div className="flex items-center mb-4 text-[#05294E]">
        <Mail className="h-6 w-6 mr-2" />
        <span className="font-bold text-lg">info@matriculausa.com</span>
      </div>
      <div className="flex items-center mb-4 text-[#05294E]">
        <Phone className="h-6 w-6 mr-2" />
        <span className="font-bold text-lg">+1 (213) 676-2544</span>
      </div>
      <div className="flex items-center text-[#05294E]">
        <MapPin className="h-6 w-6 mr-2" />
        <span className="font-bold text-lg">Los Angeles, CA, USA</span>
      </div>
      <p className="text-slate-700 mt-6 text-center">Our team will respond as soon as possible, usually within 1-2 business days.</p>
    </div>
  </div>
);

export default ContactUs; 