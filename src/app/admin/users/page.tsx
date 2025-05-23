
'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { validateForm, ValidationRules, validationPatterns } from '@/components/ui/form-validation';
import { DocumentViewer } from '@/components/ui/document-viewer';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'agent';
  status: 'active' | 'deactivated' | 'sent_for_action' | 'new_application';
  dateOfBirth: string;
  currentAddress: string;
  documents: {
    nationalId: string;
    criminalRecord: string;
    passportPhoto: string;
  };
  emergencyContacts: {
    name: string;
    phone: string;
    relationship: string;
  }[];
  createdAt: string;
  rejectionReason?: string;
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
  const [viewingDocument, setViewingDocument] = useState<{
    name: string;
    path: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'agent'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | User['status']>('all');
  const itemsPerPage = 10;

  // Form state for creating users
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    currentAddress: '',
    role: 'agent' as 'admin' | 'agent',
    emergencyContact1Name: '',
    emergencyContact1Phone: '',
    emergencyContact1Relationship: '',
    emergencyContact2Name: '',
    emergencyContact2Phone: '',
    emergencyContact2Relationship: '',
    nationalId: null as File | null,
    criminalRecord: null as File | null,
    passportPhoto: null as File | null,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Validation rules
  const validationRules: ValidationRules = {
    name: { required: true, minLength: 3 },
    email: { required: true, pattern: validationPatterns.email },
    phone: { required: true, pattern: validationPatterns.phone },
    dateOfBirth: { required: true },
    currentAddress: { required: true, minLength: 10 },
    emergencyContact1Name: { required: true, minLength: 2 },
    emergencyContact1Phone: { required: true, pattern: validationPatterns.phone },
    emergencyContact1Relationship: { required: true },
    emergencyContact2Name: { required: true, minLength: 2 },
    emergencyContact2Phone: { required: true, pattern: validationPatterns.phone },
    emergencyContact2Relationship: { required: true },
  };

  // Mock data for demo
  useEffect(() => {
    setTimeout(() => {
      const mockUsers: User[] = [
        {
          id: 'AD001',
          name: 'Admin User',
          email: 'admin@insurancerm.com',
          phone: '+250788123456',
          role: 'admin',
          status: 'active',
          dateOfBirth: '1985-01-15',
          currentAddress: '123 Admin Street, Kigali',
          documents: {
            nationalId: 'admin_id.pdf',
            criminalRecord: 'admin_criminal.pdf',
            passportPhoto: 'admin_photo.jpg',
          },
          emergencyContacts: [
            {
              name: 'Jane Admin',
              phone: '+250788123457',
              relationship: 'spouse',
            },
            {
              name: 'John Support',
              phone: '+250788123458',
              relationship: 'friend',
            },
          ],
          createdAt: '2025-01-15',
        },
        {
          id: 'AG001',
          name: 'John Agent',
          email: 'john.agent@insurancerm.com',
          phone: '+250788123457',
          role: 'agent',
          status: 'active',
          dateOfBirth: '1990-05-20',
          currentAddress: '456 Agent Avenue, Kigali',
          documents: {
            nationalId: 'john_id.pdf',
            criminalRecord: 'john_criminal.pdf',
            passportPhoto: 'john_photo.jpg',
          },
          emergencyContacts: [
            {
              name: 'Mary Wife',
              phone: '+250788123459',
              relationship: 'spouse',
            },
            {
              name: 'Peter Brother',
              phone: '+250788123460',
              relationship: 'sibling',
            },
          ],
          createdAt: '2025-02-20',
        },
        {
          id: 'AG002',
          name: 'Jane Agent',
          email: 'jane.agent@insurancerm.com',
          phone: '+250788123458',
          role: 'agent',
          status: 'deactivated',
          dateOfBirth: '1988-03-10',
          currentAddress: '789 Business Road, Kigali',
          documents: {
            nationalId: 'jane_id.pdf',
            criminalRecord: 'jane_criminal.pdf',
            passportPhoto: 'jane_photo.jpg',
          },
          emergencyContacts: [
            {
              name: 'Mark Husband',
              phone: '+250788123461',
              relationship: 'spouse',
            },
            {
              name: 'Sarah Sister',
              phone: '+250788123462',
              relationship: 'sibling',
            },
          ],
          createdAt: '2025-03-10',
        },
        {
          id: 'AG003',
          name: 'New Agent',
          email: 'new.agent@insurancerm.com',
          phone: '+250788123459',
          role: 'agent',
          status: 'new_application',
          dateOfBirth: '1995-05-01',
          currentAddress: '321 New Street, Kigali',
          documents: {
            nationalId: 'new_id.pdf',
            criminalRecord: 'new_criminal.pdf',
            passportPhoto: 'new_photo.jpg',
          },
          emergencyContacts: [
            {
              name: 'Alice Friend',
              phone: '+250788123463',
              relationship: 'friend',
            },
            {
              name: 'Bob Colleague',
              phone: '+250788123464',
              relationship: 'other',
            },
          ],
          createdAt: '2025-05-01',
        },
        {
          id: 'AG004',
          name: 'Problem Agent',
          email: 'problem.agent@insurancerm.com',
          phone: '+250788123465',
          role: 'agent',
          status: 'sent_for_action',
          dateOfBirth: '1992-07-15',
          currentAddress: '654 Issue Road, Kigali',
          documents: {
            nationalId: 'problem_id.pdf',
            criminalRecord: 'problem_criminal.pdf',
            passportPhoto: 'problem_photo.jpg',
          },
          emergencyContacts: [
            {
              name: 'Tom Brother',
              phone: '+250788123466',
              relationship: 'sibling',
            },
            {
              name: 'Lisa Sister',
              phone: '+250788123467',
              relationship: 'sibling',
            },
          ],
          createdAt: '2025-04-15',
          rejectionReason: 'Missing criminal record document and passport photo is unclear',
        },
      ];
      setUsers(mockUsers);
      setIsLoading(false);
    }, 500);
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery) &&
      (roleFilter === 'all' || user.role === roleFilter) &&
      (statusFilter === 'all' || user.status === statusFilter)
  ));

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof typeof formData) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, [fieldName]: file }));
    
    // Clear error when file is selected
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateFiles = () => {
    const fileErrors: { [key: string]: string } = {};

    if (formData.role === 'agent') {
      if (!formData.nationalId) {
        fileErrors.nationalId = 'National ID document is required';
      }
      if (!formData.criminalRecord) {
        fileErrors.criminalRecord = 'Criminal record document is required';
      }
      if (!formData.passportPhoto) {
        fileErrors.passportPhoto = 'Passport photo is required';
      }

      // Validate file types and sizes
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const allowedDocTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      const maxFileSize = 5 * 1024 * 1024; // 5MB

      if (formData.nationalId) {
        if (!allowedDocTypes.includes(formData.nationalId.type)) {
          fileErrors.nationalId = 'National ID must be PDF, JPEG, or PNG';
        } else if (formData.nationalId.size > maxFileSize) {
          fileErrors.nationalId = 'National ID file size must be less than 5MB';
        }
      }

      if (formData.criminalRecord) {
        if (!allowedDocTypes.includes(formData.criminalRecord.type)) {
          fileErrors.criminalRecord = 'Criminal record must be PDF, JPEG, or PNG';
        } else if (formData.criminalRecord.size > maxFileSize) {
          fileErrors.criminalRecord = 'Criminal record file size must be less than 5MB';
        }
      }

      if (formData.passportPhoto) {
        if (!allowedImageTypes.includes(formData.passportPhoto.type)) {
          fileErrors.passportPhoto = 'Passport photo must be JPEG or PNG';
        } else if (formData.passportPhoto.size > maxFileSize) {
          fileErrors.passportPhoto = 'Passport photo file size must be less than 5MB';
        }
      }
    }

    return fileErrors;
  };

  const handleCreateUser = () => {
    const formErrors = validateForm(formData, validationRules);
    const fileErrors = validateFiles();
    const allErrors = { ...formErrors, ...fileErrors };
    setErrors(allErrors);

    if (Object.keys(allErrors).length === 0) {
      setIsLoading(true);
      
      // In a real app, this would be an API call
      setTimeout(() => {
        const newUser: User = {
          id: `AG${Math.floor(1000 + Math.random() * 9000)}`,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          status: formData.role === 'admin' ? 'active' : 'new_application',
          dateOfBirth: formData.dateOfBirth,
          currentAddress: formData.currentAddress,
          documents: {
            nationalId: formData.nationalId?.name || 'uploaded_id.pdf',
            criminalRecord: formData.criminalRecord?.name || 'uploaded_criminal.pdf',
            passportPhoto: formData.passportPhoto?.name || 'uploaded_photo.jpg',
          },
          emergencyContacts: [
            {
              name: formData.emergencyContact1Name,
              phone: formData.emergencyContact1Phone,
              relationship: formData.emergencyContact1Relationship,
            },
            {
              name: formData.emergencyContact2Name,
              phone: formData.emergencyContact2Phone,
              relationship: formData.emergencyContact2Relationship,
            },
          ],
          createdAt: new Date().toISOString().split('T')[0],
        };

        setUsers(prev => [...prev, newUser]);
        showToast('User created successfully!', 'success');
        setIsCreatingUser(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          dateOfBirth: '',
          currentAddress: '',
          role: 'agent',
          emergencyContact1Name: '',
          emergencyContact1Phone: '',
          emergencyContact1Relationship: '',
          emergencyContact2Name: '',
          emergencyContact2Phone: '',
          emergencyContact2Relationship: '',
          nationalId: null,
          criminalRecord: null,
          passportPhoto: null,
        });
        setIsLoading(false);
      }, 1000);
    } else {
      showToast('Please correct the form errors', 'error');
    }
  };

  const handleStatusChange = (userId: string, status: User['status'], reason?: string) => {
    setIsLoading(true);
    
    // In a real app, this would be an API call
    setTimeout(() => {
      const updatedUsers = users.map(user => {
        if (user.id === userId) {
          return { 
            ...user, 
            status,
            ...(reason && { rejectionReason: reason })
          };
        }
        return user;
      });

      setUsers(updatedUsers);
      showToast(`User status updated to ${status.replace('_', ' ')}`, 'success');
      setSelectedUser(null);
      setIsLoading(false);
    }, 500);
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setIsLoading(true);
      
      // In a real app, this would be an API call
      setTimeout(() => {
        setUsers(prev => prev.filter(user => user.id !== userId));
        showToast('User deleted successfully', 'success');
        setIsLoading(false);
      }, 500);
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
              <span className="font-medium">{Math.min(currentPage * 10, paginatedUsers.length)}</span> of{' '}
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
      case 'active':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">Active</span>;
      case 'deactivated':
        return <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">Deactivated</span>;
      case 'sent_for_action':
        return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">Sent for Action</span>;
      case 'new_application':
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">New Application</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">Unknown</span>;
    }
  };

  const FileUploadField = ({ 
    label, 
    name, 
    accept, 
    error, 
    file, 
    description 
  }: { 
    label: string; 
    name: keyof typeof formData; 
    accept: string; 
    error?: string; 
    file: File | null; 
    description: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-[var(--main-blue)] transition-colors">
        <div className="space-y-1 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex text-sm text-gray-600">
            <label className="relative cursor-pointer bg-white rounded-md font-medium text-[var(--main-blue)] hover:text-[var(--secondary-blue)] focus-within:outline-none">
              <span>Upload a file</span>
              <input
                type="file"
                className="sr-only"
                accept={accept}
                onChange={(e) => handleFileChange(e, name)}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">{description}</p>
          {file && (
            <p className="text-xs text-green-600 font-medium mt-2">
              Selected: {file.name}
            </p>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );

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
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'agent')}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="agent">Agent</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | User['status'])}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="new_application">New Application</option>
                  <option value="sent_for_action">Sent for Action</option>
                  <option value="deactivated">Deactivated</option>
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
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-[var(--main-blue)]">
                        #{user.id}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500">{user.phone}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {user.role}
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
                            }}
                          >
                            View
                          </Button>
                          {user.status === 'active' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setFormData({
                                    name: user.name,
                                    email: user.email,
                                    phone: user.phone,
                                    dateOfBirth: user.dateOfBirth,
                                    currentAddress: user.currentAddress,
                                    role: user.role,
                                    emergencyContact1Name: user.emergencyContacts[0]?.name || '',
                                    emergencyContact1Phone: user.emergencyContacts[0]?.phone || '',
                                    emergencyContact1Relationship: user.emergencyContacts[0]?.relationship || '',
                                    emergencyContact2Name: user.emergencyContacts[1]?.name || '',
                                    emergencyContact2Phone: user.emergencyContacts[1]?.phone || '',
                                    emergencyContact2Relationship: user.emergencyContacts[1]?.relationship || '',
                                    nationalId: null,
                                    criminalRecord: null,
                                    passportPhoto: null,
                                  });
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  handleDeleteUser(user.id)
                                  handleStatusChange(user.id, 'deactivated')}}
                              >
                                Deactivate
                              </Button>
                            </>
                          )}
                          {user.status === 'new_application' && (
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
                          {user.status === 'sent_for_action' && (
                            <>
                              {/* <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                }}
                              >
                                View
                              </Button> */}
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleStatusChange(user.id, 'active')}
                              >
                                Approve
                              </Button>
                            </>
                          )}
                          {user.status === 'deactivated' && (
                            <>
                              {/* <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                }}
                              >
                                View
                              </Button> */}
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleStatusChange(user.id, 'active')}
                              >
                                Activate
                              </Button>
                            </>
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
        {isCreatingUser && (
          <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
            <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
              <h3 className="text-lg font-semibold mb-4">Create New User</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    error={errors.name}
                    required
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={errors.email}
                    required
                  />
                  <Input
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    error={errors.phone}
                    required
                  />
                  <Input
                    label="Date of Birth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    error={errors.dateOfBirth}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Current Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="currentAddress"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                    placeholder="Enter complete current address"
                    value={formData.currentAddress}
                    onChange={handleInputChange}
                  />
                  {errors.currentAddress && (
                    <p className="mt-2 text-sm text-red-600">{errors.currentAddress}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                  >
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {formData.role === 'agent' && (
                  <>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">Required Documents</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <FileUploadField
                          label="National ID"
                          name="nationalId"
                          accept=".pdf,.jpg,.jpeg,.png"
                          error={errors.nationalId}
                          file={formData.nationalId}
                          description="PDF, JPEG, or PNG up to 5MB"
                        />
                        <FileUploadField
                          label="Criminal Record Certificate"
                          name="criminalRecord"
                          accept=".pdf,.jpg,.jpeg,.png"
                          error={errors.criminalRecord}
                          file={formData.criminalRecord}
                          description="PDF, JPEG, or PNG up to 5MB"
                        />
                      </div>
                      <div className="mt-6">
                        <FileUploadField
                          label="Recent Passport Photo"
                          name="passportPhoto"
                          accept=".jpg,.jpeg,.png"
                          error={errors.passportPhoto}
                          file={formData.passportPhoto}
                          description="JPEG or PNG up to 5MB"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">Emergency Contacts</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <Input
                          label="Full Name"
                          name="emergencyContact1Name"
                          placeholder="Contact name"
                          value={formData.emergencyContact1Name}
                          onChange={handleInputChange}
                          error={errors.emergencyContact1Name}
                          required
                        />
                        <Input
                          label="Phone Number"
                          type="tel"
                          name="emergencyContact1Phone"
                          placeholder="+250 7XX XXX XXX"
                          value={formData.emergencyContact1Phone}
                          onChange={handleInputChange}
                          error={errors.emergencyContact1Phone}
                          required
                        />
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Relationship <span className="text-red-500">*</span>
                          </label>
                          <select
                            name="emergencyContact1Relationship"
                            value={formData.emergencyContact1Relationship}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                          >
                            <option value="">Select relationship</option>
                            <option value="parent">Parent</option>
                            <option value="sibling">Sibling</option>
                            <option value="spouse">Spouse</option>
                            <option value="friend">Friend</option>
                            <option value="other">Other</option>
                          </select>
                          {errors.emergencyContact1Relationship && (
                            <p className="mt-2 text-sm text-red-600">{errors.emergencyContact1Relationship}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="Full Name"
                          name="emergencyContact2Name"
                          placeholder="Contact name"
                          value={formData.emergencyContact2Name}
                          onChange={handleInputChange}
                          error={errors.emergencyContact2Name}
                          required
                        />
                        <Input
                          label="Phone Number"
                          type="tel"
                          name="emergencyContact2Phone"
                          placeholder="+250 7XX XXX XXX"
                          value={formData.emergencyContact2Phone}
                          onChange={handleInputChange}
                          error={errors.emergencyContact2Phone}
                          required
                        />
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Relationship <span className="text-red-500">*</span>
                          </label>
                          <select
                            name="emergencyContact2Relationship"
                            value={formData.emergencyContact2Relationship}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)]"
                          >
                            <option value="">Select relationship</option>
                            <option value="parent">Parent</option>
                            <option value="sibling">Sibling</option>
                            <option value="spouse">Spouse</option>
                            <option value="friend">Friend</option>
                            <option value="other">Other</option>
                          </select>
                          {errors.emergencyContact2Relationship && (
                            <p className="mt-2 text-sm text-red-600">{errors.emergencyContact2Relationship}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="text"
                    onClick={() => setIsCreatingUser(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateUser}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View/Review User Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
            <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {selectedUser.status === 'new_application' ? 'Review Application' : 'User Details'}
                </h3>
                <button
                  onClick={() => setSelectedUser(null)}
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
                    <p className="font-semibold">#{selectedUser.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-semibold">{selectedUser.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-semibold">{selectedUser.phone}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="font-semibold capitalize">{selectedUser.role}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="mt-1">
                      {getStatusBadge(selectedUser.status)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <p className="font-semibold">{selectedUser.dateOfBirth}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date Created</p>
                    <p className="font-semibold">{selectedUser.createdAt}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm text-gray-500">Current Address</p>
                <p className="font-semibold">{selectedUser.currentAddress}</p>
              </div>

              {selectedUser.role === 'agent' && (
                <>
                  <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Emergency Contacts</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedUser.emergencyContacts.map((contact, index) => (
                        <div key={index} className="bg-white p-3 rounded border">
                          <p className="font-medium">Contact {index + 1}</p>
                          <p className="text-sm">{contact.name}</p>
                          <p className="text-sm text-gray-600">{contact.phone}</p>
                          <p className="text-sm text-gray-600 capitalize">{contact.relationship}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Documents</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button 
                        className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                        onClick={() => setViewingDocument({
                          name: selectedUser.documents.nationalId,
                          path: '/test_document.pdf'
                        })}
                      >
                        <p className="text-sm font-medium">National ID</p>
                        <p className="text-xs text-gray-500">
                          {selectedUser.documents.nationalId}
                        </p>
                      </button>
                      <button 
                        className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                        onClick={() => setViewingDocument({
                          name: selectedUser.documents.criminalRecord,
                          path: '/test_document.pdf'
                        })}
                      >
                        <p className="text-sm font-medium">Criminal Record</p>
                        <p className="text-xs text-gray-500">
                          {selectedUser.documents.criminalRecord}
                        </p>
                      </button>
                      <button 
                        className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                        onClick={() => setViewingDocument({
                          name: selectedUser.documents.passportPhoto,
                          path: '/test_document.pdf'
                        })}
                      >
                        <p className="text-sm font-medium">Passport Photo</p>
                        <p className="text-xs text-gray-500">
                          {selectedUser.documents.passportPhoto}
                        </p>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {selectedUser.rejectionReason && (
                <div className="mt-6 bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-red-700">Rejection Reason</h4>
                  <p className="text-sm text-red-600">{selectedUser.rejectionReason}</p>
                </div>
              )}

              {selectedUser.status === 'new_application' && (
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
                <Button
                  variant="text"
                  onClick={() => setSelectedUser(null)}
                >
                  Close
                </Button>
                {selectedUser.status === 'new_application' && (
                  <>
                    <Button
                      variant="danger"
                      onClick={() => handleStatusChange(selectedUser.id, 'sent_for_action', rejectionReason)}
                      disabled={isLoading}
                    >
                      Send for Action
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handleStatusChange(selectedUser.id, 'active')}
                      disabled={isLoading}
                    >
                      Approve
                    </Button>
                  </>
                )}
              </div>
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
      </div>
    </MainLayout>
  );
}