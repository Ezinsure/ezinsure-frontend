'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, ToastContainer } = useToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [newEmail, setNewEmail] = useState<string>('');
  const hasVerified = useRef(false); // Prevent double verification
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only run once
    if (hasVerified.current) return;
    
    const verifyEmail = async () => {
      const verificationToken = searchParams.get('token');
      
      if (!verificationToken) {
        hasVerified.current = true;
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        showToast('Invalid verification link. No token provided.', 'error');
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/verifyEmailChange?token=${encodeURIComponent(verificationToken)}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        const data = await response.json() as { 
          message?: string; 
          newEmail?: string; 
          data?: { newEmail?: string };
          success?: boolean;
        };

        if (response.ok) {
          hasVerified.current = true;
          setStatus('success');
          setMessage(data.message || 'Email updated successfully!');
          
          // Store new email for display
          const updatedEmail = data.newEmail || data.data?.newEmail;
          if (updatedEmail && typeof updatedEmail === 'string') {
            setNewEmail(updatedEmail);
          }
          
          // Show success toast
          showToast('Email verified successfully! Please log in with your new email address.', 'success');
          
          // Always logout user if they're logged in (clear session/cookies)
          // This ensures they need to log in with the new email
          try {
            // Check if user is logged in by checking session storage
            const sessionToken = sessionStorage.getItem('ezinsure_token');
            const sessionUser = sessionStorage.getItem('ezinsure_user');
            
            if (sessionToken || sessionUser) {
              // Clear session storage
              sessionStorage.removeItem('ezinsure_token');
              sessionStorage.removeItem('ezinsure_user');
              
              // Clear cookies
              document.cookie = 'ezinsure_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
              document.cookie = 'ezinsure_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
              
              // Trigger logout event for cross-tab sync
              localStorage.setItem('auth_event', JSON.stringify({
                type: 'logout',
                timestamp: Date.now()
              }));
            }
          } catch (error) {
            console.error('Error clearing session:', error);
          }
          
          // Always redirect to login after 3 seconds (user needs to log in with new email)
          redirectTimeoutRef.current = setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else {
          hasVerified.current = true;
          setStatus('error');
          const errorMessage = data.message || 'Failed to verify email. Please try again.';
          setMessage(errorMessage);
          showToast(errorMessage, 'error');
        }
      } catch (error) {
        console.error('Email verification error:', error);
        hasVerified.current = true;
        setStatus('error');
        const errorMessage = error instanceof Error 
          ? `Network error: ${error.message}` 
          : 'Network error. Please check your connection and try again.';
        setMessage(errorMessage);
        showToast(errorMessage, 'error');
      }
    };

    verifyEmail();

    // Cleanup function
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [searchParams, router, showToast]);

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A2540] to-[#126BB3] px-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        {status === 'verifying' && (
          <div className="text-center">
            <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={64} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Email...</h1>
            <p className="text-gray-600">Please wait while we verify your new email address.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="text-green-600 mx-auto mb-4" size={64} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
              {newEmail && (
                <p className="text-sm text-green-800 mb-2">
                  <strong>New Email:</strong> {newEmail}
                </p>
              )}
              <p className="text-sm text-green-800">
                Your email has been successfully updated. You&apos;ll be redirected to the login page in a few seconds.
                Please use your new email address to log in.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => router.push('/login')}
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <XCircle className="text-red-600 mx-auto mb-4" size={64} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 mb-2">
                <strong>Common issues:</strong>
              </p>
              <ul className="text-xs text-red-700 text-left space-y-1">
                <li>• The verification link may have expired (30 minutes)</li>
                <li>• The link may have been used already</li>
                <li>• The email address may have been taken by another user</li>
              </ul>
            </div>
            <Button
              variant="primary"
              onClick={() => router.push('/login')}
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
        )}
        </div>
      </div>
      <ToastContainer />
    </>
  );
}

export default function VerifyEmailChangePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A2540] to-[#126BB3]">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={64} />
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

