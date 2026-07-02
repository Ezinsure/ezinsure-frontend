'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileInput } from '@/components/ui/file-input';
import { InsuranceDurationField } from '@/components/ui/insurance-duration-field';
import { NumericInputField } from '@/components/ui/numeric-input-field';
import { useToast } from '@/components/ui/toast';
import type { Application } from '@/features/admin-motor-applications/types';
import {
  buildMotorEditFormData,
  buildMotorEditInitialVisibility,
  getMotorEditFormValue,
  submitMotorApplicationEdit,
  type MotorEditFormData,
} from '@/features/admin-motor-applications/motor-application-edit-utils';
import { ApplicationStatus } from '@/features/admin-motor-applications/types';
import { isMotorVehicleInsuranceCategory } from '@/utils/administration-fees';
import { validateInsuranceDuration } from '@/utils/insurance-duration';

interface MotorApplicationEditModalProps {
  application: Application | null;
  token: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function MotorApplicationEditModal({
  application,
  token,
  onClose,
  onSaved,
}: MotorApplicationEditModalProps) {
  const { showToast } = useToast();
  const [editFormData, setEditFormData] = useState<MotorEditFormData | null>(null);
  const [originalEditFormData, setOriginalEditFormData] = useState<MotorEditFormData | null>(null);
  const [visibleEditFields, setVisibleEditFields] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!application) {
      setEditFormData(null);
      setOriginalEditFormData(null);
      setVisibleEditFields({});
      return;
    }

    const formData = buildMotorEditFormData(application);
    setEditFormData(formData);
    setOriginalEditFormData(JSON.parse(JSON.stringify(formData)));
    setVisibleEditFields(buildMotorEditInitialVisibility(application, formData));
  }, [application]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setEditFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };
    });
  };

  const handleFileChange = useCallback(
    (field: string) => (file: File | null) => {
      setEditFormData((prev) => {
        if (!prev) return prev;
        return { ...prev, [field]: file };
      });
    },
    [],
  );

  const isPersistentlyVisible = (field: string) => visibleEditFields[field] ?? false;
  const hasExistingValue = (value: unknown) => {
    const text = String(value ?? '').trim();
    return text.length > 0;
  };

  const values = useMemo(() => editFormData ?? {}, [editFormData]);
  const isVehicleInsurance = isMotorVehicleInsuranceCategory(
    String(values.insuranceCategory ?? ''),
  );

  const showClientFullName =
    isPersistentlyVisible('clientFullName') || hasExistingValue(values.fullName);
  const showInsuranceDetailsSection =
    isPersistentlyVisible('insuranceCategory') || hasExistingValue(values.insuranceCategory);
  const showChasisNumber = isPersistentlyVisible('chasisNumber') || isVehicleInsurance;
  const showComesaField = isPersistentlyVisible('comesa') || isVehicleInsurance;
  const showPaymentSection =
    isPersistentlyVisible('amountField') ||
    isPersistentlyVisible('companyCommissionField') ||
    hasExistingValue(values.amount);
  const showStatusField = isPersistentlyVisible('statusField') || hasExistingValue(values.status);
  const showInsuranceDocumentsSection =
    isPersistentlyVisible('invoiceUpload') ||
    isPersistentlyVisible('insuranceCertificateUpload') ||
    isPersistentlyVisible('contractUpload') ||
    isPersistentlyVisible('receiptUpload') ||
    isPersistentlyVisible('ebmUpload');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application || !editFormData || !originalEditFormData || !token) return;

    if (values.insuranceDuration) {
      const durationErr = validateInsuranceDuration(String(values.insuranceDuration));
      if (durationErr) {
        showToast(durationErr, 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await submitMotorApplicationEdit({
        token,
        applicationId: application._id,
        editingApp: application,
        editFormData,
        originalEditFormData,
      });
      showToast('Application updated successfully', 'success');
      onSaved();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update application';
      if (message !== 'No changes detected') {
        showToast(message, 'error');
      } else {
        showToast(message, 'info');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!application || !editFormData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-3">
          <h2 className="text-base font-semibold">Edit Application</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {showClientFullName && (
            <fieldset className="mb-4 rounded-lg border-2 border-gray-300 bg-gray-50 p-3">
              <legend className="rounded-md border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-600">
                Client Information
              </legend>
              <div>
                <label className="mb-1 block text-xs font-medium">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={getMotorEditFormValue(values.fullName)}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-[var(--main-blue)] focus:outline-none"
                />
              </div>
            </fieldset>
          )}

          {showInsuranceDetailsSection && (
            <fieldset className="mb-4 rounded-lg border-2 border-gray-300 bg-gray-50 p-3">
              <legend className="rounded-md border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-600">
                Insurance Details
              </legend>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ReadOnlyField label="Insurance Category" value={getMotorEditFormValue(values.insuranceCategory)} />
                <ReadOnlyField label="Plate Number" value={getMotorEditFormValue(values.plateNumber)} />
                {showChasisNumber && (
                  <div>
                    <label className="mb-1 block text-xs font-medium">Chassis Number</label>
                    <input
                      type="text"
                      name="chasisNumber"
                      value={getMotorEditFormValue(values.chasisNumber)}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-[var(--main-blue)] focus:outline-none"
                    />
                  </div>
                )}
                {showComesaField && (
                  <div className="md:col-span-2">
                    <label className="flex cursor-pointer items-center space-x-2">
                      <input
                        type="checkbox"
                        name="isCOMESA"
                        checked={Boolean(values.isCOMESA)}
                        onChange={handleInputChange}
                        className="h-3 rounded border-gray-300 text-[var(--main-blue)] focus:ring-[var(--main-blue)]"
                      />
                      <span className="text-xs font-medium text-gray-700">Ext. Territorial (COMESA)</span>
                    </label>
                  </div>
                )}
                <div className="md:col-span-2">
                  <InsuranceDurationField
                    id="company-performance-edit-insuranceDuration"
                    topLabel="Insurance duration"
                    value={getMotorEditFormValue(values.insuranceDuration)}
                    size="compact"
                    onChange={(next) =>
                      setEditFormData((prev) => (prev ? { ...prev, insuranceDuration: next } : prev))
                    }
                  />
                </div>
              </div>
            </fieldset>
          )}

          {showPaymentSection && (
            <fieldset className="mb-4 rounded-lg border-2 border-gray-300 bg-gray-50 p-3">
              <legend className="rounded-md border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-600">
                Payment & Commission
              </legend>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <NumericInputField
                  label="Amount"
                  name="amount"
                  size="compact"
                  value={getMotorEditFormValue(values.amount)}
                  onChange={(v) =>
                    setEditFormData((prev) => (prev ? { ...prev, amount: v } : prev))
                  }
                />
                <NumericInputField
                  label="Net Premium"
                  name="netPremium"
                  size="compact"
                  value={getMotorEditFormValue(values.netPremium)}
                  onChange={(v) =>
                    setEditFormData((prev) => (prev ? { ...prev, netPremium: v } : prev))
                  }
                />
                <NumericInputField
                  label="Company Commission"
                  name="companyCommission"
                  size="compact"
                  value={getMotorEditFormValue(values.companyCommission)}
                  onChange={(v) =>
                    setEditFormData((prev) => (prev ? { ...prev, companyCommission: v } : prev))
                  }
                />
                <NumericInputField
                  label="Administration Fees"
                  name="administrationFees"
                  size="compact"
                  value={getMotorEditFormValue(values.administrationFees)}
                  onChange={(v) =>
                    setEditFormData((prev) => (prev ? { ...prev, administrationFees: v } : prev))
                  }
                />
                <NumericInputField
                  label="Agent Commission"
                  name="agentCommission"
                  size="compact"
                  value={getMotorEditFormValue(values.agentCommission)}
                  onChange={(v) =>
                    setEditFormData((prev) => (prev ? { ...prev, agentCommission: v } : prev))
                  }
                />
                <div>
                  <label className="mb-1 block text-xs font-medium">Transaction ID</label>
                  <input
                    type="text"
                    name="transactionId"
                    value={getMotorEditFormValue(values.transactionId)}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-[var(--main-blue)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Police Number</label>
                  <input
                    type="text"
                    name="policeNumber"
                    value={getMotorEditFormValue(values.policeNumber)}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-[var(--main-blue)] focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium">Payment Instructions</label>
                  <textarea
                    name="paymentInstructions"
                    value={getMotorEditFormValue(values.paymentInstructions)}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-[var(--main-blue)] focus:outline-none"
                  />
                </div>
              </div>
            </fieldset>
          )}

          {showStatusField && (
            <fieldset className="mb-4 rounded-lg border-2 border-gray-300 bg-gray-50 p-3">
              <legend className="rounded-md border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-600">
                Status
              </legend>
              <select
                name="status"
                value={getMotorEditFormValue(values.status)}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-[var(--main-blue)] focus:outline-none"
              >
                <option value={ApplicationStatus.PENDING}>Pending</option>
                <option value={ApplicationStatus.APPLICATION_APPROVED}>Application Approved</option>
                <option value={ApplicationStatus.WAITING_FOR_USER_ACTION}>Waiting for User Action</option>
                <option value={ApplicationStatus.INVOICE_SENT}>Invoice Sent</option>
                <option value={ApplicationStatus.REVIEW_PAYMENT}>Review Payment</option>
                <option value={ApplicationStatus.PAYMENT_VERIFIED}>Payment Verified</option>
                <option value={ApplicationStatus.INSURANCE_ISSUED}>Insurance Issued</option>
                <option value={ApplicationStatus.CANCELLED}>Cancelled</option>
              </select>
            </fieldset>
          )}

          {showInsuranceDocumentsSection && (
            <fieldset className="mb-4 rounded-lg border-2 border-gray-300 bg-gray-50 p-3">
              <legend className="rounded-md border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-600">
                Insurance Documents
              </legend>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FileInput label="Invoice" name="invoice" onChange={handleFileChange('invoice')} accept="image/*,.pdf" />
                <FileInput
                  label="Insurance Certificate"
                  name="insuranceCertificate"
                  onChange={handleFileChange('insuranceCertificate')}
                  accept="image/*,.pdf"
                />
                <FileInput label="Contract" name="contract" onChange={handleFileChange('contract')} accept="image/*,.pdf" />
                <FileInput label="Receipt" name="receipt" onChange={handleFileChange('receipt')} accept="image/*,.pdf" />
                <FileInput label="EBM" name="ebm" onChange={handleFileChange('ebm')} accept="image/*,.pdf" />
              </div>
            </fieldset>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Application'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      <input
        type="text"
        value={value}
        disabled
        className="w-full rounded-lg border border-gray-300 bg-gray-100 px-2 py-1.5 text-xs text-gray-600"
      />
    </div>
  );
}
