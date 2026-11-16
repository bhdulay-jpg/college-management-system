"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Alert, AlertDescription } from "../../ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { 
  DollarSign, 
  Download, 
  Info, 
  CheckCircle, 
  Clock,
  Receipt,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  Users,
  FileText
} from "lucide-react";
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";

interface ChildInfo {
  id: string;
  name: string;
  studentId: string;
  program: string;
  yearLevel: string;
}

interface FeeItem {
  id: string;
  name: string;
  amount: number;
  category: "tuition" | "mandatory" | "program" | "laboratory" | "other" | "miscellaneous" | "osf" | "program-specific";
  description?: string;
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

interface Discount {
  id: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  appliedAmount: number;
}

interface StudentFinancial {
  id: string;
  studentId: string;
  studentName: string;
  program: string;
  yearLevel: string;
  enrolledUnits: number;
  tuitionRatePerUnit: number;
  fees: FeeItem[];
  discounts: Discount[];
  totalTuition: number;
  totalFees: number;
  totalDiscounts: number;
  totalAmountDue: number;
  totalPayments: number;
  remainingBalance: number;
  lastUpdated: string;
}

export function ChildTuitionFees() {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [financial, setFinancial] = useState<StudentFinancial | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    tuition: true,
    mandatory: true,
    program: true,
    laboratory: false,
    other: false,
    payments: true,
    discounts: true
  });

  // Real-time listener for children
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // First, get the parent user document to check for linked children array
    const parentDocRef = doc(db, "users", currentUser.uid);
    const unsubscribeParent = onSnapshot(parentDocRef, (parentDoc) => {
      const parentData = parentDoc.data();
      const linkedStudentIds = parentData?.children || [];

      console.log(`[ChildTuitionFees] Parent's linked children IDs:`, linkedStudentIds);

      // Query students using BOTH methods:
      // 1. Students where parentId == current user (NEW method)
      // 2. Students whose ID is in parent's children array (OLD method)
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "Student")
      );

      const unsubscribeStudents = onSnapshot(studentsQuery, async (snapshot) => {
        const allStudents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter to only students linked to this parent
        const childrenData: ChildInfo[] = allStudents
          .filter((student: any) => {
            // Include if parentId matches (NEW method) OR if student ID is in parent's children array (OLD method)
            return student.parentId === currentUser.uid || linkedStudentIds.includes(student.id);
          })
          .map((student: any) => ({
            id: student.id,
            name: student.name || "",
            studentId: student.studentId || "",
            program: student.program || "",
            yearLevel: student.yearLevel || "",
          }));

        console.log(`[ChildTuitionFees] Found ${childrenData.length} linked children`);
        setChildren(childrenData);

        // Auto-select first child
        if (childrenData.length > 0 && !selectedChildId) {
          setSelectedChildId(childrenData[0].id);
        }

        setLoading(false);
      }, (error) => {
        console.error("[ChildTuitionFees] Error fetching children:", error);
        setLoading(false);
      });

      return () => unsubscribeStudents();
    });

    return () => unsubscribeParent();
  }, []);

  // Real-time listener for selected child's financial record
  useEffect(() => {
    if (!selectedChildId) return;

    // First get the child's custom studentId from their user document
    const getChildData = async () => {
      try {
        const childDoc = await getDoc(doc(db, "users", selectedChildId));
        if (!childDoc.exists()) {
          console.error(`[ChildTuitionFees] Child document not found for ID: ${selectedChildId}`);
          return;
        }

        const childData = childDoc.data();
        const customStudentId = childData.studentId || "";
        
        console.log(`[ChildTuitionFees] Child Firebase UID: ${selectedChildId}`);
        console.log(`[ChildTuitionFees] Child custom studentId: ${customStudentId}`);

        if (!customStudentId) {
          console.error(`[ChildTuitionFees] No custom studentId found for child`);
          // Still show basic data
          const selectedChild = children.find(c => c.id === selectedChildId);
          if (selectedChild) {
            setFinancial({
              id: "",
              studentId: customStudentId,
              studentName: selectedChild.name,
              program: selectedChild.program,
              yearLevel: selectedChild.yearLevel,
              enrolledUnits: 0,
              tuitionRatePerUnit: 0,
              fees: [],
              discounts: [],
              totalTuition: 0,
              totalFees: 0,
              totalDiscounts: 0,
              totalAmountDue: 0,
              totalPayments: 0,
              remainingBalance: 0,
              lastUpdated: new Date().toISOString()
            });
          }
          return;
        }

        // Query studentFinancials using custom studentId (with Firebase UID fallback)
        const queryStudentId = customStudentId || selectedChildId;
        console.log(`[ChildTuitionFees] Querying with studentId: ${queryStudentId} (custom: ${customStudentId}, uid: ${selectedChildId})`);
        
        const financialQuery = query(
          collection(db, "studentFinancials"),
          where("studentId", "==", queryStudentId)
        );

        const unsubscribeFinancial = onSnapshot(financialQuery, async (snapshot) => {
          if (!snapshot.empty) {
            const docData = snapshot.docs[0];
            const financialData = docData.data();
            console.log(`[ChildTuitionFees] Financial data found for studentId: ${queryStudentId}`);
            setFinancial({
              id: docData.id,
              ...financialData
            } as StudentFinancial);
          } else {
            // If no record found with custom studentId, try with Firebase UID as fallback
            if (customStudentId && customStudentId !== selectedChildId) {
              console.log(`[ChildTuitionFees] No record found with custom studentId, trying Firebase UID: ${selectedChildId}`);
              const fallbackQuery = query(
                collection(db, "studentFinancials"),
                where("studentId", "==", selectedChildId)
              );
              const fallbackSnapshot = await getDocs(fallbackQuery);
              
              if (!fallbackSnapshot.empty) {
                const docData = fallbackSnapshot.docs[0];
                const financialData = docData.data();
                console.log(`[ChildTuitionFees] Financial data found with Firebase UID`);
                setFinancial({
                  id: docData.id,
                  ...financialData
                } as StudentFinancial);
                return;
              }
            }
            
            // If no financial record exists, show basic data
            const selectedChild = children.find(c => c.id === selectedChildId);
            console.log(`[ChildTuitionFees] No financial record found for studentId: ${queryStudentId}`);
            if (selectedChild) {
              setFinancial({
                id: "",
                studentId: customStudentId,
                studentName: selectedChild.name,
                program: selectedChild.program,
                yearLevel: selectedChild.yearLevel,
                enrolledUnits: 0,
                tuitionRatePerUnit: 0,
                fees: [],
                discounts: [],
                totalTuition: 0,
                totalFees: 0,
                totalDiscounts: 0,
                totalAmountDue: 0,
                totalPayments: 0,
                remainingBalance: 0,
                lastUpdated: new Date().toISOString()
              });
            }
          }
        });

        // Store payments data to combine from both sources
        let manualPayments: Payment[] = [];
        let enrollmentPayments: Payment[] = [];
        let isManualPaymentsLoaded = false;
        let isEnrollmentPaymentsLoaded = false;

        const combineAndSetPayments = () => {
          if (!isManualPaymentsLoaded || !isEnrollmentPaymentsLoaded) return;
          
          const allPayments = [...manualPayments, ...enrollmentPayments];
          allPayments.sort((a, b) => 
            new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime()
          );
          
          console.log(`[ChildTuitionFees] Total payments: ${allPayments.length} (${manualPayments.length} manual + ${enrollmentPayments.length} enrollment)`);
          setPayments(allPayments);
        };

        // Real-time listener for manual payments - use Firebase UID for payments collection
        const paymentsQuery = query(
          collection(db, "payments"),
          where("studentId", "==", selectedChildId)
        );

        console.log(`[ChildTuitionFees] Setting up payments listener for Firebase UID: ${selectedChildId}`);

        const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
          manualPayments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Payment[];
          
          console.log(`[ChildTuitionFees] Found ${manualPayments.length} manual payment records`);
          isManualPaymentsLoaded = true;
          combineAndSetPayments();
        }, (error) => {
          console.error("[ChildTuitionFees] Error fetching manual payments:", error);
          manualPayments = [];
          isManualPaymentsLoaded = true;
          combineAndSetPayments();
        });

        // Real-time listener for enrollment payments
        const enrollmentsQuery = query(
          collection(db, "enrollments"),
          where("userId", "==", selectedChildId),
          where("paymentStatus", "==", "verified")
        );

        console.log(`[ChildTuitionFees] Setting up enrollment payments listener`);

        const unsubscribeEnrollments = onSnapshot(enrollmentsQuery, (snapshot) => {
          enrollmentPayments = snapshot.docs.map(enrollDoc => {
            const data = enrollDoc.data();
            return {
              id: `enrollment-${enrollDoc.id}`,
              studentId: selectedChildId,
              orNumber: data.referenceNumber || data.applicationId || "ENROLLMENT",
              referenceNumber: data.referenceNumber || data.applicationId || "",
              amount: data.amount || 0,
              paymentMethod: data.paymentMethod || "online",
              datePosted: data.submittedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
              status: "verified",
              postedBy: "Enrollment System",
              remarks: "Enrollment Downpayment"
            } as Payment;
          });
          
          console.log(`[ChildTuitionFees] Found ${enrollmentPayments.length} enrollment payments`);
          isEnrollmentPaymentsLoaded = true;
          combineAndSetPayments();
        }, (error) => {
          console.error("[ChildTuitionFees] Error fetching enrollment payments:", error);
          enrollmentPayments = [];
          isEnrollmentPaymentsLoaded = true;
          combineAndSetPayments();
        });

        return { unsubscribeFinancial, unsubscribePayments, unsubscribeEnrollments };
      } catch (error) {
        console.error("[ChildTuitionFees] Error setting up listeners:", error);
        return null;
      }
    };

    let unsubscribeFunctions: { unsubscribeFinancial: () => void; unsubscribePayments: () => void; unsubscribeEnrollments: () => void } | null = null;
    
    getChildData().then((unsubs) => {
      unsubscribeFunctions = unsubs;
    });

    return () => {
      if (unsubscribeFunctions) {
        unsubscribeFunctions.unsubscribeFinancial();
        unsubscribeFunctions.unsubscribePayments();
        unsubscribeFunctions.unsubscribeEnrollments();
      }
    };
  }, [selectedChildId, children]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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

  // Calculate actual totals from payments array
  const calculateTotals = () => {
    // If there are payment records, calculate from them (NEW method - real-time)
    if (payments.length > 0) {
      const totalPaid = payments.reduce((sum, payment) => {
        if (payment.status === 'verified') {
          return sum + payment.amount;
        }
        return sum;
      }, 0);

      const balance = (financial?.totalAmountDue || 0) - totalPaid;

      console.log(`[ChildTuitionFees] Calculating from payments collection (NEW):`, {
        paymentsCount: payments.length,
        totalPaid,
        totalAmountDue: financial?.totalAmountDue,
        balance
      });

      return {
        totalPaid,
        balance
      };
    }
    
    // If no payment records exist, fall back to studentFinancials data (OLD method - for legacy accounts)
    // This handles old accounts where payments were recorded in the studentFinancials document
    const totalPaid = financial?.totalPayments || 0;
    const balance = (financial?.totalAmountDue || 0) - totalPaid;

    console.log(`[ChildTuitionFees] Calculating from studentFinancials (OLD):`, {
      paymentsCount: 0,
      totalPaid,
      totalAmountDue: financial?.totalAmountDue,
      balance,
      note: 'Using totalPayments from studentFinancials document for legacy account'
    });

    return {
      totalPaid,
      balance
    };
  };

  const { totalPaid, balance } = calculateTotals();

  const handleDownloadSOA = () => {
    // TODO: Implement PDF generation
    alert("Statement of Account download will be implemented soon.");
  };

  const getFeesByCategory = (category: string) => {
    return financial?.fees.filter(fee => fee.category === category) || [];
  };

  if (loading) {
    return <LoadingState message="Loading financial information..." />;
  }

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Child Tuition & Fees
          </h2>
          <p className="text-muted-foreground">
            View your child's complete financial breakdown and payment history
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Users}
              title="No children linked"
              description="No student accounts are linked to your parent account. Please contact the administration."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Child Tuition & Fees
          </h2>
          <p className="text-muted-foreground">
            View your child's complete financial breakdown and payment history
          </p>
        </div>
        {financial && (
          <Button onClick={handleDownloadSOA} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download SOA
          </Button>
        )}
      </div>

      {/* Child Selector */}
      {children.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Child</label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map(child => (
                    <SelectItem key={child.id} value={child.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{child.name}</span>
                        <Badge variant="secondary" className="text-xs ml-2">
                          {child.program} - Year {child.yearLevel}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          All financial data updates in real-time. For payment concerns, please contact the Business Office.
        </AlertDescription>
      </Alert>

      {!financial ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Receipt}
              title="No financial record found"
              description="Financial information for this student will appear here once set up by the Business Office."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Card */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle>Financial Summary - {financial.studentName}</CardTitle>
              <CardDescription>
                {financial.program} • Year {financial.yearLevel} • {financial.enrolledUnits} Units Enrolled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tuition ({financial.enrolledUnits} units × {formatCurrency(financial.tuitionRatePerUnit)})</span>
                    <span className="font-medium">{formatCurrency(financial.totalTuition)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">School Fees</span>
                    <span className="font-medium">{formatCurrency(financial.totalFees)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discounts & Scholarships</span>
                    <span className="font-medium text-green-600">-{formatCurrency(financial.totalDiscounts)}</span>
                  </div>
                  <div className="h-px bg-border my-2"></div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total Amount Due</span>
                    <span className="font-bold">{formatCurrency(financial.totalAmountDue)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Payments</span>
                    <span className="font-medium text-blue-600">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="h-px bg-border my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Remaining Balance</span>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${balance === 0 ? 'text-green-600' : balance > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {formatCurrency(Math.abs(balance))}
                      </div>
                      {balance === 0 && (
                        <Badge variant="success" className="mt-1">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Fully Paid
                        </Badge>
                      )}
                      {balance < 0 && (
                        <Badge variant="secondary" className="mt-1">
                          Overpayment
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assessment Details - Comprehensive Fee Breakdown */}
          {financial.fees.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle>Assessment Details</CardTitle>
                </div>
                <CardDescription>
                  Complete breakdown of all fees assigned by the Business Office
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Fee Description</TableHead>
                        <TableHead className="text-center">Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Tuition Row */}
                      <TableRow className="bg-blue-50/50">
                        <TableCell>
                          <div>
                            <div className="font-medium">Tuition Fee</div>
                            <div className="text-xs text-muted-foreground">
                              {financial.enrolledUnits} units @ {formatCurrency(financial.tuitionRatePerUnit)}/unit
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-primary text-primary-foreground">Tuition</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(financial.totalTuition)}
                        </TableCell>
                      </TableRow>

                      {/* All Fees */}
                      {financial.fees.map((fee, index) => (
                        <TableRow key={fee.id} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                          <TableCell>
                            <div className="font-medium">{fee.name}</div>
                            {fee.description && (
                              <div className="text-xs text-muted-foreground mt-0.5">{fee.description}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="outline" 
                              className={
                                fee.category === "mandatory" ? "border-purple-500 text-purple-700" :
                                fee.category === "laboratory" ? "border-orange-500 text-orange-700" :
                                fee.category === "program" || fee.category === "program-specific" ? "border-green-500 text-green-700" :
                                fee.category === "miscellaneous" ? "border-yellow-500 text-yellow-700" :
                                fee.category === "osf" ? "border-pink-500 text-pink-700" :
                                "border-gray-500 text-gray-700"
                              }
                            >
                              {fee.category === "osf" ? "OSF" : 
                               fee.category === "program-specific" ? "Program" :
                               fee.category.charAt(0).toUpperCase() + fee.category.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(fee.amount)}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Subtotal */}
                      <TableRow className="bg-primary/5 border-t-2">
                        <TableCell colSpan={2} className="font-bold">
                          Subtotal (Before Discounts)
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(financial.totalTuition + financial.totalFees)}
                        </TableCell>
                      </TableRow>

                      {/* Discounts */}
                      {financial.discounts.map((discount) => (
                        <TableRow key={discount.id} className="bg-green-50/50">
                          <TableCell>
                            <div className="font-medium text-green-900">{discount.name}</div>
                            <div className="text-xs text-green-700">
                              {discount.type === "percentage" ? `${discount.value}% discount` : `Fixed amount`}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="success">Discount</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-700">
                            -{formatCurrency(discount.appliedAmount)}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Total Amount Due */}
                      <TableRow className="bg-primary/10 border-t-2">
                        <TableCell colSpan={2} className="font-bold text-lg">
                          Total Amount Due
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg">
                          {formatCurrency(financial.totalAmountDue)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Legend */}
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Category Legend:</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default" className="bg-blue-600 text-xs">Tuition</Badge>
                    <Badge variant="outline" className="border-purple-500 text-purple-700 text-xs">Mandatory</Badge>
                    <Badge variant="outline" className="border-orange-500 text-orange-700 text-xs">Laboratory</Badge>
                    <Badge variant="outline" className="border-green-500 text-green-700 text-xs">Program</Badge>
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700 text-xs">Miscellaneous</Badge>
                    <Badge variant="outline" className="border-pink-500 text-pink-700 text-xs">OSF</Badge>
                    <Badge className="bg-green-600 text-xs">Discount</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discounts & Scholarships */}
          {financial.discounts.length > 0 && (
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => toggleSection("discounts")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-600" />
                    <CardTitle>Discounts & Scholarships</CardTitle>
                  </div>
                  {expandedSections.discounts ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
              {expandedSections.discounts && (
                <CardContent>
                  <div className="space-y-2">
                    {financial.discounts.map(discount => (
                      <div key={discount.id} className="flex justify-between items-center p-3 border border-green-200 bg-green-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-green-900">{discount.name}</div>
                          <div className="text-xs text-green-700">{discount.type === "percentage" ? `${discount.value}% discount` : `Fixed ${formatCurrency(discount.value)}`}</div>
                        </div>
                        <span className="font-bold text-green-700">-{formatCurrency(discount.appliedAmount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-3 bg-green-600 text-white rounded-lg mt-3">
                      <span className="font-medium">Total Discounts</span>
                      <span className="font-bold">-{formatCurrency(financial.totalDiscounts)}</span>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Payment History */}
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection("payments")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  <CardTitle>Payment History</CardTitle>
                  <Badge variant="secondary">{payments.length} {payments.length === 1 ? 'payment' : 'payments'}</Badge>
                </div>
                {expandedSections.payments ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
            {expandedSections.payments && (
              <CardContent>
                {payments.length === 0 ? (
                  <div className="py-8">
                    <EmptyState
                      icon={Receipt}
                      title="No payments yet"
                      description="Payment history will appear here once payments are posted by the Business Office."
                    />
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>OR Number</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map(payment => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium font-mono text-sm">
                              {payment.orNumber}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {payment.referenceNumber || "—"}
                            </TableCell>
                            <TableCell className="font-medium text-blue-600">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {payment.paymentMethod.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDate(payment.datePosted)}
                            </TableCell>
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Last Updated */}
          <div className="text-center text-xs text-muted-foreground">
            Last updated: {formatDate(financial.lastUpdated)}
          </div>
        </>
      )}
    </div>
  );
}