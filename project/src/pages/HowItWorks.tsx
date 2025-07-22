import React from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Brain, 
  CheckCircle, 
  ArrowRight, 
  Sparkles, 
  Target, 
  Shield, 
  Award, 
  Clock, 
  Users,
  FileText,
  Search,
  Heart,
  Star,
  TrendingUp,
  Rocket,
  BookOpen,
  DollarSign,
  Lock,
  MessageCircle,
  GraduationCap,
  CreditCard
} from 'lucide-react';
import SmartChat from '../components/SmartChat';

const HowItWorks: React.FC = () => {
  return (
    <div className="bg-white min-h-screen">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-[#05294E] via-slate-800 to-[#05294E] text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#D0151C]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight">How It Works</h1>
          <h2 className="text-2xl md:text-3xl text-slate-200 max-w-2xl mx-auto mb-8 leading-relaxed font-semibold">
            Your path to a U.S. university, step by step.
          </h2>
          <div className="flex flex-wrap justify-center items-center gap-8 mt-8 text-slate-300">
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <Clock className="h-5 w-5 mr-2 text-green-400" />
                <span className="text-sm font-medium">5 Minutes Setup</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
              <Star className="h-5 w-5 mr-2 text-yellow-400" />
                <span className="text-sm font-medium">95% Success Rate</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <Shield className="h-5 w-5 mr-2 text-blue-400" />
                <span className="text-sm font-medium">100% Secure</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Journey Steps */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-4xl font-black text-center mb-12 text-[#05294E]">Your Journey</h2>
        <div className="space-y-10">
          {/* Step 1 */}
          <div className="bg-slate-50 rounded-3xl shadow-lg p-8 flex flex-col md:flex-row gap-8 items-center border border-slate-200">
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-[#05294E]/10">
              <User className="h-8 w-8 text-[#05294E]" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2 text-[#05294E]">1. Create Your Profile</h3>
              <p className="text-slate-700 mb-2 text-lg">Fill out your academic and personal info. Our AI finds your best options.</p>
              <ul className="list-disc list-inside text-slate-500 text-sm space-y-1">
                <li>Academic history & achievements</li>
                <li>Career goals & preferences</li>
                <li>Financial requirements</li>
              </ul>
            </div>
          </div>
          {/* Step 2 */}
          <div className="bg-slate-50 rounded-3xl shadow-lg p-8 flex flex-col md:flex-row gap-8 items-center border border-slate-200">
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100">
              <CreditCard className="h-8 w-8 text-green-600" />
                  </div>
            <div>
              <h3 className="text-2xl font-bold mb-2 text-green-700">2. Pay Selection Fee ($350)</h3>
              <p className="text-slate-700 mb-2 text-lg">Unlock all scholarships. <strong>This fee is final and non-refundable.</strong></p>
              <ul className="list-disc list-inside text-slate-500 text-sm space-y-1">
                <li>Access to scholarship browse</li>
                <li>Initiate application process</li>
                <li>One-time fee</li>
              </ul>
                    </div>
                  </div>
          {/* Step 3 */}
          <div className="bg-slate-50 rounded-3xl shadow-lg p-8 flex flex-col md:flex-row gap-8 items-center border border-slate-200">
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2 text-blue-700">3. Choose Scholarships & Upload Docs</h3>
              <p className="text-slate-700 mb-2 text-lg">Pick scholarships and upload your documents. Fast review.</p>
              <ul className="list-disc list-inside text-slate-500 text-sm space-y-1">
                <li>Select multiple scholarships</li>
                <li>Secure document upload</li>
                <li>Automated initial analysis</li>
              </ul>
                  </div>
                </div>
          {/* Step 4 */}
          <div className="bg-slate-50 rounded-3xl shadow-lg p-8 flex flex-col md:flex-row gap-8 items-center border border-slate-200">
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-100">
              <GraduationCap className="h-8 w-8 text-yellow-600" />
                  </div>
            <div>
              <h3 className="text-2xl font-bold mb-2 text-yellow-700">4. Pay Application Fee ($350)</h3>
              <p className="text-slate-700 mb-2 text-lg">Confirm your university. <strong>This fee is final and non-refundable.</strong></p>
              <ul className="list-disc list-inside text-slate-500 text-sm space-y-1">
                <li>See approved scholarships</li>
                <li>Confirm university choice</li>
                <li>Secure your spot</li>
              </ul>
                    </div>
                  </div>
          {/* Step 5 */}
          <div className="bg-slate-50 rounded-3xl shadow-lg p-8 flex flex-col md:flex-row gap-8 items-center border border-slate-200">
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-100">
              <BookOpen className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2 text-purple-700">5. Pay Scholarship Fee ($550)</h3>
              <p className="text-slate-700 mb-2 text-lg">Get direct chat with your university. <strong>This fee is final and non-refundable.</strong></p>
              <ul className="list-disc list-inside text-slate-500 text-sm space-y-1">
                <li>Direct chat with university</li>
                <li>Submit additional documents</li>
                <li>Final scholarship commitment</li>
              </ul>
                  </div>
                </div>
          {/* Step 6 */}
          <div className="bg-slate-50 rounded-3xl shadow-lg p-8 flex flex-col md:flex-row gap-8 items-center border border-slate-200">
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100">
              <Lock className="h-8 w-8 text-red-600" />
                  </div>
            <div>
              <h3 className="text-2xl font-bold mb-2 text-red-700">6. Pay I-20 Control Fee ($900)</h3>
              <p className="text-slate-700 mb-2 text-lg">Needed for your F-1 visa. <strong>This fee is final and non-refundable.</strong></p>
              <ul className="list-disc list-inside text-slate-500 text-sm space-y-1">
                <li>Essential for F-1 student visa</li>
                <li>Covers I-20 processing</li>
                <li>10-day payment window</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Behind the Technology Section */}
      <section className="bg-gradient-to-br from-slate-50 to-blue-50 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-4xl font-black text-center mb-12 text-[#05294E]">Why MatriculaUSA?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 group hover:-translate-y-2 transition-transform duration-300">
              <Sparkles className="h-8 w-8 text-[#05294E] mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Smart Discovery</h3>
              <p className="text-slate-600 text-lg">AI finds the best scholarships for you.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 group hover:-translate-y-2 transition-transform duration-300">
              <FileText className="h-8 w-8 text-blue-600 mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Document Management</h3>
              <p className="text-slate-600 text-lg">Upload and track all your documents easily.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 group hover:-translate-y-2 transition-transform duration-300">
              <MessageCircle className="h-8 w-8 text-purple-600 mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Personal Support</h3>
              <p className="text-slate-600 text-lg">Our team helps you at every step.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 group hover:-translate-y-2 transition-transform duration-300">
              <Star className="h-8 w-8 text-yellow-400 mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Success Tracking</h3>
              <p className="text-slate-600 text-lg">See your progress and next steps in real time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center text-[#05294E]">Frequently Asked Questions</h2>
          {/* FAQ List - Copiado do FAQ revisado */}
          <div className="flex flex-col gap-6 max-w-2xl mx-auto">
            <div className="bg-slate-50 rounded-2xl p-6 shadow flex flex-col gap-2">
              <h3 className="font-bold text-[#05294E]">1. What fees or payments are required to use MatriculaUSA?</h3>
              <p>MatriculaUSA is free to create your profile and explore universities. However, once you start the application process and are approved for a scholarship, all fees associated with the admission and enrollment flow become mandatory. They are clearly presented before any payment. <strong>All fees are final and non-refundable.</strong></p>
              </div>
            <div className="bg-slate-50 rounded-2xl p-6 shadow flex flex-col gap-2">
              <h3 className="font-bold text-[#05294E]">2. What is the Selection Process Fee?</h3>
              <p>The Selection Process Fee (US$350) is the first mandatory payment on the MatriculaUSA platform. It unlocks your full access to view all scholarships and start your application process. <strong>This fee is final and non-refundable.</strong></p>
                    </div>
            <div className="bg-slate-50 rounded-2xl p-6 shadow flex flex-col gap-2">
              <h3 className="font-bold text-[#05294E]">3. What is the Scholarship Fee?</h3>
              <p>The Scholarship Fee (US$550) is charged when you proceed with applications for exclusive scholarships through MatriculaUSA. This fee covers processing costs and personalized support for your scholarship applications. <strong>This fee is final and non-refundable.</strong></p>
                  </div>
            <div className="bg-slate-50 rounded-2xl p-6 shadow flex flex-col gap-2">
              <h3 className="font-bold text-[#05294E]">4. What is the Application Fee?</h3>
              <p>The Application Fee (US$350) is a payment required to formally process your application after you have been accepted. This amount confirms your intention to enroll and is managed directly by the platform. <strong>This fee is final and non-refundable.</strong></p>
                </div>
            <div className="bg-slate-50 rounded-2xl p-6 shadow flex flex-col gap-2">
              <h3 className="font-bold text-[#05294E]">5. What is the I-20 Control Fee?</h3>
              <p>The I-20 Control Fee (US$900) is a mandatory payment for students who need to obtain the I-20 form, essential for applying for the F-1 student visa. This fee ensures fast and accurate processing of your visa documents. <strong>This fee is final and non-refundable.</strong></p>
                    </div>
            <div className="bg-slate-50 rounded-2xl p-6 shadow flex flex-col gap-2">
              <h3 className="font-bold text-[#05294E]">6. Are there any other fees I should be aware of?</h3>
              <p>All mandatory fees for your application and enrollment process are listed in your dashboard before any payment. Some universities may have additional fees (e.g., housing deposits, orientation fees), but these will always be communicated directly by the university or by us in advance. <strong>All fees are final and non-refundable.</strong></p>
                  </div>
            <div className="bg-slate-50 rounded-2xl p-6 shadow flex flex-col gap-2">
              <h3 className="font-bold text-[#05294E]">7. How can I pay these fees?</h3>
              <p>You can pay all fees directly through the MatriculaUSA platform using international credit or debit cards. Payments are securely processed via Stripe, and you will receive a confirmation for each transaction. <strong>All fees are final and non-refundable.</strong></p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-6 shadow flex flex-col gap-2">
              <h3 className="font-bold text-[#05294E]">8. Is my payment information secure?</h3>
              <p>Yes. All payments are processed by Stripe, a global leader in payment security. MatriculaUSA does not store your card details, and all transactions are encrypted for your protection.</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-6 shadow flex flex-col gap-2">
              <h3 className="font-bold text-[#05294E]">9. Can I get a refund?</h3>
              <p>You are entitled to a full refund of fees paid if your application is not successful or you are not approved for a scholarship. However, if you withdraw from the process or change your mind after starting the application, the fees paid are non-refundable, as processing and support will have already begun. <strong>All fees are final and non-refundable.</strong></p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-6 shadow flex flex-col gap-2">
              <h3 className="font-bold text-[#05294E]">10. Do I have to pay all fees at once?</h3>
              <p>No. The fees are separate purchases and are paid in stages as you progress through the process. You pay the Selection Process Fee first, then the Scholarship Fee (if applicable), followed by the Application Fee, and finally the I-20 Control Fee. All are mandatory for the complete flow, but do not need to be paid simultaneously.</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-6 shadow flex flex-col gap-2">
              <h3 className="font-bold text-[#05294E]">11. Who can I contact if I have questions about fees or payments?</h3>
              <p>Our support team is available via chat or email at any time to answer any questions about fees, payments, or your application process. We are here to help you every step of the way!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories Section (mantido) */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#05294E]">Success Stories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="flex items-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
        </div>
              <p className="text-slate-700 mb-6 text-lg leading-relaxed">
                "I found exclusive scholarships that weren't available anywhere else. MatriculaUSA truly opens doors to opportunities."
              </p>
            <div className="flex items-center">
                <img
                  src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1"
                  alt="Ana Chen"
                  className="w-14 h-14 rounded-2xl mr-4 shadow-lg"
                />
                <div>
                  <div className="font-bold text-slate-900">Ana Chen</div>
                  <div className="text-sm text-green-600 font-medium">Engineering</div>
            </div>
            </div>
            </div>
            {/* New Success Story 1 */}
            <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="flex items-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-lg leading-relaxed">
                "Thanks to MatriculaUSA, I received a full scholarship and support throughout my visa process. The team was always there for me!"
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1"
                  alt="Lucas Silva"
                  className="w-14 h-14 rounded-2xl mr-4 shadow-lg"
                />
                <div>
                  <div className="font-bold text-slate-900">Lucas Silva</div>
                  <div className="text-sm text-blue-600 font-medium">Computer Science</div>
                </div>
              </div>
            </div>
            {/* New Success Story 2 */}
            <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="flex items-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-lg leading-relaxed">
                "The application process was so easy and transparent. I felt supported every step of the way. Highly recommend!"
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1"
                  alt="Priya Patel"
                  className="w-14 h-14 rounded-2xl mr-4 shadow-lg"
                />
                <div>
                  <div className="font-bold text-slate-900">Priya Patel</div>
                  <div className="text-sm text-purple-600 font-medium">Business</div>
                </div>
              </div>
            </div>
            {/* New Success Story 3 */}
            <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="flex items-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-lg leading-relaxed">
                "I never thought studying in the U.S. was possible for me. MatriculaUSA made my dream come true!"
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1"
                  alt="Ahmed Hassan"
                  className="w-14 h-14 rounded-2xl mr-4 shadow-lg"
                />
                <div>
                  <div className="font-bold text-slate-900">Ahmed Hassan</div>
                  <div className="text-sm text-red-600 font-medium">Engineering</div>
                </div>
              </div>
            </div>
            {/* New Success Story 4 */}
            <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="flex items-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-lg leading-relaxed">
                "From the first contact to my arrival in the U.S., everything was smooth and professional. Thank you, MatriculaUSA!"
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.pexels.com/photos/1181696/pexels-photo-1181696.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1"
                  alt="Maria Gomez"
                  className="w-14 h-14 rounded-2xl mr-4 shadow-lg"
                />
                <div>
                  <div className="font-bold text-slate-900">Maria Gomez</div>
                  <div className="text-sm text-yellow-600 font-medium">Business</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SmartChat />
    </div>
  );
};

export default HowItWorks;