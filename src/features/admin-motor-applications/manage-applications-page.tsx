'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileInput } from '@/components/ui/file-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useToast } from '@/components/ui/toast';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { PencilLine, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatDateUTC } from '@/utils/date-formatter';
import {
  calculateAdministrationFeesRwf,
  isMotorVehicleInsuranceCategory,
} from '@/utils/administration-fees';
import { validateInsuranceDuration, normalizeInsuranceDurationPayload } from '@/utils/insurance-duration';
import { InsuranceDurationField } from '@/components/ui/insurance-duration-field';
import { NumericInputField } from '@/components/ui/numeric-input-field';
import { getVehicleManufactureYearValidationError } from '@/utils/vehicle-year';
import {
  ApplicationStatus,
  type Application,
  type PaginationProps,
} from '@/features/admin-motor-applications/types';
import {
  matchesPerformedByFilter,
  performedByFilterLabel,
  type PerformedByFilter,
} from '@/utils/application-performed-by-filter';
import { formatPoliceNumberDisplay, resolvePoliceNumber } from '@/utils/police-number';

export default function ManageApplicationsPage() {
  const { showToast, ToastContainer } = useToast();
  const { token } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPerformedBy, setSelectedPerformedBy] = useState<PerformedByFilter>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [invoiceMessage, setInvoiceMessage] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [rejectionComment, setRejectionComment] = useState('');
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [ebmFile, setEbmFile] = useState<File | null>(null);
  const [issuePoliceNumber, setIssuePoliceNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isApprovingPayment, setIsApprovingPayment] = useState(false);
  const [isRejectingPayment, setIsRejectingPayment] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [netPremium, setNetPremium] = useState('');
  const [agentCommission, setAgentCommission] = useState('');
  const [companyCommission, setCompanyCommission] = useState('');
  const [administrationFees, setAdministrationFees] = useState('');
  const [activeModal, setActiveModal] = useState<'details' | 'review' | 'invoice' | 'verify' | 'issue' | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{
    name: string;
    path: string;
  } | null>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const itemsPerPage = 10;
  const [fileErrors, setFileErrors] = useState<{ [key: string]: string }>({});

  // Send-invoice modal: administration fees from application COMESA + category (car/motor rules)
  useEffect(() => {
    if (activeModal !== 'invoice' || !selectedApp) return;
    const fees = calculateAdministrationFeesRwf(
      selectedApp.insuranceCategory || '',
      Boolean(selectedApp.isCOMESA),
    );
    setAdministrationFees(String(fees));
  }, [activeModal, selectedApp]);

  useEffect(() => {
    if (activeModal === 'issue' && selectedApp) {
      setIssuePoliceNumber(resolvePoliceNumber(selectedApp));
    }
  }, [activeModal, selectedApp]);

  useEffect(() => {
    const premium = Number(netPremium || 0);
    const splitCommission = Number.isFinite(premium)
      ? Math.round(premium * 0.05).toString()
      : '';
    setAgentCommission(splitCommission);
    setCompanyCommission(splitCommission);
  }, [netPremium]);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, string | number | boolean | File | null> | null>(null);
  const [originalEditFormData, setOriginalEditFormData] = useState<Record<string, string | number | boolean | File | null> | null>(null);
  const [visibleEditFields, setVisibleEditFields] = useState<Record<string, boolean>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Fetch agents emails function
  const fetchAgentsEmails = useCallback(async () => {
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getAgentsEmails`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch agents emails');
    }
    
    return await response.json();
  }, [token]);

  const allowedUploadTypes = useMemo(
    () => ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    []
  );

  const fileExtensionPattern = useMemo(() => /\.(jpe?g|png|pdf)$/i, []);

  const validateUpload = (file: File | null, field: string) => {
    if (!file) {
      setFileErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return true;
    }

    const mimeType = file.type?.toLowerCase();
    const fileName = file.name?.toLowerCase();
    const isAllowed =
      (mimeType && allowedUploadTypes.includes(mimeType)) ||
      (!mimeType && fileExtensionPattern.test(fileName || ''));

    if (!isAllowed) {
      const message = 'Unsupported file type. Please upload JPG, JPEG, PNG or PDF.';
      setFileErrors(prev => ({ ...prev, [field]: message }));
      showToast(message, 'error');
      return false;
    }

    setFileErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    return true;
  };

  const getFormValue = (value: string | number | boolean | File | null | undefined): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value.toString();
    if (value instanceof File) return '';
    return String(value);
  };

  const hasExistingValue = (value: unknown): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return !Number.isNaN(value);
    if (typeof value === 'boolean') return value === true;
    if (Array.isArray(value)) return value.length > 0;
    if (value instanceof File) return true;
    return true;
  };

  const buildInitialVisibility = (
    app: Application,
    formData: Record<string, string | number | boolean | File | null>
  ) => ({
    clientFullName: hasExistingValue(app.client?.fullName || app.fullName || ''),
    clientEmail: hasExistingValue(app.client?.email || app.email || ''),
    clientPhone: hasExistingValue(app.client?.phoneNumber || app.phoneNumber || ''),
    clientDob: hasExistingValue(app.client?.dateOfBirth || ''),
    clientAddress: hasExistingValue(app.client?.address || app.address || ''),
    clientProvince: hasExistingValue(app.client?.province || app.province || ''),
    clientDistrict: hasExistingValue(app.client?.district || app.district || ''),
    clientSector: hasExistingValue(app.client?.sector || app.sector || ''),
    clientIdentification: hasExistingValue(app.client?.identificationNumber || app.client?.nationalID || app.nationalID || ''),
    insuranceCategory: hasExistingValue(formData.insuranceCategory),
    plateNumber: hasExistingValue(formData.plateNumber),
    vehicleType: hasExistingValue(formData.vehicleType),
    vehicleAge: hasExistingValue(formData.vehicleAge),
    vehicleUse: hasExistingValue(formData.vehicleUse),
    otherVehicleUse: hasExistingValue(formData.otherVehicleUse),
    comesa: hasExistingValue(formData.isCOMESA),
    insuranceProvider: hasExistingValue(formData.insuranceProvider),
    insuranceType: hasExistingValue(formData.insuranceType),
    insuranceDuration: hasExistingValue(formData.insuranceDuration),
    amountField: hasExistingValue(formData.amount),
    netPremiumField: hasExistingValue(formData.netPremium),
    agentCommissionField: hasExistingValue(formData.agentCommission),
    companyCommissionField: hasExistingValue(formData.companyCommission),
    administrationFeesField: hasExistingValue(formData.administrationFees),
    transactionIdField: hasExistingValue(formData.transactionId),
    policeNumberField: hasExistingValue(formData.policeNumber),
    paymentInstructionsField: hasExistingValue(formData.paymentInstructions),
    submittedAtField: hasExistingValue(formData.submittedAt),
    statusField: hasExistingValue(formData.status),
    insuranceEndDateField: hasExistingValue(app.insuranceEndAt),
    invoiceUpload: hasExistingValue(app.invoice),
    insuranceCertificateUpload: hasExistingValue(app.insuranceCertificate),
    contractUpload: hasExistingValue(app.contract),
    receiptUpload: hasExistingValue(app.receipt),
    ebmUpload: hasExistingValue(app.ebm),
    proofOfPaymentInfo: hasExistingValue(app.proofOfPayment),
    transactionIdInfo: hasExistingValue(app.transactionId),
    policeNumberInfo: hasExistingValue(app.policeNumber),
    yellowCardInfo: hasExistingValue(app.yellowCard),
    pastInsuranceCertificateInfo: hasExistingValue(app.pastInsuranceCertificate),
  });

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setEditFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      } as Record<string, string | number | boolean | File | null>;
    });
  };

  const handleEditFileChange = useCallback(
    (field: string) => (file: File | null) => {
      setEditFormData((prev) => {
        if (!prev) return prev;
        return { ...prev, [field]: file };
      });
    },
    []
  );

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp || !editFormData || !originalEditFormData) return;
    if (!token) {
      showToast('You must be authenticated to edit applications.', 'error');
      return;
    }

    const changedFields: Record<string, string | number | boolean | File> = {};

    Object.keys(editFormData).forEach((key) => {
      const currentValue = editFormData[key];
      const originalValue = originalEditFormData[key];

      if (currentValue instanceof File) {
        changedFields[key] = currentValue;
      } else if (String(currentValue || '') !== String(originalValue || '')) {
        changedFields[key] = currentValue as string | number | boolean;
      }
    });

    if (
      'insuranceDuration' in editFormData &&
      editFormData.insuranceDuration !== undefined &&
      editFormData.insuranceDuration !== null
    ) {
      const durationErr = validateInsuranceDuration(String(editFormData.insuranceDuration ?? ''));
      if (durationErr) {
        showToast(durationErr, 'error');
        return;
      }
    }

    if (
      isMotorVehicleInsuranceCategory(String(editFormData.insuranceCategory ?? '')) &&
      'vehicleAge' in changedFields
    ) {
      const v = getFormValue(editFormData.vehicleAge);
      if (!v.trim()) {
        showToast('Vehicle year is required', 'error');
        return;
      }
      const yearErr = getVehicleManufactureYearValidationError(v);
      if (yearErr) {
        showToast(yearErr, 'error');
        return;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      showToast('No changes detected', 'info');
      return;
    }

    // Validate assignToAgent if wantsToAssignAgent is 'yes'
    const wantsToAssignAgent = String(editFormData.wantsToAssignAgent ?? '');
    const assignToAgent = String(editFormData.assignToAgent ?? '');
    const deductAgentAssignmentCommission = String(
      editFormData.deductAgentAssignmentCommission ?? 'yes',
    );
    if (wantsToAssignAgent === 'yes' && !assignToAgent) {
      showToast('Please select an agent to assign this application to', 'error');
      setIsSubmittingEdit(false);
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const formDataToSend = new FormData();

      // Only include assignment fields when the admin is actively (re)assigning.
      // This ensures the payload matches what `/admin/motor/new-application` sends.
      const assignmentFieldsChanged = (['wantsToAssignAgent', 'assignToAgent', 'deductAgentAssignmentCommission'] as const).some(
        (k) => Object.prototype.hasOwnProperty.call(changedFields, k),
      );

      Object.entries(changedFields).forEach(([key, value]) => {
        // Backend for `editApplicationAdmin` expects only the "assignment" payload keys.
        // `wantsToAssignAgent` is a UI helper and is not sent by `/admin/motor/new-application`.
        if (key === 'wantsToAssignAgent') return;

        // We'll append assignment keys explicitly below to ensure correct shape.
        if (key === 'assignToAgent' || key === 'deductAgentAssignmentCommission') return;

        if (value instanceof File) {
          formDataToSend.append(key, value);
        } else if (value !== null && value !== undefined) {
          if (key === 'insuranceDuration') {
            formDataToSend.append(key, normalizeInsuranceDurationPayload(String(value)));
          } else if (key === 'agentCommission') {
            // Ensure we never send NaN to the backend (Mongoose cast will throw).
            const raw = String(value).trim();
            const n = Number(raw);
            formDataToSend.append(key, Number.isFinite(n) ? n.toString() : '0');
          } else {
            formDataToSend.append(key, value.toString());
          }
        }
      });

      const agentCommissionChanged = Object.prototype.hasOwnProperty.call(changedFields, 'agentCommission');

      // Append assignment keys in the exact same shape as `/admin/motor/new-application`.
      if (assignmentFieldsChanged) {
        if (wantsToAssignAgent === 'yes') {
          formDataToSend.set('assignToAgent', assignToAgent);

          const v = deductAgentAssignmentCommission.toLowerCase();
          const deduct = v === 'yes' || v === 'true';
          formDataToSend.set(
            'deductAgentAssignmentCommission',
            deduct ? 'true' : 'false',
          );

          // Professional fix for backend cast error:
          // `/editApplicationAdmin` currently expects `agentCommission` to be a valid number.
          // When the admin hasn't edited the field, our diff logic might omit it entirely.
          // Sending `0` keeps the backend happy while it calculates the commission.
          const existingAgentCommission = formDataToSend.get('agentCommission');
          if (existingAgentCommission == null) {
            const rawAgentCommission = editFormData.agentCommission;
            const raw = String(rawAgentCommission ?? '').trim();
            const n = Number(raw);
            const safe = Number.isFinite(n) ? n.toString() : '0';
            formDataToSend.set('agentCommission', safe);
          }

          // Critical: some backend implementations recompute commission during assignment using request body fields.
          // Our edit modal normally sends a diff-only payload, so these may be missing and cause NaN math server-side.
          // Ensure they are present (sanitized) during agent assignment.
          const ensureFiniteNumberField = (key: 'amount' | 'companyCommission' | 'administrationFees') => {
            if (formDataToSend.get(key) != null) return;
            const raw = String(editFormData[key] ?? '').trim();
            const n = Number(raw);
            // Keep empty -> "0" rather than omitting, to avoid NaN math on the server.
            formDataToSend.set(key, Number.isFinite(n) ? n.toString() : '0');
          };
          ensureFiniteNumberField('amount');
          ensureFiniteNumberField('companyCommission');
          ensureFiniteNumberField('administrationFees');
        } else {
          // If admin switched to "No" and cleared the agent, send the cleared `assignToAgent`.
          // Don't send `deductAgentAssignmentCommission` (same as create flow).
          if (Object.prototype.hasOwnProperty.call(changedFields, 'assignToAgent')) {
            formDataToSend.set('assignToAgent', assignToAgent);
          }
        }
      }

      // If admin manually overrides agent commission, include the base numeric fields too.
      // This prevents backend recalculation paths (if any) from producing NaN or overwriting values.
      if (agentCommissionChanged) {
        const ensureFiniteNumberField = (key: 'amount' | 'companyCommission' | 'administrationFees') => {
          if (formDataToSend.get(key) != null) return;
          const raw = String(editFormData[key] ?? '').trim();
          const n = Number(raw);
          formDataToSend.set(key, Number.isFinite(n) ? n.toString() : '0');
        };
        ensureFiniteNumberField('amount');
        ensureFiniteNumberField('companyCommission');
        ensureFiniteNumberField('administrationFees');
      }

      // Optional: verify what we are sending.
      // Enable via `NEXT_PUBLIC_DEBUG_PAYLOAD=true`.
      if (process.env.NEXT_PUBLIC_DEBUG_PAYLOAD === 'true') {
        const assignmentEntries = Array.from(formDataToSend.entries()).filter(([k]) =>
          k === 'assignToAgent' || k === 'deductAgentAssignmentCommission',
        );
        console.debug('editApplicationAdmin assignment payload preview', {
          applicationId: editingApp._id,
          wantsToAssignAgent,
          assignToAgent,
          deductAgentAssignmentCommission,
          assignmentEntries,
        });
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/editApplicationAdmin/${editingApp._id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formDataToSend,
        }
      );

      if (!response.ok) {
        let errorMessage = 'Failed to update application';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      await response.json();
      showToast('Application updated successfully', 'success');
      setEditingApp(null);
      setEditFormData(null);
      setOriginalEditFormData(null);
      setVisibleEditFields({});
      await fetchApplications();
    } catch (error) {
      console.error('Error updating application:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to update application',
        'error'
      );
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Helper functions for date filtering
  const getFirstDayOfMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  };

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Set default date range to current month
  useEffect(() => {
    setStartDate(getFirstDayOfMonth());
    setEndDate(getCurrentDate());
  }, []);

  // Handle table scroll to show/hide fade indicators
  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    
    // Show left fade if scrolled past the beginning
    setShowLeftFade(scrollLeft > 0);
    
    // Show right fade if there's more content to scroll
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // Fetch applications from API
  const fetchApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/applications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }
      
      const data = await response.json();
      
      // Sort applications by submittedAt in descending order (newest first)
      const sortedApplications = data.data.sort((a: Application, b: Application) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setApplications(sortedApplications);
    } catch {
      showToast('Failed to load applications', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    if (token) {
      fetchApplications();
    }
  }, [token, fetchApplications]);

  // Filter applications based on search query, status, and date range
  const filteredApplications = applications.filter(app => {
    // Only search fields that have meaningful data
    const searchableFields = [];
    
    // Search in client object (new structure) or legacy fields
    const clientName = app.client?.fullName || app.fullName;
    const clientEmail = app.client?.email || app.email;
    
    if (clientName && clientName.trim()) {
      searchableFields.push(clientName.toLowerCase());
    }
    if (clientEmail && clientEmail.trim()) {
      searchableFields.push(clientEmail.toLowerCase());
    }
    if (app.applicationNumber && app.applicationNumber.trim()) {
      searchableFields.push(app.applicationNumber.toLowerCase());
    }
    
    const matchesSearch = searchQuery === '' || searchableFields.some(field => 
      field.includes(searchQuery.toLowerCase())
    );
    
    const matchesStatus = selectedStatus === 'all' || (app.status && app.status.toLowerCase() === selectedStatus);
    
    const matchesDateRange = (() => {
      if (!startDate && !endDate) return true;
      
      if (!app.submittedAt) return false; // Skip applications without submission date
      
      // Normalize dates to remove time components for accurate date comparison
      const appDate = new Date(app.submittedAt);
      const appDateOnly = new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate());
      
      const start = startDate ? new Date(startDate + 'T00:00:00') : null;
      const end = endDate ? new Date(endDate + 'T23:59:59') : null; // Set to end of day
      
      if (start && end) {
        return appDateOnly >= start && appDateOnly <= end;
      } else if (start) {
        return appDateOnly >= start;
      } else if (end) {
        return appDateOnly <= end;
      }
      return true;
    })();
    
    const matchesPerformedBy = matchesPerformedByFilter(app, selectedPerformedBy);
    
    return matchesSearch && matchesStatus && matchesDateRange && matchesPerformedBy;
  });

  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Start animation immediately when table is shown (regardless of data)
  useEffect(() => {
    if (!isLoading) {
      // Start animation immediately when table is shown
      setShowScrollHint(true);
      
      // Hide after animation completes (40 seconds)
      const timer = setTimeout(() => {
        setShowScrollHint(false);
      }, 40000); // 40 seconds total single flow

      return () => clearTimeout(timer);
    } else {
      // Hide during loading
      setShowScrollHint(false);
    }
  }, [isLoading]);

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: string) => {
    switch (filterType) {
      case 'search':
        setSearchQuery(value);
        break;
      case 'status':
        setSelectedStatus(value);
        break;
      case 'performedBy':
        setSelectedPerformedBy(value as PerformedByFilter);
        break;
      case 'startDate':
        setStartDate(value);
        break;
      case 'endDate':
        setEndDate(value);
        break;
    }
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle clearing all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedPerformedBy('all');
    setStartDate(getFirstDayOfMonth());
    setEndDate(getCurrentDate());
    setCurrentPage(1);
  };

  // Send invoice to client
 const handleSendInvoice = async () => {
  const hasAgent = selectedApp?.agent !== null && selectedApp?.agent !== undefined;
  const requiredFields = [!selectedApp, !invoiceMessage, !invoiceAmount, !netPremium, !companyCommission, !administrationFees];
  
  // Only require agent commission if there's an agent
  if (hasAgent) {
    requiredFields.push(!agentCommission);
  }
  
  if (requiredFields.some(field => field)) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  setIsProcessing(true);
  try {
    const formData = new FormData();
    formData.append('paymentInstructions', invoiceMessage);
    formData.append('amount', invoiceAmount);
    formData.append('netPremium', netPremium);
    formData.append('companyCommission', companyCommission);
    formData.append('administrationFees', administrationFees);
    
    // Only include agent commission if there's an agent
    if (hasAgent) {
      formData.append('agentCommission', agentCommission);
    }
    
    if (invoiceFile) {
      formData.append('invoice', invoiceFile);
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/sendInvoice/${selectedApp!._id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send invoice');
    }

    showToast(`Invoice sent to ${selectedApp?.client?.fullName || selectedApp?.fullName || 'client'}`, 'success');
    setInvoiceMessage('');
    setInvoiceAmount('');
    setNetPremium('');
    setAgentCommission('');
    setCompanyCommission('');
    setAdministrationFees('');
    setInvoiceFile(null);
    setSelectedApp(null);
    setActiveModal(null);
    // Refetch applications to get updated status
    await fetchApplications();
  } catch (error) {
    console.error('Error sending invoice:', error);
    showToast(error instanceof Error ? error.message : 'Failed to send invoice', 'error');
  } finally {
    setIsProcessing(false);
  }
};

  // Verify client payment
const handleVerifyPayment = async (action: 'approve' | 'reject') => {
  if (!selectedApp) return;
  
  // Set the appropriate loading state based on action
  if (action === 'approve') {
    setIsApprovingPayment(true);
  } else {
    setIsRejectingPayment(true);
  }
  
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/verifyPayment/${selectedApp._id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          ...(action === 'reject' && { reasonForPaymentRejection: rejectionComment })
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to verify payment');
    }

        showToast(
      action === 'approve' 
        ? `Payment from ${selectedApp.client?.fullName || selectedApp.fullName} verified` 
        : `Additional action is required from ${selectedApp.client?.fullName || selectedApp.fullName}`,
      action === 'approve' ? 'success' : 'info'
    );
    setRejectionComment('');
    setSelectedApp(null);
    setActiveModal(null);
    // Refetch applications to get updated status
    await fetchApplications();
  } catch (error) {
    console.error('Error verifying payment:', error);
    showToast(error instanceof Error ? error.message : 'Failed to verify payment', 'error');
  } finally {
    // Clear the appropriate loading state based on action
    if (action === 'approve') {
      setIsApprovingPayment(false);
    } else {
      setIsRejectingPayment(false);
    }
  }
};

  // Request action for application or payment
const handleReject = async (action: 'application' | 'payment') => {
  if (!selectedApp || !rejectionComment) {
    showToast('Please enter required action', 'error');
    return;
  }
  
  setIsRejecting(true);
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/sendApplicationForAction/${selectedApp._id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason: rejectionComment,
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to request action');
    }

    showToast(
      action === 'application' 
        ? `Action requested for ${selectedApp.client?.fullName || selectedApp.fullName}'s application` 
        : `Payment action requested for ${selectedApp.client?.fullName || selectedApp.fullName}`, 
      'info'
    );
    setRejectionComment('');
    setSelectedApp(null);
    setActiveModal(null);
    // Refetch applications to get updated status
    await fetchApplications();
  } catch (error) {
    console.error('Error requesting action:', error);
    showToast(error instanceof Error ? error.message : 'Failed to request action', 'error');
  } finally {
    setIsRejecting(false);
  }
};

  // Issue insurance to client
  const handleIssueInsurance = async () => {
    if (!selectedApp || !insuranceFile) {
      showToast('Please upload insurance certificate', 'error');
      return;
    }
    
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('insuranceCertificate', insuranceFile);
      if (contractFile) formData.append('contract', contractFile);
      if (receiptFile) formData.append('receipt', receiptFile);
      if (ebmFile) formData.append('ebm', ebmFile);
      const trimmedPoliceNumber = issuePoliceNumber.trim();
      if (trimmedPoliceNumber) {
        formData.append('policeNumber', trimmedPoliceNumber);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/issueInsurance/${selectedApp._id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to issue insurance');
      }

      showToast(`Insurance issued to ${selectedApp.client?.fullName || selectedApp.fullName}`, 'success');
      setInsuranceFile(null);
      setContractFile(null);
      setReceiptFile(null);
      setEbmFile(null);
      setIssuePoliceNumber('');
      setSelectedApp(null);
      setActiveModal(null);
      // Refetch applications to get updated status
      await fetchApplications();
    } catch (error) {
      console.error('Error issuing insurance:', error);
      showToast(error instanceof Error ? error.message : 'Failed to issue insurance', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Approve application
const handleApproveApplication = async () => {
  if (!selectedApp) return;
  
  try {
    setIsApproving(true);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/approveApplication/${selectedApp._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to approve application');
    }
    
    showToast('Application approved successfully', 'success');
    setActiveModal(null);
    setSelectedApp(null);
    fetchApplications();
  } catch (error) {
    console.error('Error approving application:', error);
    showToast('Failed to approve application', 'error');
  } finally {
    setIsApproving(false);
  }
};

  // Get status badge based on application status
  const getStatusBadge = (status: string) => {
    if (!status) {
      return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">Unknown</span>;
    }
    
    switch (status.toLowerCase()) {
      case ApplicationStatus.PENDING:
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">Pending</span>;
      case ApplicationStatus.APPLICATION_APPROVED:
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">Application Approved</span>;
      case ApplicationStatus.WAITING_FOR_USER_ACTION:
        return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">Waiting for User Action</span>;
      case ApplicationStatus.INVOICE_SENT:
        return <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">Invoice Sent</span>;
      case ApplicationStatus.REVIEW_PAYMENT:
        return <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">Review Payment</span>;
      case ApplicationStatus.PAYMENT_VERIFIED:
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">Payment Verified</span>;
      case ApplicationStatus.INSURANCE_ISSUED:
        return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">Insurance Issued</span>;
      case ApplicationStatus.CANCELLED:
        return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">Cancelled</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">Unknown</span>;
    }
  };

  // Get action buttons based on application status
const getActionButtons = (app: Application) => {
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="inline-flex items-center gap-1"
        onClick={() => {
          const formData = {
            insuranceCategory: app.insuranceCategory || '',
            insuranceType: app.insuranceType || '',
            insuranceDuration: app.insuranceDuration || '',
            insuranceProvider: app.insuranceProvider || '',
            plateNumber: app.vehicle?.plateNumber || '',
            vehicleType: app.vehicle?.vehicleType || app.vehicleType || '',
            vehicleAge: app.vehicle?.vehicleAge || app.vehicleAge || '',
            vehicleUse: app.vehicle?.vehicleUse || app.vehicleUse || '',
            otherVehicleUse: app.vehicle?.otherVehicleUse || app.otherVehicleUse || '',
            isCOMESA: Boolean(app.isCOMESA),
            amount: app.amount?.toString() || '',
            netPremium: app.netPremium?.toString() || '',
            paymentInstructions: app.paymentInstructions || '',
            transactionId: app.transactionId || '',
            policeNumber: app.policeNumber || '',
            companyCommission: app.companyCommission?.toString() || '',
            administrationFees: app.administrationFees || '',
            agentCommission: app.agentCommission?.toString() || '',
            status: app.status || '',
            submittedAt: app.submittedAt
              ? new Date(app.submittedAt).toISOString().split('T')[0]
              : '',
            insuranceEndAt: app.insuranceEndAt
              ? new Date(app.insuranceEndAt).toISOString().split('T')[0]
              : '',
            wantsToAssignAgent: app.agent?._id ? 'yes' : 'no',
            assignToAgent: app.agent?._id || '',
            deductAgentAssignmentCommission:
              app.deductAgentAssignmentCommission === false ? 'no' : 'yes',
            invoice: null as File | null,
            insuranceCertificate: null as File | null,
            contract: null as File | null,
            receipt: null as File | null,
            ebm: null as File | null,
          };

          setSelectedApp(null);
          setActiveModal(null);
          setEditFormData(formData);
          setOriginalEditFormData(JSON.parse(JSON.stringify(formData)));
          setEditingApp(app);
          setVisibleEditFields(buildInitialVisibility(app, formData));
        }}
      >
        <PencilLine className="h-4 w-4" />
        Edit
      </Button>

      <Button
        size="sm"
        variant="text"
        className="inline-flex items-center gap-1"
        onClick={() => {
          setSelectedApp(app);
          setActiveModal('details');
        }}
      >
        <Eye className="h-4 w-4" />
        View
      </Button>

      {app.status && app.status.toLowerCase() === ApplicationStatus.PENDING && (
        <Button
          size="sm"
          className="inline-flex items-center gap-1"
          onClick={() => {
            setSelectedApp(app);
            setActiveModal('review');
          }}
        >
          Review
        </Button>
      )}

      {app.status && app.status.toLowerCase() === ApplicationStatus.APPLICATION_APPROVED && (
        <Button
          size="sm"
          className="inline-flex items-center gap-1"
          onClick={() => {
            setSelectedApp(app);
            setActiveModal('invoice');
            setInvoiceAmount(app.amount != null ? String(app.amount) : '');
            setNetPremium(app.netPremium != null ? String(app.netPremium) : '');
            setInvoiceMessage(
              `Please make your payment to one of the following:\nBank of Kigali: 100000129075 (SONARWA)\nOr via Momo Account: 051499 (SONARWA) \nOr Agency at Kimihurura (KBC) under SOLEKTRA`
            );
          }}
        >
          Send Invoice
        </Button>
      )}

      {app.status && app.status.toLowerCase() === ApplicationStatus.REVIEW_PAYMENT && (
        <Button
          size="sm"
          className="inline-flex items-center gap-1"
          onClick={() => {
            setSelectedApp(app);
            setActiveModal('verify');
          }}
        >
          Verify Payment
        </Button>
      )}

      {app.status && app.status.toLowerCase() === ApplicationStatus.PAYMENT_VERIFIED && (
        <Button
          size="sm"
          className="inline-flex items-center gap-1"
          onClick={() => {
            setSelectedApp(app);
            setActiveModal('issue');
          }}
        >
          Issue Insurance
        </Button>
      )}
    </>
  );
};

  const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-6 p-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * 10, filteredApplications.length)}</span> of{' '}
              <span className="font-medium">{filteredApplications.length}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px " aria-label="Pagination">
              <Button
                variant="text"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="rounded-l-md"
              >
                <span className="sr-only">First</span>
                «
              </Button>
              <Button
                variant="text"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Previous</span>
                ‹
              </Button>
              
              {startPage > 1 && (
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  ...
                </span>
              )}
              
              {pages.map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'primary' : 'text'}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className={currentPage === page ? 'z-10 bg-[var(--main-blue)] border-[var(--main-blue)] text-white' : ''}
                >
                  {page}
                </Button>
              ))}
              
              {endPage < totalPages && (
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  ...
                </span>
              )}
              
              <Button
                variant="text"
                size="sm"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">Next</span>
                ›
              </Button>
              <Button
                variant="text"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="rounded-r-md"
              >
                <span className="sr-only">Last</span>
                »
              </Button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  const clientFullNameValue = editingApp?.client?.fullName || editingApp?.fullName || '';
  const clientEmailValue = editingApp?.client?.email || editingApp?.email || '';
  const clientPhoneValue = editingApp?.client?.phoneNumber || editingApp?.phoneNumber || '';
  const clientDobValue = editingApp?.client?.dateOfBirth
    ? new Date(editingApp.client.dateOfBirth).toISOString().split('T')[0]
    : '';
  const clientAddressValue = editingApp?.client?.address || editingApp?.address || '';
  const clientProvinceValue = editingApp?.client?.province || editingApp?.province || '';
  const clientDistrictValue = editingApp?.client?.district || editingApp?.district || '';
  const clientSectorValue = editingApp?.client?.sector || editingApp?.sector || '';
  const clientIdentificationValue =
    editingApp?.client?.identificationNumber ||
    editingApp?.client?.nationalID ||
    editingApp?.nationalID ||
    '';

  const insuranceCategoryValue = editFormData ? getFormValue(editFormData.insuranceCategory) : '';
  const plateNumberValue = editFormData ? getFormValue(editFormData.plateNumber) : '';
  const vehicleTypeValue = editFormData ? getFormValue(editFormData.vehicleType) : '';
  const vehicleAgeValue = editFormData ? getFormValue(editFormData.vehicleAge) : '';
  const vehicleUseValue = editFormData ? getFormValue(editFormData.vehicleUse) : '';
  const otherVehicleUseValue = editFormData ? getFormValue(editFormData.otherVehicleUse) : '';
  const insuranceProviderValue = editFormData ? getFormValue(editFormData.insuranceProvider) : '';
  const insuranceTypeValue = editFormData ? getFormValue(editFormData.insuranceType) : '';
  const insuranceDurationValue = editFormData ? getFormValue(editFormData.insuranceDuration) : '';

  const amountValue = editFormData ? getFormValue(editFormData.amount) : '';
  const netPremiumValue = editFormData ? getFormValue(editFormData.netPremium) : '';
  const agentCommissionValue = editFormData ? getFormValue(editFormData.agentCommission) : '';
  const companyCommissionValue = editFormData ? getFormValue(editFormData.companyCommission) : '';
  const administrationFeesValue = editFormData ? getFormValue(editFormData.administrationFees) : '';
  const transactionIdValue = editFormData ? getFormValue(editFormData.transactionId) : '';
  const policeNumberValue = editFormData ? getFormValue(editFormData.policeNumber) : '';
  const paymentInstructionsValue = editFormData ? getFormValue(editFormData.paymentInstructions) : '';
  const statusValue = editFormData ? getFormValue(editFormData.status) : '';
  const submittedAtValue = editFormData ? getFormValue(editFormData.submittedAt) : '';
  const insuranceEndDateValue = editFormData ? getFormValue(editFormData.insuranceEndAt) : '';

  const isVehicleInsurance =
    editFormData?.insuranceCategory === 'Car Insurance' ||
    editFormData?.insuranceCategory === 'MotorBike Insurance';

  const isPersistentlyVisible = (field: string) => visibleEditFields[field] ?? false;

  const showClientFullName = isPersistentlyVisible('clientFullName') || hasExistingValue(clientFullNameValue);
  const showClientEmail = isPersistentlyVisible('clientEmail') || hasExistingValue(clientEmailValue);
  const showClientPhone = isPersistentlyVisible('clientPhone') || hasExistingValue(clientPhoneValue);
  const showClientDob = isPersistentlyVisible('clientDob') || hasExistingValue(clientDobValue);
  const showClientAddress = isPersistentlyVisible('clientAddress') || hasExistingValue(clientAddressValue);
  const showClientProvince = isPersistentlyVisible('clientProvince') || hasExistingValue(clientProvinceValue);
  const showClientDistrict = isPersistentlyVisible('clientDistrict') || hasExistingValue(clientDistrictValue);
  const showClientSector = isPersistentlyVisible('clientSector') || hasExistingValue(clientSectorValue);
  const showClientIdentification =
    isPersistentlyVisible('clientIdentification') || hasExistingValue(clientIdentificationValue);

  const showClientInfoSection =
    showClientFullName ||
    showClientEmail ||
    showClientPhone ||
    showClientDob ||
    showClientAddress ||
    showClientProvince ||
    showClientDistrict ||
    showClientSector ||
    showClientIdentification;

  const showInsuranceCategory = isPersistentlyVisible('insuranceCategory') || hasExistingValue(insuranceCategoryValue);
  const showPlateNumber =
    isPersistentlyVisible('plateNumber') || (isVehicleInsurance && hasExistingValue(plateNumberValue));
  const showVehicleType =
    isPersistentlyVisible('vehicleType') || (isVehicleInsurance && hasExistingValue(vehicleTypeValue));
  const showVehicleAge =
    isPersistentlyVisible('vehicleAge') || (isVehicleInsurance && hasExistingValue(vehicleAgeValue));
  const showVehicleUse =
    isPersistentlyVisible('vehicleUse') || (isVehicleInsurance && hasExistingValue(vehicleUseValue));
  const showOtherVehicleUse =
    isPersistentlyVisible('otherVehicleUse') || (isVehicleInsurance && hasExistingValue(otherVehicleUseValue));
  const showComesaField =
    isPersistentlyVisible('comesa') ||
    (isVehicleInsurance && typeof editFormData?.isCOMESA === 'boolean' && Boolean(editFormData.isCOMESA));
  const showInsuranceProvider =
    isPersistentlyVisible('insuranceProvider') || hasExistingValue(insuranceProviderValue);
  const showInsuranceType = isPersistentlyVisible('insuranceType') || hasExistingValue(insuranceTypeValue);
  const showInsuranceDuration =
    isPersistentlyVisible('insuranceDuration') || hasExistingValue(insuranceDurationValue);

  const showInsuranceDetailsSection =
    showInsuranceCategory ||
    showPlateNumber ||
    showVehicleType ||
    showVehicleAge ||
    showVehicleUse ||
    showOtherVehicleUse ||
    showComesaField ||
    showInsuranceProvider ||
    showInsuranceType ||
    showInsuranceDuration;

  const showAmountField = isPersistentlyVisible('amountField') || hasExistingValue(amountValue);
  const showNetPremiumField =
    isPersistentlyVisible('netPremiumField') || hasExistingValue(netPremiumValue);
  const showAgentCommissionField =
    isPersistentlyVisible('agentCommissionField') || hasExistingValue(agentCommissionValue);
  const showCompanyCommissionField =
    isPersistentlyVisible('companyCommissionField') || hasExistingValue(companyCommissionValue);
  const showAdministrationFeesField =
    isPersistentlyVisible('administrationFeesField') || hasExistingValue(administrationFeesValue);
  const showTransactionIdField =
    isPersistentlyVisible('transactionIdField') || hasExistingValue(transactionIdValue);
  const showPoliceNumberField =
    isPersistentlyVisible('policeNumberField') || hasExistingValue(policeNumberValue);
  const showPaymentInstructionsField =
    isPersistentlyVisible('paymentInstructionsField') || hasExistingValue(paymentInstructionsValue);
  
  const assignToAgentValue = editFormData ? getFormValue(editFormData.assignToAgent) : '';
  const wantsToAssignAgentValue = editFormData ? getFormValue(editFormData.wantsToAssignAgent) : '';
  const deductAgentAssignmentCommissionValue = editFormData
    ? getFormValue(editFormData.deductAgentAssignmentCommission) || 'yes'
    : 'yes';
  // Always show agent assignment section in edit form
  const showAssignToAgentField = true;

  const showPaymentSection =
    showAmountField ||
    showNetPremiumField ||
    showAgentCommissionField ||
    showCompanyCommissionField ||
    showAdministrationFeesField ||
    showTransactionIdField ||
    showPoliceNumberField ||
    showPaymentInstructionsField;

  const showStatusField = isPersistentlyVisible('statusField') || hasExistingValue(statusValue);
  const showSubmittedAtField = isPersistentlyVisible('submittedAtField') || hasExistingValue(submittedAtValue);
  const showInsuranceEndDateField =
    isPersistentlyVisible('insuranceEndDateField') || hasExistingValue(insuranceEndDateValue);
  const showStatusSection = showStatusField || showSubmittedAtField || showInsuranceEndDateField;

  // Always show all insurance document upload fields while editing,
  // so admin can upload missing documents later (even if none exist yet)
  const showInvoiceUpload = true;
  const showInsuranceCertificateUpload = true;
  const showContractUpload = true;
  const showReceiptUpload = true;
  const showEbmUpload = true;

  const showInsuranceDocumentsSection = true;

  const showProofOfPaymentInfo =
    isPersistentlyVisible('proofOfPaymentInfo') || hasExistingValue(editingApp?.proofOfPayment);
  const showTransactionIdInfo =
    isPersistentlyVisible('transactionIdInfo') || hasExistingValue(editingApp?.transactionId);
  const showPoliceNumberInfo =
    isPersistentlyVisible('policeNumberInfo') || hasExistingValue(editingApp?.policeNumber);
  const showYellowCardInfo = isPersistentlyVisible('yellowCardInfo') || hasExistingValue(editingApp?.yellowCard);
  const showPastInsuranceCertificateInfo =
    isPersistentlyVisible('pastInsuranceCertificateInfo') || hasExistingValue(editingApp?.pastInsuranceCertificate);

  const showAgentInfoSection =
    showProofOfPaymentInfo ||
    showTransactionIdInfo ||
    showPoliceNumberInfo ||
    showYellowCardInfo ||
    showPastInsuranceCertificateInfo;

  // PDF Download Function
  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = await import('jspdf-autotable');
      
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();
      
                // Add title
          doc.setFontSize(20);
          doc.setTextColor(10, 37, 64); // Dark blue color
          doc.text('Ezinsure Applications Report', 14, 20);
      
      // Add subtitle with date and time
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${currentDate} at ${currentTime}`, 14, 30);
      
      // Add filter information
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      let filterY = 40;
      
      if (searchQuery) {
        doc.text(`Search Query: ${searchQuery}`, 14, filterY);
        filterY += 6;
      }
      
      if (selectedStatus !== 'all') {
        doc.text(`Status Filter: ${(selectedStatus || '').replace('_', ' ')}`, 14, filterY);
        filterY += 6;
      }

      if (selectedPerformedBy !== 'all') {
        doc.text(`Performed By: ${performedByFilterLabel(selectedPerformedBy)}`, 14, filterY);
        filterY += 6;
      }
      
      if (startDate || endDate) {
        doc.text(`Date Range: ${startDate || 'beginning'} to ${endDate || 'now'}`, 14, filterY);
        filterY += 6;
      }
      
      // Add summary information
      filterY += 3;
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Total Applications: ${filteredApplications.length}`, 14, filterY);
      filterY += 5;
      
      // Calculate totals
      const totalAmount = filteredApplications.reduce((sum, app) => sum + (app.amount || 0), 0);
      const totalCompanyCommission = filteredApplications.reduce((sum, app) => sum + (app.companyCommission || 0), 0);
      const totalAgentCommission = filteredApplications.reduce((sum, app) => sum + (app.agentCommission || 0), 0);
      
      doc.text(`Total Amount: ${totalAmount.toLocaleString()} RWF`, 14, filterY);
      filterY += 5;
      doc.text(`Total Company Commission: ${totalCompanyCommission.toLocaleString()} RWF`, 14, filterY);
      filterY += 5;
      doc.text(`Total Agent Commission: ${totalAgentCommission.toLocaleString()} RWF`, 14, filterY);
      
      // Helper function to format dates for PDF
      const formatDateForPDF = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        
        try {
          const date = new Date(dateString);
          // Check if date is valid
          if (isNaN(date.getTime())) {
            return 'Invalid Date';
          }
          
          // Format as DD/MM/YYYY for PDF readability
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        } catch {
          return 'Date Error';
        }
      };
      
      // Prepare table data with text truncation for better fit
      const tableData = filteredApplications.map((app, index) => {
        const clientName = app.client?.fullName || app.fullName || '';
        const clientEmail = app.client?.email || app.email || '';
        const createdBy = app.admin ? `Admin: ${app.admin.fullName}` : 
                         app.agent ? `Agent: ${app.agent.fullName}` : 'Client';
        
        const row = [
          (index + 1).toString(),
          clientName.length > 28 ? clientName.substring(0, 28) + '...' : clientName,
          clientEmail.length > 32 ? clientEmail.substring(0, 32) + '...' : clientEmail,
          (app.insuranceCategory || '').length > 22 ? (app.insuranceCategory || '').substring(0, 22) + '...' : (app.insuranceCategory || ''),
          formatDateForPDF(app.insuranceEndAt),
          createdBy.length > 22 ? createdBy.substring(0, 22) + '...' : createdBy,
          app.amount ? `${app.amount.toLocaleString()} RWF` : '0 RWF',
          app.companyCommission ? `${app.companyCommission.toLocaleString()} RWF` : '0 RWF',
          app.agentCommission ? `${app.agentCommission.toLocaleString()} RWF` : '0 RWF',
          formatPoliceNumberDisplay(app),
          formatDateForPDF(app.submittedAt),
          (app.status || '').replace('_', ' ').toUpperCase()
        ];
        
        return row;
      });
      
      // Add table
      autoTable.default(doc, {
        head: [
          ['#', 'Client Name', 'Email', 'Category', 'End Date', 'Performed By', 'Amount', 'Company Comm.', 'Agent Comm.', 'Police Number', 'Date', 'Status']
        ],
        body: tableData,
        startY: filterY + 10,
        styles: {
          fontSize: 7,
          cellPadding: 1,
          overflow: 'linebreak',
          font: 'helvetica',
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          fillColor: false,
          halign: 'left',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [51, 122, 183], // Lighter blue header
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' }, // #
          1: { cellWidth: 30, halign: 'left' }, // Name
          2: { cellWidth: 35, halign: 'left' }, // Email
          3: { cellWidth: 25, halign: 'left' }, // Category
          4: { cellWidth: 25, halign: 'left' }, // End Date
          5: { cellWidth: 25, halign: 'left' }, // Performed By
          6: { cellWidth: 25, halign: 'right' }, // Amount
          7: { cellWidth: 25, halign: 'right' }, // Company Comm
          8: { cellWidth: 25, halign: 'right' }, // Agent Comm
          9: { cellWidth: 22, halign: 'left' }, // Police Number
          10: { cellWidth: 25, halign: 'center' }, // Date
          11: { cellWidth: 25, halign: 'center' }, // Status
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { top: 10, right: 8, bottom: 10, left: 8 },
        pageBreak: 'auto',
        showFoot: 'lastPage',
        didDrawPage: function (data) {
          // Add page numbers
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
        },
      });
      
      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString().replace(/:/g, '-');
      const filename = `insurance_applications_${dateStr}_${timeStr}.pdf`;
      
      // Save the PDF
      doc.save(filename);
      
      showToast('PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF', 'error');
    }
  };

  // Excel Download Function
  const handleDownloadExcel = () => {
    try {
      // Helper function to format dates for Excel
      const formatDateForExcel = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        
        try {
          const date = new Date(dateString);
          // Check if date is valid
          if (isNaN(date.getTime())) {
            return 'Invalid Date';
          }
          
          // Format as YYYY-MM-DD for Excel compatibility
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch {
          return 'Date Error';
        }
      };

      // Prepare headers
      const headers = [
        'Client Name', 'Email', 'Phone', 'Insurance Category', 'Insurance Type', 
        'Duration', 'Insurance End Date', 'Performed By', 'Amount (RWF)', 'Company Commission (RWF)', 
        'Agent Commission (RWF)', 'Police Number', 'Date', 'Status', 'Address', 'Province', 'District', 'Sector'
      ];
      
      // Prepare data rows
      const csvData = filteredApplications.map((app) => {
        const clientName = app.client?.fullName || app.fullName || '';
        const clientEmail = app.client?.email || app.email || '';
        const clientPhone = app.client?.phoneNumber || app.phoneNumber || '';
        const clientAddress = app.client?.address || app.address || '';
        const clientProvince = app.client?.province || app.province || '';
        const clientDistrict = app.client?.district || app.district || '';
        const clientSector = app.client?.sector || app.sector || '';
        const createdBy = app.admin ? `Admin: ${app.admin.fullName}` : 
                         app.agent ? `Agent: ${app.agent.fullName}` : 'Client';
        
        const row = [
          clientName,
          clientEmail,
          clientPhone,
          app.insuranceCategory || '',
          app.insuranceType || '',
          app.insuranceDuration || '',
          formatDateForExcel(app.insuranceEndAt),
          createdBy,
          app.amount ? app.amount.toString() : '0',
          app.companyCommission ? app.companyCommission.toString() : '0',
          app.agentCommission ? app.agentCommission.toString() : '0',
          formatPoliceNumberDisplay(app),
          formatDateForExcel(app.submittedAt),
          (app.status || '').replace('_', ' '),
          clientAddress,
          clientProvince,
          clientDistrict,
          clientSector
        ];
        
        return row;
      });
      
      // Combine headers and data
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          row.map(cell => 
            typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
          ).join(',')
        )
      ].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      
      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString().replace(/:/g, '-');
      const filename = `insurance_applications_${dateStr}_${timeStr}.csv`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('Excel file downloaded successfully', 'success');
    } catch (error) {
      console.error('Error generating Excel file:', error);
      showToast('Failed to generate Excel file', 'error');
    }
  };

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-8">

        <div className="mb-8 mt-16">
          <h1 className="text-3xl font-bold mb-2 fade-in">Manage Insurance Applications</h1>
          <p className="text-gray-600 slide-up">Review and process client insurance applications</p>
        </div>

        {/* Search and filter section */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm slide-in-right">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 tracking-wide mb-1 uppercase">Search Applications</label>
              <Input
                label="Search"
                hideLabel
                size="compact"
                className="mb-0"
                name="search"
                placeholder="Search by name, email or ID..."
                value={searchQuery}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                }
              />
            </div>
            
            {/* Status Select */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 tracking-wide mb-1 uppercase">Status Filter</label>
              <select
                value={selectedStatus}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] bg-white"
              >
                <option value="all">All Statuses</option>
                <option value={ApplicationStatus.PENDING}>Pending</option>
                <option value={ApplicationStatus.APPLICATION_APPROVED}>Application Approved</option>
                <option value={ApplicationStatus.WAITING_FOR_USER_ACTION}>Waiting for User Action</option>
                <option value={ApplicationStatus.INVOICE_SENT}>Invoice Sent</option>
                <option value={ApplicationStatus.REVIEW_PAYMENT}>Review Payment</option>
                <option value={ApplicationStatus.PAYMENT_VERIFIED}>Payment Verified</option>
                <option value={ApplicationStatus.INSURANCE_ISSUED}>Insurance Issued</option>
                <option value={ApplicationStatus.CANCELLED}>Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 tracking-wide mb-1 uppercase">Performed By</label>
              <select
                value={selectedPerformedBy}
                onChange={(e) => handleFilterChange('performedBy', e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] bg-white"
              >
                <option value="all">All</option>
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
                <option value="client">Client</option>
              </select>
            </div>
            
            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 tracking-wide mb-1 uppercase">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] bg-white"
              />
            </div>
            
            {/* End Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 tracking-wide mb-1 uppercase">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] bg-white"
              />
            </div>
          </div>
          
          {/* Filter Actions */}
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="text-sm text-gray-500">
              {searchQuery && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">Search: {searchQuery}</span>}
              {selectedStatus !== 'all' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">Status: {(selectedStatus || '').replace('_', ' ')}</span>}
              {selectedPerformedBy !== 'all' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 mr-2">Performed By: {performedByFilterLabel(selectedPerformedBy)}</span>}
              {(startDate || endDate) && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Date Range: {startDate || 'beginning'} - {endDate || 'now'}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredApplications.length > 0 && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleDownloadPDF}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                    Download PDF
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleDownloadExcel}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                    Download Excel
                  </Button>

                </>
              )}
              <Button
                variant="text"
                size="sm"
                onClick={handleClearFilters}
                className="text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 px-3 py-1.5"
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{filteredApplications.length}</span> of <span className="font-medium">{applications.length}</span> applications
              {selectedStatus !== 'all' && (
                <span> with status: <span className="font-medium capitalize">{(selectedStatus || '').replace('_', ' ')}</span></span>
              )}
              {(startDate || endDate) && (
                <span> from <span className="font-medium">{startDate || 'beginning'}</span> to <span className="font-medium">{endDate || 'now'}</span></span>
              )}
            </div>
            {filteredApplications.length > 0 && (
              <div className="text-sm text-gray-500">
                Page {currentPage} of {Math.ceil(filteredApplications.length / itemsPerPage)}
              </div>
            )}
          </div>
        </div>

        {/* Applications table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden fade-in">
          {/* Scroll hint - show when table is displayed and animation hasn't completed */}
          {!isLoading && showScrollHint && (
            <div className="w-screen py-2 bg-blue-50 border-b border-blue-200 overflow-hidden relative">
              {/* Left gradient fade */}
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-blue-50 to-transparent z-10 pointer-events-none"></div>
              
              {/* Right gradient fade */}
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-blue-50 to-transparent z-10 pointer-events-none"></div>
              
              {/* Flowing text */}
              <div className="flex items-center justify-center text-sm text-blue-700">
                <span className="animate-flowing-text">Scroll to the left to view all columns</span>
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[var(--mid-gray)] border-t-[var(--main-blue)]"></div>
              <p className="mt-4 text-gray-600">Loading applications...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-gray-600">No applications found</p>
              {(searchQuery || selectedStatus !== 'all' || startDate || endDate) && (
                <p className="mt-2 text-sm text-gray-500">Try adjusting your filters</p>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* Left fade indicator */}
              {showLeftFade && (
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-100 via-gray-50/80 to-transparent z-10 pointer-events-none"></div>
              )}
              
              {/* Right fade indicator */}
              {showRightFade && (
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-100 via-gray-50/80 to-transparent z-10 pointer-events-none"></div>
              )}
              
              <div className="overflow-x-auto" onScroll={handleTableScroll}>
                <table className="w-full">
               <thead className="bg-gray-50">
  <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">ID</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Client</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Insurance Category</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Insurance End Date</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Created By</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Amount</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Company Commission</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Agent Commission</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Date</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>
  </tr>
</thead>
                <tbody className="divide-y divide-gray-200">
                 {paginatedApplications.map((app, index) => (
  <tr key={app._id} className="hover:bg-gray-50 transition-colors ">
    <td className="px-4 py-4 text-sm whitespace-nowrap font-medium text-[var(--main-blue)]">
      #{(currentPage - 1) * itemsPerPage + index + 1}
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      <div className="flex items-center">
        <div>
          <div className="text-sm font-medium text-gray-900">{app.client?.fullName || app.fullName || 'N/A'}</div>
          <div className="text-sm text-gray-500">{app.client?.email || app.email || 'N/A'}</div>
        </div>
      </div>
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      <div className="text-sm text-gray-900 capitalize">{app.insuranceCategory || 'N/A'}</div>
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      <div className="text-sm text-gray-900">
        {formatDateUTC(app.insuranceEndAt)}
      </div>
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      <div className="text-sm text-gray-900">
        {app.admin ? (
          <>
            <div className="font-medium text-[var(--main-blue)]">Admin</div>
            <div className="text-gray-600">{app.admin.fullName}</div>
          </>
        ) : app.agent ? (
          <>
            <div className="font-medium text-[var(--main-blue)]">Agent</div>
            <div className="text-gray-600">{app.agent.fullName}</div>
          </>
        ) : (
          <div className="font-medium text-gray-700">Client</div>
        )}
      </div>
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      <div className="text-sm text-gray-900">
        {app.amount ? `${app.amount.toLocaleString()} RWF` : '0 RWF'}
      </div>
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      <div className="text-sm text-gray-900">
        {app.companyCommission ? `${app.companyCommission.toLocaleString()} RWF` : '0 RWF'}
      </div>
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      <div className="text-sm text-gray-900">
        {app.agentCommission ? `${app.agentCommission.toLocaleString()} RWF` : '0 RWF'}
      </div>
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500">{formatDateUTC(app.submittedAt)}</td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      {getStatusBadge(app.status)}
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap font-medium">
      <div className="flex flex-nowrap items-center gap-2">
        {getActionButtons(app)}
      </div>
    </td>
  </tr>
))}
                </tbody>
              </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredApplications.length / itemsPerPage)}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

   {/* Modal for reviewing pending application */}
{selectedApp   && activeModal === 'review' && selectedApp.status && selectedApp.status.toLowerCase() === ApplicationStatus.PENDING && (
  <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
    <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4 fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Review Application</h3>
        <button onClick={() => {setSelectedApp(null); setActiveModal(null);}} className="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="bg-[var(--light-gray)] p-4 rounded-lg mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Application ID</p>
            <p className="font-semibold">#{selectedApp.applicationNumber}</p>
          </div>
          <div>
            {getStatusBadge(selectedApp.status)}
          </div>
        </div>
      </div>
      
      {/* Enhanced application details section with all fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Personal Info */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Full Name</p>
            <p className="font-semibold">{selectedApp.client?.fullName || selectedApp.fullName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-semibold">{selectedApp.client?.email || selectedApp.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-semibold">{selectedApp.client?.phoneNumber || selectedApp.phoneNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date of Birth</p>
            <p className="font-semibold">{(selectedApp.client?.dateOfBirth || selectedApp.dateOfBirth) ? new Date(selectedApp.client?.dateOfBirth || selectedApp.dateOfBirth!).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>
        
        {/* Address Info */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-semibold">{selectedApp.client?.address || selectedApp.address || 'N/A'}</p>
          </div>
        </div>
        
        {/* Insurance Info */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Insurance Category</p>
            <p className="font-semibold">{selectedApp.insuranceCategory || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Insurance Type</p>
            <p className="font-semibold">{selectedApp.insuranceType || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Duration</p>
            <p className="font-semibold">{selectedApp.insuranceDuration || 'N/A'}</p>
          </div>
          {selectedApp.insuranceEndAt && (
            <div>
              <p className="text-sm text-gray-500">Insurance End Date</p>
              <p className="font-semibold">{formatDateUTC(selectedApp.insuranceEndAt)}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Created By</p>
            <p className="font-semibold">
              {selectedApp.admin ? `Admin: ${selectedApp.admin.fullName}` : 
               selectedApp.agent ? `Agent: ${selectedApp.agent.fullName}` : 'Client'}
            </p>
          </div>
          {selectedApp.amount && (
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-semibold">{selectedApp.amount.toLocaleString()} RWF</p>
            </div>
          )}
          {selectedApp.netPremium !== undefined && selectedApp.netPremium !== null && (
            <div>
              <p className="text-sm text-gray-500">Net Premium</p>
              <p className="font-semibold">{selectedApp.netPremium.toLocaleString()} RWF</p>
            </div>
          )}
          {selectedApp.insuranceProvider && (
            <div>
              <p className="text-sm text-gray-500">Insurance Provider</p>
              <p className="font-semibold">{selectedApp.insuranceProvider}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Police number</p>
            <p className="font-semibold">{formatPoliceNumberDisplay(selectedApp)}</p>
          </div>
          {selectedApp.isCOMESA !== undefined && (
            <div>
              <p className="text-sm text-gray-500">COMESA Coverage</p>
              <p className="font-semibold">{selectedApp.isCOMESA ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
        
        {/* Vehicle Info (if applicable) */}
        {(selectedApp.vehicle || selectedApp.vehicleType || selectedApp.vehicleAge) && (
          <div className="space-y-4">
            {(selectedApp.vehicle?.vehicleType || selectedApp.vehicleType) && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Type</p>
                <p className="font-semibold">{selectedApp.vehicle?.vehicleType || selectedApp.vehicleType}</p>
              </div>
            )}
            {(selectedApp.vehicle?.vehicleAge || selectedApp.vehicleAge) && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Year</p>
                <p className="font-semibold">{selectedApp.vehicle?.vehicleAge || selectedApp.vehicleAge}</p>
              </div>
            )}
            {(selectedApp.vehicle?.vehicleUse || selectedApp.vehicleUse) && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Use</p>
                <p className="font-semibold">
                  {(selectedApp.vehicle?.vehicleUse || selectedApp.vehicleUse) === 'Other' 
                    ? (selectedApp.vehicle?.otherVehicleUse || selectedApp.otherVehicleUse)
                    : (selectedApp.vehicle?.vehicleUse || selectedApp.vehicleUse)}
                </p>
              </div>
            )}
            {selectedApp.vehicle?.plateNumber && (
              <div>
                <p className="text-sm text-gray-500">Plate Number</p>
                <p className="font-semibold">{selectedApp.vehicle.plateNumber}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Commission Info (if available) */}
        {(selectedApp.companyCommission || selectedApp.agentCommission) && (
          <div className="space-y-4">
            {selectedApp.companyCommission && (
              <div>
                <p className="text-sm text-gray-500">Company Commission</p>
                <p className="font-semibold">{selectedApp.companyCommission.toLocaleString()} RWF</p>
              </div>
            )}
            {selectedApp.agentCommission && (
              <div>
                <p className="text-sm text-gray-500">Agent Commission</p>
                <p className="font-semibold">{selectedApp.agentCommission.toLocaleString()} RWF</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Documents Section */}
      <div className="bg-[var(--light-gray)] p-4 rounded-lg mb-4">
        <h4 className="font-medium mb-2">Documents</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            className="bg-white p-3 rounded border text-left hover:bg-gray-50"
            onClick={() => setViewingDocument({
              name: 'National ID / Passport',
              path: selectedApp.client?.nationalID || selectedApp.nationalID || ''
            })}
          >
            <p className="text-sm font-medium">National ID / Passport</p>
            <p className="text-xs text-gray-500">View Document</p>
          </button>
          <button 
            className="bg-white p-3 rounded border text-left hover:bg-gray-50"
            onClick={() => setViewingDocument({
              name: 'Yellow Card',
              path: selectedApp.yellowCard || ''
            })}
          >
            <p className="text-sm font-medium">Yellow Card</p>
            <p className="text-xs text-gray-500">View Document</p>
          </button>
          {selectedApp.pastInsuranceCertificate && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'Past Insurance Certificate',
                path: selectedApp.pastInsuranceCertificate || '/File_not_found.jpg'
              })}
            >
              <p className="text-sm font-medium">Past Insurance</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Action Required Reason (if requesting action)</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] sm:text-sm"
          rows={4}
          value={rejectionComment}
          onChange={(e) => setRejectionComment(e.target.value)}
          placeholder="Enter reason for requesting action on this application..."
        />
      </div>
      
      <div className="flex justify-end gap-2 mt-6">
  <Button 
    variant="text" 
    onClick={() => {setSelectedApp(null); setActiveModal(null);}} 
    disabled={isApproving || isRejecting}
  >
    Cancel
  </Button>
  <Button 
    variant="danger" 
    onClick={() => handleReject('application')}
    disabled={!rejectionComment || isRejecting || isApproving}
    // loading={isRejecting}
  >
    {isRejecting ? 'Processing...' : 'Request For Action'}
  </Button>
  <Button 
    onClick={handleApproveApplication}
    disabled={rejectionComment.length > 0 || isApproving || isRejecting}
    // loading={isApproving}
  >
    {isApproving ? 'Processing...' : 'Approve Application'}
  </Button>
</div>
    </div>
  </div>
)}

      {/* Modal for sending invoice */}
      {selectedApp && activeModal === 'invoice' && selectedApp.status && selectedApp.status.toLowerCase() === ApplicationStatus.APPLICATION_APPROVED && (
  <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
    <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 fade-in">
      <h3 className="text-lg font-semibold mb-4">Send Invoice to {selectedApp.client?.fullName || selectedApp.fullName}</h3>
              <p className="text-gray-600 mb-4">Enter the invoice details for {selectedApp.insuranceCategory} insurance:</p>
      
      {/* Amount field */}
     <div className="mt-4">
        <NumericInputField
          label="Amount (RWF)"
          name="invoiceAmount"
          accent="invoice"
          className="mb-0"
          labelClassName="text-sm font-medium text-gray-700 mb-1"
          value={String(invoiceAmount || (selectedApp.amount != null ? selectedApp.amount : '') || '')}
          onChange={setInvoiceAmount}
          min={0}
          maxDigits={12}
          placeholder="Enter amount"
          required
        />
        {isMotorVehicleInsuranceCategory(selectedApp.insuranceCategory || '') && (
          <p className="mt-2 text-xs text-gray-600 rounded-md bg-slate-50 border border-slate-100 px-3 py-2">
            <span className="font-medium text-gray-700">COMESA on this application:</span>{' '}
            {selectedApp.isCOMESA ? (
              <span>Yes — administration fees use 25% of 12,500 RWF (see below).</span>
            ) : (
              <span>No — administration fees use 25% of 2,500 RWF (see below).</span>
            )}
          </p>
        )}
      </div>

      <div className="mt-4">
        <NumericInputField
          label="Net Premium (RWF)"
          name="netPremium"
          accent="invoice"
          className="mb-0"
          labelClassName="text-sm font-medium text-gray-700 mb-1"
          value={netPremium}
          onChange={setNetPremium}
          min={0}
          maxDigits={12}
          placeholder="Enter net premium"
          required
        />
      </div>

      {/* Agent Commission field - only show if application has an agent */}
      {selectedApp.agent && (
        <div className="mt-4">
          <NumericInputField
            label="Agent Commission (RWF)"
            name="agentCommission"
            accent="invoice"
            className="mb-0"
            labelClassName="text-sm font-medium text-gray-700 mb-1"
            value={agentCommission}
            onChange={() => {}}
            min={0}
            maxDigits={12}
            placeholder="Auto-calculated from net premium"
            disabled
            required
          />
        </div>
      )}

      {/* Company Commission field */}
      <div className="mt-4">
        <NumericInputField
          label="Company Commission (RWF)"
          name="companyCommission"
          accent="invoice"
          className="mb-0"
          labelClassName="text-sm font-medium text-gray-700 mb-1"
          value={companyCommission}
          onChange={() => {}}
          min={0}
          maxDigits={12}
          placeholder="Auto-calculated from net premium"
          disabled
          required
        />
      </div>

      {/* Administration Fees field */}
      <div className="mt-4">
        <NumericInputField
          label="Administration Fees (RWF)"
          name="administrationFees"
          accent="invoice"
          className="mb-0"
          labelClassName="text-sm font-medium text-gray-700 mb-1"
          value={administrationFees}
          onChange={setAdministrationFees}
          min={0}
          maxDigits={12}
          placeholder="Administration fees (from application rules)"
          required
        />
        {isMotorVehicleInsuranceCategory(selectedApp.insuranceCategory || '') ? (
          <div className="mt-2 text-sm text-gray-600 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
            Administration fees (amount above):{' '}
            <strong className="text-gray-900">
              {administrationFees
                ? Number(administrationFees).toLocaleString()
                : calculateAdministrationFeesRwf(
                    selectedApp.insuranceCategory || '',
                    Boolean(selectedApp.isCOMESA),
                  ).toLocaleString()}{' '}
              RWF
            </strong>
            <span className="text-gray-500">
              {' '}
              {selectedApp.isCOMESA ? (
                <> — 25% of 12,500 RWF because COMESA was selected on this application.</>
              ) : (
                <> — 25% of 2,500 RWF (COMESA not selected on this application).</>
              )}
            </span>
          </div>
        ) : (
          <p className="text-xs text-gray-500 mt-1">
            Calculated as 25% of 1,500 RWF for this insurance category. You may adjust the field if needed.
          </p>
        )}
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Instructions *</label>
        <textarea
          className="w-full px-3 py-2 border border-[var(--card-green)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--card-green)] focus:border-[var(--card-green)] sm:text-sm"
          rows={4}
          value={invoiceMessage}
          onChange={(e) => setInvoiceMessage(e.target.value)}
          placeholder="Enter payment instructions..."
          required
        />
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Attachment (Optional)</label>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            if (validateUpload(file, 'invoice')) {
              setInvoiceFile(file);
            } else {
              setInvoiceFile(null);
              e.target.value = '';
            }
          }}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-[var(--main-blue)] file:text-white
            hover:file:bg-[var(--secondary-blue)]
          "
        />
        {fileErrors.invoice && (
          <p className="mt-1 text-sm text-[var(--error-red)]">{fileErrors.invoice}</p>
        )}
        {invoiceFile && (
          <button 
            className="mt-2 text-sm text-[var(--main-blue)] hover:underline"
            onClick={() => setViewingDocument({
              name: invoiceFile.name,
              path: URL.createObjectURL(invoiceFile)
            })}
          >
            View: {invoiceFile.name}
          </button>
        )}
      </div>
      
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="text" onClick={() => {setSelectedApp(null); setActiveModal(null);}} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={handleSendInvoice} disabled={isProcessing || !invoiceMessage || !invoiceAmount || !companyCommission || !administrationFees || (selectedApp.agent !== null && selectedApp.agent !== undefined && !agentCommission)}>
          {isProcessing ? 'Sending...' : 'Send Invoice'}
        </Button>
      </div>
    </div>
  </div>
)}

      {/* Modal for verifying payment */}
      {selectedApp && activeModal === 'verify' && selectedApp.status && selectedApp.status.toLowerCase() === ApplicationStatus.REVIEW_PAYMENT && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 fade-in">
            <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Verify Payment</h3>
        <button onClick={() => {setSelectedApp(null); setActiveModal(null);}} className="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
            <p className="text-gray-600 mb-4">Review payment proof for {selectedApp.client?.fullName || selectedApp.fullName}&apos;s application:</p>
            
            <div className="border rounded-lg p-4 mb-4 bg-gray-50">
              <p className="font-medium">Payment Details:</p>
              <ul className="mt-2 space-y-1 text-sm">
                {selectedApp.invoiceId && (
                  <li><span className="text-gray-600">Invoice ID:</span> {selectedApp.invoiceId}</li>
                )}
                {selectedApp.invoice && (
                  <li><span className="text-gray-600">Quotation / Invoice:</span> 
                    <button 
                      className="text-[var(--main-blue)] hover:underline ml-1"
                      onClick={() => setViewingDocument({
                        name: 'Quotation / Invoice',
                        path: selectedApp.invoice || '/File_not_found.jpg'
                      })}
                    >
                      View Document
                    </button>
                  </li>
                )}
                {selectedApp.amount && (
                  <li><span className="text-gray-600">Amount Expected:</span> {selectedApp.amount} RWF</li>
                )}
                
                
                {selectedApp.proofOfPayment && (
                  <li><span className="text-gray-600">Payment Proof:</span> 
                    <button 
                      className="text-[var(--main-blue)] hover:underline ml-1"
                      onClick={() => setViewingDocument({
                        name: 'Payment Proof',
                        path: selectedApp.proofOfPayment || '/File_not_found.jpg'
                      })}
                    >
                      View Document
                    </button>
                  </li>
                )}
                {selectedApp.transactionId && (
                  <li><span className="text-gray-600">Transaction ID:</span> {selectedApp.transactionId}</li>
                )}
                <li><span className="text-gray-600">Police number:</span> {formatPoliceNumberDisplay(selectedApp)}</li>
                <li><span className="text-gray-600">Date Submitted:</span> {new Date(selectedApp.submittedAt).toLocaleDateString()}</li>
              </ul>
            </div>

            <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Action Required Reason (if requesting action)</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] sm:text-sm"
          rows={4}
          value={rejectionComment}
          onChange={(e) => setRejectionComment(e.target.value)}
          placeholder="Enter reason for requesting payment action..."
        />
      </div>
            
              <div className="flex justify-end gap-2 mt-6">
        <Button 
          variant="text" 
          size='sm'
          onClick={() =>{setSelectedApp(null); setActiveModal(null);}} 
          disabled={isApprovingPayment || isRejectingPayment}
        >
          Cancel
        </Button>
        <Button 
          variant="danger" 
          size='sm'
          onClick={() => handleVerifyPayment('reject')}
          disabled={!rejectionComment || isRejectingPayment || isApprovingPayment}
        >
          {isRejectingPayment ? 'Processing...' : 'Request Payment Action'}
        </Button>
        <Button 
          size='sm'
          onClick={() => handleVerifyPayment('approve')}
          disabled={rejectionComment.length > 0 || isApprovingPayment || isRejectingPayment}
        >
          {isApprovingPayment ? 'Processing...' : 'Approve Payment'}
        </Button>
      </div>
          </div>
        </div>
      )}

      {/* Modal for issuing insurance */}
      {selectedApp && activeModal === 'issue' && selectedApp.status && selectedApp.status.toLowerCase() === ApplicationStatus.PAYMENT_VERIFIED && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 fade-in">
            <h3 className="text-lg font-semibold mb-4">Issue Insurance</h3>
            <p className="text-gray-600 mb-4">Issue insurance certificate for {selectedApp.client?.fullName || selectedApp.fullName}&apos;s {selectedApp.insuranceCategory} insurance:</p>
            
            <div className="border rounded-lg p-4 mb-4 bg-blue-50">
              <p className="font-medium text-[var(--main-blue)]">Application Approved & Payment Verified</p>
              <p className="mt-2 text-sm text-gray-600">The application has been reviewed and the payment has been verified. You can now issue the insurance certificate.</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                 {selectedApp.proofOfPayment && (
                  <><span className="text-gray-600">Payment Proof:</span> 
                    <button 
                      className="text-[var(--main-blue)] hover:underline ml-1"
                      onClick={() => setViewingDocument({
                        name: 'Payment Proof',
                        path: selectedApp.proofOfPayment || '/File_not_found.jpg'
                      })}
                    >
                      View Document
                    </button>
                  </>
                )}
                {selectedApp.amount && (
                  <div>
                    <p className="text-gray-600">Invoice Amount:</p>
                    <p className="font-medium">{selectedApp.amount} RWF</p>
                  </div>
                )}
                {selectedApp.transactionId && (
                  <div>
                    <p className="text-gray-600">Transaction ID:</p>
                    <p className="font-medium">{selectedApp.transactionId}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-600">Police number:</p>
                  <p className="font-medium">{formatPoliceNumberDisplay(selectedApp)}</p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Input
                label="Police number"
                name="issuePoliceNumber"
                value={issuePoliceNumber}
                onChange={(e) => setIssuePoliceNumber(e.target.value)}
                placeholder="Enter police / policy reference number"
              />
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Certificate *</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (validateUpload(file, 'insuranceCertificate')) {
                    setInsuranceFile(file);
                  } else {
                    setInsuranceFile(null);
                    e.target.value = '';
                  }
                }}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[var(--main-blue)] file:text-white
                  hover:file:bg-[var(--secondary-blue)]
                "
                required
              />
              {fileErrors.insuranceCertificate && (
                <p className="mt-1 text-sm text-[var(--error-red)]">{fileErrors.insuranceCertificate}</p>
              )}
              {insuranceFile && (
                <button 
                  className="mt-2 text-sm text-[var(--main-blue)] hover:underline"
                  onClick={() => setViewingDocument({
                    name: insuranceFile.name,
                    path: URL.createObjectURL(insuranceFile)
                  })}
                >
                  View: {insuranceFile.name}
                </button>
              )}
            </div>
            {/* Contract file (optional) */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract (Optional)</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (validateUpload(file, 'contract')) {
                    setContractFile(file);
                  } else {
                    setContractFile(null);
                    e.target.value = '';
                  }
                }}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[var(--main-blue)] file:text-white
                  hover:file:bg-[var(--secondary-blue)]
                "
              />
              {fileErrors.contract && (
                <p className="mt-1 text-sm text-[var(--error-red)]">{fileErrors.contract}</p>
              )}
              {contractFile && (
                <button 
                  className="mt-2 text-sm text-[var(--main-blue)] hover:underline"
                  onClick={() => setViewingDocument({
                    name: contractFile.name,
                    path: URL.createObjectURL(contractFile)
                  })}
                >
                  View: {contractFile.name}
                </button>
              )}
            </div>
            {/* Receipt file (optional) */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt (Optional)</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (validateUpload(file, 'receipt')) {
                    setReceiptFile(file);
                  } else {
                    setReceiptFile(null);
                    e.target.value = '';
                  }
                }}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[var(--main-blue)] file:text-white
                  hover:file:bg-[var(--secondary-blue)]
                "
              />
              {fileErrors.receipt && (
                <p className="mt-1 text-sm text-[var(--error-red)]">{fileErrors.receipt}</p>
              )}
              {receiptFile && (
                <button 
                  className="mt-2 text-sm text-[var(--main-blue)] hover:underline"
                  onClick={() => setViewingDocument({
                    name: receiptFile.name,
                    path: URL.createObjectURL(receiptFile)
                  })}
                >
                  View: {receiptFile.name}
                </button>
              )}
            </div>
            {/* EBM file (optional) */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">EBM (Optional)</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (validateUpload(file, 'ebm')) {
                    setEbmFile(file);
                  } else {
                    setEbmFile(null);
                    e.target.value = '';
                  }
                }}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[var(--main-blue)] file:text-white
                  hover:file:bg-[var(--secondary-blue)]
                "
              />
              {fileErrors.ebm && (
                <p className="mt-1 text-sm text-[var(--error-red)]">{fileErrors.ebm}</p>
              )}
              {ebmFile && (
                <button 
                  className="mt-2 text-sm text-[var(--main-blue)] hover:underline"
                  onClick={() => setViewingDocument({
                    name: ebmFile.name,
                    path: URL.createObjectURL(ebmFile)
                  })}
                >
                  View: {ebmFile.name}
                </button>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="text" onClick={() => {setSelectedApp(null); setActiveModal(null); setInsuranceFile(null); setContractFile(null); setReceiptFile(null); setEbmFile(null);}} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleIssueInsurance} disabled={!insuranceFile || isProcessing}>
                {isProcessing ? 'Issuing...' : 'Issue Insurance Certificate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for viewing details */}
    {selectedApp && activeModal === 'details' && (
  <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
    <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4 fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Application Details</h3>
        <button onClick={() =>{setSelectedApp(null); setActiveModal(null);}} className="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="bg-[var(--light-gray)] p-4 rounded-lg mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Application ID</p>
            <p className="font-semibold">#{selectedApp.applicationNumber}</p>
          </div>
          <div>
            {getStatusBadge(selectedApp.status)}
          </div>
        </div>
      </div>
      
      {/* Enhanced Application Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Personal Information */}
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-500">Full Name</p>
            <p className="font-semibold">{selectedApp.client?.fullName || selectedApp.fullName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-semibold">{selectedApp.client?.email || selectedApp.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-semibold">{selectedApp.client?.phoneNumber || selectedApp.phoneNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date of Birth</p>
            <p className="font-semibold">{(selectedApp.client?.dateOfBirth || selectedApp.dateOfBirth) ? new Date(selectedApp.client?.dateOfBirth || selectedApp.dateOfBirth!).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>
        
        {/* Address Information */}
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-semibold">{selectedApp.client?.address || selectedApp.address || 'N/A'}</p>
          </div>
        </div>
        
        {/* Insurance Information */}
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-500">Insurance Category</p>
            <p className="font-semibold">{selectedApp.insuranceCategory || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Insurance Type</p>
            <p className="font-semibold">{selectedApp.insuranceType || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Duration</p>
            <p className="font-semibold">{selectedApp.insuranceDuration || 'N/A'}</p>
          </div>
          {selectedApp.insuranceEndAt && (
            <div>
              <p className="text-sm text-gray-500">Insurance End Date</p>
              <p className="font-semibold">{formatDateUTC(selectedApp.insuranceEndAt)}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Created By</p>
            <p className="font-semibold">
              {selectedApp.admin ? `Admin: ${selectedApp.admin.fullName}` : 
               selectedApp.agent ? `Agent: ${selectedApp.agent.fullName}` : 'Client'}
            </p>
          </div>
          {selectedApp.amount && (
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-semibold">{selectedApp.amount.toLocaleString()} RWF</p>
            </div>
          )}
          {selectedApp.netPremium !== undefined && selectedApp.netPremium !== null && (
            <div>
              <p className="text-sm text-gray-500">Net Premium</p>
              <p className="font-semibold">{selectedApp.netPremium.toLocaleString()} RWF</p>
            </div>
          )}
          {selectedApp.insuranceProvider && (
            <div>
              <p className="text-sm text-gray-500">Insurance Provider</p>
              <p className="font-semibold">{selectedApp.insuranceProvider}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Police number</p>
            <p className="font-semibold">{formatPoliceNumberDisplay(selectedApp)}</p>
          </div>
          {selectedApp.isCOMESA !== undefined && (
            <div>
              <p className="text-sm text-gray-500">COMESA Coverage</p>
              <p className="font-semibold">{selectedApp.isCOMESA ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
        
        {/* Vehicle Information (if applicable) */}
        {(selectedApp.insuranceCategory === 'Car Insurance' || selectedApp.insuranceCategory === 'MotorBike Insurance') && (
          <div className="space-y-2">
            {(selectedApp.vehicle?.vehicleType || selectedApp.vehicleType) && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Type</p>
                <p className="font-semibold">{selectedApp.vehicle?.vehicleType || selectedApp.vehicleType}</p>
              </div>
            )}
            {(selectedApp.vehicle?.vehicleAge || selectedApp.vehicleAge) && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Year</p>
                <p className="font-semibold">{selectedApp.vehicle?.vehicleAge || selectedApp.vehicleAge}</p>
              </div>
            )}
            {(selectedApp.vehicle?.vehicleUse || selectedApp.vehicleUse) && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Use</p>
                <p className="font-semibold">
                  {(selectedApp.vehicle?.vehicleUse || selectedApp.vehicleUse) === 'Other' 
                    ? (selectedApp.vehicle?.otherVehicleUse || selectedApp.otherVehicleUse)
                    : (selectedApp.vehicle?.vehicleUse || selectedApp.vehicleUse)}
                </p>
              </div>
            )}
            {selectedApp.vehicle?.plateNumber && (
              <div>
                <p className="text-sm text-gray-500">Plate Number</p>
                <p className="font-semibold">{selectedApp.vehicle.plateNumber}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Commission Information (if available) */}
        {(selectedApp.companyCommission || selectedApp.agentCommission) && (
          <div className="space-y-2">
            {selectedApp.companyCommission && (
              <div>
                <p className="text-sm text-gray-500">Company Commission</p>
                <p className="font-semibold">{selectedApp.companyCommission.toLocaleString()} RWF</p>
              </div>
            )}
            {selectedApp.agent && selectedApp.agentCommission && (
              <div>
                <p className="text-sm text-gray-500">Agent Commission</p>
                <p className="font-semibold">{selectedApp.agentCommission.toLocaleString()} RWF</p>
              </div>
            )}
            {selectedApp.agent && selectedApp.deductAgentAssignmentCommission !== undefined && (
              <div>
                <p className="text-sm text-gray-500">Admin-assignment charge</p>
                <p className="font-semibold">
                  {selectedApp.deductAgentAssignmentCommission
                    ? 'Applied (deduction from commission)'
                    : 'Not applied (full commission)'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Action Required Reason (if exists) */}
      {(selectedApp.rejectionReason) && (
        <div className="mt-4 bg-orange-50 p-4 rounded-lg">
          <h4 className="font-medium text-orange-700 mb-2">Action Required Reason</h4>
          <p className="text-orange-600">{selectedApp.rejectionReason}</p>
        </div>
      )}
      {/* Reason For Payment Action Required (if exists) */}
      {(selectedApp.reasonForPaymentRejection) && (
        <div className="mt-4 bg-orange-50 p-4 rounded-lg">
          <h4 className="font-medium text-orange-700 mb-2">Reason For Payment Further Action</h4>
          <p className="text-orange-600">{selectedApp.reasonForPaymentRejection}</p>
        </div>
      )}
      
      {/* Documents Section */}
      <div className="bg-[var(--light-gray)] p-4 rounded-lg mb-4 mt-6">
        <h4 className="font-medium mb-2">Documents</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            className="bg-white p-3 rounded border text-left hover:bg-gray-50"
            onClick={() => setViewingDocument({
              name: 'National ID / Passport',
              path: selectedApp.client?.nationalID || selectedApp.nationalID || ''
            })}
          >
            <p className="text-sm font-medium">National ID / Passport</p>
            <p className="text-xs text-gray-500">View Document</p>
          </button>
          
          <button 
            className="bg-white p-3 rounded border text-left hover:bg-gray-50"
            onClick={() => setViewingDocument({
              name: 'Yellow Card',
              path: selectedApp.yellowCard || ''
            })}
          >
            <p className="text-sm font-medium">Yellow Card</p>
            <p className="text-xs text-gray-500">View Document</p>
          </button>
          
          {selectedApp.pastInsuranceCertificate && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'Past Insurance Certificate',
                path: selectedApp.pastInsuranceCertificate || ''
              })}
            >
              <p className="text-sm font-medium">Past Insurance</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
          
          {selectedApp.proofOfPayment && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'Proof of Payment',
                path: selectedApp.proofOfPayment || ''
              })}
            >
              <p className="text-sm font-medium">Proof of Payment</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
          
          {selectedApp.invoice && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'Quotation / Invoice',
                path: selectedApp.invoice || ''
              })}
            >
              <p className="text-sm font-medium">Quotation / Invoice</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
          {selectedApp.insuranceCertificate && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'Insurance Certificate',
                path: selectedApp.insuranceCertificate || ''
              })}
            >
              <p className="text-sm font-medium">Insurance Certificate</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
          {selectedApp.contract && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'Contract',
                path: selectedApp.contract || ''
              })}
            >
              <p className="text-sm font-medium">Contract</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
          {selectedApp.receipt && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'Receipt',
                path: selectedApp.receipt || ''
              })}
            >
              <p className="text-sm font-medium">Receipt</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
          {selectedApp.ebm && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'EBM',
                path: selectedApp.ebm || ''
              })}
            >
              <p className="text-sm font-medium">EBM</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
        </div>
      </div>
      
      {/* Invoice & Payment Information (if available) */}
      {selectedApp.invoice && (
        <div className="bg-[var(--light-gray)] p-4 rounded-lg mb-4">
          <h4 className="font-medium mb-2">Invoice & Payment</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
            {selectedApp.amount && (
              <div className="bg-white p-3 rounded border">
                <p className="text-sm font-medium">Amount</p>
                <p className="text-xs text-gray-500">{selectedApp.amount} RWF</p>
              </div>
            )}
            {selectedApp.paymentInstructions && (
              <div className="bg-white p-3 rounded border">
                <p className="text-sm font-medium">Payment Instructions</p>
                <p className="text-xs text-gray-500">{selectedApp.paymentInstructions}</p>
              </div>
            )}
            {selectedApp.transactionId && (
              <div className="bg-white p-3 rounded border">
                <p className="text-sm font-medium">Transaction ID</p>
                <p className="text-xs text-gray-500">{selectedApp.transactionId}</p>
              </div>
            )}
            <div className="bg-white p-3 rounded border">
              <p className="text-sm font-medium">Police number</p>
              <p className="text-xs text-gray-500">{formatPoliceNumberDisplay(selectedApp)}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-end">
        <Button variant="text" onClick={() =>{setSelectedApp(null); setActiveModal(null);}}>Close</Button>
      </div>
    </div>
  </div>
)}

      {/* Edit Application Modal */}
      {editingApp && editFormData && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="sticky top-0 bg-white border-b p-3 flex justify-between items-center z-10">
              <h2 className="text-base font-semibold">Edit Application</h2>
              <button
                onClick={() => {
                  setEditingApp(null);
                  setEditFormData(null);
                  setOriginalEditFormData(null);
                  setVisibleEditFields({});
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4">
              {showClientInfoSection && (
                <fieldset className="mb-4 border-2 border-gray-300 rounded-lg p-3 bg-gray-50">
                  <legend className="text-xs font-semibold text-gray-600 px-2 bg-white border border-gray-300 rounded-md">
                    Client Information (Read Only)
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {showClientFullName && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Full Name</label>
                        <input
                          type="text"
                          value={clientFullNameValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showClientEmail && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Email</label>
                        <input
                          type="email"
                          value={clientEmailValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showClientPhone && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={clientPhoneValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showClientDob && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Date of Birth</label>
                        <input
                          type="text"
                          value={clientDobValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showClientAddress && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Address</label>
                        <input
                          type="text"
                          value={clientAddressValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showClientProvince && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Province</label>
                        <input
                          type="text"
                          value={clientProvinceValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showClientDistrict && (
                      <div>
                        <label className="block text-xs font-medium mb-1">District</label>
                        <input
                          type="text"
                          value={clientDistrictValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showClientSector && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Sector</label>
                        <input
                          type="text"
                          value={clientSectorValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showClientIdentification && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Identification Number</label>
                        <input
                          type="text"
                          value={clientIdentificationValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                  </div>
                </fieldset>
              )}

              {showInsuranceDetailsSection && (
                <fieldset className="mb-4 border-2 border-gray-300 rounded-lg p-3 bg-gray-50">
                  <legend className="text-xs font-semibold text-gray-600 px-2 bg-white border border-gray-300 rounded-md">
                    Insurance Details (Read Only)
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {showInsuranceCategory && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Insurance Category</label>
                        <input
                          type="text"
                          value={insuranceCategoryValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showPlateNumber && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Plate Number</label>
                        <input
                          type="text"
                          value={plateNumberValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showVehicleType && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Vehicle Type</label>
                        <input
                          type="text"
                          value={vehicleTypeValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showVehicleAge && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Vehicle Age (Year)</label>
                        <input
                          type="text"
                          value={vehicleAgeValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showVehicleUse && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Vehicle Use</label>
                        <input
                          type="text"
                          value={vehicleUseValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showOtherVehicleUse && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Specify Vehicle Use</label>
                        <input
                          type="text"
                          value={otherVehicleUseValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showComesaField && (
                      <div className="md:col-span-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked
                            disabled
                            className="rounded h-3 border-gray-300 bg-gray-100"
                          />
                          <span className="text-xs font-medium text-gray-600">Ext. Territorial (COMESA)</span>
                        </label>
                      </div>
                    )}
                    {showInsuranceProvider && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Insurance Provider</label>
                        <input
                          type="text"
                          value={insuranceProviderValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showInsuranceType && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Insurance Type</label>
                        <input
                          type="text"
                          value={insuranceTypeValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                    {showInsuranceDuration && (
                      <div className="md:col-span-2">
                        <InsuranceDurationField
                          id="edit-insuranceDuration"
                          topLabel="Insurance duration"
                          value={insuranceDurationValue}
                          size="compact"
                          onChange={(next) => {
                            setEditFormData((prev) => {
                              if (!prev) return prev;
                              return { ...prev, insuranceDuration: next };
                            });
                          }}
                          required
                        />
                      </div>
                    )}
                  </div>
                </fieldset>
              )}

              {/* Agent Assignment Section */}
              {showAssignToAgentField && (
                <fieldset className="mb-4 border-2 border-[var(--main-blue)] rounded-lg p-3 bg-gray-50">
                  <legend className="text-xs font-semibold text-[var(--main-blue)] px-2 bg-white border border-[var(--main-blue)] rounded-md">
                    Agent Assignment
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Radio button question */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-2">
                        Do you want to assign this application to an agent?
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAssignAgent"
                            value="yes"
                            checked={Boolean(wantsToAssignAgentValue === 'yes' || (!wantsToAssignAgentValue && assignToAgentValue))}
                            onChange={(e) => {
                              setEditFormData((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  wantsToAssignAgent: e.target.value,
                                  assignToAgent: e.target.value === 'no' ? '' : prev.assignToAgent || '',
                                  deductAgentAssignmentCommission:
                                    e.target.value === 'no'
                                      ? 'yes'
                                      : prev.deductAgentAssignmentCommission || 'yes',
                                };
                              });
                            }}
                            className="w-3.5 h-3.5 text-[var(--main-blue)] focus:ring-[var(--main-blue)]"
                          />
                          <span className="text-xs text-gray-700">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAssignAgent"
                            value="no"
                            checked={Boolean(wantsToAssignAgentValue === 'no' || (!wantsToAssignAgentValue && !assignToAgentValue))}
                            onChange={(e) => {
                              setEditFormData((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  wantsToAssignAgent: e.target.value,
                                  assignToAgent: '',
                                  deductAgentAssignmentCommission: 'yes',
                                };
                              });
                            }}
                            className="w-3.5 h-3.5 text-[var(--main-blue)] focus:ring-[var(--main-blue)]"
                          />
                          <span className="text-xs text-gray-700">No</span>
                        </label>
                      </div>
                    </div>

                    {/* Agent selection - only show when Yes is selected */}
                    {(wantsToAssignAgentValue === 'yes' || (!wantsToAssignAgentValue && assignToAgentValue)) && (
                      <>
                        <div className="md:col-span-2">
                          <SearchableSelect
                            label="Assign to Agent"
                            name="assignToAgent"
                            placeholder="Type agent email to search..."
                            value={assignToAgentValue || null}
                            onChange={(value) => {
                              setEditFormData((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  assignToAgent: value || '',
                                  wantsToAssignAgent: value ? 'yes' : prev.wantsToAssignAgent,
                                };
                              });
                            }}
                            fetchOptions={fetchAgentsEmails}
                            getDisplayValue={(option) => option.email as string}
                            getSearchValue={(option) => option.email as string}
                            required={true}
                            className="w-full"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-800 mb-1.5">
                            Apply admin-assignment charge to this agent?
                          </label>
                          <p className="text-[11px] text-gray-500 mb-2">
                            For admin-assigned applications: charge the usual assignment deduction from commission, or pay
                            full commission.
                          </p>
                          <div className="flex flex-col gap-2">
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="deductAgentAssignmentCommission"
                                value="yes"
                                checked={deductAgentAssignmentCommissionValue === 'yes'}
                                onChange={() =>
                                  setEditFormData((prev) =>
                                    prev ? { ...prev, deductAgentAssignmentCommission: 'yes' } : prev,
                                  )
                                }
                                className="w-3.5 h-3.5 mt-0.5 text-[var(--main-blue)] focus:ring-[var(--main-blue)]"
                              />
                              <span className="text-xs text-gray-700">
                                <span className="font-medium">Yes</span> — apply charge (deduct from commission)
                              </span>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="deductAgentAssignmentCommission"
                                value="no"
                                checked={deductAgentAssignmentCommissionValue === 'no'}
                                onChange={() =>
                                  setEditFormData((prev) =>
                                    prev ? { ...prev, deductAgentAssignmentCommission: 'no' } : prev,
                                  )
                                }
                                className="w-3.5 h-3.5 mt-0.5 text-[var(--main-blue)] focus:ring-[var(--main-blue)]"
                              />
                              <span className="text-xs text-gray-700">
                                <span className="font-medium">No</span> — full commission
                              </span>
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </fieldset>
              )}

              {showPaymentSection && (
                <fieldset className="mb-4 border-2 border-[var(--main-blue)] rounded-lg p-3 bg-gray-50">
                  <legend className="text-xs font-semibold text-[var(--main-blue)] px-2 bg-white border border-[var(--main-blue)] rounded-md">
                    Payment & Commission Information
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {showAmountField && (
                      <NumericInputField
                        label="Amount (RWF)"
                        name="amount"
                        size="compact"
                        accent="adminEdit"
                        className="mb-0"
                        labelClassName="!font-medium !text-gray-700"
                        value={amountValue}
                        onChange={(v) =>
                          setEditFormData((prev) => (prev ? { ...prev, amount: v } : prev))
                        }
                        min={0}
                        maxDigits={12}
                      />
                    )}
                    {showNetPremiumField && (
                      <NumericInputField
                        label="Net Premium (RWF)"
                        name="netPremium"
                        size="compact"
                        accent="adminEdit"
                        className="mb-0"
                        labelClassName="!font-medium !text-gray-700"
                        value={netPremiumValue}
                        onChange={(v) =>
                          setEditFormData((prev) => (prev ? { ...prev, netPremium: v } : prev))
                        }
                        min={0}
                        maxDigits={12}
                      />
                    )}
                    {showAgentCommissionField && (
                      <NumericInputField
                        label="Agent Commission (RWF)"
                        name="agentCommission"
                        size="compact"
                        accent="adminEdit"
                        className="mb-0"
                        labelClassName="!font-medium !text-gray-700"
                        value={agentCommissionValue}
                        onChange={(v) =>
                          setEditFormData((prev) => (prev ? { ...prev, agentCommission: v } : prev))
                        }
                        min={0}
                        maxDigits={12}
                      />
                    )}
                    {showCompanyCommissionField && (
                      <NumericInputField
                        label="Company Commission (RWF)"
                        name="companyCommission"
                        size="compact"
                        accent="adminEdit"
                        className="mb-0"
                        labelClassName="!font-medium !text-gray-700"
                        value={companyCommissionValue}
                        onChange={(v) =>
                          setEditFormData((prev) => (prev ? { ...prev, companyCommission: v } : prev))
                        }
                        min={0}
                        maxDigits={12}
                      />
                    )}
                    {showAdministrationFeesField && (
                      <NumericInputField
                        label="Administration Fees (RWF)"
                        name="administrationFees"
                        size="compact"
                        accent="adminEdit"
                        className="mb-0"
                        labelClassName="!font-medium !text-gray-700"
                        value={administrationFeesValue}
                        onChange={(v) =>
                          setEditFormData((prev) => (prev ? { ...prev, administrationFees: v } : prev))
                        }
                        min={0}
                        maxDigits={12}
                      />
                    )}
                    {showTransactionIdField && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Transaction ID</label>
                        <input
                          type="text"
                          name="transactionId"
                          value={transactionIdValue}
                          onChange={handleEditInputChange}
                          className="w-full py-1.5 px-2 text-xs rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                        />
                      </div>
                    )}
                    {showPoliceNumberField && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Police number</label>
                        <input
                          type="text"
                          name="policeNumber"
                          value={policeNumberValue}
                          onChange={handleEditInputChange}
                          className="w-full py-1.5 px-2 text-xs rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                        />
                      </div>
                    )}
                    {showPaymentInstructionsField && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium mb-1">Payment Instructions</label>
                        <textarea
                          name="paymentInstructions"
                          value={paymentInstructionsValue}
                          onChange={handleEditInputChange}
                          rows={3}
                          className="w-full py-1.5 px-2 text-xs rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                        />
                      </div>
                    )}
                  </div>
                </fieldset>
              )}

              {showStatusSection && (
                <fieldset className="mb-4 border-2 border-[var(--main-blue)] rounded-lg p-3 bg-gray-50">
                  <legend className="text-xs font-semibold text-[var(--main-blue)] px-2 bg-white border border-[var(--main-blue)] rounded-md">
                    Status & Dates
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {showStatusField && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Status</label>
                        <select
                          name="status"
                          value={statusValue}
                          onChange={handleEditInputChange}
                          className="w-full py-1.5 px-2 text-xs rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="APPLICATION_APPROVED">Application Approved</option>
                          <option value="WAITING_FOR_USER_ACTION">Waiting for User Action</option>
                          <option value="INVOICE_SENT">Invoice Sent</option>
                          <option value="REVIEW_PAYMENT">Review Payment</option>
                          <option value="PAYMENT_VERIFIED">Payment Verified</option>
                          <option value="INSURANCE_ISSUED">Insurance Issued</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    )}
                    {showSubmittedAtField && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Submitted At</label>
                        <input
                          type="date"
                          name="submittedAt"
                          value={submittedAtValue}
                          onChange={handleEditInputChange}
                          className="w-full py-1.5 px-2 text-xs rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                        />
                      </div>
                    )}
                    {showInsuranceEndDateField && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Insurance End Date</label>
                        <input
                          type="date"
                          name="insuranceEndAt"
                          value={insuranceEndDateValue}
                          onChange={handleEditInputChange}
                          className="w-full py-1.5 px-2 text-xs rounded-lg focus:outline-none border border-gray-300 focus:border-[var(--main-blue)]"
                        />
                      </div>
                    )}
                  </div>
                </fieldset>
              )}

              {showInsuranceDocumentsSection && (
                <fieldset className="mb-4 border-2 border-[var(--main-blue)] rounded-lg p-3 bg-gray-50">
                  <legend className="text-xs font-semibold text-[var(--main-blue)] px-2 bg-white border border-[var(--main-blue)] rounded-md">
                    Insurance Documents
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {showInvoiceUpload && (
                      <FileInput
                        label="Invoice File"
                        name="invoice"
                        onChange={handleEditFileChange('invoice')}
                        accept="image/*,.pdf"
                      />
                    )}
                    {showInsuranceCertificateUpload && (
                      <FileInput
                        label="Insurance Certificate"
                        name="insuranceCertificate"
                        onChange={handleEditFileChange('insuranceCertificate')}
                        accept="image/*,.pdf"
                      />
                    )}
                    {showContractUpload && (
                      <FileInput
                        label="Contract"
                        name="contract"
                        onChange={handleEditFileChange('contract')}
                        accept="image/*,.pdf"
                      />
                    )}
                    {showReceiptUpload && (
                      <FileInput
                        label="Receipt"
                        name="receipt"
                        onChange={handleEditFileChange('receipt')}
                        accept="image/*,.pdf"
                      />
                    )}
                    {showEbmUpload && (
                      <FileInput
                        label="EBM"
                        name="ebm"
                        onChange={handleEditFileChange('ebm')}
                        accept="image/*,.pdf"
                      />
                    )}
                  </div>
                </fieldset>
              )}

              {showAgentInfoSection && (
                <fieldset className="mb-4 border-2 border-gray-300 rounded-lg p-3 bg-gray-50">
                  <legend className="text-xs font-semibold text-gray-600 px-2 bg-white border border-gray-300 rounded-md">
                    Agent/Client Added Information (Read Only)
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {showProofOfPaymentInfo && (
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs font-medium">Proof of Payment</p>
                        <p className="text-[10px] text-gray-500">Document uploaded by agent/client</p>
                      </div>
                    )}
                    {showTransactionIdInfo && (
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs font-medium">Transaction ID</p>
                        <p className="text-[10px] text-gray-500">{editingApp.transactionId}</p>
                      </div>
                    )}
                    {showYellowCardInfo && (
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs font-medium">Yellow Card</p>
                        <p className="text-[10px] text-gray-500">Document uploaded by agent/client</p>
                      </div>
                    )}
                    {showPastInsuranceCertificateInfo && (
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs font-medium">Past Insurance Certificate</p>
                        <p className="text-[10px] text-gray-500">Document uploaded by agent/client</p>
                      </div>
                    )}
                  </div>
                </fieldset>
              )}

              <div className="flex justify-end space-x-3 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingApp(null);
                    setEditFormData(null);
                    setOriginalEditFormData(null);
                    setVisibleEditFields({});
                  }}
                  disabled={isSubmittingEdit}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingEdit}>
                  {isSubmittingEdit ? 'Updating...' : 'Update Application'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document viewer modal */}
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