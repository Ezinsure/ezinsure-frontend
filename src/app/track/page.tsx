'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileInput } from '@/components/ui/file-input';
import { useToast } from '@/components/ui/toast';
import { rwandaProvinces } from '@/utils/rwanda-administrative';
import { DocumentViewer } from '@/components/ui/document-viewer';

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
  vehicleType?: string;
  vehicleAge?: string;
  status: string;
  nationalID: string;
  yellowCard: string;
  pastInsuranceCertificate: string | null;
  agentId: string | null;
  submittedAt: string;
  rejectionReason?: string;
  reasonForPaymentRejection: string;
  proofOfPayment?: string;
  otp?: string;
  otpExpires?: string;
  amount?: number;
  paymentInstructions?: string;
  companyCommission?: number;
  agentCommission?: number;
  insuranceCertificate?: string;
  invoiceId?: string;
  invoice?: string;
  invoiceAmount?: string;
  insuranceProvider: string;
  transactionId?: string;
}

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otp: string) => void;
  email: string;
  isLoading: boolean;
}

const OTPModal = ({ isOpen, onClose, onVerify, email, isLoading }: OTPModalProps) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const { showToast } = useToast();

  // Reset OTP fields when modal opens
  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '', '', '']);
      showToast(`OTP sent to your email: ${email}`, 'success');
    }
  }, [isOpen]); // Removed email and showToast from dependencies to prevent infinite loops

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOTP = () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      showToast('Please enter the complete 6-digit OTP', 'error');
      return;
    }
    onVerify(otpValue);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Verify Your Identity</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold mb-2">Enter Verification Code</h4>
              <p className="text-gray-600 text-sm mb-2">
                We&apos;ve sent a 6-digit code to your email:
              </p>
              <p className="text-sm font-medium text-blue-600">{email}</p>
              <p className="text-sm text-gray-500 mt-2">The code will expire in 2 minutes</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center space-x-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-lg font-bold border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors"
                  />
                ))}
              </div>

              <Button
                onClick={handleVerifyOTP}
                disabled={otp.join('').length !== 6 || isLoading}
                className="w-full"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EditApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application;
  onSave?: (updatedData: Partial<Application>, files: Record<string, File | null>) => Promise<void>;
  isLoading: boolean;
}


interface EditApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application;
  onSave?: (updatedData: Partial<Application>, files: Record<string, File | null>) => Promise<void>;
  isLoading: boolean;
}

const EditApplicationModal = ({ isOpen, onClose, onSave, application, isLoading }: EditApplicationModalProps) => {
  const isInvoiceSent = application.status === 'INVOICE_SENT' || (application.status === 'WAITING_FOR_USER_ACTION' && application.reasonForPaymentRejection);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  // State for administrative divisions
  const [availableDistricts, setAvailableDistricts] = useState<{name: string, sectors?: string[]}[]>([]);
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);
  const [transactionId, setTransactionId] = useState('');


  const [formState, setFormState] = useState<Partial<Application>>(() => {
    if (isInvoiceSent) {
      return {};
    }
    return {
      fullName: application.fullName,
      email: application.email,
      phoneNumber: application.phoneNumber,
      address: application.address,
      dateOfBirth: application.dateOfBirth,
      insuranceCategory: application.insuranceCategory,
      insuranceType: application.insuranceType,
      insuranceDuration: application.insuranceDuration,
      vehicleType: application.vehicleType,  
      vehicleAge: application.vehicleAge, 
      province: application.province,
      district: application.district,
      sector: application.sector,
      insuranceProvider: application.insuranceProvider,
    };
  });

  const [files, setFiles] = useState<Record<string, File | null>>(() => {
    if (isInvoiceSent) {
      return { 
        proofOfPayment: null, 
        nationalID: null, 
        yellowCard: null, 
        pastInsuranceCertificate: null 
      };
    }
    return {
      proofOfPayment: null,
      nationalID: null,
      yellowCard: null,
      pastInsuranceCertificate: null,
    };
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Update districts when province changes
  useEffect(() => {
    if (formState.province) {
      const selectedProvince = rwandaProvinces.find(p => p.name === formState.province);
      const districts = selectedProvince?.districts || [];
      setAvailableDistricts(districts);
      
      // Reset district and sector if they're not in the new province
      if (!districts.some(d => d.name === formState.district)) {
        setFormState(prev => ({ ...prev, district: '', sector: '' }));
      }
    } else {
      setAvailableDistricts([]);
      setFormState(prev => ({ ...prev, district: '', sector: '' }));
    }
  }, [formState.province]);

  // Update sectors when district changes
  useEffect(() => {
    if (formState.district) {
      const selectedDistrict = availableDistricts.find(d => d.name === formState.district);
      const sectors = selectedDistrict?.sectors || [];
      setAvailableSectors(sectors);
      
      // Reset sector if it's not in the new district
      if (!sectors.includes(formState.sector || '')) {
        setFormState(prev => ({ ...prev, sector: '' }));
      }
    } else {
      setAvailableSectors([]);
      setFormState(prev => ({ ...prev, sector: '' }));
    }
  }, [formState.district, availableDistricts]);

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
      if (isInvoiceSent) {
        if (!files.proofOfPayment || !transactionId) {
          throw new Error('Please select a proof of payment file');
        }

        const paymentFormData = new FormData();
        paymentFormData.append('proofOfPayment', files.proofOfPayment);
        paymentFormData.append('transactionId', transactionId);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/sendProofofPayment/${application._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: paymentFormData,
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to submit proof of payment');
        }
  showToast('Application updated successfully!', 'success');
        if (onSave) {
          await onSave({ proofOfPayment: files.proofOfPayment.name, transactionId }, { proofOfPayment: files.proofOfPayment });
        }
      
      onClose();
        return;
      }

      const formData = new FormData();
      const updatedData: { [key: string]: string | number } = {};
      const updatedFiles: Record<string, File | null> = {};
      
      Object.entries(formState).forEach(([key, value]) => {
        const originalValue = application[key as keyof Application];
        if (value !== undefined && value !== originalValue) {
          const formattedValue = key === 'dateOfBirth' && value 
            ? new Date(value as string).toISOString().split('T')[0]
            : value;
          
          formData.append(key, formattedValue as string);
          if (formattedValue !== undefined && formattedValue !== null) {
            updatedData[key as keyof Application] = formattedValue;
          }
        }
      });

      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          formData.append(key, file);
          updatedFiles[key] = file;
        }
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/updateInsuranceApplication/${application._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json',
        },
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update application');
      }

      showToast('Application updated successfully!', 'success');
      
      if (onSave) {
        await onSave(updatedData, updatedFiles);
      }
      
      onClose();
    } catch (error) {
      console.error('Submission error:', error);
      let errorMessage = 'Failed to submit. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      showToast(errorMessage, 'error');
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
              {isInvoiceSent ? 'Upload Proof of Payment' : 'Edit Application'}
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

          {application.status === "WAITING_FOR_USER_ACTION" && (application.rejectionReason || application.reasonForPaymentRejection) && (
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
                    <p>{application.rejectionReason || application.reasonForPaymentRejection}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isInvoiceSent ? (
              <div className="space-y-6">
                <Input
      label="Transaction ID"
      name="transactionId"
      value={transactionId}
      onChange={(e) => setTransactionId(e.target.value)}
      error={errors.transactionId}
      placeholder="Enter your payment transaction ID"
    />
                <FileInput
                  label="Proof of Payment"
                  name="proofOfPayment"
                  onChange={handleFileChange('proofOfPayment')}
                  error={errors.proofOfPayment}
                  accept="image/*,.pdf"
                  currentFile={application.proofOfPayment?.split('/').pop()}
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
    value={formState.insuranceProvider || ''}
    onChange={handleInputChange}
    className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
  >
    <option value="SONARWA">SONARWA</option>
  </select>
  {errors.insuranceProvider && (
    <p className="mt-1 text-sm text-red-600">{errors.insuranceProvider}</p>
  )}
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
                      <option value="6 Months">6 Months</option>
                      <option value="12 Months">12 Months</option>
                    </select>
                    {errors.insuranceDuration && (
                      <p className="mt-1 text-sm text-red-600">{errors.insuranceDuration}</p>
                    )}
                  </div>
{(formState.insuranceCategory === 'Car Insurance' || formState.insuranceCategory === 'Motorbike Insurance') && (
  <>
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
          <>
            <option value="pickup">Pick Up</option>
            <option value="taxi">Taxi</option>
            <option value="truck">Truck</option>
            <option value="sedan">Sedan</option>
            <option value="suv">SUV</option>
          </>
        ) : (
          <>
            <option value="moped">Moped</option>
            <option value="scooter">Scooter</option>
            <option value="motorcycle">Motorcycle</option>
          </>
        )}
      </select>
      {errors.vehicleType && (
        <p className="mt-1 text-sm text-red-600">{errors.vehicleType}</p>
      )}
    </div>
    <div>
      <label className="block text-sm font-medium mb-1">
        Vehicle Year <span className="text-red-500">*</span>
      </label>
      <input
        type="number"
        name="vehicleAge"
        min="1900"
        max={new Date().getFullYear()}
        value={formState.vehicleAge || ''}
        onChange={handleInputChange}
        className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
      />
      {errors.vehicleAge && (
        <p className="mt-1 text-sm text-red-600">{errors.vehicleAge}</p>
      )}
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

export default function TrackApplicationPage() {
  const { showToast, ToastContainer } = useToast();
  const [applicationId, setApplicationId] = useState('');
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [tempApplication, setTempApplication] = useState<Pick<Application, 'email'> | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{
  name: string;
  path: string;
} | null>(null);

const handleViewDocument = (name: string, path: string) => {
  setViewingDocument({ name, path });
};

// Fixed lookupApplication function
const lookupApplication = async (id: string) => {
  setIsLoading(true);
  try {
    const formData = new URLSearchParams();
    formData.append('applicationNumber', id);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/trackApplication`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Handle error responses
      if (response.status === 404 || data.message?.includes('not found')) {
        throw new Error('Application not found. Please check your application number and try again.');
      }
      throw new Error(data.message || 'Failed to verify application. Please try again.');
    }
    
    // Check if OTP is required (successful response with OTP message)
    if (data.message && data.message.includes('OTP sent to your email')) {
      setTempApplication({
        email: data.email || 'your email'
      });
      setShowOtpModal(true);
      showToast(`OTP sent to your email: ${data.email || 'your registered email'}`, 'success');
    } else if (data.data) {
      // Direct application data (if no OTP required)
      setApplication(data.data);
      showToast('Application loaded successfully!', 'success');
    } else {
      showToast('Unexpected response from server', 'error');
    }
  } catch (error) {
    console.error('Lookup error:', error);
    showToast(
      error instanceof Error ? error.message : 'Application not found. Please check your application number and try again.',
      'error'
    );
  } finally {
    setIsLoading(false);
  }
};

// Fixed handleOtpVerification function
const handleOtpVerification = async (otp: string) => {
  setIsLoading(true);
  
  try {
    const formData = new URLSearchParams();
    formData.append('otp', otp);
    formData.append('applicationNumber', applicationId);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/verifyOtp`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const data = await response.json();
    console.log('OTP verification response:', data);

    if (!response.ok) {
      // Handle error responses
      if (response.status === 400) {
        if (data.message?.includes('expired') || data.message?.includes('Expired')) {
          // console.log(data)
          throw new Error('OTP expired. Please request a new one.');
        } else if (data.message?.includes('invalid') || data.message?.includes('Invalid')) {
          throw new Error('Invalid OTP. Please try again.');
        }
      }
      throw new Error(data.message || 'Failed to verify OTP');
    }

    // Success case - check if we have application data
    if (data.data) {
      setApplication(data.data);
      setShowOtpModal(false);
      showToast('Identity verified successfully!', 'success');
    } else if (data.message && data.message.includes('success')) {
      // If success message but no data, might need to fetch application again
      setShowOtpModal(false);
      showToast('OTP verified successfully!', 'success');
      setTempApplication(data.email);
    } else {
      throw new Error('Verification successful but no application data received');
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    let errorMessage = 'Error verifying OTP';
    
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        errorMessage = 'OTP expired. Please enter your application number again to get a new OTP.';
        // Close OTP modal and reset form
        setShowOtpModal(false);
        setApplicationId('');
        setTempApplication(null);
      } else if (error.message.includes('invalid')) {
        errorMessage = 'Invalid OTP. Please check and try again.';
      } else {
        errorMessage = error.message;
      }
    }
    
    showToast(errorMessage, 'error');
  } finally {
    setIsLoading(false);
  }
};

  const handleCloseModal = () => {
    setShowOtpModal(false);
    setTempApplication(null);
    setApplicationId('');
  };

const handleEditSuccess = async (): Promise<void> => {
  try {
    if (application) {
      await lookupApplication(application.applicationNumber);
    }
  } catch (error) {
    console.error('Error refreshing application:', error);
    showToast('Failed to refresh application data', 'error');
  }
};

  const getStatusBadge = (status: string) => {
    switch (status) {

      case 'APPLICATION_APPROVED':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Application Approved</span>;
      case 'WAITING_FOR_USER_ACTION':
        return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">Waiting for User Action</span>;
      case 'INVOICE_SENT':
        return <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">Invoice Sent</span>;
      case 'REVIEW_PAYMENT':
        return <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">Review Payment</span>;
      case 'PENDING':
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Pending</span>;
      case 'PAYMENT_VERIFIED':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Payment Verified</span>;
      case 'INSURANCE_ISSUED':
        return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">Insurance Issued</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-2">Track Your Application</h1>
            <p className="text-gray-600">
              Enter your application ID to view the status and details of your insurance application
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-grow">
                <Input
                  label="Application ID"
                  name="applicationId"
                  placeholder="Enter your application ID (e.g., APP-17487********-****)"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => lookupApplication(applicationId)}
                  disabled={!applicationId || isLoading}
                  className="w-full md:w-auto"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Track'}
                </Button>
              </div>
            </div>
          </div>

{application && (
  <div className="bg-white rounded-xl shadow-lg overflow-hidden fade-in">
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Application #{application.applicationNumber}</h2>
          <p className="text-gray-600">Submitted on {formatDate(application.submittedAt)}</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          {getStatusBadge(application.status)}
          {(application.status === 'WAITING_FOR_USER_ACTION' || application.status === 'INVOICE_SENT') && (
            <Button
              onClick={() => setShowEditModal(true)}
              variant="outline"
              size="sm"
            >
              {(application.status === 'WAITING_FOR_USER_ACTION' && !application.reasonForPaymentRejection) ? 'Edit Application' : 'Upload Proof of Payment'}
            </Button>
          )}
        </div>
      </div>

      {application.status === 'WAITING_FOR_USER_ACTION' && (application.rejectionReason || application.reasonForPaymentRejection) && (
        <>
          <h2 className='text-blue-500 text-sm'>Almost There! Resolve the issues below to get approved.</h2>
          <div className="mt-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Rejection Reason</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{application.rejectionReason || application.reasonForPaymentRejection}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Applicant Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Applicant Information</h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="font-medium">{application.fullName || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{application.email || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{application.phoneNumber || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium">{formatDate(application.dateOfBirth)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium">{application.address || 'Unknown' }</p>
            </div>
            {application.province && (
              <div>
                <p className="text-sm text-gray-500">Province</p>
                <p className="font-medium">{application.province}</p>
              </div>
            )}
            {application.district && (
              <div>
                <p className="text-sm text-gray-500">District</p>
                <p className="font-medium">{application.district}</p>
              </div>
            )}
            {application.sector && (
              <div>
                <p className="text-sm text-gray-500">Sector</p>
                <p className="font-medium">{application.sector}</p>
              </div>
            )}
          </div>
        </div>

        {/* Insurance Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Insurance Details</h3>
          <div className="space-y-2">
            {application.insuranceProvider && (
  <div>
    <p className="text-sm text-gray-500">Insurance Provider</p>
    <p className="font-medium">{application.insuranceProvider}</p>
  </div>
)}
            <div>
              <p className="text-sm text-gray-500">Insurance Category</p>
              <p className="font-medium">{application.insuranceCategory}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Insurance Type</p>
              <p className="font-medium">{application.insuranceType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-medium">{application.insuranceDuration}</p>
            </div>
            {(application.insuranceCategory === 'Car Insurance' || application.insuranceCategory === 'Motorbike Insurance') && (
              <>
                {application.vehicleType && (
                  <div>
                    <p className="text-sm text-gray-500">Vehicle Type</p>
                    <p className="font-medium">{application.vehicleType}</p>
                  </div>
                )}
                {application.vehicleAge && (
                  <div>
                    <p className="text-sm text-gray-500">Vehicle Year</p>
                    <p className="font-medium">{application.vehicleAge}</p>
                  </div>
                )}
              </>
            )}
            {application.amount && (
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-medium">{application.amount.toLocaleString()} RWF</p>
              </div>
            )}
            {/* {application.companyCommission && (
              <div>
                <p className="text-sm text-gray-500">Company Commission</p>
                <p className="font-medium">{application.companyCommission.toLocaleString()} RWF</p>
              </div>
            )} */}
            {/* {application.agentCommission && (
              <div>
                <p className="text-sm text-gray-500">Agent Commission</p>
                <p className="font-medium">{application.agentCommission.toLocaleString()} RWF</p>
              </div>
            )} */}
          </div>
        </div>
      </div>

      {/* Documents Section */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between bg-white p-3 rounded border">
            <div>
              <p className="text-sm font-medium">National ID / Passport</p>
              <p className="text-xs text-gray-500">National identification document</p>
            </div>
            <Button 
              variant="text" 
              size="sm"
              onClick={() => handleViewDocument('National ID / Passport', application.nationalID)}
            >
              View
            </Button>
          </div>
          <div className="flex items-center justify-between bg-white p-3 rounded border">
            <div>
              <p className="text-sm font-medium">Yellow Card</p>
              <p className="text-xs text-gray-500">Vehicle insurance document</p>
            </div>
            <Button 
              variant="text" 
              size="sm"
              onClick={() => handleViewDocument('Yellow Card', application.yellowCard)}
            >
              View
            </Button>
          </div>
          {application.pastInsuranceCertificate && (
            <div className="flex items-center justify-between bg-white p-3 rounded border">
              <div>
                <p className="text-sm font-medium">Past Insurance Certificate</p>
                <p className="text-xs text-gray-500">Previous insurance document</p>
              </div>
              <Button 
                variant="text" 
                size="sm"
                onClick={() => handleViewDocument('Past Insurance Certificate', application.pastInsuranceCertificate!)}
              >
                View
              </Button>
            </div>
          )}
          {application.invoice && (
            <div className="flex items-center justify-between bg-white p-3 rounded border">
              <div>
                <p className="text-sm font-medium">Quotation / Invoice</p>
                <p className="text-xs text-gray-500">Payment instructions</p>
              </div>
              <Button 
                variant="text" 
                size="sm"
                onClick={() => handleViewDocument('Quotation / Invoice', application.invoice!)}
              >
                View
              </Button>
            </div>
          )}
          {application.proofOfPayment && (
            <div className="flex items-center justify-between bg-white p-3 rounded border">
              <div>
                <p className="text-sm font-medium">Proof of Payment</p>
                <p className="text-xs text-gray-500">Payment receipt</p>
              </div>
              <Button 
                variant="text" 
                size="sm"
                onClick={() => handleViewDocument('Proof of Payment', application.proofOfPayment!)}
              >
                View
              </Button>
            </div>
          )}
          {application.insuranceCertificate && (
            <div className="flex items-center justify-between bg-white p-3 rounded border">
              <div>
                <p className="text-sm font-medium">Insurance Certificate</p>
                <p className="text-xs text-gray-500">Issued insurance document</p>
              </div>
              <Button 
                variant="text" 
                size="sm"
                onClick={() => handleViewDocument('Insurance Certificate', application.insuranceCertificate!)}
              >
                View
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Information (if available) */}
      {(application.invoiceId || application.transactionId) && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Payment Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {application.invoiceId && (
              <div className="bg-white p-3 rounded border">
                <p className="text-sm font-medium">Invoice ID</p>
                <p className="text-xs text-gray-500">{application.invoiceId}</p>
              </div>
            )}
            {application.invoiceAmount && (
              <div className="bg-white p-3 rounded border">
                <p className="text-sm font-medium">Invoice Amount</p>
                <p className="text-xs text-gray-500">{application.invoiceAmount} RWF</p>
              </div>
            )}
            {application.transactionId && (
              <div className="bg-white p-3 rounded border">
                <p className="text-sm font-medium">Transaction ID</p>
                <p className="text-xs text-gray-500">{application.transactionId}</p>
                {application.paymentInstructions && (
                  <p className='text-xs text-left block'><span className="text-sm font-medium text-gray-600">Payment Instructions:</span> {application.paymentInstructions} RWF</p>
                )}
                {application.invoice && (
                  <><span className="text-sm font-medium  text-gray-600">Quotation / Invoice:</span> 
                    <button 
                      className="text-sm  text-[var(--main-blue)] hover:underline ml-1"
                      onClick={() => setViewingDocument({
                        name: 'Quotation / Invoice',
                        path: application.invoice || '/File_not_found.jpg'
                      })}
                    >
                      View Document
                    </button>
                  </>
                )}
                {application.amount && (
                  <p className='text-xs'><span className="text-sm font-medium text-gray-600">Amount Expected:</span> {application.amount} RWF</p>
                )}
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* Status-specific messages */}
      {application.status === 'PENDING' && (
        <div className="mt-6 bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-700 mb-2">Application Under Review</h4>
          <p className="text-sm text-gray-600">
            Your application is currently being reviewed. You&apos;ll be notified once a decision has been made.
          </p>
        </div>
      )}
      {application.status === 'APPLICATION_APPROVED' && (
        <div className="mt-6 bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-green-700 mb-2">Application Approved</h4>
          <p className="text-sm text-gray-600">
            Your application has been approved. Please wait for the invoice to be sent.
          </p>
        </div>
      )}
      {application.status === 'PAYMENT_VERIFIED' && (
        <div className="mt-6 bg-purple-50 p-4 rounded-lg">
          <h4 className="font-medium text-purple-700 mb-2">Payment Verified</h4>
          <p className="text-sm text-gray-600">
            Your payment has been verified. Your insurance certificate will be issued soon.
          </p>
        </div>
      )}
      {application.status === 'INSURANCE_ISSUED' && (
        <div className="mt-6 bg-emerald-50 p-4 rounded-lg">
          <h4 className="font-medium text-emerald-700 mb-2">Insurance Issued</h4>
          <p className="text-sm text-gray-600">
            Your insurance has been issued. You can download your certificate above.
          </p>
        </div>
      )}
    </div>
  </div>
)}
        </div>
      </div>

      <OTPModal
        isOpen={showOtpModal}
        onClose={handleCloseModal}
        onVerify={handleOtpVerification}
        email={tempApplication?.email || ''}
        isLoading={isLoading}
      />

      {application && (
        <EditApplicationModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          application={application}
          onSave={handleEditSuccess}
          isLoading={isLoading}
        />
        
      )}

      

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