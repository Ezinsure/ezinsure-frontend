'use client';

import { Button } from '@/components/ui/button';
import type { Application } from '@/features/admin-motor-applications/types';
import { MotorApplicationStatusBadge } from '@/features/admin-motor-applications/motor-application-status-badge';
import { formatDateUTC } from '@/utils/date-formatter';
import { formatPoliceNumberDisplay } from '@/utils/police-number';
import { formatChasisNumberDisplay } from '@/utils/chasis-number';

interface MotorApplicationDetailsModalProps {
  application: Application | null;
  onClose: () => void;
}

export function MotorApplicationDetailsModal({
  application,
  onClose,
}: MotorApplicationDetailsModalProps) {
  if (!application) return null;

  const channelLabel = application.admin
    ? 'Admin'
    : application.agent
      ? 'Agent'
      : 'Client';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600/50">
      <div className="fade-in mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Application Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-[var(--light-gray)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">Application ID</p>
              <p className="font-semibold">#{application.applicationNumber}</p>
            </div>
            <MotorApplicationStatusBadge status={application.status} />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <DetailField label="Full Name" value={application.client?.fullName || application.fullName} />
            <DetailField label="Email" value={application.client?.email || application.email} />
            <DetailField label="Phone" value={application.client?.phoneNumber || application.phoneNumber} />
            <DetailField
              label="Date of Birth"
              value={
                application.client?.dateOfBirth || application.dateOfBirth
                  ? new Date(
                      application.client?.dateOfBirth || application.dateOfBirth!,
                    ).toLocaleDateString()
                  : undefined
              }
            />
          </div>

          <div className="space-y-2">
            <DetailField label="Address" value={application.client?.address || application.address} />
            <DetailField label="Channel" value={channelLabel} />
            {application.admin?.fullName && (
              <DetailField label="Admin" value={application.admin.fullName} />
            )}
          </div>

          <div className="space-y-2">
            <DetailField label="Insurance Category" value={application.insuranceCategory} />
            <DetailField label="Insurance Type" value={application.insuranceType} />
            <DetailField label="Duration" value={application.insuranceDuration} />
            <DetailField
              label="Insurance End Date"
              value={application.insuranceEndAt ? formatDateUTC(application.insuranceEndAt) : undefined}
            />
            <DetailField label="Insurance Provider" value={application.insuranceProvider} />
            <DetailField
              label="Amount"
              value={application.amount != null ? `${application.amount.toLocaleString()} RWF` : undefined}
            />
            <DetailField
              label="Net Premium"
              value={
                application.netPremium != null
                  ? `${application.netPremium.toLocaleString()} RWF`
                  : undefined
              }
            />
            <DetailField
              label="Company Commission"
              value={
                application.companyCommission != null
                  ? `${application.companyCommission.toLocaleString()} RWF`
                  : undefined
              }
            />
            <DetailField
              label="Administration Fees"
              value={
                application.administrationFees != null
                  ? `${Number(application.administrationFees).toLocaleString()} RWF`
                  : undefined
              }
            />
            <DetailField label="Police number" value={formatPoliceNumberDisplay(application)} />
            <DetailField label="COMESA Coverage" value={application.isCOMESA ? 'Yes' : 'No'} />
          </div>

          {(application.vehicle || application.vehicleType) && (
            <div className="space-y-2">
              <DetailField
                label="Vehicle Type"
                value={application.vehicle?.vehicleType || application.vehicleType}
              />
              <DetailField
                label="Vehicle Year"
                value={application.vehicle?.vehicleAge || application.vehicleAge}
              />
              <DetailField
                label="Vehicle Use"
                value={
                  (application.vehicle?.vehicleUse || application.vehicleUse) === 'Other'
                    ? application.vehicle?.otherVehicleUse || application.otherVehicleUse
                    : application.vehicle?.vehicleUse || application.vehicleUse
                }
              />
              <DetailField label="Plate Number" value={application.vehicle?.plateNumber} />
              <DetailField label="Chassis number" value={formatChasisNumberDisplay(application)} />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="text" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-semibold">{value?.toString().trim() || 'N/A'}</p>
    </div>
  );
}
