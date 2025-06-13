'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileInput } from '@/components/ui/file-input';
import { rwandaProvinces } from '@/utils/rwanda-administrative';
import { Trash2 } from 'lucide-react';

export interface Application {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: string;
  province: string;
  district: string;
  sector: string;
  status: string;
  nationalIdDocument: string;
  criminalRecordCertificate: string;
  passportPhoto: string;
  emergencyContacts: Array<{
    fullName: string;
    phoneNumber: string;
    relationship: string;
  }>;
  submittedAt: string;
  rejectionReason?: string;
  bankName: string;
  bankAccountNumber: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application;
  onSave: (updatedData: Partial<Application>, files: Record<string, File | null>) => Promise<void>;
  isLoading: boolean;
}

export const EditUserOnTrackingPage = ({ 
  isOpen, 
  onClose, 
  application, 
  onSave, 
  isLoading 
}: EditUserModalProps) => {
  const [formState, setFormState] = useState<Partial<Application>>({
    fullName: application.fullName,
    email: application.email,
    phoneNumber: application.phoneNumber,
    dateOfBirth: application.dateOfBirth,
    address: application.address,
    province: application.province,
    district: application.district,
    sector: application.sector,
    emergencyContacts: [...application.emergencyContacts]
  });

  const [files, setFiles] = useState<Record<string, File | null>>({
    nationalIdDocument: null,
    criminalRecordCertificate: null,
    passportPhoto: null,
  });

  const [availableDistricts, setAvailableDistricts] = useState<{name: string, sectors?: string[]}[]>([]);
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Relationship options for emergency contacts
  const relationshipOptions = [
    { value: 'Parent', label: 'Parent' },
    { value: 'Sibling', label: 'Sibling' },
    { value: 'Spouse', label: 'Spouse' },
    { value: 'Friend', label: 'Friend' },
  ];

  // Initialize form with application data and set up districts/sectors
  useEffect(() => {
    if (isOpen) {
      setFormState({
        fullName: application.fullName,
        email: application.email,
        phoneNumber: application.phoneNumber,
        dateOfBirth: application.dateOfBirth,
        address: application.address,
        province: application.province,
        district: application.district,
        sector: application.sector,
        emergencyContacts: [...application.emergencyContacts]
      });

      // Set up districts based on current province
      if (application.province) {
        const selectedProvince = rwandaProvinces.find(p => p.name === application.province);
        setAvailableDistricts(selectedProvince?.districts || []);
      }

      // Set up sectors based on current district
      if (application.district && application.province) {
        const selectedProvince = rwandaProvinces.find(p => p.name === application.province);
        const selectedDistrict = selectedProvince?.districts?.find(d => d.name === application.district);
        setAvailableSectors(selectedDistrict?.sectors || []);
      }
    }
  }, [isOpen, application]);

  // Update districts when province changes
  useEffect(() => {
    if (formState.province) {
      const selectedProvince = rwandaProvinces.find(p => p.name === formState.province);
      const districts = selectedProvince?.districts || [];
      setAvailableDistricts(districts);
      
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
      
      if (!sectors.includes(formState.sector || '')) {
        setFormState(prev => ({ ...prev, sector: '' }));
      }
    } else {
      setAvailableSectors([]);
      setFormState(prev => ({ ...prev, sector: '' }));
    }
  }, [formState.district, availableDistricts]);

  // Check for changes
  useEffect(() => {
    const originalData = {
      fullName: application.fullName,
      email: application.email,
      phoneNumber: application.phoneNumber,
      dateOfBirth: application.dateOfBirth,
      address: application.address,
      province: application.province,
      district: application.district,
      sector: application.sector,
      emergencyContacts: application.emergencyContacts
    };

    const hasFormChanges = Object.keys(originalData).some(
      key => JSON.stringify(originalData[key as keyof typeof originalData]) !== 
            JSON.stringify(formState[key as keyof typeof formState])
    );

    const hasFileChanges = Object.values(files).some(file => file !== null);

    setHasChanges(hasFormChanges || hasFileChanges);
  }, [formState, files, application]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleEmergencyContactChange = (index: number, field: string, value: string) => {
    setFormState(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts?.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      ) || []
    }));
  };

  const addEmergencyContact = () => {
    setFormState(prev => ({
      ...prev,
      emergencyContacts: [
        ...(prev.emergencyContacts || []),
        { fullName: '', phoneNumber: '', relationship: '', _id: '' }
      ]
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setFormState(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts?.filter((_, i) => i !== index) || []
    }));
  };

  const handleFileChange = (name: string) => (file: File | null) => {
    setFiles(prev => ({ ...prev, [name]: file }));
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!hasChanges) {
    onClose();
    return;
  }

  try {
    // Prepare the data to be sent
    const dataToSend: Partial<Application> = {
      ...formState,
      emergencyContacts: formState.emergencyContacts?.map(contact => ({
        fullName: contact.fullName,
        phoneNumber: contact.phoneNumber,
        relationship: contact.relationship
      }))
    };

    await onSave(dataToSend, files);
    onClose();
  } catch (error) {
    console.error('Error saving changes:', error);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Edit Application</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {application.status === "SENT_FOR_ACTION" && application.rejectionReason && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Action Required</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{application.rejectionReason}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Full Name"
                name="fullName"
                value={formState.fullName || ''}
                onChange={handleInputChange}
              />

              <Input
                label="Email Address"
                type="email"
                name="email"
                value={formState.email || ''}
                onChange={handleInputChange}
                disabled
              />

              <Input
                label="Phone Number"
                name="phoneNumber"
                value={formState.phoneNumber || ''}
                onChange={handleInputChange}
              />

              <Input
                label="Date of Birth"
                type="date"
                name="dateOfBirth"
                value={formState.dateOfBirth ? new Date(formState.dateOfBirth).toISOString().split('T')[0] : ''}
                onChange={handleInputChange}
                min={getDateLimits().min}
                max={getDateLimits().max}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                name="address"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formState.address || ''}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Province</label>
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
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">District</label>
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
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sector</label>
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
              </div>
            </div>

            {/* Emergency Contacts Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-900">Emergency Contacts</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEmergencyContact}
            >
              Add Contact
            </Button>
          </div>
          
          {formState.emergencyContacts?.map((contact, index) => (
            <div key={index} className="bg-white p-4 rounded-lg mb-4 border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Name"
                  name={`emergencyContactFullName_${index}`}
                  value={contact.fullName}
                  onChange={(e) => handleEmergencyContactChange(index, 'fullName', e.target.value)}
                />
                <Input
                  label="Phone"
                  name={`emergencyContactPhone_${index}`}
                  value={contact.phoneNumber}
                  onChange={(e) => handleEmergencyContactChange(index, 'phoneNumber', e.target.value)}
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Relationship</label>
                    <select
                      name={`emergencyContactRelationship_${index}`}
                      value={contact.relationship}
                      onChange={(e) => handleEmergencyContactChange(index, 'relationship', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select relationship</option>
                      {relationshipOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeEmergencyContact(index)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 shrink-0 mt-[22px]"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          )) || (
            <p className="text-gray-500 text-sm">No emergency contacts added yet.</p>
          )}
        </div>

            {/* Documents Section */}
            <div className="space-y-4">
              <FileInput
                label="National ID Document"
                name="nationalIdDocument"
                onChange={handleFileChange('nationalIdDocument')}
                accept=".pdf,.jpg,.jpeg,.png"
                currentFile={application.nationalIdDocument?.split('/').pop()}
              />

              <FileInput
                label="Criminal Record Certificate"
                name="criminalRecordCertificate"
                onChange={handleFileChange('criminalRecordCertificate')}
                accept=".pdf,.jpg,.jpeg,.png"
                currentFile={application.criminalRecordCertificate?.split('/').pop()}
              />

              <FileInput
                label="Passport Photo"
                name="passportPhoto"
                onChange={handleFileChange('passportPhoto')}
                accept=".jpg,.jpeg,.png"
                currentFile={application.passportPhoto?.split('/').pop()}
              />
            </div>

            <div className="flex justify-end space-x-3">
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
                disabled={!hasChanges || isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};