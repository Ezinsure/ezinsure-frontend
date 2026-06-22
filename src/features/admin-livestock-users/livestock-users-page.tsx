'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { UserCreateModal } from '@/components/ui/admin/user-create-modal';
import { UserViewModal } from '@/components/ui/admin/user-view-modal';
import { UserEditModal } from '@/components/ui/admin/user-edit-modal';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { useAuth } from '@/context/AuthContext';
import {
  formatLivestockUserRole,
  getLivestockWorkspaceRoles,
  getUsersListEndpoint,
  type LivestockUsersViewerRole,
} from '@/features/admin-livestock-users/config';
import { VETERINARY_ROLE } from '@/shared/utils/role';

interface LivestockUser {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: 'ACTIVE' | 'DEACTIVATED' | 'SENT_FOR_ACTION' | 'PENDING';
  createdAt?: string;
  dateOfBirth?: string;
  address?: string;
  province?: string;
  district?: string;
  sector?: string;
  passportPhoto?: string;
  nationalIdDocument?: string;
  criminalRecordCertificate?: string;
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

type UserSortField = 'fullName' | 'email' | 'role' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

type RoleFilter = 'all' | 'VETERINARY' | 'ADMIN';

interface DeactivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, file: File | null) => void;
  isLoading: boolean;
}

const DeactivationModal = ({ isOpen, onClose, onConfirm, isLoading }: DeactivationModalProps) => {
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h2 className="mb-4 text-xl font-bold">Confirm Deactivation</h2>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Deactivation Reason <span className="text-red-700">*</span>
          </label>
          <textarea
            className="w-full rounded-md border border-gray-300 p-2"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Attachment (Optional)
          </label>
          <input
            type="file"
            className="w-full rounded-md border border-gray-300 p-2"
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => onConfirm(reason, file)} disabled={isLoading || !reason}>
            Confirm Deactivation
          </Button>
        </div>
      </div>
    </div>
  );
};

const emptyFormData = {
  fullName: '',
  email: '',
  phoneNumber: '',
  dateOfBirth: '',
  address: '',
  province: '',
  district: '',
  sector: '',
  role: VETERINARY_ROLE as 'ADMIN' | 'AGENT' | 'VETERINARY',
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
};

interface LivestockUsersPageProps {
  viewerRole: LivestockUsersViewerRole;
}

export function LivestockUsersPage({ viewerRole }: LivestockUsersPageProps) {
  const { showToast, ToastContainer } = useToast();
  const { token } = useAuth();
  const workspaceRoles = useMemo(() => getLivestockWorkspaceRoles(viewerRole), [viewerRole]);

  const [users, setUsers] = useState<LivestockUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<LivestockUser | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{ name: string; path: string } | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | LivestockUser['status']>('all');
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<UserSortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [formData, setFormData] = useState(emptyFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const itemsPerPage = 10;

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(getUsersListEndpoint(viewerRole), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      const sortedUsers = (data.data as LivestockUser[])
        .filter((user) => workspaceRoles.includes(user.role))
        .sort(
          (a, b) =>
            new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime(),
        );

      setUsers(sortedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Failed to load users', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [token, showToast, viewerRole, workspaceRoles]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const filtered = users.filter((user) => {
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
          createdDate.getDate(),
        );

        const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
        const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

        if (start && end) {
          return createdDateOnly >= start && createdDateOnly <= end;
        }
        if (start) return createdDateOnly >= start;
        if (end) return createdDateOnly <= end;
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
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchQuery, roleFilter, statusFilter, startDate, endDate, sortField, sortDirection]);

  const paginatedUsers = useMemo(
    () => filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredUsers, currentPage],
  );

  const handleCreateUser = async () => {
    setIsLoading(true);
    try {
      const payload = new FormData();
      payload.append('fullName', formData.fullName);
      payload.append('email', formData.email);
      payload.append('phoneNumber', formData.phoneNumber);
      payload.append('dateOfBirth', formData.dateOfBirth);
      payload.append('address', formData.address);
      payload.append('province', formData.province);
      payload.append('district', formData.district);
      payload.append('sector', formData.sector);
      payload.append('role', VETERINARY_ROLE);
      payload.append('bankName', formData.bankName);
      payload.append('bankAccountNumber', formData.bankAccountNumber);

      if (formData.nationalIdDocument) {
        payload.append('nationalIdDocument', formData.nationalIdDocument);
      }
      if (formData.criminalRecordCertificate) {
        payload.append('criminalRecordCertificate', formData.criminalRecordCertificate);
      }
      if (formData.passportPhoto) {
        payload.append('passportPhoto', formData.passportPhoto);
      }

      const hasEmergencyContact1 =
        formData.emergencyContact1Name.trim() ||
        formData.emergencyContact1PhoneNumber.trim() ||
        formData.emergencyContact1Relationship.trim();
      const hasEmergencyContact2 =
        formData.emergencyContact2Name.trim() ||
        formData.emergencyContact2PhoneNumber.trim() ||
        formData.emergencyContact2Relationship.trim();

      if (hasEmergencyContact1) {
        payload.append('emergencyContacts1Name', formData.emergencyContact1Name);
        payload.append('emergencyContacts1Phone', formData.emergencyContact1PhoneNumber);
        payload.append('emergencyContacts1Relationship', formData.emergencyContact1Relationship);
      }
      if (hasEmergencyContact2) {
        payload.append('emergencyContacts2Name', formData.emergencyContact2Name);
        payload.append('emergencyContacts2Phone', formData.emergencyContact2PhoneNumber);
        payload.append('emergencyContacts2Relationship', formData.emergencyContact2Relationship);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create veterinarian');
      }

      showToast('Veterinarian created successfully', 'success');
      setIsCreatingUser(false);
      setFormData(emptyFormData);
      await fetchUsers();
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: string }).message)
          : 'Failed to create veterinarian';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (
    userId: string,
    status: LivestockUser['status'],
    reason?: string,
  ) => {
    setIsLoading(true);
    try {
      let endpoint = '';
      let body: Record<string, unknown> | null = null;

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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : null,
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      setUsers((prev) =>
        prev.map((user) =>
          user._id === userId ? { ...user, status, ...(reason && { rejectionReason: reason }) } : user,
        ),
      );
      showToast(`User status updated to ${status.replace('_', ' ').toLowerCase()}`, 'success');
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user status:', error);
      showToast('Failed to update user status', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeactivation = async (reason: string, deactivationFile: File | null) => {
    if (!userToDeactivate) return;

    setIsLoading(true);
    try {
      const payload = new FormData();
      payload.append('deactivationReason', reason);
      if (deactivationFile) {
        payload.append('deactivationFile', deactivationFile);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/deactivateAgentApplication/${userToDeactivate}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: payload,
        },
      );

      if (!response.ok) {
        throw new Error('Failed to deactivate user');
      }

      setUsers((prev) =>
        prev.map((user) =>
          user._id === userToDeactivate ? { ...user, status: 'DEACTIVATED' as const } : user,
        ),
      );
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

  const handleEditUser = async (updatedUser: LivestockUser) => {
    setIsLoading(true);
    try {
      const originalUser = users.find((u) => u._id === updatedUser._id);
      if (!originalUser) {
        throw new Error('User not found');
      }

      const changedFields: Partial<LivestockUser> = {};
      if (originalUser.fullName !== updatedUser.fullName) changedFields.fullName = updatedUser.fullName;
      if (originalUser.phoneNumber !== updatedUser.phoneNumber) {
        changedFields.phoneNumber = updatedUser.phoneNumber;
      }
      if (originalUser.dateOfBirth !== updatedUser.dateOfBirth) {
        changedFields.dateOfBirth = updatedUser.dateOfBirth;
      }
      if (originalUser.address !== updatedUser.address) changedFields.address = updatedUser.address;
      if (originalUser.province !== updatedUser.province) changedFields.province = updatedUser.province;
      if (originalUser.district !== updatedUser.district) changedFields.district = updatedUser.district;
      if (originalUser.sector !== updatedUser.sector) changedFields.sector = updatedUser.sector;
      if (originalUser.bankName !== updatedUser.bankName) changedFields.bankName = updatedUser.bankName;
      if (originalUser.bankAccountNumber !== updatedUser.bankAccountNumber) {
        changedFields.bankAccountNumber = updatedUser.bankAccountNumber;
      }
      if (
        JSON.stringify(originalUser.emergencyContacts) !==
        JSON.stringify(updatedUser.emergencyContacts)
      ) {
        changedFields.emergencyContacts = updatedUser.emergencyContacts;
      }

      if (Object.keys(changedFields).length === 0) {
        showToast('No changes detected', 'info');
        setIsEditingUser(false);
        setSelectedUser(null);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/updateUser/${updatedUser._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(changedFields),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      await fetchUsers();
      showToast('User updated successfully', 'success');
      setIsEditingUser(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update user', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
            Active
          </span>
        );
      case 'DEACTIVATED':
        return (
          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
            Deactivated
          </span>
        );
      case 'SENT_FOR_ACTION':
        return (
          <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
            Sent for Action
          </span>
        );
      case 'PENDING':
        return (
          <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
            Pending
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
            Unknown
          </span>
        );
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
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-blue-600" />
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
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
    const rows = filteredUsers.map((user) => [
      user.fullName,
      user.email,
      user.phoneNumber,
      formatLivestockUserRole(user.role),
      user.status,
      user.district || '',
      user.sector || '',
      formatDate(user.createdAt),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'livestock-users-export.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Manage Users</h1>
        <p className="text-gray-600">
          {viewerRole === 'SUPER_ADMIN'
            ? 'Manage veterinarians and livestock workspace admins'
            : 'Create and manage veterinarians for the livestock insurance workspace'}
        </p>
      </div>

      <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="w-full max-w-lg md:flex-1">
            <Input
              label=""
              name="search"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {viewerRole === 'SUPER_ADMIN' && (
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                className="rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-[var(--main-blue)]"
              >
                <option value="all">All Roles</option>
                <option value={VETERINARY_ROLE}>Veterinarian</option>
                <option value="ADMIN">Admin</option>
              </select>
            )}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-[var(--main-blue)]"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="SENT_FOR_ACTION">Sent for Action</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">From</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-md border border-gray-300 py-2 pl-8 pr-2 text-xs focus:border-[var(--main-blue)] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">To</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-md border border-gray-300 py-2 pl-8 pr-2 text-xs focus:border-[var(--main-blue)] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!filteredUsers.length}>
            <Download className="mr-1 h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setFormData(emptyFormData);
              setIsCreatingUser(true);
              setSelectedUser(null);
            }}
          >
            Create Veterinarian
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-lg">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[var(--mid-gray)] border-t-[var(--main-blue)]" />
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No users found matching your criteria</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    #
                  </th>
                  {(['fullName', 'email', 'role', 'status', 'createdAt'] as UserSortField[]).map((field) => (
                    <th
                      key={field}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      <button
                        type="button"
                        className="flex items-center gap-1"
                        onClick={() => handleSort(field)}
                      >
                        <span>
                          {field === 'fullName'
                            ? 'Name'
                            : field === 'createdAt'
                              ? 'Submitted At'
                              : field.charAt(0).toUpperCase() + field.slice(1)}
                        </span>
                        <SortIcon field={field} />
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedUsers.map((user, index) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-[var(--main-blue)]">
                      #{(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                      <div className="text-sm text-gray-500">{user.phoneNumber}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">{user.email}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
                      {formatLivestockUserRole(user.role)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">{getStatusBadge(user.status)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setSelectedUser(user)}>
                          View
                        </Button>
                        {user.role === VETERINARY_ROLE && user.status === 'ACTIVE' && (
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
                              onClick={() => {
                                setUserToDeactivate(user._id);
                                setIsDeactivating(true);
                              }}
                            >
                              Deactivate
                            </Button>
                          </>
                        )}
                        {(user.status === 'PENDING' || user.status === 'SENT_FOR_ACTION') &&
                          user.role === VETERINARY_ROLE && (
                            <Button variant="primary" onClick={() => setSelectedUser(user)}>
                              Review
                            </Button>
                          )}
                        {user.status === 'DEACTIVATED' && user.role === VETERINARY_ROLE && (
                          <Button variant="primary" onClick={() => handleStatusChange(user._id, 'ACTIVE')}>
                            Activate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-gray-200 p-4">
              <p className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
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
        fixedRole={VETERINARY_ROLE}
        title="Create Veterinarian"
        submitLabel="Create Veterinarian"
      />

      {selectedUser && !isEditingUser && (
        <UserViewModal
          user={selectedUser as Parameters<typeof UserViewModal>[0]['user']}
          onClose={() => setSelectedUser(null)}
          onStatusChange={(status, reason) =>
            handleStatusChange(selectedUser._id, status as LivestockUser['status'], reason)
          }
          isLoading={isLoading}
          setViewingDocument={setViewingDocument}
        />
      )}

      {selectedUser && isEditingUser && (
        <UserEditModal
          user={selectedUser as Parameters<typeof UserEditModal>[0]['user']}
          onClose={() => {
            setIsEditingUser(false);
            setSelectedUser(null);
          }}
          onSave={(user) => handleEditUser(user as LivestockUser)}
          isLoading={isLoading}
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
        onClose={() => {
          setIsDeactivating(false);
          setUserToDeactivate(null);
        }}
        onConfirm={confirmDeactivation}
        isLoading={isLoading}
      />

      <ToastContainer />
    </div>
  );
}
