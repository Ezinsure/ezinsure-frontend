import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ValidationRules, validateForm } from "@/components/ui/form-validation";
// import { useState } from "react";

interface FileUploadFieldProps {
  label: string;
  name: string;
  accept: string;
  error?: string;
  file: File | null;
  description: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => void;
}

const FileUploadField = ({ 
  label, 
  name, 
  accept, 
  error, 
  file, 
  description,
  onChange
}: FileUploadFieldProps) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} <span className="text-red-500">*</span>
    </label>
    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-[var(--main-blue)] transition-colors">
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
              onChange={(e) => onChange(e, name)}
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

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (formData: any) => void;
  isLoading: boolean;
  errors: { [key: string]: string };
  formData: any;
  setFormData: (data: any) => void;
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

export const UserCreateModal = ({
  isOpen,
  onClose,
  onCreate,
  isLoading,
  errors,
  formData,
  setFormData,
  setErrors
}: UserCreateModalProps) => {
  const validationRules: ValidationRules = {
    fullName: { required: true, minLength: 3 },
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phoneNumber: { required: true, pattern: /^\+?\d{10,15}$/ },
    dateOfBirth: { required: true },
    address: { required: true, minLength: 10 },
    emergencyContact1Name: { required: true, minLength: 2 },
    emergencyContact1PhoneNumber: { required: true, pattern: /^\+?\d{10,15}$/ },
    emergencyContact1Relationship: { required: true },
    emergencyContact2Name: { required: true, minLength: 2 },
    emergencyContact2PhoneNumber: { required: true, pattern: /^\+?\d{10,15}$/ },
    emergencyContact2Relationship: { required: true },
  };


interface FormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: string;
  role: 'ADMIN' | 'AGENT';
  emergencyContact1Name: string;
  emergencyContact1PhoneNumber: string;
  emergencyContact1Relationship: string;
  emergencyContact2Name: string;
  emergencyContact2PhoneNumber: string;
  emergencyContact2Relationship: string;
  nationalIdDocument: File | null;
  criminalRecordCertificate: File | null;
  passportPhoto: File | null;
}

interface Errors {
  [key: string]: string;
}  

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  setFormData((prev: FormData) => ({ ...prev, [name]: value }));
  
  if (errors[name]) {
    setErrors((prev: Errors) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }
};

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
  const file = e.target.files?.[0] || null;
  setFormData((prev: FormData) => ({ ...prev, [fieldName]: file }));
  
  if (errors[fieldName]) {
    setErrors((prev: Errors) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }
};

  const validateFiles = () => {
    const fileErrors: { [key: string]: string } = {};

    if (formData.role === 'AGENT') {
      if (!formData.nationalIdDocument) {
        fileErrors.nationalIdDocument = 'National ID document is required';
      }
      if (!formData.criminalRecordCertificate) {
        fileErrors.criminalRecordCertificate = 'Criminal record document is required';
      }
      if (!formData.passportPhoto) {
        fileErrors.passportPhoto = 'Passport photo is required';
      }

      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const allowedDocTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      const maxFileSize = 5 * 1024 * 1024; // 5MB

      if (formData.nationalIdDocument) {
        if (!allowedDocTypes.includes(formData.nationalIdDocument.type)) {
          fileErrors.nationalIdDocument = 'National ID must be PDF, JPEG, or PNG';
        } else if (formData.nationalIdDocument.size > maxFileSize) {
          fileErrors.nationalIdDocument = 'National ID file size must be less than 5MB';
        }
      }

      if (formData.criminalRecordCertificate) {
        if (!allowedDocTypes.includes(formData.criminalRecordCertificate.type)) {
          fileErrors.criminalRecordCertificate = 'Criminal record must be PDF, JPEG, or PNG';
        } else if (formData.criminalRecordCertificate.size > maxFileSize) {
          fileErrors.criminalRecordCertificate = 'Criminal record file size must be less than 5MB';
        }
      }

      if (formData.passportPhoto) {
        if (!allowedImageTypes.includes(formData.passportPhoto.type)) {
          fileErrors.passportPhoto = 'Passport photo must be JPEG or PNG';
        } else if (formData.passportPhoto.size > maxFileSize) {
          fileErrors.passportPhoto = 'Passport photo file size must be less than 5MB';
        }
      }
    }

    return fileErrors;
  };

  const handleSubmit = () => {
    const formErrors = validateForm(formData, validationRules);
    const fileErrors = validateFiles();
    const allErrors = { ...formErrors, ...fileErrors };
    setErrors(allErrors);

    if (Object.keys(allErrors).length === 0) {
      onCreate(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
      <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
        <h3 className="text-lg font-semibold mb-4">Create New User</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              error={errors.fullName}
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              error={errors.email}
              required
            />
            <Input
              label="Phone Number"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              error={errors.phoneNumber}
              required
            />
            <Input
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              error={errors.dateOfBirth}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Address <span className="text-red-500">*</span>
            </label>
            <textarea
              name="address"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
              placeholder="Enter complete current address"
              value={formData.address}
              onChange={handleInputChange}
            />
            {errors.address && (
              <p className="mt-2 text-sm text-red-600">{errors.address}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
            >
              <option value="AGENT">Agent</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {formData.role === 'AGENT' && (
            <>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Required Documents</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <FileUploadField
                    label="National ID"
                    name="nationalIdDocument"
                    accept=".pdf,.jpg,.jpeg,.png"
                    error={errors.nationalIdDocument}
                    file={formData.nationalIdDocument}
                    description="PDF, JPEG, or PNG up to 5MB"
                    onChange={handleFileChange}
                  />
                  <FileUploadField
                    label="Criminal Record Certificate"
                    name="criminalRecordCertificate"
                    accept=".pdf,.jpg,.jpeg,.png"
                    error={errors.criminalRecordCertificate}
                    file={formData.criminalRecordCertificate}
                    description="PDF, JPEG, or PNG up to 5MB"
                    onChange={handleFileChange}
                  />
                </div>
                <div className="mt-6">
                  <FileUploadField
                    label="Recent Passport Photo"
                    name="passportPhoto"
                    accept=".jpg,.jpeg,.png"
                    error={errors.passportPhoto}
                    file={formData.passportPhoto}
                    description="JPEG or PNG up to 5MB"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Emergency Contacts</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Input
                    label="Full Name"
                    name="emergencyContact1Name"
                    placeholder="Contact name"
                    value={formData.emergencyContact1Name}
                    onChange={handleInputChange}
                    error={errors.emergencyContact1Name}
                    required
                  />
                  <Input
                    label="Phone Number"
                    type="tel"
                    name="emergencyContact1PhoneNumber"
                    placeholder="+250 7XX XXX XXX"
                    value={formData.emergencyContact1PhoneNumber}
                    onChange={handleInputChange}
                    error={errors.emergencyContact1PhoneNumber}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Relationship <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="emergencyContact1Relationship"
                      value={formData.emergencyContact1Relationship}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Full Name"
                    name="emergencyContact2Name"
                    placeholder="Contact name"
                    value={formData.emergencyContact2Name}
                    onChange={handleInputChange}
                    error={errors.emergencyContact2Name}
                    required
                  />
                  <Input
                    label="Phone Number"
                    type="tel"
                    name="emergencyContact2PhoneNumber"
                    placeholder="+250 7XX XXX XXX"
                    value={formData.emergencyContact2PhoneNumber}
                    onChange={handleInputChange}
                    error={errors.emergencyContact2PhoneNumber}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Relationship <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="emergencyContact2Relationship"
                      value={formData.emergencyContact2Relationship}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
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
            </>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="text"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : 'Create User'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};