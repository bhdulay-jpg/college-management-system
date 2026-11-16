"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { 
  DollarSign, 
  Download, 
  CheckCircle, 
  Receipt,
  FileText,
  ArrowRight,
  Percent
} from "lucide-react";
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { useRouter } from "../../router";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { StudentPageHeader } from "../../student-page-header";
import { DashboardLayout } from "../dashboard-layout";

interface FeeItem {
  id: string;
  name: string;
  amount: number;
  category: "tuition" | "laboratory" | "miscellaneous" | "osf" | "program-specific";
  description?: string;
}

interface Payment {
  id: string;
  studentId: string;
  amount: number;
  status: "verified";
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
  lastUpdated: string;
  schoolYear: string;
  semester?: string;
}

export function TuitionFees() {
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [financial, setFinancial] = useState<StudentFinancial | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [userStudentId, setUserStudentId] = useState<string>("");

  useEffect(() => {
    let unsubscribeFinancial: (() => void) | undefined;
    let unsubscribePayments: (() => void) | undefined;
    let unsubscribeEnrollments: (() => void) | undefined;
    
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      unsubscribeFinancial?.();
      unsubscribePayments?.();
      unsubscribeEnrollments?.();
      unsubscribeFinancial = undefined;
      unsubscribePayments = undefined;
      unsubscribeEnrollments = undefined;

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // First, get the user's custom studentId from the users collection
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (!userDoc.exists()) {
          console.error("User document not found");
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        const customStudentId = userData.studentId || "";
        setUserStudentId(customStudentId);

        // Real-time listener for student financial record
        // Try both custom studentId and Firebase UID for backwards compatibility
        const queryStudentId = customStudentId || user.uid;
        console.log("[Tuition & Fees] Querying with studentId:", queryStudentId, "(custom:", customStudentId, ", uid:", user.uid, ")");
        
        const financialQuery = query(
          collection(db, "studentFinancials"),
          where("studentId", "==", queryStudentId)
        );

        unsubscribeFinancial = onSnapshot(financialQuery, async (snapshot) => {
          if (!snapshot.empty) {
            const docData = snapshot.docs[0];
            const financialData = docData.data();
            console.log("[Tuition & Fees] Financial data received:", financialData);
            console.log("[Tuition & Fees] Fees array:", financialData.fees);
            console.log("[Tuition & Fees] Total Tuition:", financialData.totalTuition);
            console.log("[Tuition & Fees] Total Amount Due:", financialData.totalAmountDue);
            setFinancial({
              id: docData.id,
              ...financialData
            } as StudentFinancial);
          } else {
            // If no record found with custom studentId, try with Firebase UID as fallback
            if (customStudentId && customStudentId !== user.uid) {
              console.log("[Tuition & Fees] No record found with custom studentId, trying Firebase UID:", user.uid);
              const fallbackQuery = query(
                collection(db, "studentFinancials"),
                where("studentId", "==", user.uid)
              );
              const fallbackSnapshot = await getDocs(fallbackQuery);
              
              if (!fallbackSnapshot.empty) {
                const docData = fallbackSnapshot.docs[0];
                const financialData = docData.data();
                console.log("[Tuition & Fees] Financial data found with Firebase UID:", financialData);
                setFinancial({
                  id: docData.id,
                  ...financialData
                } as StudentFinancial);
                setLoading(false);
                return;
              }
            }
            
            console.log("[Tuition & Fees] No financial record found for studentId:", queryStudentId);
            setFinancial(null);
          }
          setLoading(false);
        });

        // Store payments data to combine from both sources
        let verifiedPayments: Payment[] = [];
        let enrollmentPayments: Payment[] = [];
        let isPaymentsLoaded = false;
        let isEnrollmentsLoaded = false;

        const combineAndSetPayments = () => {
          if (!isPaymentsLoaded || !isEnrollmentsLoaded) return;
          
          const allPayments = [...verifiedPayments, ...enrollmentPayments];
          console.log("[Tuition & Fees] Verified payments found:", allPayments.length);
          console.log("[Tuition & Fees] Total payment amount:", allPayments.reduce((sum, p) => sum + p.amount, 0));
          setPayments(allPayments);
        };

        // Real-time listener for verified payments using Firebase UID
        const paymentsQuery = query(
          collection(db, "payments"),
          where("studentId", "==", user.uid),
          where("status", "==", "verified")
        );

        unsubscribePayments = onSnapshot(paymentsQuery, (paymentsSnapshot) => {
          verifiedPayments = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            studentId: user.uid,
            amount: doc.data().amount,
            status: "verified" as const
          }));

          isPaymentsLoaded = true;
          combineAndSetPayments();
        }, (error) => {
          console.error("[Tuition & Fees] Error fetching verified payments:", error);
          verifiedPayments = [];
          isPaymentsLoaded = true;
          combineAndSetPayments();
        });

        // Real-time listener for verified enrollment downpayments
        const enrollmentEmail = user.email || userData.email;
        if (enrollmentEmail) {
          const enrollmentQuery = query(
            collection(db, "enrollments"),
            where("email", "==", enrollmentEmail),
            where("paymentStatus", "==", "verified")
          );
          
          unsubscribeEnrollments = onSnapshot(enrollmentQuery, (enrollmentSnapshot) => {
            enrollmentPayments = enrollmentSnapshot.docs.map(doc => ({
              id: `enrollment-${doc.id}`,
              studentId: user.uid,
              amount: Number(doc.data().amount) || 0,
              status: "verified" as const
            }));

            isEnrollmentsLoaded = true;
            combineAndSetPayments();
          }, (error) => {
            console.error("[Tuition & Fees] Error fetching enrollment payments:", error);
            enrollmentPayments = [];
            isEnrollmentsLoaded = true;
            combineAndSetPayments();
          });
        } else {
          console.error("[Tuition & Fees] User email is unavailable; enrollment payments cannot be loaded.");
          isEnrollmentsLoaded = true;
          combineAndSetPayments();
        }
      } catch (error) {
        console.error("Error loading financial data:", error);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeFinancial?.();
      unsubscribePayments?.();
      unsubscribeEnrollments?.();
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleDownloadSOA = () => {
    alert("Statement of Account download will be implemented soon.");
  };

  // Calculate total payments from actual payment records
  const calculatedTotalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

  // Calculate real remaining balance
  const calculatedRemainingBalance = financial 
    ? (financial.totalAmountDue - calculatedTotalPayments)
    : 0;

  // Group fees by category
  const groupedFees = financial?.fees.reduce((acc, fee) => {
    const category = fee.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(fee);
    return acc;
  }, {} as Record<string, FeeItem[]>) || {};

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "tuition": return "Tuition";
      case "laboratory": return "Laboratory Fees";
      case "miscellaneous": return "Miscellaneous Fees";
      case "osf": return "Other School Fees";
      case "program-specific": return "Program-Specific Fees";
      default: return "Other Fees";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "tuition": return "bg-primary/10 text-primary border-primary/20";
      case "laboratory": return "bg-warning/10 text-warning border-warning/20";
      case "miscellaneous": return "bg-accent/10 text-accent border-accent/20";
      case "osf": return "bg-secondary/10 text-secondary border-secondary/20";
      case "program-specific": return "bg-success/10 text-success border-success/20";
      default: return "bg-muted/50 text-muted-foreground border-border";
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole="Student" userName="Student" notificationCount={0}>
        <LoadingState message="Loading financial assessment..." />
      </DashboardLayout>
    );
  }

  if (!financial) {
    return (
      <DashboardLayout userRole="Student" userName="Student" notificationCount={0}>
        <div className="min-h-screen bg-background">
          <StudentPageHeader
            title="Tuition & Fees"
            description="View your detailed financial assessment"
            icon={DollarSign}
          />
          <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 space-y-6">
            <Card className="border-0 elevation-md bg-card">
              <CardContent className="py-12">
                <EmptyState
                  icon={Receipt}
                  title="Assessment pending"
                  description="Your tuition and fees assessment will appear here once processed by the Business Office."
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Student" userName="Student" notificationCount={0}>
      <div className="min-h-screen bg-background">
        <StudentPageHeader
          title="Tuition & Fees Assessment"
          description="Complete breakdown of your financial obligations"
          icon={DollarSign}
          action={
            <div className="flex gap-2">
              <Button onClick={() => navigate("dashboard/student/payments")} variant="default" size="sm">
                <ArrowRight className="h-4 w-4 mr-2" />
                Go to Payments
              </Button>
              <Button onClick={handleDownloadSOA} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download SOA
              </Button>
            </div>
          }
        />

        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 space-y-6">
          {/* Student Info Banner */}
          <Card className="border-0 elevation-md bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">{financial.studentName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {financial.program} • Year {financial.yearLevel}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {financial.semester && `${financial.semester} • `}School Year: {financial.schoolYear}
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{financial.enrolledUnits}</div>
                    <div className="text-xs text-muted-foreground">Units</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(financial.tuitionRatePerUnit)}</div>
                    <div className="text-xs text-muted-foreground">Per Unit</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-0 elevation-sm bg-card">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Total Assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{formatCurrency(financial.totalAmountDue)}</div>
                <p className="text-xs text-muted-foreground mt-1">Amount you owe this term</p>
              </CardContent>
            </Card>

            <Card className="border-0 elevation-sm bg-card">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Verified Payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(calculatedTotalPayments)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {payments.length} payment{payments.length !== 1 ? 's' : ''} received
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 elevation-sm bg-card">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  Remaining Balance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${calculatedRemainingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(Math.abs(calculatedRemainingBalance))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {calculatedRemainingBalance === 0 ? 'Fully paid!' : calculatedRemainingBalance < 0 ? 'Overpayment' : 'Still outstanding'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Assessment Breakdown */}
          <Card className="border-0 elevation-md bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Assessment Breakdown
              </CardTitle>
              <CardDescription>
                Detailed view of all tuition and fees assessed for this term
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Assessment Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type of Fee</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Tuition Row */}
                    <TableRow className="bg-blue-50/50 dark:bg-blue-950/20">
                      <TableCell className="font-semibold">Tuition Fee</TableCell>
                      <TableCell className="text-muted-foreground">
                        {financial.enrolledUnits} units × {formatCurrency(financial.tuitionRatePerUnit)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(financial.totalTuition)}
                      </TableCell>
                    </TableRow>

                    {/* All Other Fees */}
                    {financial.fees && financial.fees.length > 0 && financial.fees.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {fee.name}
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(fee.category)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {fee.description || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(fee.amount)}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Subtotal Row */}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={2} className="font-semibold">
                        Subtotal (Tuition + Fees)
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(financial.totalTuition + financial.totalFees)}
                      </TableCell>
                    </TableRow>

                    {/* Discounts Section */}
                    {financial.discounts && financial.discounts.length > 0 && (
                      <>
                        {financial.discounts.map((discount) => (
                          <TableRow key={discount.id} className="bg-green-50/50 dark:bg-green-950/20">
                            <TableCell className="font-medium text-green-700 dark:text-green-400">
                              <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4" />
                                {discount.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {discount.type === "percentage" ? `${discount.value}% discount` : "Fixed discount"}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                              -{formatCurrency(discount.appliedAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}

                    {/* Total Amount Due Row */}
                    <TableRow className="bg-primary/5 border-t-2">
                      <TableCell colSpan={2} className="text-lg font-bold">
                        Total Amount Due
                      </TableCell>
                      <TableCell className="text-right text-2xl font-bold text-primary">
                        {formatCurrency(financial.totalAmountDue)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  );
}
