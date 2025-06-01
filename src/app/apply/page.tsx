'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileInput } from '@/components/ui/file-input';
import { useToast } from '@/components/ui/toast';
import {
  validateForm,
  ValidationRules,
  validationPatterns,
  hasErrors,
} from '@/components/ui/form-validation';

export default function ApplyPage() {
  const { showToast, ToastContainer } = useToast();
  const [formKey, setFormKey] = useState(Date.now());

  const [formState, setFormState] = useState({
    fullName: '',
    email: '',
    phoneNumber: '', // Changed from 'phone' to match API
    address: '',
    dateOfBirth: '',
    insuranceCategory: 'car',
    insuranceType: 'comprehensive',
    insuranceDuration: '12',
    nationalID: null as File | null, // Changed from 'nationalId' to match API
    yellowCard: null as File | null,
    pastInsuranceCertificate: null as File | null,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationRules: ValidationRules = {
    fullName: { required: true, minLength: 3, maxLength: 50 },
    email: { required: true, pattern: validationPatterns.email },
    phoneNumber: { required: true, pattern: validationPatterns.phone }, // Updated field name
    address: { required: true, minLength: 5, maxLength: 100 },
    dateOfBirth: { required: true },
    insuranceCategory: { required: true },
    insuranceType: { required: true },
    insuranceDuration: { required: true },
    nationalID: { required: true }, // Updated field name
    yellowCard: { required: true },
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
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

  const handleFileChange = (name: string) => (file: File | null) => {
    setFormState((prev) => ({ ...prev, [name]: file }));

    // Clear error when selecting file
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const formatInsuranceDuration = (duration: string) => {
    switch (duration) {
      case '1': return '1 Month';
      case '3': return '3 Months';
      case '6': return '6 Months';
      case '12': return '12 Months';
      default: return '12 Months';
    }
  };

  const formatInsuranceType = (type: string) => {
    switch (type) {
      case 'comprehensive': return 'Comprehensive Insurance (covers everything)';
      case 'thirdParty': return 'Third Party Insurance (covers partial)';
      default: return 'Comprehensive Insurance (covers everything)';
    }
  };

  const formatInsuranceCategory = (category: string) => {
    switch (category) {
      case 'car': return 'Car Insurance';
      case 'motorbike': return 'Motorbike Insurance';
      case 'building': return 'Building Insurance';
      case 'travel': return 'Travel Insurance';
      case 'health': return 'Health Insurance';
      case 'fire': return 'Fire Insurance Coverage';
      default: return 'Car Insurance';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const formErrors = validateForm(formState, validationRules);
    setErrors(formErrors);

    if (!hasErrors(formErrors)) {
      setIsSubmitting(true);

      try {
        const formData = new FormData();
        
        // Append basic information
        formData.append('fullName', formState.fullName);
        formData.append('email', formState.email);
        formData.append('phoneNumber', formState.phoneNumber);
        formData.append('address', formState.address);
        formData.append('dateOfBirth', formState.dateOfBirth);
        formData.append('insuranceCategory', formatInsuranceCategory(formState.insuranceCategory));
        formData.append('insuranceType', formatInsuranceType(formState.insuranceType));
        formData.append('insuranceDuration', formatInsuranceDuration(formState.insuranceDuration));
        
        // Append files
        if (formState.nationalID) {
          formData.append('nationalID', formState.nationalID);
        }
        if (formState.yellowCard) {
          formData.append('yellowCard', formState.yellowCard);
        }
        if (formState.pastInsuranceCertificate) {
          formData.append('pastInsuranceCertificate', formState.pastInsuranceCertificate);
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/apply`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Submission error:', errorData);
          throw new Error(errorData.message || 'Application submission failed');
        }

        const data = await response.json();
        
        showToast(
          `Application submitted successfully! Your application number is ${data.data.applicationNumber}.`,
          'success'
        );

        // Reset form after successful submission
        setFormState({
          fullName: '',
          email: '',
          phoneNumber: '',
          address: '',
          dateOfBirth: '',
          insuranceCategory: 'car',
          insuranceType: 'comprehensive',
          insuranceDuration: '12',
          nationalID: null,
          yellowCard: null,
          pastInsuranceCertificate: null,
        });
        setFormKey(Date.now());

      } catch (error: unknown) {
        console.error('Application error:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to submit application. Please try again.';
        showToast(errorMessage, 'error');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      showToast('Please correct the errors in the form.', 'error');
    }
  };

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className=" container mx-auto px-4 py-12 ">
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0  bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <div className="max-w-3xl mx-auto mt-16">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Apply for Insurance
            </h1>
            <p className="text-gray-600">
              Fill out the form below to apply for insurance. Our team will
              review your application and get back to you shortly.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-[var(--main-blue)] to-[var(--secondary-blue)] text-white">
              <h2 className="text-xl font-semibold">Personal Information</h2>
              <p className="opacity-80">
                Please provide accurate information for faster processing
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  name="fullName"
                  placeholder="Jean Claude Niyonzima"
                  value={formState.fullName}
                  onChange={handleInputChange}
                  error={errors.fullName}
                  required
                />

                <Input
                  label="Email Address"
                  type="email"
                  name="email"
                  placeholder="johndoe@example.com"
                  value={formState.email}
                  onChange={handleInputChange}
                  error={errors.email}
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
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  }
                />

                <Input
                  label="Phone Number"
                  name="phoneNumber" // Updated field name
                  placeholder="0781234567"
                  value={formState.phoneNumber}
                  onChange={handleInputChange}
                  error={errors.phoneNumber}
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
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  }
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

                <Input
                  label="Address"
                  name="address"
                  placeholder="KN 5 RD, Kigali - Rwanda"
                  value={formState.address}
                  onChange={handleInputChange}
                  error={errors.address}
                  required
                />

                <div className="md:col-span-2">
                  <label
                    className="block text-sm font-medium mb-1"
                    htmlFor="insuranceCategory"
                  >
                    Insurance Category{' '}
                    <span className="text-[var(--error-red)] ml-1">*</span>
                  </label>
                  <select
                    id="insuranceCategory"
                    name="insuranceCategory"
                    value={formState.insuranceCategory}
                    onChange={handleInputChange}
                    className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                    required
                  >
                    <option value="car">Car Insurance</option>
                    <option value="motorbike">Motorbike Insurance</option>
                    <option value="building">Building Insurance</option>
                    <option value="travel">Travel Insurance</option>
                    <option value="health">Health Insurance</option>
                    <option value="fire">Fire Insurance Coverage</option>
                  </select>
                  {errors.insuranceCategory && (
                    <p className="mt-1 text-sm text-[var(--error-red)]">
                      {errors.insuranceCategory}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label
                    className="block text-sm font-medium mb-1"
                    htmlFor="insuranceType"
                  >
                    Insurance Type{' '}
                    <span className="text-[var(--error-red)] ml-1">*</span>
                  </label>
                  <select
                    id="insuranceType"
                    name="insuranceType"
                    value={formState.insuranceType}
                    onChange={handleInputChange}
                    className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                    required
                  >
                    <option value="comprehensive">Comprehensive Insurance (covers everything)</option>
                    <option value="thirdParty">Third Party Insurance (covers partial)</option>
                  </select>
                  {errors.insuranceType && (
                    <p className="mt-1 text-sm text-[var(--error-red)]">
                      {errors.insuranceType}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label
                    className="block text-sm font-medium mb-1"
                    htmlFor="insuranceDuration"
                  >
                    Insurance Duration{' '}
                    <span className="text-[var(--error-red)] ml-1">*</span>
                  </label>
                  <select
                    id="insuranceDuration"
                    name="insuranceDuration"
                    value={formState.insuranceDuration}
                    onChange={handleInputChange}
                    className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                    required
                  >
                    <option value="1">1 Month</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                  </select>
                  {errors.insuranceDuration && (
                    <p className="mt-1 text-sm text-[var(--error-red)]">
                      {errors.insuranceDuration}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">
                  Required Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FileInput
                    key={`nationalID-${formKey}`}
                    label="National ID Card"
                    name="nationalID"
                    onChange={handleFileChange('nationalID')}
                    error={errors.nationalID}
                    required
                    accept="image/*,.pdf"
                  />

                  <FileInput
                    key={`yellowCard-${formKey}`}
                    label="Yellow Card"
                    name="yellowCard"
                    onChange={handleFileChange('yellowCard')}
                    error={errors.yellowCard}
                    required
                    accept="image/*,.pdf"
                  />

                  <FileInput
                    key={`pastInsuranceCertificate-${formKey}`}
                    label="Past Insurance Certificate (Optional)"
                    name="pastInsuranceCertificate"
                    onChange={handleFileChange('pastInsuranceCertificate')}
                    accept="image/*,.pdf"
                    className="md:col-span-2"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full md:w-auto min-w-[200px]"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </div>

          <div className="mt-8 bg-[var(--light-gray)] rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-2">What happens next?</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Our team will review your application within the next 30 minutes.</li>
              <li>
                You will receive a confirmation email with your application
                number.
              </li>
              <li>
                Use the application number to track your application status.
              </li>
              <li>Once reviewed, you will receive a quotation and invoice.</li>
              <li>Follow the instructions in the invoice to pay for your insurance.</li>
              <li>After payment, submit a clear proof of payment (Any for of receipt)</li>
              <li>
                After payment confirmation, your insurance certificate will be
                issued and sent to you via Email or direclty on Whatsapp.
              </li>
            </ol>
          </div>
        </div>
      </div>
      <ToastContainer />
    </MainLayout>
  );
}