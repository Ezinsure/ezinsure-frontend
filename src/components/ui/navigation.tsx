"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLink {
  href: string;
  label: string;
}

export const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks: NavLink[] = [
    { href: '/', label: 'Home' },
    { href: '/track', label: 'Track Application' },
    { href: '/apply', label: 'Apply Now' },
    { href: '/login', label: 'Login' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav 
      className={`fixed w-full z-30 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-[var(--main-blue)]">
              EZ<span className="text-[var(--accent-orange)]">INSURE</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-semibold cursor-pointer text-md transition-colors  ${isScrolled ? 'text-[var(--foreground)] hover:text-[var(--accent-orange)]' : 'text-[var(--light-gray)] hover:text-[var(--accent-orange)]'} ${
                  pathname === link.href
                    ? 'underline underline-offset-4 underline-[var(--accent-orange)]'
                    : 'hover:text-[var(--accent-orange)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/apply"
              className="bg-[var(--main-blue)] hover:bg-[var(--secondary-blue)] text-white py-2 px-4 rounded-lg font-medium text-sm transition-colors"
            >
              Get Insured
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className={`${isScrolled ? 'text-[var(--foreground)] ' : 'text-[var(--light-gray)] '} focus:outline-none`}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
          isMobileMenuOpen ? 'max-h-screen bg-white' : 'max-h-0'
        }`}
      >
        <div className="px-4 py-2 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block py-2 font-medium text-sm ${
                pathname === link.href
                  ? 'text-[var(--main-blue)]'
                  : 'text-gray-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/apply"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block w-full text-center bg-[var(--main-blue)] hover:bg-[var(--secondary-blue)] text-white py-2 px-4 rounded-lg font-medium text-sm mt-2"
          >
            Get Insured
          </Link>
        </div>
      </div>
    </nav>
  );
};