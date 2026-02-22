'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/ui/main-layout';

// General FAQ for public users and clients
const generalFaqItems = [
  {
    question: 'How do I apply to become an Agent?',
    answer: [
      'Go to the "Agents" page from the navigation.',
      'Fill in and submit the application form.',
      'Wait for approval (usually within 3 business days).'
    ],
    videoLink: 'https://youtu.be/8-R6Ls3sgxM'
  },
  {
    question: 'How do I apply for Insurance?',
    answer: [
      'Click on the "Apply Now" button in the top navigation.',
      'Fill in the required form and submit.',
      'You will receive a confirmation with a tracking number via email/SMS.'
    ],
    videoLink: ''
  },
  {
    question: 'How do I track my insurance application?',
    answer: [
      'Click on "Track Application" in the navbar.',
      'Enter your application tracking number.',
      'Verify your identity via OTP sent by email or SMS.',
      'View your current status, approval, or rejection feedback.'
    ],
    videoLink: ''
  },
  {
    question: 'What should I do if my application is in Action Required?',
    answer: [
      'Track your application to view the Action Required reason.',
      'Edit your information based on the provided feedback.',
      'Resubmit the corrected application for review.'
    ],
    videoLink: ''
  },
  {
    question: 'When and how will I receive a quotation?',
    answer: [
      'After your application is approved by the admin, you will be notified via email/SMS.',
      'Track your application again to download your personalized quotation.'
    ],
    videoLink: ''
  },
  {
    question: 'How do I pay for my insurance?',
    answer: [
      'Use the payment details provided in your quotation.',
      'After payment, go back to "Track Application" and upload your proof of payment.'
    ],
    videoLink: ''
  },
  {
    question: 'What if my payment proof is in Action Required?',
    answer: [
      'Track your application to view the Action Required reason.',
      'Make the necessary corrections or pay the remaining balance.',
      'Re-upload your updated proof of payment.'
    ],
    videoLink: ''
  },
  {
    question: 'When do I receive my insurance certificate and documents?',
    answer: [
      'After your payment is approved, the admin will send your certificate, EBM, contract, and receipt.',
      'You\'ll be notified via email/SMS to track and download the final documents.'
    ],
    videoLink: ''
  },
  {
    question: 'How do I track my agent application?',
    answer: [
      'Track using your application number and OTP if not yet approved.',
      'After approval, log in to your dashboard to view your agent status.'
    ],
    videoLink: ''
  }
];

// Agent-specific FAQ items
const agentFaqItems = [
  {
    question: 'How do I submit insurance applications for clients?',
    answer: [
      'Log into your agent account.',
      'Click on "New Application" and fill in the application on behalf of your client.',
      'Submit to initiate the review process.'
    ],
    videoLink: ''
  },
  {
    question: 'How can I edit a client\'s application in Action Required?',
    answer: [
      'Log in and go to "My Applications" from the navbar.',
      'Find the application in Action Required and click "Edit".',
      'Update the details as per feedback and resubmit.'
    ],
    videoLink: ''
  },
  {
    question: 'How do I upload proof of payment for a client?',
    answer: [
      'Go to "My Applications" → locate the relevant application.',
      'Click "Upload Proof" and submit the payment confirmation document.'
    ],
    videoLink: ''
  },
  {
    question: 'How do I download final client documents?',
    answer: [
      'Once the admin uploads them, you will be notified.',
      'Go to "My Applications" → download the certificate, EBM, contract, and receipt.'
    ],
    videoLink: ''
  },
  {
    question: 'How do I change my password?',
    answer: [
      'Click on your profile dropdown.',
      'Select "Change Password".',
      'Enter your current password, followed by the new password and confirmation.'
    ],
    videoLink: ''
  }
];

// Combine general and agent FAQ items
const allAgentFaqItems = [...generalFaqItems, ...agentFaqItems];

const getEmbedUrl = (url: string) => {
  if (!url?.trim()) return '';
  const youtuBe = url.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^/?&]+)/);
  if (youtuBe && youtuBe[1]) return `https://www.youtube.com/embed/${youtuBe[1]}`;
  const watch = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/);
  if (watch && watch[1]) return `https://www.youtube.com/embed/${watch[1]}`;
  return url;
};

export default function AgentFAQPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <h1 className="text-3xl font-bold mb-8 text-center text-[var(--secondary-blue)] relative z-10">
          Agent FAQ
        </h1>
        <div className="space-y-4 relative z-10">
          {allAgentFaqItems.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <button
                className="w-full flex justify-between items-center p-6 text-left hover:bg-gray-50 transition-colors group"
                onClick={() => toggleAccordion(index)}
                aria-expanded={activeIndex === index}
                aria-controls={`faq-content-${index}`}
              >
                <h3 className="text-lg font-semibold text-[var(--secondary-blue)] group-hover:text-[var(--main-blue)] transition-colors">
                  {item.question}
                </h3>
                <svg
                  className={`w-6 h-6 transform transition-transform ${activeIndex === index ? 'rotate-180' : ''} cursor-pointer stroke-[var(--secondary-blue)] group-hover:stroke-[var(--main-blue)] transition-colors`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div
                id={`faq-content-${index}`}
                className={`px-6 pb-6 ${activeIndex === index ? 'block' : 'hidden'}`}
              >
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  {item.answer.map((step: string, idx: number) => (
                    <li key={idx} className="text-sm leading-relaxed">{step}</li>
                  ))}
                </ol>
                {item.videoLink && getEmbedUrl(item.videoLink) && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Watch tutorial</p>
                    <div className="aspect-video max-w-2xl rounded-lg overflow-hidden bg-black">
                      <iframe
                        width="100%"
                        height="100%"
                        src={getEmbedUrl(item.videoLink)}
                        title={`Video tutorial: ${item.question}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                    <a
                      href={item.videoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-sm text-[var(--secondary-blue)] hover:text-[var(--main-blue)] font-medium transition-colors"
                    >
                      Watch on YouTube ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
} 