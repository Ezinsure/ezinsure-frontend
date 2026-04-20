"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface NavLink {
  href: string;
  label: string;
}

export const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isAdmin = user?.role === 'ADMIN';

  // Default navigation links for non-logged in users
  const [navLinks, setNavLinks] = useState<NavLink[]>([
    { href: '/', label: 'Home' },
    { href: '/track', label: 'Track Application' },
    { href: '/FAQ', label: 'FAQ' },
    { href: '/login', label: 'Login' },
    { href: '/register', label: 'Become an Agent' },
  ]);

  useEffect(() => {
    // Handle scroll for navbar styling
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    
    // Update navigation links based on user role
    if (user) {
      const rolePrefix = `/${user.role.toLowerCase()}`;
      const newLinks: NavLink[] = [{ href: `${rolePrefix}/dashboard`, label: 'Dashboard' }];

      if (user.role === 'ADMIN') {
        newLinks.push(
          { href: `${rolePrefix}/applications`, label: 'Applications' },
          { href: `${rolePrefix}/my-applications`, label: 'My Applications' },
          { href: `${rolePrefix}/new-application`, label: 'Apply' },
          { href: `${rolePrefix}/commission-review`, label: 'Commission Review' },
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
          { href: `${rolePrefix}/payments`, label: 'Payments' },
          { href: `${rolePrefix}/payment-initiated`, label: 'Initiated Payments' },
          { href: `${rolePrefix}/history`, label: 'Payment History' }
        );
      }

      // Add FAQ link for all logged-in users
      newLinks.push({ href: `${rolePrefix}/FAQ`, label: 'FAQ' });
      newLinks.push({ href: `${rolePrefix}/profile`, label: 'Profile' });

      setNavLinks(newLinks);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [user]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    // Close profile dropdown if open
    if (isProfileDropdownOpen) setIsProfileDropdownOpen(false);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };

  // Function to get user initials
  const getUserInitials = () => {
    if (!user || !user.fullName) return '?';
    return user.fullName.split(' ').map(fullName => fullName[0]).join('').toUpperCase();
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
          <div
            className={`hidden md:flex items-center ${
              isAdmin ? 'space-x-3 lg:space-x-4 ml-6 lg:ml-10' : 'space-x-4 lg:space-x-6 ml-8 lg:ml-12'
            }`}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`cursor-pointer transition-colors ${
                  isAdmin ? 'font-medium text-[11px] lg:text-xs' : 'font-semibold text-xs lg:text-sm'
                } ${isScrolled ? 'text-[var(--foreground)] hover:text-[var(--accent-orange)]' : 'text-[var(--light-gray)] hover:text-[var(--accent-orange)]'} ${
                  pathname === link.href
                    ? 'underline underline-offset-4 underline-[var(--accent-orange)]'
                    : 'hover:text-[var(--accent-orange)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Show different buttons based on login status */}
            {!user ? (
              <Link
                href="/apply"
                className="bg-[var(--main-blue)] hover:bg-[var(--secondary-blue)] text-white py-2 px-3 lg:px-4 rounded-lg font-medium text-xs lg:text-sm transition-colors"
              >
                Apply Now
              </Link>
            ) : (
              <div className="relative">
                <button 
                  onClick={toggleProfileDropdown}
                  className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-[var(--main-blue)] text-white flex items-center justify-center font-medium hover:bg-[var(--secondary-blue)] transition-colors cursor-pointer text-xs lg:text-sm"
                >
                  {getUserInitials()}
                </button>
                
                {/* Profile Dropdown */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <p className="font-medium">{user.fullName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <Link 
                      href={`/${user.role.toLowerCase()}/profile`}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      Profile Settings
                    </Link>
                    <button 
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className={`${isScrolled ? 'text-[var(--foreground)] ' : 'text-[var(--light-gray)] '} focus:outline-none`}
            >
              <svg
                className="h-5 w-5 sm:h-6 sm:w-6"
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
        <div className="px-4 py-2 space-y-2 sm:space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block py-2 font-medium text-xs sm:text-sm ${
                pathname === link.href
                  ? 'text-[var(--main-blue)]'
                  : 'text-gray-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
          
          {/* Show relevant buttons/actions based on login status */}
          {!user ? (
            <Link
              href="/apply"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block w-full text-center bg-[var(--main-blue)] hover:bg-[var(--secondary-blue)] text-white py-2 px-4 rounded-lg font-medium text-xs sm:text-sm mt-2"
            >
              Apply Now
            </Link>
          ) : (
            <>
              <Link
                href={`/${user.role.toLowerCase()}/profile`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block py-2 font-medium text-xs sm:text-sm text-gray-600"
              >
                Profile Settings
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left py-2 font-medium text-xs sm:text-sm text-red-600"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      {isLoggingOut && (
        <div className="fixed inset-0 bg-gray-800/25 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
    </nav>
  );
};