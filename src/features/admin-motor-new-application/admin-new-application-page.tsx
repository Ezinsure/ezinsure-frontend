'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileInput } from '@/components/ui/file-input';
import { SearchInput } from '@/components/ui/search-input';
import { RwandaPhoneInput } from '@/components/ui/rwanda-phone-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { useApiClient } from '@/utils/apiClient';
import { rwandaProvinces } from '@/utils/rwanda-administrative';
import { formatErrorMessage } from '@/utils/error-formatter';
import { carUses, motoUses, carTypes, motoTypes } from '@/utils/vehicle-types';
import { ComboboxField } from '@/components/ui/combobox-field';
import {
  calculateAdministrationFeesRwf,
  calculateCommissionFromPercentage,
  isMotorVehicleInsuranceCategory,
  MOTOR_COMPANY_COMMISSION_RATE,
} from '@/utils/administration-fees';
import {
  validateForm,
  ValidationRules,
  validationPatterns,
  hasErrors,
} from '@/components/ui/form-validation';
import { validateInsuranceDuration, normalizeInsuranceDurationPayload } from '@/utils/insurance-duration';
import { InsuranceDurationField } from '@/components/ui/insurance-duration-field';
import { NumericInputField } from '@/components/ui/numeric-input-field';
import {
  getVehicleManufactureYearBounds,
  getVehicleManufactureYearValidationError,
} from '@/utils/vehicle-year';
import { getTrackingData } from '@/features/admin-motor-new-application/tracking';
import {
  ApplicationStatus,
  type AgentEmailRecord,
  type ApplicationFormData,
  type MassApplicationsUploadResponse,
  type TrackingData,
} from '@/features/admin-motor-new-application/types';
import type { Application } from '@/features/admin-motor-applications/types';
import {
  fetchMotorApplicationForRenewal,
  plateHasActiveMotorInsurance,
  submitRenewalApplication,
  type MotorRenewalApplicationPayload,
} from '@/features/renewals/renewal-api';
import { computeRenewalPricing } from '@/features/renewals/renewal-pricing';
import {
  isPolicyExpired,
  motorPlateBlockedReason,
  stillActivePolicyReason,
} from '@/features/renewals/renewal-eligibility';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import {
  mapMotorApplicationToAdminForm,
  originalMotorCoverEndDate,
  renewalPolicyDatesFromApplication,
  rwandaDistrictsForProvince,
  rwandaSectorsForDistrict,
} from '@/features/motor-renewal/map-application-to-admin-form';

export interface MotorRenewalConfig {
  applicationId: string;
  listHref: string;
  /** Staff sees financial fields read-only; agents use the same form without those fields. */
  audience: 'agent' | 'staff';
}

export interface AdminMotorApplicationPageProps {
  renewal?: MotorRenewalConfig;
}

export function AdminMotorApplicationPage({ renewal }: AdminMotorApplicationPageProps = {}) {
  const isRenewal = Boolean(renewal);
  const showStaffFinancialFields = !isRenewal || renewal?.audience === 'staff';
  const router = useRouter();
  const vehicleYearBounds = useMemo(() => getVehicleManufactureYearBounds(), []);
  const { showToast, ToastContainer } = useToast();
  const [viewingDocument, setViewingDocument] = useState<{ url: string; name: string } | null>(null);
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const { apiFetch } = useApiClient();
  const [renewalOriginal, setRenewalOriginal] = useState<Application | null>(null);
  const [renewalPolicyDates, setRenewalPolicyDates] = useState({
    policyStartDate: '',
    policyEndDate: '',
  });
  const [renewalAgentCommission, setRenewalAgentCommission] = useState('');
  const [renewalLoading, setRenewalLoading] = useState(Boolean(renewal));
  const [renewalLoadError, setRenewalLoadError] = useState<string | null>(null);

  // Fetch agents emails function
  const fetchAgentsEmails = useCallback(async () => {
    const response = await apiFetch('/getAgentsEmails', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch agents emails');
    }

    return await response.json();
  }, [apiFetch]);

  type ApplicationEntryMode = 'single' | 'mass';
  const [entryMode, setEntryMode] = useState<ApplicationEntryMode>('single');
  const [massAgentId, setMassAgentId] = useState<string | null>(null);
  const [massExcelFile, setMassExcelFile] = useState<File | null>(null);
  const [massFileResetTrigger, setMassFileResetTrigger] = useState(0);
  const [massFieldErrors, setMassFieldErrors] = useState<{ agent?: string; file?: string }>({});
  const [isMassUploading, setIsMassUploading] = useState(false);
  const [massUploadResult, setMassUploadResult] = useState<MassApplicationsUploadResponse | null>(null);

  const resetMassUploadForm = useCallback(() => {
    setMassAgentId(null);
    setMassExcelFile(null);
    setMassFieldErrors({});
    setMassUploadResult(null);
    setMassFileResetTrigger((n) => n + 1);
  }, []);

  const handleEntryModeChange = useCallback(
    (mode: ApplicationEntryMode) => {
      if (mode === 'single') {
        resetMassUploadForm();
      } else {
        setMassFieldErrors({});
        setMassUploadResult(null);
      }
      setEntryMode(mode);
    },
    [resetMassUploadForm],
  );

  const handleMassUploadSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setMassUploadResult(null);

      const nextErrors: { agent?: string; file?: string } = {};
      if (!massAgentId) {
        nextErrors.agent = 'Select the agent these applications will be credited to.';
      }
      if (!massExcelFile) {
        nextErrors.file = 'Choose an Excel spreadsheet (.xlsx or .xls).';
      } else if (!/\.(xlsx|xls)$/i.test(massExcelFile.name)) {
        nextErrors.file = 'Only .xlsx or .xls files are accepted.';
      }

      if (Object.keys(nextErrors).length > 0) {
        setMassFieldErrors(nextErrors);
        return;
      }

      setMassFieldErrors({});
      setIsMassUploading(true);

      try {
        const body = new FormData();
        body.append('file', massExcelFile as File);

        const response = await apiFetch(
          `/massApplicationsUpload?agentId=${encodeURIComponent(massAgentId as string)}`,
          { method: 'POST', body },
        );

        let payload: unknown = {};
        try {
          payload = await response.json();
        } catch {
          payload = {};
        }

        if (!response.ok) {
          const p = payload as { message?: string; error?: string };
          const msg = p.message || p.error || `Upload failed (${response.status})`;
          showToast(formatErrorMessage(msg), 'error');
          return;
        }

        const data = payload as MassApplicationsUploadResponse;
        setMassUploadResult(data);
        showToast(data.message || 'Mass upload complete', 'success');
        setMassExcelFile(null);
        setMassFileResetTrigger((n) => n + 1);
      } catch (err) {
        console.error('Mass upload error:', err);
        showToast(formatErrorMessage(err), 'error');
      } finally {
        setIsMassUploading(false);
      }
    },
    [apiFetch, massAgentId, massExcelFile, showToast],
  );

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
    isNewVehicle: false,   // Default to false - only set to true if search confirms vehicle doesn't exist
  });
  // Track if plate search just completed to prevent onChange from resetting isNewVehicle
  const plateSearchJustCompletedRef = useRef(false);
  // Track whether identification and plate searches have been performed
  const [hasFetchedIdentification, setHasFetchedIdentification] = useState(false);
  const [hasFetchedPlate, setHasFetchedPlate] = useState(false);

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

  // Helper functions for document types
  const getIdentificationDocumentLabel = (type: string) => {
    switch (type) {
      case 'nationalID': return 'National ID Number';
      case 'passport': return 'Passport Number';
      case 'drivingLicense': return 'Driving License Number';
      case 'plateNumber': return 'Plate Number';
      case 'tinNumber': return 'TIN Number';
      default: return 'National ID Number';
    }
  };

  const getIdentificationDocumentPlaceholder = (type: string) => {
    switch (type) {
      case 'nationalID': return 'e.g. 1234567890123456';
      case 'passport': return 'e.g. RN1234567';
      case 'drivingLicense': return 'e.g. DL123456789';
      case 'plateNumber': return 'e.g. RAA 123A';
      case 'tinNumber': return 'e.g. 123456789';
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
      clientId: (data.clientId as string) || prev.clientId,
      // Vehicle fields (if document type is plateNumber)
      vehicleId: (data.vehicleId as string) || prev.vehicleId,
      vehicleType: (data.vehicleType as string) || prev.vehicleType,
      vehicleAge: (data.vehicleAge as string) || prev.vehicleAge,
      vehicleUse: (data.vehicleUse as string) || prev.vehicleUse,
      otherVehicleUse: (data.otherVehicleUse as string) || prev.otherVehicleUse,
      plateNumber: (data.plateNumber as string) || prev.plateNumber,
      chasisNumber: (data.chasisNumber as string) || prev.chasisNumber,
      // Document URLs (for viewing existing documents)
      identificationDocumentUrl: (data.identificationDocumentUrl as string) || '',
      yellowCardUrl: (data.yellowCardUrl as string) || '',
      pastInsuranceCertificateUrl: (data.pastInsuranceCertificateUrl as string) || '',
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
    plateSearchJustCompletedRef.current = true;
    const usePlateAsClientId = formData.identificationDocumentType === 'plateNumber';

    setFormData(prev => ({
      ...prev,
      ...(usePlateAsClientId
        ? {
          fullName: (data.fullName as string) || prev.fullName,
          email: (data.email as string) || prev.email,
          phoneNumber: (data.phoneNumber as string) || prev.phoneNumber,
          address: (data.address as string) || prev.address,
          dateOfBirth: (data.dateOfBirth as string) || prev.dateOfBirth,
          province: (data.province as string) || prev.province,
          district: (data.district as string) || prev.district,
          sector: (data.sector as string) || prev.sector,
          identificationNumber: (data.identificationNumber as string) || prev.identificationNumber,
          identificationDocumentType: (data.identificationDocumentType as string) || prev.identificationDocumentType,
          clientId: (data.clientId as string) || prev.clientId,
          identificationDocumentUrl: (data.identificationDocumentUrl as string) || '',
          isNewClient: !!(data.clientId as string) ? false : prev.isNewClient,
        }
        : {}),
      vehicleType: (data.vehicleType as string) || prev.vehicleType,
      vehicleAge: (data.vehicleAge as string) || prev.vehicleAge,
      vehicleUse: (data.vehicleUse as string) || prev.vehicleUse,
      otherVehicleUse: (data.otherVehicleUse as string) || prev.otherVehicleUse,
      plateNumber: (data.plateNumber as string) || prev.plateNumber,
      chasisNumber: (data.chasisNumber as string) || prev.chasisNumber,
      vehicleId: (data.vehicleId as string) || prev.vehicleId,
      yellowCardUrl: (data.yellowCardUrl as string) || '',
      pastInsuranceCertificateUrl: (data.pastInsuranceCertificateUrl as string) || '',
      isNewVehicle: false,
    }));

    setSearchResults(prev => ({
      ...prev,
      isNewClient: usePlateAsClientId && data.clientId ? false : prev.isNewClient,
      isNewVehicle: false,
    }));

    setTimeout(() => {
      plateSearchJustCompletedRef.current = false;
    }, 100);

    if (usePlateAsClientId && data.province) {
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

  // Handle search results to track isNewClient and isNewVehicle (sync formData and searchResults)
  const handleSearchResult = (exists: boolean, searchType: 'plateNumber' | 'identificationNumber') => {
    const isNew = !exists;
    const key = searchType === 'identificationNumber' ? 'isNewClient' : 'isNewVehicle';

    setSearchResults(prev => ({
      ...prev,
      [key]: isNew,
      // When using plateNumber as identification document type,
      // an identification search also implies a vehicle existence check.
      ...(searchType === 'identificationNumber' && formData.identificationDocumentType === 'plateNumber'
        ? { isNewVehicle: isNew }
        : {}),
    }));

    setFormData(prev => ({
      ...prev,
      [key]: isNew,
      ...(searchType === 'identificationNumber' && formData.identificationDocumentType === 'plateNumber'
        ? { isNewVehicle: isNew }
        : {}),
    }));

    if (searchType === 'identificationNumber') {
      setHasFetchedIdentification(true);
      if (formData.identificationDocumentType === 'plateNumber') {
        // Only treat the plate as "fetched" from the identification search
        // when an existing record was found.
        setHasFetchedPlate(exists);
      }
    } else if (searchType === 'plateNumber') {
      setHasFetchedPlate(true);
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
    insuranceType: 'Third Party Insurance (covers partial)',
    insuranceDuration: '1 Month',
    insuranceProvider: 'SONARWA',
    isCOMESA: false,
    plateNumber: '',
    chasisNumber: '',
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

    // Document URLs from API (for viewing existing documents)

    identificationDocumentUrl: '',

    yellowCardUrl: '',

    pastInsuranceCertificateUrl: '',

    // New fields for /newApply endpoint

    isNewClient: true,

    isNewVehicle: false, // Default to false - only true if search confirms vehicle doesn't exist

    // Payment Information

    amount: '',
    netPremium: '',
    commissionPercentage: '',

    paymentInstructions: 'Please make your payment to one of the following:\nBank of Kigali: 100000129075 (SONARWA)\nOr via Momo Account: 051499 (SONARWA) \nOr Agency at Kimihurura (KBC) under SOLEKTRA',

    invoice: null,

    // Commission Information

    companyCommission: '',

    administrationFees: '',

    // Payment Verification

    proofOfPayment: null,

    transactionId: '',

    policeNumber: '',

    // Insurance Issuance

    insuranceCertificate: null,

    contract: null,

    receipt: null,

    ebm: null,

    // Status

    status: ApplicationStatus.PENDING,

    insuranceEndAt: '',

    // Agent Assignment
    wantsToAssignAgent: '',
    assignToAgent: '',
    // Default "yes" matches previous behaviour (charge when assigning to agent)
    deductAgentAssignmentCommission: 'yes',

  });

  const renewalPricing = useMemo(() => {
    if (!isRenewal) return null;
    const net = Number(formData.netPremium || formData.amount) || 0;
    const commission = Number(renewalAgentCommission) || 0;
    if (!net) return null;
    return computeRenewalPricing({ netPremium: net, agentCommission: commission });
  }, [formData.amount, formData.netPremium, isRenewal, renewalAgentCommission]);

  useEffect(() => {
    if (!renewal) return;
    let cancelled = false;
    setRenewalLoading(true);
    setRenewalLoadError(null);
    void fetchMotorApplicationForRenewal(apiFetch, renewal.applicationId)
      .then(async (app) => {
        if (cancelled) return;
        if (!app) {
          setRenewalLoadError('Original motor application could not be loaded.');
          setRenewalOriginal(null);
          return;
        }
        const coverEnd = originalMotorCoverEndDate(app);
        if (!isPolicyExpired(coverEnd)) {
          setRenewalLoadError(stillActivePolicyReason(coverEnd));
          setRenewalOriginal(null);
          return;
        }
        const plate = app.vehicle?.plateNumber;
        if (plate) {
          const active = await plateHasActiveMotorInsurance(apiFetch, plate, app._id);
          if (cancelled) return;
          if (active) {
            setRenewalLoadError(motorPlateBlockedReason(plate));
            setRenewalOriginal(null);
            return;
          }
        }
        const mapped = mapMotorApplicationToAdminForm(app);
        const dates = renewalPolicyDatesFromApplication(app);
        setRenewalOriginal(app);
        setRenewalPolicyDates({
          policyStartDate: dates.policyStartDate,
          policyEndDate: dates.policyEndDate,
        });
        setRenewalAgentCommission(
          app.agentCommission != null ? String(app.agentCommission) : '',
        );
        setFormData(mapped);
        setSearchResults({ isNewClient: false, isNewVehicle: false });
        setHasFetchedIdentification(true);
        setHasFetchedPlate(true);
        if (mapped.province) {
          const districts = rwandaDistrictsForProvince(mapped.province);
          setAvailableDistricts(districts);
          if (mapped.district) {
            setAvailableSectors(rwandaSectorsForDistrict(districts, mapped.district));
          }
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setRenewalLoadError(
          err instanceof Error ? err.message : 'Failed to load the original application.',
        );
      })
      .finally(() => {
        if (!cancelled) setRenewalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetch, renewal]);

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
    vehicleAge: {
      required: formData.insuranceCategory === 'Car Insurance' || formData.insuranceCategory === 'MotorBike Insurance',
      validate: (v) => {
        const err = getVehicleManufactureYearValidationError(v);
        return err === null ? true : err;
      },
    },
    vehicleUse: { required: formData.insuranceCategory === 'Car Insurance' || formData.insuranceCategory === 'MotorBike Insurance' },
    otherVehicleUse: { required: formData.vehicleUse === 'Other' },
    nationalID: { required: true },
    yellowCard: { required: true },
    plateNumber: { required: formData.insuranceCategory === 'Car Insurance' || formData.insuranceCategory === 'MotorBike Insurance' },
    identificationDocumentType: { required: true },
    identificationNumber: { required: true },
    // Admin-specific required fields
    amount: { required: !isRenewal },
    netPremium: { required: !isRenewal },
    commissionPercentage: {
      required: !isRenewal && !isMotorVehicleInsuranceCategory(formData.insuranceCategory),
    },
    companyCommission: { required: !isRenewal },
    administrationFees: { required: !isRenewal },
    paymentInstructions: { required: !isRenewal },
    transactionId: { required: !isRenewal },
    proofOfPayment: { required: !isRenewal },
    insuranceCertificate: { required: !isRenewal },
    contract: { required: false },
    receipt: { required: false },
    ebm: { required: false },
  };

  // Keep administration fees in sync with category + COMESA (read from `prev` to avoid stale values)
  useEffect(() => {
    setFormData((prev) => {
      if (!prev.insuranceCategory) return prev;
      const calculatedFees = calculateAdministrationFeesRwf(
        prev.insuranceCategory,
        Boolean(prev.isCOMESA),
      );
      const nextFees = calculatedFees.toString();
      if (prev.administrationFees === nextFees) return prev;
      return { ...prev, administrationFees: nextFees };
    });
  }, [formData.insuranceCategory, formData.isCOMESA]);

  useEffect(() => {
    setFormData((prev) => {
      const netPremium = Number(prev.netPremium || 0);
      if (!Number.isFinite(netPremium)) {
        if (prev.companyCommission === '') return prev;
        return { ...prev, companyCommission: '' };
      }

      const isVehicle = isMotorVehicleInsuranceCategory(prev.insuranceCategory);
      let computedCommission = '';
      if (isVehicle) {
        computedCommission = Math.round(netPremium * MOTOR_COMPANY_COMMISSION_RATE).toString();
      } else {
        const pct = Number(prev.commissionPercentage || 0);
        computedCommission = Number.isFinite(pct)
          ? calculateCommissionFromPercentage(netPremium, pct).toString()
          : '';
      }

      if (prev.companyCommission === computedCommission) {
        return prev;
      }
      return { ...prev, companyCommission: computedCommission };
    });
  }, [formData.netPremium, formData.commissionPercentage, formData.insuranceCategory]);

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

        // Always clear vehicle fields when client changes

        vehicleType: '',

        vehicleAge: '',

        vehicleUse: '',

        otherVehicleUse: '',

        plateNumber: '',
        chasisNumber: '',

        vehicleId: '',

        // Clear document URLs

        identificationDocumentUrl: '',

        yellowCardUrl: '',

        pastInsuranceCertificateUrl: '',

        // Reset flags for new search (will be updated by search result)

        isNewClient: true,

        isNewVehicle: false,

      }));

      setAvailableDistricts([]);

      setAvailableSectors([]);

      // Reset identification number search status

      setIdentificationNumberResetTrigger(prev => prev + 1);

      // Reset plate number search status

      setPlateNumberResetTrigger(prev => prev + 1);

      // Reset search-result flags when document type changes (sync with formData)

      setSearchResults({ isNewClient: true, isNewVehicle: false });

    }

    // Clear vehicle fields when insurance category changes

    else if (name === 'insuranceCategory') {

      setFormData((prev) => {
        const next = {
          ...prev,
          [name]: value,
    plateNumber: '',
    chasisNumber: '',
    vehicleType: '',
          vehicleAge: '',
          vehicleUse: '',
          otherVehicleUse: '',
          commissionPercentage: isMotorVehicleInsuranceCategory(String(value))
            ? ''
            : prev.commissionPercentage,
        };
        const fees = calculateAdministrationFeesRwf(String(value), Boolean(next.isCOMESA));
        return { ...next, administrationFees: fees.toString() };
      });

      // Reset plate number search status

      setPlateNumberResetTrigger((p) => p + 1);

    } else if (name === 'isCOMESA' && type === 'checkbox') {
      const nextComesa = Boolean((e.target as HTMLInputElement).checked);
      setFormData((prev) => {
        const fees = calculateAdministrationFeesRwf(prev.insuranceCategory, nextComesa);
        return {
          ...prev,
          isCOMESA: nextComesa,
          administrationFees: fees.toString(),
        };
      });
    } else {

      setFormData(prev => ({

        ...prev,

        [name]: type === 'checkbox' ? checked : value

      }));

    }

  };

  const allowedFileTypes = useMemo(
    () => [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'image/gif',
      'application/pdf'
    ],
    []
  );

  const handleFileChange = useCallback((field: keyof ApplicationFormData) => (file: File | null) => {
    if (file) {
      const mimeType = file.type?.toLowerCase();
      const fileName = file.name?.toLowerCase();
      const isAllowed =
        (mimeType && allowedFileTypes.includes(mimeType)) ||
        (!mimeType && /\.(png|jpe?g|gif|webp|pdf)$/i.test(fileName || ''));

      if (!isAllowed) {
        const message = 'Unsupported file type. Please upload an image or PDF document.';
        setErrors(prev => ({ ...prev, [field as string]: message }));
        showToast(message, 'error');
        setFileResetTrigger(prev => prev + 1);
        return;
      }
    }

    setFormData(prev => ({ ...prev, [field]: file }));

    // Clear validation error for this field on change
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  }, [allowedFileTypes, errors, showToast]);

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
      // Always clear vehicle fields when identification number changes (client changes)
      vehicleType: '',
      vehicleAge: '',
      vehicleUse: '',
      otherVehicleUse: '',
      plateNumber: '',
      vehicleId: '',
      // Clear document URLs
      identificationDocumentUrl: '',
      yellowCardUrl: '',
      pastInsuranceCertificateUrl: '',
    }));

    // Reset dependent selects
    setAvailableDistricts([]);
    setAvailableSectors([]);

    // Reset phone number input whenever identification number changes
    setPhoneNumberResetTrigger(prev => prev + 1);
    // Reset plate number input whenever identification number changes
    setPlateNumberResetTrigger(prev => prev + 1);
    // Reset isNewVehicle when identification number changes (sync formData and searchResults)
    setSearchResults(prev => ({ ...prev, isNewVehicle: false }));
    setFormData(prev => ({ ...prev, isNewVehicle: false }));
    // Identification search must be performed again
    setHasFetchedIdentification(false);
    if (formData.identificationDocumentType === 'plateNumber') {
      setHasFetchedPlate(false);
    }
  }, [formData.identificationDocumentType]);

  const handlePlateNumberChange = useCallback((value: string) => {
    // Don't reset isNewVehicle if a plate search just completed
    if (plateSearchJustCompletedRef.current) {
      // This is from a search result, just update the plate number without clearing fields
      setFormData(prev => ({ ...prev, plateNumber: value }));
      return;
    }

    setFormData((prev) => {
      const next = {
        ...prev,
        plateNumber: value,
        vehicleType: '',
        vehicleAge: '',
        vehicleUse: '',
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        vehicleColor: '',
        vehicleEngineNumber: '',
        vehicleChassisNumber: '',
        vehicleId: '',
        insuranceType: 'Third Party Insurance (covers partial)',
        insuranceDuration: '1 Month',
        insuranceProvider: 'SONARWA',
        isCOMESA: false,
        isNewVehicle: false,
        identificationDocumentUrl: '',
        yellowCardUrl: '',
        pastInsuranceCertificateUrl: '',
      };
      const fees = calculateAdministrationFeesRwf(next.insuranceCategory, false);
      return { ...next, administrationFees: fees.toString() };
    });

    setSearchResults((p) => ({ ...p, isNewVehicle: false }));
    // Require a fresh plate search before submit
    setHasFetchedPlate(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    // Validate form

    // Validate form - include document URLs for file validation
    const formDataForValidation = {
      ...formData,
      isCOMESA: formData.isCOMESA ? 'true' : 'false',
      isNewClient: formData.isNewClient ? 'true' : 'false',
      isNewVehicle: formData.isNewVehicle ? 'true' : 'false',
      // Include document URLs so validation can check them for file fields
      identificationDocumentUrl: formData.identificationDocumentUrl,
      yellowCardUrl: formData.yellowCardUrl,
      pastInsuranceCertificateUrl: formData.pastInsuranceCertificateUrl,
    };
    const formErrors = validateForm(formDataForValidation, validationRules);

    const durationErr = validateInsuranceDuration(formData.insuranceDuration);
    if (durationErr) {
      formErrors.insuranceDuration = durationErr;
    }

    // Custom validation for assignToAgent - required when wantsToAssignAgent is 'yes'
    if (formData.wantsToAssignAgent === 'yes' && !formData.assignToAgent) {
      formErrors.assignToAgent = 'Please select an agent to assign this application to';
    }

    setErrors(formErrors);

    // Business rule: require successful searches before submission
    const needsPlateSearch =
      (formData.insuranceCategory === 'Car Insurance' || formData.insuranceCategory === 'MotorBike Insurance') &&
      !(formData.identificationDocumentType === 'plateNumber' && hasFetchedIdentification);

    if (!hasFetchedIdentification) {
      showToast('Please search the identification document before submitting the application.', 'error');
      return;
    }

    if (needsPlateSearch && !hasFetchedPlate) {
      showToast('Please search the plate number before submitting the application.', 'error');
      return;
    }

    if (!hasErrors(formErrors)) {

      if (isRenewal && renewal && renewalOriginal) {
        setIsSubmitting(true);
        try {
          const coverEnd = originalMotorCoverEndDate(renewalOriginal);
          if (!isPolicyExpired(coverEnd)) {
            showToast(stillActivePolicyReason(coverEnd), 'error');
            return;
          }
          const plateToCheck = formData.plateNumber || renewalOriginal.vehicle?.plateNumber;
          if (plateToCheck) {
            const active = await plateHasActiveMotorInsurance(
              apiFetch,
              plateToCheck,
              renewalOriginal._id,
            );
            if (active) {
              showToast(motorPlateBlockedReason(plateToCheck), 'error');
              return;
            }
          }
          const vehicleUse =
            formData.vehicleUse === 'Other'
              ? `Other - ${formData.otherVehicleUse}`
              : formData.vehicleUse;
          const application: MotorRenewalApplicationPayload = {
            insuranceType: formData.insuranceType,
            insuranceCategory: formData.insuranceCategory,
            insuranceDuration: normalizeInsuranceDurationPayload(formData.insuranceDuration),
            insuranceProvider: formData.insuranceProvider,
            isCOMESA: formData.isCOMESA,
            policyStartDate: renewalPolicyDates.policyStartDate,
            policyEndDate: renewalPolicyDates.policyEndDate,
            insuranceEndAt: renewalPolicyDates.policyEndDate,
            client: {
              fullName: formData.fullName,
              email: formData.email,
              phoneNumber: formData.phoneNumber,
              dateOfBirth: formData.dateOfBirth,
              address: formData.address,
              nationalID: formData.identificationNumber,
              identificationDocumentType: formData.identificationDocumentType,
              identificationNumber: formData.identificationNumber,
              province: formData.province,
              district: formData.district,
              sector: formData.sector,
            },
            vehicle: {
              vehicleType: formData.vehicleType,
              vehicleAge: formData.vehicleAge,
              plateNumber: formData.plateNumber,
              chasisNumber: formData.chasisNumber,
              vehicleUse,
              otherVehicleUse: formData.otherVehicleUse,
            },
            amount: Number(formData.amount || formData.netPremium) || undefined,
            netPremium: Number(formData.netPremium || formData.amount) || undefined,
            agentCommission: Number(renewalAgentCommission) || undefined,
            companyCommission: Number(formData.companyCommission) || undefined,
            administrationFees: formData.administrationFees,
          };
          await submitRenewalApplication(apiFetch, {
            originalApplicationId: renewalOriginal._id,
            module: 'motor',
            application,
          });
          showToast('Renewal created successfully!', 'success');
          router.push(renewal.listHref);
        } catch (error) {
          console.error('Error creating renewal:', error);
          showToast(formatErrorMessage(error), 'error');
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      setIsSubmitting(true);

      try {

        const formDataToSend = new FormData();

        // Add all form fields

        Object.entries(formData).forEach(([key, value]) => {

          // Skip URL fields - we'll handle them separately
          if (key === 'identificationDocumentUrl' || key === 'yellowCardUrl' || key === 'pastInsuranceCertificateUrl') {
            return;
          }

          // Skip document file fields - we'll handle them separately to avoid duplicates
          if (key === 'nationalID' || key === 'yellowCard' || key === 'pastInsuranceCertificate') {
            return;
          }

          // Skip assign fields — handled explicitly with assignToAgent payload
          if (
            key === 'assignToAgent' ||
            key === 'wantsToAssignAgent' ||
            key === 'deductAgentAssignmentCommission'
          ) {
            return;
          }

          if (value instanceof File) {

            if (value) formDataToSend.append(key, value);

          } else if (value !== null && value !== undefined) {

            formDataToSend.append(key, value.toString());

          }

        });

        formDataToSend.set(
          'insuranceDuration',
          normalizeInsuranceDurationPayload(formData.insuranceDuration),
        );

        // Handle document URLs: use File if exists, otherwise use URL
        if (formData.nationalID instanceof File) {
          formDataToSend.append('nationalID', formData.nationalID);
        } else if (formData.identificationDocumentUrl) {
          formDataToSend.append('nationalID', formData.identificationDocumentUrl);
        }

        if (formData.yellowCard instanceof File) {
          formDataToSend.append('yellowCard', formData.yellowCard);
        } else if (formData.yellowCardUrl) {
          formDataToSend.append('yellowCard', formData.yellowCardUrl);
        }

        if (formData.pastInsuranceCertificate instanceof File) {
          formDataToSend.append('pastInsuranceCertificate', formData.pastInsuranceCertificate);
        } else if (formData.pastInsuranceCertificateUrl) {
          formDataToSend.append('pastInsuranceCertificate', formData.pastInsuranceCertificateUrl);
        }

        // Override isNewClient and isNewVehicle with searchResults

        formDataToSend.set('isNewClient', searchResults.isNewClient ? 'true' : 'false');

        // Debug: Log isNewVehicle before submission
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

        // Assign to agent + whether to deduct assignment charge from that agent's commission
        if (formData.wantsToAssignAgent === 'yes' && formData.assignToAgent) {
          formDataToSend.append('assignToAgent', formData.assignToAgent);
          formDataToSend.append(
            'deductAgentAssignmentCommission',
            formData.deductAgentAssignmentCommission === 'yes' ? 'true' : 'false',
          );
        }

        if (process.env.NEXT_PUBLIC_DEBUG_PAYLOAD === 'true') {
          const assignmentEntries = Array.from(formDataToSend.entries()).filter(
            ([k]) => k === 'assignToAgent' || k === 'deductAgentAssignmentCommission',
          );
          console.debug('applyAdmin assignment payload preview', {
            wantsToAssignAgent: formData.wantsToAssignAgent,
            assignToAgent: formData.assignToAgent,
            deductAgentAssignmentCommission: formData.deductAgentAssignmentCommission,
            assignmentEntries,
          });
        }

        const response = await apiFetch('/applyAdmin', {
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
            insuranceCategory: 'Car Insurance',
            insuranceType: 'Third Party Insurance (covers partial)',
            insuranceDuration: '1 Month',
            insuranceProvider: 'SONARWA',
            isCOMESA: false,
    plateNumber: '',
    chasisNumber: '',
    vehicleType: '',
            vehicleAge: '',
            vehicleUse: '',
            otherVehicleUse: '',
            nationalID: null,
            yellowCard: null,
            pastInsuranceCertificate: null,
    amount: '',
    netPremium: '',
    commissionPercentage: '',
    paymentInstructions: 'Please make your payment to one of the following:\nBank of Kigali: 100000129075 (SONARWA)\nOr via Momo Account: 051499 (SONARWA) \nOr Agency at Kimihurura (KBC) under SOLEKTRA',
            invoice: null,
            companyCommission: '',
            administrationFees: calculateAdministrationFeesRwf('Car Insurance', false).toString(),
            proofOfPayment: null,
            transactionId: '',
            policeNumber: '',
            insuranceCertificate: null,
            contract: null,
            receipt: null,
            ebm: null,
            status: ApplicationStatus.PENDING,
            insuranceEndAt: '',
            wantsToAssignAgent: '',
            assignToAgent: '',
            deductAgentAssignmentCommission: 'yes',

            // Reset API response fields
            vehicleId: '',
            clientId: '',
            // Reset document URLs
            identificationDocumentUrl: '',
            yellowCardUrl: '',
            pastInsuranceCertificateUrl: '',
            // Reset new fields for /newApply endpoint
            isNewClient: true,
            isNewVehicle: false, // Default to false - only true if search confirms vehicle doesn't exist
          });

          setAvailableDistricts([]);

          setAvailableSectors([]);

          setErrors({});

          // Reset search results

          setSearchResults({

            isNewClient: true,

            isNewVehicle: false, // Default to false - only true if search confirms vehicle doesn't exist

          });

          // Reset search fetch flags
          setHasFetchedIdentification(false);
          setHasFetchedPlate(false);

          // Reset search input components to clear their messages

          setIdentificationNumberResetTrigger(prev => prev + 1);

          setPlateNumberResetTrigger(prev => prev + 1);

          setPhoneNumberResetTrigger(prev => prev + 1);

          // Reset all file inputs visually

          setFileResetTrigger(prev => prev + 1);

        } else {

          const errorData = await response.json();

          let errorMessage = errorData.error || errorData.message || 'Failed to create application';
          if (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('duplicate key') && errorMessage.toLowerCase().includes('email')) {
            errorMessage = 'This email is already linked to another client. Please use a different email or retrieve the existing client via identification number.';
          }

          showToast(formatErrorMessage(errorMessage), 'error');

        }

      } catch (error) {

        console.error('Error creating application:', error);

        let errorMessage = formatErrorMessage(error);
        if (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('duplicate key') && errorMessage.toLowerCase().includes('email')) {
          errorMessage = 'This email is already linked to another client. Please use a different email or retrieve the existing client via identification number.';
        }

        showToast(errorMessage, 'error');

      } finally {

        setIsSubmitting(false);

      }

    } else {

      showToast('Please fix the errors below before submitting', 'error');

    }

  };

  if (isRenewal && renewalLoading) {
    return (
      <MainLayout>
        <div className="flex items-center gap-2 py-16 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading original policy…
        </div>
      </MainLayout>
    );
  }

  if (isRenewal && renewalLoadError) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <p className="font-semibold">Unable to open this renewal</p>
          <p className="mt-1 text-sm">{renewalLoadError}</p>
          {renewal && (
            <Button className="mt-4" variant="outline" onClick={() => router.push(renewal.listHref)}>
              Back to renewals
            </Button>
          )}
        </div>
      </MainLayout>
    );
  }

  return (

    <MainLayout containerClass="p-0" fullWidth>

      <div className="container mx-auto px-4 py-8 max-w-full">

        <div className="max-w-4xl mx-auto mt-16">

          <div className="mb-8 text-center">

            <h1 className="text-3xl md:text-4xl font-bold mb-4">

              {isRenewal
                ? `Renew ${renewalOriginal?.applicationNumber ?? 'application'}`
                : 'Create New Application'}

            </h1>

            <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">

              {isRenewal
                ? `Review and update the previous motor policy, then create the renewal. Previous cover ended ${renewalOriginal ? originalMotorCoverEndDate(renewalOriginal) || '—' : '—'}.`
                : entryMode === 'single'
                  ? 'Fill out the form below to create a new insurance application.'
                  : 'Upload a prepared Excel file to create multiple applications and assign them to one agent.'}

            </p>

            {isRenewal && renewalPricing && (
              <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-left text-sm text-blue-950">
                <p className="font-semibold">1% renewal discount</p>
                <p className="mt-1 text-xs text-blue-900/90">
                  Discount is 1% of net premium and is deducted from agent commission. The backend
                  recalculates the stored amounts when you submit.
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-blue-800/80">Expected payment</dt>
                    <dd className="font-semibold">
                      {formatRwfDisplay(renewalPricing.expectedPaymentAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-blue-800/80">Discount</dt>
                    <dd className="font-semibold">−{formatRwfDisplay(renewalPricing.discountAmount)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-blue-800/80">Agent commission after</dt>
                    <dd className="font-semibold">
                      {formatRwfDisplay(renewalPricing.agentCommissionAfterDiscount)}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">

            {!isRenewal && (
            <div
              className="flex border-b border-gray-200 bg-gray-50/80"
              role="tablist"
              aria-label="Choose how to create applications"
            >
              <button
                type="button"
                role="tab"
                aria-selected={entryMode === 'single'}
                id="tab-single-application"
                aria-controls="panel-single-application"
                onClick={() => handleEntryModeChange('single')}
                className={`flex-1 px-4 py-3.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--main-blue)] ${
                  entryMode === 'single'
                    ? 'bg-white text-[var(--main-blue)] border-b-2 border-[var(--main-blue)] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                }`}
              >
                Single application
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={entryMode === 'mass'}
                id="tab-mass-upload"
                aria-controls="panel-mass-upload"
                onClick={() => handleEntryModeChange('mass')}
                className={`flex-1 px-4 py-3.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--main-blue)] ${
                  entryMode === 'mass'
                    ? 'bg-white text-[var(--main-blue)] border-b-2 border-[var(--main-blue)] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                }`}
              >
                Mass upload (Excel)
              </button>
            </div>
            )}

            {(isRenewal || entryMode === 'single') ? (
            <form
              onSubmit={handleSubmit}
              className="p-6"
              id="panel-single-application"
              role="tabpanel"
              aria-labelledby="tab-single-application"
            >

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

                    <option value="plateNumber">Plate Number</option>

                    <option value="tinNumber">TIN Number</option>

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

                    identificationDocumentType={formData.identificationDocumentType}

                    required

                    resetTrigger={identificationNumberResetTrigger}

                  />

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <Input

                    label="Full Name"

                    name="fullName"

                    placeholder="John Doe"

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

              {/* Agent Assignment Section */}
              {!isRenewal && (
              <fieldset className="mb-8 border-2 border-[var(--main-blue)] rounded-lg p-6 bg-gray-50">
                <legend className="text-lg font-semibold text-[var(--main-blue)] px-3 bg-white border border-[var(--main-blue)] rounded-md">
                  Agent Assignment
                </legend>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Radio button question */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-3">
                      Do you want to assign this application to an agent?
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="wantsToAssignAgent"
                          value="yes"
                          checked={formData.wantsToAssignAgent === 'yes'}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              wantsToAssignAgent: e.target.value as 'yes' | 'no',
                              assignToAgent: e.target.value === 'no' ? '' : prev.assignToAgent,
                              deductAgentAssignmentCommission:
                                e.target.value === 'no' ? 'yes' : prev.deductAgentAssignmentCommission,
                            }));
                          }}
                          className="w-4 h-4 text-[var(--main-blue)] focus:ring-[var(--main-blue)]"
                        />
                        <span className="text-sm text-gray-700">Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="wantsToAssignAgent"
                          value="no"
                          checked={formData.wantsToAssignAgent === 'no'}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              wantsToAssignAgent: e.target.value as 'yes' | 'no',
                              assignToAgent: '',
                              deductAgentAssignmentCommission: 'yes',
                            }));
                          }}
                          className="w-4 h-4 text-[var(--main-blue)] focus:ring-[var(--main-blue)]"
                        />
                        <span className="text-sm text-gray-700">No</span>
                      </label>
                    </div>
                  </div>

                  {/* Agent selection - only show when Yes is selected */}
                  {formData.wantsToAssignAgent === 'yes' && (
                    <>
                      <div className="md:col-span-2">
                        <SearchableSelect
                          label="Assign to Agent"
                          name="assignToAgent"
                          placeholder="Type agent email to search..."
                          value={formData.assignToAgent || null}
                          onChange={(value) => {
                            setFormData(prev => ({
                              ...prev,
                              assignToAgent: value || '',
                            }));
                            if (value && errors.assignToAgent) {
                              setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.assignToAgent;
                                return newErrors;
                              });
                            }
                          }}
                          fetchOptions={fetchAgentsEmails}
                          getDisplayValue={(option) => option.email as string}
                          getSearchValue={(option) => option.email as string}
                          error={errors.assignToAgent}
                          required={true}
                          className="w-full"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-800 mb-2">
                          Apply admin-assignment charge to this agent?
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                          When the application was created by an admin and assigned to an agent who did not create it,
                          you can charge the usual assignment deduction from their commission, or allow full commission.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="deductAgentAssignmentCommission"
                              value="yes"
                              checked={formData.deductAgentAssignmentCommission === 'yes'}
                              onChange={() =>
                                setFormData((prev) => ({ ...prev, deductAgentAssignmentCommission: 'yes' }))
                              }
                              className="w-4 h-4 mt-0.5 text-[var(--main-blue)] focus:ring-[var(--main-blue)]"
                            />
                            <span className="text-sm text-gray-700">
                              <span className="font-medium">Yes</span> — apply charge (deduct assignment percentage from
                              commission)
                            </span>
                          </label>
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="deductAgentAssignmentCommission"
                              value="no"
                              checked={formData.deductAgentAssignmentCommission === 'no'}
                              onChange={() =>
                                setFormData((prev) => ({ ...prev, deductAgentAssignmentCommission: 'no' }))
                              }
                              className="w-4 h-4 mt-0.5 text-[var(--main-blue)] focus:ring-[var(--main-blue)]"
                            />
                            <span className="text-sm text-gray-700">
                              <span className="font-medium">No</span> — full commission (no assignment charge)
                            </span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </fieldset>
              )}

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

                        disabled={
                          formData.identificationDocumentType === 'plateNumber' &&
                          hasFetchedPlate &&
                          !searchResults.isNewClient
                        }

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

                      <ComboboxField
                        value={formData.vehicleType}
                        onChange={(val) => setFormData(prev => ({ ...prev, vehicleType: val }))}
                        options={/moto/i.test(formData.insuranceCategory) ? motoTypes : carTypes}
                        placeholder={/moto/i.test(formData.insuranceCategory) ? 'Search moto type…' : 'Search vehicle type…'}
                        required
                        error={errors.vehicleType}
                      />

                    </div>

                  )}

                  {/* Vehicle Age (only shown for car/motorbike insurance) */}

                  {(formData.insuranceCategory === 'Car Insurance' || formData.insuranceCategory === 'MotorBike Insurance') && (

                    <div>

                      <NumericInputField

                        label="Vehicle Age (Year of Manufacture)"

                        name="vehicleAge"

                        size="form"

                        placeholder="e.g. 2015"

                        value={formData.vehicleAge}

                        onChange={(v) => {

                          setFormData((prev) => ({ ...prev, vehicleAge: v }));

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

                      />

                    </div>

                  )}

                  {(formData.insuranceCategory === 'Car Insurance' || formData.insuranceCategory === 'MotorBike Insurance') && (

                    <div>

                      <Input

                        label="Chassis number"

                        name="chasisNumber"

                        placeholder="Enter vehicle chassis"

                        value={formData.chasisNumber}

                        onChange={handleInputChange}

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

                      <option value="Third Party Insurance (covers partial)">Third Party Insurance (covers partial)</option>

                      <option value="Comprehensive Insurance (covers everything)">Comprehensive Insurance (covers everything)</option>

                    </select>

                    {errors.insuranceType && (

                      <p className="mt-1 text-sm text-[var(--error-red)]">{errors.insuranceType}</p>

                    )}

                  </div>

                  <div className="md:col-span-2">

                    <InsuranceDurationField

                      id="insuranceDuration"

                      topLabel="Insurance duration"

                      value={formData.insuranceDuration}

                      onChange={(next) => {

                        setFormData((prev) => ({ ...prev, insuranceDuration: next }));

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

                  {isRenewal && (
                    <>
                      <div>
                        <Input
                          label="New policy start date"
                          name="policyStartDate"
                          type="date"
                          value={renewalPolicyDates.policyStartDate}
                          onChange={(e) =>
                            setRenewalPolicyDates((prev) => ({
                              ...prev,
                              policyStartDate: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Input
                          label="New policy end date"
                          name="policyEndDate"
                          type="date"
                          value={renewalPolicyDates.policyEndDate}
                          onChange={(e) =>
                            setRenewalPolicyDates((prev) => ({
                              ...prev,
                              policyEndDate: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    </>
                  )}

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

                    onChange={(file) => {
                      handleFileChange('nationalID')(file);
                      // Clear document URL when user selects a new file or clears it
                      setFormData(prev => ({ ...prev, identificationDocumentUrl: '' }));
                    }}

                    error={errors.nationalID}

                    required

                    accept="image/*,.pdf"

                    documentUrl={formData.identificationDocumentUrl}

                    onViewDocument={(url, name) => setViewingDocument({ url, name })}

                    resetTrigger={fileResetTrigger}

                  />

                  <FileInput

                    label="Yellow Card"

                    name="yellowCard"

                    onChange={(file) => {
                      handleFileChange('yellowCard')(file);
                      // Clear document URL when user selects a new file or clears it
                      setFormData(prev => ({ ...prev, yellowCardUrl: '' }));
                    }}

                    error={errors.yellowCard}

                    required

                    accept="image/*,.pdf"

                    documentUrl={formData.yellowCardUrl}

                    onViewDocument={(url, name) => setViewingDocument({ url, name })}

                    resetTrigger={fileResetTrigger}

                  />

                  <FileInput

                    label="Past Insurance Certificate (Optional)"

                    name="pastInsuranceCertificate"

                    onChange={(file) => {
                      handleFileChange('pastInsuranceCertificate')(file);
                      // Clear document URL when user selects a new file or clears it
                      setFormData(prev => ({ ...prev, pastInsuranceCertificateUrl: '' }));
                    }}

                    accept="image/*,.pdf"

                    className="md:col-span-2"

                    documentUrl={formData.pastInsuranceCertificateUrl}

                    onViewDocument={(url, name) => setViewingDocument({ url, name })}

                    resetTrigger={fileResetTrigger}

                  />

                </div>

              </div>

              {/* Payment & Commission Section */}
              {showStaffFinancialFields && (
              <fieldset className="mb-8 border-2 border-[var(--main-blue)] rounded-lg p-6 bg-gray-50">

                <legend className="text-lg font-semibold text-[var(--main-blue)] px-3 bg-white border border-[var(--main-blue)] rounded-md">

                  Payment & Commission Details

                </legend>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                  <div className="space-y-6">

                    <div>

                      <NumericInputField

                        label="Amount (RWF)"

                        name="amount"

                        value={formData.amount}

                        onChange={(v) => {
                          if (isRenewal) return;
                          setFormData((prev) => ({ ...prev, amount: v }));

                          if (errors.amount) {

                            setErrors((prev) => {

                              const next = { ...prev };

                              delete next.amount;

                              return next;

                            });

                          }

                        }}

                        placeholder="Enter amount"

                        error={errors.amount}

                        min={0}

                        maxDigits={12}

                        required

                        disabled={isRenewal}

                      />

                    </div>

                    <div>
                      <NumericInputField

                        label="Net Premium (RWF)"

                        name="netPremium"

                        value={formData.netPremium}

                        onChange={(v) => {
                          if (isRenewal) return;
                          setFormData((prev) => ({ ...prev, netPremium: v }));
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.netPremium;
                            delete next.companyCommission;
                            return next;
                          });
                        }}

                        placeholder="Enter net premium"

                        error={errors.netPremium}

                        min={0}

                        maxDigits={12}

                        required

                        disabled={isRenewal}

                      />
                    </div>

                    {isRenewal && (
                      <div>
                        <NumericInputField
                          label="Agent commission (RWF)"
                          name="agentCommission"
                          value={renewalAgentCommission}
                          onChange={() => {}}
                          placeholder="From previous policy"
                          min={0}
                          maxDigits={12}
                          disabled
                        />
                      </div>
                    )}

                    {!isMotorVehicleInsuranceCategory(formData.insuranceCategory) && (
                      <div>
                        <NumericInputField
                          label="Commission Percentage (%)"
                          name="commissionPercentage"
                          value={formData.commissionPercentage}
                          onChange={(v) => {
                            setFormData((prev) => ({ ...prev, commissionPercentage: v }));
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.commissionPercentage;
                              delete next.companyCommission;
                              return next;
                            });
                          }}
                          placeholder="e.g. 10"
                          error={errors.commissionPercentage}
                          min={0}
                          maxDigits={5}
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Used to calculate total commission from net premium for non-motor categories.
                        </p>
                      </div>
                    )}

                    <div>

                      <NumericInputField

                        label="Total Commission (RWF)"

                        name="companyCommission"

                        value={formData.companyCommission}

                        onChange={() => {}}

                        placeholder={
                          isMotorVehicleInsuranceCategory(formData.insuranceCategory)
                            ? 'Auto-calculated (10% of net premium)'
                            : 'Auto-calculated from commission %'
                        }

                        error={errors.companyCommission}

                        min={0}

                        maxDigits={12}

                        disabled

                        required

                      />

                    </div>

                    <div>

                      <NumericInputField

                        label="Administration Fees (RWF)"

                        name="administrationFees"

                        value={formData.administrationFees}

                        onChange={(v) => {

                          setFormData((prev) => ({ ...prev, administrationFees: v }));

                          if (errors.administrationFees) {

                            setErrors((prev) => {

                              const next = { ...prev };

                              delete next.administrationFees;

                              return next;

                            });

                          }

                        }}

                        placeholder="Administration fees (auto-calculated)"

                        error={errors.administrationFees}

                        min={0}

                        maxDigits={12}

                        disabled

                        required

                      />

                      <p className="text-xs text-gray-500 mt-1">
                        {(() => {
                          const cat = formData.insuranceCategory.toLowerCase();
                          const isVehicle =
                            cat.includes('car') ||
                            cat.includes('motor') ||
                            cat.includes('moto');
                          if (!isVehicle) {
                            return 'Flat 5,000 RWF for this insurance category.';
                          }
                          return formData.isCOMESA
                            ? 'Car / motor: 25% of 12,500 RWF (COMESA selected).'
                            : 'Car / motor: 25% of 2,500 RWF (COMESA not selected).';
                        })()}
                      </p>

                    </div>

                  </div>

                  {!isRenewal && (
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
                  )}

                </div>

              </fieldset>
              )}

              {/* Payment Verification Section */}
              {!isRenewal && (
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
              )}

              {/* Insurance Issuance Section */}
              {!isRenewal && (
              <fieldset className="mb-8 border-2 border-[var(--main-blue)] rounded-lg p-6 bg-gray-50">

                <legend className="text-lg font-semibold text-[var(--main-blue)] px-3 bg-white border border-[var(--main-blue)] rounded-md">

                  Insurance Documents

                </legend>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div className="md:col-span-2">

                    <Input

                      label="Police number"

                      name="policeNumber"

                      value={formData.policeNumber}

                      onChange={handleInputChange}

                      placeholder="Enter police / policy reference number (if available)"

                    />

                  </div>

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
              )}

              <div className="mt-8 flex justify-center gap-3">

                {isRenewal && renewal && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => router.push(renewal.listHref)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                )}

                <Button

                  type="submit"

                  variant="primary"

                  size="lg"

                  disabled={isSubmitting}

                  className="w-full md:w-auto min-w-[200px]"

                >

                  {isSubmitting
                    ? isRenewal
                      ? 'Creating renewal…'
                      : 'Creating Application...'
                    : isRenewal
                      ? 'Create renewal'
                      : 'Create Application'}

                </Button>

              </div>

            </form>
            ) : (
            <form
              onSubmit={handleMassUploadSubmit}
              className="p-6 space-y-8"
              id="panel-mass-upload"
              role="tabpanel"
              aria-labelledby="tab-mass-upload"
            >
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
                <p className="font-medium text-blue-950">Mass applications via spreadsheet</p>
                <p className="mt-1 text-blue-900/80 leading-relaxed">
                  Select the receiving agent, then upload the Excel file your back office has prepared.
                  All rows in the file will be created as applications under that agent&apos;s account.
                </p>
              </div>

              <div className="space-y-6 max-w-xl">
                <SearchableSelect<AgentEmailRecord>
                  label="Assign to agent"
                  name="massUploadAgentId"
                  placeholder="Search by agent email..."
                  value={massAgentId}
                  onChange={(value) => {
                    setMassAgentId(value);
                    if (value && massFieldErrors.agent) {
                      setMassFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.agent;
                        return next;
                      });
                    }
                  }}
                  fetchOptions={fetchAgentsEmails}
                  getDisplayValue={(option) => option.email}
                  getSearchValue={(option) => option.email}
                  error={massFieldErrors.agent}
                  required
                  className="w-full"
                />
                <p className="text-xs text-gray-500 -mt-2">
                  Agents are loaded from the same endpoint as single-application assignment: each entry is the
                  agent&apos;s user ID with their email (
                  <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px]">GET /getAgentsEmails</code>
                  ).
                </p>

                <FileInput
                  label="Excel file"
                  name="massApplicationsFile"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(file) => {
                    setMassExcelFile(file);
                    if (file && massFieldErrors.file) {
                      setMassFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.file;
                        return next;
                      });
                    }
                  }}
                  error={massFieldErrors.file}
                  required
                  resetTrigger={massFileResetTrigger}
                />
              </div>

              {massUploadResult && (
                <div
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm"
                  role="status"
                  aria-live="polite"
                >
                  <p className="font-semibold text-gray-900">{massUploadResult.message}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-gray-700 sm:max-w-md">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Created</dt>
                      <dd className="text-lg font-semibold text-gray-900">{massUploadResult.created}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Skipped</dt>
                      <dd className="text-lg font-semibold text-gray-900">{massUploadResult.skipped}</dd>
                    </div>
                  </dl>
                  {Array.isArray(massUploadResult.errors) && massUploadResult.errors.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Issues reported</p>
                      <ul className="mt-2 max-h-48 overflow-y-auto rounded border border-amber-200 bg-amber-50/50 p-2 text-xs text-amber-950 space-y-1.5 list-disc pl-4">
                        {massUploadResult.errors.map((item, idx) => (
                          <li key={idx}>
                            {typeof item === 'string'
                              ? item
                              : JSON.stringify(item)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button type="submit" variant="primary" size="lg" disabled={isMassUploading} className="min-w-[180px]">
                  {isMassUploading ? 'Uploading…' : 'Run mass upload'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetMassUploadForm}
                  disabled={isMassUploading}
                >
                  Reset form
                </Button>
              </div>
            </form>
            )}

          </div>

        </div>

      </div>

      <ToastContainer />
      {viewingDocument && (
        <DocumentViewer
          documentName={viewingDocument.name}
          documentPath={viewingDocument.url}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </MainLayout>
  );

}

export default function AdminNewApplicationPage() {
  return <AdminMotorApplicationPage />;
}
