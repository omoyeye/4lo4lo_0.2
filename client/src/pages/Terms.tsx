import { Link } from "wouter";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-8 sm:p-10">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Terms and Conditions</h1>
            <Link href="/" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Back to Home
            </Link>
          </div>
          
          <div className="prose prose-purple dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-300">
            <p className="font-bold text-lg text-gray-900 dark:text-white">Last Updated: March 2, 2026</p>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. Acceptance of Terms</h2>
              <p>By accessing or using 4lo4lo.site ("Platform", "Service", "Community", "we", "us"), you agree to be bound by these Terms and Conditions. If you do not agree, do not use this Platform.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. Eligibility</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>You must be at least 18 years old to use this Platform</li>
                <li>You must have the legal capacity to enter into binding contracts</li>
                <li>You must not be prohibited from using the Service under applicable laws</li>
                <li>You represent that all information provided is accurate and current</li>
                <li>You agree to participate in good faith as a member of our global creator community</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. Platform Description & Mission</h2>
              <p>4lo4lo is a <strong>global planned community for content creators and influencers</strong> where members come together for:</p>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">3.1 Our Community Purpose</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Knowledge Sharing</strong>: Access educational resources, strategies, and insights from fellow creators worldwide</li>
                <li><strong>Friendship & Networking</strong>: Connect with like-minded content creators and influencers globally</li>
                <li><strong>Collaborative Growth</strong>: Support each other in growing social media presence and earning opportunities</li>
                <li><strong>Collective Success</strong>: A community where we push ourselves to make money together through mutual support</li>
                <li><strong>Educational Development</strong>: Access to teaching materials and resources (currently in development)</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">3.2 Platform Services</h3>
              <p>Members can:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Complete social media engagement tasks (likes, follows, shares, comments) to earn credits/rewards</li>
                <li>Use earned credits to promote their own social media content and grow their audience</li>
                <li>Withdraw earnings according to Platform rules</li>
                <li>Participate in community discussions, knowledge sharing, and creator networking</li>
                <li>Access educational resources and teaching materials (when available)</li>
                <li>Collaborate with fellow creators worldwide</li>
                <li>Share strategies, tips, and success stories with the community</li>
              </ul>
            </section>

            <section className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-100 dark:border-red-900/30">
              <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-4">4. Important Disclaimer Regarding Social Media Platforms</h2>
              <p className="font-bold mb-4">CRITICAL NOTICE: Many social media platforms prohibit artificial engagement, incentivized interactions, and services like ours in their Terms of Service.</p>
              <p>By using our Platform, you acknowledge and accept that:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Your social media accounts may be suspended, banned, or penalized by third-party platforms</li>
                <li>We are NOT responsible for any consequences to your social media accounts</li>
                <li>You use this Service entirely at your own risk</li>
                <li>You are solely responsible for complying with all third-party platform policies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">5. User Accounts & Community Membership</h2>
              <h3 className="text-lg font-semibold mt-4 mb-2">5.1 Registration</h3>
              <p>You must provide accurate, complete information when creating your account. One account per person; multiple accounts may be terminated without warning.</p>
              <h3 className="text-lg font-semibold mt-4 mb-2">5.2 Account Termination</h3>
              <p>We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, use automated bots, or fail to maintain community standards.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">6. Community Guidelines & User Conduct</h2>
              <p>As a member, you agree to support fellow creators, share knowledge generously, and maintain respect. Prohibited activities include using bots, scripts, providing fake engagement, or harassing other members.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">7. Credits and Payments</h2>
              <p>Credits are earned by completing tasks. Credits can be used to promote your own content or withdrawn as real money according to our withdrawal policy. Processing times typically range from 1-7 business days.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">12. Disclaimers and Limitation of Liability</h2>
              <p className="italic">THE PLATFORM AND COMMUNITY ARE PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</p>
              <p>To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages, including social media account penalties or lost earnings.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">18. Dispute Resolution</h2>
              <p>These Terms are governed by the laws of England and Wales. Before pursuing formal resolution, you agree to attempt informal resolution by contacting support@4lo4lo.site.</p>
            </section>

            <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Contact Information</h2>
              <p>Email: <a href="mailto:support@4lo4lo.site" className="text-primary hover:underline">support@4lo4lo.site</a></p>
              <p>Website: <a href="https://4lo4lo.site" className="text-primary hover:underline">https://4lo4lo.site</a></p>
            </section>
          </div>
          
          <div className="mt-10 flex justify-center">
            <Link href="/signup" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
              Accept and Continue to Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
