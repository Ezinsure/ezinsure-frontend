'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileInput } from '@/components/ui/file-input';
import { useToast } from '@/components/ui/toast';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { useAuth } from '@/context/AuthContext';
import { useApiClient } from '@/utils/apiClient';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { validateInsuranceDuration, normalizeInsuranceDurationPayload } from '@/utils/insurance-duration';
import { InsuranceDurationField } from '@/components/ui/insurance-duration-field';
import { NumericInputField } from '@/components/ui/numeric-input-field';
import {
  isMotorVehicleInsuranceCategory,
} from '@/utils/administration-fees';
import { getVehicleManufactureYearValidationError } from '@/utils/vehicle-year';
import { formatDateUTC } from '@/utils/date-formatter';
import { formatPoliceNumberDisplay } from '@/utils/police-number';

interface Application {
  _id: string;
  applicationNumber: string;
  insuranceCategory: string;
  insuranceType: string;
  insuranceDuration: string;
  status: string;
  invoice?: string;
  insuranceCertificate?: string;
  proofOfPayment?: string;
  paymentInstructions?: string;
  transactionId?: string;
  policeNumber?: string;
  amount?: number;
  netPremium?: number;
  companyCommission?: number;
  agentCommission?: number;
  agentCommissionPaymentStatus?: 'PENDING' | 'PENDING_ADMIN_REVIEW' | 'READY_TO_BE_PAID' | 'PAID' | 'ON_HOLD';
  administrationFees?: string;
  insuranceProvider?: string;
  ebm?: string;
  contract?: string;
  receipt?: string;
  yellowCard?: string;
  pastInsuranceCertificate?: string;
  submittedAt: string;
  insuranceEndAt?: string;
  agent?: {
    _id: string;
    fullName: string;
    email?: string;
    phoneNumber?: string;
  } | null;
  admin?: {
    _id: string;
    fullName: string;
  } | null;
  client: {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    address: string;
    nationalID: string;
    identificationDocumentType: string;
    identificationNumber: string;
    province: string;
    district: string;
    sector: string;
    createdAt: string;
  };
  vehicle?: {
    _id: string;
    clientId: string;
    vehicleType: string;
    vehicleAge: string;
    plateNumber?: string;
    vehicleUse: string;
    otherVehicleUse?: string;
    createdAt: string;
  };
  // Legacy / optional fields
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  clientId?: string;
  vehicleId?: string;
  agentId?: string;
}

type CommissionReviewTab = 'pending_review' | 'ready_to_be_paid';

/** Normalise API rows that may omit populated `client` / `agent` / `vehicle` */
function normalizeCommissionRow(raw: unknown): Application {
  const r = raw as Record<string, unknown>;
  if (!r || typeof r !== 'object') {
    return raw as Application;
  }

  let client = r.client as Application['client'] | undefined;
  if (!client && r.clientId) {
    client = {
      _id: String(r.clientId),
      fullName: (r.clientName as string) || (r.fullName as string) || '—',
      email: (r.clientEmail as string) || (r.email as string) || '',
      phoneNumber: (r.clientPhone as string) || (r.phoneNumber as string) || '',
      dateOfBirth: (r.clientDateOfBirth as string) || '',
      address: (r.clientAddress as string) || (r.address as string) || '',
      nationalID: (r.clientNationalId as string) || '',
      identificationDocumentType: '',
      identificationNumber: '',
      province: (r.clientProvince as string) || '',
      district: (r.clientDistrict as string) || '',
      sector: (r.clientSector as string) || '',
      createdAt: '',
    };
  }
  if (!client) {
    client = {
      _id: '',
      fullName: '—',
      email: '',
      phoneNumber: '',
      dateOfBirth: '',
      address: '',
      nationalID: '',
      identificationDocumentType: '',
      identificationNumber: '',
      province: '',
      district: '',
      sector: '',
      createdAt: '',
    };
  }

  let agent = r.agent as Application['agent'] | null | undefined;
  if (!agent && r.agentId) {
    agent = {
      _id: String(r.agentId),
      fullName: (r.agentName as string) || '—',
      email: r.agentEmail as string | undefined,
      phoneNumber: r.agentPhone as string | undefined,
    };
  }

  let vehicle = r.vehicle as Application['vehicle'] | undefined;
  if (!vehicle && r.vehicleId) {
    vehicle = {
      _id: String(r.vehicleId),
      clientId: String(r.clientId || ''),
      vehicleType: (r.vehicleType as string) || '',
      vehicleAge: (r.vehicleAge as string) || '',
      plateNumber: r.plateNumber as string | undefined,
      vehicleUse: (r.vehicleUse as string) || '',
      otherVehicleUse: r.otherVehicleUse as string | undefined,
      createdAt: '',
    };
  }

  return { ...r, client, agent: agent ?? null, vehicle } as Application;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: number) => void;
}

const AdminCommissionReviewPage = () => {
  const { showToast, ToastContainer } = useToast();
  const { token } = useAuth();
  const { apiFetch } = useApiClient();
  const showToastRef = useRef(showToast);

  // Keep ref updated with latest showToast (without useEffect to avoid loops)
  showToastRef.current = showToast;

  const [activeTab, setActiveTab] = useState<CommissionReviewTab>('pending_review');

  const [reviewApplications, setReviewApplications] = useState<Application[]>([]);
  const [reviewTotalCommission, setReviewTotalCommission] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);

  const [readyApplications, setReadyApplications] = useState<Application[]>([]);
  const [readyTotalCommission, setReadyTotalCommission] = useState<number>(0);
  const [readyCount, setReadyCount] = useState<number>(0);

  const [isLoadingReview, setIsLoadingReview] = useState(true);
  const [isLoadingReady, setIsLoadingReady] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{
    name: string;
    path: string;
  } | null>(null);
  const [holdComment, setHoldComment] = useState('');
  const [isPuttingOnHold, setIsPuttingOnHold] = useState(false);
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, string | number | boolean | File | null> | null>(null);
  const [originalEditFormData, setOriginalEditFormData] = useState<Record<string, string | number | boolean | File | null> | null>(null);
  const [visibleEditFields, setVisibleEditFields] = useState<Record<string, boolean>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isBulkMarkingReady, setIsBulkMarkingReady] = useState(false);
  const [isRevertingToReview, setIsRevertingToReview] = useState(false);

  // Sort state
  const [sortField, setSortField] = useState<
    'applicationNumber' | 'clientName' | 'agentName' | 'insuranceCategory' | 'insuranceEndAt' | 'submittedAt' | 'agentCommission' | 'agentCommissionPaymentStatus'
  >('submittedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [itemsPerPage, setItemsPerPage] = useState(10);

  const applications =
    activeTab === 'pending_review' ? reviewApplications : readyApplications;
  const totalCommission =
    activeTab === 'pending_review' ? reviewTotalCommission : readyTotalCommission;
  const totalApplications =
    activeTab === 'pending_review' ? reviewCount : readyCount;
  const isLoading =
    activeTab === 'pending_review' ? isLoadingReview : isLoadingReady;

  const handleSort = (
    field: 'applicationNumber' | 'clientName' | 'agentName' | 'insuranceCategory' | 'insuranceEndAt' | 'submittedAt' | 'agentCommission' | 'agentCommissionPaymentStatus',
  ) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
      : <ArrowDown className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />;
  };

  // Stable fetchOptions for the agent SearchableSelect.
  // Depends on `applications` so the dropdown re-populates after data loads.
  const fetchAgentOptions = useCallback(async () => {
    try {
      const uniqueAgentsMap = new Map<
        string,
        { _id: string; fullName: string; email?: string; phoneNumber?: string }
      >();
      applications.forEach((app) => {
        if (app.agent?._id && app.agent.fullName) {
          uniqueAgentsMap.set(app.agent._id, {
            _id: app.agent._id,
            fullName: app.agent.fullName,
            email: app.agent.email,
            phoneNumber: app.agent.phoneNumber,
          });
        }
      });
      const data = Array.from(uniqueAgentsMap.values()).sort((a, b) =>
        a.fullName.localeCompare(b.fullName),
      );
      return { success: true, data };
    } catch (err) {
      console.error('Error building agent options:', err);
      return { success: false, data: [] };
    }
  }, [applications]);

  const loadCommissionQueues = useCallback(
    async (options?: { withSpinner?: boolean }) => {
      if (!token) return;
      const withSpinner = options?.withSpinner !== false;
      if (withSpinner) {
        setIsLoadingReview(true);
        setIsLoadingReady(true);
      }
      try {
        const [resReview, resReady] = await Promise.all([
          apiFetch('/getAllApplicationsPendingAdminReview', { method: 'GET' }),
          apiFetch('/getReadyToBePaidApplications', { method: 'GET' }),
        ]);

        const sortBySubmitted = (a: Application, b: Application) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();

        if (resReview.ok) {
          const dataReview = await resReview.json();
          const fetchedReview = (dataReview.data || []).map(normalizeCommissionRow);
          setReviewApplications(fetchedReview.slice().sort(sortBySubmitted));
          setReviewTotalCommission(Number(dataReview.totalAgentCommission) || 0);
          setReviewCount(dataReview.count ?? fetchedReview.length);
        } else {
          console.error('Pending review queue failed:', resReview.status);
          showToastRef.current('Could not load pending admin review queue.', 'error');
          setReviewApplications([]);
          setReviewTotalCommission(0);
          setReviewCount(0);
        }

        if (resReady.ok) {
          const dataReady = await resReady.json();
          const fetchedReady = (dataReady.data || []).map(normalizeCommissionRow);
          setReadyApplications(fetchedReady.slice().sort(sortBySubmitted));
          setReadyTotalCommission(Number(dataReady.totalAgentCommission) || 0);
          setReadyCount(dataReady.count ?? fetchedReady.length);
        } else {
          console.error('Ready to be paid queue failed:', resReady.status);
          showToastRef.current('Could not load ready-to-be-paid applications.', 'error');
          setReadyApplications([]);
          setReadyTotalCommission(0);
          setReadyCount(0);
        }
      } catch (error) {
        console.error('Error loading commission queues:', error);
        showToastRef.current(
          'Failed to load commission review data. Please refresh the page.',
          'error',
        );
      } finally {
        if (withSpinner) {
          setIsLoadingReview(false);
          setIsLoadingReady(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiFetch identity changes each render
    [token],
  );

  useEffect(() => {
    loadCommissionQueues({ withSpinner: true });
  }, [loadCommissionQueues]);

  // Scroll hint visibility
  useEffect(() => {
    if (!isLoading && applications.length > 0) {
      setShowScrollHint(true);
      const timer = setTimeout(() => setShowScrollHint(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowScrollHint(false);
    }
  }, [isLoading, applications.length]);

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    setShowLeftFade(scrollLeft > 0);
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // Filter + sort applications
  const filteredApplications = useMemo(() => {
    const filtered = applications.filter((app) => {
      const searchableFields: string[] = [];

      const clientName = app.client?.fullName || app.fullName;
      const clientEmail = app.client?.email || app.email;

      if (clientName && clientName.trim()) searchableFields.push(clientName.toLowerCase());
      if (clientEmail && clientEmail.trim()) searchableFields.push(clientEmail.toLowerCase());
      if (app.applicationNumber && app.applicationNumber.trim())
        searchableFields.push(app.applicationNumber.toLowerCase());

      const matchesSearch =
        searchQuery === '' ||
        searchableFields.some((field) => field.includes(searchQuery.toLowerCase()));

      const matchesStatus =
        selectedStatus === 'all' ||
        (app.status && app.status.toLowerCase() === selectedStatus);

      const matchesAgent =
        selectedAgentId === 'all' ||
        (app.agent && app.agent._id === selectedAgentId);

      const submittedAtDate = new Date(app.submittedAt);
      const matchesStartDate =
        !startDate || submittedAtDate >= new Date(startDate + 'T00:00:00');
      const matchesEndDate =
        !endDate || submittedAtDate <= new Date(endDate + 'T23:59:59');

      return matchesSearch && matchesStatus && matchesAgent && matchesStartDate && matchesEndDate;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'applicationNumber':
          aVal = a.applicationNumber?.toLowerCase() ?? '';
          bVal = b.applicationNumber?.toLowerCase() ?? '';
          break;
        case 'clientName':
          aVal = (a.client?.fullName || a.fullName || '').toLowerCase();
          bVal = (b.client?.fullName || b.fullName || '').toLowerCase();
          break;
        case 'agentName':
          aVal = (a.agent?.fullName || '').toLowerCase();
          bVal = (b.agent?.fullName || '').toLowerCase();
          break;
        case 'insuranceCategory':
          aVal = (a.insuranceCategory || '').toLowerCase();
          bVal = (b.insuranceCategory || '').toLowerCase();
          break;
        case 'insuranceEndAt':
          aVal = a.insuranceEndAt ? new Date(a.insuranceEndAt).getTime() : 0;
          bVal = b.insuranceEndAt ? new Date(b.insuranceEndAt).getTime() : 0;
          break;
        case 'submittedAt':
          aVal = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          bVal = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          break;
        case 'agentCommission':
          aVal = a.agentCommission ?? 0;
          bVal = b.agentCommission ?? 0;
          break;
        case 'agentCommissionPaymentStatus':
          aVal = (a.agentCommissionPaymentStatus || '').toLowerCase();
          bVal = (b.agentCommissionPaymentStatus || '').toLowerCase();
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [applications, searchQuery, selectedStatus, selectedAgentId, startDate, endDate, sortField, sortDirection]);

  // Pagination
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /** Rows included in PDF/Excel: current filters, or full active-tab list if filters exclude everything */
  const exportApplications =
    filteredApplications.length > 0 ? filteredApplications : applications;

  const getPaymentStatusBadge = (status?: string) => {
    if (!status) {
      return (
        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium flex items-center gap-1 w-fit">
          Unknown
        </span>
      );
    }

    switch (status.toUpperCase()) {
      case 'PAID':
        return (
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-medium flex items-center gap-1 w-fit">
            Paid
          </span>
        );
      case 'READY_TO_BE_PAID':
        return (
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium flex items-center gap-1 w-fit">
            Ready to be Paid
          </span>
        );
      case 'PENDING_ADMIN_REVIEW':
        return (
          <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-[10px] font-medium flex items-center gap-1 w-fit">
            Pending Admin Review
          </span>
        );
      case 'PAYMENT_INITIATED':
        return (
          <span className="px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-medium flex items-center gap-1 w-fit">
            Payment Initiated
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-medium flex items-center gap-1 w-fit">
            Pending
          </span>
        );
      case 'ON_HOLD':
        return (
          <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-medium flex items-center gap-1 w-fit">
            On Hold
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium flex items-center gap-1 w-fit">
            {status}
          </span>
        );
    }
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

const buildInitialVisibility = (app: Application, formData: Record<string, string | number | boolean | File | null>) => ({
  clientFullName: hasExistingValue(app.client?.fullName || app.fullName || ''),
  clientEmail: hasExistingValue(app.client?.email || app.email || ''),
  clientPhone: hasExistingValue(app.client?.phoneNumber || app.phoneNumber || ''),
  clientDob: hasExistingValue(app.client?.dateOfBirth || ''),
  clientAddress: hasExistingValue(app.client?.address || app.address || ''),
  clientProvince: hasExistingValue(app.client?.province || ''),
  clientDistrict: hasExistingValue(app.client?.district || ''),
  clientSector: hasExistingValue(app.client?.sector || ''),
  clientIdentification: hasExistingValue(app.client?.identificationNumber || app.client?.nationalID || ''),
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

const getActionButtons = (app: Application) => {
    return (
      <div className="flex space-x-2">
        <Button 
          size="xs" 
          variant="outline"
          onClick={() => {
            // Initialize edit form data from application
            const formData = {
              // Insurance Information (Readonly)
              insuranceCategory: app.insuranceCategory || '',
              insuranceType: app.insuranceType || '',
              insuranceDuration: app.insuranceDuration || '',
              insuranceProvider: app.insuranceProvider || '',
              // Vehicle Information (Readonly)
              plateNumber: app.vehicle?.plateNumber || '',
              vehicleType: app.vehicle?.vehicleType || '',
              vehicleAge: app.vehicle?.vehicleAge || '',
              vehicleUse: app.vehicle?.vehicleUse || '',
              otherVehicleUse: app.vehicle?.otherVehicleUse || '',
              isCOMESA: false, 
              // Payment Information (Editable)
              amount: app.amount?.toString() || '',
              netPremium: app.netPremium?.toString() || '',
              paymentInstructions: app.paymentInstructions || '',
              transactionId: app.transactionId || '',
              policeNumber: app.policeNumber || '',
              // Commission Information (Editable)
              companyCommission: app.companyCommission?.toString() || '',
              administrationFees: app.administrationFees || '',
              agentCommission: app.agentCommission?.toString() || '',
              // Status (Editable)
              status: app.status || '',
              insuranceEndAt: app.insuranceEndAt || '',
              // File fields (Editable)
              invoice: null as File | null,
              insuranceCertificate: null as File | null,
              contract: null as File | null,
              receipt: null as File | null,
              ebm: null as File | null,
            };
            setEditFormData(formData);
            setOriginalEditFormData(JSON.parse(JSON.stringify(formData))); // Deep copy
            setEditingApp(app);
            setVisibleEditFields(buildInitialVisibility(app, formData));
          }}
        >
          Edit
        </Button>
        <Button 
          size="xs"
          onClick={() => setSelectedApp(app)}
        >
          {activeTab === 'ready_to_be_paid' ? 'Details' : 'Review'}
        </Button>
      </div>
    );
  };

  // Handle putting application on hold
  const handlePutOnHold = async () => {
    if (!selectedApp || !holdComment.trim()) {
      showToast('Please provide a comment for putting this application on hold', 'error');
      return;
    }

    setIsPuttingOnHold(true);
    try {
      // Use URLSearchParams for application/x-www-form-urlencoded (as shown in Swagger)
      const formData = new URLSearchParams();
      formData.append('comment', holdComment.trim());

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/markAsBlockedAdmin/${selectedApp._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to put application on hold';
        try {
          // Clone response to read it without consuming the body
          const clonedResponse = response.clone();
          const errorData = await clonedResponse.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Error response data:', errorData);
        } catch {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            console.error('Error response text:', errorText);
            errorMessage = errorText || errorMessage;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      
      // Use the message from API response or fallback to default
      const successMessage = responseData.message || 'Application has been put on hold successfully';
      showToast(successMessage, 'success');
      setSelectedApp(null);
      setHoldComment('');
      // Refetch applications
      await loadCommissionQueues({ withSpinner: false });
    } catch (error) {
      console.error('Error putting application on hold:', error);
      showToast(error instanceof Error ? error.message : 'Failed to put application on hold', 'error');
    } finally {
      setIsPuttingOnHold(false);
    }
  };

  // Handle marking application as ready to be paid
  const handleMarkAsReady = async () => {
    if (!selectedApp) {
      return;
    }

    setIsMarkingReady(true);
    try {
      const response = await apiFetch(`/markAsReadyToBePaid/${selectedApp._id}`, {
        method: 'PUT',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark application as ready to be paid');
      }

      const responseData = await response.json();
      
      // Use the message from API response or fallback to default
      const successMessage = responseData.message || 'Application has been marked as ready to be paid successfully';
      showToast(successMessage, 'success');
      setSelectedApp(null);
      setHoldComment('');
      // Refetch applications
      await loadCommissionQueues({ withSpinner: false });
    } catch (error) {
      console.error('Error marking application as ready:', error);
      showToast(error instanceof Error ? error.message : 'Failed to mark application as ready', 'error');
    } finally {
      setIsMarkingReady(false);
    }
  };

  /** Move an application from READY_TO_BE_PAID back to pending admin review */
  const handleSetToPendingAdminReview = async () => {
    if (!selectedApp) return;
    setIsRevertingToReview(true);
    try {
      const response = await apiFetch(`/setToPendingAdminReview/${selectedApp._id}`, {
        method: 'PUT',
      });
      if (!response.ok) {
        let message = 'Failed to return application to pending review';
        try {
          const errBody = await response.json();
          message = errBody.message || message;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      const responseData = await response.json().catch(() => ({}));
      showToast(
        (responseData as { message?: string }).message ||
          'Application returned to pending admin review.',
        'success',
      );
      setSelectedApp(null);
      setHoldComment('');
      await loadCommissionQueues({ withSpinner: false });
    } catch (error) {
      console.error('Error reverting to pending review:', error);
      showToast(
        error instanceof Error ? error.message : 'Could not update application status.',
        'error',
      );
    } finally {
      setIsRevertingToReview(false);
    }
  };

  // Handle marking all currently filtered applications as ready to be paid
  const handleMarkAllVisibleAsReady = async () => {
    if (!token || filteredApplications.length === 0) {
      return;
    }

    setIsBulkMarkingReady(true);
    try {
      const idsToUpdate = filteredApplications.map((app) => app._id);

      const results = await Promise.allSettled(
        idsToUpdate.map((id) =>
          apiFetch(`/markAsReadyToBePaid/${id}`, {
            method: 'PUT',
          }),
        ),
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - successful;

      if (successful > 0) {
        showToastRef.current(
          `${successful} application${successful > 1 ? 's' : ''} marked as ready to be paid${
            failed > 0 ? `, ${failed} failed` : ''
          }.`,
          'success',
        );
      } else if (failed > 0) {
        showToastRef.current('Failed to mark applications as ready to be paid. Please try again.', 'error');
      }

      await loadCommissionQueues({ withSpinner: false });
    } catch (error) {
      console.error('Error bulk marking applications as ready:', error);
      showToastRef.current(
        error instanceof Error ? error.message : 'Failed to mark applications as ready to be paid.',
        'error',
      );
    } finally {
      setIsBulkMarkingReady(false);
    }
  };

  // Handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp || !editFormData || !originalEditFormData) return;

    // Find changed fields
    const changedFields: Record<string, string | number | boolean | File> = {};
    Object.keys(editFormData).forEach((key) => {
      const currentValue = editFormData[key];
      const originalValue = originalEditFormData[key];
      
      // Handle file fields - if a new file was selected, it's a change
      if (currentValue instanceof File) {
        changedFields[key] = currentValue;
      }
      // Compare other values (handle string/number conversions)
      else if (String(currentValue || '') !== String(originalValue || '')) {
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

    setIsSubmittingEdit(true);
    try {
      const formDataToSend = new FormData();
      
      // Add only changed fields
      Object.entries(changedFields).forEach(([key, value]) => {
        if (value instanceof File) {
          formDataToSend.append(key, value);
        } else if (value !== null && value !== undefined) {
          if (key === 'insuranceDuration') {
            formDataToSend.append(key, normalizeInsuranceDurationPayload(String(value)));
          } else {
            formDataToSend.append(key, value.toString());
          }
        }
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/editApplicationAdmin/${editingApp._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

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
      setVisibleEditFields({});
      setEditFormData(null);
      setOriginalEditFormData(null);
      // Refetch applications
      await loadCommissionQueues({ withSpinner: false });
    } catch (error) {
      console.error('Error updating application:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update application', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle edit form input changes
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setEditFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      } as Record<string, string | number | boolean | File | null>;
    });
  };

  // Handle file changes in edit form
  const handleEditFileChange = useCallback((field: string) => (file: File | null) => {
    setEditFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: file };
    });
  }, []);

  // Get status badge helper (same as in admin/applications)
  const getStatusBadge = (status: string) => {
    if (!status) {
      return (
        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium">
          Unknown
        </span>
      );
    }

    switch (status.toLowerCase()) {
      case 'pending':
        return (
          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium">
            Pending
          </span>
        );
      case 'application_approved':
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">
            Approved
          </span>
        );
      case 'waiting_for_user_action':
        return (
          <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-medium">
            Action Required
          </span>
        );
      case 'invoice_sent':
        return (
          <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-medium">
            Invoice Sent
          </span>
        );
      case 'review_payment':
        return (
          <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-[10px] font-medium">
            Payment Review
          </span>
        );
      case 'payment_verified':
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">
            Payment Verified
          </span>
        );
      case 'insurance_issued':
        return (
          <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-medium">
            Insurance Issued
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium">
            {status}
          </span>
        );
    }
  };

  const Pagination = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }: PaginationProps) => {
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 p-6 border-t border-gray-100">
        {/* Left: rows-per-page + summary */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs text-gray-500">Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {[5, 10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500">
            Showing{' '}
            <span className="font-medium text-gray-700">{totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span>
            {' '}–{' '}
            <span className="font-medium text-gray-700">{Math.min(currentPage * itemsPerPage, totalItems)}</span>
            {' '}of{' '}
            <span className="font-medium text-gray-700">{totalItems}</span> applications
          </p>
        </div>
        {/* Mobile prev/next */}
        <div className="flex sm:hidden justify-between w-full">
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Next</Button>
        </div>
        <div className="hidden sm:flex sm:items-center">
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
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
                  className={
                    currentPage === page
                      ? 'z-10 bg-[var(--main-blue)] border-[var(--main-blue)] text-white'
                      : ''
                  }
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
    );
  };

  // Visibility helpers for edit form sections
  const isPersistentlyVisible = (field: string) => visibleEditFields[field] ?? false;
  const clientFullNameValue = editingApp?.client?.fullName || editingApp?.fullName || '';
  const clientEmailValue = editingApp?.client?.email || editingApp?.email || '';
  const clientPhoneValue = editingApp?.client?.phoneNumber || editingApp?.phoneNumber || '';
  const clientDobValue = editingApp?.client?.dateOfBirth
    ? new Date(editingApp.client.dateOfBirth).toISOString().split('T')[0]
    : '';
  const clientAddressValue = editingApp?.client?.address || editingApp?.address || '';
  const clientProvinceValue = editingApp?.client?.province || '';
  const clientDistrictValue = editingApp?.client?.district || '';
  const clientSectorValue = editingApp?.client?.sector || '';
  const clientIdentificationValue =
    editingApp?.client?.identificationNumber || editingApp?.client?.nationalID || '';

  const showClientFullName = isPersistentlyVisible('clientFullName') || hasExistingValue(clientFullNameValue);
  const showClientEmail = isPersistentlyVisible('clientEmail') || hasExistingValue(clientEmailValue);
  const showClientPhone = isPersistentlyVisible('clientPhone') || hasExistingValue(clientPhoneValue);
  const showClientDob = isPersistentlyVisible('clientDob') || hasExistingValue(clientDobValue);
  const showClientAddress = isPersistentlyVisible('clientAddress') || hasExistingValue(clientAddressValue);
  const showClientProvince = isPersistentlyVisible('clientProvince') || hasExistingValue(clientProvinceValue);
  const showClientDistrict = isPersistentlyVisible('clientDistrict') || hasExistingValue(clientDistrictValue);
  const showClientSector = isPersistentlyVisible('clientSector') || hasExistingValue(clientSectorValue);
  const showClientIdentification = isPersistentlyVisible('clientIdentification') || hasExistingValue(clientIdentificationValue);

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

  const insuranceCategoryValue = editFormData ? getFormValue(editFormData.insuranceCategory) : '';
  const plateNumberValue = editFormData ? getFormValue(editFormData.plateNumber) : '';
  const vehicleTypeValue = editFormData ? getFormValue(editFormData.vehicleType) : '';
  const vehicleAgeValue = editFormData ? getFormValue(editFormData.vehicleAge) : '';
  const vehicleUseValue = editFormData ? getFormValue(editFormData.vehicleUse) : '';
  const otherVehicleUseValue = editFormData ? getFormValue(editFormData.otherVehicleUse) : '';
  const insuranceProviderValue = editFormData ? getFormValue(editFormData.insuranceProvider) : '';
  const insuranceTypeValue = editFormData ? getFormValue(editFormData.insuranceType) : '';
  const insuranceDurationValue = editFormData ? getFormValue(editFormData.insuranceDuration) : '';

  const isVehicleInsurance =
    editFormData?.insuranceCategory === 'Car Insurance' ||
    editFormData?.insuranceCategory === 'MotorBike Insurance';

  const showInsuranceCategory = isPersistentlyVisible('insuranceCategory') || hasExistingValue(insuranceCategoryValue);
  const showPlateNumber = isPersistentlyVisible('plateNumber') || (isVehicleInsurance && hasExistingValue(plateNumberValue));
  const showVehicleType = isPersistentlyVisible('vehicleType') || (isVehicleInsurance && hasExistingValue(vehicleTypeValue));
  const showVehicleAge = isPersistentlyVisible('vehicleAge') || (isVehicleInsurance && hasExistingValue(vehicleAgeValue));
  const showVehicleUse = isPersistentlyVisible('vehicleUse') || (isVehicleInsurance && hasExistingValue(vehicleUseValue));
  const showOtherVehicleUse = isPersistentlyVisible('otherVehicleUse') || (isVehicleInsurance && hasExistingValue(otherVehicleUseValue));
  const showComesaField =
    isPersistentlyVisible('comesa') ||
    (isVehicleInsurance && typeof editFormData?.isCOMESA === 'boolean' && editFormData.isCOMESA);
  const showInsuranceProvider = isPersistentlyVisible('insuranceProvider') || hasExistingValue(insuranceProviderValue);
  const showInsuranceType = isPersistentlyVisible('insuranceType') || hasExistingValue(insuranceTypeValue);
  const showInsuranceDuration = isPersistentlyVisible('insuranceDuration') || hasExistingValue(insuranceDurationValue);

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

  const amountValue = editFormData ? getFormValue(editFormData.amount) : '';
  const netPremiumValue = editFormData ? getFormValue(editFormData.netPremium) : '';
  const agentCommissionValue = editFormData ? getFormValue(editFormData.agentCommission) : '';
  const companyCommissionValue = editFormData ? getFormValue(editFormData.companyCommission) : '';
  const administrationFeesValue = editFormData ? getFormValue(editFormData.administrationFees) : '';
  const transactionIdValue = editFormData ? getFormValue(editFormData.transactionId) : '';
  const policeNumberValue = editFormData ? getFormValue(editFormData.policeNumber) : '';
  const paymentInstructionsValue = editFormData ? getFormValue(editFormData.paymentInstructions) : '';

  const showAmountField = isPersistentlyVisible('amountField') || hasExistingValue(amountValue);
  const showNetPremiumField = isPersistentlyVisible('netPremiumField') || hasExistingValue(netPremiumValue);
  const showAgentCommissionField = isPersistentlyVisible('agentCommissionField') || hasExistingValue(agentCommissionValue);
  const showCompanyCommissionField = isPersistentlyVisible('companyCommissionField') || hasExistingValue(companyCommissionValue);
  const showAdministrationFeesField = isPersistentlyVisible('administrationFeesField') || hasExistingValue(administrationFeesValue);
  const showTransactionIdField = isPersistentlyVisible('transactionIdField') || hasExistingValue(transactionIdValue);
  const showPoliceNumberField = isPersistentlyVisible('policeNumberField') || hasExistingValue(policeNumberValue);
  const showPaymentInstructionsField = isPersistentlyVisible('paymentInstructionsField') || hasExistingValue(paymentInstructionsValue);

  const showPaymentSection =
    showAmountField ||
    showNetPremiumField ||
    showAgentCommissionField ||
    showCompanyCommissionField ||
    showAdministrationFeesField ||
    showTransactionIdField ||
    showPoliceNumberField ||
    showPaymentInstructionsField;

  const statusValue = editFormData ? getFormValue(editFormData.status) : '';
  const showStatusField = isPersistentlyVisible('statusField') || hasExistingValue(statusValue);
  const insuranceEndDateValue = editingApp?.insuranceEndAt
    ? (() => {
        const date = new Date(editingApp.insuranceEndAt);
        if (isNaN(date.getTime())) return '';
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })()
    : '';
  const showInsuranceEndDateField = isPersistentlyVisible('insuranceEndDateField') || hasExistingValue(insuranceEndDateValue);
  const showStatusSection = showStatusField || showInsuranceEndDateField;

  const showInvoiceUpload = isPersistentlyVisible('invoiceUpload') || hasExistingValue(editingApp?.invoice);
  const showInsuranceCertificateUpload =
    isPersistentlyVisible('insuranceCertificateUpload') || hasExistingValue(editingApp?.insuranceCertificate);
  const showContractUpload = isPersistentlyVisible('contractUpload') || hasExistingValue(editingApp?.contract);
  const showReceiptUpload = isPersistentlyVisible('receiptUpload') || hasExistingValue(editingApp?.receipt);
  const showEbmUpload = isPersistentlyVisible('ebmUpload') || hasExistingValue(editingApp?.ebm);
  const showInsuranceDocumentsSection =
    showInvoiceUpload ||
    showInsuranceCertificateUpload ||
    showContractUpload ||
    showReceiptUpload ||
    showEbmUpload;

  const showProofOfPaymentInfo = isPersistentlyVisible('proofOfPaymentInfo') || hasExistingValue(editingApp?.proofOfPayment);
  const showTransactionIdInfo = isPersistentlyVisible('transactionIdInfo') || hasExistingValue(editingApp?.transactionId);
  const showPoliceNumberInfo = isPersistentlyVisible('policeNumberInfo') || hasExistingValue(editingApp?.policeNumber);
  const showYellowCardInfo = isPersistentlyVisible('yellowCardInfo') || hasExistingValue(editingApp?.yellowCard);
  const showPastInsuranceCertificateInfo =
    isPersistentlyVisible('pastInsuranceCertificateInfo') || hasExistingValue(editingApp?.pastInsuranceCertificate);
  const showAgentInfoSection =
    showProofOfPaymentInfo ||
    showTransactionIdInfo ||
    showPoliceNumberInfo ||
    showYellowCardInfo ||
    showPastInsuranceCertificateInfo;

  // ── Download helpers ──────────────────────────────────────────────────────

  const isVehicleCategory = (category: string) => {
    const cat = (category || '').toLowerCase();
    return cat.includes('car') || cat.includes('vehicle') || cat.includes('motor') || cat.includes('auto');
  };

  const buildExportRow = (app: Application) => ({
    id: app.applicationNumber || 'N/A',
    clientPhone: app.client?.phoneNumber || app.phoneNumber || 'N/A',
    clientName: app.client?.fullName || app.fullName || 'N/A',
    agentEmail: app.agent?.email || 'N/A',
    agentName: app.agent?.fullName || 'N/A',
    category: app.insuranceCategory || 'N/A',
    insuranceEndDate: formatDateUTC(app.insuranceEndAt),
    commission: app.agentCommission ?? 0,
    plateNumber: isVehicleCategory(app.insuranceCategory) ? (app.vehicle?.plateNumber || 'N/A') : '',
    policeNumber: formatPoliceNumberDisplay(app),
  });

  const EXPORT_HEADERS = [
    'Application ID',
    'Client Phone',
    'Client Name',
    'Agent Email',
    'Agent Name',
    'Insurance Category',
    'Insurance End Date',
    'Commission (RWF)',
    'Plate Number',
    'Police Number',
  ];

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = await import('jspdf-autotable');

      const doc = new jsPDF('landscape', 'mm', 'a4');
      const now = new Date();

      doc.setFontSize(18);
      doc.setTextColor(10, 37, 64);
      doc.text('Commission Review Report', 14, 20);
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(
        activeTab === 'pending_review' ? 'Queue: Pending admin review' : 'Queue: Ready to be paid',
        14,
        26,
      );

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 14, 32);
      doc.text(`Total applications: ${exportApplications.length}`, 14, 38);

      const totalComm = exportApplications.reduce((s, a) => s + (a.agentCommission ?? 0), 0);
      doc.text(`Total commission: ${totalComm.toLocaleString()} RWF`, 14, 44);

      let tableStartY = 52;
      if (filteredApplications.length === 0 && applications.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(160, 100, 0);
        doc.text(
          'Note: Current filters match no rows — export includes the full list for this tab.',
          14,
          49,
        );
        tableStartY = 58;
      }

      const tableData = exportApplications.map((app) => {
        const r = buildExportRow(app);
        return [
          r.id,
          r.clientPhone,
          r.clientName,
          r.agentEmail,
          r.agentName,
          r.category,
          r.insuranceEndDate,
          `${r.commission.toLocaleString()} RWF`,
          r.plateNumber,
          r.policeNumber,
        ];
      });

      autoTable.default(doc, {
        head: [EXPORT_HEADERS],
        body: tableData,
        startY: tableStartY,
        styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak', lineColor: [200, 200, 200], lineWidth: 0.1, valign: 'top' },
        headStyles: { fillColor: [51, 122, 183], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 36 },                    // Application ID
          1: { cellWidth: 24 },                    // Client Phone
          2: { cellWidth: 44 },                    // Client Name  ← wider
          3: { cellWidth: 38 },                    // Agent Email
          4: { cellWidth: 41 },                    // Agent Name   ← wider
          5: { cellWidth: 26 },                    // Insurance Category
          6: { cellWidth: 22, halign: 'center' },  // Insurance End Date
          7: { cellWidth: 26, halign: 'right' },   // Commission
          8: { cellWidth: 20 },                    // Plate Number
          9: { cellWidth: 22 },                    // Police Number
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 10, right: 8, bottom: 12, left: 8 },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(130, 130, 130);
          doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 8);
        },
      });

      const dateStr = now.toISOString().split('T')[0];
      const queueSlug = activeTab === 'pending_review' ? 'pending_review' : 'ready_to_be_paid';
      doc.save(`commission_review_${queueSlug}_${dateStr}.pdf`);
      showToast('PDF downloaded successfully', 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('Failed to generate PDF', 'error');
    }
  };

  const handleDownloadExcel = () => {
    try {
      const csvRows = [
        EXPORT_HEADERS.join(','),
        ...exportApplications.map((app) => {
          const r = buildExportRow(app);
          const cells = [
            r.id,
            r.clientPhone,
            r.clientName,
            r.agentEmail,
            r.agentName,
            r.category,
            r.insuranceEndDate,
            r.commission.toString(),
            r.plateNumber,
            r.policeNumber,
          ];
          return cells.map((c) => (String(c).includes(',') ? `"${c}"` : c)).join(',');
        }),
      ].join('\n');

      const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const queueSlug = activeTab === 'pending_review' ? 'pending_review' : 'ready_to_be_paid';
      link.download = `commission_review_${queueSlug}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Excel file downloaded successfully', 'success');
    } catch (err) {
      console.error('Excel generation error:', err);
      showToast('Failed to generate Excel file', 'error');
    }
  };

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-8">

        <div className="mb-8 mt-16">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Commission review</h1>
          <p className="text-gray-600 text-sm sm:text-base mb-4">
            Review agent commissions, approve for payout, or return applications to review if needed.
          </p>

          {/* Tabs */}
          <div
            className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4"
            role="tablist"
            aria-label="Commission review views"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'pending_review'}
              id="tab-pending-review"
              className={[
                'cursor-pointer flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 text-left sm:text-center',
                activeTab === 'pending_review'
                  ? 'bg-[var(--main-blue)] text-white border-[var(--main-blue)] shadow-md'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50',
              ].join(' ')}
              onClick={() => {
                setActiveTab('pending_review');
                setCurrentPage(1);
                setSelectedApp(null);
                setHoldComment('');
              }}
            >
              <span className="block">Pending admin review</span>
              <span
                className={`text-xs font-normal mt-0.5 block ${
                  activeTab === 'pending_review' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {isLoadingReview && reviewCount === 0 ? '…' : `${reviewCount} in queue`}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ready_to_be_paid'}
              id="tab-ready-paid"
              className={[
                'cursor-pointer flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 text-left sm:text-center',
                activeTab === 'ready_to_be_paid'
                  ? 'bg-[var(--main-blue)] text-white border-[var(--main-blue)] shadow-md'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50',
              ].join(' ')}
              onClick={() => {
                setActiveTab('ready_to_be_paid');
                setCurrentPage(1);
                setSelectedApp(null);
                setHoldComment('');
              }}
            >
              <span className="block">Ready to be paid</span>
              <span
                className={`text-xs font-normal mt-0.5 block ${
                  activeTab === 'ready_to_be_paid' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {isLoadingReady && readyCount === 0 ? '…' : `${readyCount} approved`}
              </span>
            </button>
          </div>

          {/* Summary card */}
          <div className="mt-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  {activeTab === 'pending_review'
                    ? 'Total agent commission (pending review)'
                    : 'Total agent commission (ready to be paid)'}
                </p>
                <p className="text-2xl font-bold text-[var(--main-blue)]">
                  {totalCommission.toLocaleString()} RWF
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {activeTab === 'pending_review' ? 'Applications in this queue' : 'Applications ready for payout'}
                </p>
                <p className="text-xl font-semibold text-gray-800">{totalApplications}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search, filter and bulk actions section */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100">

          {/* Top bar: result count + bulk action + downloads */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs sm:text-sm text-gray-500">
              Showing{' '}
              <span className="font-semibold text-gray-800">
                {filteredApplications.length.toLocaleString()}
              </span>{' '}
              application{filteredApplications.length === 1 ? '' : 's'} after filters
            </p>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {applications.length > 0 && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleDownloadPDF}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5 px-3 py-1.5 text-xs"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    PDF
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleDownloadExcel}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 px-3 py-1.5 text-xs"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Excel
                  </Button>
                </>
              )}
              {activeTab === 'pending_review' && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={filteredApplications.length === 0 || isBulkMarkingReady || isLoading}
                  onClick={handleMarkAllVisibleAsReady}
                >
                  {isBulkMarkingReady ? 'Approving…' : 'Approve All Filtered'}
                </Button>
              )}
            </div>
          </div>

          {/* Filter body: two-column layout on md+ */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

            {/* ── LEFT COLUMN: Search + Agent ── */}
            <div className="flex flex-col gap-3">

              {/* Search */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 tracking-widest mb-1 uppercase">
                  Search Applications
                </label>
                <Input
                  label="Search"
                  hideLabel
                  size="compact"
                  className="mb-0"
                  name="search"
                  placeholder="Search by client name, email or ID…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  error={undefined}
                />
              </div>

              {/* Agent (searchable) */}
              <div>
                <SearchableSelect<SearchableSelectOption>
                  label="Agent"
                  name="agent"
                  placeholder="Type to search agents…"
                  value={selectedAgentId === 'all' ? null : selectedAgentId}
                  onChange={(value) => {
                    setSelectedAgentId(value || 'all');
                    setCurrentPage(1);
                  }}
                  fetchOptions={fetchAgentOptions}
                  getDisplayValue={(option) => option.fullName as string}
                  getSearchValue={(option) =>
                    `${option.fullName ?? ''} ${option.email ?? ''} ${option.phoneNumber ?? ''}`
                  }
                  renderOptionContent={(option) => (
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {option.fullName as string}
                      </span>
                      {((option.email as string | undefined) || (option.phoneNumber as string | undefined)) && (
                        <span className="text-[11px] text-gray-400 truncate">
                          {((option.email as string | undefined) ?? (option.phoneNumber as string | undefined))}
                        </span>
                      )}
                    </div>
                  )}
                  renderSelectedValue={(option) => (
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {option.fullName as string}
                      </span>
                      {((option.email as string | undefined) || (option.phoneNumber as string | undefined)) && (
                        <span className="text-[11px] text-gray-400 truncate">
                          {((option.email as string | undefined) ?? (option.phoneNumber as string | undefined))}
                        </span>
                      )}
                    </div>
                  )}
                  emptyMessage="No agents available"
                  noResultsMessage="No agents match your search"
                />
              </div>
            </div>

            {/* ── RIGHT COLUMN: Date range + Status + Clear ── */}
            <div className="flex flex-col gap-3">

              {/* Date Range */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 tracking-widest mb-1 uppercase">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">From</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                      className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">To</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                      className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Status + Clear */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 tracking-widest mb-1 uppercase">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                    className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-transparent bg-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="application_approved">Approved</option>
                    <option value="waiting_for_user_action">Action Required</option>
                    <option value="invoice_sent">Invoice Sent</option>
                    <option value="review_payment">Payment Review</option>
                    <option value="payment_verified">Payment Verified</option>
                    <option value="insurance_issued">Insurance Issued</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedAgentId('all');
                    setSelectedStatus('all');
                    setStartDate('');
                    setEndDate('');
                    setCurrentPage(1);
                  }}
                  className="shrink-0 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-800 transition-colors whitespace-nowrap"
                >
                  Clear all filters
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Applications table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Scroll hint */}
          {!isLoading && showScrollHint && (
            <div className="w-screen py-2 bg-blue-50 border-b border-blue-200 overflow-hidden relative">
              {/* Left gradient fade */}
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-blue-50 to-transparent z-10 pointer-events-none" />
              {/* Right gradient fade */}
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-blue-50 to-transparent z-10 pointer-events-none" />
              {/* Flowing text */}
              <div className="flex items-center justify-center text-sm text-blue-700">
                <span className="animate-flowing-text">
                  Scroll horizontally to view all columns
                </span>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[var(--mid-gray)] border-t-[var(--main-blue)]" />
              <p className="mt-4 text-gray-600">Loading applications...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-8 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-4 text-gray-600">No applications found</p>
            </div>
          ) : (
            <div className="relative">
              {/* Left fade indicator */}
              {showLeftFade && (
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-100 via-gray-50/80 to-transparent z-10 pointer-events-none" />
              )}

              {/* Right fade indicator */}
              {showRightFade && (
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-100 via-gray-50/80 to-transparent z-10 pointer-events-none" />
              )}

              <div className="overflow-x-auto" onScroll={handleTableScroll}>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {(
                        [
                          { label: 'ID', field: 'applicationNumber' },
                          { label: 'Client', field: 'clientName' },
                          { label: 'Agent', field: 'agentName' },
                          { label: 'Insurance Category', field: 'insuranceCategory' },
                          { label: 'Insurance End Date', field: 'insuranceEndAt' },
                          { label: 'Date', field: 'submittedAt' },
                          { label: 'Commission', field: 'agentCommission' },
                          { label: 'Payment Status', field: 'agentCommissionPaymentStatus' },
                        ] as const
                      ).map(({ label, field }) => (
                        <th
                          key={field}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none transition-colors"
                          onClick={() => handleSort(field)}
                        >
                          <div className="flex items-center gap-1.5">
                            {label}
                            <SortIcon field={field} />
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedApplications.map((app) => (
                      <tr key={app._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-[var(--main-blue)]">
                          #{app.applicationNumber}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {app.client?.fullName || app.fullName || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {app.client?.phoneNumber || app.phoneNumber || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {app.agent?.fullName || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {app.agent?.email || app.agent?.phoneNumber || ''}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 capitalize">
                            {app.insuranceCategory || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDateUTC(app.insuranceEndAt)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateUTC(app.submittedAt)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-[var(--accent-orange)]">
                            {app.agentCommission?.toLocaleString() || '0'} RWF
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getPaymentStatusBadge(app.agentCommissionPaymentStatus)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          {getActionButtons(app)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredApplications.length / itemsPerPage)}
                totalItems={filteredApplications.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(val) => {
                  setItemsPerPage(val);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4 fade-in">
            <div className="flex justify-between items-center mb-4 gap-3">
              <div>
                <h3 className="text-lg font-semibold">
                  {activeTab === 'ready_to_be_paid'
                    ? 'Application — ready to be paid'
                    : 'Review application'}
                </h3>
                {activeTab === 'ready_to_be_paid' && (
                  <p className="text-xs text-gray-500 mt-1">
                    This application is approved for commission payout. You can return it to pending review if it was
                    marked by mistake.
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedApp(null);
                  setHoldComment('');
                }}
                className="text-gray-400 hover:text-gray-600 shrink-0"
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
                  <p className="font-semibold">
                    {selectedApp.client?.fullName || selectedApp.fullName || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-semibold">
                    {selectedApp.client?.email || selectedApp.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-semibold">
                    {selectedApp.client?.phoneNumber || selectedApp.phoneNumber || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-semibold">
                    {formatDateUTC(selectedApp.client?.dateOfBirth)}
                  </p>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-semibold">
                    {selectedApp.client?.address || selectedApp.address || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Province</p>
                  <p className="font-semibold">{selectedApp.client?.province || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">District</p>
                  <p className="font-semibold">{selectedApp.client?.district || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sector</p>
                  <p className="font-semibold">{selectedApp.client?.sector || 'N/A'}</p>
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
                    <p className="font-semibold">
                      {formatDateUTC(selectedApp.insuranceEndAt)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Created By</p>
                  <p className="font-semibold">
                    {selectedApp.admin
                      ? `Admin: ${selectedApp.admin.fullName}`
                      : selectedApp.agent
                        ? `Agent: ${selectedApp.agent.fullName}`
                        : 'Client'}
                  </p>
                </div>
                {selectedApp.agent && (
                  <>
                    {selectedApp.agent.email && (
                      <div>
                        <p className="text-sm text-gray-500">Agent Email</p>
                        <p className="font-semibold">{selectedApp.agent.email}</p>
                      </div>
                    )}
                    {selectedApp.agent.phoneNumber && (
                      <div>
                        <p className="text-sm text-gray-500">Agent Phone</p>
                        <p className="font-semibold">{selectedApp.agent.phoneNumber}</p>
                      </div>
                    )}
                  </>
                )}
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
              </div>

              {/* Vehicle Information (if applicable) */}
              {(selectedApp.insuranceCategory === 'Car Insurance' ||
                selectedApp.insuranceCategory === 'MotorBike Insurance') && (
                <div className="space-y-2">
                  {selectedApp.vehicle?.vehicleType && (
                    <div>
                      <p className="text-sm text-gray-500">Vehicle Type</p>
                      <p className="font-semibold">{selectedApp.vehicle.vehicleType}</p>
                    </div>
                  )}
                  {selectedApp.vehicle?.vehicleAge && (
                    <div>
                      <p className="text-sm text-gray-500">Vehicle Year</p>
                      <p className="font-semibold">{selectedApp.vehicle.vehicleAge}</p>
                    </div>
                  )}
                  {selectedApp.vehicle?.vehicleUse && (
                    <div>
                      <p className="text-sm text-gray-500">Vehicle Use</p>
                      <p className="font-semibold">
                        {selectedApp.vehicle.vehicleUse === 'Other'
                          ? selectedApp.vehicle.otherVehicleUse || 'Other'
                          : selectedApp.vehicle.vehicleUse}
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

              {/* Commission Information */}
              {(selectedApp.companyCommission || selectedApp.agentCommission) && (
                <div className="space-y-2">
                  {selectedApp.companyCommission && (
                    <div>
                      <p className="text-sm text-gray-500">Company Commission</p>
                      <p className="font-semibold">
                        {selectedApp.companyCommission.toLocaleString()} RWF
                      </p>
                    </div>
                  )}
                  {selectedApp.agent && selectedApp.agentCommission && (
                    <div>
                      <p className="text-sm text-gray-500">Agent Commission</p>
                      <p className="font-semibold">
                        {selectedApp.agentCommission.toLocaleString()} RWF
                      </p>
                    </div>
                  )}
                  {selectedApp.administrationFees && (
                    <div>
                      <p className="text-sm text-gray-500">Administration Fees</p>
                      <p className="font-semibold">{selectedApp.administrationFees} RWF</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Documents Section */}
            <div className="bg-[var(--light-gray)] p-4 rounded-lg mb-4 mt-6">
              <h4 className="font-medium mb-2">Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                  onClick={() =>
                    setViewingDocument({
                      name: 'National ID / Passport',
                      path: selectedApp.client?.nationalID || '',
                    })
                  }
                >
                  <p className="text-sm font-medium">National ID / Passport</p>
                  <p className="text-xs text-gray-500">View Document</p>
                </button>

                <button
                  className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                  onClick={() =>
                    setViewingDocument({
                      name: 'Yellow Card',
                      path: selectedApp.yellowCard || '',
                    })
                  }
                >
                  <p className="text-sm font-medium">Yellow Card</p>
                  <p className="text-xs text-gray-500">View Document</p>
                </button>

                {selectedApp.pastInsuranceCertificate && (
                  <button
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() =>
                      setViewingDocument({
                        name: 'Past Insurance Certificate',
                        path: selectedApp.pastInsuranceCertificate || '',
                      })
                    }
                  >
                    <p className="text-sm font-medium">Past Insurance</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}

                {selectedApp.proofOfPayment && (
                  <button
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() =>
                      setViewingDocument({
                        name: 'Proof of Payment',
                        path: selectedApp.proofOfPayment || '',
                      })
                    }
                  >
                    <p className="text-sm font-medium">Proof of Payment</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}

                {selectedApp.invoice && (
                  <button
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() =>
                      setViewingDocument({
                        name: 'Quotation / Invoice',
                        path: selectedApp.invoice || '',
                      })
                    }
                  >
                    <p className="text-sm font-medium">Quotation / Invoice</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}

                {selectedApp.insuranceCertificate && (
                  <button
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() =>
                      setViewingDocument({
                        name: 'Insurance Certificate',
                        path: selectedApp.insuranceCertificate || '',
                      })
                    }
                  >
                    <p className="text-sm font-medium">Insurance Certificate</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}

                {selectedApp.contract && (
                  <button
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() =>
                      setViewingDocument({
                        name: 'Contract',
                        path: selectedApp.contract || '',
                      })
                    }
                  >
                    <p className="text-sm font-medium">Contract</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}

                {selectedApp.receipt && (
                  <button
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() =>
                      setViewingDocument({
                        name: 'Receipt',
                        path: selectedApp.receipt || '',
                      })
                    }
                  >
                    <p className="text-sm font-medium">Receipt</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}

                {selectedApp.ebm && (
                  <button
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() =>
                      setViewingDocument({
                        name: 'EBM',
                        path: selectedApp.ebm || '',
                      })
                    }
                  >
                    <p className="text-sm font-medium">EBM</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}
              </div>
            </div>

            {/* Invoice & Payment Information */}
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

            {/* Comment field for putting on hold */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comment (required to put on hold)
              </label>
              <textarea
                value={holdComment}
                onChange={(e) => setHoldComment(e.target.value)}
                placeholder="Enter reason for putting this application on hold..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] bg-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:flex-wrap gap-2 sm:gap-3">
              <Button
                variant="text"
                onClick={() => {
                  setSelectedApp(null);
                  setHoldComment('');
                }}
                disabled={isPuttingOnHold || isMarkingReady || isRevertingToReview}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handlePutOnHold}
                disabled={
                  !holdComment.trim() || isPuttingOnHold || isMarkingReady || isRevertingToReview
                }
                className="w-full sm:w-auto"
              >
                {isPuttingOnHold ? 'Putting on Hold...' : 'Put on Hold'}
              </Button>
              {activeTab === 'ready_to_be_paid' ? (
                <Button
                  variant="outline"
                  onClick={handleSetToPendingAdminReview}
                  disabled={isPuttingOnHold || isMarkingReady || isRevertingToReview}
                  className="w-full sm:w-auto border-amber-500 text-amber-800 hover:bg-amber-50"
                >
                  {isRevertingToReview
                    ? 'Updating…'
                    : 'Send to pending admin review'}
                </Button>
              ) : (
                <Button
                  onClick={handleMarkAsReady}
                  disabled={isPuttingOnHold || isMarkingReady || isRevertingToReview}
                  className="w-full sm:w-auto"
                >
                  {isMarkingReady ? 'Marking as Ready...' : 'Mark as Ready to be Paid'}
                </Button>
              )}
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
              {/* Client Information Section - READONLY */}
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

              {/* Insurance Details Section - READONLY */}
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

              {/* Payment & Commission Information - EDITABLE */}
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

              {/* Status & Dates - EDITABLE */}
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
                    {showInsuranceEndDateField && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Insurance End Date</label>
                        <input
                          type="text"
                          value={insuranceEndDateValue}
                          disabled
                          className="w-full py-1.5 px-2 text-xs rounded-lg bg-gray-100 border border-gray-300 text-gray-600"
                        />
                      </div>
                    )}
                  </div>
                </fieldset>
              )}

              {/* Insurance Documents - EDITABLE */}
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

              {/* Agent/Client Added Information - READONLY */}
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
                    {showPoliceNumberInfo && (
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs font-medium">Police number</p>
                        <p className="text-[10px] text-gray-500">{formatPoliceNumberDisplay(editingApp)}</p>
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

              {/* Form Actions */}
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
                <Button
                  type="submit"
                  disabled={isSubmittingEdit}
                >
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
};

export default AdminCommissionReviewPage;

