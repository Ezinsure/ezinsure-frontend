'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { validateForm, ValidationRules, validationPatterns } from '@/components/ui/form-validation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface FormState {
  [key: string]: string | File | null;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  currentAddress: string;
  nationalId: File | null;
  criminalRecord: File | null;
  passportPhoto: File | null;
  emergencyContact1Name: string;
  emergencyContact1Phone: string;
  emergencyContact1Relationship: string;
  emergencyContact2Name: string;
  emergencyContact2Phone: string;
  emergencyContact2Relationship: string;
}

export default function AgentRegistrationPage() {
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();

  const [formState, setFormState] = useState<FormState>({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    currentAddress: '',
    nationalId: null,
    criminalRecord: null,
    passportPhoto: null,
    emergencyContact1Name: '',
    emergencyContact1Phone: '',
    emergencyContact1Relationship: '',
    emergencyContact2Name: '',
    emergencyContact2Phone: '',
    emergencyContact2Relationship: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationRules: ValidationRules = {
    fullName: { required: true, minLength: 2 },
    email: { required: true, pattern: validationPatterns.email },
    phone: { required: true, pattern: validationPatterns.phone },
    dateOfBirth: { required: true },
    currentAddress: { required: true, minLength: 10 },
    emergencyContact1Name: { required: true, minLength: 2 },
    emergencyContact1Phone: { required: true, pattern: validationPatterns.phone },
    emergencyContact1Relationship: { required: true },
    emergencyContact2Name: { required: true, minLength: 2 },
    emergencyContact2Phone: { required: true, pattern: validationPatterns.phone },
    emergencyContact2Relationship: { required: true },
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));

    // Clear error when typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof FormState) => {
    const file = e.target.files?.[0] || null;
    setFormState((prev) => ({ ...prev, [fieldName]: file }));

    // Clear error when file is selected
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, fieldName: keyof FormState) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      setFormState((prev) => ({ ...prev, [fieldName]: file }));
      
      // Clear error when file is selected
      if (errors[fieldName]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
    }
  }, [errors]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFiles = () => {
    const fileErrors: { [key: string]: string } = {};

    if (!formState.nationalId) {
      fileErrors.nationalId = 'National ID document is required';
    }
    if (!formState.criminalRecord) {
      fileErrors.criminalRecord = 'Criminal record document is required';
    }
    if (!formState.passportPhoto) {
      fileErrors.passportPhoto = 'Passport photo is required';
    }

    // Validate file types and sizes
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const allowedDocTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    if (formState.nationalId) {
      if (!allowedDocTypes.includes(formState.nationalId.type)) {
        fileErrors.nationalId = 'National ID must be PDF, JPEG, or PNG';
      } else if (formState.nationalId.size > maxFileSize) {
        fileErrors.nationalId = 'National ID file size must be less than 5MB';
      }
    }

    if (formState.criminalRecord) {
      if (!allowedDocTypes.includes(formState.criminalRecord.type)) {
        fileErrors.criminalRecord = 'Criminal record must be PDF, JPEG, or PNG';
      } else if (formState.criminalRecord.size > maxFileSize) {
        fileErrors.criminalRecord = 'Criminal record file size must be less than 5MB';
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

    // Validate form fields
    const formErrors = validateForm(formState, validationRules);
    const fileErrors = validateFiles();
    const allErrors = { ...formErrors, ...fileErrors };

    setErrors(allErrors);

    if (Object.keys(allErrors).length === 0) {
      setIsSubmitting(true);

      try {
        // Generate application ID
        const applicationId = 'AGT' + Date.now().toString().slice(-6);

        // Simulate API call to submit registration
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Store application data (in real app, this would be sent to backend)
        const applicationData = {
          id: applicationId,
          ...formState,
          status: 'pending_review',
          dateSubmitted: new Date().toISOString().split('T')[0],
          type: 'agent_application'
        };

        // Store in localStorage for demo purposes
        const existingApplications = JSON.parse(localStorage.getItem('agentApplications') || '[]');
        existingApplications.push(applicationData);
        localStorage.setItem('agentApplications', JSON.stringify(existingApplications));

        showToast(`Registration successful! Your application ID is ${applicationId}. Please save this ID for tracking.`, 'success');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);

      } catch (error) {
        console.log('Error during registration:', error);
        showToast('An error occurred during registration. Please try again.', 'error');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      showToast('Please correct the errors in the form.', 'error');
    }
  };

  const FileUploadField = ({ 
    label, 
    name, 
    accept, 
    error, 
    file, 
    description 
  }: { 
    label: string; 
    name: keyof FormState; 
    accept: string; 
    error?: string; 
    file: File | null; 
    description: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} <span className="text-red-500">*</span>
      </label>
      <div 
        className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-[var(--main-blue)] transition-colors"
        onDrop={(e) => handleDrop(e, name)}
        onDragOver={handleDragOver}
      >
        <div className="space-y-1 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex text-sm text-gray-600">
            <label className="relative cursor-pointer bg-white rounded-md font-medium text-[var(--main-blue)] hover:text-[var(--secondary-blue)] focus-within:outline-none">
              <span>Upload a file</span>
              <input
                type="file"
                className="sr-only"
                accept={accept}
                onChange={(e) => handleFileChange(e, name)}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">{description}</p>
          {file && (
            <p className="text-xs text-green-600 font-medium mt-2">
              Selected: {file.name}
            </p>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A2540] to-[#126BB3] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden ">
          <div className="p-6 bg-gradient-to-r from-[var(--main-blue)] to-[var(--secondary-blue)] text-white text-center">
            <h1 className="text-3xl font-bold">Agent Registration</h1>
            <p className="text-sm opacity-80 mt-2">
              Join our team of professional insurance agents
            </p>
          </div>

          <div className="p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--main-blue)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-600">
                Fill out this application to become an authorized insurance agent with EzInsure.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
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
                    name="phone"
                    placeholder="+250 7XX XXX XXX"
                    value={formState.phone}
                    onChange={handleInputChange}
                    error={errors.phone}
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
                  />
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="currentAddress"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent"
                    placeholder="Enter your complete current address"
                    value={formState.currentAddress}
                    onChange={handleInputChange}
                  />
                  {errors.currentAddress && (
                    <p className="mt-2 text-sm text-red-600">{errors.currentAddress}</p>
                  )}
                </div>
              </div>

              {/* Required Documents */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Required Documents</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <FileUploadField
                    label="National ID"
                    name="nationalId"
                    accept=".pdf,.jpg,.jpeg,.png"
                    error={errors.nationalId}
                    file={formState.nationalId}
                    description="PDF, JPEG, or PNG up to 5MB"
                  />

                  <FileUploadField
                    label="Criminal Record Certificate"
                    name="criminalRecord"
                    accept=".pdf,.jpg,.jpeg,.png"
                    error={errors.criminalRecord}
                    file={formState.criminalRecord}
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
                      name="emergencyContact1Phone"
                      placeholder="+250 7XX XXX XXX"
                      value={formState.emergencyContact1Phone}
                      onChange={handleInputChange}
                      error={errors.emergencyContact1Phone}
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
                        <option value="parent">Parent</option>
                        <option value="sibling">Sibling</option>
                        <option value="spouse">Spouse</option>
                        <option value="friend">Friend</option>
                        <option value="other">Other</option>
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
                      name="emergencyContact2Phone"
                      placeholder="+250 7XX XXX XXX"
                      value={formState.emergencyContact2Phone}
                      onChange={handleInputChange}
                      error={errors.emergencyContact2Phone}
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
                        <option value="parent">Parent</option>
                        <option value="sibling">Sibling</option>
                        <option value="spouse">Spouse</option>
                        <option value="friend">Friend</option>
                        <option value="other">Other</option>
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

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-[var(--main-blue)] hover:text-[var(--secondary-blue)]">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}