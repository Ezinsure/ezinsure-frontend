'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

interface Application {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  insuranceType: string;
  status: string;
  dateSubmitted: string;
  documents: {
    nationalId: string;
    yellowCard: string;
    additionalDocument?: string;
  };
  payment?: {
    invoiceId?: string;
    amount?: string;
    proof?: string;
    date?: string;
  };
  insuranceId?: string;
}

export default function TrackApplicationPage() {
  const { showToast, ToastContainer } = useToast();
  const [applicationId, setApplicationId] = useState('');
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

  // Mock function to simulate API call
  const fetchApplication = async (id: string) => {
    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - in a real app, this would be an API call
      const mockApplications: Record<string, Application> = {
        '001': {
          id: '001',
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '+250782123456',
          insuranceType: 'car',
          status: 'invoice_sent',
          dateSubmitted: '2025-05-01',
          documents: {
            nationalId: 'ID_001.pdf',
            yellowCard: 'YC_001.pdf',
          },
          payment: {
            invoiceId: 'INV_001',
            amount: '50,000 RWF',
          },
        },
        '002': {
          id: '002',
          fullName: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+250782123457',
          insuranceType: 'motorbike',
          status: 'payment_verified',
          dateSubmitted: '2025-05-02',
          documents: {
            nationalId: 'ID_002.pdf',
            yellowCard: 'YC_002.pdf',
            additionalDocument: 'ADD_002.pdf',
          },
          payment: {
            invoiceId: 'INV_002',
            amount: '25,000 RWF',
            proof: 'PAY_002.pdf',
            date: '2025-05-03',
          },
        },
        '003': {
          id: '003',
          fullName: 'Robert Katz',
          email: 'robert@example.com',
          phone: '+250782123458',
          insuranceType: 'building',
          status: 'insurance_issued',
          dateSubmitted: '2025-05-03',
          documents: {
            nationalId: 'ID_003.pdf',
            yellowCard: 'YC_003.pdf',
          },
          payment: {
            invoiceId: 'INV_003',
            amount: '120,000 RWF',
            proof: 'PAY_003.pdf',
            date: '2025-05-04',
          },
          insuranceId: 'INS_001',
        },
      };

      const foundApp = mockApplications[id];
      if (foundApp) {
        setApplication(foundApp);
        showToast('Application found!', 'success');
      } else {
        showToast('No application found with that ID', 'error');
      }
    } catch (error) {
      showToast('Error fetching application', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitPayment = () => {
    if (!paymentProof) {
      showToast('Please upload payment proof', 'error');
      return;
    }

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      if (application) {
        setApplication({
          ...application,
          status: 'payment_submitted',
          payment: {
            ...application.payment,
            proof: paymentProof.name,
            date: new Date().toISOString().split('T')[0],
          },
        });
        showToast('Payment proof submitted successfully!', 'success');
        setPaymentProof(null);
      }
      setIsLoading(false);
    }, 1500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Pending Review</span>;
      case 'approved':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Approved</span>;
      case 'invoice_sent':
        return <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">Invoice Sent</span>;
      case 'payment_submitted':
        return <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">Payment Submitted</span>;
      case 'payment_verified':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Payment Verified</span>;
      case 'insurance_issued':
        return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">Insurance Issued</span>;
      case 'rejected':
        return <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">Rejected</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">Unknown</span>;
    }
  };

  const getStatusActions = (status: string) => {
    switch (status) {
      case 'invoice_sent':
        return (
          <div className="mt-6 bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-[var(--main-blue)] mb-2">Payment Required</h4>
            <p className="text-sm text-gray-600 mb-4">
              Please submit proof of payment to proceed with your application.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Upload Payment Proof</label>
                <input
                  type="file"
                  onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-[var(--main-blue)] file:text-white
                    hover:file:bg-[var(--secondary-blue)]
                  "
                />
                {paymentProof && (
                  <p className="mt-2 text-sm text-gray-600">Selected: {paymentProof.name}</p>
                )}
              </div>
              <Button
                onClick={handleSubmitPayment}
                disabled={!paymentProof || isLoading}
                className="w-full"
              >
                {isLoading ? 'Submitting...' : 'Submit Payment Proof'}
              </Button>
            </div>
          </div>
        );
      case 'payment_submitted':
        return (
          <div className="mt-6 bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium text-purple-700 mb-2">Payment Under Review</h4>
            <p className="text-sm text-gray-600">
              Your payment proof has been submitted and is being reviewed. You'll be notified once verified.
            </p>
          </div>
        );
      case 'insurance_issued':
        return (
          <div className="mt-6 bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-700 mb-2">Insurance Issued</h4>
            <p className="text-sm text-gray-600 mb-4">
              Your insurance certificate has been issued. You can download it below.
            </p>
            <Button variant="secondary" className="w-full">
              Download Insurance Certificate
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
         <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0  bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-2">Track Your Application</h1>
            <p className="text-gray-600">
              Enter your application ID to view the status and details of your insurance application
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-grow">
                <Input
                  label="Application ID"
                  name="applicationId"
                  placeholder="Enter your application ID (e.g., 001)"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => fetchApplication(applicationId)}
                  disabled={!applicationId || isLoading}
                  className="w-full md:w-auto"
                >
                  {isLoading ? 'Searching...' : 'Track Application'}
                </Button>
              </div>
            </div>
          </div>

          {application && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden fade-in">
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Application #{application.id}</h2>
                    <p className="text-gray-600">Submitted on {application.dateSubmitted}</p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    {getStatusBadge(application.status)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Applicant Information</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-500">Full Name</p>
                        <p className="font-medium">{application.fullName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{application.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{application.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Insurance Type</p>
                        <p className="font-medium capitalize">{application.insuranceType.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Documents</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-white p-3 rounded border">
                        <div>
                          <p className="text-sm font-medium">National ID</p>
                          <p className="text-xs text-gray-500">{application.documents.nationalId}</p>
                        </div>
                        <Button variant="text" size="sm">
                          View
                        </Button>
                      </div>
                      <div className="flex items-center justify-between bg-white p-3 rounded border">
                        <div>
                          <p className="text-sm font-medium">Yellow Card</p>
                          <p className="text-xs text-gray-500">{application.documents.yellowCard}</p>
                        </div>
                        <Button variant="text" size="sm">
                          View
                        </Button>
                      </div>
                      {application.documents.additionalDocument && (
                        <div className="flex items-center justify-between bg-white p-3 rounded border">
                          <div>
                            <p className="text-sm font-medium">Additional Document</p>
                            <p className="text-xs text-gray-500">{application.documents.additionalDocument}</p>
                          </div>
                          <Button variant="text" size="sm">
                            View
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {application.payment && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h3 className="font-medium text-gray-900 mb-3">Payment Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Invoice ID</p>
                        <p className="font-medium">{application.payment.invoiceId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Amount</p>
                        <p className="font-medium">{application.payment.amount}</p>
                      </div>
                      {application.payment.proof && (
                        <div>
                          <p className="text-sm text-gray-500">Payment Proof</p>
                          <p className="font-medium">{application.payment.proof}</p>
                        </div>
                      )}
                      {application.payment.date && (
                        <div>
                          <p className="text-sm text-gray-500">Payment Date</p>
                          <p className="font-medium">{application.payment.date}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {application.insuranceId && (
                  <div className="bg-green-50 p-4 rounded-lg mb-6">
                    <h3 className="font-medium text-green-700 mb-3">Insurance Certificate</h3>
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Your insurance certificate has been issued.</p>
                        <p className="text-sm font-medium mt-1">Certificate ID: {application.insuranceId}</p>
                      </div>
                      <Button variant="secondary" className="mt-4 md:mt-0">
                        Download Certificate
                      </Button>
                    </div>
                  </div>
                )}

                {getStatusActions(application.status)}
              </div>
            </div>
          )}
        </div>
      </div>
      <ToastContainer />
    </MainLayout>
  );
}