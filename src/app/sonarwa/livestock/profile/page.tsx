'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Eye,
  EyeClosed,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import {
  validateForm,
  validationPatterns,
  type ValidationRules,
} from '@/components/ui/form-validation';
import { useAuth } from '@/context/AuthContext';
import { useApiClient } from '@/utils/apiClient';

interface EditableProfile {
  fullName: string;
  email: string;
  phoneNumber: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function validatePasswordStrength(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
}

const profileValidationRules: ValidationRules = {
  fullName: { required: true, minLength: 3 },
  phoneNumber: { pattern: validationPatterns.phone },
};

const passwordValidationRules: ValidationRules = {
  currentPassword: { required: true },
  newPassword: { required: true, minLength: 8 },
  confirmPassword: { required: true },
};

export default function SonarwaProfilePage() {
  const { user } = useAuth();
  const { apiFetch } = useApiClient();
  const { showToast, ToastContainer } = useToast();

  const [profile, setProfile] = useState<EditableProfile>({
    fullName: '',
    email: '',
    phoneNumber: '',
  });
  const [originalProfile, setOriginalProfile] = useState<EditableProfile | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    const next: EditableProfile = {
      fullName: user.fullName ?? '',
      email: user.email ?? '',
      phoneNumber: user.phoneNumber ?? '',
    };
    setProfile(next);
    setOriginalProfile(next);
  }, [user]);

  const passwordStrength = useMemo(
    () => validatePasswordStrength(passwordData.newPassword),
    [passwordData.newPassword],
  );

  const isPasswordValid = useMemo(
    () =>
      passwordStrength.minLength &&
      passwordStrength.hasUppercase &&
      passwordStrength.hasLowercase &&
      passwordStrength.hasNumber &&
      passwordStrength.hasSpecialChar,
    [passwordStrength],
  );

  const getInitials = () => {
    if (!profile.fullName) return '?';
    return profile.fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const hasChanges = () =>
    Boolean(
      originalProfile &&
        (originalProfile.fullName !== profile.fullName ||
          originalProfile.phoneNumber !== profile.phoneNumber),
    );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleCancel = () => {
    if (originalProfile) setProfile(originalProfile);
    setErrors({});
    setIsEditMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validateForm(
      profile as unknown as { [key: string]: string | null },
      profileValidationRules,
    );
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      showToast('Please correct the errors in the form', 'error');
      return;
    }

    if (!hasChanges()) {
      showToast('No changes to save', 'info');
      setIsEditMode(false);
      return;
    }

    if (!user?._id) {
      showToast('Unable to identify your account. Please sign in again.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const changes: Record<string, string> = {};
      if (originalProfile?.fullName !== profile.fullName) changes.fullName = profile.fullName;
      if (originalProfile?.phoneNumber !== profile.phoneNumber) {
        changes.phoneNumber = profile.phoneNumber;
      }

      const response = await apiFetch(`/updateUser/${user._id}`, {
        method: 'PUT',
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      setOriginalProfile(profile);
      setIsEditMode(false);
      showToast('Profile updated successfully!', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error updating profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordErrors({});
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validateForm(
      passwordData as unknown as { [key: string]: string | null },
      passwordValidationRules,
    );

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      formErrors.confirmPassword = 'Passwords do not match';
    }
    if (!isPasswordValid) {
      formErrors.newPassword = 'Password does not meet security requirements';
    }

    setPasswordErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    setIsChangingPassword(true);
    try {
      const response = await apiFetch('/resetPassword', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to change password');
      }

      showToast('Password changed successfully!', 'success');
      closePasswordModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error changing password', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const readOnlyDetails = [
    { label: 'Email address', value: profile.email, icon: Mail },
    { label: 'Organization', value: 'SONARWA General Insurance', icon: Building2 },
    { label: 'Access role', value: 'SONARWA Representative', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 bg-gradient-to-r from-[var(--sonarwa-primary)] to-[var(--sonarwa-primary-hover)] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-xl font-bold">
                {getInitials()}
              </div>
              <div>
                <h1 className="text-xl font-semibold sm:text-2xl">Profile settings</h1>
                <p className="mt-1 text-sm text-white/80">
                  Manage your personal information and account security
                </p>
              </div>
            </div>
            {!isEditMode && (
              <Button
                variant="outline"
                onClick={() => setIsEditMode(true)}
                className="border-white bg-white text-[var(--sonarwa-primary)] hover:bg-white/90"
              >
                Edit profile
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Full name"
                name="fullName"
                value={profile.fullName}
                onChange={handleInputChange}
                error={errors.fullName}
                required
                disabled={!isEditMode}
              />
              <Input
                label="Phone number"
                name="phoneNumber"
                value={profile.phoneNumber}
                onChange={handleInputChange}
                error={errors.phoneNumber}
                placeholder="250788123456"
                disabled={!isEditMode}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {readOnlyDetails.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--sonarwa-soft)] text-[var(--sonarwa-primary)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      {label}
                    </p>
                    <p className="mt-0.5 break-words text-sm font-semibold text-slate-900">
                      {value || 'Not provided'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {isEditMode && (
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={!hasChanges() || isSaving}>
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </span>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              </div>
            )}
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Security</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage your password and account security.
            </p>
          </div>
          <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sonarwa-soft)] text-[var(--sonarwa-primary)]">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Password</h3>
                <p className="text-sm text-slate-500">
                  Update your password regularly to keep your account secure.
                </p>
              </div>
            </div>
            <Button variant="primary" onClick={() => setShowPasswordModal(true)}>
              Change password
            </Button>
          </div>
        </section>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-[var(--sonarwa-primary)]" />
              <h3 className="text-lg font-semibold text-slate-900">Change password</h3>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="relative w-full">
                <Input
                  label="Current password"
                  name="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={handlePasswordInputChange}
                  error={passwordErrors.currentPassword}
                  required
                />
                {showCurrentPassword ? (
                  <EyeClosed
                    className="absolute top-9 right-3 cursor-pointer text-gray-500"
                    onClick={() => setShowCurrentPassword(false)}
                  />
                ) : (
                  <Eye
                    className="absolute top-9 right-3 cursor-pointer text-gray-500"
                    onClick={() => setShowCurrentPassword(true)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="relative w-full">
                  <Input
                    label="New password"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={handlePasswordInputChange}
                    error={passwordErrors.newPassword}
                    required
                  />
                  {showNewPassword ? (
                    <EyeClosed
                      className="absolute top-9 right-3 cursor-pointer text-gray-500"
                      onClick={() => setShowNewPassword(false)}
                    />
                  ) : (
                    <Eye
                      className="absolute top-9 right-3 cursor-pointer text-gray-500"
                      onClick={() => setShowNewPassword(true)}
                    />
                  )}
                </div>
                {passwordData.newPassword && (
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-medium text-slate-700">Password requirements:</p>
                    <div className="space-y-1">
                      {[
                        { ok: passwordStrength.minLength, label: 'At least 8 characters long' },
                        { ok: passwordStrength.hasUppercase, label: 'Contains uppercase letter' },
                        { ok: passwordStrength.hasLowercase, label: 'Contains lowercase letter' },
                        { ok: passwordStrength.hasNumber, label: 'Contains number' },
                        { ok: passwordStrength.hasSpecialChar, label: 'Contains special character' },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className={`flex items-center gap-2 text-xs ${
                            item.ok ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          <span className="h-1 w-1 rounded-full bg-current" />
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative w-full">
                <Input
                  label="Confirm new password"
                  name="confirmPassword"
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordInputChange}
                  error={passwordErrors.confirmPassword}
                  required
                />
                {showConfirmNewPassword ? (
                  <EyeClosed
                    className="absolute top-9 right-3 cursor-pointer text-gray-500"
                    onClick={() => setShowConfirmNewPassword(false)}
                  />
                ) : (
                  <Eye
                    className="absolute top-9 right-3 cursor-pointer text-gray-500"
                    onClick={() => setShowConfirmNewPassword(true)}
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closePasswordModal}
                  disabled={isChangingPassword}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    isChangingPassword ||
                    !isPasswordValid ||
                    !passwordData.currentPassword ||
                    !passwordData.confirmPassword
                  }
                >
                  {isChangingPassword ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Changing…
                    </span>
                  ) : (
                    'Change password'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
