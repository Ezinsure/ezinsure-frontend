import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileInput } from "@/components/ui/file-input";
import { useState, useEffect } from "react";
import { AdministrativeDivision, rwandaProvinces } from '@/utils/rwanda-administrative';
import { ValidationRules, validateForm } from "@/components/ui/form-validation";
// import { FileUploadField } from "@/components/ui/file-upload";

interface User {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'ADMIN' | 'AGENT' | 'SUPER_ADMIN';
  commissionRate?: string;
  status: 'ACTIVE' | 'DEACTIVATED' | 'SENT_FOR_ACTION' | 'PENDING';
  createdAt?: string;
  agentCode?: string;
  passportPhoto?: string | File;
  dateOfBirth?: string;
  address?: string;
  province?: string;
  district?: string;
  sector?: string;
  nationalIdDocument?: string | File;
  criminalRecordCertificate?: string | File;
  emergencyContacts?: Array<{
    fullName: string;
    phoneNumber: string;
    relationship: string;
    _id: string;
  }>;
  rejectionReason?: string;
  bankName?: string;
  bankAccountNumber?: string;
}

const rwandaBanks = [
  "Bank of Kigali",
  "Equity Bank Rwanda",
  "I&M Bank Rwanda",
  "BPR Bank",
  "GT Bank Rwanda",
  "Zigama",
  "Unguka bank",
  "VisionFund Rwanda",
];

interface Errors {
  [key: string]: string;
}

interface UserEditModalProps {
  user: User | null;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
  isLoading: boolean;
  currentUserRole: 'ADMIN' | 'AGENT' | 'SUPER_ADMIN';
}

export const UserEditModal = ({ user, onClose, onSave, isLoading, currentUserRole }: UserEditModalProps) => {
  const [formData, setFormData] = useState<User>(() => ({
    ...user!,
    emergencyContacts: user?.emergencyContacts || [
      { fullName: '', phoneNumber: '', relationship: '', _id: '' },
      { fullName: '', phoneNumber: '', relationship: '', _id: '' }
    ]
  }));
  
  const [errors, setErrors] = useState<Errors>({});
  const [districts, setDistricts] = useState<AdministrativeDivision[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);

  const validationRules: ValidationRules = {
    fullName: { required: true, minLength: 3 },
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phoneNumber: { required: true, pattern: /^250\d{9}$/ },
    dateOfBirth: { required: true },
    address: { required: true, minLength: 4 },
    province: { required: true },
    district: { required: true },
    sector: { required: true },
    bankName: { required: true },
    bankAccountNumber: { required: true, pattern: /^\d{10,15}$/ },
  };

  useEffect(() => {
    if (formData.province) {
      const selectedProvince = rwandaProvinces.find(p => p.name === formData.province);
      setDistricts(selectedProvince?.districts || []);
    }
  }, [formData.province]);

  useEffect(() => {
    if (formData.district) {
      const selectedDistrict = districts.find(d => d.name === formData.district);
      const sectors = selectedDistrict?.sectors || [];
      // Extract sector names as strings
      const sectorNames = sectors.map(sector => sector.name);
      setSectors(sectorNames);
    }
  }, [formData.district, districts]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleEmergencyContactChange = (index: number, field: string, value: string) => {
    const updatedContacts = [...(formData.emergencyContacts || [])];
    updatedContacts[index] = { ...updatedContacts[index], [field]: value };
    setFormData(prev => ({ ...prev, emergencyContacts: updatedContacts }));
  };

  const getChangedFields = (): Partial<User> => {
    if (!user) return {};
    
    const changes: Partial<User> = {};
    
    // Basic fields
    if (user.fullName !== formData.fullName) changes.fullName = formData.fullName;
    if (user.phoneNumber !== formData.phoneNumber) changes.phoneNumber = formData.phoneNumber;
    if (user.dateOfBirth !== formData.dateOfBirth) changes.dateOfBirth = formData.dateOfBirth;
    if (user.address !== formData.address) changes.address = formData.address;
    if (user.province !== formData.province) changes.province = formData.province;
    if (user.district !== formData.district) changes.district = formData.district;
    if (user.sector !== formData.sector) changes.sector = formData.sector;
    if (user.role !== formData.role) changes.role = formData.role;
    // if (user.email !== formData.email) changes.email = formData.email;
    if (user.bankName !== formData.bankName) changes.bankName = formData.bankName;
    if (user.bankAccountNumber !== formData.bankAccountNumber) changes.bankAccountNumber = formData.bankAccountNumber;
    
    // Emergency contacts
    if (JSON.stringify(user.emergencyContacts) !== JSON.stringify(formData.emergencyContacts)) {
      changes.emergencyContacts = formData.emergencyContacts;
    }
    
    return changes;
  };

  const handleSubmit = () => {
    const formErrors = validateForm(formData as unknown as { [key: string]: string | null }, validationRules);
    setErrors(formErrors);

    if (Object.keys(formErrors).length === 0) {
      const changedFields = getChangedFields();
      if (Object.keys(changedFields).length > 0) {
        onSave({ ...formData, ...changedFields });
      } else {
        onClose();
      }
    }
  };

  const handlePassportPhotoChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, passportPhoto: file || undefined }));
  };
  
  const handleNationalIdChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, nationalIdDocument: file || undefined }));
  };
  
  const handleCriminalRecordChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, criminalRecordCertificate: file || undefined }));
  };
  

  if (!user) return null;

  const getDateLimits = () => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    
    return {
      min: minDate.toISOString().split('T')[0],
      max: maxDate.toISOString().split('T')[0]
    };
  };

  return (
    <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
      <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Edit User</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
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
              disabled
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
              value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''}
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
              value={formData.address || ''}
              onChange={handleInputChange}
            />
            {errors.address && (
              <p className="mt-2 text-sm text-red-600">{errors.address}</p>
            )}
          </div>

          {/* Location fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Province <span className="text-red-500">*</span>
              </label>
              <select
                name="province"
                className="w-full border border-gray-300 rounded-md p-2"
                value={formData.province || ''}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Province</option>
                {rwandaProvinces.map(province => (
                  <option key={province.name} value={province.name}>
                    {province.name}
                  </option>
                ))}
              </select>
              {errors.province && (
                <p className="mt-2 text-sm text-red-600">{errors.province}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                District <span className="text-red-500">*</span>
              </label>
              <select
                name="district"
                className="w-full border border-gray-300 rounded-md p-2"
                value={formData.district || ''}
                onChange={handleInputChange}
                required
                disabled={!formData.province}
              >
                <option value="">Select District</option>
                {districts.map(district => (
                  <option key={district.name} value={district.name}>
                    {district.name}
                  </option>
                ))}
              </select>
              {errors.district && (
                <p className="mt-2 text-sm text-red-600">{errors.district}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sector <span className="text-red-500">*</span>
              </label>
              <select
                name="sector"
                className="w-full border border-gray-300 rounded-md p-2"
                value={formData.sector || ''}
                onChange={handleInputChange}
                required
                disabled={!formData.district}
              >
                <option value="">Select Sector</option>
                {sectors.map(sector => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
              {errors.sector && (
                <p className="mt-2 text-sm text-red-600">{errors.sector}</p>
              )}
            </div>
          </div>

          {/* Bank information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-gray-300 rounded-md p-2"
                name="bankName"
                value={formData.bankName || ''}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Bank</option>
                {rwandaBanks.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
              {errors.bankName && (
                <p className="mt-2 text-sm text-red-600">{errors.bankName}</p>
              )}
            </div>
            <Input
              label="Bank Account Number"
              name="bankAccountNumber"
              type="number"
              value={formData.bankAccountNumber || ''}
              onChange={handleInputChange}
              error={errors.bankAccountNumber}
              required
            />
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

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Emergency Contacts</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Input
                label="Full Name"
                name="emergencyContact1Name"
                placeholder="Contact name"
                value={formData.emergencyContacts?.[0]?.fullName || ''}
                onChange={(e) => handleEmergencyContactChange(0, 'fullName', e.target.value)}
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                name="emergencyContact1PhoneNumber"
                placeholder="2507XXXXXXXX"
                value={formData.emergencyContacts?.[0]?.phoneNumber || ''}
                onChange={(e) => handleEmergencyContactChange(0, 'phoneNumber', e.target.value)}
                required
              />
              <div>
                <label className="block text-sm font-medium mb-1">
                  Relationship <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.emergencyContacts?.[0]?.relationship || ''}
                  onChange={(e) => handleEmergencyContactChange(0, 'relationship', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                >
                  <option value="">Select relationship</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Friend">Friend</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Full Name"
                name="emergencyContact2Name"
                placeholder="Contact name"
                value={formData.emergencyContacts?.[1]?.fullName || ''}
                onChange={(e) => handleEmergencyContactChange(1, 'fullName', e.target.value)}
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                name="emergencyContact2PhoneNumber"
                placeholder="2507XXXXXXXX"
                value={formData.emergencyContacts?.[1]?.phoneNumber || ''}
                onChange={(e) => handleEmergencyContactChange(1, 'phoneNumber', e.target.value)}
                required
              />
              <div>
                <label className="block text-sm font-medium mb-1">
                  Relationship <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.emergencyContacts?.[1]?.relationship || ''}
                  onChange={(e) => handleEmergencyContactChange(1, 'relationship', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                >
                  <option value="">Select relationship</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Friend">Friend</option>
                </select>
              </div>
            </div>
          </div>

          {currentUserRole === 'SUPER_ADMIN' && (
  <div className="mt-6 bg-gray-50 p-4 rounded-lg">
    <h4 className="font-medium mb-3">Update Documents</h4>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <FileInput
        label="Update National ID"
        name="nationalIdDocument"
        accept=".pdf,.jpg,.jpeg,.png"
        currentFile={formData.nationalIdDocument as string}
        onChange={handleNationalIdChange}
      />
      <FileInput
        label="Update Criminal Record Certificate"
        name="criminalRecordCertificate"
        accept=".pdf,.jpg,.jpeg,.png"
        currentFile={formData.criminalRecordCertificate as string}
        onChange={handleCriminalRecordChange}
      />
      <FileInput
        label="Update Passport Photo"
        name="passportPhoto"
        accept=".jpg,.jpeg,.png"
        currentFile={formData.passportPhoto as string}
        onChange={handlePassportPhotoChange}
      />
    </div>
  </div>
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
                  Saving...
                </>
              ) : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};