// app/admin/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { validateForm, ValidationRules, validationPatterns } from '@/components/ui/form-validation';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent';
  phone: string;
  status: 'active' | 'inactive' | 'pending';
  commissionRate?: number;
  totalClients?: number;
  totalCommission?: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { showToast, ToastContainer } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const itemsPerPage = 10;

  // Form state for creating/editing users
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'agent' as 'admin' | 'agent',
    commissionRate: '5',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Validation rules
  const validationRules: ValidationRules = {
    name: { required: true, minLength: 3 },
    email: { required: true, pattern: validationPatterns.email },
    phone: { required: true, pattern: validationPatterns.phone },
    commissionRate: { 
      required: formData.role === 'agent',
      validate: (value) => {
        const num = parseFloat(value);
        return (num >= 1 && num <= 20) || 'Commission must be between 1% and 20%';
      }
    },
  };

  // Mock data for demo
  useEffect(() => {
    setTimeout(() => {
      const mockUsers: User[] = [
        {
          id: 'AD001',
          name: 'Admin User',
          email: 'admin@insurancerm.com',
          role: 'admin',
          phone: '+250788123456',
          status: 'active',
          createdAt: '2025-01-15',
        },
        {
          id: 'AG001',
          name: 'John Agent',
          email: 'john.agent@insurancerm.com',
          role: 'agent',
          phone: '+250788123457',
          status: 'active',
          commissionRate: 5,
          totalClients: 12,
          totalCommission: '75,000 RWF',
          createdAt: '2025-02-20',
        },
        {
          id: 'AG002',
          name: 'Jane Agent',
          email: 'jane.agent@insurancerm.com',
          role: 'agent',
          phone: '+250788123458',
          status: 'active',
          commissionRate: 7,
          totalClients: 8,
          totalCommission: '42,000 RWF',
          createdAt: '2025-03-10',
        },
        {
          id: 'AG003',
          name: 'New Agent',
          email: 'new.agent@insurancerm.com',
          role: 'agent',
          phone: '+250788123459',
          status: 'pending',
          commissionRate: 5,
          totalClients: 0,
          totalCommission: '0 RWF',
          createdAt: '2025-05-01',
        },
      ];
      setUsers(mockUsers);
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery)
  );

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  const handleCreateUser = () => {
    const formErrors = validateForm(formData, validationRules);
    setErrors(formErrors);

    if (Object.keys(formErrors).length === 0) {
      setIsLoading(true);
      
      // In a real app, this would be an API call
      setTimeout(() => {
        const newUser: User = {
          id: `AG${Math.floor(1000 + Math.random() * 9000)}`,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          status: 'pending',
          commissionRate: formData.role === 'agent' ? parseFloat(formData.commissionRate) : undefined,
          totalClients: 0,
          totalCommission: '0 RWF',
          createdAt: new Date().toISOString().split('T')[0],
        };

        setUsers(prev => [...prev, newUser]);
        showToast('User created successfully!', 'success');
        setIsCreatingUser(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          role: 'agent',
          commissionRate: '5',
        });
        setIsLoading(false);
      }, 1000);
    } else {
      showToast('Please correct the form errors', 'error');
    }
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    
    const formErrors = validateForm(formData, validationRules);
    setErrors(formErrors);

    if (Object.keys(formErrors).length === 0) {
      setIsLoading(true);
      
      // In a real app, this would be an API call
      setTimeout(() => {
        const updatedUsers = users.map(user => {
          if (user.id === selectedUser.id) {
            return {
              ...user,
              name: formData.name,
              phone: formData.phone,
              commissionRate: formData.role === 'agent' ? parseFloat(formData.commissionRate) : undefined,
            };
          }
          return user;
        });

        setUsers(updatedUsers);
        showToast('User updated successfully!', 'success');
        setSelectedUser(null);
        setIsEditing(false);
        setIsLoading(false);
      }, 1000);
    } else {
      showToast('Please correct the form errors', 'error');
    }
  };

  const handleStatusChange = (userId: string, status: 'active' | 'inactive' | 'pending') => {
    setIsLoading(true);
    
    // In a real app, this would be an API call
    setTimeout(() => {
      const updatedUsers = users.map(user => {
        if (user.id === userId) {
          return { ...user, status };
        }
        return user;
      });

      setUsers(updatedUsers);
      showToast(`User status updated to ${status}`, 'success');
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

  const Pagination = () => {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    
    return (
      <div className="flex items-center justify-between mt-6">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
            </span>{' '}
            of <span className="font-medium">{filteredUsers.length}</span> users
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">Active</span>;
      case 'inactive':
        return <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">Inactive</span>;
      case 'pending':
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
            <div>
              <Button
                variant="primary"
                onClick={() => {
                  setIsCreatingUser(true);
                  setSelectedUser(null);
                  setIsEditing(false);
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
              <p className="mt-4 text-gray-600">No users found</p>
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
                        {user.role === 'agent' && user.commissionRate && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({user.commissionRate}% commission)
                          </span>
                        )}
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
                              setIsEditing(true);
                              setIsCreatingUser(false);
                              setFormData({
                                name: user.name,
                                email: user.email,
                                phone: user.phone,
                                role: user.role,
                                commissionRate: user.commissionRate?.toString() || '5',
                              });
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination />
            </div>
          )}
        </div>

        {/* Create User Modal */}
        {isCreatingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Create New User</h3>
              <div className="space-y-4">
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
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Role <span className="text-[var(--error-red)]">*</span>
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
                  <Input
                    label="Commission Rate (%)"
                    name="commissionRate"
                    type="number"
                    value={formData.commissionRate}
                    onChange={handleInputChange}
                    error={errors.commissionRate}
                    required
                    min="1"
                    max="20"
                  />
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

        {/* Edit User Modal */}
        {isEditing && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Edit User</h3>
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  error={errors.name}
                  required
                />
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
                <Input
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  error={errors.phone}
                  required
                />
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <p className="text-sm text-gray-600 capitalize">{selectedUser.role}</p>
                </div>
                {selectedUser.role === 'agent' && (
                  <>
                    <Input
                      label="Commission Rate (%)"
                      name="commissionRate"
                      type="number"
                      value={formData.commissionRate}
                      onChange={handleInputChange}
                      error={errors.commissionRate}
                      required
                      min="1"
                      max="20"
                    />
                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant={selectedUser.status === 'active' ? 'primary' : 'outline'}
                          onClick={() => handleStatusChange(selectedUser.id, 'active')}
                        >
                          Active
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedUser.status === 'inactive' ? 'danger' : 'outline'}
                          onClick={() => handleStatusChange(selectedUser.id, 'inactive')}
                        >
                          Inactive
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedUser.status === 'pending' ? 'secondary' : 'outline'}
                          onClick={() => handleStatusChange(selectedUser.id, 'pending')}
                        >
                          Pending
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="text"
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedUser(null);
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateUser}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Updating...' : 'Update User'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ToastContainer />
      </div>
    </MainLayout>
  );
}