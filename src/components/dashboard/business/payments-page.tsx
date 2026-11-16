"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Search, Eye, CheckCircle, XCircle, Clock, DollarSign, Download, User, Mail, Phone, CreditCard, FileText, Users } from "lucide-react";
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { toast } from "sonner@2.0.3";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { ImageWithFallback } from "../../figma/ImageWithFallback";

interface EnrollmentPayment {
  id: string;
  type: "enrollment";
  applicationId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  program: string;
  paymentType: string;
  paymentMethod: string;
  amount: number;
  tuitionFee: number;
  referenceNumber: string;
  paymentStatus: string;
  status: string;
  submittedAt: any;
  receiptFiles: any[];
}

interface StudentPayment {
  id: string;
  type: "student";
  studentId: string;
  studentName: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  orNumber: string;
  remarks?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  status: string;
  datePosted: any;
  submittedAt: any;
  postedBy: string;
  submittedBy?: string;
}

type Payment = EnrollmentPayment | StudentPayment;

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Real-time payments listener for both enrollment and student payments
  useEffect(() => {
    // Listen to enrollment payments
    const enrollmentQuery = query(collection(db, "enrollments"));
    const unsubscribeEnrollments = onSnapshot(enrollmentQuery, (snapshot) => {
      const enrollmentPayments = snapshot.docs.map(doc => ({
        id: doc.id,
        type: "enrollment" as const,
        ...doc.data(),
      })) as EnrollmentPayment[];
      
      updatePayments(enrollmentPayments, "enrollment");
    });

    // Listen to student submitted payments
    const studentPaymentsQuery = query(collection(db, "payments"));
    const unsubscribeStudentPayments = onSnapshot(studentPaymentsQuery, async (snapshot) => {
      const studentPayments = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          
          // Only include student-submitted payments (not manually posted by business office)
          if (data.submittedBy === "student") {
            // Fetch student details if needed
            let studentName = data.studentName || "Unknown Student";
            let studentEmail = "";
            let studentPhone = "";
            let studentProgram = "";
            
            if (data.studentId) {
              try {
                const studentDoc = await getDoc(doc(db, "users", data.studentId));
                if (studentDoc.exists()) {
                  const studentData = studentDoc.data();
                  studentName = studentData.name || studentName;
                  studentEmail = studentData.email || "";
                  studentPhone = studentData.phone || "";
                  studentProgram = studentData.program || "";
                }
              } catch (error) {
                console.error("Error fetching student data:", error);
              }
            }
            
            return {
              id: docSnap.id,
              type: "student" as const,
              studentId: data.studentId,
              studentName,
              studentEmail,
              studentPhone,
              studentProgram,
              amount: data.amount,
              paymentMethod: data.paymentMethod,
              referenceNumber: data.referenceNumber,
              orNumber: data.orNumber,
              remarks: data.remarks,
              receiptUrl: data.receiptUrl,
              receiptFileName: data.receiptFileName,
              status: data.status,
              datePosted: data.datePosted,
              submittedAt: data.submittedAt,
              postedBy: data.postedBy,
              submittedBy: data.submittedBy
            } as StudentPayment;
          }
          return null;
        })
      );
      
      const filteredStudentPayments = studentPayments.filter((p): p is StudentPayment => p !== null);
      updatePayments(filteredStudentPayments, "student");
    });

    setLoading(false);

    return () => {
      unsubscribeEnrollments();
      unsubscribeStudentPayments();
    };
  }, []);

  const updatePayments = (newPayments: Payment[], type: "enrollment" | "student") => {
    setPayments(prevPayments => {
      // Remove old payments of this type
      const filtered = prevPayments.filter(p => p.type !== type);
      // Add new payments
      return [...filtered, ...newPayments];
    });
  };

  const handleVerify = async (payment: Payment) => {
    if (!confirm("Confirm that you have verified this payment?")) return;

    setProcessing(true);
    try {
      if (payment.type === "enrollment") {
        await updateDoc(doc(db, "enrollments", payment.id), {
          paymentStatus: "verified",
          verifiedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "payments", payment.id), {
          status: "verified",
          verifiedAt: serverTimestamp(),
        });
      }
      toast.success("Payment verified successfully!");
      setDetailsOpen(false);
    } catch (error) {
      console.error("Error verifying payment:", error);
      toast.error("Failed to verify payment");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (payment: Payment) => {
    const reason = prompt("Please provide a reason for payment rejection:");
    if (!reason) return;

    setProcessing(true);
    try {
      if (payment.type === "enrollment") {
        await updateDoc(doc(db, "enrollments", payment.id), {
          paymentStatus: "rejected",
          paymentRejectionReason: reason,
          paymentRejectedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "payments", payment.id), {
          status: "rejected",
          rejectionReason: reason,
          rejectedAt: serverTimestamp(),
        });
      }
      toast.success("Payment rejected");
      setDetailsOpen(false);
    } catch (error) {
      console.error("Error rejecting payment:", error);
      toast.error("Failed to reject payment");
    } finally {
      setProcessing(false);
    }
  };

  const viewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setDetailsOpen(true);
  };

  const getPaymentStatus = (payment: Payment): string => {
    if (payment.type === "enrollment") {
      return payment.paymentStatus;
    }
    return payment.status;
  };

  const filteredPayments = payments.filter(payment => {
    const status = getPaymentStatus(payment);
    
    let matchesSearch = false;
    if (payment.type === "enrollment") {
      matchesSearch = 
        payment.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.applicationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    } else {
      matchesSearch =
        payment.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (payment as any).studentEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.orNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    const matchesTab = status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "verified":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      gcash: "GCash",
      paymaya: "PayMaya",
      bank_transfer: "Bank Transfer",
      bank: "Bank Transfer",
      over_counter: "Over the Counter",
      cash: "Cash",
      online: "Online Payment",
    };
    return methods[method] || method;
  };

  const getPaymentTypeLabel = (type?: string) => {
    if (!type) return "Payment";
    return type === "full" ? "Full Payment" : "Down Payment";
  };

  const getPaymentDisplayName = (payment: Payment): string => {
    if (payment.type === "enrollment") {
      return `${payment.firstName} ${payment.middleName ? payment.middleName + ' ' : ''}${payment.lastName}`;
    }
    return payment.studentName;
  };

  const getPaymentIdentifier = (payment: Payment): string => {
    if (payment.type === "enrollment") {
      return payment.applicationId;
    }
    return payment.orNumber || "N/A";
  };

  if (loading) {
    return <LoadingState message="Loading payments..." />;
  }

  const pendingCount = payments.filter(p => getPaymentStatus(p) === "pending").length;
  const verifiedCount = payments.filter(p => getPaymentStatus(p) === "verified").length;
  const rejectedCount = payments.filter(p => getPaymentStatus(p) === "rejected").length;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Payment Verification</h1>
        <p className="text-sm text-muted-foreground">Review submitted payments and receipts</p>
      </div>

      <div className="relative max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, ID, or reference number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verified ({verifiedCount})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Payments</CardTitle>
              <CardDescription>
                {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPayments.length === 0 ? (
                <EmptyState
                  icon={DollarSign}
                  title={`No ${activeTab} payments`}
                  description={searchTerm ? "Try adjusting your search" : `No payments with ${activeTab} status`}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>ID / OR Number</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Reference No.</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={`${payment.type}-${payment.id}`}>
                          <TableCell>
                            <Badge variant="outline" className={payment.type === "enrollment" ? "border-blue-500 text-blue-700" : "border-green-500 text-green-700"}>
                              {payment.type === "enrollment" ? (
                                <><Users className="h-3 w-3 mr-1" />Enrollment</>
                              ) : (
                                <><User className="h-3 w-3 mr-1" />Student</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium font-mono text-sm">
                            {getPaymentIdentifier(payment)}
                          </TableCell>
                          <TableCell>
                            {getPaymentDisplayName(payment)}
                          </TableCell>
                          <TableCell className="font-medium">
                            ₱{payment.amount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>{getPaymentMethodLabel(payment.paymentMethod)}</TableCell>
                          <TableCell className="font-mono text-sm">{payment.referenceNumber}</TableCell>
                          <TableCell>
                            {payment.submittedAt?.toDate?.()?.toLocaleDateString() || 
                             (payment.type === "student" && payment.datePosted?.toDate?.()?.toLocaleDateString()) ||
                             "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewDetails(payment)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              {selectedPayment?.type === "enrollment" 
                ? `Application ID: ${(selectedPayment as EnrollmentPayment).applicationId}`
                : `OR Number: ${(selectedPayment as StudentPayment)?.orNumber || "Pending"}`
              }
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-6">
              {/* Payment Type Badge */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">Payment Type</div>
                <Badge variant="outline" className={selectedPayment.type === "enrollment" ? "border-blue-500 text-blue-700" : "border-green-500 text-green-700"}>
                  {selectedPayment.type === "enrollment" ? (
                    <><Users className="h-3 w-3 mr-1" />Enrollment Application Payment</>
                  ) : (
                    <><User className="h-3 w-3 mr-1" />Student Payment Submission</>
                  )}
                </Badge>
              </div>

              {/* Payment Status */}
              <div>
                <div className="text-sm text-muted-foreground">Payment Status</div>
                <div className="mt-1">{getPaymentBadge(getPaymentStatus(selectedPayment))}</div>
              </div>

              {/* Student/Applicant Information */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {selectedPayment.type === "enrollment" ? "Applicant" : "Student"} Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Full Name</div>
                    <div className="font-medium">
                      {getPaymentDisplayName(selectedPayment)}
                    </div>
                  </div>
                  {selectedPayment.type === "enrollment" && (
                    <>
                      <div>
                        <div className="text-sm text-muted-foreground">Program</div>
                        <div className="font-medium">{selectedPayment.program}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Email</div>
                        <div className="font-medium flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {selectedPayment.email}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Phone</div>
                        <div className="font-medium flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {selectedPayment.phone}
                        </div>
                      </div>
                    </>
                  )}
                  {selectedPayment.type === "student" && (
                    <>
                      <div>
                        <div className="text-sm text-muted-foreground">Student ID</div>
                        <div className="font-medium font-mono">{selectedPayment.studentId}</div>
                      </div>
                      {(selectedPayment as any).studentEmail && (
                        <div>
                          <div className="text-sm text-muted-foreground">Email</div>
                          <div className="font-medium flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {(selectedPayment as any).studentEmail}
                          </div>
                        </div>
                      )}
                      {(selectedPayment as any).studentProgram && (
                        <div>
                          <div className="text-sm text-muted-foreground">Program</div>
                          <div className="font-medium">{(selectedPayment as any).studentProgram}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Payment Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                  {selectedPayment.type === "enrollment" && (
                    <>
                      <div>
                        <div className="text-sm text-muted-foreground">Payment Type</div>
                        <div className="font-medium">{getPaymentTypeLabel(selectedPayment.paymentType)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Tuition Fee</div>
                        <div className="font-medium text-lg">
                          ₱{selectedPayment.tuitionFee?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </>
                  )}
                  <div>
                    <div className="text-sm text-muted-foreground">Payment Method</div>
                    <div className="font-medium flex items-center gap-2">
                      <CreditCard className="h-3 w-3" />
                      {getPaymentMethodLabel(selectedPayment.paymentMethod)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Amount Paid</div>
                    <div className="font-medium text-lg text-green-600">
                      ₱{selectedPayment.amount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-muted-foreground">Reference Number</div>
                    <div className="font-mono font-medium text-lg">{selectedPayment.referenceNumber}</div>
                  </div>
                  {selectedPayment.type === "student" && selectedPayment.orNumber && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-muted-foreground">OR Number</div>
                      <div className="font-mono font-medium text-lg">{selectedPayment.orNumber}</div>
                    </div>
                  )}
                  {selectedPayment.type === "student" && selectedPayment.remarks && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-muted-foreground">Remarks</div>
                      <div className="font-medium">{selectedPayment.remarks}</div>
                    </div>
                  )}
                  {selectedPayment.type === "enrollment" && selectedPayment.paymentType === "downpayment" && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-muted-foreground">Balance Due</div>
                      <div className="font-medium text-lg text-orange-600">
                        ₱{(selectedPayment.tuitionFee - selectedPayment.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Receipt */}
              {selectedPayment.type === "enrollment" && selectedPayment.receiptFiles && selectedPayment.receiptFiles.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Payment Receipt
                  </h3>
                  <div className="space-y-3">
                    {selectedPayment.receiptFiles.map((receipt: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{receipt.name || `Receipt ${index + 1}`}</span>
                          </div>
                          {receipt.url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={receipt.url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </a>
                            </Button>
                          )}
                        </div>
                        {receipt.url && (
                          <div className="border rounded-lg overflow-hidden bg-muted/30">
                            <ImageWithFallback
                              src={receipt.url}
                              alt={`Payment receipt ${index + 1}`}
                              className="w-full h-auto max-h-96 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Student Payment Receipt */}
              {selectedPayment.type === "student" && selectedPayment.receiptUrl && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Payment Receipt
                  </h3>
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{selectedPayment.receiptFileName || "Payment Receipt"}</span>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={selectedPayment.receiptUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-muted/30">
                      <ImageWithFallback
                        src={selectedPayment.receiptUrl}
                        alt="Payment receipt"
                        className="w-full h-auto max-h-96 object-contain"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            {selectedPayment && getPaymentStatus(selectedPayment) === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => selectedPayment && handleReject(selectedPayment)}
                  disabled={processing}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject Payment
                </Button>
                <Button
                  onClick={() => selectedPayment && handleVerify(selectedPayment)}
                  disabled={processing}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify Payment
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
