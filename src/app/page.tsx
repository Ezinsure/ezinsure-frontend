'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import FAQAccordion from '@/components/ui/FAQAccordion';

export default function Home() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.15,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fadeInUp');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe elements with animation
    const animatedElements = document.querySelectorAll('.scroll-animate');
    animatedElements.forEach((el) => {
      observer.observe(el);
    });

    // Handle back to top button visibility
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      animatedElements.forEach((el) => {
        observer.unobserve(el);
      });
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <MainLayout containerClass="p-0" fullWidth>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#0A2540] via-[#0d4474] to-[#126BB3] text-white pt-20 pb-20 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Animated Grid Pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          
          {/* Floating Orbs */}
          <div className="absolute w-[500px] h-[500px] bg-[#FF9D2F] rounded-full opacity-10 blur-3xl -top-48 -left-48 animate-float-slow"></div>
          <div className="absolute w-[400px] h-[400px] bg-[#126BB3] rounded-full opacity-15 blur-3xl bottom-0 right-0 animate-float-slow-reverse"></div>
        </div>

        <div className="container mx-auto px-6 lg:px-8 relative z-10">
          <div className="flex flex-col-reverse lg:flex-row items-center gap-16">
            <div className="w-full lg:w-1/2 mt-10 lg:mt-0">
              <div className="animate-fadeInUp">
                <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                  <svg className="w-4 h-4 text-[#FF9D2F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-white/90">Insurance Simplified</span>
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight">
                  Insurance Made{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9D2F] to-[#FFB963]">
                    Simple
                  </span>
                </h1>
                <p className="text-lg md:text-xl mb-10 text-gray-100 leading-relaxed max-w-xl">
                  Get insured in minutes, not days. Fast, reliable coverage for
                  what matters most to you and your family.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/apply">
                    <Button variant="secondary" size="lg" className="shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                      Get Insured Now
                    </Button>
                  </Link>
                  <Link href="/track">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-2 border-white/30 text-white hover:bg-white hover:text-[var(--main-blue)] backdrop-blur-sm bg-white/5 transition-all duration-300"
                    >
                      Track Application
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            <div className="w-full lg:w-1/2">
              <div className="relative animate-fadeInRight">
                <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-6 shadow-2xl border border-white/20">
                  <Image
                    src="/support.jpg"
                    alt="Insurance Coverage"
                    width={700}
                    height={500}
                    className="rounded-xl mx-auto"
                  />
                  {/* Floating Badge */}
                  <div className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 bg-gradient-to-br from-[#FF9D2F] to-[#e88a1f] rounded-xl p-5 shadow-2xl animate-bounce-subtle">
                    <div className="text-center">
                      <div className="font-bold text-3xl text-white">24/7</div>
                      <div className="text-sm text-white/90 font-medium">Support</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-[#126BB3] rounded-full opacity-5 blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#FF9D2F] rounded-full opacity-5 blur-3xl translate-x-1/2 translate-y-1/2"></div>
        
        <div className="container mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 scroll-animate">
            {[
              { value: '15K+', label: 'Happy Clients', delay: '0ms' },
              { value: '98%', label: 'Claims Approval', delay: '100ms' },
              { value: '5 Min', label: 'Average Application Time', delay: '200ms' },
              { value: '24/7', label: 'Customer Support', delay: '300ms' },
            ].map((stat, index) => (
              <div
                key={index}
                className="group bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 text-center border border-gray-100 hover:border-[#126BB3]/20 hover:-translate-y-2"
                style={{ animationDelay: stat.delay }}
              >
                <div className="text-transparent bg-clip-text bg-gradient-to-br from-[#126BB3] to-[#0A2540] text-5xl font-bold mb-3">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-dot-pattern opacity-30"></div>
        
        <div className="container mx-auto px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12 scroll-animate">
            <div className="inline-block mb-4 px-4 py-2 bg-[#126BB3]/10 rounded-full">
              <span className="text-sm font-semibold text-[#126BB3]">Our Services</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Our Insurance Solutions
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-base leading-relaxed">
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
                    width="28"
                    height="28"
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
                    width="28"
                    height="28"
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
                    width="28"
                    height="28"
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
                    width="28"
                    height="28"
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
                    width="28"
                    height="28"
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
                    width="28"
                    height="28"
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
                className="group scroll-animate bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-[#126BB3]/20 hover:-translate-y-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#FF9D2F]/20 to-[#FF9D2F]/5 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <div className="text-[#FF9D2F]">
                    {service.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{service.title}</h3>
                <p className="text-gray-600 mb-5 leading-relaxed text-sm">{service.description}</p>
                <Link
                  href="/apply"
                  className="inline-flex items-center text-[#126BB3] font-semibold hover:text-[#0A2540] transition-colors text-sm group"
                >
                  Learn more 
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-[#126BB3] rounded-full opacity-5 blur-3xl -translate-y-1/2"></div>
        
        <div className="container mx-auto px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="w-full lg:w-1/2 mb-10 lg:mb-0 scroll-animate">
              <div className="relative">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 shadow-xl">
                  <Image
                    src="/reliable.jpg"
                    alt="EZ Insurance App"
                    width={600}
                    height={600}
                    className="rounded-xl mx-auto"
                  />
                </div>
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-5 shadow-2xl border border-gray-100 animate-float-subtle">
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-[#43a047] to-[#2e7d32] rounded-xl h-14 w-14 flex items-center justify-center text-white">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div>
                      <div className="text-gray-900 font-bold text-sm">
                        Super Fast
                      </div>
                      <div className="text-gray-600 text-xs">
                        5-minute application
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-6 -right-6 bg-white rounded-xl p-5 shadow-2xl border border-gray-100 animate-float-subtle" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-[#126BB3] to-[#0A2540] rounded-xl h-14 w-14 flex items-center justify-center text-white">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <div>
                      <div className="text-gray-900 font-bold text-sm">
                        Reliable
                      </div>
                      <div className="text-gray-600 text-xs">
                        98% approval rate
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-1/2 scroll-animate">
              <div className="inline-block mb-3 px-4 py-2 bg-[#126BB3]/10 rounded-full">
                <span className="text-xs font-semibold text-[#126BB3]">Why Choose Us</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Why Choose EZINSURE?
              </h2>
              <p className="text-gray-600 mb-6 text-base leading-relaxed">
                We&apos;ve simplified the insurance process to make getting covered
                easier than ever before, with transparent pricing and quick
                approvals.
              </p>

              <div className="space-y-4 mb-6">
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
                  <div key={index} className="flex gap-3 group">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#FF9D2F]/20 to-[#FF9D2F]/5 rounded-xl flex items-center justify-center text-[#FF9D2F] group-hover:scale-110 transition-transform duration-300">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold mb-1 text-gray-900">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/apply">
                <Button variant="primary" size="lg" className="shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  Apply Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-dot-pattern opacity-30"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FF9D2F] rounded-full opacity-5 blur-3xl translate-x-1/2 translate-y-1/2"></div>
        
        <div className="container mx-auto px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12 scroll-animate">
            <div className="inline-block mb-4 px-4 py-2 bg-[#126BB3]/10 rounded-full">
              <span className="text-sm font-semibold text-[#126BB3]">Testimonials</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              What Our Clients Say
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-base leading-relaxed">
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
                className="scroll-animate bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-[#126BB3]/20 hover:-translate-y-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-br from-[#126BB3] to-[#0A2540] rounded-full h-14 w-14 flex items-center justify-center text-white text-xl font-bold mr-4">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-gray-500 text-sm">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed mb-6">&quot;{testimonial.text}&quot;</p>
                <div className="flex gap-1 text-[#FF9D2F]">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-[#0A2540] via-[#0d4474] to-[#126BB3] text-white relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF9D2F] rounded-full opacity-10 blur-3xl translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full opacity-5 blur-3xl -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="container mx-auto px-6 lg:px-8 text-center relative z-10">
          <div className="max-w-4xl mx-auto scroll-animate">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              Ready to Get Insured?
            </h2>
            <p className="text-lg md:text-xl text-gray-100 mb-8 leading-relaxed">
              Join thousands of satisfied customers who trust EZINSURE for their
              insurance needs.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link href="/apply">
                <Button variant="secondary" size="lg" className="shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 text-lg px-10">
                  Apply Now
                </Button>
              </Link>
              <Link href="/track">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-white/30 text-white hover:bg-white hover:text-[#0A2540] backdrop-blur-sm bg-white/5 transition-all duration-300 hover:scale-105 text-lg px-10"
                >
                  Track Your Application
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
     
      {/* FAQ Section */}
      <section className="py-16 bg-white relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#126BB3] rounded-full opacity-5 blur-3xl -translate-x-1/2"></div>
        
        <div className="container mx-auto px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12 scroll-animate">
            <div className="inline-block mb-4 px-4 py-2 bg-[#126BB3]/10 rounded-full">
              <span className="text-sm font-semibold text-[#126BB3]">Help Center</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              How to Use EZINSURE
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-base leading-relaxed">
              Get started quickly with our step-by-step guides. Watch our tutorial videos to learn how to navigate our platform.
            </p>
          </div>

          <div className="max-w-4xl mx-auto scroll-animate">
            <FAQAccordion />
            <div className="text-center mt-12">
              <Link href="/FAQ">
                <Button variant="outline" size="lg" className="hover:scale-105 transition-all duration-300">
                  View More FAQs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-50 bg-gradient-to-br from-[#126BB3] to-[#0A2540] text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 ${
          showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16 pointer-events-none'
        }`}
        aria-label="Back to top"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </button>
    </MainLayout>
  );
}
