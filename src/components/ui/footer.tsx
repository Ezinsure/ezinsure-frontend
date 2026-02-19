"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface NavLink {
  href: string;
  label: string;
}

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { user } = useAuth();
  const [footerLinks, setFooterLinks] = useState<NavLink[]>([
    { href: '/', label: 'Home' },
    { href: '/apply', label: 'Apply Now' },
    { href: '/track', label: 'Track Application' },
    { href: '/FAQ', label: 'FAQ' },
  ]);

  useEffect(() => {
    // Update footer links based on user role (same as navbar)
    if (user) {
      const rolePrefix = `/${user.role.toLowerCase()}`;
      const newLinks = [
        { href: `${rolePrefix}/dashboard`, label: 'Dashboard' },
      ];

      if (user.role === 'ADMIN') {
        newLinks.push(
          { href: `${rolePrefix}/applications`, label: 'Applications' },
          { href: `${rolePrefix}/my-applications`, label: 'My Applications' },
          { href: `${rolePrefix}/new-application`, label: 'Apply' },
          { href: `${rolePrefix}/users`, label: 'Manage Users' },
          { href: `${rolePrefix}/expiring-insurance`, label: 'Expiring Insurance' },
          { href: `${rolePrefix}/sms-tracking`, label: 'SMS Tracking' }
        );
      } else if (user.role === 'SUPER_ADMIN') {
        newLinks.push(
          { href: `${rolePrefix}/applications`, label: 'Applications' },
          { href: `${rolePrefix}/users`, label: 'Manage Users' },
          { href: `${rolePrefix}/expiring-insurance`, label: 'Expiring Insurance' },
          { href: `${rolePrefix}/sms-tracking`, label: 'SMS Tracking' }
        );
      } else if (user.role === 'AGENT') {
        newLinks.push(
          { href: `${rolePrefix}/applications`, label: 'My Applications' },
          { href: `${rolePrefix}/apply`, label: 'Apply' }
        );
      } else if (user.role === 'FINANCE') {
        newLinks.push(
          { href: `${rolePrefix}/history`, label: 'Payment History' }
        );
      }

      // Add FAQ and Profile links for all logged-in users
      newLinks.push({ href: `${rolePrefix}/FAQ`, label: 'FAQ' });
      newLinks.push({ href: `${rolePrefix}/profile`, label: 'Profile' });

      setFooterLinks(newLinks);
    } else {
      // Default links for non-logged in users (without About Us)
      setFooterLinks([
        { href: '/', label: 'Home' },
        { href: '/apply', label: 'Apply Now' },
        { href: '/track', label: 'Track Application' },
        { href: '/FAQ', label: 'FAQ' },
      ]);
    }
  }, [user]);

  return (
    <footer className="bg-[#0A2540] text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="mb-4">
              <span className="text-2xl font-bold">
                EZ<span className="text-[var(--accent-orange)]">INSURE</span>
              </span>
            </div>
            <p className="text-gray-300 mb-4 text-sm">
              Insurance made effortless. Get instant quotes, compare options,
              and complete purchases in minutes—all online or via mobile.
            </p>
            <p className="text-gray-300 mb-4 text-sm">
              EZINSURE is an initiative of SOLEKTRA in partnership with a local insurance company
              to provide easy access to insurance services in Rwanda.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54v-2.891h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.459h-1.26c-1.243 0-1.63.771-1.63 1.563v1.875h2.773l-.443 2.891h-2.33V21.88c4.78-.75 8.437-4.887 8.437-9.88z" />
                </svg>
              </a>
              <a
                href="#"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.835c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.934.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.16 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </a>
              <a
                href="#"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Our Products</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Motorbike Insurance
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Car Insurance
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Building Insurance
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Travel Insurance
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Fire Insurance
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg
                  className="h-6 w-6 mr-2 text-[var(--accent-orange)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-gray-300">
                  KABC Building, 6th Floor, KN 5 RD, Kigali-Rwanda
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="h-6 w-6 mr-2 text-[var(--accent-orange)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-gray-300">
                  info@ezinsure.co / support@ezinsure.co
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="h-6 w-6 mr-2 text-[var(--accent-orange)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span className="text-gray-300">
                  Tel: +250 788 1667 700 / Call Center: 1150 Toll-free
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400">
          <p>&copy; {currentYear} EZINSURE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
