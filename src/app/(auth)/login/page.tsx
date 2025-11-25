'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { validateForm, ValidationRules, validationPatterns } from '@/components/ui/form-validation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getTrackingData } from '@/utils/tracking';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import RubiksCube from '@/components/ui/rubiks-cube';

// Define DeviceInfo type
interface DeviceInfo {
  operatingSystem?: string;
  os?: string;
  platform?: string;
  ipAddress?: string;
  browser?: string;
  timezone?: string;
  lastUsedAt?: string | number | Date;
}

export default function LoginPage() {
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const { login, isAuthenticated, user } = useAuth();

  const [formState, setFormState] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal state
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [forceLogout, setForceLogout] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [pendingLogin, setPendingLogin] = useState<{ email: string; password: string } | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  const validationRules: ValidationRules = {
    email: { 
      required: true, 
      pattern: validationPatterns.email,
    },
    password: { 
      required: true, 
      minLength: 8,
    },
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      router.push(`/${user.role.toLowerCase()}/dashboard`);
    }
  }, [isAuthenticated, user, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleDeviceModalConfirm = () => {
    setShowDeviceModal(false);
    if (pendingLogin) {
      handleSubmitWithDevice(pendingLogin.email, pendingLogin.password);
    }
  };

  const handleSubmitWithDevice = async (email: string, password: string) => {
    setIsSubmitting(true);
    try {
      const trackingData = await getTrackingData();
      const payload: Record<string, unknown> = { ...trackingData, forceLogout };
      const result: Record<string, unknown> = await login(email, password, payload);
      if (result?.specialCase) {
        setDeviceInfo(result.deviceInfo as DeviceInfo);
        setShowDeviceModal(true);
        setPendingLogin({ email, password });
        setIsSubmitting(false);
        return;
      }
      showToast('Login successful! Redirecting...', 'success');
      setForceLogout(false);
      setPendingLogin(null);
    } catch (error) {
      console.log('error checking', error);
      let errorMessage = 'Login failed. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
      ) {
        errorMessage = (error as { message: string }).message;
      }
      showToast(errorMessage, 'error');
      setPendingLogin(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validateForm(formState, validationRules);
    setErrors(formErrors);
    if (Object.keys(formErrors).length === 0) {
      setIsSubmitting(true);
      try {
        const trackingData = await getTrackingData();
        const payload: Record<string, unknown> = { ...trackingData };
        const result: Record<string, unknown> = await login(formState.email, formState.password, payload);
        if (result?.specialCase) {
          setDeviceInfo(result.deviceInfo as DeviceInfo);
          setShowDeviceModal(true);
          setPendingLogin({ email: formState.email, password: formState.password });
          setIsSubmitting(false);
          return;
        }
        showToast('Login successful! Redirecting...', 'success');
        setForceLogout(false);
        setPendingLogin(null);
      } catch (error) {
        let errorMessage = 'Login failed. Please try again.';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (
          typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message?: unknown }).message === 'string'
        ) {
          errorMessage = (error as { message: string }).message;
        }
        showToast(errorMessage, 'error');
        setPendingLogin(null);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      showToast('Please correct the errors in the form.', 'error');
    }
  };

  // Forgot password submit handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail.match(validationPatterns.email)) {
      setForgotError('Please enter a valid email address.');
      return;
    }
    setForgotSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/forgotPassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (res.ok && data.message === 'Reset link sent to email') {
        showToast('Check your email for a link to reset your password.', 'success');
        setShowForgotPasswordModal(false);
        setForgotEmail('');
      } else if (data.message === 'User not found') {
        showToast('User not found. Please verify your email address.', 'error');
      } else {
        showToast('Failed to send reset link. Please try again.', 'error');
      }
    } catch (err) {
      console.log('Error calling backend', err)
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className="h-screen bg-white flex overflow-x-hidden overflow-y-auto text-xs">
      {/* Left Panel - Visual/Content */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-[#0A2540] via-[#0d4474] to-[#126BB3] relative overflow-hidden h-full text-[0.85rem]">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-grid-pattern"></div>
        </div>
        
        {/* Floating Orbs */}
        <div className="absolute w-80 h-80 bg-[#FF9D2F] rounded-full opacity-10 blur-3xl -top-20 -left-20 animate-float-slow"></div>
        <div className="absolute w-64 h-64 bg-[#126BB3] rounded-full opacity-15 blur-3xl bottom-10 right-10 animate-float-slow-reverse"></div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-8 py-8 text-white">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-4"
          >
            <div className="flex items-center mb-4">
              <Link href="/" className="text-3xl font-bold text-white">
                EZ<span className="text-[#FF9D2F]">INSURE</span>
              </Link>
            </div>
            <h2 className="text-2xl font-bold mb-2 leading-tight">Insurance Made Simple</h2>
            <p className="text-gray-100 text-sm leading-relaxed mb-5">
              Streamline your insurance management with our powerful platform designed for agents and administrators.
            </p>
            
            {/* Feature highlights */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-[#FF9D2F]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-100 text-xs">Instant Digital Processing</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-[#FF9D2F]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-100 text-xs">Transparent Pricing</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-[#FF9D2F]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-100 text-xs">Quick Claims Settlement</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-[#FF9D2F]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-100 text-xs">24/7 Customer Support</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-4"
          >
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-2xl">
              <div className="flex gap-1 text-[#FF9D2F] mb-2">
                {Array(5).fill(0).map((_, i) => (
                  <svg key={i} className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-white text-xs leading-relaxed mb-3 italic">
                &ldquo;The process was incredibly simple. I had my business insured within minutes, and their customer service team was very helpful when I had questions.&rdquo;
              </p>
              <div className="flex items-center pt-2 border-t border-white/20">
                <div className="w-9 h-9 rounded-full overflow-hidden mr-2.5 shadow-lg ring-2 ring-white/30">
                  <Image src="/support.jpg" alt="Client" width={36} height={36} className="w-9 h-9 object-cover" />
                </div>
                <div>
                  <p className="text-white font-bold text-xs">Josiane Uwimana</p>
                  <p className="text-gray-200 text-[0.65rem]">Business Owner</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 lg:w-3/5 flex flex-col justify-center px-4 py-4 lg:px-10 relative min-h-screen overflow-x-hidden overflow-y-auto text-[0.9rem]">
        {/* Decorative animated background */}
        <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
          <div className="absolute w-64 h-64 bg-[#126BB3] rounded-full opacity-5 blur-3xl -top-20 -right-20 animate-float-slow"></div>
          <div className="absolute w-48 h-48 bg-[#FF9D2F] rounded-full opacity-5 blur-3xl bottom-10 -left-10 animate-float-slow-reverse"></div>
        </div>
        {/* Back to Home link - visible on all breakpoints */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-3"
        >
          <Link href="/" className="inline-flex items-center text-gray-600 hover:text-[#126BB3] font-medium transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Home
          </Link>
        </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
      {showForgotPasswordModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 relative border border-gray-100"
            >
            <button
              onClick={() => setShowForgotPasswordModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label="Close"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 bg-gradient-to-br from-[#126BB3] to-[#0A2540] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Enter your email address and we&apos;ll send you a link to reset your password.</p>
              </div>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                name="forgot-email"
                placeholder="your.email@company.com"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                error={forgotError}
                required
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                }
              />
              <Button type="submit" variant="primary" fullWidth disabled={forgotSubmitting}>
                {forgotSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
            </motion.div>
          </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showDeviceModal && deviceInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 relative border border-gray-100"
            >
            <button
              onClick={() => setShowDeviceModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label="Close"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 bg-gradient-to-br from-[#FF9D2F] to-[#e88a1f] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Device Conflict</h3>
                <p className="text-gray-600 text-sm leading-relaxed">You&apos;re already logged in on another device. Do you want to continue here?</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-700 space-y-2">
                  <div className="flex justify-between"><span className="font-medium">OS:</span> <span>{(deviceInfo?.operatingSystem || 'unknown')} {(deviceInfo?.os || '')}</span></div>
                  <div className="flex justify-between"><span className="font-medium">Platform:</span> <span>{deviceInfo?.platform || 'unknown'}</span></div>
                  <div className="flex justify-between"><span className="font-medium">IP:</span> <span>{deviceInfo?.ipAddress || 'unknown'}</span></div>
                  <div className="flex justify-between"><span className="font-medium">Browser:</span> <span>{deviceInfo?.browser || 'unknown'}</span></div>
                  <div className="flex justify-between"><span className="font-medium">Last Used:</span> <span>{deviceInfo?.lastUsedAt ? new Date(deviceInfo.lastUsedAt).toLocaleString() : 'unknown'}</span></div>
                </div>
            </div>
              <div className="flex items-center mb-6 p-4 bg-gradient-to-r from-[#126BB3]/5 to-[#FF9D2F]/5 rounded-lg border border-gray-200">
                <input
                  id="forceLogout"
                  type="checkbox"
                  checked={forceLogout}
                  onChange={e => setForceLogout(e.target.checked)}
                  className="h-4 w-4 text-[#126BB3] focus:ring-[#126BB3] border-gray-300 rounded"
                />
                <label htmlFor="forceLogout" className="ml-3 text-sm text-gray-700 font-medium">Log out from all other devices and continue here</label>
              </div>
            <Button type="button" variant="primary" fullWidth onClick={handleDeviceModalConfirm}>
              Continue
            </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Rubik's Cube decorative element */}
        <div className="absolute top-3 left-3 sm:top-6 sm:left-6 z-10 scale-50 sm:scale-90 origin-top-left">
          <RubiksCube size={90} lineColor="#94a3b8" lineOpacity={0.5} />
        </div>
        <div className="absolute bottom-10 right-8 sm:bottom-20 sm:right-16 z-10 scale-50 sm:scale-90 origin-bottom-right">
          <RubiksCube size={72} lineColor="#cbd5e1" lineOpacity={0.35} />
        </div>

        {/* Main Login Form */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-sm w-full mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
              <p className="text-gray-600 text-base">
                Sign in to your insurance management account
              </p>
            </motion.div>
          </div>

          {/* Form */}
          <motion.form 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            onSubmit={handleSubmit} 
            className="space-y-4"
          >
            <div className="space-y-3">
            <Input
              label="Email Address"
              type="email"
              name="email"
                placeholder="Enter your email"
              value={formState.email}
              onChange={handleInputChange}
              error={errors.email}
              required
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              }
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              value={formState.password}
              onChange={handleInputChange}
              error={errors.password}
              required
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              }
            />
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center">
                <input
                  id="show-password"
                  name="show-password"
                  type="checkbox"
                  className="h-4 w-4 text-[#126BB3] focus:ring-[#126BB3] border-gray-300 rounded"
                  checked={showPassword}
                  onChange={e => setShowPassword(e.target.checked)}
                />
                <label htmlFor="show-password" className="ml-2 block text-sm text-gray-600">
                  Show password
                </label>
              </div>

              <button
                type="button"
                className="text-sm font-medium text-[#126BB3] hover:text-[#0A2540] transition-colors"
                onClick={() => setShowForgotPasswordModal(true)}
              >
                Forgot password?
              </button>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={isSubmitting}
              className="bg-gradient-to-r from-[#324558] to-[#1c2a3a] hover:from-[#283648] hover:to-[#151f2c] shadow-md hover:shadow-lg transition-all duration-300"
            >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
            </Button>
            </motion.div>
          </motion.form>

          {/* Footer Links */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-6 pt-4 border-t border-gray-200"
          >
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                Want to become an agent?{' '}
                <Link href="/register" className="font-semibold text-[#126BB3] hover:text-[#0A2540] transition-colors">
                  Apply here
                </Link>
              </p>
              <p className="text-sm text-gray-600">
                Are you a client looking to apply for insurance?{' '}
                <Link href="/apply" className="font-semibold text-[#126BB3] hover:text-[#0A2540] transition-colors">
                  Apply online
                </Link>
                {' '}or{' '}
                <Link href="/" className="font-semibold text-[#126BB3] hover:text-[#0A2540] transition-colors">
                  find an agent
                </Link>
                {' '}near you.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
      <ToastContainer />
    </div>
  );
}