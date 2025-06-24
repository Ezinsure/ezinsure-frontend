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
  const router = useRouter();
  const pathname = usePathname();

  const handleRouteProtection = useCallback(() => {
    const PUBLIC_ROUTES = ['/', '/apply', '/login', '/register', '/track', '/terms-and-conditions', '/privacy-policy', '/FAQ', '/reset-password'];
    
    // Skip if still loading or not initialized
    if (isLoading || !isInitialized) return;

    // **1. If logged in (has token & user)**
    if (token && user) {
      const userDashboard = `/${user.role.toLowerCase()}/dashboard`;

      // Redirect to dashboard if trying to access public routes
      if (PUBLIC_ROUTES.includes(pathname)) {
        router.push(userDashboard);
        return;
      }

      // Ensure they stay in their role's routes
      if (!pathname.startsWith(`/${user.role.toLowerCase()}`)) {
        router.push(userDashboard);
        return;
      }
    }
    // **2. Not logged in - allow access to public routes**
    else {
      // Allow access to public routes
      if (PUBLIC_ROUTES.includes(pathname)) {
        return;
      }

      // For protected routes, redirect to login
      if (pathname.startsWith('/admin') || pathname.startsWith('/agent') || pathname.startsWith('/super_admin') || pathname.startsWith('/finance')) {
        router.push('/login');
        return;
      }

      // For any other protected route, redirect to login
      router.push('/login');
    }
  }, [isLoading, isInitialized, pathname, router, token, user]);

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
      
      // Notify other tabs about login
      localStorage.setItem('auth_event', JSON.stringify({
        type: 'login',
        token,
        user: data,
        timestamp: Date.now()
      }));
      
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
    
    // Notify other tabs about logout
    localStorage.setItem('auth_event', JSON.stringify({
      type: 'logout',
      timestamp: Date.now()
    }));
    
    router.push('/login');
  }, [router]);

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
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First, try to get from sessionStorage
        let storedToken = sessionStorage.getItem('ezinsure_token');
        let storedUser = sessionStorage.getItem('ezinsure_user');
        
        // If not in sessionStorage, check cookies (for new tabs)
        if (!storedToken || !storedUser) {
          const cookieToken = getCookie('ezinsure_token');
          const cookieUser = getCookie('ezinsure_user');
          
          if (cookieToken && cookieUser) {
            storedToken = cookieToken;
            storedUser = decodeURIComponent(cookieUser);
            
            // Sync to sessionStorage
            sessionStorage.setItem('ezinsure_token', storedToken);
            sessionStorage.setItem('ezinsure_user', storedUser);
          }
        }
        
        if (storedToken && storedUser) {
          const userData = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to initialize auth', error);
        // Clear invalid data
        sessionStorage.removeItem('ezinsure_token');
        sessionStorage.removeItem('ezinsure_user');
        document.cookie = 'ezinsure_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie = 'ezinsure_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
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
  }, [isInitialized, isLoading, pathname, user, token, handleRouteProtection]);

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