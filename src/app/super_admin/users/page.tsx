'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { UserCreateModal } from '@/components/ui/super_admin/user-create-modal';
import { UserViewModal } from '@/components/ui/super_admin/user-view-modal';
import { UserEditModal } from '@/components/ui/super_admin/user-edit-modal';
import { useAuth } from '@/context/AuthContext';
import { ArrowUpDown, ArrowUp, ArrowDown, Calendar, Download, FileText } from 'lucide-react';

interface User {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'ADMIN' | 'AGENT' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'DEACTIVATED' | 'SENT_FOR_ACTION' | 'PENDING';
  createdAt?: string;
  dateOfBirth?: string;
  address?: string;
  province?: string;
  district?: string;
  sector?: string;
  passportPhoto?: string | File;
  nationalIdDocument?: string | File;
  criminalRecordCertificate?: string | File;
  emergencyContacts?: Array<{
    fullName: string;
    phoneNumber: string;
    relationship: string;
    _id: string;
  }>;
  rejectionReason?: string;
  deactivationHistory?: Array<{
    deactivationReason: string;
    deactivationFile?: string;
    deactivationDate: string;
    _id: string;
  }>;
  bankName?: string;
  bankAccountNumber?: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type UserSortField = 'fullName' | 'email' | 'role' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface DeactivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, file: File | null) => void;
  isLoading: boolean;
}

const DeactivationModal = ({ isOpen, onClose, onConfirm, isLoading }: DeactivationModalProps) => {
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = () => {
    onConfirm(reason, file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Confirm Deactivation</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deactivation Reason <span className='text-red-700'>*</span>
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-md p-2"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attachment (Optional)
          </label>
          <input
            type="file"
            className="w-full border border-gray-300 rounded-md p-2"
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={isLoading || !reason}
          >
            Confirm Deactivation
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function SuperAdminUsersPage() {
  const { showToast, ToastContainer } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{
    name: string;
    path: string;
  } | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'ADMIN'| 'FINANCE' | 'AGENT' | 'SUPER_ADMIN' | 'SONARWA_REPRESENTATIVE'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | User['status']>('all');
  const { token } = useAuth();
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<string | null>(null);
  const itemsPerPage = 10;
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortField, setSortField] = useState<UserSortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    address: string;
    province: string;
    district: string;
    sector: string;
    role: 'ADMIN' | 'AGENT' | 'FINANCE' | 'SONARWA_REPRESENTATIVE';
    emergencyContact1Name: string;
    emergencyContact1PhoneNumber: string;
    emergencyContact1Relationship: string;
    emergencyContact2Name: string;
    emergencyContact2PhoneNumber: string;
    emergencyContact2Relationship: string;
    nationalIdDocument: File | null;
    criminalRecordCertificate: File | null;
    passportPhoto: File | null;
    bankName: string;
    bankAccountNumber: string;
  }>({
    fullName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    address: '',
    province: '',
    district: '',
    sector: '',
    role: 'AGENT',
    emergencyContact1Name: '',
    emergencyContact1PhoneNumber: '',
    emergencyContact1Relationship: '',
    emergencyContact2Name: '',
    emergencyContact2PhoneNumber: '',
    emergencyContact2Relationship: '',
    nationalIdDocument: null as File | null,
    criminalRecordCertificate: null as File | null,
    passportPhoto: null as File | null,
    bankName: '',
    bankAccountNumber: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getAllusers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      const sortedUsers = data.data.sort((a: User, b: User) => {
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
      });
      setUsers(sortedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Failed to load users', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const filtered = users.filter(user => {
      const matchesSearch = 
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phoneNumber.includes(searchQuery);
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

      const matchesDateRange = (() => {
        if (!startDate && !endDate) return true;
        if (!user.createdAt) return false;

        const createdDate = new Date(user.createdAt);
        const createdDateOnly = new Date(
          createdDate.getFullYear(),
          createdDate.getMonth(),
          createdDate.getDate()
        );

        const start = startDate ? new Date(startDate + 'T00:00:00') : null;
        const end = endDate ? new Date(endDate + 'T23:59:59') : null;

        if (start && end) {
          return createdDateOnly >= start && createdDateOnly <= end;
        } else if (start) {
          return createdDateOnly >= start;
        } else if (end) {
          return createdDateOnly <= end;
        }
        return true;
      })();
      
      return matchesSearch && matchesRole && matchesStatus && matchesDateRange;
    });

    filtered.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      const normalize = (val: string | undefined) => (val || '').toLowerCase();

      switch (sortField) {
        case 'fullName':
          aValue = normalize(a.fullName);
          bValue = normalize(b.fullName);
          break;
        case 'email':
          aValue = normalize(a.email);
          bValue = normalize(b.email);
          break;
        case 'role':
          aValue = normalize(a.role);
          bValue = normalize(b.role);
          break;
        case 'status':
          aValue = normalize(a.status);
          bValue = normalize(b.status);
          break;
        case 'createdAt':
        default:
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchQuery, roleFilter, statusFilter, startDate, endDate, sortField, sortDirection]);

  const paginatedUsers = useMemo(
    () =>
      filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [filteredUsers, currentPage, itemsPerPage]
  );

  const handleCreateUser = async () => {
    setIsLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('fullName', formData.fullName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phoneNumber', formData.phoneNumber);
      formDataToSend.append('dateOfBirth', formData.dateOfBirth);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('province', formData.province);
      formDataToSend.append('district', formData.district);
      formDataToSend.append('sector', formData.sector);
      formDataToSend.append('role', formData.role);
      formDataToSend.append('bankName', formData.bankName);
      formDataToSend.append('bankAccountNumber', formData.bankAccountNumber);
      

        if (formData.nationalIdDocument) {
          formDataToSend.append('nationalIdDocument', formData.nationalIdDocument);
        }
        if (formData.criminalRecordCertificate) {
          formDataToSend.append('criminalRecordCertificate', formData.criminalRecordCertificate);
        }
        if (formData.passportPhoto) {
          formDataToSend.append('passportPhoto', formData.passportPhoto);
        }
        
        formDataToSend.append('emergencyContacts1Name', formData.emergencyContact1Name);
        formDataToSend.append('emergencyContacts1Phone', formData.emergencyContact1PhoneNumber);
        formDataToSend.append('emergencyContacts1Relationship', formData.emergencyContact1Relationship);
        formDataToSend.append('emergencyContacts2Name', formData.emergencyContact2Name);
        formDataToSend.append('emergencyContacts2Phone', formData.emergencyContact2PhoneNumber);
        formDataToSend.append('emergencyContacts2Relationship', formData.emergencyContact2Relationship);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      const data = await response.json();
      setUsers(prev => [...prev, data.data]);
      showToast('User created successfully!', 'success');
      setIsCreatingUser(false);
      setFormData({
        fullName: '',
        email: '',
        phoneNumber: '',
        dateOfBirth: '',
        address: '',
        province: '',
        district: '',
        sector: '',
        role: 'AGENT',
        emergencyContact1Name: '',
        emergencyContact1PhoneNumber: '',
        emergencyContact1Relationship: '',
        emergencyContact2Name: '',
        emergencyContact2PhoneNumber: '',
        emergencyContact2Relationship: '',
        nationalIdDocument: null,
        criminalRecordCertificate: null,
        passportPhoto: null,
        bankName: '', 
        bankAccountNumber: '',
      });
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      if (error && typeof error === 'object' && 'message' in error) {
        showToast((error as { message?: string }).message || 'Failed to create user', 'error');
      } else {
        showToast('Failed to create user', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, status: User['status'], reason?: string) => {
    setIsLoading(true);
    try {
      let endpoint = '';
      let body: Record<string, unknown> | null = null;
      const method = 'PUT';

      switch (status) {
        case 'ACTIVE':
          endpoint = `approveAgentApplication/${userId}`;
          break;
        case 'SENT_FOR_ACTION':
          endpoint = `sendForAction/${userId}`;
          body = { rejectionReason: reason };
          break;
        case 'DEACTIVATED':
          endpoint = `deactivateAgentApplication/${userId}`;
          break;
        default:
          throw new Error('Invalid status change');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: body ? JSON.stringify(body) : null
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      const updatedUsers = users.map(user => {
        if (user._id === userId) {
          return { 
            ...user, 
            status: status,
            ...(reason && { rejectionReason: reason })
          };
        }
        return user;
      });

      setUsers(updatedUsers as User[]);
      showToast(`User status updated to ${status.replace('_', ' ').toLowerCase()}`, 'success');
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user status:', error);
      showToast('Failed to update user status', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setUserToDeactivate(userId);
    setIsDeactivating(true);
  };

  const confirmDeactivation = async (reason: string, deactivationFile: File | null) => {
    if (!userToDeactivate) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('deactivationReason', reason);
      if (deactivationFile) {
        formData.append('deactivationFile', deactivationFile);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/deactivateAgentApplication/${userToDeactivate}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to deactivate user');
      }

      const updatedUsers = users.map((user) =>
        user._id === userToDeactivate 
          ? { 
              ...user, 
              status: 'DEACTIVATED' as User['status'],
              deactivationReason: reason,
              deactivationFile: deactivationFile ? URL.createObjectURL(deactivationFile) : undefined
            } 
          : user
      );

      setUsers(updatedUsers as User[]);
      showToast('User deactivated successfully', 'success');
    } catch (error) {
      console.error('Error deactivating user:', error);
      showToast('Failed to deactivate user', 'error');
    } finally {
      setIsLoading(false);
      setIsDeactivating(false);
      setUserToDeactivate(null);
    }
  };

  const handleEditUser = async (updatedUser: User) => {
    setIsLoading(true);
    try {
      const originalUser = users.find(u => u._id === updatedUser._id);
      if (!originalUser) {
        throw new Error('User not found');
      }

      const changedFields: Partial<User> = {};
      
      if (originalUser.fullName !== updatedUser.fullName) changedFields.fullName = updatedUser.fullName;
      if (originalUser.phoneNumber !== updatedUser.phoneNumber) changedFields.phoneNumber = updatedUser.phoneNumber;
      if (originalUser.dateOfBirth !== updatedUser.dateOfBirth) changedFields.dateOfBirth = updatedUser.dateOfBirth;
      if (originalUser.address !== updatedUser.address) changedFields.address = updatedUser.address;
      if (originalUser.province !== updatedUser.province) changedFields.province = updatedUser.province;
      if (originalUser.district !== updatedUser.district) changedFields.district = updatedUser.district;
      if (originalUser.sector !== updatedUser.sector) changedFields.sector = updatedUser.sector;
      if (originalUser.role !== updatedUser.role) changedFields.role = updatedUser.role;
      if (originalUser.bankName !== updatedUser.bankName) changedFields.bankName = updatedUser.bankName;
      if (originalUser.bankAccountNumber !== updatedUser.bankAccountNumber) changedFields.bankAccountNumber = updatedUser.bankAccountNumber;
      
      if (JSON.stringify(originalUser.emergencyContacts) !== JSON.stringify(updatedUser.emergencyContacts)) {
        changedFields.emergencyContacts = updatedUser.emergencyContacts;
      }

      if (Object.keys(changedFields).length > 0) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/updateUser/${updatedUser._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(changedFields)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update user');
        }

        const fetchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getAllusers`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!fetchResponse.ok) {
          throw new Error('Failed to fetch updated users');
        }

        const data = await fetchResponse.json();
        const sortedUsers = data.data.sort((a: User, b: User) => {
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        });
        setUsers(sortedUsers);

        showToast('User updated successfully', 'success');
      } else {
        showToast('No changes detected', 'info');
      }

      setIsEditingUser(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update user', 'error');
    } finally {
      setIsLoading(false);
    }
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
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
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
              <span className="font-medium">{Math.min(currentPage * 10, filteredUsers.length)}</span> of{' '}
              <span className="font-medium">{filteredUsers.length}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px " aria-label="Pagination">
              <Button
                variant="text"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="rounded-l-md"
              >
                <span className="sr-only">First</span>
                «
              </Button>
              <Button
                variant="text"
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
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">Next</span>
                ›
              </Button>
              <Button
                variant="text"
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">Active</span>;
      case 'DEACTIVATED':
        return <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-800 text-xs font-medium">Deactivated</span>;
      case 'SENT_FOR_ACTION':
        return <span className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">Sent for Action</span>;
      case 'PENDING':
        return <span className="px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">Pending</span>;
      default:
        return <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">Unknown</span>;
    }
  };

  const handleSort = (field: UserSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: UserSortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-blue-600" />
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const handleExportCSV = () => {
    if (!filteredUsers.length) return;

    const headers = ['Full Name', 'Email', 'Phone', 'Role', 'Status', 'District', 'Sector', 'Submitted At'];
    const rows = filteredUsers.map(user => [
      user.fullName,
      user.email,
      user.phoneNumber,
      user.role,
      user.status,
      user.district || '',
      user.sector || '',
      formatDate(user.createdAt),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'super-admin-users-export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    if (!filteredUsers.length) return;
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = await import('jspdf-autotable');

      const doc = new jsPDF('landscape', 'mm', 'a4');
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();

      doc.setFontSize(18);
      doc.setTextColor(10, 37, 64);
      doc.text('Ezinsure Users Report', 14, 18);

      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.text(`Generated on: ${currentDate} at ${currentTime}`, 14, 26);

      let infoY = 34;
      if (searchQuery) {
        doc.text(`Search: ${searchQuery}`, 14, infoY);
        infoY += 6;
      }
      if (roleFilter !== 'all') {
        doc.text(`Role: ${roleFilter}`, 14, infoY);
        infoY += 6;
      }
      if (statusFilter !== 'all') {
        doc.text(`Status: ${statusFilter}`, 14, infoY);
        infoY += 6;
      }
      if (startDate || endDate) {
        doc.text(`Date range: ${startDate || 'start'} to ${endDate || 'now'}`, 14, infoY);
        infoY += 6;
      }

      doc.text(`Total users: ${filteredUsers.length}`, 14, infoY + 2);

      const body = filteredUsers.map((user, index) => [
        (index + 1).toString(),
        user.fullName,
        user.email,
        user.phoneNumber,
        user.role,
        user.status,
        user.district || '',
        user.sector || '',
        formatDate(user.createdAt),
      ]);

      autoTable.default(doc, {
        startY: infoY + 8,
        head: [['#', 'Full Name', 'Email', 'Phone', 'Role', 'Status', 'District', 'Sector', 'Submitted At']],
        body,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [10, 37, 64] },
      });

      doc.save('super-admin-users-report.pdf');
    } catch (error) {
      console.error('Error generating users PDF:', error);
      showToast('Failed to generate PDF report', 'error');
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setSortField('createdAt');
    setSortDirection('desc');
    setCurrentPage(1);
  };

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-8">

        <div className="mb-8 mt-16">
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-gray-600">Manage all system users and agents</p>
        </div>

        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
            <div className="w-full md:flex-1 max-w-lg">
              <Input
                label=""
                name="search"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                }
              />
            </div>
            <div className="flex flex-col md:flex-row gap-3 md:items-center justify-end">
              <div className="flex flex-wrap gap-2 md:justify-end">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | 'ADMIN' | 'FINANCE' | 'AGENT' | 'SUPER_ADMIN')}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                >
                  <option value="all">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="AGENT">Agent</option>
                  <option value="FINANCE">Finance</option>
                  <option value="SONARWA_REPRESENTATIVE">SONARWA Representative</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | User['status'])}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                >
                  <option value="all">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="SENT_FOR_ACTION">Sent for Action</option>
                  <option value="DEACTIVATED">Deactivated</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600">From</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-gray-400">
                      <Calendar className="h-4 w-4" />
                    </span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-8 pr-2 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600">To</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-gray-400">
                      <Calendar className="h-4 w-4" />
                    </span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-8 pr-2 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="w-full md:w-auto"
            >
              Clear all filters
            </Button>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={filteredUsers.length === 0}
                className="flex items-center gap-1 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Download PDF</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={filteredUsers.length === 0}
                className="flex items-center gap-1 border-[var(--main-blue)] text-[var(--main-blue)] hover:bg-[var(--main-blue)]/5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Excel</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsCreatingUser(true);
                  setSelectedUser(null);
                }}
              >
                Create New User
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[var(--mid-gray)] border-t-[var(--main-blue)]"></div>
              <p className="mt-4 text-gray-600">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <p className="mt-4 text-gray-600">No users found matching your criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        className="flex items-center gap-1 group"
                        onClick={() => handleSort('fullName')}
                      >
                        <span>Name</span>
                        <SortIcon field="fullName" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        className="flex items-center gap-1 group"
                        onClick={() => handleSort('email')}
                      >
                        <span>Email</span>
                        <SortIcon field="email" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        className="flex items-center gap-1 group"
                        onClick={() => handleSort('role')}
                      >
                        <span>Role</span>
                        <SortIcon field="role" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        className="flex items-center gap-1 group"
                        onClick={() => handleSort('status')}
                      >
                        <span>Status</span>
                        <SortIcon field="status" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        className="flex items-center gap-1 group"
                        onClick={() => handleSort('createdAt')}
                      >
                        <span>Submitted At</span>
                        <SortIcon field="createdAt" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-[var(--main-blue)]">
                        #{(currentPage - 1) * itemsPerPage + paginatedUsers.indexOf(user) + 1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.fullName}
                        </div>
                        <div className="text-sm text-gray-500">{user.phoneNumber}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {user.role.toLowerCase().replace('_', ' ')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                            }}
                          >
                            View
                          </Button>
                          {user.status === 'ACTIVE' && (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsEditingUser(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                onClick={() => handleDeleteUser(user._id)}
                              >
                                Deactivate
                              </Button>
                            </>
                          )}
                          {(user.status === 'PENDING' || user.status === 'SENT_FOR_ACTION') && (
                            <Button
                              variant="primary"
                              onClick={() => {
                                setSelectedUser(user);
                              }}
                            >
                              Review
                            </Button>
                          )}
                          {user.status === 'DEACTIVATED' && (
                            <Button
                              variant="primary"
                              onClick={() => handleStatusChange(user._id, 'ACTIVE')}
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredUsers.length / itemsPerPage)}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>

        <UserCreateModal
          isOpen={isCreatingUser}
          onClose={() => setIsCreatingUser(false)}
          onCreate={handleCreateUser}
          isLoading={isLoading}
          errors={errors}
          formData={formData}
          setFormData={setFormData}
          setErrors={setErrors}
        />

        {selectedUser && !isEditingUser && (
          <UserViewModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onStatusChange={(status, reason) => handleStatusChange(selectedUser._id, status as User['status'], reason)}
            // isLoading={isLoading}
            setViewingDocument={setViewingDocument}
            currentUserRole="SUPER_ADMIN"
          />
        )}

        {selectedUser && isEditingUser && (
          <UserEditModal
            user={selectedUser}
            onClose={() => {
              setIsEditingUser(false);
              setSelectedUser(null);
            }}
            onSave={handleEditUser}
            isLoading={isLoading}
            currentUserRole="SUPER_ADMIN"
          />
        )}

        {viewingDocument && (
          <DocumentViewer
            documentName={viewingDocument.name}
            documentPath={viewingDocument.path}
            onClose={() => setViewingDocument(null)}
          />
        )}

        <DeactivationModal
          isOpen={isDeactivating}
          onClose={() => setIsDeactivating(false)}
          onConfirm={confirmDeactivation}
          isLoading={isLoading}
        />

        <ToastContainer />
      </div>
    </MainLayout>
  );
}