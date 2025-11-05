'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileInput } from '@/components/ui/file-input';
import { SearchInput } from '@/components/ui/search-input';
import { RwandaPhoneInput } from '@/components/ui/rwanda-phone-input';
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

// Tracking data interfaces
interface DeviceInfo {
  userAgent: string;
  platform: string;
  timezone: string;
  deviceMemory?: number;
  devicePixelRatio: number;
  viewportSize: string;
  browserName: string;
  browserVersion: string;
  operatingSystem: string;
}

interface LocationInfo {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp?: number;
  error?: string;
  ipLocation?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
}

interface TrackingData {
  deviceInfo: DeviceInfo;
  locationInfo: LocationInfo;
  sessionId: string;
  timestamp: number;
}

// Device info utility
const getDeviceInfo = (): DeviceInfo => {
  const ua = navigator.userAgent;

  const getBrowserInfo = () => {
    const browsers = [
      { name: 'Chrome', regex: /Chrome\/([0-9.]+)/ },
      { name: 'Firefox', regex: /Firefox\/([0-9.]+)/ },
      { name: 'Safari', regex: /Safari\/([0-9.]+)/ },
      { name: 'Edge', regex: /Edge\/([0-9.]+)/ },
      { name: 'Opera', regex: /Opera\/([0-9.]+)/ },
    ];

    for (const browser of browsers) {
      const match = ua.match(browser.regex);
      if (match) {
        return { name: browser.name, version: match[1] };
      }
    }
    return { name: 'Unknown', version: 'Unknown' };
  };

  const getOperatingSystem = () => {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS X')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  };

  const browser = getBrowserInfo();

  return {
    userAgent: ua,
    platform: navigator.platform,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    deviceMemory: (navigator as unknown as { deviceMemory?: number }).deviceMemory,
    devicePixelRatio: window.devicePixelRatio,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    browserName: browser.name,
    browserVersion: browser.version,
    operatingSystem: getOperatingSystem(),
  };
};

// Location info utility
const getLocationInfo = async (): Promise<LocationInfo> => {
  const locationInfo: LocationInfo = {};

  // Try GPS location (silent)
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000,
        }
      );
    });
    locationInfo.latitude = position.coords.latitude;
    locationInfo.longitude = position.coords.longitude;
    locationInfo.accuracy = position.coords.accuracy;
    locationInfo.timestamp = position.timestamp;
  } catch (error) {
    locationInfo.error = error instanceof Error ? error.message : 'Location access denied';
  }

  // Try IP-based location
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const ipData = await response.json();
      locationInfo.ipLocation = {
        country: ipData.country_name,
        region: ipData.region,
        city: ipData.city,
        timezone: ipData.timezone,
      };
    }
  } catch (error) {
    console.debug('IP location lookup failed:', error);
  }
  return locationInfo;
};

// Session ID utility
const getSessionId = (): string => {
  const storageKey = 'ezinsure_session_id';
  let sessionId;
  try {
    sessionId = sessionStorage.getItem(storageKey);
  } catch (error) {
    console.log('Session storage access failed:', error);
    sessionId = null;
  }

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
      sessionStorage.setItem(storageKey, sessionId);
    } catch (error) {
      console.log('Session storage write failed:', error);
    }
  }

  return sessionId;
};

// Main tracking data functio
const getTrackingData = async (): Promise<TrackingData> => {
  const [deviceInfo, locationInfo] = await Promise.all([
    Promise.resolve(getDeviceInfo()),
    getLocationInfo(),

  ]);

  return {
    deviceInfo,
    locationInfo,
    sessionId: getSessionId(),
    timestamp: Date.now(),
  };
};

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
  // API response fields
  vehicleId: string;
  clientId: string;
  // New fields for /newApply endpoint
  isNewClient: boolean;
  isNewVehicle: boolean;
  // Payment Information
  amount: string;
  paymentInstructions: string;
  invoice: File | null;
  // Commission Information
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
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  // State for administrative divisions
  const [availableDistricts, setAvailableDistricts] = useState<{ name: string, sectors?: string[] }[]>([]);
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);
  // Reset triggers for SearchInput components
  const [identificationNumberResetTrigger, setIdentificationNumberResetTrigger] = useState(0);
  const [plateNumberResetTrigger, setPlateNumberResetTrigger] = useState(0);
  const [phoneNumberResetTrigger, setPhoneNumberResetTrigger] = useState(0);
  const [fileResetTrigger, setFileResetTrigger] = useState(0);
  // Track search results for isNewClient and isNewVehicle fields

  const [searchResults, setSearchResults] = useState({

    isNewClient: true,    // Default to true (new client)

    isNewVehicle: true,   // Default to true (new vehicle)

  });

  // Initialize tracking data on component mount

  useEffect(() => {

    const initializeTracking = async () => {

      try {

        const data = await getTrackingData();

        setTrackingData(data);

      } catch (error) {

        console.debug('Tracking initialization failed:', error);

      }

    };

    initializeTracking();

  }, []);

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

      // Client information from vehicle owner

      fullName: (data.fullName as string) || prev.fullName,

      email: (data.email as string) || prev.email,

      phoneNumber: (data.phoneNumber as string) || prev.phoneNumber,

      // Vehicle-specific fields

      vehicleType: (data.vehicleType as string) || prev.vehicleType,

      vehicleAge: (data.vehicleAge as string) || prev.vehicleAge,

      vehicleUse: (data.vehicleUse as string) || prev.vehicleUse,

      otherVehicleUse: (data.otherVehicleUse as string) || prev.otherVehicleUse,

      // Store additional IDs for reference

      vehicleId: (data.vehicleId as string) || prev.vehicleId,

      clientId: (data.clientId as string) || prev.clientId,

    }));

    showToast('Vehicle information loaded successfully', 'success');

  };

  // Handle search results to track isNewClient and isNewVehicle

  const handleSearchResult = (exists: boolean, searchType: 'plateNumber' | 'identificationNumber') => {

    setSearchResults(prev => ({

      ...prev,

      [searchType === 'identificationNumber' ? 'isNewClient' : 'isNewVehicle']: !exists

    }));

  };

  const getTokenFromStorage = () => {

    try {

      return sessionStorage.getItem('ezinsure_token');

    } catch (error) {

      console.error('Error accessing sessionStorage:', error);

      return null;

    }

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

    insuranceCategory: 'Car Insurance',

    insuranceType: 'Comprehensive Insurance (covers everything)',

    insuranceDuration: '1 Month',

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

    // API response fields

    vehicleId: '',

    clientId: '',

    // New fields for /newApply endpoint

    isNewClient: true,

    isNewVehicle: true,

    // Payment Information

    amount: '',

    paymentInstructions: 'Please make your payment to one of the following:\nBank of Kigali: 100000129075 (SONARWA)\nOr via Momo Account: 051499 (SONARWA) \nOr Agency at Kimihurura (KBC) under SOLEKTRA',

    invoice: null,

    // Commission Information

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

  // Debug: Log a preview of the payload that will be sent via FormData (only on form submission)
  // Removed the useEffect that was causing infinite console logging

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
    insuranceDuration: { required: true },
    insuranceProvider: { required: true },
    vehicleType: { required: formData.insuranceCategory === 'Car Insurance' || formData.insuranceCategory === 'MotorBike Insurance' },
    vehicleAge: { required: formData.insuranceCategory === 'Car Insurance' || formData.insuranceCategory === 'MotorBike Insurance' },
    vehicleUse: { required: formData.insuranceCategory === 'Car Insurance' || formData.insuranceCategory === 'MotorBike Insurance' },
    otherVehicleUse: { required: formData.vehicleUse === 'Other' },
    nationalID: { required: true },
    yellowCard: { required: true },
    plateNumber: { required: formData.insuranceCategory === 'Car Insurance' || formData.insuranceCategory === 'MotorBike Insurance' },
    identificationDocumentType: { required: true },
    identificationNumber: { required: true },
    // Admin-specific required fields
    amount: { required: true },
    companyCommission: { required: true },
    administrationFees: { required: true },
    paymentInstructions: { required: true },
    transactionId: { required: true },
    proofOfPayment: { required: true },
    insuranceCertificate: { required: true },
    contract: { required: false },
    receipt: { required: false },
    ebm: { required: false },
  };

  // Calculate administration fees based on insurance category

  const calculateAdministrationFees = (insuranceCategory: string) => {
    const cat = insuranceCategory.toLowerCase();
    const isCarOrMoto = cat.includes('car') || cat.includes('motor') || cat.includes('moto');
    return Math.round((isCarOrMoto ? 2500 : 5000) * 0.25);
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

  const handleFileChange = useCallback((field: keyof ApplicationFormData) => (file: File | null) => {
    setFormData(prev => ({ ...prev, [field]: file }));

    // Clear validation error for this field on change
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  }, [errors]);

  // Memoized handlers for SearchInput components to prevent infinite loops
  const handleIdentificationNumberChange = useCallback((value: string) => {
    setFormData(prev => ({
      ...prev,
      identificationNumber: value,
      // Clear personal information fields on any edit to avoid stale data
      fullName: '',
      email: '',
      phoneNumber: '',
      dateOfBirth: '',
      address: '',
      province: '',
      district: '',
      sector: '',
      cell: '',
      village: ''
    }));

    // Reset dependent selects
    setAvailableDistricts([]);
    setAvailableSectors([]);
  }, []);

  const handlePlateNumberChange = useCallback((value: string) => {
    setFormData(prev => ({
      ...prev,
      plateNumber: value,
      // Clear vehicle information fields on any edit to avoid stale data
      vehicleType: '',
      vehicleAge: '',
      vehicleUse: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleYear: '',
      vehicleColor: '',
      vehicleEngineNumber: '',
      vehicleChassisNumber: '',
      // Clear insurance details on any edit to avoid stale data
      insuranceType: 'Comprehensive Insurance (covers everything)',
      insuranceDuration: '1 Month',
      insuranceProvider: 'SONARWA',
      isCOMESA: false
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    // Log form data when submit button is clicked (regardless of validation)

    const formDataToLog = {

      fullName: formData.fullName,

      email: formData.email,

      phoneNumber: formData.phoneNumber,

      address: formData.address,

      dateOfBirth: formData.dateOfBirth,

      province: formData.province,

      district: formData.district,

      sector: formData.sector,

      insuranceCategory: formData.insuranceCategory,

      insuranceType: formData.insuranceType,

      insuranceDuration: formData.insuranceDuration,

      insuranceProvider: formData.insuranceProvider,

      plateNumber: formData.plateNumber,

      identificationDocumentType: formData.identificationDocumentType,

      identificationNumber: formData.identificationNumber,

      vehicleType: formData.vehicleType,

      vehicleAge: formData.vehicleAge,

      vehicleUse: formData.vehicleUse,

      otherVehicleUse: formData.otherVehicleUse,

      isCOMESA: formData.isCOMESA,

      nationalID: formData.nationalID ? 'File selected' : null,

      yellowCard: formData.yellowCard ? 'File selected' : null,

      pastInsuranceCertificate: formData.pastInsuranceCertificate ? 'File selected' : null,

      // Add the missing fields for /newApply endpoint

      isNewClient: searchResults.isNewClient,

      isNewVehicle: searchResults.isNewVehicle,

    };

    console.log('Form Data on Submit:', formDataToLog);

    // Validate form

    const formErrors = validateForm(

      { ...formData, isCOMESA: formData.isCOMESA ? 'true' : 'false', isNewClient: formData.isNewClient ? 'true' : 'false', isNewVehicle: formData.isNewVehicle ? 'true' : 'false' },

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

        // Override isNewClient and isNewVehicle with searchResults

        formDataToSend.set('isNewClient', searchResults.isNewClient ? 'true' : 'false');

        formDataToSend.set('isNewVehicle', searchResults.isNewVehicle ? 'true' : 'false');

        // Add admin user info

        if (user) {

          formDataToSend.append('adminId', user._id);

          formDataToSend.append('adminName', user.fullName);

        }

        // Add tracking data

        if (trackingData) {

          formDataToSend.append('trackingData', JSON.stringify(trackingData));

        }

        const token = getTokenFromStorage();

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/applyAdmin`, {

          method: 'POST',

          body: formDataToSend,

          headers: {

            'Authorization': `Bearer ${token}`,

          },

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

            insuranceCategory: 'Car Insurance',

            insuranceType: 'Comprehensive Insurance (covers everything)',

            insuranceDuration: '1 Month',

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

            invoice: null,

            companyCommission: '',

            administrationFees: '',

            proofOfPayment: null,

            transactionId: '',

            insuranceCertificate: null,

            contract: null,

            receipt: null,

            ebm: null,

            status: ApplicationStatus.PENDING,

            insuranceEndAt: '',

            // Reset API response fields

            vehicleId: '',

            clientId: '',

            // Reset new fields for /newApply endpoint

            isNewClient: true,

            isNewVehicle: true,

          });

          setAvailableDistricts([]);

          setAvailableSectors([]);

          setErrors({});

          // Reset search results

          setSearchResults({

            isNewClient: true,

            isNewVehicle: true,

          });

          // Reset search input components to clear their messages

          setIdentificationNumberResetTrigger(prev => prev + 1);

          setPlateNumberResetTrigger(prev => prev + 1);

          setPhoneNumberResetTrigger(prev => prev + 1);

          // Reset all file inputs visually

          setFileResetTrigger(prev => prev + 1);

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

      <div className="container mx-auto px-4 py-8 max-w-full">

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

                    onChange={handleIdentificationNumberChange}

                    onSearchSuccess={handleIdentificationSearchSuccess}

                    onSearchResult={handleSearchResult}

                    searchType="identificationNumber"

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

                  <RwandaPhoneInput

                    label="Phone Number"

                    name="phoneNumber"

                    value={formData.phoneNumber}

                    onChange={(value) => {

                      setFormData(prev => ({ ...prev, phoneNumber: value }));

                      if (errors.phoneNumber) {

                        setErrors(prev => {

                          const newErrors = { ...prev };

                          delete newErrors.phoneNumber;

                          return newErrors;

                        });

                      }

                    }}

                    error={errors.phoneNumber}

                    required

                    resetTrigger={phoneNumberResetTrigger}

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

                      Province <span className="text-[var(--error-red)] ml-1">*</span>

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

                      District <span className="text-[var(--error-red)] ml-1">*</span>

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

                      Sector <span className="text-[var(--error-red)] ml-1">*</span>

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

                      <option value="Car Insurance">Car Insurance</option>

                      <option value="MotorBike Insurance">MotorBike Insurance</option>

                      <option value="Building Insurance">Building Insurance</option>

                      <option value="Travel Insurance">Travel Insurance</option>

                      <option value="Health Insurance">Health Insurance</option>

                      <option value="Fire Insurance Coverage">Fire Insurance Coverage</option>

                    </select>

                    {errors.insuranceCategory && (

                      <p className="mt-1 text-sm text-[var(--error-red)]">{errors.insuranceCategory}</p>

                    )}

                  </div>

                  {/* Plate Number Field - Only for Car/Motorbike */}

                  {(formData.insuranceCategory === 'Car Insurance' || formData.insuranceCategory === 'MotorBike Insurance') && (

                    <div>

                      <SearchInput

                        label="Plate Number"

                        name="plateNumber"

                        placeholder={formData.insuranceCategory === 'Car Insurance' ? 'e.g. RAA 123A' : 'e.g. RA 123A'}

                        value={formData.plateNumber}

                        onChange={handlePlateNumberChange}

                        onSearchSuccess={handlePlateSearchSuccess}

                        onSearchResult={handleSearchResult}

                        searchType="plateNumber"

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

                  {(formData.insuranceCategory === 'Car Insurance' || formData.insuranceCategory === 'MotorBike Insurance') && (

                    <div>

                      <label className="block text-sm font-medium mb-1">

                        Vehicle Type <span className="text-[var(--error-red)] ml-1">*</span>

                      </label>

                      <select

                        name="vehicleType"

                        value={formData.vehicleType}

                        onChange={handleInputChange}

                        className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"

                        required

                      >

                        <option value="">Select Vehicle Type</option>

                        {formData.insuranceCategory === 'Car Insurance' ? (

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

                  {(formData.insuranceCategory === 'Car Insurance' || formData.insuranceCategory === 'MotorBike Insurance') && (

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

                  {(formData.insuranceCategory === 'Car Insurance' || formData.insuranceCategory === 'MotorBike Insurance') && (

                    <>

                      <div>

                        <label className="block text-sm font-medium mb-1">

                          Vehicle Use <span className="text-[var(--error-red)] ml-1">*</span>

                        </label>

                        <select

                          name="vehicleUse"

                          value={formData.vehicleUse}

                          onChange={handleInputChange}

                          className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"

                          required

                        >

                          <option value="">Select Vehicle Use</option>

                          {formData.insuranceCategory === 'Car Insurance' ? (

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

                  {(formData.insuranceCategory === 'Car Insurance' || formData.insuranceCategory === 'MotorBike Insurance') && (

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

                      <option value="Comprehensive Insurance (covers everything)">Comprehensive Insurance (covers everything)</option>

                      <option value="Third Party Insurance (covers partial)">Third Party Insurance (covers partial)</option>

                    </select>

                    {errors.insuranceType && (

                      <p className="mt-1 text-sm text-[var(--error-red)]">{errors.insuranceType}</p>

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

                      value={formData.insuranceDuration}

                      onChange={handleInputChange}

                      className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"

                      required

                    >

                      <option value="1 Month">1 Month</option>

                      <option value="2 Months">2 Months</option>

                      <option value="3 Months">3 Months</option>

                      <option value="6 Months">6 Months</option>

                      <option value="9 Months">9 Months</option>

                      <option value="12 Months">12 Months</option>

                    </select>

                    {errors.insuranceDuration && (

                      <p className="mt-1 text-sm text-[var(--error-red)]">{errors.insuranceDuration}</p>

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

                    resetTrigger={fileResetTrigger}

                  />

                  <FileInput

                    label="Yellow Card"

                    name="yellowCard"

                    onChange={handleFileChange('yellowCard')}

                    error={errors.yellowCard}

                    required

                    accept="image/*,.pdf"

                    resetTrigger={fileResetTrigger}

                  />

                  <FileInput

                    label="Past Insurance Certificate (Optional)"

                    name="pastInsuranceCertificate"

                    onChange={handleFileChange('pastInsuranceCertificate')}

                    accept="image/*,.pdf"

                    className="md:col-span-2"

                    resetTrigger={fileResetTrigger}

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

                        min="0"

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

                        min="0"

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

                        min="0"

                        disabled

                        required

                      />

                      <p className="text-xs text-gray-500 mt-1">

                        {formData.insuranceCategory.toLowerCase().includes('motobike')

                          ? 'Calculated as 25% of 2500 RWF for MOTO insurance'

                          : 'Calculated as 25% of 5000 RWF for other insurance types'}

                      </p>

                    </div>

                  </div>

                  <div className="space-y-6">

                    <div>

                      <label className="block text-sm font-medium text-gray-700 mb-2">

                        Payment Instructions <span className="text-[var(--error-red)] ml-1">*</span>

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

                      <FileInput

                        label="Invoice File"

                        name="invoice"

                        onChange={handleFileChange('invoice')}

                        accept="image/*,.pdf"

                        resetTrigger={fileResetTrigger}

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

                    <FileInput

                      label="Proof of Payment"

                      name="proofOfPayment"

                      onChange={handleFileChange('proofOfPayment')}

                      error={errors.proofOfPayment}

                      required

                      accept="image/*,.pdf"

                      resetTrigger={fileResetTrigger}

                    />

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

                    <FileInput

                      label="Insurance Certificate"

                      name="insuranceCertificate"

                      onChange={handleFileChange('insuranceCertificate')}

                      error={errors.insuranceCertificate}

                      required

                      accept="image/*,.pdf"

                      resetTrigger={fileResetTrigger}

                    />

                  </div>

                  <div>

                    <FileInput

                      label="Contract"

                      name="contract"

                      onChange={handleFileChange('contract')}

                      error={errors.contract}

                      accept="image/*,.pdf"

                      resetTrigger={fileResetTrigger}

                    />

                  </div>

                  <div>

                    <FileInput

                      label="Receipt"

                      name="receipt"

                      onChange={handleFileChange('receipt')}

                      error={errors.receipt}

                      accept="image/*,.pdf"

                      resetTrigger={fileResetTrigger}

                    />

                  </div>

                  <div>

                    <FileInput

                      label="EBM"

                      name="ebm"

                      onChange={handleFileChange('ebm')}

                      error={errors.ebm}

                      accept="image/*,.pdf"

                      resetTrigger={fileResetTrigger}

                    />

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
