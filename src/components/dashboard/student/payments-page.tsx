"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Alert, AlertDescription } from "../../ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { 
  DollarSign, 
  Download, 
  CheckCircle, 
  Clock,
  Receipt,
  XCircle,
  FileText,
  Wallet,
  TrendingDown,
  Upload,
  ExternalLink,
  Calendar,
  CreditCard
} from "lucide-react";
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { StudentPageHeader } from "../../student-page-header";
import { DashboardLayout } from "../dashboard-layout";
import { SubmitPaymentDialog } from "./submit-payment-dialog";

interface Payment {
  id: string;
  studentId: string;
  orNumber: string;
  referenceNumber?: string;
  amount: number;
  paymentMethod: "cash" | "gcash" | "bank" | "online";
  datePosted: string;
  submittedAt?: string;
  status: "verified" | "pending" | "rejected";
  postedBy: string;
  submittedBy?: string;
  remarks?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  rejectionReason?: string;
  type?: "manual" | "enrollment_downpayment";
  applicationId?: string;
}

interface StudentFinancial {
  totalAmountDue: number;
  totalPayments: number;
  remainingBalance: number;
  studentName: string;
  program: string;
  yearLevel: string;
}

export function StudentPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [financial, setFinancial] = useState<StudentFinancial | null>(null);
  const [submitPaymentOpen, setSubmitPaymentOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [studentName, setStudentName] = useState<string>("Student");
  const [customStudentId, setCustomStudentId] = useState<string>("");

  useEffect(() => {
    let unsubscribeFinancial: (() => void) | undefined;
    let unsubscribePayments: (() => void) | undefined;
    let unsubscribeEnrollments: (() => void) | undefined;
    let unsubscribeFallback: (() => void) | undefined;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get current user data directly using document ID
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser(userData);
          setStudentName(userData.name || "Student");
          
          const studentId = userData.studentId || "";
          setCustomStudentId(studentId);

          // Listen to financial records using custom studentId (with Firebase UID fallback)
          const queryStudentId = studentId || user.uid;
          console.log("[Payments] Querying financial with studentId:", queryStudentId, "(custom:", studentId, ", uid:", user.uid, ")");
          
          const financialQuery = query(
            collection(db, "studentFinancials"),
            where("studentId", "==", queryStudentId)
          );
          
          // Fallback listener will be tracked at useEffect level
          
          unsubscribeFinancial = onSnapshot(financialQuery, (snapshot) => {
            if (!snapshot.empty) {
              const financialData = snapshot.docs[0].data();
              console.log("[Payments] Financial data found:", financialData);
              
              // Cleanup fallback listener if it exists
              if (unsubscribeFallback) {
                unsubscribeFallback();
                unsubscribeFallback = null;
              }
              
              setFinancial({
                totalAmountDue: financialData.totalAmountDue || 0,
                totalPayments: financialData.totalPayments || 0,
                remainingBalance: financialData.remainingBalance || 0,
                studentName: financialData.studentName || userData.name,
                program: financialData.program || userData.program || "",
                yearLevel: financialData.yearLevel || userData.yearLevel || "",
              });
            } else {
              // If no record found with custom studentId, try with Firebase UID as fallback
              if (studentId && studentId !== user.uid && !unsubscribeFallback) {
                console.log("[Payments] No record found with custom studentId, setting up Firebase UID listener:", user.uid);
                const fallbackQuery = query(
                  collection(db, "studentFinancials"),
                  where("studentId", "==", user.uid)
                );
                
                unsubscribeFallback = onSnapshot(fallbackQuery, (fallbackSnapshot) => {
                  if (!fallbackSnapshot.empty) {
                    const financialData = fallbackSnapshot.docs[0].data();
                    console.log("[Payments] Financial data found with Firebase UID:", financialData);
                    setFinancial({
                      totalAmountDue: financialData.totalAmountDue || 0,
                      totalPayments: financialData.totalPayments || 0,
                      remainingBalance: financialData.remainingBalance || 0,
                      studentName: financialData.studentName || userData.name,
                      program: financialData.program || userData.program || "",
                      yearLevel: financialData.yearLevel || userData.yearLevel || "",
                    });
                  } else {
                    // If no financial record exists yet, set defaults
                    console.log("[Payments] No financial record found, using defaults");
                    setFinancial({
                      totalAmountDue: 0,
                      totalPayments: 0,
                      remainingBalance: 0,
                      studentName: userData.name || "Student",
                      program: userData.program || "",
                      yearLevel: userData.yearLevel || "",
                    });
                  }
                });
              } else if (!studentId || studentId === user.uid) {
                // If no financial record exists yet, set defaults
                console.log("[Payments] No financial record found, using defaults");
                setFinancial({
                  totalAmountDue: 0,
                  totalPayments: 0,
                  remainingBalance: 0,
                  studentName: userData.name || "Student",
                  program: userData.program || "",
                  yearLevel: userData.yearLevel || "",
                });
              }
            }
          }, (error) => {
            console.error("Error fetching financial data:", error);
            // Set defaults on error
            setFinancial({
              totalAmountDue: 0,
              totalPayments: 0,
              remainingBalance: 0,
              studentName: userData.name || "Student",
              program: userData.program || "",
              yearLevel: userData.yearLevel || "",
            });
          });

          // Store payments data to combine with enrollments
          let regularPayments: Payment[] = [];
          let enrollmentPayments: Payment[] = [];
          let isPaymentsLoaded = false;
          let isEnrollmentsLoaded = false;

          const combineAndSetPayments = () => {
            if (!isPaymentsLoaded || !isEnrollmentsLoaded) return;
            
            const allPayments = [...regularPayments, ...enrollmentPayments];
            console.log("[Payments Page] Total payments:", allPayments.length);
            
            // Sort by date (newest first)
            allPayments.sort((a, b) => {
              const dateA = a.submittedAt || a.datePosted || "";
              const dateB = b.submittedAt || b.datePosted || "";
              // Convert to timestamps for comparison
              const timeA = dateA ? (typeof dateA === 'string' ? new Date(dateA).getTime() : dateA.toMillis()) : 0;
              const timeB = dateB ? (typeof dateB === 'string' ? new Date(dateB).getTime() : dateB.toMillis()) : 0;
              return timeB - timeA;
            });
            
            setPayments(allPayments);
            setLoading(false);
          };

          // Listen to all payments for this student using Firebase UID
          const paymentsQuery = query(
            collection(db, "payments"),
            where("studentId", "==", user.uid)
          );
          
          unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
            regularPayments = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            })) as Payment[];
            
            console.log("[Payments Page] Regular payments found:", regularPayments.length);
            isPaymentsLoaded = true;
            combineAndSetPayments();
          }, (error) => {
            console.error("Error fetching payments:", error);
            regularPayments = [];
            isPaymentsLoaded = true;
            combineAndSetPayments();
          });

          // Listen to enrollment downpayments separately
          const enrollmentEmail = user.email || userData.email;
          if (enrollmentEmail) {
            const enrollmentsQuery = query(
              collection(db, "enrollments"),
              where("email", "==", enrollmentEmail),
              where("paymentStatus", "==", "verified")
            );
            
            unsubscribeEnrollments = onSnapshot(enrollmentsQuery, (enrollSnapshot) => {
              enrollmentPayments = enrollSnapshot.docs.map(doc => ({
                id: `enrollment-${doc.id}`,
                studentId: user.uid,
                orNumber: doc.data().referenceNumber || "ENROLLMENT",
                referenceNumber: doc.data().referenceNumber || "",
                amount: Number(doc.data().amount) || 0,
                paymentMethod: doc.data().paymentMethod || "online",
                datePosted: doc.data().verifiedAt || doc.data().submittedAt || "",
                submittedAt: doc.data().submittedAt || "",
                status: "verified" as const,
                postedBy: doc.data().firstName ? `${doc.data().firstName} ${doc.data().lastName}` : "Student",
                submittedBy: "student",
                remarks: "Enrollment Application Fee",
                type: "enrollment_downpayment" as const,
                applicationId: doc.id
              })) as Payment[];
              
              console.log("[Payments Page] Enrollment downpayments found:", enrollmentPayments.length);
              isEnrollmentsLoaded = true;
              combineAndSetPayments();
            }, (error) => {
              console.error("Error fetching enrollment payments:", error);
              enrollmentPayments = [];
              isEnrollmentsLoaded = true;
              combineAndSetPayments();
            });
          } else {
            console.error("Student email is unavailable; enrollment payments cannot be loaded.");
            isEnrollmentsLoaded = true;
            combineAndSetPayments();
          }
        } else {
          console.error("User document not found");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFinancial) unsubscribeFinancial();
      if (unsubscribePayments) unsubscribePayments();
      if (unsubscribeEnrollments) unsubscribeEnrollments();
      if (unsubscribeFallback) unsubscribeFallback();
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-success/10 text-success border-success/20">Verified</Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <Wallet className="h-4 w-4" />;
      case "gcash":
      case "online":
        return <CreditCard className="h-4 w-4" />;
      case "bank":
        return <FileText className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const downloadReceipt = (receiptUrl: string, fileName: string) => {
    window.open(receiptUrl, "_blank");
  };

  const verifiedPayments = payments.filter(p => p.status === "verified");
  const pendingPayments = payments.filter(p => p.status === "pending");
  const rejectedPayments = payments.filter(p => p.status === "rejected");

  // Calculate actual total payments from verified payments
  const actualTotalPayments = verifiedPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  
  // Calculate actual remaining balance
  const totalAmountDue = financial?.totalAmountDue || 0;
  const actualRemainingBalance = totalAmountDue - actualTotalPayments;

  if (loading) {
    return (
      <DashboardLayout userRole="Student" userName={studentName} notificationCount={0}>
        <LoadingState message="Loading payment history..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Student" userName={studentName} notificationCount={0}>
      <div className="min-h-screen bg-background">
        <StudentPageHeader
          title="Payment History"
          description="View your payment records and manage your balance"
          icon={Receipt}
          action={
            <Button 
              onClick={() => setSubmitPaymentOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Upload className="h-4 w-4 mr-2" />
              Submit Payment
            </Button>
          }
        />

        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 space-y-6">

        {/* Financial Overview Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-0 elevation-md bg-card">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Total Amount Due
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{formatCurrency(totalAmountDue)}</div>
            </CardContent>
          </Card>

          <Card className="border-0 elevation-md bg-card">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Total Verified Payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-green-600 dark:text-green-400">
                {formatCurrency(actualTotalPayments)}
              </div>
              {verifiedPayments.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {verifiedPayments.length} verified payment{verifiedPayments.length !== 1 ? 's' : ''}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 elevation-md bg-card">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                Remaining Balance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl ${actualRemainingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {formatCurrency(actualRemainingBalance)}
              </div>
              {pendingPayments.length > 0 && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  {formatCurrency(pendingPayments.reduce((sum, p) => sum + p.amount, 0))} pending
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Alerts */}
        {pendingPayments.length > 0 && (
          <Alert className="border-yellow-500/20 bg-yellow-500/10">
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              You have {pendingPayments.length} payment{pendingPayments.length !== 1 ? 's' : ''} awaiting verification by the Business Office.
            </AlertDescription>
          </Alert>
        )}

        {rejectedPayments.length > 0 && (
          <Alert className="border-red-500/20 bg-red-500/10">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-700 dark:text-red-300">
              You have {rejectedPayments.length} rejected payment{rejectedPayments.length !== 1 ? 's' : ''}. Please review and resubmit if necessary.
            </AlertDescription>
          </Alert>
        )}

        {/* Payment History Table */}
        <Card className="border-0 elevation-md bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Payment History
            </CardTitle>
            <CardDescription>
              {payments.length > 0 
                ? `All your payment transactions (${payments.length} total)`
                : "No payment records yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={Receipt}
                  title="No payments yet"
                  description="You haven't submitted any payments yet. Click 'Submit Payment' to add your first payment."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>OR Number</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(payment.submittedAt || payment.datePosted)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="px-2 py-1 bg-muted rounded text-sm">
                            {payment.orNumber}
                          </code>
                        </TableCell>
                        <TableCell>
                          {payment.referenceNumber ? (
                            <code className="px-2 py-1 bg-muted rounded text-sm">
                              {payment.referenceNumber}
                            </code>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(payment.paymentMethod)}
                            <span className="capitalize">{payment.paymentMethod}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell>
                          {payment.receiptUrl ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadReceipt(payment.receiptUrl!, payment.receiptFileName || "receipt")}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">No receipt</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rejected Payments Details */}
        {rejectedPayments.length > 0 && (
          <Card className="border-0 elevation-md bg-card border-red-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <XCircle className="h-5 w-5" />
                Rejected Payments
              </CardTitle>
              <CardDescription>
                These payments were rejected by the Business Office. Please review the reasons and resubmit if needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rejectedPayments.map((payment) => (
                  <div key={payment.id} className="p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-muted rounded text-sm">
                            {payment.orNumber}
                          </code>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm">{formatDate(payment.submittedAt || payment.datePosted)}</span>
                        </div>
                        <div className="text-red-600 dark:text-red-400">
                          {formatCurrency(payment.amount)}
                        </div>
                      </div>
                      {payment.rejectionReason && (
                        <div className="mt-2">
                          <p className="text-sm">
                            <span className="text-muted-foreground">Reason:</span>{" "}
                            <span className="text-red-600 dark:text-red-400">{payment.rejectionReason}</span>
                          </p>
                        </div>
                      )}
                      {payment.remarks && (
                        <div className="mt-1">
                          <p className="text-sm">
                            <span className="text-muted-foreground">Notes:</span> {payment.remarks}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        </div>
      </div>

      {/* Submit Payment Dialog */}
      <SubmitPaymentDialog 
        open={submitPaymentOpen}
        onOpenChange={setSubmitPaymentOpen}
        studentId={auth.currentUser?.uid || ""}
        studentName={studentName}
        remainingBalance={actualRemainingBalance}
      />
    </DashboardLayout>
  );
}
