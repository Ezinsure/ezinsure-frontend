'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

interface User {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  agentCode?: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const handleRouteProtection = useCallback(() => {
    const POST_TESTER_PUBLIC_ROUTES = ['/', '/apply', '/login', '/register', '/track'];
    
    // Skip if still loading
    if (isLoading) return;

    // Check for tester cookie (client-side)
    const isTester = document.cookie.includes('ezinsure-tester=solektraRwanda@2025');

    // **1. If logged in (has token & user)**
    if (token && user) {
      const userDashboard = `/${user.role.toLowerCase()}/dashboard`;

      // Redirect to dashboard if trying to access public routes
      if (POST_TESTER_PUBLIC_ROUTES.includes(pathname) || pathname === '/coming-soon') {
        router.push(userDashboard);
        return;
      }

      // Ensure they stay in their role's routes
      if (!pathname.startsWith(`/${user.role.toLowerCase()}`)) {
        router.push(userDashboard);
        return;
      }
    }
    // **2. If tester but not logged in**
    else if (isTester) {
      // Redirect to home if trying to access protected routes or `/coming-soon`
      if (pathname.startsWith('/admin') || pathname.startsWith('/agent') || pathname === '/coming-soon') {
        router.push('/');
        return;
      }

      // Allow access to post-tester public routes
      if (POST_TESTER_PUBLIC_ROUTES.includes(pathname)) {
        return;
      }

      // Default redirect for testers
      router.push('/');
    }
    // **3. Not a tester and not logged in → Only allow `/coming-soon`**
    else if (pathname !== '/coming-soon') {
      router.push('/coming-soon');
    }
  }, [isLoading, pathname, router, token, user]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) throw new Error('Login failed');

      const { data, token } = await response.json();

      
      // Set cookies properly
      const cookieOptions = {
        path: '/',
        sameSite: 'Lax' as const,
        secure: process.env.NODE_ENV === 'production',
      };

      // Set token cookie
      document.cookie = `ezinsure_token=${token}; ${Object.entries(cookieOptions)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')}`;

      // Set user cookie with simplified data
      const userData = {
        _id: data._id,
        role: data.role,
        email: data.email
      };
      document.cookie = `ezinsure_user=${JSON.stringify(userData)}; ${Object.entries(cookieOptions)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')}`;

      // Store in sessionStorage for client-side access
      sessionStorage.setItem('ezinsure_token', token);
      sessionStorage.setItem('ezinsure_user', JSON.stringify(data));

      // Update state immediately
      setToken(token);
      setUser(data);
      
      // Redirect based on role
      router.push(`/${data.role.toLowerCase()}/dashboard`);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    
    // Clear sessionStorage
    sessionStorage.removeItem('ezinsure_token');
    sessionStorage.removeItem('ezinsure_user');
    
    // Clear cookies
    document.cookie = 'ezinsure_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'ezinsure_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    
    router.push('/login');
  }, [router]);

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated: !!token,
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = sessionStorage.getItem('ezinsure_token');
        const storedUser = sessionStorage.getItem('ezinsure_user');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Failed to initialize auth', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [logout]);
  
  useEffect(() => {
    // Add a small delay to prevent race conditions during login
    const timeoutId = setTimeout(() => {
      if (!isLoading) {
        handleRouteProtection();
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isLoading, pathname, user, token, handleRouteProtection]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};