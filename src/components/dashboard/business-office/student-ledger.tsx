"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Textarea } from "../../ui/textarea";
import { 
  Search,
  Plus,
  DollarSign,
  Receipt,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Download
} from "lucide-react";
import { collection, query, onSnapshot, addDoc, updateDoc, doc, where, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { toast } from "sonner@2.0.3";

interface Student {
  id: string;
  studentId: string;
  name: string;
  program: string;
  yearLevel: string;
}

interface StudentFinancial {
  id: string;
  studentId: string;
  studentName: string;
  program: string;
  yearLevel: string;
  enrolledUnits: number;
  tuitionRatePerUnit: number;
  totalTuition: number;
  totalFees: number;
  totalDiscounts: number;
  totalAmountDue: number;
  totalPayments: number;
  remainingBalance: number;
}

interface Payment {
  id: string;
  studentId: string;
  orNumber: string;
  referenceNumber?: string;
  amount: number;
  paymentMethod: "cash" | "gcash" | "bank" | "online";
  datePosted: string;
  status: "verified" | "pending";
  postedBy: string;
  remarks?: string;
}

export function StudentLedger() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [financials, setFinancials] = useState<StudentFinancial[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    orNumber: "",
    referenceNumber: "",
    amount: "",
    paymentMethod: "cash" as "cash" | "gcash" | "bank" | "online",
    status: "verified" as "verified" | "pending",
    remarks: ""
  });

  // Real-time listeners
  useEffect(() => {
    // Wait for auth to be ready before querying Firestore
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Fetch students
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student")
      );

      const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
        const studentsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id, // Firebase UID
            studentId: data.studentId || doc.id, // Custom studentId field, fallback to Firebase UID if not set
            name: data.name || "Unknown",
            program: data.program || "",
            yearLevel: data.yearLevel || ""
          };
        }) as Student[];
        setStudents(studentsData);
        setLoading(false);
      });

      // Fetch all financials
      const financialsQuery = collection(db, "studentFinancials");
      const unsubscribeFinancials = onSnapshot(financialsQuery, (snapshot) => {
        const financialsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as StudentFinancial[];
        setFinancials(financialsData);
      });

      // Fetch all payments
      const paymentsQuery = collection(db, "payments");
      const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
        const paymentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Payment[];
        setPayments(paymentsData);
      });

      // Cleanup function for Firestore listeners
      return () => {
        unsubscribeStudents();
        unsubscribeFinancials();
        unsubscribePayments();
      };
    });

    // Cleanup function for auth listener
    return () => unsubscribeAuth();
  }, []);

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.program.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStudentFinancial = (studentId: string) => {
    return financials.find(f => f.studentId === studentId);
  };

  const getStudentPayments = (studentId: string) => {
    return payments.filter(p => p.studentId === studentId);
  };

  // Calculate real-time totals from payments array
  const calculateStudentTotals = (studentId: string) => {
    const studentPayments = getStudentPayments(studentId);
    const totalPaid = studentPayments.reduce((sum, payment) => {
      if (payment.status === 'verified') {
        return sum + payment.amount;
      }
      return sum;
    }, 0);

    const financial = getStudentFinancial(studentId);
    const balance = (financial?.totalAmountDue || 0) - totalPaid;

    return {
      totalPaid,
      balance
    };
  };

  const handlePostPayment = async () => {
    if (!selectedStudent) return;

    if (!paymentForm.orNumber || !paymentForm.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Add payment
      await addDoc(collection(db, "payments"), {
        studentId: selectedStudent.studentId,
        orNumber: paymentForm.orNumber,
        referenceNumber: paymentForm.referenceNumber || "",
        amount: amount,
        paymentMethod: paymentForm.paymentMethod,
        datePosted: new Date().toISOString(),
        status: paymentForm.status,
        postedBy: currentUser.uid,
        remarks: paymentForm.remarks || "",
        createdAt: serverTimestamp()
      });

      // Update student financial record
      const financial = getStudentFinancial(selectedStudent.studentId);
      if (financial) {
        const newTotalPayments = financial.totalPayments + amount;
        const newRemainingBalance = financial.totalAmountDue - newTotalPayments;

        await updateDoc(doc(db, "studentFinancials", financial.id), {
          totalPayments: newTotalPayments,
          remainingBalance: newRemainingBalance,
          lastUpdated: new Date().toISOString()
        });
      }

      toast.success("Payment posted successfully");
      setIsPaymentDialogOpen(false);
      setPaymentForm({
        orNumber: "",
        referenceNumber: "",
        amount: "",
        paymentMethod: "cash",
        status: "verified",
        remarks: ""
      });
    } catch (error) {
      console.error("Error posting payment:", error);
      toast.error("Failed to post payment");
    }
  };

  const handleDeletePayment = async (paymentId: string, studentId: string, amount: number) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;

    try {
      // Delete payment
      await deleteDoc(doc(db, "payments", paymentId));

      // Update student financial record
      const financial = getStudentFinancial(studentId);
      if (financial) {
        const newTotalPayments = financial.totalPayments - amount;
        const newRemainingBalance = financial.totalAmountDue - newTotalPayments;

        await updateDoc(doc(db, "studentFinancials", financial.id), {
          totalPayments: newTotalPayments,
          remainingBalance: newRemainingBalance,
          lastUpdated: new Date().toISOString()
        });
      }

      toast.success("Payment deleted successfully");
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment");
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <LoadingState message="Loading student ledgers..." />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Receipt className="h-5 w-5" />
          Student Ledger
        </h1>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Student Financial Records</CardTitle>
              <CardDescription>{filteredStudents.length} students</CardDescription>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No students found"
              description="No students match your search criteria."
            />
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map(student => {
                    const financial = getStudentFinancial(student.studentId);
                    const studentPayments = getStudentPayments(student.studentId);
                    const { totalPaid, balance } = calculateStudentTotals(student.studentId);
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-xs text-muted-foreground">{student.studentId}</div>
                          </div>
                        </TableCell>
                        <TableCell>{student.program || "—"}</TableCell>
                        <TableCell>{student.yearLevel || "—"}</TableCell>
                        <TableCell>
                          {financial ? formatCurrency(financial.totalAmountDue) : "—"}
                        </TableCell>
                        <TableCell className="text-blue-600 font-medium">
                          {financial ? formatCurrency(totalPaid) : "—"}
                        </TableCell>
                        <TableCell>
                          {financial ? (
                            <span className={`font-medium ${
                              balance === 0 ? 'text-green-600' : 
                              balance > 0 ? 'text-red-600' : 
                              'text-blue-600'
                            }`}>
                              {formatCurrency(Math.abs(balance))}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Dialog 
                            open={isPaymentDialogOpen && selectedStudent?.id === student.id}
                            onOpenChange={(open) => {
                              setIsPaymentDialogOpen(open);
                              if (open) setSelectedStudent(student);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Plus className="h-4 w-4 mr-2" />
                                Post Payment
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Post Payment</DialogTitle>
                                <DialogDescription>
                                  Record a new payment for {student.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="orNumber">OR Number *</Label>
                                  <Input
                                    id="orNumber"
                                    placeholder="Enter OR number"
                                    value={paymentForm.orNumber}
                                    onChange={(e) => setPaymentForm({...paymentForm, orNumber: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="referenceNumber">Reference Number</Label>
                                  <Input
                                    id="referenceNumber"
                                    placeholder="Optional reference"
                                    value={paymentForm.referenceNumber}
                                    onChange={(e) => setPaymentForm({...paymentForm, referenceNumber: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="amount">Amount (₱) *</Label>
                                  <Input
                                    id="amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                                  <Select 
                                    value={paymentForm.paymentMethod}
                                    onValueChange={(value: any) => setPaymentForm({...paymentForm, paymentMethod: value})}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="cash">Cash</SelectItem>
                                      <SelectItem value="gcash">GCash</SelectItem>
                                      <SelectItem value="bank">Bank Transfer</SelectItem>
                                      <SelectItem value="online">Online Payment</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="status">Status *</Label>
                                  <Select 
                                    value={paymentForm.status}
                                    onValueChange={(value: any) => setPaymentForm({...paymentForm, status: value})}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="verified">Verified</SelectItem>
                                      <SelectItem value="pending">Pending</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="remarks">Remarks</Label>
                                  <Textarea
                                    id="remarks"
                                    placeholder="Optional notes"
                                    value={paymentForm.remarks}
                                    onChange={(e) => setPaymentForm({...paymentForm, remarks: e.target.value})}
                                    rows={3}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handlePostPayment}>
                                  Post Payment
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>Last 10 payments posted</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payments yet"
              description="Posted payments will appear here."
            />
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>OR Number</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments
                    .sort((a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime())
                    .slice(0, 10)
                    .map(payment => {
                      const student = students.find(s => s.studentId === payment.studentId);
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="font-medium">{student?.name || "Unknown"}</div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{payment.orNumber}</TableCell>
                          <TableCell className="font-medium text-blue-600">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {payment.paymentMethod.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(payment.datePosted)}</TableCell>
                          <TableCell>
                            {payment.status === "verified" ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeletePayment(payment.id, payment.studentId, payment.amount)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}