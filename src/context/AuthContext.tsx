'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import type { AppUser } from '@/shared/types/auth';
import { getDashboardPath, getRolePathPrefix } from '@/shared/routing/paths';
import { resolveUserDefaultProductLine } from '@/shared/utils/product-line-access';

type User = AppUser;

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, payload?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  forceLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to get cookie value
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleRouteProtection = useCallback(() => {
    const PUBLIC_ROUTES = ['/', '/apply', '/login', '/register', '/track', '/terms-and-conditions', '/privacy-policy', '/FAQ', '/reset-password', '/verify-email-change'];
    
    // Skip if still loading, not initialized, or currently logging in
    if (isLoading || !isInitialized || isLoggingIn) return;
  
    // Extract pathname without query parameters
    const cleanPathname = pathname.split('?')[0];
  
    // **1. If logged in (has token & user)**
    if (token && user) {
      const defaultLine = resolveUserDefaultProductLine(user);
      const userDashboard = getDashboardPath(user.role, defaultLine);
      const rolePrefix = `/${getRolePathPrefix(user.role)}`;

      // Allow access to verification page even if authenticated (user might be verifying email change)
      if (cleanPathname === '/verify-email-change') {
        return;
      }

      // Redirect to dashboard if trying to access public routes
      if (PUBLIC_ROUTES.includes(cleanPathname)) {
        router.push(userDashboard);
        return;
      }
  
      // Ensure they stay in their role's routes
      if (!cleanPathname.startsWith(rolePrefix)) {
        router.push(userDashboard);
        return;
      }
    }
    // **2. Not logged in - allow access to public routes**
    else {
      // Allow access to public routes (using clean pathname)
      if (PUBLIC_ROUTES.includes(cleanPathname)) {
        return;
      }
  
      // For protected routes, redirect to login
      const protectedRoutePatterns = ['/admin', '/agent', '/super_admin', '/finance', '/vet'];
      const isProtectedRoute = protectedRoutePatterns.some(pattern => cleanPathname.startsWith(pattern));
  
      if (isProtectedRoute) {
        router.push('/login');
        return;
      }
  
      // For any other unknown route, redirect to home or 404
      // You can customize this behavior based on your needs
      if (cleanPathname !== '/' && !PUBLIC_ROUTES.includes(cleanPathname)) {
        router.push('/');
      }
    }
  }, [isLoading, isInitialized, isLoggingIn, pathname, router, token, user]);

  const login = async (email: string, password: string, payload?: Record<string, unknown>): Promise<Record<string, unknown>> => {
    try {
      setIsLoggingIn(true);
      
      const formData = new URLSearchParams();
      formData.append('email', email);
      formData.append('password', password);
      if (payload && typeof payload.forceLogout !== 'undefined') {
        formData.append('forceLogout', (payload.forceLogout as boolean) ? 'true' : 'false');
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      // console.log('response', response);

      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData: Record<string, unknown> = await response.json();
          errorMessage = (errorData.error as string) || (errorData.message as string) || errorMessage;
          if (response.status === 403 && errorData.device) {
            return { specialCase: true, message: errorMessage, deviceInfo: errorData.device };
          }
        } catch (e) {
          // If parsing fails, keep errorMessage as 'Login failed'
          console.log("Error: ", e)
        }
        throw new Error(errorMessage);
      }

      const { data, token } = await response.json();

      // Persist the token for both middleware (cookie) and client-side code (sessionStorage).
      sessionStorage.setItem('ezinsure_token', token);

      const cookieOptions = {
        path: '/',
        sameSite: 'Lax' as const,
        secure: process.env.NODE_ENV === 'production',
      };

      // Minimal auth cookie for middleware; user data always comes from /auth/me
      document.cookie = `ezinsure_token=${token}; ${Object.entries(cookieOptions)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')}`;

      // Update state immediately
      setToken(token);
      setUser(data);
      
      // Notify other tabs about login
      localStorage.setItem('auth_event', JSON.stringify({
        type: 'login',
        token,
        user: data,
        timestamp: Date.now()
      }));
      
      // Use window.location.href for more reliable redirect
      const loginUser = data as AppUser;
      const dashboardUrl = getDashboardPath(
        loginUser.role,
        resolveUserDefaultProductLine(loginUser),
      );
      window.location.href = dashboardUrl;
      return { success: true, data, token };
    } catch (error) {
      console.error('Login error:', error);
      setIsLoggingIn(false);
      throw error;
    }
  };

  const logout = useCallback(async (): Promise<void> => {
    try {
      // Call the logout API with token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/logout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      let responseData: Record<string, unknown> = {};
      try {
        responseData = await response.json();
      } catch {}

      if (response.ok && responseData.message === 'Logged out successfully.') {
        // Only clear everything if logout API succeeded
        setToken(null);
        setUser(null);
        sessionStorage.removeItem('ezinsure_token');
        // Clear auth cookie so middleware treats user as logged out
        document.cookie = 'ezinsure_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        localStorage.setItem('auth_event', JSON.stringify({
          type: 'logout',
          timestamp: Date.now()
        }));
        window.location.href = '/login'; // Use hard redirect
        // Optionally, show a toast for success
        return;
      } else if (responseData.error) {
        // Handle known error from backend
        console.error('Logout API error:', responseData.error);
        // Optionally, show a toast or alert here
        return;
      } else {
        // Handle unknown error
        console.error('Logout API error:', responseData);
        // Optionally, show a toast or alert here
        return;
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Optionally, show a toast or alert here
    }
  }, [router, token]);

  // Force logout without waiting for backend – used when token is expired or invalid
  const forceLogout = useCallback(() => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('ezinsure_token');
    document.cookie = 'ezinsure_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    window.location.href = '/login';
  }, []);

  // Listen for storage events (cross-tab communication)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_event' && e.newValue) {
        try {
          const event = JSON.parse(e.newValue);
          
          if (event.type === 'login') {
            setToken(event.token);
            setUser(event.user);
            // Update sessionStorage in this tab
            sessionStorage.setItem('ezinsure_token', event.token);
            sessionStorage.setItem('ezinsure_user', JSON.stringify(event.user));
          } else if (event.type === 'logout') {
            setToken(null);
            setUser(null);
            sessionStorage.removeItem('ezinsure_token');
            sessionStorage.removeItem('ezinsure_user');
            router.push('/login');
          }
        } catch (error) {
          console.error('Failed to process auth event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [router]);

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated: !!token,
    forceLogout,
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First, try to get token from sessionStorage
        let storedToken = sessionStorage.getItem('ezinsure_token');

        // If not in sessionStorage, check cookie (for new tabs)
        if (!storedToken) {
          const cookieToken = getCookie('ezinsure_token');
          if (cookieToken) {
            storedToken = cookieToken;
            sessionStorage.setItem('ezinsure_token', storedToken);
          }
        }

        // If we have a token, always ask the backend who the user is
        if (storedToken) {
          setToken(storedToken);
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${storedToken}`,
              },
            });

            if (response.ok) {
              const userData: User = await response.json();
              setUser(userData);
            } else {
              // Invalid/expired token – clear it
              setToken(null);
              setUser(null);
              sessionStorage.removeItem('ezinsure_token');
              document.cookie = 'ezinsure_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
            }
          } catch (error) {
            console.error('Failed to fetch current user', error);
            setToken(null);
            setUser(null);
            sessionStorage.removeItem('ezinsure_token');
            document.cookie = 'ezinsure_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth', error);
        // Clear invalid data
        sessionStorage.removeItem('ezinsure_token');
        document.cookie = 'ezinsure_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);
  
  useEffect(() => {
    // Only handle route protection after initialization is complete
    if (isInitialized && !isLoading) {
      handleRouteProtection();
    }
  }, [isInitialized, isLoading, isLoggingIn, pathname, user, token, handleRouteProtection]);

  // Show loading state only if truly loading
  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};