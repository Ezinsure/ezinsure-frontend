'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileInput } from '@/components/ui/file-input';
import { SearchInput } from '@/components/ui/search-input';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { rwandaProvinces } from '@/utils/rwanda-administrative';
import {
  validateForm,
  ValidationRules,
  validationPatterns,
  hasErrors,
} from '@/components/ui/form-validation';

// Application statuses
enum ApplicationStatus {
  PENDING = 'pending',
  APPLICATION_APPROVED = 'application_approved',
  WAITING_FOR_USER_ACTION = 'waiting_for_user_action',
  INVOICE_SENT = 'invoice_sent',
  REVIEW_PAYMENT = 'review_payment',
  PAYMENT_VERIFIED = 'payment_verified',
  INSURANCE_ISSUED = 'insurance_issued'
}

// Application form data interface
interface ApplicationFormData {
  // Personal Information
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: string;
  province: string;
  district: string;
  sector: string;
  identificationDocumentType: string;
  identificationNumber: string;
  
  // Insurance Information
  insuranceCategory: string;
  insuranceType: string;
  insuranceDuration: string;
  insuranceProvider: string;
  isCOMESA: boolean;
  plateNumber: string;
  
  // Vehicle Information
  vehicleType: string;
  vehicleAge: string;
  vehicleUse: string;
  otherVehicleUse: string;
  
  // Documents
  nationalID: File | null;
  yellowCard: File | null;
  pastInsuranceCertificate: File | null;
  
  // Payment Information
  amount: string;
  paymentInstructions: string;
  invoiceFile: File | null;
  
  // Commission Information
  agentCommission: string;
  companyCommission: string;
  administrationFees: string;
  
  // Payment Verification
  proofOfPayment: File | null;
  transactionId: string;
  
  // Insurance Issuance
  insuranceCertificate: File | null;
  contract: File | null;
  receipt: File | null;
  ebm: File | null;
  
  // Status
  status: ApplicationStatus;
  insuranceEndAt: string;
}

export default function AdminNewApplicationPage() {
  const { showToast, ToastContainer } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // State for administrative divisions
  const [availableDistricts, setAvailableDistricts] = useState<{name: string, sectors?: string[]}[]>([]);
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);
  
  // Reset triggers for SearchInput components
  const [identificationNumberResetTrigger, setIdentificationNumberResetTrigger] = useState(0);
  const [plateNumberResetTrigger, setPlateNumberResetTrigger] = useState(0);
  
  // Constants from apply page
  const carTypes = ['Jeep', 'Voiture', 'Camionette', 'Poid Lourds', 'Remorque', 'Daihatsu', 'Ambulance', 'Pickup', 'Other'];
  const motoTypes = ['Electric', 'Moped', 'Scooter', 'Motorcycle', 'Other'];
  const carUses = [
    'Private', 
    'PSV', 
    'Commercial - Transport of Goods', 
    'Commercial - Auto Ecole', 
    'Commercial - School Bus', 
    'Commercial - Ambulance', 
    'Commercial - Transport of Fuel', 
    'Commercial - For Hire', 
    'Commercial - Mechanic', 
    'Commercial - Specific Use',
    'Other'
  ];
  const motoUses = [
    'Private',
    'PSV',
    'Commercial - Transport of Goods',
    'Other'
  ];

  // Helper functions for document types
  const getIdentificationDocumentLabel = (type: string) => {
    switch (type) {
      case 'nationalID': return 'National ID Number';
      case 'passport': return 'Passport Number';
      case 'drivingLicense': return 'Driving License Number';
      default: return 'National ID Number';
    }
  };

  const getIdentificationDocumentPlaceholder = (type: string) => {
    switch (type) {
      case 'nationalID': return 'e.g. 1234567890123456';
      case 'passport': return 'e.g. RN1234567';
      case 'drivingLicense': return 'e.g. DL123456789';
      default: return 'e.g. 1234567890123456';
    }
  };

  const getDateLimits = () => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    
    return {
      min: minDate.toISOString().split('T')[0],
      max: maxDate.toISOString().split('T')[0]
    };
  };

  // Handle identification search success
  const handleIdentificationSearchSuccess = (data: Record<string, unknown>) => {
    setFormData(prev => ({
      ...prev,
      fullName: (data.fullName as string) || prev.fullName,
      email: (data.email as string) || prev.email,
      phoneNumber: (data.phoneNumber as string) || prev.phoneNumber,
      address: (data.address as string) || prev.address,
      dateOfBirth: (data.dateOfBirth as string) || prev.dateOfBirth,
      province: (data.province as string) || prev.province,
      district: (data.district as string) || prev.district,
      sector: (data.sector as string) || prev.sector,
    }));

    // Update districts and sectors if province is set
    if (data.province) {
      const selectedProvince = rwandaProvinces.find(p => p.name === (data.province as string));
      const districts = selectedProvince?.districts || [];
      const transformedDistricts = districts.map(district => ({
        name: district.name,
        sectors: district.sectors?.map(sector => sector.name) || []
      }));
      setAvailableDistricts(transformedDistricts);

      if (data.district) {
        const selectedDistrict = transformedDistricts.find(d => d.name === (data.district as string));
        setAvailableSectors(selectedDistrict?.sectors || []);
      }
    }
    
    showToast('Client information loaded successfully', 'success');
  };

  // Handle search success for plate number
  const handlePlateSearchSuccess = (data: Record<string, unknown>) => {
    setFormData(prev => ({
      ...prev,
      fullName: (data.fullName as string) || prev.fullName,
      email: (data.email as string) || prev.email,
      phoneNumber: (data.phoneNumber as string) || prev.phoneNumber,
      address: (data.address as string) || prev.address,
      dateOfBirth: (data.dateOfBirth as string) || prev.dateOfBirth,
      province: (data.province as string) || prev.province,
      district: (data.district as string) || prev.district,
      sector: (data.sector as string) || prev.sector,
      vehicleType: (data.vehicleType as string) || prev.vehicleType,
      vehicleAge: (data.vehicleAge as string) || prev.vehicleAge,
      vehicleUse: (data.vehicleUse as string) || prev.vehicleUse,
    }));

    // Update districts and sectors if province is set
    if (data.province) {
      const selectedProvince = rwandaProvinces.find(p => p.name === (data.province as string));
      const districts = selectedProvince?.districts || [];
      const transformedDistricts = districts.map(district => ({
        name: district.name,
        sectors: district.sectors?.map(sector => sector.name) || []
      }));
      setAvailableDistricts(transformedDistricts);

      if (data.district) {
        const selectedDistrict = transformedDistricts.find(d => d.name === (data.district as string));
        setAvailableSectors(selectedDistrict?.sectors || []);
      }
    }
    
    showToast('Vehicle information loaded successfully', 'success');
  };
  
  const [formData, setFormData] = useState<ApplicationFormData>({
    // Personal Information
    fullName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    address: '',
    province: '',
    district: '',
    sector: '',
    identificationDocumentType: 'nationalID',
    identificationNumber: '',
    
    // Insurance Information
    insuranceCategory: 'car',
    insuranceType: 'comprehensive',
    insuranceDuration: '12',
    insuranceProvider: 'SONARWA',
    isCOMESA: false,
    plateNumber: '',
    
    // Vehicle Information
    vehicleType: '',
    vehicleAge: '',
    vehicleUse: '',
    otherVehicleUse: '',
    
    // Documents
    nationalID: null,
    yellowCard: null,
    pastInsuranceCertificate: null,
    
    // Payment Information
    amount: '',
    paymentInstructions: 'Please make your payment to one of the following:\nBank of Kigali: 100000129075 (SONARWA)\nOr via Momo Account: 051499 (SONARWA) \nOr Agency at Kimihurura (KBC) under SOLEKTRA',
    invoiceFile: null,
    
    // Commission Information
    agentCommission: '',
    companyCommission: '',
    administrationFees: '',
    
    // Payment Verification
    proofOfPayment: null,
    transactionId: '',
    
    // Insurance Issuance
    insuranceCertificate: null,
    contract: null,
    receipt: null,
    ebm: null,
    
    // Status
    status: ApplicationStatus.PENDING,
    insuranceEndAt: ''
  });

  // Validation rules - based on original apply page
  const validationRules: ValidationRules = {
    fullName: { required: true, minLength: 3, maxLength: 50 },
    email: { required: false, pattern: validationPatterns.email },
    phoneNumber: { required: true, pattern: validationPatterns.phone },
    address: { required: true, minLength: 5, maxLength: 100 },
    dateOfBirth: { required: true },
    province: { required: true },
    district: { required: true },
    sector: { required: true },
    insuranceCategory: { required: true },
    insuranceType: { required: true },
    insuranceProvider: { required: true },
    vehicleType: { required: formData.insuranceCategory === 'car' || formData.insuranceCategory === 'motorbike' },
    vehicleAge: { required: formData.insuranceCategory === 'car' || formData.insuranceCategory === 'motorbike' },
    vehicleUse: { required: formData.insuranceCategory === 'car' || formData.insuranceCategory === 'motorbike' },
    otherVehicleUse: { required: formData.vehicleUse === 'Other' },
    nationalID: { required: true },
    yellowCard: { required: true },
    plateNumber: { required: formData.insuranceCategory === 'car' || formData.insuranceCategory === 'motorbike' },
    identificationDocumentType: { required: true },
    identificationNumber: { required: true },
    // Admin-specific required fields
    amount: { required: true },
    agentCommission: { required: true },
    companyCommission: { required: true },
    administrationFees: { required: true },
    paymentInstructions: { required: true },
    transactionId: { required: true },
    proofOfPayment: { required: true },
    insuranceCertificate: { required: true },
    contract: { required: true },
    receipt: { required: true },
    ebm: { required: true },
  };

  // Calculate administration fees based on insurance category
  const calculateAdministrationFees = (insuranceCategory: string) => {
    if (insuranceCategory.toLowerCase().includes('moto')) {
      return Math.round(2500 * 0.25); // 25% of 2500 for MOTO
    } else {
      return Math.round(5000 * 0.25); // 25% of 5000 for all other applications
    }
  };

  // Auto-calculate administration fees when insurance category changes
  useEffect(() => {
    if (formData.insuranceCategory) {
      const calculatedFees = calculateAdministrationFees(formData.insuranceCategory);
      setFormData(prev => ({ ...prev, administrationFees: calculatedFees.toString() }));
    }
  }, [formData.insuranceCategory]);

  // Update districts when province changes
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value,
      district: '',
      sector: ''
    }));

    if (value) {
      const selectedProvince = rwandaProvinces.find(p => p.name === value);
      const districts = selectedProvince?.districts || [];
      // Transform districts to match expected format
      const transformedDistricts = districts.map(district => ({
        name: district.name,
        sectors: district.sectors?.map(sector => sector.name) || []
      }));
      setAvailableDistricts(transformedDistricts);
    } else {
      setAvailableDistricts([]);
    }
    setAvailableSectors([]);
  };

  // Update sectors when district changes
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value,
      sector: ''
    }));

    if (value) {
      const selectedDistrict = availableDistricts.find(d => d.name === value);
      setAvailableSectors(selectedDistrict?.sectors || []);
    } else {
      setAvailableSectors([]);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    // Special handling for province and district changes
    if (name === 'province') {
      handleProvinceChange(e as React.ChangeEvent<HTMLSelectElement>);
      return;
    } else if (name === 'district') {
      handleDistrictChange(e as React.ChangeEvent<HTMLSelectElement>);
      return;
    }
    
    // Clear personal information when document type changes
    if (name === 'identificationDocumentType') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        // Clear only personal information fields (not insurance details)
        fullName: '',
        email: '',
        phoneNumber: '',
        address: '',
        dateOfBirth: '',
        province: '',
        district: '',
        sector: '',
        identificationNumber: '',
      }));
      setAvailableDistricts([]);
      setAvailableSectors([]);
      // Reset identification number search status
      setIdentificationNumberResetTrigger(prev => prev + 1);
    } 
    // Clear vehicle fields when insurance category changes
    else if (name === 'insuranceCategory') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        // Clear only vehicle-related fields (not client info)
        plateNumber: '',
        vehicleType: '',
        vehicleAge: '',
        vehicleUse: '',
        otherVehicleUse: '',
      }));
      // Reset plate number search status
      setPlateNumberResetTrigger(prev => prev + 1);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleFileChange = (field: keyof ApplicationFormData) => (file: File | null) => {
    setFormData(prev => ({ ...prev, [field]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const formErrors = validateForm(
      { ...formData, isCOMESA: formData.isCOMESA ? 'true' : 'false' },
      validationRules
    );
    setErrors(formErrors);

    if (!hasErrors(formErrors)) {
      setIsSubmitting(true);

      try {
        const formDataToSend = new FormData();
        
        // Add all form fields
        Object.entries(formData).forEach(([key, value]) => {
          if (value instanceof File) {
            if (value) formDataToSend.append(key, value);
          } else if (value !== null && value !== undefined) {
            formDataToSend.append(key, value.toString());
          }
        });

        // Add admin user info
        if (user) {
          formDataToSend.append('adminId', user._id);
          formDataToSend.append('adminName', user.fullName);
        }

        const response = await fetch('/api/applications', {
          method: 'POST',
          body: formDataToSend,
        });

        if (response.ok) {
          showToast('Application created successfully!', 'success');
          // Reset form
          setFormData({
            fullName: '',
            email: '',
            phoneNumber: '',
            dateOfBirth: '',
            address: '',
            province: '',
            district: '',
            sector: '',
            identificationDocumentType: 'nationalID',
            identificationNumber: '',
            insuranceCategory: 'car',
            insuranceType: 'comprehensive',
            insuranceDuration: '12',
            insuranceProvider: 'SONARWA',
            isCOMESA: false,
            plateNumber: '',
            vehicleType: '',
            vehicleAge: '',
            vehicleUse: '',
            otherVehicleUse: '',
            nationalID: null,
            yellowCard: null,
            pastInsuranceCertificate: null,
            amount: '',
            paymentInstructions: 'Please make your payment to one of the following:\nBank of Kigali: 100000129075 (SONARWA)\nOr via Momo Account: 051499 (SONARWA) \nOr Agency at Kimihurura (KBC) under SOLEKTRA',
            invoiceFile: null,
            agentCommission: '',
            companyCommission: '',
            administrationFees: '',
            proofOfPayment: null,
            transactionId: '',
            insuranceCertificate: null,
            contract: null,
            receipt: null,
            ebm: null,
            status: ApplicationStatus.PENDING,
            insuranceEndAt: ''
          });
          setAvailableDistricts([]);
          setAvailableSectors([]);
          setErrors({});
        } else {
          const errorData = await response.json();
          showToast(errorData.message || 'Failed to create application', 'error');
        }
      } catch (error) {
        console.error('Error creating application:', error);
        showToast('An error occurred while creating the application', 'error');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      showToast('Please fix the errors below before submitting', 'error');
    }
  };

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-8 max-w-[80vw]">
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <div className="max-w-4xl mx-auto mt-16">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Create New Application
            </h1>
            <p className="text-gray-600">
              Fill out the form below to create a new insurance application.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <form onSubmit={handleSubmit} className="p-6">
              {/* Personal Information Section - EXACT COPY FROM APPLY PAGE */}
              <fieldset className="mb-8 border-2 border-[var(--main-blue)] rounded-lg p-6 bg-gray-50">
                <legend className="text-lg font-semibold text-[var(--main-blue)] px-3 bg-white border border-[var(--main-blue)] rounded-md">
                  Personal Information
                </legend>
                
                {/* Identification Document Type */}
                <div className="mb-6">
                  <label
                    className="block text-sm font-medium mb-1"
                    htmlFor="identificationDocumentType"
                  >
                    Identification Document Type{' '}
                    <span className="text-[var(--error-red)] ml-1">*</span>
                  </label>
                  <select
                    id="identificationDocumentType"
                    name="identificationDocumentType"
                    value={formData.identificationDocumentType}
                    onChange={handleInputChange}
                    className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                    required
                  >
                    <option value="nationalID">National ID</option>
                    <option value="passport">Passport</option>
                    <option value="drivingLicense">Driving License</option>
                  </select>
                </div>

                {/* Identification Number Search */}
                <div className="mb-6">
                  <SearchInput
                    label={getIdentificationDocumentLabel(formData.identificationDocumentType)}
                    name="identificationNumber"
                    placeholder={getIdentificationDocumentPlaceholder(formData.identificationDocumentType)}
                    value={formData.identificationNumber}
                    onChange={(value) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        identificationNumber: value,
                        // Only clear personal information fields if identification number is being cleared (empty)
                        ...(value === '' ? {
                          fullName: '',
                          email: '',
                          phoneNumber: '',
                          address: '',
                          dateOfBirth: '',
                          province: '',
                          district: '',
                          sector: '',
                        } : {})
                      }));
                      
                      // Only clear districts/sectors if identification number is being cleared
                      if (value === '') {
                        setAvailableDistricts([]);
                        setAvailableSectors([]);
                      }
                    }}
                    onSearchSuccess={handleIdentificationSearchSuccess}
                    searchType="id"
                    required
                    resetTrigger={identificationNumberResetTrigger}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Full Name"
                    name="fullName"
                    placeholder="Jean Claude Niyonzima"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    error={errors.fullName}
                    required
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    name="email"
                    placeholder="johndoe@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={errors.email}
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
                    name="phoneNumber"
                    placeholder="250781234567"
                    value={formData.phoneNumber}
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
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    error={errors.dateOfBirth}
                    min={getDateLimits().min}
                    max={getDateLimits().max}
                    required
                  />

                  <Input
                    label="Address"
                    name="address"
                    placeholder="eg: KN 5 RD, Kigali - Rwanda"
                    value={formData.address}
                    onChange={handleInputChange}
                    error={errors.address}
                    required
                  />

                  {/* Province Select */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Province
                    </label>
                    <select
                      name="province"
                      value={formData.province}
                      onChange={handleInputChange}
                      className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                      required
                    >
                      <option value="">Select Province</option>
                      {rwandaProvinces.map(province => (
                        <option key={province.name} value={province.name}>{province.name}</option>
                      ))}
                    </select>
                    {errors.province && (
                      <p className="mt-1 text-sm text-[var(--error-red)]">{errors.province}</p>
                    )}
                  </div>

                  {/* District Select */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      District
                    </label>
                    <select
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      disabled={!formData.province}
                      className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)] disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required
                    >
                      <option value="">Select District</option>
                      {availableDistricts.map(district => (
                        <option key={district.name} value={district.name}>{district.name}</option>
                      ))}
                    </select>
                    {errors.district && (
                      <p className="mt-1 text-sm text-[var(--error-red)]">{errors.district}</p>
                    )}
                  </div>

                  {/* Sector Select */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Sector
                    </label>
                    <select
                      name="sector"
                      value={formData.sector}
                      onChange={handleInputChange}
                      disabled={!formData.district}
                      className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)] disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required
                    >
                      <option value="">Select Sector</option>
                      {availableSectors.map((sector, index) => (
                        <option key={`${sector}-${index}`} value={sector}>{sector}</option>
                      ))}
                    </select>
                    {errors.sector && (
                      <p className="mt-1 text-sm text-[var(--error-red)]">{errors.sector}</p>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Insurance Details Section - EXACT COPY FROM APPLY PAGE */}
              <fieldset className="mb-8 border-2 border-[var(--main-blue)] rounded-lg p-6 bg-gray-50">
                <legend className="text-lg font-semibold text-[var(--main-blue)] px-3 bg-white border border-[var(--main-blue)] rounded-md">
                  Insurance Details
                </legend>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
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
                      value={formData.insuranceCategory}
                      onChange={handleInputChange}
                      className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                      required
                    >
                      <option value="car">Car Insurance</option>
                      <option value="motorbike">MotorBike Insurance</option>
                      <option value="building">Building Insurance</option>
                      <option value="travel">Travel Insurance</option>
                      <option value="health">Health Insurance</option>
                      <option value="fire">Fire Insurance Coverage</option>
                    </select>
                    {errors.insuranceCategory && (
                      <p className="mt-1 text-sm text-[var(--error-red)]">{errors.insuranceCategory}</p>
                    )}
                  </div>

                  {/* Plate Number Field - Only for Car/Motorbike */}
                  {(formData.insuranceCategory === 'car' || formData.insuranceCategory === 'motorbike') && (
                    <div>
                      <SearchInput
                        label="Plate Number"
                        name="plateNumber"
                        placeholder="e.g. RAA 123A"
                        value={formData.plateNumber}
                        onChange={(value) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            plateNumber: value,
                            // Only clear vehicle-related fields if plate number is being cleared (empty)
                            ...(value === '' ? {
                              vehicleType: '',
                              vehicleAge: '',
                              vehicleUse: '',
                              otherVehicleUse: '',
                            } : {})
                          }));
                        }}
                        onSearchSuccess={handlePlateSearchSuccess}
                        searchType="plate"
                        error={errors.plateNumber}
                        required
                        resetTrigger={plateNumberResetTrigger}
                      />
                    </div>
                  )}

                  {/* Insurance Provider */}
                  <div className="md:col-span-2">
                    <label
                      className="block text-sm font-medium mb-1"
                      htmlFor="insuranceProvider"
                    >
                      Insurance Provider{' '}
                      <span className="text-[var(--error-red)] ml-1">*</span>
                    </label>
                    <select
                      id="insuranceProvider"
                      name="insuranceProvider"
                      value={formData.insuranceProvider}
                      onChange={handleInputChange}
                      className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                      required
                    >
                      <option value="SONARWA">SONARWA</option>
                    </select>
                    {errors.insuranceProvider && (
                      <p className="mt-1 text-sm text-[var(--error-red)]">{errors.insuranceProvider}</p>
                    )}
                  </div>

                  {/* Vehicle Type (only shown for car/motorbike insurance) */}
                  {(formData.insuranceCategory === 'car' || formData.insuranceCategory === 'motorbike') && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Vehicle Type
                      </label>
                      <select
                        name="vehicleType"
                        value={formData.vehicleType}
                        onChange={handleInputChange}
                        className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                        required
                      >
                        <option value="">Select Vehicle Type</option>
                        {formData.insuranceCategory === 'car' ? (
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
                        <p className="mt-1 text-sm text-[var(--error-red)]">{errors.vehicleType}</p>
                      )}
                    </div>
                  )}

                  {/* Vehicle Age (only shown for car/motorbike insurance) */}
                  {(formData.insuranceCategory === 'car' || formData.insuranceCategory === 'motorbike') && (
                    <div>
                      <Input
                        label="Vehicle Age (Year of Manufacture)"
                        type="number"
                        name="vehicleAge"
                        placeholder="e.g. 2015"
                        min="1900"
                        max={new Date().getFullYear().toString()}
                        value={formData.vehicleAge}
                        onChange={handleInputChange}
                        error={errors.vehicleAge}
                        required
                      />
                    </div>
                  )}

                  {/* Vehicle Use (only shown for car/motorbike insurance) */}
                  {(formData.insuranceCategory === 'car' || formData.insuranceCategory === 'motorbike') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Vehicle Use
                        </label>
                        <select
                          name="vehicleUse"
                          value={formData.vehicleUse}
                          onChange={handleInputChange}
                          className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                          required
                        >
                          <option value="">Select Vehicle Use</option>
                          {formData.insuranceCategory === 'car' ? (
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
                          <p className="mt-1 text-sm text-[var(--error-red)]">{errors.vehicleUse}</p>
                        )}
                      </div>

                      {/* Other Vehicle Use Input (only shown when 'Other' is selected) */}
                      {formData.vehicleUse === 'Other' && (
                        <div className="md:col-span-2">
                          <Input
                            label="Specify Vehicle Use"
                            name="otherVehicleUse"
                            placeholder="Please specify how you use your vehicle..."
                            value={formData.otherVehicleUse}
                            onChange={handleInputChange}
                            error={errors.otherVehicleUse}
                            required
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* COMESA Checkbox */}
                  {(formData.insuranceCategory === 'car' || formData.insuranceCategory === 'motorbike') && (
                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="isCOMESA"
                          checked={formData.isCOMESA}
                          onChange={handleInputChange}
                          className="rounded h-4 border-gray-300 text-[var(--main-blue)] focus:ring-[var(--main-blue)]"
                        />
                        <span className="text-sm font-medium">
                          Ext. Territorial (COMESA)
                        </span>
                      </label>
                    </div>
                  )}

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
                      value={formData.insuranceType}
                      onChange={handleInputChange}
                      className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                      required
                    >
                      <option value="comprehensive">Comprehensive Insurance (covers everything)</option>
                      <option value="thirdParty">Third Party Insurance (covers partial)</option>
                    </select>
                    {errors.insuranceType && (
                      <p className="mt-1 text-sm text-[var(--error-red)]">{errors.insuranceType}</p>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Documents Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">
                  Required Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FileInput
                    label="National ID Card / Passport / Driving License"
                    name="nationalID"
                    onChange={handleFileChange('nationalID')}
                    error={errors.nationalID}
                    required
                    accept="image/*,.pdf"
                  />

                  <FileInput
                    label="Yellow Card"
                    name="yellowCard"
                    onChange={handleFileChange('yellowCard')}
                    error={errors.yellowCard}
                    required
                    accept="image/*,.pdf"
                  />

                  <FileInput
                    label="Past Insurance Certificate (Optional)"
                    name="pastInsuranceCertificate"
                    onChange={handleFileChange('pastInsuranceCertificate')}
                    accept="image/*,.pdf"
                    className="md:col-span-2"
                  />
                </div>
              </div>

              {/* Payment & Commission Section */}
              <fieldset className="mb-8 border-2 border-[var(--main-blue)] rounded-lg p-6 bg-gray-50">
                <legend className="text-lg font-semibold text-[var(--main-blue)] px-3 bg-white border border-[var(--main-blue)] rounded-md">
                  Payment & Commission Details
                </legend>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <Input
                        label="Amount (RWF)"
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        placeholder="Enter amount"
                        error={errors.amount}
                        required
                      />
                    </div>
                    
                    <div>
                      <Input
                        label="Agent Commission (RWF)"
                        type="number"
                        name="agentCommission"
                        value={formData.agentCommission}
                        onChange={handleInputChange}
                        placeholder="Enter agent commission"
                        error={errors.agentCommission}
                        required
                      />
                    </div>
                    
                    <div>
                      <Input
                        label="Company Commission (RWF)"
                        type="number"
                        name="companyCommission"
                        value={formData.companyCommission}
                        onChange={handleInputChange}
                        placeholder="Enter company commission"
                        error={errors.companyCommission}
                        required
                      />
                    </div>
                    
                    <div>
                      <Input
                        label="Administration Fees (RWF)"
                        type="number"
                        name="administrationFees"
                        value={formData.administrationFees}
                        onChange={handleInputChange}
                        placeholder="Administration fees (auto-calculated)"
                        error={errors.administrationFees}
                        disabled
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.insuranceCategory.toLowerCase().includes('moto') 
                          ? 'Calculated as 25% of 2500 RWF for MOTO insurance' 
                          : 'Calculated as 25% of 5000 RWF for other insurance types'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Instructions
                      </label>
                      <textarea
                        name="paymentInstructions"
                        value={formData.paymentInstructions}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] sm:text-sm h-32 resize-none"
                        rows={4}
                        placeholder="Enter payment instructions..."
                        required
                      />
                      {errors.paymentInstructions && (
                        <p className="mt-1 text-sm text-[var(--error-red)]">{errors.paymentInstructions}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Invoice File</label>
                      <input
                        type="file"
                        onChange={(e) => handleFileChange('invoiceFile')(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[var(--main-blue)] file:text-white hover:file:bg-[var(--secondary-blue)]"
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* Payment Verification Section */}
              <fieldset className="mb-8 border-2 border-[var(--main-blue)] rounded-lg p-6 bg-gray-50">
                <legend className="text-lg font-semibold text-[var(--main-blue)] px-3 bg-white border border-[var(--main-blue)] rounded-md">
                  Payment Verification
                </legend>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Input
                      label="Transaction ID"
                      name="transactionId"
                      value={formData.transactionId}
                      onChange={handleInputChange}
                      placeholder="Enter transaction ID"
                      error={errors.transactionId}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proof of Payment
                    </label>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange('proofOfPayment')(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[var(--main-blue)] file:text-white hover:file:bg-[var(--secondary-blue)]"
                      required
                    />
                    {errors.proofOfPayment && (
                      <p className="mt-1 text-sm text-[var(--error-red)]">{errors.proofOfPayment}</p>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Insurance Issuance Section */}
              <fieldset className="mb-8 border-2 border-[var(--main-blue)] rounded-lg p-6 bg-gray-50">
                <legend className="text-lg font-semibold text-[var(--main-blue)] px-3 bg-white border border-[var(--main-blue)] rounded-md">
                  Insurance Documents
                </legend>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Insurance Certificate
                    </label>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange('insuranceCertificate')(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[var(--main-blue)] file:text-white hover:file:bg-[var(--secondary-blue)]"
                      required
                    />
                    {errors.insuranceCertificate && (
                      <p className="mt-1 text-sm text-[var(--error-red)]">{errors.insuranceCertificate}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract
                    </label>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange('contract')(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[var(--main-blue)] file:text-white hover:file:bg-[var(--secondary-blue)]"
                      required
                    />
                    {errors.contract && (
                      <p className="mt-1 text-sm text-[var(--error-red)]">{errors.contract}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Receipt
                    </label>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange('receipt')(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[var(--main-blue)] file:text-white hover:file:bg-[var(--secondary-blue)]"
                      required
                    />
                    {errors.receipt && (
                      <p className="mt-1 text-sm text-[var(--error-red)]">{errors.receipt}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      EBM
                    </label>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange('ebm')(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[var(--main-blue)] file:text-white hover:file:bg-[var(--secondary-blue)]"
                      required
                    />
                    {errors.ebm && (
                      <p className="mt-1 text-sm text-[var(--error-red)]">{errors.ebm}</p>
                    )}
                  </div>
                </div>
              </fieldset>

              <div className="mt-8 flex justify-center">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full md:w-auto min-w-[200px]"
                >
                  {isSubmitting ? 'Creating Application...' : 'Create Application'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <ToastContainer />
    </MainLayout>
  );
}