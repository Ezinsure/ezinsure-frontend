'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { UserCreateModal } from '@/components/ui/admin/user-create-modal';
import { UserViewModal } from '@/components/ui/admin/user-view-modal';
import { UserEditModal } from '@/components/ui/admin/user-edit-modal';
import { useAuth } from '@/context/AuthContext';

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

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function AdminUsersPage() {
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
  const [rejectionReason, setRejectionReason] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'ADMIN' | 'AGENT'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | User['status']>('all');
  const { token } = useAuth();
  const itemsPerPage = 10;
  

  // Form state for creating users
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    address: '',
    role: 'AGENT' as 'ADMIN' | 'AGENT',
    emergencyContact1Name: '',
    emergencyContact1PhoneNumber: '',
    emergencyContact1Relationship: '',
    emergencyContact2Name: '',
    emergencyContact2PhoneNumber: '',
    emergencyContact2Relationship: '',
    nationalIdDocument: null as File | null,
    criminalRecordCertificate: null as File | null,
    passportPhoto: null as File | null,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users`, {
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
        // console.log("all users: ", data)
        setUsers(data.data);
      } catch (error) {
        console.error('Error fetching users:', error);
        showToast('Failed to load users', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phoneNumber.includes(searchQuery);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCreateUser = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call
      console.log('Creating user with data:', formData);
      
      // Mock response
      const newUser: User = {
        _id: `AG${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        status: formData.role === 'ADMIN' ? 'ACTIVE' : 'PENDING',
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        passportPhoto: formData.passportPhoto?.name ? 'https://example.com/' + formData.passportPhoto.name : undefined,
        nationalIdDocument: formData.nationalIdDocument?.name ? 'https://example.com/' + formData.nationalIdDocument.name : undefined,
        criminalRecordCertificate: formData.criminalRecordCertificate?.name ? 'https://example.com/' + formData.criminalRecordCertificate.name : undefined,
        emergencyContacts: [
          {
            fullName: formData.emergencyContact1Name,
            phoneNumber: formData.emergencyContact1PhoneNumber,
            relationship: formData.emergencyContact1Relationship,
            _id: Math.random().toString(36).substring(2, 9)
          },
          {
            fullName: formData.emergencyContact2Name,
            phoneNumber: formData.emergencyContact2PhoneNumber,
            relationship: formData.emergencyContact2Relationship,
            _id: Math.random().toString(36).substring(2, 9)
          }
        ],
        createdAt: new Date().toISOString(),
        agentCode: `AG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        commissionRate: '5%'
      };

      setUsers(prev => [...prev, newUser]);
      showToast('User created successfully!', 'success');
      setIsCreatingUser(false);
      setFormData({
        fullName: '',
        email: '',
        phoneNumber: '',
        dateOfBirth: '',
        address: '',
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
      });
    } catch (error) {
      console.error('Error creating user:', error);
      showToast('Failed to create user', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, status: User['status'], reason?: string) => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call
      console.log(`Updating user ${userId} status to ${status} with reason: ${reason}`);
      
      const updatedUsers = users.map(user => {
        if (user._id === userId) {
          return { 
            ...user, 
            status,
            ...(reason && { rejectionReason: reason })
          };
        }
        return user;
      });

      setUsers(updatedUsers);
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
    if (confirm('Are you sure you want to delete this user?')) {
      setIsLoading(true);
      try {
        // In a real app, this would be an API call
        console.log('Deleting user:', userId);
        
        setUsers(prev => prev.filter(user => user._id !== userId));
        showToast('User deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Failed to delete user', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEditUser = async (updatedUser: User) => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call
      console.log('Updating user:', updatedUser);
      
      const updatedUsers = users.map(user => 
        user._id === updatedUser._id ? updatedUser : user
      );
      
      setUsers(updatedUsers);
      showToast('User updated successfully', 'success');
      setIsEditingUser(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Failed to update user', 'error');
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
              <span className="font-medium">{Math.min(currentPage * 10, filteredUsers.length)}</span> of{' '}
              <span className="font-medium">{filteredUsers.length}</span> results
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

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-8">
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <div className="mb-8 mt-16">
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-gray-600">Manage all system users and agents</p>
        </div>

        {/* Search and actions */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="w-full md:w-1/3">
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
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | 'ADMIN' | 'AGENT')}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                >
                  <option value="all">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="AGENT">Agent</option>
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

        {/* Users table */}
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
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
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
                        #{user._id}
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
                        {user.role.toLowerCase()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setRejectionReason(user.rejectionReason || '');
                              console.log(rejectionReason)
                            }}
                          >
                            View
                          </Button>
                          {user.status === 'ACTIVE' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsEditingUser(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleDeleteUser(user._id)}
                              >
                                Deactivate
                              </Button>
                            </>
                          )}
                          {(user.status === 'PENDING' || user.status === 'SENT_FOR_ACTION') && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setSelectedUser(user);
                                setRejectionReason('');
                              }}
                            >
                              Review
                            </Button>
                          )}
                          {user.status === 'DEACTIVATED' && (
                            <Button
                              size="sm"
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

        {/* Create User Modal */}
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

        {/* View User Modal */}
       {selectedUser && !isEditingUser && (
  <UserViewModal
    user={selectedUser}
    onClose={() => setSelectedUser(null)}
    onStatusChange={(status, reason) => handleStatusChange(selectedUser._id, status as User['status'], reason)}
    isLoading={isLoading}
    setViewingDocument={setViewingDocument}
  />
)}

        {/* Edit User Modal */}
        {selectedUser && isEditingUser && (
          <UserEditModal
            user={selectedUser}
            onClose={() => {
              setIsEditingUser(false);
              setSelectedUser(null);
            }}
            onSave={handleEditUser}
            isLoading={isLoading}
          />
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
      </div>
    </MainLayout>
  );
}