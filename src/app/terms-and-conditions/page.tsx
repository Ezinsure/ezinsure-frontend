'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

export default function TermsAndConditionsPage() {
  const { showToast, ToastContainer } = useToast();
  const [isAccepted, setIsAccepted] = useState(false);

  const handleAcceptTerms = () => {
    if (isAccepted) {
      showToast('Terms and conditions accepted successfully!', 'success');
      // You can add navigation logic here if needed
      // router.push('/dashboard') or similar
    } else {
      showToast('Please accept the terms and conditions to continue.', 'error');
    }
  };

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-12">
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <div className="max-w-4xl mx-auto mt-16">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Digital Insurance Agent Terms and Conditions
            </h1>
            <p className="text-gray-600">
              Please read these terms and conditions carefully before proceeding. 
              By accepting these terms, you agree to abide by all policies and guidelines.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-[var(--main-blue)] to-[var(--secondary-blue)] text-white">
              <h2 className="text-xl font-semibold">Agent Agreement</h2>
              <p className="opacity-80">
                Terms and conditions for digital insurance agents
              </p>
            </div>

            <div className="p-6 max-h-[600px] overflow-y-auto">
              <div className="space-y-8">
                {/* Section 1 */}
                <section>
                  <h3 className="text-xl font-semibold mb-4 text-[var(--main-blue)]">
                    1. Professional Conduct
                  </h3>
                  <div className="space-y-3 text-gray-700">
                    <p>• Agents must treat all clients with courtesy and respect at all times.</p>
                    <p>• Use of inappropriate language, aggressive behavior, or discrimination will result in immediate suspension.</p>
                    <p>• Agents must always greet customers by saying: &quot;Welcome, [Client Name], how can I assist you today?&quot; and close with &quot;Thank you for your business, [Client Name]. We appreciate you.&quot;</p>
                  </div>
                </section>

                {/* Section 2 */}
                <section>
                  <h3 className="text-xl font-semibold mb-4 text-[var(--main-blue)]">
                    2. Identification & Dress Code
                  </h3>
                  <div className="space-y-3 text-gray-700">
                    <p>• Agents must wear their official jacket and visible ID badge while on duty.</p>
                    <p>• The jacket must clearly display the agent&apos;s ID number at all times.</p>
                    <p>• Appearance must be clean and professional.</p>
                  </div>
                </section>

                {/* Section 3 */}
                <section>
                  <h3 className="text-xl font-semibold mb-4 text-[var(--main-blue)]">
                    3. Performance Standards
                  </h3>
                  <div className="space-y-3 text-gray-700">
                    <p>• Agents must complete a minimum of 15 transactions per month to remain active.</p>
                    <p>• Failure to meet the minimum for two consecutive months may lead to removal from the program unless an exception is approved.</p>
                    <p>• Bonus incentives may apply for agents completing more than 25 transactions per month.</p>
                  </div>
                </section>

                {/* Section 4 */}
                <section>
                  <h3 className="text-xl font-semibold mb-4 text-[var(--main-blue)]">
                    4. Zero Tolerance for Fraud or Misrepresentation
                  </h3>
                  <div className="space-y-3 text-gray-700">
                    <p>• Providing false or misleading information will lead to immediate termination and legal consequences.</p>
                    <p>• All transactions must be accurately recorded with proper client documentation.</p>
                    <p>• Agents may not sign on behalf of clients under any circumstance.</p>
                  </div>
                </section>

                {/* Section 5 */}
                <section>
                  <h3 className="text-xl font-semibold mb-4 text-[var(--main-blue)]">
                    5. Equipment and Availability
                  </h3>
                  <div className="space-y-3 text-gray-700">
                    <p>• Agents must have access to a computer, scanner, and reliable internet connection.</p>
                    <p>• If the agent does not have internet, support may be provided for business use only.</p>
                    <p>• Agents must be reachable by telephone and must have an active WhatsApp account.</p>
                    <p>• Agents are expected to be available to customers during business hours or inform clients when unavailable.</p>
                  </div>
                </section>

                {/* Section 6 */}
                <section>
                  <h3 className="text-xl font-semibold mb-4 text-[var(--main-blue)]">
                    6. Customer Confidentiality
                  </h3>
                  <div className="space-y-3 text-gray-700">
                    <p>• Agents must protect all customer data and personal information.</p>
                    <p>• Use of client information for non-insurance purposes is strictly prohibited.</p>
                  </div>
                </section>

                {/* Section 7 */}
                <section>
                  <h3 className="text-xl font-semibold mb-4 text-[var(--main-blue)]">
                    7. Use of Tools & Materials
                  </h3>
                  <div className="space-y-3 text-gray-700">
                    <p>• Agents must use only approved marketing materials and official documents.</p>
                    <p>• Company-issued tools must be handled responsibly and returned upon exit.</p>
                  </div>
                </section>

                {/* Section 8 */}
                <section>
                  <h3 className="text-xl font-semibold mb-4 text-[var(--main-blue)]">
                    8. Sales Ethics & Territory
                  </h3>
                  <div className="space-y-3 text-gray-700">
                    <p>• Agents must only operate within assigned zones unless authorized otherwise.</p>
                    <p>• Agents must not sell or promote competing services during work hours or in uniform.</p>
                  </div>
                </section>

                {/* Section 9 */}
                <section>
                  <h3 className="text-xl font-semibold mb-4 text-[var(--main-blue)]">
                    9. Feedback & Customer Experience
                  </h3>
                  <div className="space-y-3 text-gray-700">
                    <p>• Agents should actively listen to client concerns and report complaints within 24 hours.</p>
                    <p>• Agents may be asked to collect customer feedback as part of service improvement.</p>
                  </div>
                </section>

                {/* Section 10 */}
                <section>
                  <h3 className="text-xl font-semibold mb-4 text-[var(--main-blue)]">
                    10. Compliance & Accountability
                  </h3>
                  <div className="space-y-3 text-gray-700">
                    <p>• Agents must attend all required training sessions and policy updates.</p>
                    <p>• Breaches of conduct may result in suspension, loss of commission, or permanent termination.</p>
                    <p>• All agents must sign this document to confirm acceptance of these terms.</p>
                  </div>
                </section>
              </div>
            </div>

            {/* Acceptance Section */}
            <div className="p-6 bg-gray-50 border-t">
              <div className="flex items-start space-x-3 mb-6">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={isAccepted}
                  onChange={(e) => setIsAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 text-[var(--main-blue)] border-gray-300 rounded focus:ring-[var(--main-blue)]"
                />
                <label htmlFor="acceptTerms" className="text-sm text-gray-700">
                  I have read and understood the Digital Insurance Agent Terms and Conditions. 
                  I agree to abide by all the policies and guidelines outlined above and understand 
                  that failure to comply may result in suspension or termination of my agent status.
                </label>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={handleAcceptTerms}
                  variant="primary"
                  size="lg"
                  className="w-full md:w-auto min-w-[200px]"
                  disabled={!isAccepted}
                >
                  Accept Terms & Continue
                </Button>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-8 bg-[var(--light-gray)] rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Important Notes</h3>
            <div className="space-y-3 text-gray-700">
              <p>• These terms and conditions are subject to change with proper notice to all agents.</p>
              <p>• Any disputes regarding these terms should be reported to the management team immediately.</p>
              <p>• Agents are encouraged to ask questions about any unclear terms before accepting.</p>
              <p>• Regular training sessions will be conducted to ensure all agents stay updated with policy changes.</p>
              <p>• For questions or clarifications, please contact the support team during business hours.</p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="mt-6 bg-white rounded-lg p-6 border">
            <h3 className="text-lg font-semibold mb-3">Need Help?</h3>
            <p className="text-gray-600 mb-4">
              If you have any questions about these terms and conditions, please don&apos;t hesitate to contact us:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Email Support:</p>
                <p className="text-[var(--main-blue)]">support@company.com</p>
              </div>
              <div>
                <p className="font-medium">Phone Support:</p>
                <p className="text-[var(--main-blue)]">+250 123 456 789</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </MainLayout>
  );
}