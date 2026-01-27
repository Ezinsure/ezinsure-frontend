'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { Mail, CheckCircle, Clock, Eye, EyeClosed } from 'lucide-react';

interface EmailChangeFormProps {
  onSuccess?: () => void;
}

export function EmailChangeForm({ onSuccess }: EmailChangeFormProps) {
  const { showToast } = useToast();
  const { token, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [errors, setErrors] = useState<{ newEmail?: string; currentPassword?: string }>({});
  const [apiError, setApiError] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle countdown and auto-close
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && onSuccess) {
      onSuccess();
    }
    return undefined;
  }, [countdown, onSuccess]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({});
    setApiError('');
    
    // Validation
    const newErrors: { newEmail?: string; currentPassword?: string } = {};
    
    if (!newEmail.trim()) {
      newErrors.newEmail = 'New email is required';
    } else if (!validateEmail(newEmail)) {
      newErrors.newEmail = 'Please enter a valid email address';
    } else if (newEmail.toLowerCase() === user?.email?.toLowerCase()) {
      newErrors.newEmail = 'New email must be different from current email';
    }
    
    if (!currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/requestEmailChange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newEmail: newEmail.trim(),
          currentPassword: currentPassword
        })
      });
      
      const data = await response.json() as { message?: string; success?: boolean };
      
      if (response.ok) {
        // Success
        showToast(data.message || 'Verification email sent successfully!', 'success');
        setVerificationSent(true);
        setNewEmail('');
        setCurrentPassword('');
        setCountdown(5); // Start 5 second countdown
        
        // Reset the success state after 5 minutes (300000ms)
        if (resetTimeoutRef.current) {
          clearTimeout(resetTimeoutRef.current);
        }
        resetTimeoutRef.current = setTimeout(() => {
          setVerificationSent(false);
          setCountdown(null);
        }, 300000);
      } else {
        // Error from backend
        const errorMessage = data.message || 'Failed to send verification email';
        setApiError(errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Email change request error:', error);
      const errorMessage = 'Network error. Please try again.';
      setApiError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-start gap-3 mb-4">
        <Mail className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
        <div className="flex-1">
          <p className="text-[11px] text-gray-600 leading-relaxed">
            Change your email address. You&apos;ll need to verify the new email.
          </p>
        </div>
      </div>

      {verificationSent ? (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3.5">
            <div className="flex items-start gap-2.5">
              <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={14} />
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-green-900 mb-1.5">Verification Email Sent!</h4>
                <p className="text-[11px] text-green-700 mb-2 leading-relaxed">
                  We&apos;ve sent a verification link to your new email address. Please check your inbox and click the link to complete the email change.
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-green-700 bg-green-100 px-2.5 py-1.5 rounded-md">
                  <Clock size={11} />
                  <span>The verification link will expire in 30 minutes</span>
                </div>
              </div>
            </div>
          </div>
          
          {countdown !== null && countdown > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
              <p className="text-[10px] text-blue-800 text-center">
                This window will close automatically in <strong className="font-semibold">{countdown}</strong> second{countdown !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* API Error Display */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-[11px] text-red-800 font-medium">{apiError}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-gray-700">Current Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-600 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-gray-700">New Email Address</label>
            <input
              type="email"
              name="newEmail"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (errors.newEmail) {
                  setErrors({ ...errors, newEmail: undefined });
                }
                if (apiError) {
                  setApiError('');
                }
              }}
              placeholder="newemail@example.com"
              required
              className={`w-full px-3 py-2 text-xs border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.newEmail ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
              }`}
            />
            {errors.newEmail && (
              <p className="text-[10px] text-red-600 mt-1">{errors.newEmail}</p>
            )}
          </div>

          <div className="space-y-1.5 relative">
            <label className="block text-[11px] font-medium text-gray-700">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                name="currentPassword"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errors.currentPassword) {
                    setErrors({ ...errors, currentPassword: undefined });
                  }
                  if (apiError) {
                    setApiError('');
                  }
                }}
                placeholder="Enter your current password"
                required
                className={`w-full px-3 py-2 pr-9 text-xs border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.currentPassword ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showCurrentPassword ? (
                  <EyeClosed size={14} />
                ) : (
                  <Eye size={14} />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-[10px] text-red-600 mt-1">{errors.currentPassword}</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-[10px] text-blue-800 leading-relaxed">
              <strong className="font-semibold">Note:</strong> After submitting, you&apos;ll receive a verification email at your new address. 
              Your current email will also be notified of this change request.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="w-full text-xs py-2 font-medium"
            >
              {isSubmitting ? 'Sending Verification Email...' : 'Change Email Address'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

