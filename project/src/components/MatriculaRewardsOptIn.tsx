import React, { useState } from 'react';
import { 
  Coins, 
  ArrowRight,
  Zap
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUniversity } from '../context/UniversityContext';
import { supabase } from '../lib/supabase';
import UniversityProgramOptInModal from './ForUniversities/UniversityProgramOptInModal';

// Shadcn Card components
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={`bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm ${className}`}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={`@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 ${className}`}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={`leading-none font-semibold ${className}`}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={`text-muted-foreground text-sm ${className}`}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={`px-6 ${className}`}
      {...props}
    />
  )
}

interface MatriculaRewardsOptInProps {
  onOptInSuccess: () => void;
}

const MatriculaRewardsOptIn: React.FC<MatriculaRewardsOptInProps> = ({ onOptInSuccess }) => {
  const { user } = useAuth();
  const { university } = useUniversity();
  const [isOptingIn, setIsOptingIn] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
            <Coins className="h-10 w-10 text-white" />
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
          <Card className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow hover:border-[#05294E]/20">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 mb-4">
                Increase your enrollments
              </CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                Attract more qualified students with exclusive discounts and rewards system.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow hover:border-[#05294E]/20">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 mb-4">
                Stand out from competition
              </CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                Be the preferred university with a unique incentive program for students.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow hover:border-[#05294E]/20">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 mb-4">
                Improve your visibility
              </CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                Increase your market presence and attract the best global talent.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How It Works Section */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>
          
          {/* Referral Process and Coin System */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="bg-[#05294E] rounded-xl p-6 border border-[#05294E] text-white">
              <CardHeader>
                <CardTitle className="text-xl font-semibold mb-4">Referral Process</CardTitle>
                <CardDescription className="text-white">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span>Students invite other students to register on the platform</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span>Each invitation uses a unique and traceable referral code</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span>Inviting students automatically earn <strong>Matricula Coins</strong></span>
                    </li>
                  </ul>
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-[#05294E] rounded-xl p-6 border border-[#05294E] text-white">
              <CardHeader>
                <CardTitle className="text-xl font-semibold mb-4">Coin System</CardTitle>
                <CardDescription className="text-white">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span><strong>1 Matricula Coin = $1 USD</strong> (fixed value)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span>Coins can be redeemed as direct tuition discount</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span>Student chooses their university for coin redemption</span>
                    </li>
                  </ul>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* How It Works for Your University */}
          <div className="mb-12">
            <h3 className="text-2xl font-semibold text-gray-900 text-center mb-8">
              How It Works for Your University
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <Card className="text-center">
                <div className="w-20 h-20 bg-[#05294E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-[#05294E]">1</span>
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900 mb-3">Student Requests</CardTitle>
                <CardDescription className="text-gray-600">
                  Student requests discount through the platform using their accumulated Matricula Coins.
                </CardDescription>
              </Card>

              <Card className="text-center">
                <div className="w-20 h-20 bg-[#05294E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-[#05294E]">2</span>
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900 mb-3">University Applies</CardTitle>
                <CardDescription className="text-gray-600">
                  University applies the discount to the student's tuition and confirms the application.
                </CardDescription>
              </Card>

              <Card className="text-center">
                <div className="w-20 h-20 bg-[#05294E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-[#05294E]">3</span>
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900 mb-3">MatriculaUSA Pays</CardTitle>
                <CardDescription className="text-gray-600">
                  MatriculaUSA pays the discount amount directly to the university.
                </CardDescription>
              </Card>
            </div>
            
            {/* Practical Example */}
            <Card className="bg-[#05294E] rounded-xl p-6 border border-[#05294E] text-white">
              <CardHeader>
                <CardTitle className="font-semibold text-white mb-4 text-center text-lg">Practical Example</CardTitle>
                <CardDescription className="text-white">
                  <div className="text-center space-y-2">
                    <p>
                      <strong>Student requests $50 discount</strong>
                    </p>
                    <p className="text-white/80">↓</p>
                    <p>
                      <strong>University applies $50 to tuition</strong>
                    </p>
                    <p className="text-white/80">↓</p>
                    <p>
                      <strong>MatriculaUSA pays $50 to the university</strong>
                    </p>
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Detailed Benefits */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 text-center mb-8">
              Benefits for Your University
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-4 bg-[#05294E] rounded-xl border border-[#05294E] text-white">
                <CardTitle className="font-semibold text-white mb-2">Direct Payment</CardTitle>
                <CardDescription className="text-white text-sm">
                  Receive direct payment for each discount applied, without intermediaries.
                </CardDescription>
              </Card>

              <Card className="p-4 bg-[#05294E] rounded-xl border border-[#05294E] text-white">
                <CardTitle className="font-semibold text-white mb-2">Dedicated Dashboard</CardTitle>
                <CardDescription className="text-white text-sm">
                  Exclusive dashboard to manage balance and request payments.
                </CardDescription>
              </Card>

              <Card className="p-4 bg-[#05294E] rounded-xl border border-[#05294E] text-white">
                <CardTitle className="font-semibold text-white mb-2">Increases Attractiveness</CardTitle>
                <CardDescription className="text-white text-sm">
                  Available discounts attract more qualified students.
                </CardDescription>
              </Card>

              <Card className="p-4 bg-[#05294E] rounded-xl border border-[#05294E] text-white">
                <CardTitle className="font-semibold text-white mb-2">Automated Process</CardTitle>
                <CardDescription className="text-white text-sm">
                  Everything works transparently and automatically.
                </CardDescription>
              </Card>
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
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-8 py-4 bg-[#05294E] text-white font-semibold text-lg rounded-xl hover:bg-[#05294E]/90 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Zap className="h-5 w-5 mr-3" />
              JOIN NOW
              <ArrowRight className="h-5 w-5 ml-3" />
            </button>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="block mx-auto text-[#05294E] hover:text-[#05294E]/80 font-medium transition-colors"
            >
              {showDetails ? 'Hide details' : 'Learn more about the program'}
            </button>
          </div>

          {showDetails && (
            <Card className="mt-8 bg-white rounded-xl p-6 shadow-lg border border-gray-200 max-w-4xl mx-auto text-left">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 mb-4">
                  Matricula Rewards Program Details
                </CardTitle>
                <CardDescription className="text-gray-600">
                  <div className="space-y-4">
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
                      your university will be integrated into the system instantly.
                    </p>
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
      
      <UniversityProgramOptInModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onAccept={handleOptIn}
        onDecline={() => setIsModalOpen(false)}
        universityId={university?.id}
      />
    </div>
  );
};

export default MatriculaRewardsOptIn;
