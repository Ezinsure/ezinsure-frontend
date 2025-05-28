'use client';

import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { validateForm, ValidationRules, validationPatterns } from '@/components/ui/form-validation';

interface UserProfile {
  email: string;
  name: string;
  role: string;
  phone?: string;
  address?: string;
  province?: string;
  district?: string;
  zipCode?: string;
  bio?: string;
  profilePicture?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);
  
  const [profile, setProfile] = useState<UserProfile>({
    email: '',
    name: '',
    role: '',
    phone: '',
    address: '',
    province: '',
    district: '',
    zipCode: '',
    bio: '',
    profilePicture: '',
    licenseNumber: '',
    licenseExpiry: '',
  });

  // Validation rules
  const validationRules: ValidationRules = {
    name: { required: true },
    email: { required: true, pattern: validationPatterns.email },
    phone: { pattern: validationPatterns.phone },
    zipCode: { pattern: validationPatterns.zipCode },
    licenseNumber: profile.role === 'agent' ? { required: true } : {},
    licenseExpiry: profile.role === 'agent' ? { required: true } : {},
  };

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    // Load user profile
    try {
      const userData = JSON.parse(userStr);
      
      // In a real app, you would fetch the complete profile from an API
      // For demonstration, we'll extend the user data with mock profile info
      const mockProfileData: UserProfile = {
        ...userData,
        phone: userData.phone || '0781234567',
        address: userData.address || '123 Insurance Ave',
        province: userData.province || 'KIGALU',
        district: userData.district || 'Gasabo',
        zipCode: userData.zipCode || '90210',
        bio: userData.bio || 'Insurance professional with expertise in multiple policy types.',
        profilePicture: userData.profilePicture || '',
        licenseNumber: userData.licenseNumber || (userData.role === 'agent' ? 'INS-12345-AG' : ''),
        licenseExpiry: userData.licenseExpiry || (userData.role === 'agent' ? '2025-12-31' : ''),
      };
      
      setProfile(mockProfileData);
      setOriginalProfile(mockProfileData);
      
      // Set profile image if available
      if (mockProfileData.profilePicture) {
        setProfileImage(mockProfileData.profilePicture);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.log(error);
      showToast('Error loading profile data', 'error');
      router.push('/login');
    }
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleProfilePictureClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      // In a real application, you would upload this file to your server/storage
      // For this demo, we'll use a local URL
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProfileImage(event.target.result as string);
          setProfile(prev => ({ ...prev, profilePicture: event.target?.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
// Validate form
const formErrors = validateForm(profile as unknown as { [key: string]: string | null }, validationRules);
setErrors(formErrors);
    
    if (Object.keys(formErrors).length === 0) {
      setIsSaving(true);
      
      try {
        // In a real application, you would send this data to your API
        // For this demo, we'll just update localStorage
        const updatedUser = {
          ...profile,
          authToken: JSON.parse(localStorage.getItem('user') || '{}').authToken || '',
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        showToast('Profile updated successfully!', 'success');
        setOriginalProfile(profile);
      } catch (error) {
        console.log(error);
        showToast('Error updating profile', 'error');
      } finally {
        setIsSaving(false);
      }
    } else {
      showToast('Please correct the errors in the form', 'error');
    }
  };

  const hasChanges = () => {
    if (!originalProfile) return false;
    return JSON.stringify(originalProfile) !== JSON.stringify(profile);
  };

  const handleCancel = () => {
    if (originalProfile) {
      setProfile(originalProfile);
      if (originalProfile.profilePicture) {
        setProfileImage(originalProfile.profilePicture);
      } else {
        setProfileImage(null);
      }
      setErrors({});
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[var(--main-blue)]"></div>
      </div>
    );
  }

  return (
     <MainLayout containerClass="p-0" fullWidth>
    <div className="min-h-screen bg-gray-50 pt-20 pb-10 px-4">
         <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0  bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
      <div className="max-w-4xl mx-auto mt-12">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-[var(--main-blue)] to-[var(--secondary-blue)] text-white">
            <h2 className="text-2xl font-bold">Profile Settings</h2>
            <p className="text-sm opacity-80 mt-1">
              Manage your personal information and account settings
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Profile Picture Section */}
              <div className="flex flex-col items-center w-full md:w-1/3">
                <div 
                  className="w-48 h-48 rounded-full border-4 border-[var(--main-blue)] overflow-hidden cursor-pointer bg-gray-100 mb-4"
                  onClick={handleProfilePictureClick}
                >
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50 text-[var(--main-blue)]">
                      <div className="text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-[var(--main-blue)]" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <p className="mt-2 text-xs font-medium">Click to upload photo</p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleProfilePictureClick}
                >
                  Change Photo
                </Button>
                
                {/* Role Badge */}
                <div className="mt-6 w-full">
                  <div className={`text-center py-2 px-4 rounded-full ${
                    profile.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {profile.role === 'admin' ? 'Administrator' : 'Insurance Agent'}
                  </div>
                </div>
              </div>
              
              {/* Form Fields */}
              <div className="flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Full Name"
                    name="name"
                    value={profile.name}
                    onChange={handleInputChange}
                    error={errors.name}
                    required
                  />
                  
                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    value={profile.email}
                    onChange={handleInputChange}
                    error={errors.email}
                    required
                    disabled
                  />
                  
                  <Input
                    label="Phone Number"
                    name="phone"
                    value={profile.phone || ''}
                    onChange={handleInputChange}
                    error={errors.phone}
                    placeholder="555-123-4567"
                  />
                  
                  <Input
                    label="Address"
                    name="address"
                    value={profile.address || ''}
                    onChange={handleInputChange}
                    error={errors.address}
                  />
                  
                  <Input
                    label="Province"
                    name="province"
                    value={profile.province || ''}
                    onChange={handleInputChange}
                    error={errors.province}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="District"
                      name="district"
                      value={profile.district || ''}
                      onChange={handleInputChange}
                      error={errors.district}
                    />
                    
                    <Input
                      label="ZIP Code"
                      name="zipCode"
                      value={profile.zipCode || ''}
                      onChange={handleInputChange}
                      error={errors.zipCode}
                    />
                  </div>
                </div>
                
                {/* Bio Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    name="bio"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                    value={profile.bio || ''}
                    onChange={handleInputChange}
                    placeholder="Tell us about your experience and expertise..."
                  />
                </div>
                
                {/* Agent License Info (only show for agents) */}
                {profile.role === 'agent' && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                    <h3 className="font-medium text-[var(--main-blue)]">License Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="License Number"
                        name="licenseNumber"
                        value={profile.licenseNumber || ''}
                        onChange={handleInputChange}
                        error={errors.licenseNumber}
                        required
                      />
                      
                      <Input
                        label="License Expiry Date"
                        name="licenseExpiry"
                        type="date"
                        value={profile.licenseExpiry || ''}
                        onChange={handleInputChange}
                        error={errors.licenseExpiry}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="mt-10 pt-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={!hasChanges() || isSaving}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                variant="primary"
                disabled={!hasChanges() || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
        
        {/* Security Section */}
        <div className="mt-8 bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-[var(--accent-orange)] to-[#f97316] text-white">
            <h2 className="text-xl font-bold">Security Settings</h2>
            <p className="text-sm opacity-80 mt-1">
              Manage your password and account security
            </p>
          </div>
          
          <div className="p-8">
            <div className="space-y-6">
              <div className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium">Password</h3>
                  <p className="text-sm text-gray-500">Update your password regularly to keep your account secure</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => showToast('Password change functionality is under development', 'info')}
                >
                  Change Password
                </Button>
              </div>
              
              <div className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => showToast('2FA setup is under development', 'info')}
                >
                  Set Up 2FA
                </Button>
              </div>
              
              <div className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium">Active Sessions</h3>
                  <p className="text-sm text-gray-500">View and manage devices where you&apos;re currently logged in</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => showToast('Session management is under development', 'info')}
                >
                  Manage Sessions
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
    </MainLayout>
  );
}