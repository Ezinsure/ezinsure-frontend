'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';

export default function Home() {
  const statsRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe elements with animation
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach((el) => {
      observer.observe(el);
    });

    return () => {
      animatedElements.forEach((el) => {
        observer.unobserve(el);
      });
    };
  }, []);

  return (
    <MainLayout containerClass="p-0" fullWidth>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#0A2540] to-[#126BB3] text-white pt-32 pb-20 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute w-96 h-96 bg-[#FF9D2F] rounded-full opacity-10 -top-20 -left-20"></div>
          <div className="absolute w-64 h-64 bg-[#126BB3] rounded-full opacity-20 bottom-10 right-10"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col-reverse lg:flex-row items-center">
            <div className="w-full lg:w-1/2 mt-10 lg:mt-0 slide-up">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                Insurance Made{' '}
                <span className="text-[var(--accent-orange)]">Simple</span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-gray-200">
                Get insured in minutes, not days. Fast, reliable coverage for
                what matters most.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/apply">
                  <Button variant="secondary" size="lg">
                    Get Insured Now
                  </Button>
                </Link>
                <Link href="/track">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white text-white hover:bg-white hover:text-[var(--main-blue)] hover:bg-opacity-10"
                  >
                    Track Application
                  </Button>
                </Link>
              </div>
            </div>
            <div className="w-full lg:w-1/2 slide-in-right">
              <div className="relative">
                <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 md:p-8 shadow-xl px-auto">
                  <Image
                    src="/support.jpg"
                    alt="Insurance Coverage"
                    width={700}
                    height={500}
                    className="rounded-lg mx-auto"
                  />
                </div>
                <div className="absolute -bottom-6 -right-3 sm:-right-6 bg-[var(--accent-orange)] rounded-lg p-4 shadow-lg pulse">
                  <div className="text-center">
                    <div className="font-bold text-2xl">24/7</div>
                    <div className="text-sm">Support</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white" ref={statsRef}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-on-scroll">
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow text-center">
              <div className="text-[var(--main-blue)] text-4xl font-bold mb-2">
                15K+
              </div>
              <div className="text-gray-600">Happy Clients</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow text-center">
              <div className="text-[var(--main-blue)] text-4xl font-bold mb-2">
                98%
              </div>
              <div className="text-gray-600">Claims Approval</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow text-center">
              <div className="text-[var(--main-blue)] text-4xl font-bold mb-2">
                5 Min
              </div>
              <div className="text-gray-600">Average Application Time</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow text-center">
              <div className="text-[var(--main-blue)] text-4xl font-bold mb-2">
                24/7
              </div>
              <div className="text-gray-600">Customer Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-[var(--light-gray)]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-on-scroll">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our Insurance Solutions
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Comprehensive coverage tailored to protect what matters most to
              you. Choose from our range of insurance products.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Motorbike Insurance',
                description:
                  'Protection for your two-wheeler with theft, accident, and third-party coverage.',
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 15l4-4 4 4 8-8"></path>
                    <circle cx="4" cy="4" r="2"></circle>
                    <circle cx="20" cy="4" r="2"></circle>
                    <circle cx="4" cy="20" r="2"></circle>
                    <circle cx="20" cy="20" r="2"></circle>
                  </svg>
                ),
              },
              {
                title: 'Car Insurance',
                description:
                  'Comprehensive coverage for your vehicle with roadside assistance and damage protection.',
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                    <path d="M2 12h20"></path>
                    <path d="M7 12v6"></path>
                    <path d="M17 12v6"></path>
                  </svg>
                ),
              },
              {
                title: 'Building Insurance',
                description:
                  'Protect your property against damage, fire, natural disasters, and theft.',
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                ),
              },
              {
                title: 'Travel Insurance',
                description:
                  'Coverage for trip cancellations, medical emergencies, and lost luggage while abroad.',
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                ),
              },
              {
                title: 'Health Insurance',
                description:
                  'Medical coverage for you and your family with access to top healthcare providers.',
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                  </svg>
                ),
              },
{
  title: 'Fire Insurance Coverage',
  description:
    'Protection for your property against fire damage, including coverage for rebuilding costs, smoke damage, and related perils.',
  icon: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
    </svg>
  ),
}
            ].map((service, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-all animate-on-scroll"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-[var(--accent-orange)] mb-4">
                  {service.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <Link
                  href="/apply"
                  className="text-[var(--main-blue)] font-medium hover:text-[var(--secondary-blue)] transition-colors"
                >
                  Learn more →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white" ref={featuresRef}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="w-full lg:w-1/2 mb-10 lg:mb-0 animate-on-scroll">
              <div className="relative">
                <div className="bg-[var(--light-gray)] rounded-lg p-6 shadow-lg px-auto">
                  <Image
                    src="/reliable.jpg"
                    alt="EZ Insurance App"
                    width={600}
                    height={600}
                    className="rounded-lg mx-auto"
                  />
                </div>
                <div className="absolute -bottom-8 -left-4 sm:-left-8 bg-white rounded-lg p-4 shadow-lg">
                  <div className="flex items-center">
                    <div className="bg-[var(--success-green)] rounded-full h-12 w-12 flex items-center justify-center text-white mr-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div>
                      <div className="text-gray-800 font-semibold">
                        Super Fast
                      </div>
                      <div className="text-gray-600 text-sm">
                        5-minute application
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-6 -right-3 sm:-right-6 bg-white rounded-lg p-4 shadow-lg">
                  <div className="flex items-center">
                    <div className="bg-[var(--main-blue)] rounded-full h-12 w-12 flex items-center justify-center text-white mr-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <div>
                      <div className="text-gray-800 font-semibold">
                        Reliable
                      </div>
                      <div className="text-gray-600 text-sm">
                        98% approval rate
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-1/2 lg:pl-12 animate-on-scroll">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Choose EZINSURE?
              </h2>
              <p className="text-gray-600 mb-8">
                We&apos;ve simplified the insurance process to make getting covered
                easier than ever before, with transparent pricing and quick
                approvals.
              </p>

              <div className="space-y-6">
                {[
                  {
                    title: 'Instant Digital Processing',
                    description:
                      'Apply, track, and receive your insurance documents digitally without physical paperwork.',
                  },
                  {
                    title: 'Transparent Pricing',
                    description:
                      "No hidden fees or surprise costs. Know exactly what you're paying for.",
                  },
                  {
                    title: 'Quick Claims Settlement',
                    description:
                      'Our efficient claims process ensures you get paid quickly when you need it most.',
                  },
                  {
                    title: '24/7 Customer Support',
                    description:
                      'Get help anytime with our round-the-clock customer service team.',
                  },
                ].map((feature, index) => (
                  <div key={index} className="flex">
                    <div className="mr-4 text-[var(--accent-orange)]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/apply" className="mt-8 inline-block">
                <Button variant="primary" size="lg">
                  Apply Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-[var(--light-gray)]" ref={testimonialsRef}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-on-scroll">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Our Clients Say
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Don&apos;t just take our word for it. Here&apos;s what our clients have to
              say about their experience with EZINSURE.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: 'Josiane Uwimana',
                role: 'Business Owner',
                text: 'The process was incredibly simple. I had my business insured within minutes, and their customer service team was very helpful when I had questions.',
              },
              {
                name: 'Emmanuel Habumugisha',
                role: 'Car Owner',
                text: 'I was involved in an accident and was worried about the claims process. EZINSURE settled my claim within days, making a stressful situation much easier.',
              },
              {
                name: 'Jean Claude Niyonzima',
                role: 'Frequent Traveler',
                text: "I travel a lot for work, and EZINSURE's travel insurance has been a lifesaver. Their global coverage and emergency assistance are top-notch.",
              },
            ].map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all animate-on-scroll"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center mb-4">
                  <div className="bg-[var(--mid-gray)] rounded-full h-12 w-12 flex items-center justify-center text-[var(--main-blue)] mr-4">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-gray-600 text-sm">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 italic">&quot;{testimonial.text}&quot;</p>
                <div className="mt-4 text-[var(--accent-orange)]">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <span key={i} className="inline-block">
                        ★
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-[#0A2540] to-[#126BB3] text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto animate-on-scroll">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Get Insured?
            </h2>
            <p className="text-xl text-gray-200 mb-8">
              Join thousands of satisfied customers who trust EZINSURE for their
              insurance needs.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/apply">
                <Button variant="secondary" size="lg">
                  Apply Now
                </Button>
              </Link>
              <Link href="/track">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-[var(--main-blue)] hover:bg-opacity-10"
                >
                  Track Your Application
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
