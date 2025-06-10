'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { validateForm, ValidationRules, validationPatterns } from '@/components/ui/form-validation';
// import Link from 'next/link';
// import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/ui/main-layout';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { rwandaProvinces } from '@/utils/rwanda-administrative';
import { FileInput } from '@/components/ui/file-input'; 
import { Application, EditUserOnTrackingPage } from '@/components/ui/admin/EditUserOnTrackingPage';


interface FormState {
  [key: string]: string | File | null;
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: string;
  province: string;
  district: string;
  sector: string;
  role: 'AGENT';
  nationalIdDocument: File | null;
  criminalRecordCertificate: File | null;
  passportPhoto: File | null;
  emergencyContact1Name: string;
  emergencyContact1PhoneNumber: string;
  emergencyContact1Relationship: string;
  emergencyContact2Name: string;
  emergencyContact2PhoneNumber: string;
  emergencyContact2Relationship: string;
    bankName: string;
  bankAccountNumber: string;
}


interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otp: string) => void;
  email: string;
  isLoading: boolean;
}

const OTPModal = ({ isOpen, onClose, onVerify, email, isLoading }: OTPModalProps) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '', '', '']);
      showToast(`OTP sent to your email: ${email}`, 'success');
    }
  }, [isOpen]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOTP = () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      showToast('Please enter the complete 6-digit OTP', 'error');
      return;
    }
    onVerify(otpValue);
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Verify Your Identity</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold mb-2">Enter Verification Code</h4>
              <p className="text-gray-600 text-sm mb-2">
                We&apos;ve sent a 6-digit code to your email:
              </p>
              <p className="text-sm font-medium text-blue-600">{email}</p>
              <p className="text-sm text-gray-500 mt-2">The code will expire in 2 minutes</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center space-x-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-lg font-bold border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors"
                  />
                ))}
              </div>

              <Button
                onClick={handleVerifyOTP}
                disabled={otp.join('').length !== 6 || isLoading}
                className="w-full"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AgentRegistrationPage() {
  // const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    fullName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    address: '',
    province: '',
    district: '',
    sector: '',
    role: 'AGENT',
    nationalIdDocument: null,
    criminalRecordCertificate: null,
    passportPhoto: null,
    emergencyContact1Name: '',
    emergencyContact1PhoneNumber: '',
    emergencyContact1Relationship: '',
    emergencyContact2Name: '',
    emergencyContact2PhoneNumber: '',
    emergencyContact2Relationship: '',
    bankName: '',
  bankAccountNumber: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableDistricts, setAvailableDistricts] = useState<{name: string, sectors?: string[]}[]>([]);
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);
  const [application, setApplication] = useState<Application | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const [trackingEmail, setTrackingEmail] = useState('');
  const [viewingDocument, setViewingDocument] = useState<{ name: string; path: string } | null>(null);
  const [mode, setMode] = useState<'new' | 'track'>('new');

  const validationRules: ValidationRules = {
    fullName: { required: true, minLength: 2 },
    email: { required: true, pattern: validationPatterns.email },
    phoneNumber: { required: true, pattern: validationPatterns.phone },
    address: { required: true, minLength: 5 },
    province: { required: true },
    district: { required: true },
    sector: { required: true },
    bankName: { required: true },
  bankAccountNumber: { required: true, minLength: 5, pattern: /^[0-9]+$/ },
    emergencyContact1Name: { required: true, minLength: 2 },
    emergencyContact1PhoneNumber: { required: true, pattern: validationPatterns.phone },
    emergencyContact1Relationship: { required: true },
    emergencyContact2Name: { required: true, minLength: 2 },
    emergencyContact2PhoneNumber: { required: true, pattern: validationPatterns.phone },
    emergencyContact2Relationship: { required: true },
     dateOfBirth: { 
    required: true,
    validate: (value) => {
      if (!value) return true; // required check is handled separately
      const birthDate = new Date(value);
      const today = new Date();
      const minDate = new Date(today.getFullYear() - 65, today.getMonth(), today.getDate());
      const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      
      if (birthDate > maxDate) return "You must be at least 18 years old";
      if (birthDate < minDate) return "Maximum age allowed is 65 years";
      return true;
    }
  },
  };

  // Update districts when province changes
  useEffect(() => {
    if (formState.province) {
      const selectedProvince = rwandaProvinces.find(p => p.name === formState.province);
      const districts = selectedProvince?.districts || [];
      setAvailableDistricts(districts);
      
      if (!districts.some(d => d.name === formState.district)) {
        setFormState(prev => ({ ...prev, district: '', sector: '' }));
      }
    } else {
      setAvailableDistricts([]);
      setFormState(prev => ({ ...prev, district: '', sector: '' }));
    }
  }, [formState.province]);

  // Update sectors when district changes
  useEffect(() => {
    if (formState.district) {
      const selectedDistrict = availableDistricts.find(d => d.name === formState.district);
      const sectors = selectedDistrict?.sectors || [];
      setAvailableSectors(sectors);
      
      if (!sectors.includes(formState.sector || '')) {
        setFormState(prev => ({ ...prev, sector: '' }));
      }
    } else {
      setAvailableSectors([]);
      setFormState(prev => ({ ...prev, sector: '' }));
    }
  }, [formState.district, availableDistricts]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

const handleFileChange = (file: File | null, fieldName: keyof FormState) => {
  setFormState((prev) => ({ ...prev, [fieldName]: file }));
  
  if (errors[fieldName]) {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }
};

  const validateFiles = () => {
    const fileErrors: { [key: string]: string } = {};

    if (!formState.nationalIdDocument) {
      fileErrors.nationalIdDocument = 'National ID document is required';
    }
    if (!formState.criminalRecordCertificate) {
      fileErrors.criminalRecordCertificate = 'Criminal record document is required';
    }
    if (!formState.passportPhoto) {
      fileErrors.passportPhoto = 'Passport photo is required';
    }

    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const allowedDocTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    if (formState.nationalIdDocument) {
      if (!allowedDocTypes.includes(formState.nationalIdDocument.type)) {
        fileErrors.nationalIdDocument = 'National ID must be PDF, JPEG, or PNG';
      } else if (formState.nationalIdDocument.size > maxFileSize) {
        fileErrors.nationalIdDocument = 'National ID file size must be less than 5MB';
      }
    }

    if (formState.criminalRecordCertificate) {
      if (!allowedDocTypes.includes(formState.criminalRecordCertificate.type)) {
        fileErrors.criminalRecordCertificate = 'Criminal record must be PDF, JPEG, or PNG';
      } else if (formState.criminalRecordCertificate.size > maxFileSize) {
        fileErrors.criminalRecordCertificate = 'Criminal record file size must be less than 5MB';
      }
    }

    if (formState.passportPhoto) {
      if (!allowedImageTypes.includes(formState.passportPhoto.type)) {
        fileErrors.passportPhoto = 'Passport photo must be JPEG or PNG';
      } else if (formState.passportPhoto.size > maxFileSize) {
        fileErrors.passportPhoto = 'Passport photo file size must be less than 5MB';
      }
    }

    return fileErrors;
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const formErrors = validateForm(formState, validationRules);
  const fileErrors = validateFiles();
  const allErrors = { ...formErrors, ...fileErrors };

  setErrors(allErrors);

  if (Object.keys(allErrors).length === 0) {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      
      // Basic information
      formData.append('fullName', formState.fullName);
      formData.append('email', formState.email);
      formData.append('phoneNumber', formState.phoneNumber);
      formData.append('dateOfBirth', formState.dateOfBirth);
      formData.append('address', formState.address);
      formData.append('province', formState.province);
      formData.append('district', formState.district);
      formData.append('sector', formState.sector);
      formData.append('role', formState.role);
      formData.append('bankName', formState.bankName);
      formData.append('bankAccountNumber', formState.bankAccountNumber);
      
      // Files
      if (formState.nationalIdDocument) {
        formData.append('nationalIdDocument', formState.nationalIdDocument);
      }
      if (formState.criminalRecordCertificate) {
        formData.append('criminalRecordCertificate', formState.criminalRecordCertificate);
      }
      if (formState.passportPhoto) {
        formData.append('passportPhoto', formState.passportPhoto);
      }
      
      // Emergency Contacts (individual fields as per Swagger)
      formData.append('emergencyContacts1Name', formState.emergencyContact1Name);
      formData.append('emergencyContacts1Phone', formState.emergencyContact1PhoneNumber);
      formData.append('emergencyContacts1Relationship', formState.emergencyContact1Relationship);
      
      formData.append('emergencyContacts2Name', formState.emergencyContact2Name);
      formData.append('emergencyContacts2Phone', formState.emergencyContact2PhoneNumber);
      formData.append('emergencyContacts2Relationship', formState.emergencyContact2Relationship);

      console.log("Submitting form data:", formData)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/agents/apply`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();
      showToast('Registration successful! Your application is under review.', 'success');
      setApplication(data.data);
      setMode('track');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  } else {
    showToast('Please correct the errors in the form.', 'error');
  }
};

  const trackApplication = async (email: string) => {
    setIsSubmitting(true);
    try {
      const formData = new URLSearchParams();
      formData.append('email', email);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/trackAgentApplication`, {
         method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 404 || data.message?.includes('not found')) {
          throw new Error('Application not found. Please check your email and try again.');
        }
        throw new Error(data.message || 'Failed to verify application. Please try again.');
      }
      
      if (data.message && data.message.includes('OTP sent to your email')) {
        setTempEmail(data.email || email);
        setShowOtpModal(true);
        showToast(`OTP sent to your email: ${data.email || email}`, 'success');
      } else if (data.data) {
        setApplication(data.data);
        showToast('Application loaded successfully!', 'success');
      } else {
        showToast('Unexpected response from server', 'error');
      }
    } catch (error) {
      console.error('Lookup error:', error);
      showToast(
        error instanceof Error ? error.message : 'Application not found. Please check your email and try again.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpVerification = async (otp: string) => {
    setIsSubmitting(true);
    
    try {
      const formData = new URLSearchParams();
      formData.append('otp', otp);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/verifyAgentOtp`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const data = await response.json();
      // console.log("agent data: ", data)
      if (!response.ok) {
        if (response.status === 400) {
          if (data.message?.includes('expired') || data.message?.includes('Expired')) {
            throw new Error('OTP expired. Please request a new one.');
          } else if (data.message?.includes('invalid') || data.message?.includes('Invalid')) {
            throw new Error('Invalid OTP. Please try again.');
          }
        }
        throw new Error(data.message || 'Failed to verify OTP');
      }

      if (data.data) {
         setApplication(data.data);
      setShowOtpModal(false);
      setTrackingEmail('');
      showToast('Identity verified successfully!', 'success');
      } else if (data.message && data.message.includes('success')) {
        setShowOtpModal(false);
        showToast('OTP verified successfully!', 'success');
        setTrackingEmail(tempEmail);
      } else {
        throw new Error('Verification successful but no application data received');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      let errorMessage = 'Error verifying OTP';
      
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          errorMessage = 'OTP expired. Please enter your email again to get a new OTP.';
          setShowOtpModal(false);
          setTrackingEmail('');
        } else if (error.message.includes('invalid')) {
          errorMessage = 'Invalid OTP. Please check and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowOtpModal(false);
    setTrackingEmail('');
  };

  const handleViewDocument = (name: string, path: string) => {
    setViewingDocument({ name, path });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">Pending</span>;
      case 'ACTIVE':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">Active</span>;
      case 'DEACTIVATED':
        return <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">Deactivated</span>;
      case 'SENT_FOR_ACTION':
        return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">Action Required</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">Unknown</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

 const FileUploadField = ({ 
  label, 
  name, 
  accept, 
  error, 
  file 
}: { 
  label: string; 
  name: keyof FormState; 
  accept: string; 
  error?: string; 
  file: File | null; 
  description: string;
}) => (
  <FileInput
    label={label}
    name={name as string}
    accept={accept}
    error={error}
    required={true}
    onChange={(file) => handleFileChange(file, name)}
    currentFile={file?.name}
  />
);

const getDateLimits = () => {
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const minDate = new Date(today.getFullYear() - 65, today.getMonth(), today.getDate());
  
  return {
    min: minDate.toISOString().split('T')[0],
    max: maxDate.toISOString().split('T')[0]
  };
};

const handleSaveChanges = async (updatedData: Partial<Application>, files: Record<string, File | null>) => {
  setIsSubmitting(true);
  
  try {
    const formData = new FormData();
    
    // Append basic fields
    Object.entries(updatedData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'emergencyContacts') {
        if (typeof value === 'string') {
          formData.append(key, value);
        }
      }
    });
    
    // Handle emergency contacts in the format backend expects
    if (updatedData.emergencyContacts) {
      // First emergency contact (index 0)
      if (updatedData.emergencyContacts[0]) {
        formData.append('emergencyContacts1Name', updatedData.emergencyContacts[0].fullName);
        formData.append('emergencyContacts1Phone', updatedData.emergencyContacts[0].phoneNumber);
        formData.append('emergencyContacts1Relationship', updatedData.emergencyContacts[0].relationship);
      }
      
      // Second emergency contact (index 1)
      if (updatedData.emergencyContacts[1]) {
        formData.append('emergencyContacts2Name', updatedData.emergencyContacts[1].fullName);
        formData.append('emergencyContacts2Phone', updatedData.emergencyContacts[1].phoneNumber);
        formData.append('emergencyContacts2Relationship', updatedData.emergencyContacts[1].relationship);
      }
    }
    
    // Append files if they exist
    Object.entries(files).forEach(([key, file]) => {
      if (file) {
        formData.append(key, file);
      }
    });

    console.log("FormData contents:");
    for (const [key, value] of formData.entries()) {
      console.log(key, value);
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/updateAgentApplication`, {
      method: 'PUT',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update application');
    }

    const data = await response.json();
    console.log('Update response:', data);
    setApplication(data.data);
    showToast('Application updated successfully!', 'success');
  } catch (error) {
    console.error('Update error:', error);
    showToast(
      error instanceof Error ? error.message : 'Failed to update application',
      'error'
    );
  } finally {
    setIsSubmitting(false);
  }
};

const resetApplicationState = () => {
  setFormState({
    fullName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    address: '',
    province: '',
    district: '',
    sector: '',
    role: 'AGENT',
    nationalIdDocument: null,
    criminalRecordCertificate: null,
    passportPhoto: null,
    emergencyContact1Name: '',
    emergencyContact1PhoneNumber: '',
    emergencyContact1Relationship: '',
    emergencyContact2Name: '',
    emergencyContact2PhoneNumber: '',
    emergencyContact2Relationship: '',
    bankName: '',
    bankAccountNumber: '',
  });
  
  setApplication(null);
  setTrackingEmail('');
  setErrors({});
};

  const rwandaBanks = [
  "Bank of Kigali",
  "Equity Bank Rwanda",
  "I&M Bank Rwanda",
  "KCB Bank Rwanda",
  "Access Bank Rwanda",
  "Ecobank Rwanda",
  "GT Bank Rwanda",
  "Urwego Opportunity Bank"
];


  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">Agent Registration</h1>
        <p className="text-gray-600">
          {mode === 'new' 
          ? 'Fill out the form to apply as an insurance agent' 
          : 'Track the status of your application'}
        </p>
        </div>

        {mode === 'new' ? (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-[var(--main-blue)] to-[var(--secondary-blue)] text-white">
          <h2 className="text-xl font-bold">New Application</h2>
          <p className="text-sm opacity-90 mt-1">
            Complete all fields to submit your agent application
          </p>
          </div>

          <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
              label="Full Name"
              name="fullName"
              placeholder="Enter your full name"
              value={formState.fullName}
              onChange={handleInputChange}
              error={errors.fullName}
              required
              />

              <Input
              label="Email Address"
              type="email"
              name="email"
              placeholder="your.email@example.com"
              value={formState.email}
              onChange={handleInputChange}
              error={errors.email}
              required
              />

              <Input
              label="Phone Number"
              type="tel"
              name="phoneNumber"
              placeholder="071234568"
              value={formState.phoneNumber}
              onChange={handleInputChange}
              error={errors.phoneNumber}
              required
              />

              <Input
              label="Date of Birth"
              type="date"
              name="dateOfBirth"
              value={formState.dateOfBirth}
              onChange={handleInputChange}
              error={errors.dateOfBirth}
              required
              min={getDateLimits().min}
              max={getDateLimits().max}
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Address <span className="text-red-500">*</span>
              </label>
              <textarea
              name="address"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent"
              placeholder="Enter your complete current address"
              value={formState.address}
              onChange={handleInputChange}
              />
              {errors.address && (
              <p className="mt-2 text-sm text-red-600">{errors.address}</p>
              )}
            </div>

            <div className='md:grid-cols-2 grid grid-cols-1 '>
            <div >
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Bank Name <span className="text-red-500">*</span>
      </label>
      <select
        name="bankName"
        value={formState.bankName}
        onChange={handleInputChange}
        className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent"
        required
      >
        <option value="">Select Bank</option>
        {rwandaBanks.map(bank => (
          <option key={bank} value={bank}>{bank}</option>
        ))}
      </select>
      {errors.bankName && (
        <p className="mt-2 text-sm text-red-600">{errors.bankName}</p>
      )}
    </div>

    <Input
      label="Bank Account Number"
      type="text"
      name="bankAccountNumber"
      placeholder="Enter your account number"
      value={formState.bankAccountNumber}
      onChange={handleInputChange}
      error={errors.bankAccountNumber}
      required
    />
    </div>

            {/* Location Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Province <span className="text-red-500">*</span>
              </label>
              <select
                name="province"
                value={formState.province}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent"
              >
                <option value="">Select Province</option>
                {rwandaProvinces.map(province => (
                <option key={province.name} value={province.name}>{province.name}</option>
                ))}
              </select>
              {errors.province && (
                <p className="mt-2 text-sm text-red-600">{errors.province}</p>
              )}
              </div>

              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                District <span className="text-red-500">*</span>
              </label>
              <select
                name="district"
                value={formState.district}
                onChange={handleInputChange}
                disabled={!formState.province}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent ${!formState.province ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">Select District</option>
                {availableDistricts.map(district => (
                <option key={district.name} value={district.name}>{district.name}</option>
                ))}
              </select>
              {errors.district && (
                <p className="mt-2 text-sm text-red-600">{errors.district}</p>
              )}
              </div>

              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sector <span className="text-red-500">*</span>
              </label>
              <select
                name="sector"
                value={formState.sector}
                onChange={handleInputChange}
                disabled={!formState.district}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent ${!formState.district ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">Select Sector</option>
                {availableSectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
              {errors.sector && (
                <p className="mt-2 text-sm text-red-600">{errors.sector}</p>
              )}
              </div>
            </div>
            </div>

            {/* Required Documents */}
            <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Required Documents</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FileUploadField
              label="National ID"
              name="nationalIdDocument"
              accept=".pdf,.jpg,.jpeg,.png"
              error={errors.nationalIdDocument}
              file={formState.nationalIdDocument}
              description="PDF, JPEG, or PNG up to 5MB"
              />

              <FileUploadField
              label="Criminal Record Certificate"
              name="criminalRecordCertificate"
              accept=".pdf,.jpg,.jpeg,.png"
              error={errors.criminalRecordCertificate}
              file={formState.criminalRecordCertificate}
              description="PDF, JPEG, or PNG up to 5MB"
              />
            </div>

            <div className="mt-6">
              <FileUploadField
              label="Recent Passport Photo"
              name="passportPhoto"
              accept=".jpg,.jpeg,.png"
              error={errors.passportPhoto}
              file={formState.passportPhoto}
              description="JPEG or PNG up to 5MB"
              />
            </div>
            </div>

            {/* Emergency Contacts */}
            <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contacts</h3>
            
            {/* Emergency Contact 1 */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Emergency Contact 1</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Full Name"
                name="emergencyContact1Name"
                placeholder="Contact name"
                value={formState.emergencyContact1Name}
                onChange={handleInputChange}
                error={errors.emergencyContact1Name}
                required
              />

              <Input
                label="Phone Number"
                type="tel"
                name="emergencyContact1PhoneNumber"
                placeholder="0712345678"
                value={formState.emergencyContact1PhoneNumber}
                onChange={handleInputChange}
                error={errors.emergencyContact1PhoneNumber}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                Relationship <span className="text-red-500">*</span>
                </label>
                <select
                name="emergencyContact1Relationship"
                value={formState.emergencyContact1Relationship}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent"
                >
                <option value="">Select relationship</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Spouse">Spouse</option>
                <option value="Friend">Friend</option>
                </select>
                {errors.emergencyContact1Relationship && (
                <p className="mt-2 text-sm text-red-600">{errors.emergencyContact1Relationship}</p>
                )}
              </div>
              </div>
            </div>

            {/* Emergency Contact 2 */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-3">Emergency Contact 2</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Full Name"
                name="emergencyContact2Name"
                placeholder="Contact name"
                value={formState.emergencyContact2Name}
                onChange={handleInputChange}
                error={errors.emergencyContact2Name}
                required
              />

              <Input
                label="Phone Number"
                type="tel"
                name="emergencyContact2PhoneNumber"
                placeholder="0712345678"
                value={formState.emergencyContact2PhoneNumber}
                onChange={handleInputChange}
                error={errors.emergencyContact2PhoneNumber}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                Relationship <span className="text-red-500">*</span>
                </label>
                <select
                name="emergencyContact2Relationship"
                value={formState.emergencyContact2Relationship}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent"
                >
                <option value="">Select relationship</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Spouse">Spouse</option>
                <option value="Friend">Friend</option>
                </select>
                {errors.emergencyContact2Relationship && (
                <p className="mt-2 text-sm text-red-600">{errors.emergencyContact2Relationship}</p>
                )}
              </div>
              </div>
            </div>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start">
              <input
              id="terms"
              name="terms"
              type="checkbox"
              className="h-4 w-4 text-[var(--main-blue)] focus:ring-[var(--main-blue)] border-gray-300 rounded mt-1"
              required
              />
              <label htmlFor="terms" className="ml-3 text-sm text-gray-700">
              I agree to the{' '}
              <a href="#" className="text-[var(--main-blue)] hover:text-[var(--secondary-blue)] font-medium">
                Terms and Conditions
              </a>{' '}
              and{' '}
              <a href="#" className="text-[var(--main-blue)] hover:text-[var(--secondary-blue)] font-medium">
                Privacy Policy
              </a>
              . I understand that this application will be reviewed and I may be contacted for additional information.
              </label>
            </div>
            </div>

            <div className="flex justify-between items-center pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode('track')}
            >
              Track Existing Application
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </Button>
            </div>
          </form>
          </div>
        </div>
        ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-[var(--main-blue)] to-[var(--secondary-blue)] text-white">
          <h2 className="text-xl font-bold">Track Your Application</h2>
          <p className="text-sm opacity-90 mt-1">
            View the status and details of your agent application
          </p>
          </div>

          {!application ? (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-grow">
              <Input
                label="Email Address"
                name="trackingEmail"
                type="email"
                placeholder="Enter the email used for registration"
                value={trackingEmail}
                onChange={(e) => setTrackingEmail(e.target.value)}
              />
              </div>
              <div className="flex items-end">
              <Button
                onClick={() => trackApplication(trackingEmail)}
                disabled={!trackingEmail || isSubmitting}
              >
                {isSubmitting ? 'Loading...' : 'Track Application'}
              </Button>
              </div>
            </div>
            </div>
            <div className="mt-4 text-center">
           <Button
  variant="outline"
  onClick={() => {
    resetApplicationState();
    setMode('new');
  }}
>
  Make New Application
</Button>
            </div>
          </div>
          ) : (
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Application Status</h2>
              <p className="text-gray-600">Submitted on {formatDate(application.submittedAt)}</p>
            </div>
            {application.status === "SENT_FOR_ACTION" ? (
              <div className="mt-4 md:mt-0 flex items-center gap-3">
              {getStatusBadge(application.status)}
              <Button
                onClick={() => setShowEditModal(true)}
                variant="outline"
                size="sm"
              >
                Edit Application
              </Button>
              </div>
            ) : (
              <div className="mt-4 md:mt-0">
              {getStatusBadge(application.status)}
              </div>
            )}
            </div>

            {application.status === "SENT_FOR_ACTION" && application.rejectionReason && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
              <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Action Required</h3>
                <div className="mt-2 text-sm text-red-700">
                <p>{application.rejectionReason}</p>
                </div>
              </div>
              </div>
            </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Applicant Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Applicant Information</h3>
              <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium">{application.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{application.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{application.phoneNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date of Birth</p>
                <p className="font-medium">{formatDate(application.dateOfBirth)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{application.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Province</p>
                <p className="font-medium">{application.province}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">District</p>
                <p className="font-medium">{application.district}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sector</p>
                <p className="font-medium">{application.sector}</p>
              </div>
               <div>
      <p className="text-sm text-gray-500">Bank Name</p>
      <p className="font-medium">{application.bankName}</p>
    </div>
    <div>
      <p className="text-sm text-gray-500">Bank Account Number</p>
      <p className="font-medium">{application.bankAccountNumber}</p>
    </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Emergency Contacts</h3>
              <div className="space-y-4">
              {application.emergencyContacts.map((contact, index) => (
                <div key={index} className="bg-white p-3 rounded border">
                <h4 className="text-sm font-medium mb-2">Emergency Contact {index + 1}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="text-sm">{contact.fullName}</p>
                  </div>
                  <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm">{contact.phoneNumber}</p>
                  </div>
                  <div>
                  <p className="text-xs text-gray-500">Relationship</p>
                  <p className="text-sm">{contact.relationship}</p>
                  </div>
                </div>
                </div>
              ))}
              </div>
            </div>
            </div>

            {/* Documents Section */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between bg-white p-3 rounded border">
              <div>
                <p className="text-sm font-medium">National ID</p>
                <p className="text-xs text-gray-500">Identification document</p>
              </div>
              <Button 
                variant="text" 
                size="sm"
                onClick={() => handleViewDocument('National ID', application.nationalIdDocument)}
              >
                View
              </Button>
              </div>
              <div className="flex items-center justify-between bg-white p-3 rounded border">
              <div>
                <p className="text-sm font-medium">Criminal Record</p>
                <p className="text-xs text-gray-500">Certificate</p>
              </div>
              <Button 
                variant="text" 
                size="sm"
                onClick={() => handleViewDocument('Criminal Record', application.criminalRecordCertificate)}
              >
                View
              </Button>
              </div>
              <div className="flex items-center justify-between bg-white p-3 rounded border">
              <div>
                <p className="text-sm font-medium">Passport Photo</p>
                <p className="text-xs text-gray-500">Recent photo</p>
              </div>
              <Button 
                variant="text" 
                size="sm"
                onClick={() => handleViewDocument('Passport Photo', application.passportPhoto)}
              >
                View
              </Button>
              </div>
            </div>
            </div>

            {/* Status-specific messages */}
            {application.status === 'PENDING' && (
            <div className="mt-6 bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-700 mb-2">Application Under Review</h4>
              <p className="text-sm text-gray-600">
              Your application is currently being reviewed by our team. You&apos;ll be notified via email once a decision has been made.
              </p>
            </div>
            )}
            {application.status === 'APPROVED' && (
            <div className="mt-6 bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-700 mb-2">Application Approved</h4>
              <p className="text-sm text-gray-600">
              Congratulations! Your application has been approved. You&apos;ll receive further instructions via email.
              </p>
            </div>
            )}
            {application.status === 'REJECTED' && (
            <div className="mt-6 bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-700 mb-2">Application Rejected</h4>
              <p className="text-sm text-gray-600">
              We&apos;re sorry to inform you that your application has been rejected. Please contact support if you have any questions.
              </p>
            </div>
            )}

            <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              
                 onClick={() => {
          resetApplicationState();
          setMode('new');
        }}
            >
              Make New Application
            </Button>
            </div>
          </div>
          )}
        </div>
        )}
      </div>
      </div>

      <OTPModal
      isOpen={showOtpModal}
      onClose={handleCloseModal}
      onVerify={handleOtpVerification}
      email={tempEmail}
      isLoading={isSubmitting}
      />

      {viewingDocument && (
      <DocumentViewer
        documentName={viewingDocument.name}
        documentPath={viewingDocument.path}
        onClose={() => setViewingDocument(null)}
      />
      )}

      {application && (
      <EditUserOnTrackingPage
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        application={application}
        // Fix: cast handleSaveChanges to the expected type to resolve type mismatch
        onSave={handleSaveChanges as (updatedData: Partial<Application>, files: Record<string, File | null>) => Promise<void>}
        isLoading={isSubmitting}
      />
      )}

      <ToastContainer />
    </MainLayout>
  );
}