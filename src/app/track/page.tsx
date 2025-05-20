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

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otp: string) => void;
  email: string;
  phone: string;
  isLoading: boolean;
}

const OTPModal = ({ isOpen, onClose, onVerify, email, phone, isLoading }: OTPModalProps) => {
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'phone' | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isOtpSent, setIsOtpSent] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOtpSent && timeLeft > 0 && isOpen) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [timeLeft, isOtpSent, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setVerificationMethod(null);
      setOtp(['', '', '', '', '', '']);
      setTimeLeft(300);
      setIsOtpSent(false);
    }
  }, [isOpen]);

  const handleSendOTP = (method: 'email' | 'phone') => {
    setVerificationMethod(method);
    setIsOtpSent(true);
    setTimeLeft(300);
    
    const destination = method === 'email' ? email : phone;
    showToast(`OTP sent to your ${method}: ${destination}`, 'success');
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOTP = () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      showToast('Please enter the complete 6-digit OTP', 'error');
      return;
    }
    onVerify(otpValue);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleResendOTP = () => {
    if (verificationMethod) {
      setTimeLeft(300);
      setOtp(['', '', '', '', '', '']);
      const destination = verificationMethod === 'email' ? email : phone;
      showToast(`New OTP sent to your ${verificationMethod}: ${destination}`, 'success');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Verify Your Identity</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!isOtpSent ? (
            <div className="space-y-4">
              <p className="text-gray-600 text-center mb-6">
                Choose how you&apos;d like to receive your verification code:
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleSendOTP('email')}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Email Verification</p>
                      <p className="text-sm text-gray-500">{email}</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSendOTP('phone')}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">SMS Verification</p>
                      <p className="text-sm text-gray-500">{phone}</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold mb-2">Enter Verification Code</h4>
                <p className="text-gray-600 text-sm mb-2">
                  We&apos;ve sent a 6-digit code to your {verificationMethod}:
                </p>
                <p className="text-sm font-medium text-blue-600">
                  {verificationMethod === 'email' ? email : phone}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center space-x-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-12 text-center text-lg font-bold border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors"
                    />
                  ))}
                </div>

                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-3">
                    Code expires in: <span className="font-mono font-medium text-red-600">{formatTime(timeLeft)}</span>
                  </div>
                  
                  {timeLeft > 0 ? (
                    <button
                      onClick={handleResendOTP}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Resend Code
                    </button>
                  ) : (
                    <div className="text-sm text-red-600">
                      Code expired. Please close and try again.
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleVerifyOTP}
                  disabled={otp.join('').length !== 6 || isLoading || timeLeft === 0}
                  className="w-full"
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </Button>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600 text-center">
                  <strong>For testing:</strong> Use OTP <span className="font-mono bg-gray-200 px-1 rounded">123456</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function TrackApplicationPage() {
  const { showToast, ToastContainer } = useToast();
  const [applicationId, setApplicationId] = useState('');
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [tempApplication, setTempApplication] = useState<Application | null>(null);

  // Mock function to simulate initial application lookup (without details)
  const lookupApplication = async (id: string) => {
    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - just basic info for OTP verification
      const mockApplications: Record<string, Pick<Application, 'id' | 'email' | 'phone'>> = {
        '001': {
          id: '001',
          email: 'john@example.com',
          phone: '+250782123456',
        },
        '002': {
          id: '002',
          email: 'jane@example.com',
          phone: '+250782123457',
        },
        '003': {
          id: '003',
          email: 'robert@example.com',
          phone: '+250782123458',
        },
      };

      const foundApp = mockApplications[id];
      if (foundApp) {
        setTempApplication({
          ...foundApp,
          fullName: '',
          insuranceType: '',
          status: '',
          dateSubmitted: '',
          documents: { nationalId: '', yellowCard: '' }
        });
        setShowOtpModal(true);
      } else {
        showToast('No application found with that ID', 'error');
      }
    } catch (error) {
      console.log(error);
      showToast('Error fetching application', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch full application details after OTP verification
  const fetchFullApplication = async (id: string) => {
    try {
      // Full mock data
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

      return mockApplications[id];
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  const handleOtpVerification = async (otp: string) => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check if OTP is correct (for testing, valid OTP is 123456)
      if (otp === '123456') {
        // Fetch full application details
        const fullApp = await fetchFullApplication(applicationId);
        if (fullApp) {
          setApplication(fullApp);
          setShowOtpModal(false);
          setTempApplication(null);
          showToast('Identity verified successfully!', 'success');
        } else {
          showToast('Error fetching application details', 'error');
        }
      } else {
        showToast('Invalid OTP. Please try again.', 'error');
      }
    } catch (error) {
      console.log(error);
      showToast('Error verifying OTP', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowOtpModal(false);
    setTempApplication(null);
    setApplicationId('');
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
              Your payment proof has been submitted and is being reviewed. You&apos;ll be notified once verified.
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
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
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
                  onClick={() => lookupApplication(applicationId)}
                  disabled={!applicationId || isLoading}
                  className="w-full md:w-auto"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Track'}
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

      <OTPModal
        isOpen={showOtpModal}
        onClose={handleCloseModal}
        onVerify={handleOtpVerification}
        email={tempApplication?.email || ''}
        phone={tempApplication?.phone || ''}
        isLoading={isLoading}
      />

      <ToastContainer />
    </MainLayout>
  );
}