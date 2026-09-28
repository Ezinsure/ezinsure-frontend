"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, ToastContainer } = useToast();

  // Try to get token from query (?token=...) or from path (/reset-password/[token])
  const token = searchParams.get("token");

  const [formState, setFormState] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password validation logic (copied from agent profile)
  const validatePassword = (password: string) => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  });
  const passwordValidation = useMemo(() => validatePassword(formState.newPassword), [formState.newPassword]);

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!formState.newPassword || formState.newPassword.length < 8) {
      errs.newPassword = "Password must be at least 8 characters.";
    }
    if (formState.newPassword !== formState.confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }
    return errs;
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
    const formErrors = validate();
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;
    if (!token) {
      showToast("Invalid or missing token.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const requestBody = {
        newPassword: formState.newPassword,
        confirmPassword: formState.confirmPassword,
      };
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/changePassword/${token}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (res.ok && data.message && data.message.toLowerCase().includes("success")) {
        showToast("Password reset successful! Redirecting to login...", "success");
        setTimeout(() => router.push("/login"), 1000);
      } else {
        showToast(data.message || "Failed to reset password.", "error");
      }
    } catch (err) {
      console.log('Error calling backend', err)
      showToast("An error occurred. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
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
      <div className="max-w-md w-full space-y-8 bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-center">
          <h2 className="text-2xl font-bold">Reset Password</h2>
          <p className="text-sm opacity-80 mt-1">Enter your new password below.</p>
        </div>
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Input
                label="New Password"
                type="password"
                name="newPassword"
                placeholder="Enter new password"
                value={formState.newPassword}
                onChange={handleInputChange}
                error={errors.newPassword}
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
              {/* Password Requirements */}
              {formState.newPassword && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</p>
                  <div className="space-y-1">
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.minLength ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="w-1 h-1 rounded-full bg-current"></span>
                      At least 8 characters long
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasUppercase ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="w-1 h-1 rounded-full bg-current"></span>
                      Contains uppercase letter
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasLowercase ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="w-1 h-1 rounded-full bg-current"></span>
                      Contains lowercase letter
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="w-1 h-1 rounded-full bg-current"></span>
                      Contains number
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="w-1 h-1 rounded-full bg-current"></span>
                      Contains special character
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              placeholder="Confirm new password"
              value={formState.confirmPassword}
              onChange={handleInputChange}
              error={errors.confirmPassword}
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
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
} 