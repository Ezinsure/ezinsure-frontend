'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { useAuth } from '@/context/AuthContext';
import { FileInput } from '@/components/ui/file-input';
import { rwandaProvinces } from '@/utils/rwanda-administrative';

interface Application {
  _id: string;
  applicationNumber: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: string;
  province?: string;
  district?: string;
  sector?: string;
  insuranceCategory: string;
  insuranceType: string;
  insuranceDuration: string;
  isCOMESA?: boolean;
  vehicleUse?: string;
  otherVehicleUse?: string;
  insuranceProvider?: string;
  vehicleType?: string;
  vehicleAge?: string;
  status: string;
  nationalID: string;
  yellowCard: string;
  pastInsuranceCertificate?: string;
  submittedAt: string;
  proofOfPayment?: string;
  insuranceCertificate?: string;
  invoiceId?: string;
  invoice?: string;
  invoiceAmount?: string;
  transactionId?: string;
  rejectionReason?: string;
  reasonForPaymentRejection?: string;
  amount?: number;
  agentCommission?: number;
  agentId?: string;
  agentFullName?: string;
  contract?: string;
  receipt?: string;
  ebm?: string;
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
  // Determine if this is a payment rejection case
  const isPaymentRejection = application.status === 'WAITING_FOR_USER_ACTION' && 
                           (application.reasonForPaymentRejection);

const [formState, setFormState] = useState<Partial<Application>>(() => {
  if (isPaymentRejection) {
    return {}; // Empty state for payment rejection case
  }
  
  // Parse vehicle use to handle "Other - [description]" format
  let vehicleUse = application.vehicleUse || '';
  let otherVehicleUse = application.otherVehicleUse || '';
  
  if (vehicleUse.startsWith('Other - ')) {
    otherVehicleUse = vehicleUse.substring(8); // Remove "Other - " prefix
    vehicleUse = 'Other';
  }
  
  return {
    fullName: application.fullName,
    email: application.email,
    phoneNumber: application.phoneNumber,
    address: application.address,
    dateOfBirth: application.dateOfBirth,
    insuranceCategory: application.insuranceCategory,
    
    insuranceDuration: application.insuranceDuration,
    vehicleType: application.vehicleType,
    vehicleAge: application.vehicleAge,
    province: application.province,
    district: application.district,
    sector: application.sector,
    vehicleUse: vehicleUse,
    otherVehicleUse: otherVehicleUse,
    isCOMESA: application.isCOMESA,
    insuranceProvider: application.insuranceProvider,
  };
});

  const [files, setFiles] = useState<Record<string, File | null>>({
    nationalID: null,
    yellowCard: null,
    pastInsuranceCertificate: null,
    proofOfPayment: null, // Added for payment rejection case
  });

  const [availableDistricts, setAvailableDistricts] = useState<{name: string, sectors?: string[]}[]>([]);
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const [transactionId, setTransactionId] = useState(''); // Added for payment rejection case

  // Initialize districts and sectors when component mounts or application changes
  useEffect(() => {
    if (!isPaymentRejection && application.province) {
      const selectedProvince = rwandaProvinces.find(p => p.name === application.province);
      const districts = selectedProvince?.districts || [];
      // Transform districts to match expected format
      const transformedDistricts = districts.map(district => ({
        name: district.name,
        sectors: district.sectors?.map(sector => sector.name) || []
      }));
      setAvailableDistricts(transformedDistricts);
      
      if (application.district) {
        const selectedDistrict = transformedDistricts.find(d => d.name === application.district);
        const sectors = selectedDistrict?.sectors || [];
        setAvailableSectors(sectors);
      }
    }
  }, [application.province, application.district, isPaymentRejection]);

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
        // Regular edit case - submit all changed fields
        const updatedData: { [key: string]: string | number | boolean } = {};
        
        Object.entries(formState).forEach(([key, value]) => {
          // Skip vehicleUse, otherVehicleUse, and isCOMESA as they are handled separately
          if (key === 'vehicleUse' || key === 'otherVehicleUse' || key === 'isCOMESA') {
            return;
          }
          
          const originalValue = application[key as keyof Application];
          
          if (value !== undefined && value !== originalValue && value !== '') {
            const formattedValue = key === 'dateOfBirth' && value 
              ? new Date(value as string).toISOString().split('T')[0]
              : value;
            
            formData.append(key, formattedValue as string);
            updatedData[key as keyof Application] = formattedValue;
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
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                  accept="image/*,.pdf"
                  currentFile={application.proofOfPayment?.split('/').pop()}
                  required
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Full Name"
                    name="fullName"
                    value={formState.fullName || ''}
                    onChange={handleInputChange}
                    error={errors.fullName}
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    name="email"
                    value={formState.email || ''}
                    onChange={handleInputChange}
                    error={errors.email}
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

                  <div>
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
</div>



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
                    <label className="block text-sm font-medium mb-1">
                      Insurance Duration <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="insuranceDuration"
                      value={formState.insuranceDuration || ''}
                      onChange={handleInputChange}
                      className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    >
                      <option value="1 Month">1 Month</option>
                      <option value="2 Months">2 Months</option>
                      <option value="3 Months">3 Months</option>
                      <option value="6 Months">6 Months</option>
                      <option value="9 Months">9 Months</option>
                      <option value="12 Months">12 Months</option>
                    </select>
                    {errors.insuranceDuration && (
                      <p className="mt-1 text-sm text-red-600">{errors.insuranceDuration}</p>
                    )}
                  </div>

                  {(formState.insuranceCategory === 'Car Insurance' || formState.insuranceCategory === 'MotorBike Insurance') && (
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

{(formState.insuranceCategory === 'Car Insurance' || formState.insuranceCategory === 'MotorBike Insurance') && (
  <>
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

<div className="flex items-center">
  <input
    type="checkbox"
    name="isCOMESA"
    checked={formState.isCOMESA || false}
    onChange={(e) => setFormState(prev => ({ ...prev, isCOMESA: e.target.checked }))}
    className="h-4 w-4 rounded border-gray-300 text-[var(--main-blue)] focus:ring-[var(--main-blue)]"
  />
  <label className="ml-2 block text-sm text-gray-700">
    COMESA Coverage
  </label>
</div>
  </>
)}
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FileInput
                      label="National ID Card / Passport"
                      name="nationalID"
                      onChange={handleFileChange('nationalID')}
                      error={errors.nationalID}
                      accept="image/*,.pdf"
                      currentFile={application.nationalID?.split('/').pop()}
                    />

                    <FileInput
                      label="Yellow Card"
                      name="yellowCard"
                      onChange={handleFileChange('yellowCard')}
                      error={errors.yellowCard}
                      accept="image/*,.pdf"
                      currentFile={application.yellowCard?.split('/').pop()}
                    />

                    <FileInput
                      label="Past Insurance Certificate (Optional)"
                      name="pastInsuranceCertificate"
                      onChange={handleFileChange('pastInsuranceCertificate')}
                      accept="image/*,.pdf"
                      currentFile={application.pastInsuranceCertificate?.split('/').pop()}
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
  const { token } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | string>('all');
  const [viewingDocument, setViewingDocument] = useState<{
    name: string;
    path: string;
  } | null>(null);
  // const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 10;
  const [activeModal, setActiveModal] = useState<ModalType>('none');

  const fetchApplications = async () => {
  try {
    setIsLoading(true);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getApplicationsByAgent`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch applications');
    }
    
    const data = await response.json();

    // console.log(data);
    // Sort applications by submittedAt in descending order (newest first)
    const sortedApplications = data.data.sort((a: Application, b: Application) => {
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
    setApplications(sortedApplications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    showToast('Failed to load applications', 'error');
  } finally {
    setIsLoading(false);
  }
};

  // Fetch applications for the agent
useEffect(() => {
  if (token) {
    fetchApplications();
  }
}, [token]);

  // Filter applications based on search query and tab
  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicationNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === 'all' || app.status.toLowerCase() === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle payment proof submission
const handleSubmitPayment = async () => {
  if (!selectedApp || !paymentProof || !transactionId) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  setIsLoading(true);
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
    // Instead of manually updating, refetch all applications
    await fetchApplications();
    
    setPaymentProof(null);
    setTransactionId('');
    setSelectedApp(null);
    setActiveModal('none');
  } catch (error) {
    console.error('Error submitting payment proof:', error);
    showToast(error instanceof Error ? error.message : 'Failed to submit payment proof', 'error');
  } finally {
    setIsLoading(false);
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

  // Get status badge based on application status
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Pending</span>;
      case 'application_approved':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Approved</span>;
      case 'waiting_for_user_action':
        return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">Action Required</span>;
      case 'invoice_sent':
        return <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">Invoice Sent</span>;
      case 'review_payment':
        return <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">Payment Review</span>;
      case 'payment_verified':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Payment Verified</span>;
      case 'insurance_issued':
        return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">Insurance Issued</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">Unknown</span>;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
      {app.status.toLowerCase() === 'waiting_for_user_action' && (
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

      {app.status.toLowerCase() === 'invoice_sent' && (
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

      {app.status.toLowerCase() === 'insurance_issued' && (
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
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
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
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="w-full md:w-1/3">
              <Input
                label=""
                name="search"
                placeholder="Search by name, email or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                }
              />
            </div>
            
            <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2">
              <Button
                size="sm"
                variant={activeTab === 'all' ? 'primary' : 'text'}
                onClick={() => setActiveTab('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'pending' ? 'primary' : 'text'}
                onClick={() => setActiveTab('pending')}
              >
                Pending
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'application_approved' ? 'primary' : 'text'}
                onClick={() => setActiveTab('application_approved')}
              >
                Approved
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'invoice_sent' ? 'primary' : 'text'}
                onClick={() => setActiveTab('invoice_sent')}
              >
                Invoice Sent
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'waiting_for_user_action' ? 'primary' : 'text'}
                onClick={() => setActiveTab('waiting_for_user_action')}
              >
                Action Required
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'insurance_issued' ? 'primary' : 'text'}
                onClick={() => setActiveTab('insurance_issued')}
              >
                Completed
              </Button>
            </div>
          </div>
        </div>

        {/* Applications table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden fade-in">
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insurance Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insurance End Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                          {app.fullName}
                        </div>
                        <div className="text-sm text-gray-500">{app.phoneNumber}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">
                          {app.insuranceCategory}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {app.insuranceEndAt ? new Date(app.insuranceEndAt).toLocaleDateString() : 'N/A'}
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
              Upload Payment Proof for {selectedApp.fullName}
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
                  onChange={setPaymentProof}
                  accept="image/*,.pdf"
                  currentFile={selectedApp.proofOfPayment?.split('/').pop()}
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
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitPayment}
                  disabled={!paymentProof || !transactionId || isLoading}
                >
                  {isLoading ? 'Submitting...' : 'Submit Payment'}
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
                  <p className="font-semibold">{selectedApp.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-semibold">{selectedApp.email ? selectedApp.email : 'Empty'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-semibold">{selectedApp.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-semibold">{formatDate(selectedApp.dateOfBirth)}</p>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-semibold">{selectedApp.address}</p>
                </div>
                {selectedApp.province && (
                  <div>
                    <p className="text-sm text-gray-500">Province</p>
                    <p className="font-semibold">{selectedApp.province}</p>
                  </div>
                )}
                {selectedApp.district && (
                  <div>
                    <p className="text-sm text-gray-500">District</p>
                    <p className="font-semibold">{selectedApp.district}</p>
                  </div>
                )}
                {selectedApp.sector && (
                  <div>
                    <p className="text-sm text-gray-500">Sector</p>
                    <p className="font-semibold">{selectedApp.sector}</p>
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
                    <p className="font-semibold">{new Date(selectedApp.insuranceEndAt).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Agent</p>
                  <p className="font-semibold">{selectedApp.agentFullName || selectedApp.agentId || 'Client'}</p>
                </div>
                {selectedApp.amount && (
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-semibold">{selectedApp.amount.toLocaleString()} RWF</p>
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
    {selectedApp.vehicleType && (
      <div>
        <p className="text-sm text-gray-500">Vehicle Type</p>
        <p className="font-semibold">{selectedApp.vehicleType}</p>
      </div>
    )}
    {selectedApp.vehicleAge && (
      <div>
        <p className="text-sm text-gray-500">Vehicle Year</p>
        <p className="font-semibold">{selectedApp.vehicleAge}</p>
      </div>
    )}
    {selectedApp.vehicleUse && (
      <div>
        <p className="text-sm text-gray-500">Vehicle Use</p>
        <p className="font-semibold">
          {selectedApp.vehicleUse === 'Other' 
            ? selectedApp.otherVehicleUse 
            : selectedApp.vehicleUse}
        </p>
      </div>
    )}
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
                    path: selectedApp.nationalID
                  })}
                >
                  <p className="text-sm font-medium">National ID / Passport</p>
                  <p className="text-xs text-gray-500">View Document</p>
                </button>
                
                <button 
                  className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                  onClick={() => setViewingDocument({
                    name: 'Yellow Card',
                    path: selectedApp.yellowCard
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