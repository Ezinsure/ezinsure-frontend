'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function ComingSoonPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  // Helper function to set tester cookie
  const setTesterCookie = () => {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 1);
    document.cookie = `ezinsure-tester=solektraRwanda@2025; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (secretKey === 'solektraRwanda@2025') {
      setTesterCookie();
      // Use window.location instead of router to ensure middleware runs
      window.location.href = '/';
    } else {
      setError('Invalid access key');
      setSecretKey('');
    }
  };

  // Improved cookie checking
  useEffect(() => {
    if (showAuthModal) return; // Skip if modal is open

    // Parse cookies more reliably
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      return { ...acc, [key]: value };
    }, {} as Record<string, string>);

    // 1. Check if user is logged in
    if (cookies['ezinsure_token'] && cookies['ezinsure_user']) {
      try {
        const userData = JSON.parse(cookies['ezinsure_user'].split('=')[1]);
        router.push(`/${userData.role.toLowerCase()}/dashboard`);
        return;
      } catch (error) {
        console.error('Error parsing user data:', error);
        // Clear invalid cookies
        document.cookie = 'ezinsure_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie = 'ezinsure_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      }
    }

    // 2. Check if tester cookie exists
    if (cookies['ezinsure-tester'] === 'solektraRwanda@2025') {
      router.push('/');
      return;
    }

    // If neither logged in nor tester, stay on coming-soon page
  }, [router, showAuthModal]); // Added showAuthModal to dependencies

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      {/* Your existing animations and content */}

      {/* Animated Header */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <h1 className="text-5xl font-bold text-indigo-800 mb-2">EZINSURE</h1>
        <p className="text-xl text-indigo-600">Revolutionizing insurance solutions</p>
      </motion.div>

      {/* Countdown Animation */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ 
          duration: 1.5,
          repeat: Infinity,
          repeatType: 'reverse'
        }}
        className="relative w-64 h-64 mb-12"
      >
        <div className="absolute inset-0 rounded-full border-4 border-indigo-300 border-t-indigo-600 animate-spin"></div>
        <div className="absolute inset-4 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" style={{ animationDelay: '0.2s' }}></div>
        <div className="absolute inset-8 rounded-full border-4 border-indigo-100 border-t-indigo-400 animate-spin" style={{ animationDelay: '0.4s' }}></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-indigo-700">Coming Soon</span>
        </div>
      </motion.div>

      {/* Features Animation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full max-w-4xl">
        {['Instant Quotes', 'Super Fast Processes', 'Seamless Claims'].map((feature, i) => (
          <motion.div
            key={feature}
            initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: i * 0.2 }}
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-indigo-600 text-3xl mb-3">✨</div>
            <h3 className="font-semibold text-lg mb-2">{feature}</h3>
            <p className="text-gray-600">Cutting-edge technology for {feature.toLowerCase()}</p>
          </motion.div>
        ))}
      </div>

      {/* Contact Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-semibold mb-4 text-indigo-800">Have questions?</h2>
        <p className="mb-4 text-gray-700">Reach out to our team for more information</p>
        <div className="flex justify-center space-x-4">
          <a href="mailto:info@ezinsure.co" className="text-indigo-600 hover:text-indigo-800">Email: info@ezinsure.co</a>
          <span>•</span>
          {/* <a href="tel:+250784593206" className="text-indigo-600 hover:text-indigo-800">Phone</a>
          <span>•</span>
          <a href="https://wa.me/0784593206" className="text-indigo-600 hover:text-indigo-800">WhatsApp</a> */}
        </div>
      </motion.div>

      {/* Subtle Tester Access */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="mt-8 text-center"
      >
        <button
          onClick={() => setShowAuthModal(true)}
          className="text-sm text-indigo-500 hover:text-indigo-700 underline"
        >
          Team Member? Continue here
        </button>
      </motion.div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg p-6 max-w-sm w-full"
          >
            <h3 className="text-xl font-semibold mb-4">Team Access</h3>
            <form onSubmit={handleSubmit}>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter access key"
                className="w-full p-2 border rounded mb-4"
                required
              />
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthModal(false);
                    setSecretKey('');
                    setError('');
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Verify
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}