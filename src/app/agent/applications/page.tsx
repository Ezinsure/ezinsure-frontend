'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { useAuth } from '@/context/AuthContext';
import { useApiClient } from '@/utils/apiClient';
import { FileInput } from '@/components/ui/file-input';
import { rwandaProvinces } from '@/utils/rwanda-administrative';
import { formatDateUTC, formatDateForExcel as formatDateForExcelUtil, formatTime } from '@/utils/date-formatter';
import { carTypes, motoTypes, carUses, motoUses } from '@/utils/vehicle-types';
import { validateInsuranceDuration, normalizeInsuranceDurationPayload } from '@/utils/insurance-duration';
import { InsuranceDurationField } from '@/components/ui/insurance-duration-field';
import { ComesaCheckboxField } from '@/components/ui/comesa-checkbox-field';
import { NumericInputField } from '@/components/ui/numeric-input-field';
import { isMotorVehicleInsuranceCategory } from '@/utils/administration-fees';
import {
  getVehicleManufactureYearBounds,
  getVehicleManufactureYearValidationError,
} from '@/utils/vehicle-year';
import {
  matchesPerformedByFilter,
  performedByFilterLabel,
  type PerformedByFilter,
} from '@/utils/application-performed-by-filter';
import { formatPoliceNumberDisplay, formatPoliceNumberForExport } from '@/utils/police-number';
import { formatChasisNumberDisplay } from '@/utils/chasis-number';

interface Application {
  _id: string;
  applicationNumber: string;
  insuranceCategory: string;
  insuranceType: string;
  insuranceDuration: string;
  status: string;
  invoice?: string;
  insuranceCertificate?: string;
  proofOfPayment?: string;
  paymentInstructions?: string;
  transactionId?: string;
  policeNumber?: string;
  amount?: number;
  netPremium?: number;
  companyCommission?: number;
  agentCommission?: number;
  agentCommissionPaymentStatus?: 'PENDING' | 'PENDING_ADMIN_REVIEW' | 'READY_TO_BE_PAID' | 'PAID' | 'ON_HOLD' | 'PAYMENT_INITIATED';
  administrationFees?: string;
  insuranceProvider?: string;
  ebm?: string;
  contract?: string;
  receipt?: string;
  submittedAt: string;
  agent?: {
    _id: string;
    fullName: string;
  } | null;
  admin?: {
    _id: string;
    fullName: string;
  } | null;
  client: {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    address: string;
    nationalID: string;
    identificationDocumentType: string;
    identificationNumber: string;
    province: string;
    district: string;
    sector: string;
    createdAt: string;
  };
  vehicle?: {
    _id: string;
    clientId: string;
    vehicleType: string;
    vehicleAge: string;
    plateNumber?: string;
    chasisNumber?: string;
    vehicleUse: string;
    otherVehicleUse?: string;
    createdAt: string;
  };
  // Legacy fields for backward compatibility
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  province?: string;
  district?: string;
  sector?: string;
  isCOMESA?: boolean;
  vehicleUse?: string;
  otherVehicleUse?: string;
  vehicleType?: string;
  vehicleAge?: string;
  plateNumber?: string;
  chasisNumber?: string;
  nationalID?: string;
  identificationDocumentType?: string;
  identificationNumber?: string;
  yellowCard?: string;
  pastInsuranceCertificate?: string;
  invoiceId?: string;
  invoiceAmount?: string;
  rejectionReason?: string;
  reasonForPaymentRejection?: string;
  agentId?: string;
  agentFullName?: string;
  createdAt?: string;
  insuranceEndAt?: string;
  otp?: string;
  otpExpires?: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type ModalType = 'view-details' | 'upload-payment' | 'edit-application' | 'none';

const EditApplicationModal = ({ 
  isOpen, 
  onClose, 
  application,
  onSave,
  isLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  application: Application;
  onSave: () => void;
  isLoading: boolean;
}) => {
  const vehicleYearBounds = useMemo(() => getVehicleManufactureYearBounds(), []);
  // Determine if this is a payment rejection case
  const isPaymentRejection = application.status === 'WAITING_FOR_USER_ACTION' && 
                           (application.reasonForPaymentRejection);

const [formState, setFormState] = useState<Partial<Application>>(() => {
  if (isPaymentRejection) {
    return {}; // Empty state for payment rejection case
  }
  
  // Parse vehicle use to handle different formats
  let vehicleUse = application.vehicle?.vehicleUse || application.vehicleUse || '';
  let otherVehicleUse = application.vehicle?.otherVehicleUse || application.otherVehicleUse || '';
  
  // Handle "Other - [description]" format (only for truly custom "Other" entries)
  if (vehicleUse.startsWith('Other - ') && !vehicleUse.includes('Commercial - ') && !vehicleUse.includes('Private - ') && !vehicleUse.includes('PSV / TAXI - ')) {
    otherVehicleUse = vehicleUse.substring(8); // Remove "Other - " prefix
    vehicleUse = 'Other';
  }
  // For all other cases, keep the original value as it matches the dropdown options
  
  return {
    // Client information - use nested client object or fallback to legacy fields
    fullName: application.client?.fullName || application.fullName,
    email: application.client?.email || application.email,
    phoneNumber: application.client?.phoneNumber || application.phoneNumber,
    address: application.client?.address || application.address,
    dateOfBirth: application.client?.dateOfBirth || application.dateOfBirth,
    province: application.client?.province || application.province,
    district: application.client?.district || application.district,
    sector: application.client?.sector || application.sector || '',
    nationalID: application.client?.nationalID || application.nationalID,
    identificationDocumentType: (application.client?.identificationDocumentType || 'nationalID') as string,
    identificationNumber: (application.client?.identificationNumber || '') as string,
    
    // Insurance information
    insuranceCategory: application.insuranceCategory,
    insuranceType: application.insuranceType,
    insuranceDuration: application.insuranceDuration,
    insuranceProvider: application.insuranceProvider,
    
    // Vehicle information - use nested vehicle object or fallback to legacy fields
    vehicleType: application.vehicle?.vehicleType || application.vehicleType,
    vehicleAge: application.vehicle?.vehicleAge || application.vehicleAge,
    plateNumber: (application.vehicle?.plateNumber || application.plateNumber || '') as string,
    chasisNumber: (application.chasisNumber || application.vehicle?.chasisNumber || '') as string,
    vehicleUse: vehicleUse,
    otherVehicleUse: otherVehicleUse,
    isCOMESA: application.isCOMESA,
  };
});

  const [files, setFiles] = useState<Record<string, File | null>>({
    nationalID: null,
    yellowCard: null,
    pastInsuranceCertificate: null,
    proofOfPayment: null, // Added for payment rejection case
  });
  const [fileResetTrigger, setFileResetTrigger] = useState(0);

  // Update files state when application changes (for prefilling existing documents)
  useEffect(() => {
    if (!isPaymentRejection) {
      setFiles({
        nationalID: null, // Keep as null since we're not uploading new files initially
        yellowCard: null,
        pastInsuranceCertificate: null,
        proofOfPayment: null,
      });
      
      // Clear any existing errors when switching applications
      setErrors({});
    }
  }, [application, isPaymentRejection]);

  const [availableDistricts, setAvailableDistricts] = useState<{name: string, sectors?: string[]}[]>([]);
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const [transactionId, setTransactionId] = useState(''); // Added for payment rejection case
  const allowedFileTypes = useMemo(
    () => ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    []
  );
  const fileExtensionPattern = useMemo(() => /\.(jpe?g|png|pdf)$/i, []);

  // Update form state when application changes (for prefilling)
  useEffect(() => {
    if (!isPaymentRejection) {
      // Parse vehicle use to handle different formats
      let vehicleUse = application.vehicle?.vehicleUse || application.vehicleUse || '';
      let otherVehicleUse = application.vehicle?.otherVehicleUse || application.otherVehicleUse || '';
      
      // Handle "Other - [description]" format (only for truly custom "Other" entries)
      if (vehicleUse.startsWith('Other - ') && !vehicleUse.includes('Commercial - ') && !vehicleUse.includes('Private - ') && !vehicleUse.includes('PSV / TAXI - ')) {
        otherVehicleUse = vehicleUse.substring(8); // Remove "Other - " prefix
        vehicleUse = 'Other';
      }
      // For all other cases, keep the original value as it matches the dropdown options
      
      setFormState({
        // Client information - use nested client object or fallback to legacy fields
        fullName: application.client?.fullName || application.fullName,
        email: application.client?.email || application.email,
        phoneNumber: application.client?.phoneNumber || application.phoneNumber,
        address: application.client?.address || application.address,
        dateOfBirth: application.client?.dateOfBirth || application.dateOfBirth,
        province: application.client?.province || application.province,
        district: application.client?.district || application.district,
        sector: application.client?.sector || application.sector,
        nationalID: application.client?.nationalID || application.nationalID,
        identificationDocumentType: (application.client?.identificationDocumentType || 'nationalID') as string,
        identificationNumber: (application.client?.identificationNumber || '') as string,
        
        // Insurance information
        insuranceCategory: application.insuranceCategory,
        insuranceType: application.insuranceType,
        insuranceDuration: application.insuranceDuration,
        insuranceProvider: application.insuranceProvider,
        
        // Vehicle information - use nested vehicle object or fallback to legacy fields
        vehicleType: application.vehicle?.vehicleType || application.vehicleType,
        vehicleAge: application.vehicle?.vehicleAge || application.vehicleAge,
        plateNumber: (application.vehicle?.plateNumber || application.plateNumber || '') as string,
        vehicleUse: vehicleUse,
        otherVehicleUse: otherVehicleUse,
        isCOMESA: application.isCOMESA,
      });
    }
  }, [application, isPaymentRejection]);

  // Initialize districts and sectors when component mounts or application changes
  useEffect(() => {
    if (!isPaymentRejection) {
      const province = application.client?.province || application.province;
      const district = application.client?.district || application.district;
      
      if (province) {
        const selectedProvince = rwandaProvinces.find(p => p.name === province);
        const districts = selectedProvince?.districts || [];
        // Transform districts to match expected format
        const transformedDistricts = districts.map(district => ({
          name: district.name,
          sectors: district.sectors?.map(sector => sector.name) || []
        }));
        setAvailableDistricts(transformedDistricts);
        
        if (district) {
          const selectedDistrict = transformedDistricts.find(d => d.name === district);
          const sectors = selectedDistrict?.sectors || [];
          setAvailableSectors(sectors);
        }
      }
    }
  }, [application.client?.province, application.client?.district, application.province, application.district, isPaymentRejection]);

  // Update districts when province changes (only for regular edit mode)
  useEffect(() => {
    if (formState.province && formState.province !== application.province) {
      const selectedProvince = rwandaProvinces.find(p => p.name === formState.province);
      const districts = selectedProvince?.districts || [];
      // Transform districts to match expected format with sector names as strings
      const transformedDistricts = districts.map(district => ({
        name: district.name,
        sectors: district.sectors?.map(sector => sector.name) || []
      }));
      setAvailableDistricts(transformedDistricts);
      
      // Only clear district and sector if the current district is not in the new province
      if (!transformedDistricts.some(d => d.name === formState.district)) {
        setFormState(prev => ({ ...prev, district: '', sector: '' }));
      }
    }
  }, [formState.province, application.province]);

  // Update sectors when district changes (only for regular edit mode)
  useEffect(() => {
    if (!isPaymentRejection && formState.district && formState.district !== application.district) {
      const selectedDistrict = availableDistricts.find(d => d.name === formState.district);
      const sectors = selectedDistrict?.sectors || [];
      setAvailableSectors(sectors);
      
      // Only clear sector if the current sector is not in the new district
      if (formState.sector && !sectors.includes(formState.sector)) {
        setFormState(prev => ({ ...prev, sector: '' }));
      }
    }
  }, [formState.district, availableDistricts, isPaymentRejection, application.district]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (name: string) => (file: File | null) => {
    if (file) {
      const mimeType = file.type?.toLowerCase();
      const fileName = file.name?.toLowerCase();
      const isAllowed =
        (mimeType && allowedFileTypes.includes(mimeType)) ||
        (!mimeType && fileExtensionPattern.test(fileName || ''));

      if (!isAllowed) {
        const message = 'Unsupported file type. Please upload JPG, JPEG, PNG or PDF.';
        setErrors(prev => ({ ...prev, [name]: message }));
        showToast(message, 'error');
        setFileResetTrigger(prev => prev + 1);
        return;
      }
    }

    setFiles(prev => ({ ...prev, [name]: file }));

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      
      if (isPaymentRejection) {
        // Payment rejection case - only submit proof of payment and transaction ID
        if (!files.proofOfPayment || !transactionId) {
          throw new Error('Please upload proof of payment and enter transaction ID');
        }
  
        formData.append('proofOfPayment', files.proofOfPayment);
        formData.append('transactionId', transactionId);
  
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/sendProofofPayment/${application._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
          credentials: 'include'
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to submit payment proof');
        }
      } else {
        const durErr = validateInsuranceDuration(formState.insuranceDuration || '');
        if (durErr) {
          setErrors((prev) => ({ ...prev, insuranceDuration: durErr }));
          setIsSubmitting(false);
          return;
        }

        if (isMotorVehicleInsuranceCategory(formState.insuranceCategory || '')) {
          const va = (formState.vehicleAge || '').trim();
          if (!va) {
            setErrors((prev) => ({ ...prev, vehicleAge: 'This field is required' }));
            setIsSubmitting(false);
            return;
          }
          const yearErr = getVehicleManufactureYearValidationError(va);
          if (yearErr) {
            setErrors((prev) => ({ ...prev, vehicleAge: yearErr }));
            setIsSubmitting(false);
            return;
          }
        }

        // Regular edit case - submit all changed fields
        const updatedData: Record<string, string | number | boolean | Date> = {};
        
        Object.entries(formState).forEach(([key, value]) => {
          // Skip vehicleUse, otherVehicleUse, isCOMESA, and agent as they are handled separately
          if (key === 'vehicleUse' || key === 'otherVehicleUse' || key === 'isCOMESA' || key === 'agent') {
            return;
          }
          
          // Get original value from nested objects or legacy fields
          let originalValue: unknown;
          if (key === 'fullName' || key === 'email' || key === 'phoneNumber' || key === 'address' || 
              key === 'dateOfBirth' || key === 'province' || key === 'district' || key === 'sector' ||
              key === 'nationalID' || key === 'identificationDocumentType' || key === 'identificationNumber') {
            // Client fields - check nested client object first
            originalValue = application.client?.[key as keyof typeof application.client] || application[key as keyof Application];
          } else if (key === 'vehicleType' || key === 'vehicleAge' || key === 'plateNumber' || key === 'chasisNumber') {
            // Vehicle fields - check nested vehicle object first
            originalValue = application.vehicle?.[key as keyof typeof application.vehicle] || application[key as keyof Application];
          } else {
            // Other fields
            originalValue = application[key as keyof Application];
          }
          
          if (value !== undefined && value !== originalValue && value !== '') {
            let formattedValue: string | boolean | undefined = value as string | boolean | undefined;
            if (key === 'dateOfBirth' && value) {
              formattedValue = new Date(value as string).toISOString().split('T')[0];
            } else if (key === 'insuranceDuration' && typeof value === 'string') {
              formattedValue = normalizeInsuranceDurationPayload(value);
            }

            formData.append(key, formattedValue as string);
            // Only assign if it's a primitive value
            if (typeof formattedValue === 'string' || typeof formattedValue === 'number' || typeof formattedValue === 'boolean') {
              updatedData[key] = formattedValue;
            }
          }
        });
  
        // Handle COMESA status
        if (formState.isCOMESA !== undefined && formState.isCOMESA !== application.isCOMESA) {
          formData.append('isCOMESA', formState.isCOMESA.toString());
          updatedData.isCOMESA = formState.isCOMESA;
        }
  
        // Handle vehicle use with "Other" option
        const currentVehicleUse = application.vehicleUse || '';
        const newVehicleUse = formState.vehicleUse === 'Other' 
          ? `Other - ${formState.otherVehicleUse || ''}`
          : formState.vehicleUse;
        
        if (formState.vehicleUse !== undefined && newVehicleUse !== currentVehicleUse && newVehicleUse !== undefined) {
          formData.append('vehicleUse', newVehicleUse);
          updatedData.vehicleUse = newVehicleUse;
        }
  
        Object.entries(files).forEach(([key, file]) => {
          if (file) {
            formData.append(key, file);
          }
        });
  
        // If no fields were changed, show a message and return
        if (Object.keys(updatedData).length === 0 && Object.values(files).every(file => !file)) {
          showToast('No changes were made to the application', 'info');
          return;
        }
  
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/updateInsuranceApplication/${application._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
          credentials: 'include'
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update application');
        }
      }
  
      showToast('Application updated successfully!', 'success');
      onSave();
      onClose();
    } catch (error) {
      console.error('Submission error:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to update application',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {isPaymentRejection ? 'Upload Proof of Payment' : 'Edit Application'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isPaymentRejection && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Rejection Reason</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{application.reasonForPaymentRejection || application.rejectionReason}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isPaymentRejection ? (
              <div className="space-y-6">
                <Input
                  label="Transaction ID"
                  name="transactionId"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  error={errors.transactionId}
                  required
                />
                <FileInput
                  label="Proof of Payment"
                  name="proofOfPayment"
                  onChange={handleFileChange('proofOfPayment')}
                  error={errors.proofOfPayment}
                  accept=".jpg,.jpeg,.png,.pdf"
                  currentFile={application.proofOfPayment?.split('/').pop()}
                  required
                  resetTrigger={fileResetTrigger}
                />
              </div>
            ) : (
              <>
                {/* Personal Information Section */}
                <fieldset className="mb-8 border-2 border-[var(--main-blue)] rounded-lg p-6 bg-gray-50">
                  <legend className="text-lg font-semibold text-[var(--main-blue)] px-3 bg-white border border-[var(--main-blue)] rounded-md">
                    Personal Information
                  </legend>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Identification Document Type */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Identification Document Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="identificationDocumentType"
                        value={formState.identificationDocumentType || 'nationalID'}
                        onChange={handleInputChange}
                        className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      >
                        <option value="nationalID">National ID</option>
                        <option value="passport">Passport</option>
                        <option value="drivingLicense">Driving License</option>
                      </select>
                      {errors.identificationDocumentType && (
                        <p className="mt-1 text-sm text-red-600">{errors.identificationDocumentType}</p>
                      )}
                    </div>

                    <Input
                      label="Identification Number"
                      name="identificationNumber"
                      value={formState.identificationNumber || ''}
                      onChange={handleInputChange}
                      error={errors.identificationNumber}
                      placeholder="e.g., 1234567890123456"
                    />

                    <Input
                      label="Full Name"
                      name="fullName"
                      value={formState.fullName || ''}
                      onChange={handleInputChange}
                      error={errors.fullName}
                      placeholder="Jean Claude Niyonzima"
                    />

                    <Input
                      label="Email Address"
                      type="email"
                      name="email"
                      value={formState.email || ''}
                      onChange={handleInputChange}
                      error={errors.email}
                      placeholder="johndoe@example.com"
                    />

                    <Input
                      label="Phone Number"
                      name="phoneNumber"
                      value={formState.phoneNumber || ''}
                      onChange={handleInputChange}
                      error={errors.phoneNumber}
                    />

                    <Input
                      label="Date of Birth"
                      type="date"
                      name="dateOfBirth"
                      value={formState.dateOfBirth ? new Date(formState.dateOfBirth).toISOString().split('T')[0] : ''}
                      onChange={handleInputChange}
                      error={errors.dateOfBirth}
                    />

                    <Input
                      label="Address"
                      name="address"
                      value={formState.address || ''}
                      onChange={handleInputChange}
                      error={errors.address}
                      placeholder="eg: KN 5 RD, Kigali - Rwanda"
                    />

                    {/* Province Select */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Province <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="province"
                        value={formState.province || ''}
                        onChange={handleInputChange}
                        className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      >
                        <option value="">Select Province</option>
                        {rwandaProvinces.map(province => (
                          <option key={province.name} value={province.name}>{province.name}</option>
                        ))}
                      </select>
                      {errors.province && (
                        <p className="mt-1 text-sm text-red-600">{errors.province}</p>
                      )}
                    </div>

                    {/* District Select */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        District <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="district"
                        value={formState.district || ''}
                        onChange={handleInputChange}
                        disabled={!formState.province}
                        className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Select District</option>
                        {availableDistricts.map(district => (
                          <option key={district.name} value={district.name}>{district.name}</option>
                        ))}
                      </select>
                      {errors.district && (
                        <p className="mt-1 text-sm text-red-600">{errors.district}</p>
                      )}
                    </div>

                    {/* Sector Select */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Sector <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="sector"
                        value={formState.sector || ''}
                        onChange={handleInputChange}
                        disabled={!formState.district}
                        className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Sector</option>
                        {availableSectors.map(sector => (
                          <option key={sector} value={sector}>{sector}</option>
                        ))}
                      </select>
                      {errors.sector && (
                        <p className="mt-1 text-sm text-red-600">{errors.sector}</p>
                      )}
                    </div>
                  </div>
                </fieldset>

                {/* Insurance Information Section */}
                <fieldset className="mb-8 border-2 border-[var(--main-blue)] rounded-lg p-6 bg-gray-50">
                  <legend className="text-lg font-semibold text-[var(--main-blue)] px-3 bg-white border border-[var(--main-blue)] rounded-md">
                    Insurance Information
                  </legend>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Insurance Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="insuranceCategory"
                        value={formState.insuranceCategory || ''}
                        onChange={handleInputChange}
                        className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      >
                        <option value="Car Insurance">Car Insurance</option>
                        <option value="Motorbike Insurance">Motorbike Insurance</option>
                        <option value="Building Insurance">Building Insurance</option>
                        <option value="Travel Insurance">Travel Insurance</option>
                        <option value="Health Insurance">Health Insurance</option>
                        <option value="Fire Insurance Coverage">Fire Insurance Coverage</option>
                      </select>
                      {errors.insuranceCategory && (
                        <p className="mt-1 text-sm text-red-600">{errors.insuranceCategory}</p>
                      )}
                    </div>

                    {/* Plate Number Field - Only for Car/Motorbike */}
                    {(formState.insuranceCategory === 'Car Insurance' || formState.insuranceCategory === 'Motorbike Insurance') && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Plate Number
                        </label>
                        <input
                          type="text"
                          name="plateNumber"
                          value={formState.plateNumber || ''}
                          onChange={handleInputChange}
                          placeholder="e.g., RAB 123A"
                          className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                        />
                        {errors.plateNumber && (
                          <p className="mt-1 text-sm text-red-600">{errors.plateNumber}</p>
                        )}
                      </div>
                    )}

                    {/* Insurance Provider */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Insurance Provider <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="insuranceProvider"
                        value={formState.insuranceProvider || 'SONARWA'}
                        onChange={handleInputChange}
                        className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      >
                        <option value="SONARWA">SONARWA</option>
                      </select>
                      {errors.insuranceProvider && (
                        <p className="mt-1 text-sm text-red-600">{errors.insuranceProvider}</p>
                      )}
                    </div>

                    {(formState.insuranceCategory === 'Car Insurance' || formState.insuranceCategory === 'Motorbike Insurance') && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Chassis number</label>
                        <input
                          type="text"
                          name="chasisNumber"
                          value={formState.chasisNumber || ''}
                          onChange={handleInputChange}
                          placeholder="Enter vehicle chassis"
                          className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                        />
                      </div>
                    )}

                    {/* Vehicle Type (only shown for car/motorbike insurance) */}
                    {(formState.insuranceCategory === 'Car Insurance' || formState.insuranceCategory === 'Motorbike Insurance') && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Vehicle Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="vehicleType"
                          value={formState.vehicleType || ''}
                          onChange={handleInputChange}
                          className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                        >
                          <option value="">Select Vehicle Type</option>
                          {formState.insuranceCategory === 'Car Insurance' ? (
                            carTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))
                          ) : (
                            motoTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))
                          )}
                        </select>
                        {errors.vehicleType && (
                          <p className="mt-1 text-sm text-red-600">{errors.vehicleType}</p>
                        )}
                      </div>
                    )}

                    {/* Vehicle Year (only shown for car/motorbike insurance) */}
                    {(formState.insuranceCategory === 'Car Insurance' || formState.insuranceCategory === 'Motorbike Insurance') && (
                      <div>
                        <NumericInputField
                          label="Vehicle Year"
                          name="vehicleAge"
                          size="form"
                          placeholder="e.g. 2020"
                          value={formState.vehicleAge || ''}
                          onChange={(v) => {
                            setFormState((prev) => ({ ...prev, vehicleAge: v }));
                            if (errors.vehicleAge) {
                              setErrors((prev) => {
                                const next = { ...prev };
                                delete next.vehicleAge;
                                return next;
                              });
                            }
                          }}
                          min={vehicleYearBounds.minYear}
                          max={vehicleYearBounds.maxYear}
                          maxDigits={4}
                          error={errors.vehicleAge}
                          required
                          className="mb-0"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Insurance Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="insuranceType"
                        value={formState.insuranceType || ''}
                        onChange={handleInputChange}
                        className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      >
                        <option value="Comprehensive Insurance (covers everything)">Comprehensive Insurance</option>
                        <option value="Third Party Insurance (covers partial)">Third Party Insurance</option>
                      </select>
                      {errors.insuranceType && (
                        <p className="mt-1 text-sm text-red-600">{errors.insuranceType}</p>
                      )}
                    </div>

                    <div>
                      <InsuranceDurationField
                        id="insuranceDuration"
                        topLabel="Insurance duration"
                        value={formState.insuranceDuration || ''}
                        onChange={(next) => {
                          setFormState((prev) => ({ ...prev, insuranceDuration: next }));
                          if (errors.insuranceDuration) {
                            setErrors((prev) => {
                              const nextErr = { ...prev };
                              delete nextErr.insuranceDuration;
                              return nextErr;
                            });
                          }
                        }}
                        error={errors.insuranceDuration}
                        required
                      />
                    </div>

                    {/* Vehicle Use (only shown for car/motorbike insurance) */}
                    {(formState.insuranceCategory === 'Car Insurance' || formState.insuranceCategory === 'Motorbike Insurance') && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Vehicle Use <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="vehicleUse"
                          value={formState.vehicleUse || ''}
                          onChange={handleInputChange}
                          className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                        >
                          <option value="">Select Vehicle Use</option>
                          {formState.insuranceCategory === 'Car Insurance' ? (
                            carUses.map(use => (
                              <option key={use} value={use}>{use}</option>
                            ))
                          ) : (
                            motoUses.map(use => (
                              <option key={use} value={use}>{use}</option>
                            ))
                          )}
                        </select>
                        {errors.vehicleUse && (
                          <p className="mt-1 text-sm text-red-600">{errors.vehicleUse}</p>
                        )}
                      </div>
                    )}

                    {/* Other Vehicle Use */}
                    {formState.vehicleUse === 'Other' && (
                      <div className="md:col-span-2">
                        <Input
                          label="Specify Vehicle Use"
                          name="otherVehicleUse"
                          value={formState.otherVehicleUse || ''}
                          onChange={handleInputChange}
                          error={errors.otherVehicleUse}
                          required
                        />
                      </div>
                    )}

                    {/* COMESA Coverage */}
                    {(formState.insuranceCategory === 'Car Insurance' || formState.insuranceCategory === 'Motorbike Insurance') && (
                      <div className="md:col-span-2">
                        <ComesaCheckboxField
                          checked={Boolean(formState.isCOMESA)}
                          onChange={(checked) =>
                            setFormState((prev) => ({ ...prev, isCOMESA: checked }))
                          }
                          insuranceCategory={formState.insuranceCategory || ''}
                          variant="compact"
                          label="COMESA Coverage"
                        />
                      </div>
                    )}
                  </div>
                </fieldset>

                {/* Documents Section */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Required Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FileInput
                      label="National ID Card / Passport / Driving License"
                      name="nationalID"
                      onChange={handleFileChange('nationalID')}
                      error={errors.nationalID}
                      accept=".jpg,.jpeg,.png,.pdf"
                      currentFile={application.nationalID?.split('/').pop()}
                      resetTrigger={fileResetTrigger}
                    />

                    <FileInput
                      label="Yellow Card"
                      name="yellowCard"
                      onChange={handleFileChange('yellowCard')}
                      error={errors.yellowCard}
                      accept=".jpg,.jpeg,.png,.pdf"
                      currentFile={application.yellowCard?.split('/').pop()}
                      resetTrigger={fileResetTrigger}
                    />

                    <FileInput
                      label="Past Insurance Certificate (Optional)"
                      name="pastInsuranceCertificate"
                      onChange={handleFileChange('pastInsuranceCertificate')}
                      accept=".jpg,.jpeg,.png,.pdf"
                      currentFile={application.pastInsuranceCertificate?.split('/').pop()}
                      resetTrigger={fileResetTrigger}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="mt-8 flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function AgentApplicationsPage() {
  const { showToast, ToastContainer } = useToast();
  const { token, user } = useAuth();
  const { apiFetch } = useApiClient();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofError, setPaymentProofError] = useState<string | null>(null);
  const [paymentProofResetTrigger, setPaymentProofResetTrigger] = useState(0);
  const [transactionId, setTransactionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPerformedBy, setSelectedPerformedBy] = useState<PerformedByFilter>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [viewingDocument, setViewingDocument] = useState<{
    name: string;
    path: string;
  } | null>(null);
  // const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const itemsPerPage = 10;
  const [activeModal, setActiveModal] = useState<ModalType>('none');

  const allowedPaymentTypes = useMemo(
    () => ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    []
  );
  const paymentExtensionPattern = useMemo(() => /\.(jpe?g|png|pdf)$/i, []);

  // Helper functions for date filtering
  const handlePaymentProofChange = (file: File | null) => {
    if (file) {
      const mimeType = file.type?.toLowerCase();
      const fileName = file.name?.toLowerCase();
      const isAllowed =
        (mimeType && allowedPaymentTypes.includes(mimeType)) ||
        (!mimeType && paymentExtensionPattern.test(fileName || ''));

      if (!isAllowed) {
        const message = 'Unsupported file type. Please upload JPG, JPEG, PNG or PDF.';
        setPaymentProofError(message);
        showToast(message, 'error');
        setPaymentProof(null);
        setPaymentProofResetTrigger(prev => prev + 1);
        return;
      }
    }

    setPaymentProof(file);
    setPaymentProofError(null);
  };
  const getFirstDayOfMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  };

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Set default date range to current month
  useEffect(() => {
    setStartDate(getFirstDayOfMonth());
    setEndDate(getCurrentDate());
  }, []);

  // Start animation immediately when table is shown (regardless of data)
  useEffect(() => {
    if (!isLoading) {
      // Start animation immediately when table is shown
      setShowScrollHint(true);
      
      // Hide after animation completes (40 seconds)
      const timer = setTimeout(() => {
        setShowScrollHint(false);
      }, 40000); // 40 seconds total single flow

      return () => clearTimeout(timer);
    } else {
      // Hide during loading
      setShowScrollHint(false);
    }
  }, [isLoading]);

  // Handle table scroll to show/hide fade indicators
  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    
    // Show left fade if scrolled past the beginning
    setShowLeftFade(scrollLeft > 0);
    
    // Show right fade if there's more content to scroll
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const fetchApplications = useCallback(async (signal?: AbortSignal) => {
    if (!token || !user?._id) return;
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ agentId: user._id });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await apiFetch(`/getApplicationsByAgent?${params.toString()}`, {
        method: 'GET',
        ...(signal && { signal }),
      });

      const data = await response.json();

      const sortedApplications = (data.data || []).sort((a: Application, b: Application) => {
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });
      setApplications(sortedApplications);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Error fetching applications:', error);
      showToast('Failed to load applications', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [token, user?._id, startDate, endDate, showToast]);

  useEffect(() => {
    if (!token || !user?._id) return;
    const controller = new AbortController();
    fetchApplications(controller.signal);
    return () => controller.abort();
  }, [token, user?._id, startDate, endDate, fetchApplications]);

  // Filter applications based on search query, status, and date range
  const filteredApplications = applications.filter(app => {
    // Only search fields that have meaningful data
    const searchableFields = [];
    
    // Search in client object (new structure) or legacy fields
    const clientName = app.client?.fullName || app.fullName;
    const clientEmail = app.client?.email || app.email;
    
    if (clientName && clientName.trim()) {
      searchableFields.push(clientName.toLowerCase());
    }
    if (clientEmail && clientEmail.trim()) {
      searchableFields.push(clientEmail.toLowerCase());
    }
    if (app.applicationNumber && app.applicationNumber.trim()) {
      searchableFields.push(app.applicationNumber.toLowerCase());
    }
    
    const matchesSearch = searchQuery === '' || searchableFields.some(field => 
      field.includes(searchQuery.toLowerCase())
    );
    
    const matchesStatus = selectedStatus === 'all' || (app.status && app.status.toLowerCase() === selectedStatus);
    
    const matchesDateRange = (() => {
      if (!startDate && !endDate) return true;
      
      if (!app.submittedAt) return false; // Skip applications without submission date
      
      // Normalize dates to remove time components for accurate date comparison

      const appDate = new Date(app.submittedAt);
      const appDateOnly = new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate());
      
      const start = startDate ? new Date(startDate + 'T00:00:00') : null;
      const end = endDate ? new Date(endDate + 'T23:59:59') : null; // Set to end of day
      
      if (start && end) {
        return appDateOnly >= start && appDateOnly <= end;
      } else if (start) {
        return appDateOnly >= start;
      } else if (end) {
        return appDateOnly <= end;
      }
      return true;
    })();
    
    return matchesSearch && matchesStatus && matchesDateRange && matchesPerformedByFilter(app, selectedPerformedBy);
  });

  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: string) => {
    switch (filterType) {
      case 'search':
        setSearchQuery(value);
        break;
      case 'status':
        setSelectedStatus(value);
        break;
      case 'performedBy':
        setSelectedPerformedBy(value as PerformedByFilter);
        break;
      case 'startDate':
        setStartDate(value);
        break;
      case 'endDate':
        setEndDate(value);
        break;
    }
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle clearing all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedPerformedBy('all');
    setStartDate(getFirstDayOfMonth());
    setEndDate(getCurrentDate());
    setCurrentPage(1);
  };

  // PDF Download Function
  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = await import('jspdf-autotable');
      
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const currentDate = formatDateUTC(new Date().toISOString());
      const currentTime = formatTime(new Date().toISOString());
      
                // Add title
          doc.setFontSize(20);
          doc.setTextColor(10, 37, 64); // Dark blue color
          doc.text('Ezinsure Applications Report', 14, 20);
      
      // Add subtitle with date and time
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${currentDate} at ${currentTime}`, 14, 30);
      
      // Add filter information
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      let filterY = 40;
      
      if (searchQuery) {
        doc.text(`Search Query: ${searchQuery}`, 14, filterY);
        filterY += 6;
      }
      
      if (selectedStatus !== 'all') {
        doc.text(`Status Filter: ${selectedStatus.replace('_', ' ')}`, 14, filterY);
        filterY += 6;
      }

      if (selectedPerformedBy !== 'all') {
        doc.text(`Performed By: ${performedByFilterLabel(selectedPerformedBy)}`, 14, filterY);
        filterY += 6;
      }
      
      if (startDate || endDate) {
        doc.text(`Date Range: ${startDate || 'beginning'} to ${endDate || 'now'}`, 14, filterY);
        filterY += 6;
      }
      
      // Add summary information
      filterY += 3;
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Total Applications: ${filteredApplications.length}`, 14, filterY);
      filterY += 5;
      
      // Calculate totals
      const totalAmount = filteredApplications.reduce((sum, app) => sum + (app.amount || 0), 0);
      const totalCompanyCommission = filteredApplications.reduce((sum, app) => sum + (app.companyCommission || 0), 0);
      const totalAgentCommission = filteredApplications.reduce((sum, app) => sum + (app.agentCommission || 0), 0);
      
      doc.text(`Total Amount: ${totalAmount.toLocaleString()} RWF`, 14, filterY);
      filterY += 5;
      doc.text(`Total Company Commission: ${totalCompanyCommission.toLocaleString()} RWF`, 14, filterY);
      filterY += 5;
      doc.text(`Total Agent Commission: ${totalAgentCommission.toLocaleString()} RWF`, 14, filterY);
      
      // Prepare table data with text truncation for better fit
      const tableData = filteredApplications.map((app, index) => {
        const clientName = app.client?.fullName || app.fullName || '';
        const clientEmail = app.client?.email || app.email || '';
        const createdBy = app.admin ? `Admin: ${app.admin.fullName}` : 
                         app.agent ? `Agent: ${app.agent.fullName}` : 'Client';
        
        return [
          (index + 1).toString(),
          clientName.length > 28 ? clientName.substring(0, 28) + '...' : clientName,
          clientEmail.length > 32 ? clientEmail.substring(0, 32) + '...' : clientEmail,
          (app.insuranceCategory || '').length > 22 ? (app.insuranceCategory || '').substring(0, 22) + '...' : (app.insuranceCategory || ''),
          (app.insuranceType || '').length > 22 ? (app.insuranceType || '').substring(0, 22) + '...' : (app.insuranceType || ''),
          createdBy.length > 22 ? createdBy.substring(0, 22) + '...' : createdBy,
          app.amount ? `${app.amount.toLocaleString()} RWF` : '0 RWF',
          app.companyCommission ? `${app.companyCommission.toLocaleString()} RWF` : '0 RWF',
          app.agentCommission ? `${app.agentCommission.toLocaleString()} RWF` : '0 RWF',
          formatPoliceNumberDisplay(app),
          formatDate(app.submittedAt),
          (app.status || '').replace('_', ' ').toUpperCase()
        ];
      });
      
      // Add table
      autoTable.default(doc, {
        head: [
          ['#', 'Client Name', 'Email', 'Category', 'Type', 'Performed By', 'Amount', 'Company Comm.', 'Agent Comm.', 'Police Number', 'Date', 'Status']
        ],
        body: tableData,
        startY: filterY + 10,
        styles: {
          fontSize: 7,
          cellPadding: 1,
          overflow: 'linebreak',
          font: 'helvetica',
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          fillColor: false,
          halign: 'left',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [10, 37, 64], // Dark blue header
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' }, // #
          1: { cellWidth: 30, halign: 'left' }, // Name
          2: { cellWidth: 35, halign: 'left' }, // Email
          3: { cellWidth: 25, halign: 'left' }, // Category
          4: { cellWidth: 25, halign: 'left' }, // Type
          5: { cellWidth: 25, halign: 'left' }, // Agent
          6: { cellWidth: 25, halign: 'right' }, // Amount
          7: { cellWidth: 25, halign: 'right' }, // Company Comm
          8: { cellWidth: 25, halign: 'right' }, // Agent Comm
          9: { cellWidth: 22, halign: 'left' }, // Police Number
          10: { cellWidth: 20, halign: 'center' }, // Date
          11: { cellWidth: 25, halign: 'center' }, // Status
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { top: 10, right: 8, bottom: 10, left: 8 },
        pageBreak: 'auto',
        showFoot: 'lastPage',
        didDrawPage: function (data) {
          // Add page numbers
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
        },
      });
      
      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString().replace(/:/g, '-');
      const filename = `insurance_applications_${dateStr}_${timeStr}.pdf`;
      
      // Save the PDF
      doc.save(filename);
      
      showToast('PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF', 'error');
    }
  };

  const handleDownloadExcel = () => {
    if (!filteredApplications.length) {
      showToast('No applications to export', 'info');
      return;
    }

    try {
      // Use utility function for Excel date formatting (handles UTC properly)
      const formatDateForExcel = formatDateForExcelUtil;

      const headers = [
        'Application Number',
        'Client Name',
        'Client Email',
        'Client Phone',
        'Insurance Category',
        'Insurance Type',
        'Duration',
        'Amount (RWF)',
        'Agent Commission (RWF)',
        'Company Commission (RWF)',
        'Payment Status',
        'Status',
        'Police Number',
        'Submitted At',
        'Insurance End Date',
        'Created By',
      ];

      const csvData = filteredApplications.map((app) => {
        const clientName = app.client?.fullName || app.fullName || '';
        const clientEmail = app.client?.email || app.email || '';
        const clientPhone = app.client?.phoneNumber || app.phoneNumber || '';
        const createdBy = app.admin
          ? `Admin: ${app.admin.fullName}`
          : app.agent
          ? `Agent: ${app.agent.fullName}`
          : 'Client';

        return [
          app.applicationNumber || '',
          clientName,
          clientEmail,
          clientPhone,
          app.insuranceCategory || '',
          app.insuranceType || '',
          app.insuranceDuration || '',
          app.amount ? app.amount.toString() : '0',
          app.agentCommission ? app.agentCommission.toString() : '0',
          app.companyCommission ? app.companyCommission.toString() : '0',
          app.agentCommissionPaymentStatus || 'N/A',
          (app.status || '').replace('_', ' '),
          formatPoliceNumberForExport(app),
          formatDateForExcel(app.submittedAt),
          formatDateForExcel(app.insuranceEndAt),
          createdBy,
        ];
      });

      const csvContent = [
        headers.join(','),
        ...csvData.map((row) =>
          row
            .map((cell) => (typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell))
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString().replace(/:/g, '-');
      link.download = `agent_applications_${dateStr}_${timeStr}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Excel file downloaded successfully', 'success');
    } catch (error) {
      console.error('Error generating Excel file:', error);
      showToast('Failed to generate Excel file', 'error');
    }
  };

  // Handle payment proof submission
  const handleSubmitPayment = async () => {
    if (!selectedApp || !paymentProof || !transactionId) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const formData = new FormData();
      formData.append('proofOfPayment', paymentProof);
      formData.append('transactionId', transactionId);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/sendProofofPayment/${selectedApp._id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit payment proof');
      }

      showToast('Payment proof submitted successfully!', 'success');

      // Close modal immediately
      setPaymentProof(null);
      setTransactionId('');
      setSelectedApp(null);
      setActiveModal('none');

      // Refetch applications (shows main table loading)
      await fetchApplications();
    } catch (error) {
      console.error('Error submitting payment proof:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to submit payment proof',
        'error'
      );
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Handle successful edit
const handleEditSuccess = async () => {
  try {
    setIsLoading(true);
    await fetchApplications();
    showToast('Application updated successfully!', 'success');
  } catch (error) {
    console.error('Error refreshing applications:', error);
    showToast('Failed to refresh applications', 'error');
  } finally {
    setIsLoading(false);
  }
};

  // Get payment status badge based on commission payment status
  const getPaymentStatusBadge = (status?: string) => {
    if (!status) {
      return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium flex items-center gap-1 w-fit">Unknown</span>;
    }
    
    switch (status.toUpperCase()) {
      case 'PAID':
        return (
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[12px] font-medium flex items-center gap-1 w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Paid
          </span>
        );
      case 'READY_TO_BE_PAID':
        return (
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[12px] font-medium flex items-center gap-1 w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            Ready to be Paid
          </span>
        );
      case 'PAYMENT_INITIATED':
        return (
          <span className="px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 text-[12px] font-medium flex items-center gap-1 w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Payment Initiated
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-[12px] font-medium flex items-center gap-1 w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Pending
          </span>
        );
      case 'PENDING_ADMIN_REVIEW':
        return (
          <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-[12px] font-medium flex items-center gap-1 w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Pending Admin Review
          </span>
        );
      case 'ON_HOLD':
        return (
          <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-[12px] font-medium flex items-center gap-1 w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            On Hold
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-[12px] font-medium flex items-center gap-1 w-fit">
            {status}
          </span>
        );
    }
  };

  // Get status badge based on application status
  const getStatusBadge = (status: string) => {
    if (!status) {
      return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium">Unknown</span>;
    }
    
    switch (status.toLowerCase()) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-medium">Pending</span>;
      case 'application_approved':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-medium">Approved</span>;
      case 'waiting_for_user_action':
        return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-[11px] font-medium">Action Required</span>;
      case 'invoice_sent':
        return <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-medium">Invoice Sent</span>;
      case 'review_payment':
        return <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-[11px] font-medium">Payment Review</span>;
      case 'payment_verified':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-medium">Payment Verified</span>;
      case 'insurance_issued':
        return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-medium">Insurance Issued</span>;
      case 'cancelled':
        return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">Cancelled</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium">Unknown</span>;
    }
  };

  // Format date for display (using UTC to avoid timezone issues)
  const formatDate = formatDateUTC;

  // Get action buttons based on application status
const getActionButtons = (app: Application) => {
  return (
    <div className="flex space-x-2">
      {/* View Details Button - Always shown */}
      <Button 
        size="xs" 
        variant="text"
        onClick={() => {
          setSelectedApp(app);
          setActiveModal('view-details');
        }}
      >
        View Details
      </Button>

      {/* Status-specific buttons */}
      {app.status && app.status.toLowerCase() === 'waiting_for_user_action' && (
        app.reasonForPaymentRejection ? (
          <Button 
            size="xs" 
            onClick={() => {
              setSelectedApp(app);
              setActiveModal('upload-payment');
            }}
          >
            Upload Payment Proof
          </Button>
        ) : (
          <Button 
            size="xs" 
            onClick={() => {
              setSelectedApp(app);
              // setShowEditModal(true);
              setActiveModal('edit-application');
            }}
          >
            Edit Application
          </Button>
        )
      )}

      {app.status && app.status.toLowerCase() === 'invoice_sent' && (
        <Button 
          size="xs" 
          onClick={() => {
            setSelectedApp(app);
            setActiveModal('upload-payment');
          }}
        >
          Upload Payment
        </Button>
      )}

      {app.status && app.status.toLowerCase() === 'insurance_issued' && (
        <Button 
          size="xs"
          variant="secondary"
          onClick={() => {
            setViewingDocument({
              name: 'Insurance Certificate',
              path: app.insuranceCertificate || ''
            });
          }}
        >
          View Certificate
        </Button>
      )}
    </div>
  );
};

  // Calculate total commission
  const totalCommission = applications.reduce((total, app) => {
    return total + (app.agentCommission || 0);
  }, 0);

  const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-6 p-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * 10, filteredApplications.length)}</span> of{' '}
              <span className="font-medium">{filteredApplications.length}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px " aria-label="Pagination">
              <Button
                variant="text"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="rounded-l-md"
              >
                <span className="sr-only">First</span>
                «
              </Button>
              <Button
                variant="text"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Previous</span>
                ‹
              </Button>
              
              {startPage > 1 && (
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  ...
                </span>
              )}
              
              {pages.map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'primary' : 'text'}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className={currentPage === page ? 'z-10 bg-[var(--main-blue)] border-[var(--main-blue)] text-white' : ''}
                >
                  {page}
                </Button>
              ))}
              
              {endPage < totalPages && (
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  ...
                </span>
              )}
              
              <Button
                variant="text"
                size="sm"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">Next</span>
                ›
              </Button>
              <Button
                variant="text"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="rounded-r-md"
              >
                <span className="sr-only">Last</span>
                »
              </Button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-8">

        <div className="mb-8 mt-16">
          <h1 className="text-3xl font-bold mb-2 fade-in">Client Applications</h1>
          <p className="text-gray-600 slide-up">Track and manage applications for your clients</p>
          
          {/* Commission Summary */}
          <div className="mt-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Commission Earned</p>
                <p className="text-2xl font-bold text-[var(--accent-orange)]">
                  {totalCommission.toLocaleString()} RWF
                </p>
              </div>

              {/* dollar sign */}
              {/* <div className="text-orange-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div> */}
            </div>
          </div>
        </div>

        {/* Search and filter section */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm slide-in-right">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 tracking-wide mb-1 uppercase">Search Applications</label>
              <Input
                label="Search"
                hideLabel
                size="compact"
                className="mb-0"
                name="search"
                placeholder="Search by name, email or ID..."
                value={searchQuery}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                }
              />
            </div>
            
            {/* Status Select */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 tracking-wide mb-1 uppercase">Status Filter</label>
              <select
                value={selectedStatus}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="application_approved">Approved</option>
                <option value="waiting_for_user_action">Action Required</option>
                <option value="invoice_sent">Invoice Sent</option>
                <option value="review_payment">Payment Review</option>
                <option value="payment_verified">Payment Verified</option>
                <option value="insurance_issued">Insurance Issued</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 tracking-wide mb-1 uppercase">Performed By</label>
              <select
                value={selectedPerformedBy}
                onChange={(e) => handleFilterChange('performedBy', e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
                <option value="client">Client</option>
              </select>
            </div>
            
            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 tracking-wide mb-1 uppercase">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* End Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 tracking-wide mb-1 uppercase">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
        {/* Filter Actions */}
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-sm text-gray-500">
            {searchQuery && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">Search: {searchQuery}</span>}
            {selectedStatus !== 'all' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">Status: {selectedStatus.replace('_', ' ')}</span>}
            {selectedPerformedBy !== 'all' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 mr-2">Performed By: {performedByFilterLabel(selectedPerformedBy)}</span>}
            {(startDate || endDate) && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Date Range: {startDate || 'beginning'} - {endDate || 'now'}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredApplications.length > 0 && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadPDF}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10,9 9,9 8,9"></polyline>
                  </svg>
                  Download PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadExcel}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10,9 9,9 8,9"></polyline>
                  </svg>
                  Download Excel
                </Button>
              </>
            )}
            <Button
              variant="text"
              size="sm"
              onClick={handleClearFilters}
              className="text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 px-3 py-1.5"
            >
              Clear All Filters
            </Button>
          </div>
        </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{filteredApplications.length}</span> of <span className="font-medium">{applications.length}</span> applications
              {selectedStatus !== 'all' && (
                <span> with status: <span className="font-medium capitalize">{selectedStatus.replace('_', ' ')}</span></span>
              )}
              {(startDate || endDate) && (
                <span> from <span className="font-medium">{startDate || 'beginning'}</span> to <span className="font-medium">{endDate || 'now'}</span></span>
              )}
            </div>
            {filteredApplications.length > 0 && (
              <div className="text-sm text-gray-500">
                Page {currentPage} of {Math.ceil(filteredApplications.length / itemsPerPage)}
              </div>
            )}
          </div>
        </div>

        {/* Applications table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden fade-in">
          {/* Scroll hint - show when table is displayed and animation hasn't completed */}
          {!isLoading && showScrollHint && (
            <div className="w-screen py-2 bg-blue-50 border-b border-blue-200 overflow-hidden relative">
              {/* Left gradient fade */}
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-blue-50 to-transparent z-10 pointer-events-none"></div>
              
              {/* Right gradient fade */}
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-blue-50 to-transparent z-10 pointer-events-none"></div>
              
              {/* Flowing text */}
              <div className="flex items-center justify-center text-sm text-blue-700">
                <span className="animate-flowing-text">Scroll to the left to view all columns</span>
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[var(--mid-gray)] border-t-[var(--main-blue)]"></div>
              <p className="mt-4 text-gray-600">Loading applications...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-gray-600">No applications found</p>
            </div>
          ) : (
            <div className="relative">
              {/* Left fade indicator */}
              {showLeftFade && (
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-100 via-gray-50/80 to-transparent z-10 pointer-events-none"></div>
              )}
              
              {/* Right fade indicator */}
              {showRightFade && (
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-100 via-gray-50/80 to-transparent z-10 pointer-events-none"></div>
              )}
              
              <div className="overflow-x-auto" onScroll={handleTableScroll}>
                <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">ID</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Client</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Insurance Category</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Insurance End Date</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Date</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Commission</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedApplications.map((app) => (
                    <tr key={app._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-[var(--main-blue)]">
                        #{app.applicationNumber}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {app.client?.fullName || app.fullName || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">{app.client?.phoneNumber || app.phoneNumber || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">
                          {app.insuranceCategory || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(app.insuranceEndAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(app.submittedAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-[var(--accent-orange)]">
                          {app.agentCommission?.toLocaleString() || '0'} RWF
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getPaymentStatusBadge(app.agentCommissionPaymentStatus)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(app.status)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {getActionButtons(app)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredApplications.length / itemsPerPage)}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal for uploading payment proof */}
      {selectedApp && activeModal === 'upload-payment' &&  (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 fade-in">
            <h3 className="text-lg font-semibold mb-4">
              Upload Payment Proof for {selectedApp.client?.fullName || selectedApp.fullName || 'N/A'}
            </h3>
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="font-medium">Invoice Details:</p>
                <div className="mt-2 space-y-1 text-sm">
                  {selectedApp.invoiceId && (
                    <p>
                      <span className="text-gray-600">Invoice ID:</span> {selectedApp.invoiceId}
                    </p>
                  )}
                  {selectedApp.amount && (
                    <p>
                      <span className="text-gray-600">Amount:</span> {selectedApp.amount} RWF
                    </p>
                  )}
                  {selectedApp.invoice && (
                  <li><span className="text-gray-600">Quotation / Invoice:</span> 
                    <button 
                      className="text-[var(--main-blue)] hover:underline ml-1"
                      onClick={() => setViewingDocument({
                        name: 'Quotation / Invoice',
                        path: selectedApp.invoice || '/File_not_found.jpg'
                      })}
                    >
                      View Document
                    </button>
                  </li>
                )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Transaction ID *
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] sm:text-sm"
                  placeholder="Enter transaction ID"
                  required
                />
              </div>

              <div>
                {/* <label className="block text-sm font-medium mb-1">
                  Upload Payment Proof *
                </label> */}
                <FileInput
                  label="Payment Proof *"
                  name="proofOfPayment"
                  onChange={handlePaymentProofChange}
                  accept=".jpg,.jpeg,.png,.pdf"
                  currentFile={selectedApp.proofOfPayment?.split('/').pop()}
                  error={paymentProofError || undefined}
                  resetTrigger={paymentProofResetTrigger}
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="text"
                  onClick={() => {
                    setSelectedApp(null);
                    setActiveModal('none');
                    setPaymentProof(null);
                    setTransactionId('');
                  }}
                  disabled={isSubmittingPayment}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitPayment}
                  disabled={!paymentProof || !transactionId || isSubmittingPayment}
                >
                  {isSubmittingPayment ? 'Submitting...' : 'Submit Payment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for viewing details */}
      {selectedApp && activeModal === 'view-details' && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4 fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Application Details</h3>
              <button
                onClick={() => {setSelectedApp(null); setActiveModal('none');}}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Application ID</p>
                  <p className="font-semibold">#{selectedApp.applicationNumber}</p>
                </div>
                <div>
                  {getStatusBadge(selectedApp.status)}
                </div>
              </div>
            </div>

            {/* Application Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              {/* Personal Information */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-semibold">{selectedApp.client?.fullName || selectedApp.fullName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-semibold">{selectedApp.client?.email || selectedApp.email ? selectedApp.client?.email || selectedApp.email : 'Empty'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-semibold">{selectedApp.client?.phoneNumber || selectedApp.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-semibold">{formatDate(selectedApp.client?.dateOfBirth || selectedApp.dateOfBirth || '')}</p>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-semibold">{selectedApp.client?.address || selectedApp.address}</p>
                </div>
                {(selectedApp.client?.province || selectedApp.province) && (
                  <div>
                    <p className="text-sm text-gray-500">Province</p>
                    <p className="font-semibold">{selectedApp.client?.province || selectedApp.province}</p>
                  </div>
                )}
                {(selectedApp.client?.district || selectedApp.district) && (
                  <div>
                    <p className="text-sm text-gray-500">District</p>
                    <p className="font-semibold">{selectedApp.client?.district || selectedApp.district}</p>
                  </div>
                )}
                {(selectedApp.client?.sector || selectedApp.sector) && (
                  <div>
                    <p className="text-sm text-gray-500">Sector</p>
                    <p className="font-semibold">{selectedApp.client?.sector || selectedApp.sector}</p>
                  </div>
                )}
              </div>

              {/* Insurance Information */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Insurance Category</p>
                  <p className="font-semibold">{selectedApp.insuranceCategory}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Insurance Type</p>
                  <p className="font-semibold">{selectedApp.insuranceType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-semibold">{selectedApp.insuranceDuration}</p>
                </div>
                {selectedApp.insuranceEndAt && (
                  <div>
                    <p className="text-sm text-gray-500">Insurance End Date</p>
                    <p className="font-semibold">{formatDateUTC(selectedApp.insuranceEndAt)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Created By</p>
                  <p className="font-semibold">
                    {selectedApp.admin ? `Admin: ${selectedApp.admin.fullName}` : 
                     selectedApp.agent ? `Agent: ${selectedApp.agent.fullName}` : 'Client'}
                  </p>
                </div>
                {selectedApp.amount && (
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-semibold">{selectedApp.amount.toLocaleString()} RWF</p>
                  </div>
                )}
                {selectedApp.netPremium !== undefined && selectedApp.netPremium !== null && (
                  <div>
                    <p className="text-sm text-gray-500">Net Premium</p>
                    <p className="font-semibold">{selectedApp.netPremium.toLocaleString()} RWF</p>
                  </div>
                )}
                <div>
  <p className="text-sm text-gray-500">Insurance Provider</p>
  <p className="font-semibold">{selectedApp.insuranceProvider || 'SONARWA'}</p>
</div>
{selectedApp.isCOMESA !== undefined && (
  <div>
    <p className="text-sm text-gray-500">COMESA Coverage</p>
    <p className="font-semibold">{selectedApp.isCOMESA ? 'Yes' : 'No'}</p>
  </div>
)}
              </div>

              {/* Vehicle Information (if applicable) */}
              {(selectedApp.insuranceCategory === 'Car Insurance' || selectedApp.insuranceCategory === 'MotorBike Insurance') && (
  <div className="space-y-4">
    {(selectedApp.vehicle?.vehicleType || selectedApp.vehicleType) && (
      <div>
        <p className="text-sm text-gray-500">Vehicle Type</p>
        <p className="font-semibold">{selectedApp.vehicle?.vehicleType || selectedApp.vehicleType}</p>
      </div>
    )}
    {(selectedApp.vehicle?.vehicleAge || selectedApp.vehicleAge) && (
      <div>
        <p className="text-sm text-gray-500">Vehicle Year</p>
        <p className="font-semibold">{selectedApp.vehicle?.vehicleAge || selectedApp.vehicleAge}</p>
      </div>
    )}
    {(selectedApp.vehicle?.vehicleUse || selectedApp.vehicleUse) && (
      <div>
        <p className="text-sm text-gray-500">Vehicle Use</p>
        <p className="font-semibold">
          {(selectedApp.vehicle?.vehicleUse || selectedApp.vehicleUse) === 'Other' 
            ? (selectedApp.vehicle?.otherVehicleUse || selectedApp.otherVehicleUse)
            : (selectedApp.vehicle?.vehicleUse || selectedApp.vehicleUse)}
        </p>
      </div>
    )}
    {(selectedApp.vehicle?.plateNumber || selectedApp.plateNumber) && (
      <div>
        <p className="text-sm text-gray-500">Plate Number</p>
        <p className="font-semibold">{selectedApp.vehicle?.plateNumber || selectedApp.plateNumber}</p>
      </div>
    )}
    <div>
      <p className="text-sm text-gray-500">Chassis number</p>
      <p className="font-semibold">{formatChasisNumberDisplay(selectedApp)}</p>
    </div>
  </div>
)}
            </div>

            {/* Rejection Reason (if exists) */}
            {(selectedApp.rejectionReason) && (
              <div className="mt-4 bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-700 mb-2">Rejection Reason</h4>
                <p className="text-red-600">{selectedApp.rejectionReason}</p>
              </div>
            )}
            {/* Reason For Payment Rejection (if exists) */}
            {(selectedApp.reasonForPaymentRejection) && (
              <div className=" bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-700 mb-2">Reason For Payment Rejection</h4>
                <p className="text-red-600">{selectedApp.reasonForPaymentRejection}</p>
              </div>
            )}

            {/* Documents Section */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                  onClick={() => setViewingDocument({
                    name: 'National ID / Passport',
                    path: selectedApp.client?.nationalID || selectedApp.nationalID || ''
                  })}
                >
                  <p className="text-sm font-medium">National ID / Passport</p>
                  <p className="text-xs text-gray-500">View Document</p>
                </button>
                
                <button 
                  className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                  onClick={() => setViewingDocument({
                    name: 'Yellow Card',
                    path: selectedApp.yellowCard || ''
                  })}
                >
                  <p className="text-sm font-medium">Yellow Card</p>
                  <p className="text-xs text-gray-500">View Document</p>
                </button>
                
                {selectedApp.pastInsuranceCertificate && (
                  <button 
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() => setViewingDocument({
                      name: 'Past Insurance Certificate',
                      path: selectedApp.pastInsuranceCertificate || ''
                    })}
                  >
                    <p className="text-sm font-medium">Past Insurance</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}
                {selectedApp.invoice && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'Quotation / Invoice',
                path: selectedApp.invoice || ''
              })}
            >
              <p className="text-sm font-medium">Quotation / Invoice</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
                
                {selectedApp.proofOfPayment && (
                  <button 
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() => setViewingDocument({
                      name: 'Proof of Payment',
                      path: selectedApp.proofOfPayment || ''
                    })}
                  >
                    <p className="text-sm font-medium">Proof of Payment</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}
                
                {selectedApp.insuranceCertificate && (
                  <button 
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() => setViewingDocument({
                      name: 'Insurance Certificate',
                      path: selectedApp.insuranceCertificate || ''
                    })}
                  >
                    <p className="text-sm font-medium">Insurance Certificate</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}
                {selectedApp.contract && (
                  <button 
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() => setViewingDocument({
                      name: 'Contract',
                      path: selectedApp.contract || ''
                    })}
                  >
                    <p className="text-sm font-medium">Contract</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}
                {selectedApp.receipt && (
                  <button 
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() => setViewingDocument({
                      name: 'Receipt',
                      path: selectedApp.receipt || ''
                    })}
                  >
                    <p className="text-sm font-medium">Receipt</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}
                {selectedApp.ebm && (
                  <button 
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() => setViewingDocument({
                      name: 'EBM',
                      path: selectedApp.ebm || ''
                    })}
                  >
                    <p className="text-sm font-medium">EBM</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}
              </div>
            </div>

            {/* Payment Information (if available) */}
            {selectedApp.invoice && (
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Payment Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {selectedApp.amount && (
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm font-medium">Amount</p>
                      <p className="text-xs text-gray-500">{selectedApp.amount} RWF</p>
                    </div>
                  )}
                  {selectedApp.transactionId && (
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm font-medium">Transaction ID</p>
                      <p className="text-xs text-gray-500">{selectedApp.transactionId}</p>
                      {selectedApp.invoice && (
                  <><span className="text-gray-600">Quotation / Invoice:</span> 
                    <button 
                      className="text-sm text-[var(--main-blue)] hover:underline ml-1"
                      onClick={() => setViewingDocument({
                        name: 'Quotation / Invoice',
                        path: selectedApp.invoice || '/File_not_found.jpg'
                      })}
                    >
                      View Document
                    </button>
                  </>
                )}
                    </div>
                  )}
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm font-medium">Police number</p>
                    <p className="text-xs text-gray-500">{formatPoliceNumberDisplay(selectedApp)}</p>
                  </div>
                  
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button variant="text" onClick={() => {setSelectedApp(null); setActiveModal('none');}}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Application Modal */}
      {selectedApp && activeModal === 'edit-application' && (
        <EditApplicationModal
          isOpen={true}
          onClose={() => {
            // setShowEditModal(false);
            setSelectedApp(null);
            setActiveModal('none');
          }}
          application={selectedApp}
          onSave={handleEditSuccess}
          isLoading={isLoading}
        />
      )}

      {/* Document viewer modal */}
      {viewingDocument && (
        <DocumentViewer
          documentName={viewingDocument.name}
          documentPath={viewingDocument.path}
          onClose={() => setViewingDocument(null)}
        />
      )}

      <ToastContainer />
    </MainLayout>
  );
}