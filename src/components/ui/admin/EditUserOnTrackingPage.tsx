'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileInput } from '@/components/ui/file-input';
import { rwandaProvinces } from '@/utils/rwanda-administrative';
import { rwandaBanks } from '@/utils/rwanda-banks';
import { formatVeterinaryType } from '@/shared/utils/veterinary-user';
import {
  isVeterinaryApplication,
  registrationDocumentFileName,
  registrationDocumentFields,
  registrationDocumentUrl,
  type RegistrationApplication,
  type RegistrationDocumentId,
} from '@/features/account-registration/registration-application';
import { Trash2 } from 'lucide-react';

/**
 * Public track/RFA edit uses the canonical registration model so the fields
 * shown here always match the apply form for the applicant's role.
 */
export type Application = RegistrationApplication;

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application;
  onSave: (
    updatedData: Partial<Application>,
    files: Partial<Record<RegistrationDocumentId, File | null>>,
  ) => Promise<void>;
  isLoading: boolean;
  /** Open an existing document in the parent's viewer. */
  onViewDocument?: (url: string, name: string) => void;
}

const MAX_EMERGENCY_CONTACTS = { AGENT: 2, VETERINARY: 1 } as const;

export const EditUserOnTrackingPage = ({
  isOpen,
  onClose,
  application,
  onSave,
  isLoading,
  onViewDocument,
}: EditUserModalProps) => {
  const isVeterinary = isVeterinaryApplication(application);
  const documentFields = registrationDocumentFields(application.role);
  const maxEmergencyContacts = isVeterinary
    ? MAX_EMERGENCY_CONTACTS.VETERINARY
    : MAX_EMERGENCY_CONTACTS.AGENT;

  const [formState, setFormState] = useState<Partial<Application>>({});
  const [files, setFiles] = useState<
    Partial<Record<RegistrationDocumentId, File | null>>
  >({});
  const [availableDistricts, setAvailableDistricts] = useState<
    { name: string; sectors?: string[] }[]
  >([]);
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const relationshipOptions = [
    { value: 'Parent', label: 'Parent' },
    { value: 'Sibling', label: 'Sibling' },
    { value: 'Spouse', label: 'Spouse' },
    { value: 'Friend', label: 'Friend' },
  ];

  useEffect(() => {
    if (!isOpen) return;

    setFormState({
      fullName: application.fullName,
      email: application.email,
      phoneNumber: application.phoneNumber,
      dateOfBirth: application.dateOfBirth,
      address: application.address,
      province: application.province,
      district: application.district,
      sector: application.sector,
      bankName: application.bankName,
      bankAccountNumber: application.bankAccountNumber,
      veterinaryType: application.veterinaryType,
      emergencyContacts: [...application.emergencyContacts].slice(
        0,
        maxEmergencyContacts,
      ),
    });
    setFiles({});

    if (application.province) {
      const selectedProvince = rwandaProvinces.find(
        (p) => p.name === application.province,
      );
      const transformedDistricts = (selectedProvince?.districts || []).map(
        (district) => ({
          name: district.name,
          sectors: district.sectors?.map((sector) => sector.name) || [],
        }),
      );
      setAvailableDistricts(transformedDistricts);
      setAvailableSectors(
        transformedDistricts.find((d) => d.name === application.district)
          ?.sectors || [],
      );
    }
  }, [isOpen, application, maxEmergencyContacts]);

  useEffect(() => {
    if (formState.province) {
      const selectedProvince = rwandaProvinces.find(
        (p) => p.name === formState.province,
      );
      const transformedDistricts = (selectedProvince?.districts || []).map(
        (district) => ({
          name: district.name,
          sectors: district.sectors?.map((sector) => sector.name) || [],
        }),
      );
      setAvailableDistricts(transformedDistricts);

      if (!transformedDistricts.some((d) => d.name === formState.district)) {
        setFormState((prev) => ({ ...prev, district: '', sector: '' }));
      }
    } else {
      setAvailableDistricts([]);
      setFormState((prev) => ({ ...prev, district: '', sector: '' }));
    }
  }, [formState.province]);

  useEffect(() => {
    if (formState.district) {
      const sectors =
        availableDistricts.find((d) => d.name === formState.district)?.sectors ||
        [];
      setAvailableSectors(sectors);

      if (!sectors.includes(formState.sector || '')) {
        setFormState((prev) => ({ ...prev, sector: '' }));
      }
    } else {
      setAvailableSectors([]);
      setFormState((prev) => ({ ...prev, sector: '' }));
    }
  }, [formState.district, availableDistricts]);

  useEffect(() => {
    const original: Partial<Application> = {
      fullName: application.fullName,
      email: application.email,
      phoneNumber: application.phoneNumber,
      dateOfBirth: application.dateOfBirth,
      address: application.address,
      province: application.province,
      district: application.district,
      sector: application.sector,
      bankName: application.bankName,
      bankAccountNumber: application.bankAccountNumber,
      veterinaryType: application.veterinaryType,
      // Same slice the form was seeded with, so opening the modal is not a change.
      emergencyContacts: application.emergencyContacts.slice(
        0,
        maxEmergencyContacts,
      ),
    };

    const hasFormChanges = Object.keys(original).some(
      (key) =>
        JSON.stringify(original[key as keyof Application]) !==
        JSON.stringify(formState[key as keyof Application]),
    );
    const hasFileChanges = Object.values(files).some((file) => file != null);

    setHasChanges(hasFormChanges || hasFileChanges);
  }, [formState, files, application, maxEmergencyContacts]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmergencyContactChange = (
    index: number,
    field: 'fullName' | 'phoneNumber' | 'relationship',
    value: string,
  ) => {
    setFormState((prev) => ({
      ...prev,
      emergencyContacts:
        prev.emergencyContacts?.map((contact, i) =>
          i === index ? { ...contact, [field]: value } : contact,
        ) || [],
    }));
  };

  const addEmergencyContact = () => {
    setFormState((prev) => {
      const current = prev.emergencyContacts || [];
      if (current.length >= maxEmergencyContacts) return prev;
      return {
        ...prev,
        emergencyContacts: [
          ...current,
          { fullName: '', phoneNumber: '', relationship: '' },
        ],
      };
    });
  };

  const removeEmergencyContact = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      emergencyContacts:
        prev.emergencyContacts?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleFileChange =
    (id: RegistrationDocumentId) => (file: File | null) => {
      setFiles((prev) => ({ ...prev, [id]: file }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanges) {
      onClose();
      return;
    }

    try {
      // Only send documents that belong to this role, so an agent-only field can
      // never be attached to a vet resubmission (or vice versa).
      const filesToSend = documentFields.reduce<
        Partial<Record<RegistrationDocumentId, File | null>>
      >((acc, field) => {
        const picked = files[field.id];
        if (picked) acc[field.id] = picked;
        return acc;
      }, {});

      await onSave({ ...formState, role: application.role }, filesToSend);
      onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  };

  const getDateLimits = () => {
    const today = new Date();
    return {
      min: new Date(today.getFullYear() - 100, today.getMonth(), today.getDate())
        .toISOString()
        .split('T')[0],
      max: new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
        .toISOString()
        .split('T')[0],
    };
  };

  if (!isOpen) return null;

  const canAddEmergencyContact =
    (formState.emergencyContacts?.length ?? 0) < maxEmergencyContacts;

  return (
    <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Edit Application
              </h3>
              <p className="text-sm text-gray-500">
                {isVeterinary ? 'Veterinarian' : 'Insurance agent'} application
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              type="button"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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

          {application.status === 'SENT_FOR_ACTION' &&
            application.rejectionReason && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Action Required
                    </h3>
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
                value={
                  formState.dateOfBirth
                    ? new Date(formState.dateOfBirth).toISOString().split('T')[0]
                    : ''
                }
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Bank Name
                </label>
                <select
                  name="bankName"
                  value={formState.bankName || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Bank</option>
                  {rwandaBanks.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Bank Account Number"
                name="bankAccountNumber"
                value={formState.bankAccountNumber || ''}
                onChange={handleInputChange}
                maxLength={16}
              />
            </div>

            {isVeterinary && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Veterinarian type
                </label>
                <select
                  name="veterinaryType"
                  value={formState.veterinaryType || ''}
                  onChange={handleInputChange}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select veterinarian type</option>
                  <option value="PRIVATE">Private</option>
                  <option value="SARO">SARO (Government vet)</option>
                </select>
                {!formState.veterinaryType &&
                formatVeterinaryType(application.veterinaryType) ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Current: {formatVeterinaryType(application.veterinaryType)}
                  </p>
                ) : null}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Province
                </label>
                <select
                  name="province"
                  value={formState.province || ''}
                  onChange={handleInputChange}
                  className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                >
                  <option value="">Select Province</option>
                  {rwandaProvinces.map((province) => (
                    <option key={province.name} value={province.name}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  District
                </label>
                <select
                  name="district"
                  value={formState.district || ''}
                  onChange={handleInputChange}
                  disabled={!formState.province}
                  className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select District</option>
                  {availableDistricts.map((district) => (
                    <option key={district.name} value={district.name}>
                      {district.name}
                    </option>
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
                  {availableSectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900">
                  {isVeterinary ? 'Emergency Contact' : 'Emergency Contacts'}
                  {isVeterinary && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      (optional)
                    </span>
                  )}
                </h3>
                {canAddEmergencyContact && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEmergencyContact}
                  >
                    Add Contact
                  </Button>
                )}
              </div>

              {formState.emergencyContacts?.length ? (
                formState.emergencyContacts.map((contact, index) => (
                  <div
                    key={index}
                    className="bg-white p-4 rounded-lg mb-4 border"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="Name"
                        name={`emergencyContactFullName_${index}`}
                        value={contact.fullName}
                        onChange={(e) =>
                          handleEmergencyContactChange(
                            index,
                            'fullName',
                            e.target.value,
                          )
                        }
                      />
                      <Input
                        label="Phone"
                        name={`emergencyContactPhone_${index}`}
                        value={contact.phoneNumber}
                        onChange={(e) =>
                          handleEmergencyContactChange(
                            index,
                            'phoneNumber',
                            e.target.value,
                          )
                        }
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium mb-1">
                            Relationship
                          </label>
                          <select
                            name={`emergencyContactRelationship_${index}`}
                            value={contact.relationship}
                            onChange={(e) =>
                              handleEmergencyContactChange(
                                index,
                                'relationship',
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select relationship</option>
                            {relationshipOptions.map((option) => (
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
                ))
              ) : (
                <p className="text-gray-500 text-sm">
                  No emergency contacts added yet.
                </p>
              )}
            </div>

            {/* Documents come from the role registry — same set as the apply form. */}
            <div className="space-y-4">
              {documentFields.map((field) => {
                const existingUrl = registrationDocumentUrl(
                  application,
                  field.id,
                );
                return (
                  <FileInput
                    key={field.id}
                    label={field.label}
                    name={field.id}
                    accept={field.accept}
                    onChange={handleFileChange(field.id)}
                    currentFile={registrationDocumentFileName(existingUrl)}
                    documentUrl={existingUrl}
                    onViewDocument={onViewDocument}
                  />
                );
              })}
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
              <Button type="submit" disabled={!hasChanges || isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
