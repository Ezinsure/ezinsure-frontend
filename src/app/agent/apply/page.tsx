'use client';

import { useState, useEffect } from 'react';
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
import { rwandaProvinces } from '@/utils/rwanda-administrative';

// Device tracking utility types and functions
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
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    try {
      sessionStorage.setItem(storageKey, sessionId);
    } catch (error) {
      console.log('Failed to set session ID in storage:', error);
    }
  }
  
  return sessionId;
};

// Get complete tracking data
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

// Vehicle type and use options
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

export default function AgentApplyPage() {
  const { showToast, ToastContainer } = useToast();
  const [formKey, setFormKey] = useState(Date.now());
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);

  // State for administrative divisions
  const [availableDistricts, setAvailableDistricts] = useState<{name: string, sectors?: string[]}[]>([]);
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);

  const [formState, setFormState] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    dateOfBirth: '',
    province: '',
    district: '',
    sector: '',
    insuranceCategory: 'car',
    insuranceType: 'comprehensive',
    insuranceDuration: '12',
    vehicleType: '',
    vehicleAge: '',
    vehicleUse: '',
    otherVehicleUse: '',
    isCOMESA: false,
    nationalID: null as File | null, 
    yellowCard: null as File | null,
    pastInsuranceCertificate: null as File | null,
    insuranceProvider: 'SONARWA',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    vehicleType: { required: formState.insuranceCategory === 'car' || formState.insuranceCategory === 'motorbike' },
    vehicleAge: { required: formState.insuranceCategory === 'car' || formState.insuranceCategory === 'motorbike' },
    vehicleUse: { required: formState.insuranceCategory === 'car' || formState.insuranceCategory === 'motorbike' },
    otherVehicleUse: { required: formState.vehicleUse === 'Other' },
    isCOMESA: { required: true },
    nationalID: { required: true },
    yellowCard: { required: true },
    insuranceProvider: { required: true }, 
  };

  const getTokenFromStorage = () => {
    try {
      return sessionStorage.getItem('ezinsure_token');
    } catch (error) {
      console.error('Error accessing sessionStorage:', error);
      return null;
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

  // Update districts when province changes
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ 
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
    setFormState(prev => ({ 
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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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
    
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (name: string) => (file: File | null) => {
    setFormState(prev => ({ ...prev, [name]: file }));

    // Clear error when selecting file
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const formatInsuranceDuration = (duration: string) => {
    switch (duration) {
      case '1': return '1 Month';
      case '2': return '2 Montha';
      case '3': return '3 Months';
      case '6': return '6 Months';
      case '9': return '9 Months';
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
      case 'motorbike': return 'MotorBike Insurance';
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
    const formErrors = validateForm(
      { ...formState, isCOMESA: formState.isCOMESA ? 'true' : 'false' },
      validationRules
    );
    setErrors(formErrors);

    if (!hasErrors(formErrors)) {
      setIsSubmitting(true);

      try {
        const formData = new FormData();
        
        // Append basic information
        formData.append('fullName', formState.fullName);
        if (formState.email) {
          formData.append('email', formState.email);
        }
        formData.append('phoneNumber', formState.phoneNumber);
        formData.append('address', formState.address);
        formData.append('dateOfBirth', formState.dateOfBirth);
        formData.append('province', formState.province);
        formData.append('district', formState.district);
        formData.append('sector', formState.sector);
        formData.append('insuranceCategory', formatInsuranceCategory(formState.insuranceCategory));
        formData.append('insuranceType', formatInsuranceType(formState.insuranceType));
        formData.append('insuranceDuration', formatInsuranceDuration(formState.insuranceDuration));
        formData.append('insuranceProvider', formState.insuranceProvider);
        
        // Append vehicle details if applicable
        if (formState.insuranceCategory === 'car' || formState.insuranceCategory === 'motorbike') {
          formData.append('vehicleType', formState.vehicleType);
          formData.append('vehicleAge', formState.vehicleAge);
          
          // Handle vehicle use with "Other" option
          const vehicleUse = formState.vehicleUse === 'Other' 
            ? `Other - ${formState.otherVehicleUse}`
            : formState.vehicleUse;
          formData.append('vehicleUse', vehicleUse);
        }
        
        // Append COMESA status
        formData.append('isCOMESA', formState.isCOMESA.toString());
        
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

        // Append tracking data
        if (trackingData) {
          formData.append('trackingData', JSON.stringify(trackingData));
        }

        const token = getTokenFromStorage();

        if (!token) {
          showToast('Authentication required. Please login again.', 'error');
          return;
        }

        // Log FormData contents before sending
        // This will log all key-value pairs, including files (as File objects)
        // const formDataEntries = Array.from(formData.entries()).map(([key, value]) => {
        //   if (value instanceof File) {
        //     return [key, `File: ${value.name} (${value.type}, ${value.size} bytes)`];
        //   }
        //   return [key, value];
        // });
        // console.log('Submitting FormData:', Object.fromEntries(formDataEntries));

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/apply`, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Submission error:', errorData);
          throw new Error(errorData.error || 'Application submission failed');
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
          province: '',
          district: '',
          sector: '',
          insuranceCategory: 'car',
          insuranceType: 'comprehensive',
          insuranceDuration: '12',
          vehicleType: '',
          vehicleAge: '',
          vehicleUse: '',
          otherVehicleUse: '',
          isCOMESA: false,
          nationalID: null,
          yellowCard: null,
          pastInsuranceCertificate: null,
          insuranceProvider: 'SONARWA',
        });
        setAvailableDistricts([]);
        setAvailableSectors([]);
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
              Apply for Insurance (Agent)
            </h1>
            <p className="text-gray-600">
              Fill out the form below to apply for insurance on behalf of your client. Our team will
              review the application and get back to you shortly.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-[var(--main-blue)] to-[var(--secondary-blue)] text-white">
              <h2 className="text-xl font-semibold">Client Information</h2>
              <p className="opacity-80">
                Please provide accurate client information for faster processing
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
                  min={getDateLimits().min}
                  max={getDateLimits().max}
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

                {/* Province Select */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Province <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <select
                    name="province"
                    value={formState.province}
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
                    District <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <select
                    name="district"
                    value={formState.district}
                    onChange={handleInputChange}
                    disabled={!formState.province}
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
                    Sector <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <select
                    name="sector"
                    value={formState.sector}
                    onChange={handleInputChange}
                    disabled={!formState.district}
                    className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">Select Sector</option>
                    {availableSectors.map(sector => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                  {errors.sector && (
                    <p className="mt-1 text-sm text-[var(--error-red)]">{errors.sector}</p>
                  )}
                </div>

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
                    value={formState.insuranceProvider}
                    onChange={handleInputChange}
                    className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                    required
                  >
                    <option value="SONARWA">SONARWA</option>
                  </select>
                  {errors.insuranceProvider && (
                    <p className="mt-1 text-sm text-[var(--error-red)]">
                      {errors.insuranceProvider}
                    </p>
                  )}
                </div>

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
                    <option value="motorbike">MotorBike Insurance</option>
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

                {/* Vehicle Type (only shown for car/motorbike insurance) */}
                {(formState.insuranceCategory === 'car' || formState.insuranceCategory === 'motorbike') && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Vehicle Type <span className="text-[var(--error-red)]">*</span>
                    </label>
                    <select
                      name="vehicleType"
                      value={formState.vehicleType}
                      onChange={handleInputChange}
                      className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                      required
                    >
                      <option value="">Select Vehicle Type</option>
                      {formState.insuranceCategory === 'car' ? (
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
                {(formState.insuranceCategory === 'car' || formState.insuranceCategory === 'motorbike') && (
                  <div>
                    <Input
                      label="Vehicle Age (Year of Manufacture)"
                      type="number"
                      name="vehicleAge"
                      placeholder="e.g. 2015"
                      min="1900"
                      max={new Date().getFullYear().toString()}
                      value={formState.vehicleAge}
                      onChange={handleInputChange}
                      error={errors.vehicleAge}
                      required
                    />
                  </div>
                )}

                {/* Vehicle Use (only shown for car/motorbike insurance) */}
                {(formState.insuranceCategory === 'car' || formState.insuranceCategory === 'motorbike') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Vehicle Use <span className="text-[var(--error-red)]">*</span>
                      </label>
                      <select
                        name="vehicleUse"
                        value={formState.vehicleUse}
                        onChange={handleInputChange}
                        className="w-full py-2 px-3 rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                        required
                      >
                        <option value="">Select Vehicle Use</option>
                        {formState.insuranceCategory === 'car' ? (
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
                    {formState.vehicleUse === 'Other' && (
                      <div className="md:col-span-2">
                        <Input
                          label="Specify Vehicle Use"
                          name="otherVehicleUse"
                          placeholder="Please specify how you use your vehicle..."
                          value={formState.otherVehicleUse}
                          onChange={handleInputChange}
                          error={errors.otherVehicleUse}
                          required
                        />
                      </div>
                    )}
                  </>
                )}

                {/* COMESA Checkbox */}
                {(formState.insuranceCategory === 'car' || formState.insuranceCategory === 'motorbike') && (
                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="isCOMESA"
                      checked={formState.isCOMESA}
                      onChange={handleInputChange}
                      className="rounded h-4 border-gray-300 text-[var(--main-blue)] focus:ring-[var(--main-blue)]"
                    />
                    <span className="text-sm font-medium">
                      Ext. Territorial (COMESA)
                    </span>
                  </label>
                  {errors.isCOMESA && (
                    <p className="mt-1 text-sm text-[var(--error-red)]">{errors.isCOMESA}</p>
                  )}
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
                    <option value="2">2 Month</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="9">9 Months</option>
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
                    label="National ID Card / Passport"
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
              <li>Our team will review the application within the next 30 minutes.</li>
              <li>
                You will receive a confirmation email with the application
                number.
              </li>
              <li>
                Use the application number to track the application status.
              </li>
              <li>Once reviewed, you will receive a quotation and invoice.</li>
              <li>Follow the instructions in the invoice to pay for the insurance.</li>
              <li>After payment, submit a clear proof of payment (Any form of receipt)</li>
              <li>
                After payment confirmation, the insurance certificate will be
                issued and sent to you via Email or directly on WhatsApp.
              </li>
            </ol>
          </div>
        </div>
      </div>
      <ToastContainer />
    </MainLayout>
  );
}