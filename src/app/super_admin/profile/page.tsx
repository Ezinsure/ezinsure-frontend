'use client';

import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { validateForm, ValidationRules, validationPatterns } from '@/components/ui/form-validation';
import { useAuth } from '@/context/AuthContext';
import { Trash2, FileText, Eye, EyeClosed, Settings, Users, Mail } from 'lucide-react';
import { rwandaProvinces } from '@/utils/rwanda-administrative';

interface User {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'AGENT';
  status: 'ACTIVE' | 'DEACTIVATED' | 'SENT_FOR_ACTION' | 'PENDING';
  dateOfBirth?: string;
  address?: string;
  province?: string;
  district?: string;
  sector?: string;
  bankName?: string;
  bankAccountNumber?: string;
  passportPhoto?: string;
  nationalIdDocument?: string;
  criminalRecordCertificate?: string;
  emergencyContacts?: Array<{
    fullName: string;
    phoneNumber: string;
    relationship: string;
    _id: string;
  }>;
  createdAt?: string;
  rejectionReason?: string;
  agentCode?: string;
  commissionRate?: string;
  deactivationReason?: string;
  deactivationFile?: string;
  deactivationHistory?: Array<{
    deactivationReason: string;
    deactivationFile?: string;
    _id: string;
    deactivationDate: string;
  }>;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

interface SystemSettings {
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  passwordResetExpiry: number; // in hours
}

interface ClientMessage {
  message: string;
  recipientCount?: number;
}

export default function SuperAdminProfilePage() {
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const { token, user: authUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [originalProfile, setOriginalProfile] = useState<User | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<{ [key: string]: string }>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'system'>('profile');
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    allowNewRegistrations: true,
    passwordResetExpiry: 24
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [clientMessage, setClientMessage] = useState<ClientMessage>({
    message: ''
  });
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageErrors, setMessageErrors] = useState<{ [key: string]: string }>({});
  
  const [profile, setProfile] = useState<User>({
    _id: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    dateOfBirth: '',
    address: '',
    province: '',
    district: '',
    sector: '',
    bankName: '',
    bankAccountNumber: '',
    emergencyContacts: []
  });

  // Password validation
  const validatePassword = (password: string): PasswordValidation => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  };

  const passwordValidation = useMemo(() => {
    return validatePassword(passwordData.newPassword);
  }, [passwordData.newPassword]);

  const isPasswordValid = useMemo(() => {
    const validation = passwordValidation;
    return validation.minLength && validation.hasUppercase && validation.hasLowercase && 
           validation.hasNumber && validation.hasSpecialChar;
  }, [passwordValidation]);

  // Get available districts based on selected province
  const availableDistricts = useMemo(() => {
    if (!profile.province) return [];
    const province = rwandaProvinces.find(p => p.name === profile.province);
    return province?.districts || [];
  }, [profile.province]);

  // Get available sectors based on selected district
  const availableSectors = useMemo(() => {
    if (!profile.district) return [];
    const district = availableDistricts.find(d => d.name === profile.district);
    const sectors = district?.sectors || [];
    // Extract sector names as strings
    return sectors.map(sector => sector.name);
  }, [profile.district, availableDistricts]);

  // Get user initials
  const getUserInitials = () => {
    if (!profile || !profile.fullName) return '?';
    return profile.fullName.split(' ').map(name => name[0]).join('').toUpperCase();
  };

  // Date validation function
  const getDateLimits = () => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    
    return {
      min: minDate.toISOString().split('T')[0],
      max: maxDate.toISOString().split('T')[0]
    };
  };

  // Validation rules
  const validationRules: ValidationRules = {
    fullName: { required: true },
    email: { required: true, pattern: validationPatterns.email },
    phoneNumber: { pattern: validationPatterns.phone },
    dateOfBirth: { required: true },
  };

  // Password validation rules
  const passwordValidationRules: ValidationRules = {
    currentPassword: { required: true },
    newPassword: { required: true, minLength: 8 },
    confirmPassword: { required: true }
  };

  useEffect(() => {
    if (!authUser) {
      router.push('/login');
      return;
    }

    // Load user profile from session storage or auth context
    try {
      const sessionUser = sessionStorage.getItem('ezinsure_user');
      const userData = sessionUser ? JSON.parse(sessionUser) : authUser;
      
      setProfile(userData);
      setOriginalProfile(userData);
    } catch (error) {
      console.log(error);
      showToast('Error loading profile data', 'error');
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }, [authUser, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Reset dependent fields when province or district changes
    if (name === 'province') {
      setProfile((prev) => ({ ...prev, [name]: value, district: '', sector: '' }));
    } else if (name === 'district') {
      setProfile((prev) => ({ ...prev, [name]: value, sector: '' }));
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
    
    // Clear error when typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleEmergencyContactChange = (index: number, field: string, value: string) => {
    setProfile((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts?.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      ) || []
    }));
  };

  const addEmergencyContact = () => {
    setProfile((prev) => ({
      ...prev,
      emergencyContacts: [
        ...(prev.emergencyContacts || []),
        { fullName: '', phoneNumber: '', relationship: '', _id: '' }
      ]
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts?.filter((_, i) => i !== index) || []
    }));
  };

  const getChangedFields = (): Partial<User> => {
    if (!originalProfile) return {};
    
    const changes: Partial<User> = {};
    
    if (originalProfile.fullName !== profile.fullName) {
      changes.fullName = profile.fullName;
    }
    if (originalProfile.phoneNumber !== profile.phoneNumber) {
      changes.phoneNumber = profile.phoneNumber;
    }
    if (originalProfile.dateOfBirth !== profile.dateOfBirth) {
      changes.dateOfBirth = profile.dateOfBirth;
    }
    if (originalProfile.address !== profile.address) {
      changes.address = profile.address;
    }
    if (originalProfile.province !== profile.province) {
      changes.province = profile.province;
    }
    if (originalProfile.district !== profile.district) {
      changes.district = profile.district;
    }
    if (originalProfile.sector !== profile.sector) {
      changes.sector = profile.sector;
    }
    if (JSON.stringify(originalProfile.emergencyContacts) !== JSON.stringify(profile.emergencyContacts)) {
      changes.emergencyContacts = profile.emergencyContacts;
    }
    if (originalProfile.bankName !== profile.bankName) {
      changes.bankName = profile.bankName;
    }
    if (originalProfile.bankAccountNumber !== profile.bankAccountNumber) {
      changes.bankAccountNumber = profile.bankAccountNumber;
    }
    
    return changes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formErrors = validateForm(profile as unknown as { [key: string]: string | null }, validationRules);
    setErrors(formErrors);
    
    if (Object.keys(formErrors).length === 0) {
      setIsSaving(true);
      
      try {
        const changedFields = getChangedFields();
        
        if (Object.keys(changedFields).length === 0) {
          showToast('No changes to save', 'info');
          setIsEditMode(false);
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/updateUser/${profile._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(changedFields)
        });

        if (!response.ok) {
          throw new Error('Failed to update profile');
        }

        const updatedUser = await response.json();
        
        // Update session storage
        sessionStorage.setItem('ezinsure_user', JSON.stringify(updatedUser.data));
        
        showToast('Profile updated successfully!', 'success');
        setOriginalProfile(updatedUser.data);
        setProfile(updatedUser.data);
        setIsEditMode(false);
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

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when typing
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    const formErrors = validateForm(passwordData as unknown as { [key: string]: string | null }, passwordValidationRules);
    
    // Check if passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      formErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Check password strength
    if (!isPasswordValid) {
      formErrors.newPassword = 'Password does not meet security requirements';
    }
    
    setPasswordErrors(formErrors);
    
    if (Object.keys(formErrors).length === 0) {
      setIsChangingPassword(true);
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/resetPassword`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
            confirmPassword: passwordData.confirmPassword
          })
        });

        if (!response.ok) {
          throw new Error('Failed to change password');
        }

        showToast('Password changed successfully!', 'success');
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors({});
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmNewPassword(false);
      } catch (error) {
        console.log("error changing pass: ", error);
        showToast(error instanceof Error ? error.message : String(error), 'error');
      } finally {
        setIsChangingPassword(false);
      }
    }
  };

  const handleSystemSettingChange = (name: keyof SystemSettings, value: boolean | number) => {
    setSystemSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const saveSystemSettings = async () => {
    setIsSavingSettings(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/system-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(systemSettings)
      });

      if (!response.ok) {
        throw new Error('Failed to update system settings');
      }

      showToast('System settings updated successfully!', 'success');
    } catch (error) {
      console.log(error);
      showToast('Error updating system settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setClientMessage(prev => ({ ...prev, [name]: value }));
    
    // Clear error when typing
    if (messageErrors[name]) {
      setMessageErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const sendClientMessage = async () => {
    // Validate message
    const errors: { [key: string]: string } = {};
    if (!clientMessage.message.trim()) {
      errors.message = 'Message is required';
    }
    
    setMessageErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    
    setIsSendingMessage(true);
    
    try {
      // Send as FormData as per API specification
      const formData = new FormData();
      formData.append('message', clientMessage.message);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/sendSMSToAllclients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to send SMS message');
      }

      const result = await response.json();
      showToast(`SMS sent successfully to ${result.recipientCount || 'all'} clients!`, 'success');
      setClientMessage({ message: '' });
      setMessageErrors({});
    } catch (error) {
      console.log(error);
      showToast('Error sending SMS to clients', 'error');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const hasChanges = () => {
    if (!originalProfile) return false;
    return Object.keys(getChangedFields()).length > 0;
  };

  const handleCancel = () => {
    if (originalProfile) {
      setProfile(originalProfile);
      setErrors({});
      setIsEditMode(false);
    }
  };

  const handleDocumentClick = (documentUrl: string) => {
    setSelectedDocument(documentUrl);
    setShowDocumentViewer(true);
  };

  const documents = [
    { name: 'Passport Photo', url: profile.passportPhoto, key: 'passportPhoto' },
    { name: 'National ID Document', url: profile.nationalIdDocument, key: 'nationalIdDocument' },
    { name: 'Criminal Record Certificate', url: profile.criminalRecordCertificate, key: 'criminalRecordCertificate' }
  ].filter(doc => doc.url);

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
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <div className="max-w-6xl mx-auto mt-12">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'profile' ? 'text-[var(--main-blue)] border-b-2 border-[var(--main-blue)]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Users size={16} />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`px-4 py-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'system' ? 'text-[var(--main-blue)] border-b-2 border-[var(--main-blue)]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Settings size={16} />
              System Settings
            </button>
          </div>

          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-[var(--main-blue)] to-[var(--secondary-blue)] text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Super Admin Profile</h2>
                    <p className="text-sm opacity-80 mt-1">
                      Manage your personal information and account settings
                    </p>
                  </div>
                  {!isEditMode && (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditMode(true)}
                      className="bg-white text-[var(--main-blue)] hover:bg-gray-100"
                    >
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  {/* Profile Avatar Section */}
                  <div className="lg:col-span-1">
                    <div className="flex flex-col items-center">
                      <div className="w-32 h-32 lg:w-48 lg:h-48 rounded-full border-4 border-[var(--main-blue)] overflow-hidden bg-[var(--main-blue)] flex items-center justify-center text-white text-2xl lg:text-4xl font-bold mb-4">
                        {getUserInitials()}
                      </div>
                      
                      {/* Role Badge */}
                      <div className="mt-4 w-full">
                        <div className="text-center py-2 px-4 rounded-full text-sm bg-purple-100 text-purple-800">
                          Super Administrator
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="mt-3 w-full">
                        <div className={`text-center py-2 px-4 rounded-full text-sm ${
                          profile.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-800'
                            : profile.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {profile.status}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Form Fields */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Full Name"
                        name="fullName"
                        value={profile.fullName}
                        onChange={handleInputChange}
                        error={errors.fullName}
                        required
                        disabled={!isEditMode}
                      />
                      
                      <Input
                        label="Email Address"
                        name="email"
                        type="email"
                        value={profile.email}
                        onChange={handleInputChange}
                        error={errors.email}
                        required
                        disabled={true}
                      />
                      
                      <Input
                        label="Phone Number"
                        name="phoneNumber"
                        value={profile.phoneNumber || ''}
                        onChange={handleInputChange}
                        error={errors.phoneNumber}
                        placeholder="250788123456"
                        disabled={!isEditMode}
                      />
                      
                      <Input
                        label="Date of Birth"
                        name="dateOfBirth"
                        type="date"
                        value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : ''}
                        onChange={handleInputChange}
                        error={errors.dateOfBirth}
                        required
                        disabled={!isEditMode}
                        min={getDateLimits().min}
                        max={getDateLimits().max}
                      />
                    </div>

                    <div className="space-y-4">
                      <Input
                        label="Address"
                        name="address"
                        value={profile.address || ''}
                        onChange={handleInputChange}
                        error={errors.address}
                        disabled={!isEditMode}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Province</label>
                          <select
                            name="province"
                            value={profile.province || ''}
                            onChange={handleInputChange}
                            disabled={!isEditMode}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Select Province</option>
                            {rwandaProvinces.map((province) => (
                              <option key={province.name} value={province.name}>
                                {province.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">District</label>
                          <select
                            name="district"
                            value={profile.district || ''}
                            onChange={handleInputChange}
                            disabled={!isEditMode || !profile.province}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent ${
                              !profile.province ? 'cursor-not-allowed bg-gray-100' : 'disabled:bg-gray-100 disabled:cursor-not-allowed'
                            }`}
                          >
                            <option value="">Select District</option>
                            {availableDistricts.map((district) => (
                              <option key={district.name} value={district.name}>
                                {district.name}
                              </option>
                            ))}
                            {/* Show user's district if it exists but not in available districts (e.g., when province is not selected) */}
                            {profile.district && !availableDistricts.find(d => d.name === profile.district) && (
                              <option value={profile.district}>
                                {profile.district}
                              </option>
                            )}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Sector</label>
                          <select
                            name="sector"
                            value={profile.sector || ''}
                            onChange={handleInputChange}
                            disabled={!isEditMode || !profile.district}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent ${
                              !profile.district ? 'cursor-not-allowed bg-gray-100' : 'disabled:bg-gray-100 disabled:cursor-not-allowed'
                            }`}
                          >
                            <option value="">Select Sector</option>
                            {availableSectors.map((sector) => (
                              <option key={sector} value={sector}>
                                {sector}
                              </option>
                            ))}
                            {/* Show user's sector if it exists but not in available sectors (e.g., when district is not selected) */}
                            {profile.sector && !availableSectors.includes(profile.sector) && (
                              <option value={profile.sector}>
                                {profile.sector}
                              </option>
                            )}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Bank Information Section */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-4">Bank Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                          <select
                            name="bankName"
                            value={profile.bankName || ''}
                            onChange={handleInputChange}
                            disabled={!isEditMode}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Select Bank</option>
                            {[
                              "Bank of Kigali",
                              "Equity Bank Rwanda",
                              "I&M Bank Rwanda",
                              "BPR Bank",
                              "GT Bank Rwanda",
                              "Zigama",
                              "Unguka bank",
                              "VisionFund Rwanda"
                            ].map(bank => (
                              <option key={bank} value={bank}>{bank}</option>
                            ))}
                          </select>
                        </div>
                        <Input
                          label="Bank Account Number"
                          name="bankAccountNumber"
                          type="text"
                          value={profile.bankAccountNumber || ''}
                          onChange={handleInputChange}
                          error={errors.bankAccountNumber}
                          disabled={!isEditMode}
                          placeholder="Enter your account number"
                        />
                      </div>
                    </div>
                    
                    {/* Emergency Contacts Section */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium text-gray-900">Emergency Contacts</h3>
                        {isEditMode && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addEmergencyContact}
                          >
                            Add Contact
                          </Button>
                        )}
                      </div>
                      
                      {profile.emergencyContacts?.map((contact, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg mb-4 border">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Input
                              label="Name"
                              name={`emergencyContactFullName_${index}`}
                              value={contact.fullName}
                              onChange={(e) => handleEmergencyContactChange(index, 'fullName', e.target.value)}
                              disabled={!isEditMode}
                            />
                            <Input
                              label="Phone"
                              name={`emergencyContactPhone_${index}`}
                              value={contact.phoneNumber}
                              onChange={(e) => handleEmergencyContactChange(index, 'phoneNumber', e.target.value)}
                              disabled={!isEditMode}
                            />
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Input
                                  label="Relationship"
                                  name={`emergencyContactRelationship_${index}`}
                                  value={contact.relationship}
                                  onChange={(e) => handleEmergencyContactChange(index, 'relationship', e.target.value)}
                                  disabled={!isEditMode}
                                />
                              </div>
                              {isEditMode && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeEmergencyContact(index)}
                                  className="mt-6 text-red-600 hover:text-red-800 hover:bg-red-50 px-2 shrink-0"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )) || (
                        <p className="text-gray-500 text-sm">No emergency contacts added yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="lg:col-span-1">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-4">Uploaded Documents</h3>
                      
                      {documents.length > 0 ? (
                        <div className="space-y-3">
                          {documents.map((document, index) => (
                            <div
                              key={index}
                              onClick={() => document.url && handleDocumentClick(document.url)}
                              className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:bg-blue-50 cursor-pointer transition-colors"
                            >
                              <FileText className="text-blue-600" size={20} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {document.name}
                                </p>
                                <p className="text-xs text-gray-500">Click to view</p>
                              </div>
                              <Eye className="text-gray-400" size={16} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Form Actions */}
                {isEditMode && (
                  <div className="mt-10 pt-6 border-t border-gray-200 flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
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
                )}
              </form>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-[var(--accent-orange)] to-[#f97316] text-white">
                <h2 className="text-2xl font-bold">System Settings</h2>
                <p className="text-sm opacity-80 mt-1">
                  Configure system-wide settings and preferences
                </p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-4">System Status</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Maintenance Mode</h4>
                          <p className="text-xs text-gray-500">Enable to take the system offline for maintenance</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={systemSettings.maintenanceMode}
                            onChange={(e) => handleSystemSettingChange('maintenanceMode', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Allow New Registrations</h4>
                          <p className="text-xs text-gray-500">Enable to allow new user registrations</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={systemSettings.allowNewRegistrations}
                            onChange={(e) => handleSystemSettingChange('allowNewRegistrations', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-4">Security Settings</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password Reset Expiry (hours)</label>
                        <input
                          type="number"
                          min="1"
                          max="72"
                          value={systemSettings.passwordResetExpiry}
                          onChange={(e) => handleSystemSettingChange('passwordResetExpiry', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Time before password reset links expire</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                      <Mail className="text-[var(--main-blue)]" size={20} />
                      <h3 className="font-medium text-gray-900">Client SMS Messaging</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Draft and send SMS messages to all clients in the database</p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SMS Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="message"
                          value={clientMessage.message}
                          onChange={handleMessageInputChange}
                          placeholder="Enter SMS message content..."
                          rows={6}
                          className={`w-full px-3 py-2 border ${messageErrors.message ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent resize-none`}
                        />
                        {messageErrors.message && (
                          <p className="text-xs text-red-500 mt-1">{messageErrors.message}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">This message will be sent to all clients via SMS</p>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          onClick={sendClientMessage}
                          variant="primary"
                          disabled={isSendingMessage || !clientMessage.message.trim()}
                        >
                          {isSendingMessage ? 'Sending SMS...' : 'Send SMS to All Clients'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-gray-200 flex justify-end">
                  <Button
                    onClick={saveSystemSettings}
                    variant="primary"
                    disabled={isSavingSettings}
                  >
                    {isSavingSettings ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Security Section - Only shown on profile tab */}
          {activeTab === 'profile' && (
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
                      onClick={() => setShowPasswordModal(true)}
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
          )}
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Change Password</h3>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className='relative w-full'>
                  <Input
                    label="Current Password"
                    name="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
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
                  <div className='relative w-full'>
                    <Input
                      label="New Password"
                      name="newPassword"
                      type={showNewPassword ? "text" : "password"}
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
                  
                  {/* Password Requirements */}
                  {passwordData.newPassword && (
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
                
                <div className='relative w-full'>
                  <Input
                    label="Confirm New Password"
                    name="confirmPassword"
                    type={showConfirmNewPassword ? "text" : "password"}
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
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setPasswordErrors({});
                      setShowCurrentPassword(false);
                      setShowNewPassword(false);
                      setShowConfirmNewPassword(false);
                    }}
                    disabled={isChangingPassword}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isChangingPassword || !isPasswordValid || !passwordData.currentPassword || !passwordData.confirmPassword}
                  >
                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Document Viewer Modal */}
        {showDocumentViewer && selectedDocument && (
          <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
                <h3 className="text-lg font-semibold">Document Viewer</h3>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDocumentViewer(false);
                    setSelectedDocument(null);
                  }}
                >
                  Close
                </Button>
              </div>
              
              <div className="flex-1 p-4 overflow-hidden">
                <div className="w-full h-full bg-gray-50 rounded-lg overflow-auto">
                  {selectedDocument.toLowerCase().includes('.pdf') ? (
                    <iframe
                      src={selectedDocument}
                      className="w-full h-full min-h-[500px]"
                      title="Document Viewer"
                      frameBorder="0"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img
                        src={selectedDocument}
                        alt="Document"
                        className="max-w-full max-h-full object-contain"
                        style={{ maxHeight: 'calc(90vh - 120px)' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <ToastContainer />
      </div>
    </MainLayout>
  );
}