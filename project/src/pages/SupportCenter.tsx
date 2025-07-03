import React from 'react';
import { Search, HelpCircle, Mail, BookOpen, MessageSquare, Star, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

// SupportCenter.tsx
// MatriculaUSA Support Center page
//
// This page provides a modern, institutional support hub for users, with quick access to FAQ, contact, guides, ticket submission, and popular topics.
// To expand: Integrate live chat, dynamic knowledge base, or user-specific help in the future.
//
// All content is in English and visually aligned with the MatriculaUSA brand.

const popularTopics = [
  { title: 'Payments & Fees', description: 'Learn about payment methods, fees, and refunds.', link: '/how-it-works#fees' },
  { title: 'Scholarships', description: 'Find out how to apply and maximize your chances.', link: '/how-it-works#scholarships' },
  { title: 'Application Process', description: 'Step-by-step guide to your U.S. university application.', link: '/how-it-works' },
  { title: 'Visa Support', description: 'Get help with your student visa process.', link: '/faq#visa' },
  { title: 'Technical Support', description: 'Having trouble? We can help.', link: '/contact' },
];

const SupportCenter: React.FC = () => {
  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Hero */}
      <section className="bg-[#05294E] py-16 px-4 text-white text-center relative">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-black mb-4">Support Center</h1>
          <p className="text-xl md:text-2xl mb-8 font-medium">How can we help you succeed on your journey to a U.S. university?</p>
          <div className="flex items-center bg-white rounded-2xl shadow-lg px-4 py-2 max-w-lg mx-auto">
            <Search className="text-[#05294E] mr-2" />
            <input
              type="text"
              placeholder="Search for help, topics, or guides..."
              className="flex-1 bg-transparent outline-none text-[#05294E] text-lg py-2"
              aria-label="Search support center"
            />
          </div>
        </div>
      </section>

      {/* Quick Access Blocks */}
      <section className="max-w-5xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-4">
        <Link to="/how-it-works" className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center hover:shadow-xl transition-all border border-slate-200 group">
          <HelpCircle className="h-8 w-8 text-[#D0151C] mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-lg mb-1 text-[#05294E]">FAQ</span>
          <span className="text-slate-500 text-center text-sm">Find answers to common questions.</span>
        </Link>
        <Link to="/contact" className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center hover:shadow-xl transition-all border border-slate-200 group">
          <Mail className="h-8 w-8 text-[#D0151C] mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-lg mb-1 text-[#05294E]">Contact Us</span>
          <span className="text-slate-500 text-center text-sm">Reach our support team directly.</span>
        </Link>
        <Link to="/guides" className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center hover:shadow-xl transition-all border border-slate-200 group">
          <BookOpen className="h-8 w-8 text-[#D0151C] mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-lg mb-1 text-[#05294E]">Guides</span>
          <span className="text-slate-500 text-center text-sm">Step-by-step tutorials and resources.</span>
        </Link>
        <Link to="/submit-ticket" className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center hover:shadow-xl transition-all border border-slate-200 group">
          <Send className="h-8 w-8 text-[#D0151C] mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-lg mb-1 text-[#05294E]">Submit a Ticket</span>
          <span className="text-slate-500 text-center text-sm">Need help? Open a support request.</span>
        </Link>
      </section>

      {/* Popular Topics */}
      <section className="max-w-5xl mx-auto mt-16 px-4">
        <h2 className="text-3xl font-black text-[#05294E] mb-8 text-center">Popular Topics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {popularTopics.map((topic) => (
            <Link
              key={topic.title}
              to={topic.link}
              className="bg-white rounded-2xl shadow-md p-6 flex flex-col hover:shadow-xl transition-all border border-slate-200 group"
            >
              <Star className="h-6 w-6 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-lg mb-1 text-[#05294E]">{topic.title}</span>
              <span className="text-slate-500 text-sm">{topic.description}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="max-w-3xl mx-auto mt-20 px-4 text-center">
        <div className="bg-[#D0151C] rounded-3xl py-10 px-6 shadow-xl">
          <h3 className="text-2xl md:text-3xl font-black text-white mb-4">Still need help?</h3>
          <p className="text-lg text-white mb-6">Our support team is ready to assist you. Reach out and we'll get back to you as soon as possible.</p>
          <Link to="/contact" className="inline-block bg-white text-[#D0151C] font-bold px-8 py-3 rounded-xl shadow-lg hover:bg-slate-100 transition-all text-lg">Contact Support</Link>
        </div>
      </section>
    </div>
  );
};

export default SupportCenter;

// Route: /support-center 