'use client';

import { useState } from 'react';
// import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/ui/main-layout';

const faqItems = [
  {
    question: 'How to apply for Insurance ?',
    answer: [
      'Click on the "Apply Now" button.',
      'Fill out the required information.',
      'Submit your application.',
      'You will receive instant confirmation and your policy documents via email.'
    ],
    videoLink: 'https://www.youtube.com/watch?v=qB9GpOy_N98'
  },
  {
    question: 'How to apply to become an Agent ?',
    answer: [
      'Visit our Agents page.',
      'Complete the application form.',
      'We will review your qualifications.',
      'You will get a response within 3 business days with next steps.'
    ],
    videoLink: 'https://www.youtube.com/watch?v=qB9GpOy_N98'
  },
  {
    question: 'How to track progress of insurance application ?',
    answer: [
      'Log into your account or use the "Track Application" feature.',
      'You will receive regular updates via email and SMS as your application progresses.'
    ],
    videoLink: 'https://www.youtube.com/watch?v=qB9GpOy_N98'
  },
  {
    question: 'How to track progress of become an agent application ?',
    answer: [
      'Submit your agent application.',
      'You will receive login credentials for the agent portal.',
      'Log in to check your status and any required next steps.'
    ],
    videoLink: 'https://www.youtube.com/watch?v=qB9GpOy_N98'
  },
  {
    question: 'How to make a claim ?',
    answer: [
      'Log into your account and navigate to the Claims section.',
      'Fill out the claim form with details of the incident.',
      'Submit any required documentation.',
      'Our team will process your claim promptly.'
    ],
    videoLink: 'https://www.youtube.com/watch?v=qB9GpOy_N98'
  }
];

const getEmbedUrl = (url: string) => {
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url;
};

export default function FAQPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0  bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <h1 className="text-3xl font-bold mb-8 text-center text-[var(--secondary-blue)]">Frequently Asked Questions</h1>
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                className="w-full flex justify-between items-center p-6 text-left hover:bg-gray-50 transition-colors group"
                onClick={() => toggleAccordion(index)}
                aria-expanded={activeIndex === index}
                aria-controls={`faq-content-${index}`}
              >
                <h3 className="text-lg font-semibold text-[var(--secondary-blue)] group-hover:text-[var(--main-blue)] transition-colors">{item.question}</h3>
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
                <ol className="list-decimal list-inside space-y-1 mb-4 text-gray-600">
                  {item.answer.map((step: string, idx: number) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
                <div className="aspect-w-16 aspect-h-9 mb-4">
                  <iframe
                    width="100%"
                    height="315"
                    src={getEmbedUrl(item.videoLink)}
                    title={`Video tutorial for ${item.question}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg"
                  ></iframe>
                </div>
                <a
                  href={item.videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--secondary-blue)] hover:text-[var(--secondary-blue)] font-medium"
                >
                  Watch on YouTube ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
} 