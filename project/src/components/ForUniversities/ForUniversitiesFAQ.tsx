import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';

interface ForUniversitiesFAQProps {
  onScheduleClick: () => void;
}

const ForUniversitiesFAQ: React.FC<ForUniversitiesFAQProps> = ({ onScheduleClick }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "What is Matricula USA?",
      answer: "It's the first international platform that connects US universities to millions of qualified students worldwide, combining recruitment, pre-selection, and enrollment in a single system. Official profile visible to millions of global students. Reports and metrics that allow you to predict and scale results. Everything in one place: marketing, enrollment, management, and payment. Qualified leads who are already actively seeking courses in the US."
    },
    {
      question: "How much does it cost to get started?",
      answer: "For universities that register now, we offer 3 months free, with full access to the platform, AI tools, and dedicated support. After this period, you only pay if you decide to continue."
    },
    {
      question: "How many students will I reach?",
      answer: "You will have visibility to millions of students seeking courses in the US, with special emphasis on your profile and programs."
    },
    {
      question: "How does student selection work?",
      answer: "Our exclusive AI pre-qualifies candidates according to your institution's criteria, ensuring you only receive leads ready for enrollment."
    },
    {
      question: "Are payments secure?",
      answer: "Yes. Students make payments directly within the platform, with anti-fraud system and secure transfer to the university."
    },
    {
      question: "What if I don't have a team to respond quickly?",
      answer: "You have our exclusive AI for universities, which automatically responds to emails, WhatsApp, and chat 24 hours a day, ensuring no interested student goes unanswered."
    },
    {
      question: "Do I need to integrate with my system?",
      answer: "It's not mandatory. However, we offer integrations with CRMs and academic systems to facilitate your management."
    },
    {
      question: "Can I promote specific courses?",
      answer: "Yes. You can promote specific programs and segment by student profile, country, and even language, increasing conversion rates."
    },
    {
      question: "Is there a loyalty requirement?",
      answer: "We don't require loyalty contracts. You are free to cancel whenever you want, without fines or bureaucracy."
    },
    {
      question: "How long until I receive leads?",
      answer: "As soon as your profile is approved, you start receiving interested students within 24 hours, ready to begin the enrollment process."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 bg-[#05294E] text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-64 h-64 bg-yellow-300/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-[#D0151C]/10 rounded-full blur-2xl"></div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Frequently Asked <span className="text-slate-300">Questions</span>
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Everything you need to know about partnering with MatriculaUSA
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden hover:bg-white/20 transition-all duration-300"
            >
              <button
                className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors duration-200"
                onClick={() => toggleFAQ(index)}
              >
                <h3 className="text-lg font-bold text-white pr-4">
                  {faq.question}
                </h3>
                {openIndex === index ? (
                  <ChevronUp className="h-6 w-6 text-slate-300 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-6 w-6 text-slate-300 flex-shrink-0" />
                )}
              </button>
              
              {openIndex === index && (
                <div className="px-8 pb-6">
                  <div className="border-t border-white/20 pt-4">
                    <p className="text-white/90 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold mb-4 text-white">
              Still have questions?
            </h3>
            <p className="text-white/80 mb-6">
              Our team is here to help you understand how MatriculaUSA can transform your international student recruitment.
            </p>
            <button 
              onClick={onScheduleClick}
              className="bg-slate-300 text-slate-900 px-8 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all duration-300 flex items-center mx-auto shadow-lg"
            >
              <MessageCircle className="mr-3 h-5 w-5" />
              Talk to an Expert
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForUniversitiesFAQ;
