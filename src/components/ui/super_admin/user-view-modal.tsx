import { Button } from "@/components/ui/button";
import { useState } from "react";

interface User {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'ADMIN' | 'AGENT' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'DEACTIVATED' | 'SENT_FOR_ACTION' | 'PENDING';
  dateOfBirth?: string;
  address?: string;
  passportPhoto?: string | File;
  nationalIdDocument?: string | File;
  criminalRecordCertificate?: string | File;
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
  createdBy?: {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
  };
}

interface UserViewModalProps {
  user: User | null;
  onClose: () => void;
  onStatusChange: (status: User['status'], reason?: string) => void;
  setViewingDocument: (doc: { name: string; path: string } | null) => void;
  currentUserRole: 'ADMIN' | 'AGENT' | 'SUPER_ADMIN';
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

const DocumentViewer = ({ 
  label, 
  documentPath,
  onClick 
}: { 
  label: string; 
  documentPath?: string | File; 
  onClick: () => void 
}) => {
  return (
    <button 
      className="bg-white p-3 rounded border text-left hover:bg-gray-50 cursor-pointer"
      onClick={onClick}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-gray-500">
        {documentPath ? 'Uploaded' : 'Not provided'}
      </p>
    </button>
  );
};

export const UserViewModal = ({ 
  user, 
  onClose, 
  onStatusChange, 
  setViewingDocument,
  currentUserRole
}: UserViewModalProps) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  if (!user) return null;

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

  const handleDocumentClick = (name: string, path?: string | File) => {
    if (!path) {
      setViewingDocument({
        name,
        path: '/File_not_found.jpg' // Placeholder path if document is not provided
      });
    } else if (typeof path === 'string') {
      setViewingDocument({
        name,
        path
      });
    } else {
      // Handle File object by creating a URL
      const url = URL.createObjectURL(path);
      setViewingDocument({
        name,
        path: url
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
      <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-8 w-full max-w-3xl mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">
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

        {/* Basic Information Section */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-medium mb-4">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">User ID</p>
                <p className="font-semibold">#{user._id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Full Name</p>
                <p className="font-semibold">{user.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="font-semibold">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Phone</p>
                <p className="font-semibold">{user.phoneNumber}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Role</p>
                <p className="font-semibold capitalize">{user.role.toLowerCase()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <div className="mt-1">
                  {getStatusBadge(user.status)}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Date of Birth</p>
                <p className="font-semibold">{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Date Created</p>
                <p className="font-semibold">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-medium mb-4">Address Information</h4>
          <p className="font-semibold">{user.address || 'Unknown'}</p>
        </div>

        {/* Banking Information Section */}
        {(user.bankName || user.bankAccountNumber) && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h4 className="text-lg font-medium mb-4">Banking Information</h4>
            <div className="space-y-4">
              {user.bankName && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Bank Name</p>
                  <p className="font-semibold">{user.bankName}</p>
                </div>
              )}
              {user.bankAccountNumber && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Bank Account Number</p>
                  <p className="font-semibold">{user.bankAccountNumber}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Agent Information Section */}
        {(user.agentCode || user.commissionRate) && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h4 className="text-lg font-medium mb-4">Agent Information</h4>
            <div className="space-y-4">
              {user.agentCode && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Agent Code</p>
                  <p className="font-semibold">{user.agentCode}</p>
                </div>
              )}
              {user.commissionRate && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Commission Rate</p>
                  <p className="font-semibold">{user.commissionRate}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Created By Section */}
        {user.createdBy && currentUserRole === 'SUPER_ADMIN' && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h4 className="text-lg font-medium mb-4">Created By</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Name</p>
                <p className="font-semibold">{user.createdBy.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="font-semibold">{user.createdBy.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Phone</p>
                <p className="font-semibold">{user.createdBy.phoneNumber}</p>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Contacts Section */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-medium mb-4">Emergency Contacts</h4>
          {user.emergencyContacts && user.emergencyContacts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.emergencyContacts.map((contact, index) => (
                <div key={contact._id} className="bg-white p-4 rounded-lg border">
                  <p className="font-medium mb-2">Contact {index + 1}</p>
                  <div className="space-y-1">
                    <p className="text-sm">{contact.fullName}</p>
                    <p className="text-sm text-gray-600">{contact.phoneNumber}</p>
                    <p className="text-sm text-gray-600 capitalize">{contact.relationship}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No emergency contacts provided</p>
          )}
        </div>

        {/* Documents Section */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-medium mb-4">Documents</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DocumentViewer 
              label="National ID" 
              documentPath={user.nationalIdDocument}
              onClick={() => handleDocumentClick('National ID', user.nationalIdDocument)}
            />
            <DocumentViewer 
              label="Criminal Record" 
              documentPath={user.criminalRecordCertificate}
              onClick={() => handleDocumentClick('Criminal Record', user.criminalRecordCertificate)}
            />
            <DocumentViewer 
              label="Passport Photo" 
              documentPath={user.passportPhoto}
              onClick={() => handleDocumentClick('Passport Photo', user.passportPhoto)}
            />
          </div>
        </div>

        {/* Rejection Reason Section */}
        {user.rejectionReason && (
          <div className="bg-red-50 rounded-lg p-6 mb-6">
            <h4 className="text-lg font-medium mb-2 text-red-700">Rejection Reason</h4>
            <p className="text-sm text-red-600">{user.rejectionReason}</p>
          </div>
        )}

        {/* Deactivation History Section */}
        <DeactivationHistory history={user.deactivationHistory} />

        {/* Action Section for Pending Status */}
        {user.status === 'PENDING' && (
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              Rejection Reason (if sending for action)
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
              placeholder="Explain what needs to be corrected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
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
                  !rejectionReason ||
                  isApproving ||
                  isRejecting
                }
              >
                {isRejecting ? 'Processing...' : 'Send for Action'}
              </Button>
              <Button
                variant="primary"
                onClick={handleApprove}
                disabled={
                  rejectionReason.trim() !== "" ||
                  isRejecting ||
                  isApproving
                }
              >
                {isApproving ? 'Processing...' : 'Approve'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};