import { ApplicationStatus } from '@/features/admin-motor-applications/types';

export function MotorApplicationStatusBadge({ status }: { status?: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-gray-100 px-2 py-1 text-sm font-medium text-gray-700">
        Unknown
      </span>
    );
  }

  switch (status.toLowerCase()) {
    case ApplicationStatus.PENDING:
      return (
        <span className="inline-flex whitespace-nowrap rounded-full bg-blue-100 px-2 py-1 text-sm font-medium text-blue-700">
          Pending
        </span>
      );
    case ApplicationStatus.APPLICATION_APPROVED:
      return (
        <span className="inline-flex whitespace-nowrap rounded-full bg-green-100 px-2 py-1 text-sm font-medium text-green-700">
          Application Approved
        </span>
      );
    case ApplicationStatus.WAITING_FOR_USER_ACTION:
      return (
        <span className="inline-flex whitespace-nowrap rounded-full bg-orange-100 px-2 py-1 text-sm font-medium text-orange-700">
          Waiting for User Action
        </span>
      );
    case ApplicationStatus.INVOICE_SENT:
      return (
        <span className="inline-flex whitespace-nowrap rounded-full bg-indigo-100 px-2 py-1 text-sm font-medium text-indigo-700">
          Invoice Sent
        </span>
      );
    case ApplicationStatus.REVIEW_PAYMENT:
      return (
        <span className="inline-flex whitespace-nowrap rounded-full bg-purple-100 px-2 py-1 text-sm font-medium text-purple-700">
          Review Payment
        </span>
      );
    case ApplicationStatus.PAYMENT_VERIFIED:
      return (
        <span className="inline-flex whitespace-nowrap rounded-full bg-green-100 px-2 py-1 text-sm font-medium text-green-700">
          Payment Verified
        </span>
      );
    case ApplicationStatus.INSURANCE_ISSUED:
      return (
        <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-100 px-2 py-1 text-sm font-medium text-emerald-700">
          Insurance Issued
        </span>
      );
    case ApplicationStatus.CANCELLED:
      return (
        <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex whitespace-nowrap rounded-full bg-gray-100 px-2 py-1 text-sm font-medium text-gray-700">
          {status.replace(/_/g, ' ')}
        </span>
      );
  }
}

export const MOTOR_APPLICATION_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: ApplicationStatus.PENDING, label: 'Pending' },
  { value: ApplicationStatus.APPLICATION_APPROVED, label: 'Application Approved' },
  { value: ApplicationStatus.WAITING_FOR_USER_ACTION, label: 'Waiting for User Action' },
  { value: ApplicationStatus.INVOICE_SENT, label: 'Invoice Sent' },
  { value: ApplicationStatus.REVIEW_PAYMENT, label: 'Review Payment' },
  { value: ApplicationStatus.PAYMENT_VERIFIED, label: 'Payment Verified' },
  { value: ApplicationStatus.INSURANCE_ISSUED, label: 'Insurance Issued' },
  { value: ApplicationStatus.CANCELLED, label: 'Cancelled' },
] as const;
