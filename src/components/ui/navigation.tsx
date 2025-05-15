"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLink {
  href: string;
  label: string;
}

interface User {
  email: string;
  role: string;
  name: string;
  authToken: string;
}

export const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  // Default navigation links for non-logged in users
  const [navLinks, setNavLinks] = useState<NavLink[]>([
    { href: '/', label: 'Home' },
    { href: '/track', label: 'Track Application' },
    { href: '/apply', label: 'Apply Now' },
    { href: '/login', label: 'Login' },
  ]);

  useEffect(() => {
    // Handle scroll for navbar styling
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData: User = JSON.parse(storedUser);
      setUser(userData);
      
      // Update navigation links based on user role
      if (userData.role === 'admin') {
        setNavLinks([
          { href: '/admin/applications', label: 'Applications' },
          { href: '/admin/dashboard', label: 'Dashboard' },
          { href: '/admin/users', label: 'Manage Users' },
        ]);
      } else if (userData.role === 'agent') {
        setNavLinks([
          { href: '/agent/applications', label: 'My Applications' },
          { href: '/agent/commissions', label: 'My Commissions' },
        ]);
      }
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    // Close profile dropdown if open
    if (isProfileDropdownOpen) setIsProfileDropdownOpen(false);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleLogout = () => {
    // Clear user data from local storage
    localStorage.removeItem('user');
    // Redirect to home page
    window.location.href = '/';
  };

  // Function to get user initials
  const getUserInitials = () => {
    if (!user || !user.name) return '?';
    return user.name.split(' ').map(name => name[0]).join('').toUpperCase();
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
            
            {/* Show different buttons based on login status */}
            {!user ? (
              <Link
                href="/apply"
                className="bg-[var(--main-blue)] hover:bg-[var(--secondary-blue)] text-white py-2 px-4 rounded-lg font-medium text-sm transition-colors"
              >
                Get Insured
              </Link>
            ) : (
              <div className="relative">
                <button 
                  onClick={toggleProfileDropdown}
                  className="w-10 h-10 rounded-full bg-[var(--main-blue)] text-white flex items-center justify-center font-medium hover:bg-[var(--secondary-blue)] transition-colors cursor-pointer"
                >
                  {getUserInitials()}
                </button>
                
                {/* Profile Dropdown */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <Link 
                      href="/profile" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      Profile Settings
                    </Link>
                    <button 
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
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
          
          {/* Show relevant buttons/actions based on login status */}
          {!user ? (
            <Link
              href="/apply"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block w-full text-center bg-[var(--main-blue)] hover:bg-[var(--secondary-blue)] text-white py-2 px-4 rounded-lg font-medium text-sm mt-2"
            >
              Get Insured
            </Link>
          ) : (
            <>
              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block py-2 font-medium text-sm text-gray-600"
              >
                Profile Settings
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left py-2 font-medium text-sm text-red-600"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};