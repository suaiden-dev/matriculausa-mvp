import React, { useState } from 'react';
import { 
  Gift, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  ArrowRight,
  Star,
  Zap,
  Target,
  Award,
  Lightbulb
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUniversity } from '../context/UniversityContext';
import { supabase } from '../lib/supabase';

interface MatriculaRewardsOptInProps {
  onOptInSuccess: () => void;
}

const MatriculaRewardsOptIn: React.FC<MatriculaRewardsOptInProps> = ({ onOptInSuccess }) => {
  const { user } = useAuth();
  const { university } = useUniversity();
  const [isOptingIn, setIsOptingIn] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptIn = async () => {
    if (!university?.id || !user?.id) {
      setError('University or user information not available');
      return;
    }

    setIsOptingIn(true);
    setError(null);

    try {
      // Update university to participate in the program
      const { error: updateError } = await supabase
        .from('universities')
        .update({
          participates_in_matricula_rewards: true,
          matricula_rewards_opted_in_at: new Date().toISOString(),
          matricula_rewards_opt_in_notes: 'Opted in via dashboard interface'
        })
        .eq('id', university.id);

      if (updateError) {
        throw updateError;
      }

      // Success! Call callback to update interface
      onOptInSuccess();

    } catch (error: any) {
      console.error('Error opting into Matricula Rewards:', error);
      setError(error.message || 'Failed to opt into Matricula Rewards program');
    } finally {
      setIsOptingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#05294E] rounded-full mb-6">
            <Gift className="h-10 w-10 text-white" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Multiply your enrollments with the program that's{' '}
            <span className="text-[#05294E]">
              revolutionizing higher education!
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Join the universities that are already transforming how they attract and retain students 
            through the most innovative rewards system in the market.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow hover:border-[#05294E]/20">
            <div className="w-14 h-14 bg-[#05294E]/10 rounded-xl flex items-center justify-center mb-6">
              <TrendingUp className="h-7 w-7 text-[#05294E]" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Increase your enrollments
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Attract more qualified students with exclusive discounts and rewards system.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow hover:border-[#05294E]/20">
            <div className="w-14 h-14 bg-[#05294E]/10 rounded-xl flex items-center justify-center mb-6">
              <Target className="h-7 w-7 text-[#05294E]" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Stand out from competition
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Be the preferred university with a unique incentive program for students.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow hover:border-[#05294E]/20">
            <div className="w-14 h-14 bg-[#05294E]/10 rounded-xl flex items-center justify-center mb-6">
              <Award className="h-7 w-7 text-[#05294E]" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Improve your visibility
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Increase your market presence and attract the best global talent.
            </p>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#05294E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#05294E]">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Students Earn Credits</h3>
              <p className="text-gray-600">
                By completing actions such as document uploads, fee payments, and other activities.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#05294E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#05294E]">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Redeem Discounts</h3>
              <p className="text-gray-600">
                Credits are converted into exclusive discounts at your university.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#05294E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#05294E]">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">More Enrollments</h3>
              <p className="text-gray-600">
                Result: more motivated students choose your university!
              </p>
            </div>
          </div>
        </div>

        {/* Success Stories */}
        <div className="bg-[#05294E] rounded-2xl p-8 text-white mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            Universities that are already revolutionizing
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-center mb-4">
                <Star className="h-5 w-5 text-yellow-300 mr-2" />
                <span className="font-semibold">Adelphi University</span>
              </div>
              <p className="text-blue-50">
                "The Matricula Rewards program transformed our international student recruitment."
              </p>
            </div>

            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-center mb-4">
                <Star className="h-5 w-5 text-yellow-300 mr-2" />
                <span className="font-semibold">Other Universities</span>
              </div>
              <p className="text-blue-50">
                "We significantly increased our enrollments with the rewards system."
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6 max-w-md mx-auto">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleOptIn}
              disabled={isOptingIn}
              className="inline-flex items-center px-8 py-4 bg-[#05294E] text-white font-semibold text-lg rounded-xl hover:bg-[#05294E]/90 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOptingIn ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Joining...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-3" />
                  JOIN NOW
                  <ArrowRight className="h-5 w-5 ml-3" />
                </>
              )}
            </button>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="block mx-auto text-[#05294E] hover:text-[#05294E]/80 font-medium transition-colors"
            >
              {showDetails ? 'Hide details' : 'Learn more about the program'}
            </button>
          </div>

          {showDetails && (
            <div className="mt-8 bg-white rounded-xl p-6 shadow-lg border border-gray-200 max-w-4xl mx-auto text-left">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Matricula Rewards Program Details
              </h3>
              
              <div className="space-y-4 text-gray-600">
                <p>
                  The Matricula Rewards program is an innovative initiative that connects international students 
                  with excellence universities through a unique rewards system.
                </p>
                
                <p>
                  <strong>For your university:</strong> Access to a growing pool of qualified students, 
                  increased conversion rate from applications to enrollments, and competitive differentiation in the market.
                </p>
                
                <p>
                  <strong>For students:</strong> Credit system for actions, exclusive tuition discounts, 
                  and clear path to enrollment at partner universities.
                </p>
                
                <p>
                  <strong>Implementation:</strong> Simple and fast process. After opting to participate, 
                  your university will be integrated into the system within 24 hours.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatriculaRewardsOptIn;
