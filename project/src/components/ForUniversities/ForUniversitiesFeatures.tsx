import React from 'react';
import { FileText, MessageCircle, CreditCard, Target, BarChart3, Heart } from 'lucide-react';

const ForUniversitiesFeatures: React.FC = () => {
  const features = [
    {
      icon: FileText,
      title: "Smart Document Processing",
      description: "Our AI-powered system automatically reviews and organizes student documents, ensuring completeness before submission to your university."
    },
    {
      icon: MessageCircle,
      title: "Real-Time Chat Support",
      description: "Students get instant support through our intelligent chat system, reducing your administrative burden and improving application quality."
    },
    {
      icon: CreditCard,
      title: "Secure Payment System",
      description: "Integrated Stripe payment processing for application fees, scholarship fees, and other charges - all handled securely on our platform."
    },
    {
      icon: Target,
      title: "Pre-Matched Applications",
      description: "Our algorithm matches students with programs based on their academic background, ensuring higher acceptance rates and better fit."
    },
    {
      icon: BarChart3,
      title: "Performance Analytics",
      description: "Get detailed insights into application performance, student engagement, and recruitment success rates through our dashboard."
    },
    {
      icon: Heart,
      title: "Student Success Focus",
      description: "We prioritize student success with comprehensive support throughout the entire application and enrollment process."
    }
  ];

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            Our <span className="text-[#05294E]">Platform Differentiators</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Discover what makes MatriculaUSA different from traditional recruitment agencies
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#05294E]/20 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2"
            >
              <div className="w-16 h-16 bg-[#05294E]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#05294E]/20 transition-colors duration-300">
                <feature.icon className="h-8 w-8 text-[#05294E] group-hover:scale-110 transition-transform duration-300" />
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-[#05294E] transition-colors duration-300">
                {feature.title}
              </h3>
              
              <p className="text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors duration-300">
                {feature.description}
              </p>
              
              {/* Hover Effect Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#05294E]/5 to-[#D0151C]/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ForUniversitiesFeatures;
