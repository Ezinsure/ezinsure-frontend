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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center px-4 py-12 relative">
      {/* Back to Home link */}
      <div className="absolute left-0 top-0 w-full flex justify-start p-4 z-20">
        <Button as="a" href="/" variant="text" size="md" className="text-blue-700 bg-white/80 hover:bg-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Button>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-gray-800/75">
          <div className="bg-white rounded-lg shadow-xl mt-12 w-full max-w-md mx-4 p-6 relative animate-fadeInDown">
            <button
              onClick={() => setShowForgotPasswordModal(false)}
              className="absolute top-3 cursor-pointer right-3 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-lg font-semibold mb-2 text-center">Forgot Password</h3>
            <p className="text-gray-600 text-sm mb-4 text-center">Enter your email address and we&apos;ll send you a link to reset your password.</p>
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
          </div>
        </div>
      )}

      {showDeviceModal && deviceInfo && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-gray-800/75">
          <div className="bg-white rounded-lg shadow-xl mt-12 w-full max-w-md mx-4 p-6 relative animate-fadeInDown">
            <button
              onClick={() => setShowDeviceModal(false)}
              className="absolute top-3 cursor-pointer right-3 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-lg font-semibold mb-2 text-center">Another Device Detected</h3>
            <div className="text-gray-700 text-sm mb-4">
              <div className="mb-2">You&apos;re already logged in on another device. Do you want to log out from all other devices and continue logging in here?</div>
              <div><b>OS:</b> {(deviceInfo.operatingSystem || 'unknown')} {(deviceInfo.os || '')}</div>
              <div><b>Platform:</b> {deviceInfo.platform || 'unknown'}</div>
              <div><b>IP Address:</b> {deviceInfo.ipAddress || 'unknown'}</div>
              <div><b>Browser:</b> {deviceInfo.browser || 'unknown'}</div>
              <div><b>Timezone:</b> {deviceInfo.timezone || 'unknown'}</div>
              <div><b>Last Used:</b> {deviceInfo.lastUsedAt ? new Date(deviceInfo.lastUsedAt).toLocaleString() : 'unknown'}</div>
            </div>
            <div className="flex items-center mb-4">
              <input
                id="forceLogout"
                type="checkbox"
                checked={forceLogout}
                onChange={e => setForceLogout(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="forceLogout" className="text-sm">Yes, log out from all other devices and continue</label>
            </div>
            <Button type="button" variant="primary" fullWidth onClick={handleDeviceModalConfirm}>
              Continue
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-md w-full space-y-8 bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-center">
          <h2 className="text-2xl font-bold">Agent & Admin Login</h2>
          <p className="text-sm opacity-80 mt-1">
            Access your insurance management system
          </p>
        </div>

        <div className="p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-gray-600">
              This portal is exclusively for insurance agents and administrators.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              name="email"
              placeholder="your.email@company.com"
              value={formState.email}
              onChange={handleInputChange}
              error={errors.email}
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
                  width="20"
                  height="20"
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

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="show-password"
                  name="show-password"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300 rounded"
                  checked={showPassword}
                  onChange={e => setShowPassword(e.target.checked)}
                />
                <label htmlFor="show-password" className="ml-2 block text-sm text-gray-700">
                  Show password
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  className="font-medium cursor-pointer text-blue-600 hover:text-blue-500 focus:outline-none"
                  onClick={() => setShowForgotPasswordModal(true)}
                >
                  Forgot your password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
            </Button>
    
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Want to become an agent?{' '}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Apply here
              </Link>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Are you a client looking to apply for insurance?{' '}
              <Link href="/apply" className="font-medium text-blue-600 hover:text-blue-500">
                Apply online
              </Link>
              {' '}or{' '}
              <Link href="/" className="font-medium text-blue-600 hover:text-blue-500">
                find an agent
              </Link>
              {' '}near you.
            </p>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}