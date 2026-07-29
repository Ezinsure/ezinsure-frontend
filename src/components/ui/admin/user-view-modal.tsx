import { Button } from "@/components/ui/button";
import { useState } from "react";
import { formatVeterinaryType } from "@/shared/utils/veterinary-user";
import { isVeterinaryRole } from "@/shared/utils/role";

interface User {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'ADMIN' | 'AGENT' | 'SUPER_ADMIN' | 'VETERINARY' | 'SONARWA_REPRESENTATIVE' | string;
  status: string;
  dateOfBirth?: string;
  address?: string;
  passportPhoto?: string;
  nationalIdDocument?: string;
  criminalRecordCertificate?: string;
  rcvdLicenceDocument?: string;
  veterinaryType?: string;
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
  deactivationReason?: string;
  deactivationFile?: string;
  deactivationHistory?: Array<{
    deactivationReason: string;
    deactivationFile?: string;
    _id: string;
    deactivationDate: string;
  }>;
  bankName?: string;
  bankAccountNumber?: string;
}

interface UserViewModalProps {
  user: User | null;
  onClose: () => void;
  onStatusChange: (status: string, reason?: string) => void;
  isLoading: boolean;
  setViewingDocument: (doc: { name: string; path: string } | null) => void;
}

const DeactivationHistory = ({ history }: { history: User['deactivationHistory'] }) => {
  if (!history || history.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="font-medium text-lg mb-3">Deactivation History</h3>
      <div className="space-y-4">
        {history.map((entry, index) => (
          <div key={entry._id} className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 rounded-r-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-red-800">Deactivation #{index + 1}</p>
                <p className="text-sm text-gray-600">
                  {new Date(entry.deactivationDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              {entry.deactivationFile && (
                <Button
                  variant="text"
                  size="sm"
                  onClick={() => window.open(entry.deactivationFile, '_blank')}
                  className="text-red-600 hover:text-red-800"
                >
                  View Document
                </Button>
              )}
            </div>
            <p className="mt-2 text-red-700">{entry.deactivationReason}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const UserViewModal = ({ 
  user, 
  onClose, 
  onStatusChange, 
  // isLoading,
  setViewingDocument 
}: UserViewModalProps) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  if (!user) return null;

  const veterinaryTypeLabel = formatVeterinaryType(user.veterinaryType);
  const showVeterinaryDetails = isVeterinaryRole(user.role);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">Active</span>;
      case 'DEACTIVATED':
        return <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">Deactivated</span>;
      case 'SENT_FOR_ACTION':
        return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">Sent for Action</span>;
      case 'PENDING':
        return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">Pending</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">Unknown</span>;
    }
  };

  const handleDocumentClick = (name: string, path?: string) => {
    if (!path) {
      setViewingDocument({
        name,
        path: '/File_not_found.jpg' // Placeholder path if document is not provided
      });
    } else {
      setViewingDocument({
        name,
        path
      });
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onStatusChange('SENT_FOR_ACTION', rejectionReason);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onStatusChange('ACTIVE');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
      <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {user.status === 'PENDING' ? 'Review Application' : 'User Details'}
          </h3>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">User ID</p>
              <p className="font-semibold">#{user._id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="font-semibold">{user.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-semibold">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-semibold">{user.phoneNumber}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <p className="font-semibold capitalize">{user.role.toLowerCase()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div className="mt-1">
                {getStatusBadge(user.status)}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-semibold">{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date Created</p>
              <p className="font-semibold">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm text-gray-500">Address</p>
          <p className="font-semibold">{user.address || 'Unknown'}</p>
        </div>

        {user.bankName && (
  <div className="grid grid-cols-3 gap-4 py-3 border-b">
    <dt className="text-sm font-medium text-gray-500">Bank Name</dt>
    <dd className="text-sm text-gray-900 col-span-2">{user.bankName}</dd>
  </div>
)}

{user.bankAccountNumber && (
  <div className="grid grid-cols-3 gap-4 py-3 border-b">
    <dt className="text-sm font-medium text-gray-500">Bank Account Number</dt>
    <dd className="text-sm text-gray-900 col-span-2">{user.bankAccountNumber}</dd>
  </div>
)}

        {user.agentCode && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Agent Code</p>
            <p className="font-semibold">{user.agentCode}</p>
          </div>
        )}

        {user.commissionRate && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Commission Rate</p>
            <p className="font-semibold">{user.commissionRate}</p>
          </div>
        )}

        {showVeterinaryDetails && veterinaryTypeLabel && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Veterinarian Type</p>
            <p className="font-semibold">{veterinaryTypeLabel}</p>
          </div>
        )}

       {user.role === 'AGENT' && (
        <>
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Emergency Contacts</h4>
            {user.emergencyContacts && user.emergencyContacts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.emergencyContacts.map((contact, index) => (
                  <div key={contact._id} className="bg-white p-3 rounded border">
                    <p className="font-medium">Contact {index + 1}</p>
                    <p className="text-sm">{contact.fullName}</p>
                    <p className="text-sm text-gray-600">{contact.phoneNumber}</p>
                    <p className="text-sm text-gray-600 capitalize">{contact.relationship}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No emergency contacts provided</p>
            )}
          </div>

          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Documents</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                className="bg-white p-3 rounded border text-left hover:bg-gray-50 cursor-pointer"
                onClick={() => handleDocumentClick('National ID', user.nationalIdDocument)}
              >
                <p className="text-sm font-medium">National ID</p>
                <p className="text-xs text-gray-500">
                  {user.nationalIdDocument ? 'Uploaded' : 'Not provided'}
                </p>
              </button>
              <button 
                className="bg-white p-3 rounded border text-left hover:bg-gray-50 cursor-pointer"
                onClick={() => handleDocumentClick('Criminal Record', user.criminalRecordCertificate)}
              >
                <p className="text-sm font-medium">Criminal Record</p>
                <p className="text-xs text-gray-500">
                  {user.criminalRecordCertificate ? 'Uploaded' : 'Not provided'}
                </p>
              </button>
              <button 
                className="bg-white p-3 rounded border text-left hover:bg-gray-50 cursor-pointer"
                onClick={() => handleDocumentClick('Passport Photo', user.passportPhoto)}
              >
                <p className="text-sm font-medium">Passport Photo</p>
                <p className="text-xs text-gray-500">
                  {user.passportPhoto ? 'Uploaded' : 'Not provided'}
                </p>
              </button>
            </div>
          </div>
        </>
      )}


        {user.rejectionReason && (
          <div className="mt-6 bg-red-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2 text-red-700">Rejection Reason</h4>
            <p className="text-sm text-red-600">{user.rejectionReason}</p>
          </div>
        )}


{/* Always show is a user was ever deactivated */}
  {/* {user.status === 'DEACTIVATED' && ( */}
    <>
      <DeactivationHistory history={user.deactivationHistory} />
    </>
  {/* )} */}

      {user.status === 'PENDING' && (
          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">
              Rejection Reason (if sending for action)
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
              placeholder="Explain what needs to be corrected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
       
          {user.status === 'PENDING' && (
  <div className="flex justify-end gap-2 mt-6">
    <Button
      variant="text"
      onClick={onClose}
      disabled={isApproving || isRejecting}
    >
      Close
    </Button>
    <Button
      variant="danger"
      onClick={handleReject}
      disabled={
        !rejectionReason || // Disable if rejection reason is empty
        isApproving ||      // Disable if approving is in progress
        isRejecting         // Disable if rejecting is in progress
      }
    >
      {isRejecting ? 'Processing...' : 'Send for Action'}
    </Button>
    <Button
      variant="primary"
      onClick={handleApprove}
      disabled={
        rejectionReason.trim() !== "" || // Disable if rejection reason is filled
        isRejecting ||                  // Disable if rejecting is in progress
        isApproving                     // Disable if approving is in progress
      }
    >
      {isApproving ? 'Processing...' : 'Approve'}
    </Button>
  </div>
)}
        </div>
      </div>
    </div>
  );
};
