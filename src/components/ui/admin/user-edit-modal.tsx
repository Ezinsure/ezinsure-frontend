import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface User {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'ADMIN' | 'AGENT';
  status: 'ACTIVE' | 'DEACTIVATED' | 'SENT_FOR_ACTION' | 'PENDING';
  dateOfBirth?: string;
  address?: string;
  passportPhoto?: string;
  nationalIdDocument?: string;
  criminalRecordCertificate?: string;
  emergencyContacts?: Array<{
    fullName: string;
    phoneNumber: string;
    relationship: string;
    _id: string;
  }>;
  createdAt?: string;
  rejectionReason?: string;
  agentCode?: string;
  commissionRate?: string;
}

interface UserEditModalProps {
  user: User | null;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
  isLoading: boolean;
}

export const UserEditModal = ({ user, onClose, onSave, isLoading }: UserEditModalProps) => {
  const [formData, setFormData] = useState<User>(() => ({
    ...user!,
    emergencyContacts: user?.emergencyContacts || [
      { fullName: '', phoneNumber: '', relationship: '', _id: '' },
      { fullName: '', phoneNumber: '', relationship: '', _id: '' }
    ]
  }));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmergencyContactChange = (index: number, field: string, value: string) => {
    const updatedContacts = [...(formData.emergencyContacts || [])];
    updatedContacts[index] = { ...updatedContacts[index], [field]: value };
    setFormData(prev => ({ ...prev, emergencyContacts: updatedContacts }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  if (!user) return null;

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
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            <Input
              label="Phone Number"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
            />
            <Input
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Address
            </label>
            <textarea
              name="address"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
              value={formData.address || ''}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Role
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

          {formData.role === 'AGENT' && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Emergency Contacts</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Input
                  label="Full Name"
                  name="Full Name"
                  value={formData.emergencyContacts?.[0]?.fullName || ''}
                  onChange={(e) => handleEmergencyContactChange(0, 'fullName', e.target.value)}
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  name="Phone Number"
                  value={formData.emergencyContacts?.[0]?.phoneNumber || ''}
                  onChange={(e) => handleEmergencyContactChange(0, 'phoneNumber', e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Relationship
                  </label>
                  <select
                    value={formData.emergencyContacts?.[0]?.relationship || ''}
                    onChange={(e) => handleEmergencyContactChange(0, 'relationship', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                  >
                    <option value="">Select relationship</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="spouse">Spouse</option>
                    <option value="friend">Friend</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Full Name"
                  name="Full Name"
                  value={formData.emergencyContacts?.[1]?.fullName || ''}
                  onChange={(e) => handleEmergencyContactChange(1, 'fullName', e.target.value)}
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  name="Phone Number"
                  value={formData.emergencyContacts?.[1]?.phoneNumber || ''}
                  onChange={(e) => handleEmergencyContactChange(1, 'phoneNumber', e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Relationship
                  </label>
                  <select
                    value={formData.emergencyContacts?.[1]?.relationship || ''}
                    onChange={(e) => handleEmergencyContactChange(1, 'relationship', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                  >
                    <option value="">Select relationship</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="spouse">Spouse</option>
                    <option value="friend">Friend</option>
                    <option value="other">Other</option>
                  </select>
                </div>
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