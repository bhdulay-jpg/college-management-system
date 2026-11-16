"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Alert, AlertDescription } from "../../ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { DollarSign, Receipt, AlertCircle, CheckCircle, Clock, CreditCard } from "lucide-react";
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useRouter } from "../../router";
import { formatDateShort } from "../../../lib/date-formatter";

interface Student {
  id: string;
  name: string;
  studentId?: string;
}

interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  description: string;
  status: string;
  paymentMethod?: string;
  referenceNumber?: string;
  createdAt: any;
  verifiedAt?: any;
}

export function BillingPage() {
  const { user } = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [payments, setPayments] = useState<Payment[]>([]);

  // Fetch students
  useEffect(() => {
    if (!user) return;

    // First, get the parent user document to check for linked children array
    const parentDocRef = doc(db, "users", user.id);
    const unsubscribeParent = onSnapshot(parentDocRef, (parentDoc) => {
      const parentData = parentDoc.data();
      const linkedStudentIds = parentData?.children || [];

      // Query students using BOTH methods:
      // 1. Students where parentId == current user (NEW method)
      // 2. Students whose ID is in parent's children array (OLD method)
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "Student")
      );

      const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
        const allStudents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter to only students linked to this parent
        const studentsData = allStudents.filter((student: any) => {
          // Include if parentId matches (NEW method) OR if student ID is in parent's children array (OLD method)
          return student.parentId === user.id || linkedStudentIds.includes(student.id);
        }) as Student[];
        
        setStudents(studentsData);
        
        // Auto-select first student if available
        if (studentsData.length > 0 && !selectedStudentId) {
          setSelectedStudentId(studentsData[0].id);
        }
        
        setLoading(false);
      }, (error) => {
        console.error("Error fetching students:", error);
        setLoading(false);
      });

      return () => unsubscribeStudents();
    });

    return () => unsubscribeParent();
  }, [user]);

  // Fetch payments for selected student
  useEffect(() => {
    if (!selectedStudentId) {
      setPayments([]);
      return;
    }

    const paymentsQuery = query(
      collection(db, "payments"),
      where("studentId", "==", selectedStudentId)
    );

    const unsubscribe = onSnapshot(paymentsQuery, async (snapshot) => {
      const manualPayments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Payment[];

      // Fetch verified enrollment downpayments
      const studentDoc = await getDoc(doc(db, "users", selectedStudentId));
      if (studentDoc.exists()) {
        // Query by userId (linked when account is created)
        const enrollmentByUserIdQuery = query(
          collection(db, "enrollments"),
          where("userId", "==", selectedStudentId),
          where("paymentStatus", "==", "verified")
        );
        
        let enrollmentSnapshot = await getDocs(enrollmentByUserIdQuery);
        
        // Fallback: If no results by userId, try by email
        if (enrollmentSnapshot.empty) {
          const studentEmail = studentDoc.data().email;
          if (studentEmail) {
            const enrollmentByEmailQuery = query(
              collection(db, "enrollments"),
              where("email", "==", studentEmail),
              where("paymentStatus", "==", "verified")
            );
            enrollmentSnapshot = await getDocs(enrollmentByEmailQuery);
          }
        }
        
        const enrollmentPayments = enrollmentSnapshot.docs.map(enrollDoc => {
          const data = enrollDoc.data();
          return {
            id: `enrollment-${enrollDoc.id}`,
            studentId: selectedStudentId,
            studentName: selectedStudent?.name || "",
            amount: data.amount || 0,
            description: "Enrollment Downpayment",
            status: "verified",
            paymentMethod: data.paymentMethod || "online",
            referenceNumber: data.referenceNumber || data.applicationId || "",
            createdAt: data.submittedAt,
            verifiedAt: data.verifiedAt
          } as Payment;
        });

        // Combine and sort all payments
        const allPayments = [...manualPayments, ...enrollmentPayments];
        allPayments.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        setPayments(allPayments);
        return;
      }
      
      // If no email found, just show manual payments
      manualPayments.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setPayments(manualPayments);
    });

    return () => unsubscribe();
  }, [selectedStudentId]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // Calculate statistics
  const totalPaid = payments
    .filter(p => p.status === "verified")
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = payments
    .filter(p => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const verifiedPayments = payments.filter(p => p.status === "verified").length;
  const pendingPayments = payments.filter(p => p.status === "pending").length;
  const rejectedPayments = payments.filter(p => p.status === "rejected").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <LoadingState message="Loading billing information..." />;
  }

  if (students.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState
          icon={DollarSign}
          title="No Students Linked"
          description="Your account hasn't been linked to any students yet."
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl">Billing & Payments</h1>
        <p className="text-muted-foreground">View payment history and billing information</p>
      </div>

      {/* Student Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Student</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a student" />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name} - {student.studentId || "No ID"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedStudent && (
        <>
          {/* Payment Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Total Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">₱{totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {verifiedPayments} verified payment{verifiedPayments !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">₱{pendingAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingPayments} pending payment{pendingPayments !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Total Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{payments.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  All payment records
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Rejected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{rejectedPayments}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Failed payment{rejectedPayments !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alert for Pending Payments */}
          {pendingPayments > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                You have {pendingPayments} pending payment{pendingPayments !== 1 ? 's' : ''} awaiting verification from the Business Office.
              </AlertDescription>
            </Alert>
          )}

          {/* Payment History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All payment transactions for {selectedStudent.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Reference #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Verified Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {payment.createdAt?.toDate?.()
                              ? formatDateShort(payment.createdAt.toDate().toISOString())
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{payment.description}</div>
                              <div className="text-xs text-muted-foreground">
                                {payment.studentName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold">
                              ₱{payment.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-3 w-3" />
                              <span className="capitalize">{payment.paymentMethod || "N/A"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs">{payment.referenceNumber || "N/A"}</span>
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            {payment.verifiedAt?.toDate?.()
                              ? formatDateShort(payment.verifiedAt.toDate().toISOString())
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  icon={Receipt}
                  title="No Payment Records"
                  description="No payment transactions found for this student."
                />
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">How to Make a Payment</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Students can submit payment proofs through their Student Dashboard</li>
                  <li>Navigate to Payments section and upload payment receipt</li>
                  <li>Business Office will verify the payment within 1-2 business days</li>
                  <li>You will see the status update here in real-time</li>
                </ol>
              </div>

              <div className="p-4 border border-info/20 bg-info/10 rounded-lg">
                <h4 className="font-medium mb-2 text-info">Payment Methods Accepted</h4>
                <ul className="text-sm text-info space-y-1">
                  <li>• Bank Transfer</li>
                  <li>• Over-the-Counter Payment</li>
                  <li>• Online Banking</li>
                  <li>• Cash Payment at Business Office</li>
                </ul>
              </div>

              <div className="p-4 border border-warning/20 bg-warning/10 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <h4 className="font-medium mb-1 text-yellow-900">Important Reminders</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Keep your payment reference numbers for record purposes</li>
                      <li>• Ensure payment proofs are clear and readable before submission</li>
                      <li>• Contact the Business Office for payment inquiries</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}