'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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
  }, []);

  useEffect(() => {
    if (!isLoading) {
      handleRouteProtection();
    }
  }, [isLoading, pathname, user, token]);

  const handleRouteProtection = () => {
    const publicRoutes = ['/', '/apply', '/login', '/register', '/track', '/coming-soon'];
    
    // If user is authenticated and trying to access public routes, redirect to dashboard
    if (token && user && publicRoutes.includes(pathname)) {
      const userDashboard = `/${user.role.toLowerCase()}/dashboard`;
      router.push(userDashboard);
      return;
    }

    // Skip protection for public routes when not authenticated
    if (publicRoutes.includes(pathname)) return;

    // If not authenticated, redirect to login
    if (!token) {
      router.push('/login');
      return;
    }

    // Check if user is trying to access a route that matches their role
    if (user) {
      const rolePrefix = `/${user.role.toLowerCase()}`;
      if (!pathname.startsWith(rolePrefix) && !publicRoutes.includes(pathname)) {
        // Redirect to their dashboard if they try to access unauthorized routes
        router.push(`${rolePrefix}/dashboard`);
      }
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      setToken(data.data.token);
      setUser(data.data.data);

      // Store in sessionStorage (your preferred method)
      sessionStorage.setItem('ezinsure_token', data.data.token);
      sessionStorage.setItem('ezinsure_user', JSON.stringify(data.data.data));

      // ALSO store in cookies for middleware access
      document.cookie = `ezinsure_token=${data.data.token}; path=/; SameSite=Lax`;
      document.cookie = `ezinsure_user=${encodeURIComponent(JSON.stringify(data.data.data))}; path=/; SameSite=Lax`;

      // Redirect based on role
      router.push(`/${data.data.data.role.toLowerCase()}/dashboard`);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    
    // Clear sessionStorage
    sessionStorage.removeItem('ezinsure_token');
    sessionStorage.removeItem('ezinsure_user');
    
    // Clear cookies
    document.cookie = 'ezinsure_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'ezinsure_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    
    router.push('/login');
  };

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};