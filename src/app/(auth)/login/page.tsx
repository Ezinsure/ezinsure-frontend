'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { validateForm, ValidationRules, validationPatterns } from '@/components/ui/form-validation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface GeoLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
}

interface DeviceInfo {
  userAgent: string;
  platform: string;
  cookieEnabled: boolean;
  language: string;
  onLine: boolean;
  screenResolution: string;
  timezone: string;
  deviceMemory: number | undefined;
  hardwareConcurrency: number | undefined;
}

interface SecurityInfo {
  location: Partial<GeoLocationData>;
  device: DeviceInfo;
  loginTime: string;
  ipAddress: string;
}

const DUMMY_USERS = [
  { email: 'admin@ezinsure.com', password: 'Admin@123', role: 'admin', name: 'Admin User' },
  { email: 'agent1@ezinsure.com', password: 'Agent@123', role: 'agent', name: 'John Agent' },
  { email: 'agent2@ezinsure.com', password: 'Agent@123', role: 'agent', name: 'Jane Agent' },
];

export default function LoginPage() {
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();

  const [formState, setFormState] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      if (userData.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/agent/dashboard');
      }
    }

    // Check for registration success message
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
      showToast('Registration successful! Please sign in with your credentials.', 'success');
    }
  }, [router, showToast]);

  const getDeviceInfo = useCallback((): DeviceInfo => {
    const navigatorWithMemory = navigator as Navigator & {
      deviceMemory?: number;
    };

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      language: navigator.language,
      onLine: navigator.onLine,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      deviceMemory: navigatorWithMemory.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
    };
  }, []);

  const getGeoLocation = useCallback((): Promise<Partial<GeoLocationData>> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({});
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          resolve({
            latitude,
            longitude,
            accuracy,
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)} (Demo Address)`,
          });
        },
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formErrors = validateForm(formState, validationRules);
    setErrors(formErrors);

    if (Object.keys(formErrors).length === 0) {
      setIsSubmitting(true);

      try {
        const [location, deviceInfo] = await Promise.all([
          getGeoLocation(),
          Promise.resolve(getDeviceInfo()),
        ]);

        const user = DUMMY_USERS.find(
          (u) => u.email === formState.email && u.password === formState.password
        );

        if (user) {
          const securityInfo: SecurityInfo = {
            location,
            device: deviceInfo,
            loginTime: new Date().toISOString(),
            ipAddress: 'Demo IP: 192.168.1.100',
          };

          const userData = {
            email: user.email,
            role: user.role,
            name: user.name,
            authToken: 'dummy-token-' + Math.random().toString(36).substring(2, 15),
            securityInfo
          };
          
          localStorage.setItem('user', JSON.stringify(userData));
          showToast('Login successful! Redirecting...', 'success');
          
          setTimeout(() => {
            router.push(user.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard');
          }, 1000);
        } else {
          showToast('Invalid email or password. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Login error:', error);
        showToast('An error occurred. Please try again.', 'error');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      showToast('Please correct the errors in the form.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center px-4 py-12">
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
              type="password"
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
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot your password?
                </a>
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

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-bold text-blue-600 mb-2">Demo Credentials</h4>
              <div className="text-xs space-y-1 text-gray-600">
                <p><strong>Admin:</strong> admin@ezinsure.com / Admin@123</p>
                <p><strong>Agent:</strong> agent1@ezinsure.com / Agent@123</p>
              </div>
            </div>
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