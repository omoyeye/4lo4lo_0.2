"use client";


import Link from "next/link";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-8 sm:p-10">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
            <Link href="/" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Back to Home
            </Link>
          </div>
          
          <div className="prose prose-purple dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-300">
            <p className="font-bold text-lg text-gray-900 dark:text-white">Last Updated: December 26, 2025</p>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. Introduction</h2>
              <p>This Privacy Policy explains how 4lo4lo.site ("Platform", "we", "us", "our") collects, uses, discloses, and protects your personal information when you use our social media task exchange platform.</p>
              <p>By using our Platform, you consent to the data practices described in this policy.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. Information We Collect</h2>
              <h3 className="text-lg font-semibold mt-4 mb-2">2.1 Information You Provide Directly</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Account Information:</strong> Name, email, username, encrypted password, DOB, country.</li>
                <li><strong>Payment Information:</strong> Payment method details, billing address, tax ID (if required).</li>
                <li><strong>Social Media Information:</strong> Usernames/URLs, profile links for verification.</li>
                <li><strong>Communications:</strong> Messages, support tickets, feedback.</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2">2.2 Information Collected Automatically</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Usage Data:</strong> IP address, browser type, device info, pages visited, interactions.</li>
                <li><strong>Task Activity:</strong> Completed tasks, credits earned/spent, withdrawal history.</li>
                <li><strong>Cookies:</strong> Session, analytics, and preference cookies.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Platform Operations:</strong> Account management, task processing, withdrawal verification, fraud prevention.</li>
                <li><strong>Communication:</strong> Transactional emails, support responses, Platform updates.</li>
                <li><strong>Analytics:</strong> Improving user experience and developing new features.</li>
                <li><strong>Legal/Security:</strong> Compliance, protecting against illegal activities.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">4. How We Share Your Information</h2>
              <p>We share information with service providers (payment processors, hosting, analytics), social media platforms (for verification), and as required by law or business transfers.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">6. Your Rights and Choices</h2>
              <p>Depending on your location, you may have rights to access, correct, delete, or restrict processing of your data. You can manage most information through your account settings or by contacting us.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">7. Security Measures</h2>
              <p>We implement SSL/TLS encryption, secure password hashing, and access controls. However, no method of transmission is 100% secure.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">9. Children's Privacy</h2>
              <p>Our Platform is NOT intended for users under 18 years old. We do not knowingly collect information from minors.</p>
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
