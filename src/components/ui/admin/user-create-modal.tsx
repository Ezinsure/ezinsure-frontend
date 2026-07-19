import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ValidationRules, validateForm } from "@/components/ui/form-validation";
import { AdministrativeDivision, rwandaProvinces } from '@/utils/rwanda-administrative';
import { rwandaBanks } from '@/utils/rwanda-banks';
import { useEffect, useMemo, useState } from 'react';
import { VETERINARY_ROLE } from '@/shared/utils/role';
import { useToast } from "../toast";

// import { useState } from "react";

interface FormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: string;
  province: string;
  district: string;
  sector: string;
  role: 'ADMIN' | 'AGENT' | 'VETERINARY';
  emergencyContact1Name: string;
  emergencyContact1PhoneNumber: string;
  emergencyContact1Relationship: string;
  emergencyContact2Name: string;
  emergencyContact2PhoneNumber: string;
  emergencyContact2Relationship: string;
  nationalIdDocument: File | null;
  criminalRecordCertificate: File | null;
  passportPhoto: File | null;
  bankName: string;
  bankAccountNumber: string;
  /** Veterinarian-only: RCVD (Rwanda Council of Veterinary Doctors) licence document. */
  rcvdLicenceDocument: File | null;
  /** Veterinarian-only: 'PRIVATE' or 'SARO' (government vet). */
  veterinaryType: string;
  [key: string]: string | File | null;
}

interface Errors {
  [key: string]: string;
}

interface FileUploadFieldProps {
  label: string;
  name: string;
  accept: string;
  error?: string;
  file: File | null;
  description: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => void;
  required?: boolean;
}

const FileUploadField = ({
  label,
  name,
  accept,
  error,
  file,
  description,
  onChange,
  required = true,
}: FileUploadFieldProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Directly call onChange with a synthetic event for file input
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      const input = document.createElement('input');
      input.type = 'file';
      input.files = dataTransfer.files;
      const event = {
        target: input
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(event, name);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div
        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg transition-colors ${isDragging ? 'border-[var(--main-blue)] bg-blue-50' : 'hover:border-[var(--main-blue)]'
          }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
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
};

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (formData: FormData) => void;
  isLoading: boolean;
  errors: Errors;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  setErrors: React.Dispatch<React.SetStateAction<Errors>>;
  /** When set, role select is hidden; agent requires full onboarding docs, veterinary has a lighter form */
  fixedRole?: 'AGENT' | 'VETERINARY';
  title?: string;
  submitLabel?: string;
}

export const UserCreateModal = ({
  isOpen,
  onClose,
  onCreate,
  isLoading,
  errors,
  formData,
  setFormData,
  setErrors,
  fixedRole,
  title = 'Create New User',
  submitLabel = 'Create User',
}: UserCreateModalProps) => {
  const { showToast, ToastContainer } = useToast();
  const [districts, setDistricts] = useState<AdministrativeDivision[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);

  const isVeterinaryForm =
    fixedRole === VETERINARY_ROLE || formData.role === VETERINARY_ROLE;

  const validationRules: ValidationRules = useMemo(() => {
    const rules: ValidationRules = {
      fullName: { required: true, minLength: 3 },
      email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      phoneNumber: { required: true, pattern: /^250\d{9}$/ },
      dateOfBirth: { required: true },
      address: { required: true, minLength: 4 },
      bankName: { required: true },
      bankAccountNumber: {
        required: true,
        validate: (value: string) => {
          if (!value) return 'Bank account number is required';
          if (!/^\d+$/.test(value)) return 'Bank account number must contain only digits (0-9)';
          if (value.length < 10) return 'Bank account number must be at least 10 digits';
          if (value.length > 16) return 'Bank account number must be at most 16 digits';
          return true;
        },
      },
      province: { required: true },
      district: { required: true },
      sector: { required: true },
    };

    if (!isVeterinaryForm) {
      rules.emergencyContact1Name = { required: true, minLength: 2 };
      rules.emergencyContact1PhoneNumber = { required: true, pattern: /^250\d{9}$/ };
      rules.emergencyContact1Relationship = { required: true };
      rules.emergencyContact2Name = { required: true, minLength: 2 };
      rules.emergencyContact2PhoneNumber = { required: true, pattern: /^250\d{9}$/ };
      rules.emergencyContact2Relationship = { required: true };
      rules.nationalIdDocument = { required: true };
      rules.criminalRecordCertificate = { required: true };
      rules.passportPhoto = { required: true };
    } else {
      rules.nationalIdDocument = { required: true };
      rules.rcvdLicenceDocument = { required: true };
      rules.veterinaryType = { required: true };
    }

    return rules;
  }, [isVeterinaryForm]);

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
    const fileErrors: Errors = {};
    const isAgentForm = fixedRole === 'AGENT' || formData.role === 'AGENT';

    if (!isAgentForm && !isVeterinaryForm) {
      return fileErrors;
    }

    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const allowedDocTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxFileSize = 5 * 1024 * 1024;

    if (!formData.nationalIdDocument) {
      fileErrors.nationalIdDocument = 'National ID document is required';
    }

    if (isAgentForm) {
      if (!formData.criminalRecordCertificate) {
        fileErrors.criminalRecordCertificate = 'Criminal record document is required';
      }
      if (!formData.passportPhoto) {
        fileErrors.passportPhoto = 'Passport photo is required';
      }
    }

    if (isVeterinaryForm && !formData.rcvdLicenceDocument) {
      fileErrors.rcvdLicenceDocument = 'RCVD licence document is required';
    }

    if (formData.nationalIdDocument) {
      if (!allowedDocTypes.includes(formData.nationalIdDocument.type)) {
        fileErrors.nationalIdDocument = 'National ID must be PDF, JPEG, or PNG';
      } else if (formData.nationalIdDocument.size > maxFileSize) {
        fileErrors.nationalIdDocument = 'National ID file size must be less than 5MB';
      }
    }

    if (formData.rcvdLicenceDocument) {
      if (!allowedDocTypes.includes(formData.rcvdLicenceDocument.type)) {
        fileErrors.rcvdLicenceDocument = 'RCVD licence must be PDF, JPEG, or PNG';
      } else if (formData.rcvdLicenceDocument.size > maxFileSize) {
        fileErrors.rcvdLicenceDocument = 'RCVD licence file size must be less than 5MB';
      }
    }

    if (!isVeterinaryForm && formData.criminalRecordCertificate) {
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

    return fileErrors;
  };

  const handleSubmit = () => {
    const formErrors = validateForm(formData, validationRules);
    const fileErrors = validateFiles();
    const allErrors = { ...formErrors, ...fileErrors };
    setErrors(allErrors);

    if (Object.keys(allErrors).length === 0) {
      onCreate(formData);
    } else {
      showToast('Please correct the errors in the form.', 'error');
    }
  };

  useEffect(() => {
    if (!isOpen || !fixedRole) return;
    setFormData((prev) => ({ ...prev, role: fixedRole }));
  }, [isOpen, fixedRole, setFormData]);

  useEffect(() => {
    if (formData.province) {
      const selectedProvince = rwandaProvinces.find(p => p.name === formData.province);
      setDistricts(selectedProvince?.districts || []);
      setFormData(prev => ({ ...prev, district: '', sector: '' }));
    } else {
      setDistricts([]);
      setFormData(prev => ({ ...prev, district: '', sector: '' }));
    }
  }, [formData.province]);

  useEffect(() => {
    if (formData.district) {
      const selectedDistrict = districts.find(d => d.name === formData.district);
      const sectors = selectedDistrict?.sectors || [];
      // Extract sector names as strings
      const sectorNames = sectors.map(sector => sector.name);
      setSectors(sectorNames);
      setFormData(prev => ({ ...prev, sector: '' }));
    } else {
      setSectors([]);
      setFormData(prev => ({ ...prev, sector: '' }));
    }
  }, [formData.district, districts]);

  if (!isOpen) return null;

  const getDateLimits = () => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const minDate = new Date(today.getFullYear() - 65, today.getMonth(), today.getDate());

    return {
      min: minDate.toISOString().split('T')[0],
      max: maxDate.toISOString().split('T')[0]
    };
  };


  return (
    <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
      <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold mb-4">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
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
              min={getDateLimits().min}
              max={getDateLimits().max}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
              <select
                className="w-full border border-gray-300 rounded-md p-2"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                required
              >
                <option value="">Select Province</option>
                {rwandaProvinces.map(province => (
                  <option key={province.name} value={province.name}>{province.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
              <select
                className="w-full border border-gray-300 rounded-md p-2"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                required
                disabled={!formData.province}
              >
                <option value="">Select District</option>
                {districts.map(district => (
                  <option key={district.name} value={district.name}>{district.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sector *</label>
              <select
                className="w-full border border-gray-300 rounded-md p-2"
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                required
                disabled={!formData.district}
              >
                <option value="">Select Sector</option>
                {sectors.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-gray-300 rounded-md p-2"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                required
              >
                <option value="">Select Bank</option>
                {rwandaBanks.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>
            <Input
              label="Bank Account Number"
              name="bankAccountNumber"
              type="text"
              value={formData.bankAccountNumber}
              onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
              error={errors.bankAccountNumber}
              required
              maxLength={16}
              placeholder="Enter account number (10-16 digits)"
            />
          </div>
          {fixedRole ? (
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {fixedRole === VETERINARY_ROLE ? 'Veterinarian' : 'Agent'}
              </p>
            </div>
          ) : (
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
              </select>
            </div>
          )}

          {isVeterinaryForm && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Veterinarian Type <span className="text-red-500">*</span>
              </label>
              <select
                name="veterinaryType"
                value={formData.veterinaryType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
              >
                <option value="">Select veterinarian type</option>
                <option value="PRIVATE">Private</option>
                <option value="SARO">SARO (Government vet)</option>
              </select>
              {errors.veterinaryType && (
                <p className="mt-2 text-sm text-red-600">{errors.veterinaryType}</p>
              )}
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">
              {isVeterinaryForm ? 'Documents' : 'Required Documents'}
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FileUploadField
                label="National ID"
                name="nationalIdDocument"
                accept=".pdf,.jpg,.jpeg,.png"
                error={errors.nationalIdDocument}
                file={formData.nationalIdDocument}
                description="PDF, JPEG, or PNG up to 5MB"
                onChange={handleFileChange}
                required
              />
              {isVeterinaryForm ? (
                <FileUploadField
                  label="RCVD Licence"
                  name="rcvdLicenceDocument"
                  accept=".pdf,.jpg,.jpeg,.png"
                  error={errors.rcvdLicenceDocument}
                  file={formData.rcvdLicenceDocument}
                  description="PDF, JPEG, or PNG up to 5MB"
                  onChange={handleFileChange}
                  required
                />
              ) : (
                <FileUploadField
                  label="Criminal Record Certificate"
                  name="criminalRecordCertificate"
                  accept=".pdf,.jpg,.jpeg,.png"
                  error={errors.criminalRecordCertificate}
                  file={formData.criminalRecordCertificate}
                  description="PDF, JPEG, or PNG up to 5MB"
                  onChange={handleFileChange}
                  required
                />
              )}
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
                required={!isVeterinaryForm}
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">
              Emergency Contacts
              {isVeterinaryForm && (
                <span className="ml-1 text-sm font-normal text-gray-500">(optional)</span>
              )}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Input
                label="Full Name"
                name="emergencyContact1Name"
                placeholder="Contact name"
                value={formData.emergencyContact1Name}
                onChange={handleInputChange}
                error={errors.emergencyContact1Name}
                required={!isVeterinaryForm}
              />
              <Input
                label="Phone Number"
                type="tel"
                name="emergencyContact1PhoneNumber"
                placeholder="2507XXXXXXXX"
                value={formData.emergencyContact1PhoneNumber}
                onChange={handleInputChange}
                error={errors.emergencyContact1PhoneNumber}
                required={!isVeterinaryForm}
              />
              <div>
                <label className="block text-sm font-medium mb-1">
                  Relationship
                  {!isVeterinaryForm && <span className="text-red-500"> *</span>}
                </label>
                <select
                  name="emergencyContact1Relationship"
                  value={formData.emergencyContact1Relationship}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Full Name"
                name="emergencyContact2Name"
                placeholder="Contact name"
                value={formData.emergencyContact2Name}
                onChange={handleInputChange}
                error={errors.emergencyContact2Name}
                required={!isVeterinaryForm}
              />
              <Input
                label="Phone Number"
                type="tel"
                name="emergencyContact2PhoneNumber"
                placeholder="2507XXXXXXXX"
                value={formData.emergencyContact2PhoneNumber}
                onChange={handleInputChange}
                error={errors.emergencyContact2PhoneNumber}
                required={!isVeterinaryForm}
              />
              <div>
                <label className="block text-sm font-medium mb-1">
                  Relationship
                  {!isVeterinaryForm && <span className="text-red-500"> *</span>}
                </label>
                <select
                  name="emergencyContact2Relationship"
                  value={formData.emergencyContact2Relationship}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
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
              ) : submitLabel}
            </Button>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};