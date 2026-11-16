"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Checkbox } from "../../ui/checkbox";
import { 
  Search,
  Plus,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  BookOpen
} from "lucide-react";
import { collection, query, onSnapshot, addDoc, updateDoc, doc, where, getDocs, deleteDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { toast } from "sonner@2.0.3";
import { formatProgramDisplay } from "../../../lib/program-service";
import { usePrograms } from "../../../hooks/use-programs";

interface Student {
  id: string;
  studentId: string;
  name: string;
  program: string;
  yearLevel: string;
  email?: string;
  role: string;
}

interface TuitionRate {
  id: string;
  program: string;
  yearLevel: string;
  ratePerUnit: number;
}

interface FeeTemplate {
  id: string;
  name: string;
  amount: number;
  category: "tuition" | "laboratory" | "miscellaneous" | "osf" | "program-specific";
  applicablePrograms: string[];
  schoolYear?: string;
  semester?: string;
  isActive: boolean;
  description?: string;
}

interface FeeItem {
  id: string;
  name: string;
  amount: number;
  category: "tuition" | "laboratory" | "miscellaneous" | "osf" | "program-specific";
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
  discounts: any[];
  totalTuition: number;
  totalFees: number;
  totalDiscounts: number;
  totalAmountDue: number;
  totalPayments: number;
  remainingBalance: number;
  lastUpdated: string;
  schoolYear: string;
  semester?: string;
  paymentHistory?: PaymentRecord[];
}

interface EnrolledSubject {
  id: string;
  studentId: string;
  subjectId?: string;
  subjectCode: string;
  subjectName: string;
  units: number;
  status: string;
  schoolYear?: string;
  semester?: string;
  isLaboratory?: boolean;
}

interface PaymentRecord {
  id: string;
  applicationId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  verifiedAt: any;
  type: "enrollment_downpayment" | "manual_payment";
}

export function StudentAssessment() {
  const { programs: availablePrograms } = usePrograms();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [tuitionRates, setTuitionRates] = useState<TuitionRate[]>([]);
  const [feeTemplates, setFeeTemplates] = useState<FeeTemplate[]>([]);
  const [financials, setFinancials] = useState<StudentFinancial[]>([]);
  const [enrolledSubjects, setEnrolledSubjects] = useState<EnrolledSubject[]>([]);
  const [subjectLaboratoryFlags, setSubjectLaboratoryFlags] = useState<Record<string, boolean>>({});
  const [currentStudentSubjects, setCurrentStudentSubjects] = useState<EnrolledSubject[]>([]);
  const [currentStudentPayments, setCurrentStudentPayments] = useState<PaymentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false);
  
  const [assessmentForm, setAssessmentForm] = useState({
    enrolledUnits: "",
    schoolYear: "2024-2025",
    semester: "",
    selectedFees: [] as string[],
    useAutoUnits: true // Toggle for auto-calculation
  });


  // Normalize year level for comparison
  const normalizeYearLevel = (yearLevel: string): string => {
    const year = yearLevel.toLowerCase().trim();
    
    // Extract number from various formats
    const match = year.match(/(\d+)/);
    if (match) {
      return match[1]; // Return just the number: "1", "2", "3", "4"
    }
    
    // Handle text formats
    if (year.includes('first') || year === '1st year') return '1';
    if (year.includes('second') || year === '2nd year') return '2';
    if (year.includes('third') || year === '3rd year') return '3';
    if (year.includes('fourth') || year === '4th year') return '4';
    
    return yearLevel; // Return original if no match
  };

  // Real-time listeners
  useEffect(() => {
    console.log("[Student Assessment] Setting up listeners...");
    
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      console.log("[Student Assessment] Auth state:", currentUser ? "User logged in" : "No user");
      
      if (!currentUser) {
        console.log("[Student Assessment] No authenticated user");
        setLoading(false);
        return;
      }

      console.log("[Student Assessment] User ID:", currentUser.uid);

      // Fetch students with multiple possible role values
      const studentsQuery = query(
        collection(db, "users")
      );

      const unsubscribeStudents = onSnapshot(
        studentsQuery, 
        (snapshot) => {
          console.log("[Student Assessment] Firestore snapshot received, docs:", snapshot.docs.length);
          
          // Filter students by role (case-insensitive)
          const studentsData = snapshot.docs
            .map(doc => {
              const data = doc.data();
              console.log("[Student Assessment] User doc:", doc.id, "Role:", data.role);
              return {
                id: doc.id, // Firebase UID
                studentId: data.studentId || doc.id, // Custom studentId field, fallback to Firebase UID if not set
                name: data.name || "",
                program: data.program || "",
                yearLevel: data.yearLevel || "",
                email: data.email || "",
                role: data.role
              };
            })
            .filter(user => {
              // Case-insensitive role check
              const role = (user.role || "").toLowerCase();
              const isStudent = role === "student";
              if (isStudent) {
                console.log("[Student Assessment] Found student:", user.name, user.program);
              }
              return isStudent;
            }) as Student[];
          
          console.log("[Student Assessment] Filtered students count:", studentsData.length);
          setStudents(studentsData);
          setLoading(false);
        },
        (error) => {
          console.error("[Student Assessment] Error fetching students:", error);
          toast.error("Failed to load students: " + error.message);
          setLoading(false);
        }
      );

      // Fetch tuition rates
      const unsubscribeTuition = onSnapshot(collection(db, "tuitionRates"), (snapshot) => {
        const rates = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TuitionRate[];
        setTuitionRates(rates);
      });

      // Fetch fee templates
      const unsubscribeFees = onSnapshot(collection(db, "feeTemplates"), (snapshot) => {
        const fees = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FeeTemplate[];
        setFeeTemplates(fees);
      });

      // Fetch financial records
      const unsubscribeFinancials = onSnapshot(collection(db, "studentFinancials"), (snapshot) => {
        const financialsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as StudentFinancial[];
        setFinancials(financialsData);
      });

      // Fetch enrolled subjects
      const unsubscribeEnrolledSubjects = onSnapshot(collection(db, "studentSubjects"), (snapshot) => {
        const subjectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          studentId: doc.data().studentId || "",
          subjectId: doc.data().subjectId || "",
          subjectCode: doc.data().subjectCode || "",
          subjectName: doc.data().subjectName || "",
          units: doc.data().units || 0,
          status: doc.data().status || "",
          schoolYear: doc.data().schoolYear || "",
          semester: doc.data().semester || "",
          isLaboratory: doc.data().isLaboratory === true,
        })) as EnrolledSubject[];
        setEnrolledSubjects(subjectsData);
      });

      const unsubscribeSubjects = onSnapshot(collection(db, "subjects"), (snapshot) => {
        const flags: Record<string, boolean> = {};
        snapshot.docs.forEach(subjectDoc => {
          if (subjectDoc.data().isLaboratory === true) {
            flags[subjectDoc.id] = true;
          }
        });
        setSubjectLaboratoryFlags(flags);
      }, (error) => {
        console.error("[Student Assessment] Error fetching subject lab classifications:", error);
        toast.error("Failed to load laboratory subject classifications");
      });

      return () => {
        unsubscribeStudents();
        unsubscribeTuition();
        unsubscribeFees();
        unsubscribeFinancials();
        unsubscribeEnrolledSubjects();
        unsubscribeSubjects();
      };
    });

    return () => unsubscribeAuth();
  }, []);

  // Get applicable fees for a student
  const getApplicableFees = (
    studentProgram: string,
    schoolYear = assessmentForm.schoolYear,
    semester = assessmentForm.semester
  ) => {
    return feeTemplates.filter(fee => {
      const feeSchoolYear = fee.schoolYear?.trim();
      const feeSemester = fee.semester?.trim();
      return fee.isActive &&
        (!fee.applicablePrograms || fee.applicablePrograms.length === 0 || fee.applicablePrograms.includes(studentProgram)) &&
        (!feeSchoolYear || feeSchoolYear === schoolYear.trim()) &&
        (!feeSemester || !semester || feeSemester === semester);
    });
  };

  // Get tuition rate for a student
  const getTuitionRate = (program: string, yearLevel: string) => {
    console.log("[Student Assessment] Looking for tuition rate:");
    console.log("  - Student Program:", JSON.stringify(program));
    console.log("  - Student Year Level:", JSON.stringify(yearLevel));
    console.log("[Student Assessment] Available tuition rates:");
    tuitionRates.forEach((r, index) => {
      console.log(`  ${index + 1}. Program: ${JSON.stringify(r.program)}, Year: ${JSON.stringify(r.yearLevel)}, Rate: ${r.ratePerUnit}`);
    });
    
    const rate = tuitionRates.find(rate => 
      rate.program === program && normalizeYearLevel(rate.yearLevel) === normalizeYearLevel(yearLevel)
    );
    
    console.log("[Student Assessment] Found rate:", rate ? `YES - ${rate.ratePerUnit} per unit` : "NO MATCH");
    return rate;
  };

  // Check if student has existing assessment
  const hasExistingAssessment = (studentId: string, studentFirebaseId: string) => {
    // Check both custom studentId and Firebase UID to ensure we find assessments
    return financials.some(f => f.studentId === studentId || f.studentId === studentFirebaseId);
  };

  // Get existing assessment
  const getExistingAssessment = (studentId: string, studentFirebaseId: string) => {
    // Check both custom studentId and Firebase UID to ensure we find assessments
    return financials.find(f => f.studentId === studentId || f.studentId === studentFirebaseId);
  };

  // Handle create/update assessment
  const handleCreateAssessment = async () => {
    if (!selectedStudent) return;

    if (!assessmentForm.enrolledUnits || parseFloat(assessmentForm.enrolledUnits) <= 0) {
      toast.error("Please enter valid enrolled units");
      return;
    }

    if (!assessmentForm.schoolYear) {
      toast.error("Please enter school year");
      return;
    }

    const enrolledUnits = parseFloat(assessmentForm.enrolledUnits);
    
    // Get tuition rate
    const tuitionRate = getTuitionRate(selectedStudent.program, selectedStudent.yearLevel);
    if (!tuitionRate) {
      toast.error(`No tuition rate found for ${formatProgramDisplay(selectedStudent.program)} - Year ${selectedStudent.yearLevel}`);
      return;
    }

    // Calculate tuition
    const totalTuition = enrolledUnits * tuitionRate.ratePerUnit;

    // Get selected fees
    const applicableFees = getApplicableFees(selectedStudent.program);
    const selectedFeeObjects = applicableFees.filter(fee => 
      assessmentForm.selectedFees.includes(fee.id)
    );

    // Calculate total fees
    const totalFees = selectedFeeObjects.reduce((sum, fee) => sum + fee.amount, 0);

    // Map to FeeItem format
    const fees: FeeItem[] = selectedFeeObjects.map(fee => ({
      id: fee.id,
      name: fee.name,
      amount: fee.amount,
      category: fee.category
    }));

    // Calculate totals
    const totalAmountDue = totalTuition + totalFees;
    const existingAssessment = getExistingAssessment(selectedStudent.studentId, selectedStudent.id);
    const totalPayments = existingAssessment?.totalPayments || 0;
    const remainingBalance = totalAmountDue - totalPayments;

    const assessmentData = {
      studentId: selectedStudent.studentId,
      studentName: selectedStudent.name,
      program: selectedStudent.program,
      yearLevel: selectedStudent.yearLevel,
      enrolledUnits: enrolledUnits,
      tuitionRatePerUnit: tuitionRate.ratePerUnit,
      fees: fees,
      discounts: [],
      totalTuition: totalTuition,
      totalFees: totalFees,
      totalDiscounts: 0,
      totalAmountDue: totalAmountDue,
      totalPayments: totalPayments,
      remainingBalance: remainingBalance,
      lastUpdated: new Date().toISOString(),
      schoolYear: assessmentForm.schoolYear,
      semester: assessmentForm.semester || ""
    };

    try {
      if (existingAssessment) {
        // Update existing assessment
        await updateDoc(doc(db, "studentFinancials", existingAssessment.id), assessmentData);
        toast.success("Assessment updated successfully");
      } else {
        // Create new assessment
        await addDoc(collection(db, "studentFinancials"), assessmentData);
        toast.success("Assessment created successfully");
      }

      setIsAssessmentDialogOpen(false);
      setSelectedStudent(null);
      setAssessmentForm({
        enrolledUnits: "",
        schoolYear: "2024-2025",
        semester: "",
        selectedFees: [],
        useAutoUnits: true
      });
    } catch (error) {
      console.error("Error creating/updating assessment:", error);
      toast.error("Failed to save assessment");
    }
  };

  // Handle open dialog
  const handleOpenDialog = async (student: Student) => {
    setSelectedStudent(student);
    
    // Get student's enrolled subjects (studentSubjects collection uses Firebase UID, not custom studentId)
    const studentSubjects = enrolledSubjects.filter(
      s => s.studentId === student.id && s.status === "enrolled"
    );
    setCurrentStudentSubjects(studentSubjects);
    const hasLaboratorySubject = studentSubjects.some(subject =>
      subject.isLaboratory === true || subjectLaboratoryFlags[subject.subjectId || ""] === true
    );
    const subjectSchoolYear = studentSubjects.find(subject => subject.schoolYear?.trim())?.schoolYear?.trim();
    const subjectSemester = studentSubjects.find(subject => subject.semester?.trim())?.semester?.trim();
    const enrolledSchoolYear = subjectSchoolYear || "2024-2025";
    const enrolledSemester = subjectSemester || "";
    
    // Fetch verified enrollment payments for this student
    const paymentsQuery = query(
      collection(db, "enrollments"),
      where("email", "==", student.email),
      where("paymentStatus", "==", "verified")
    );
    const paymentsSnapshot = await getDocs(paymentsQuery);
    const verifiedPayments: PaymentRecord[] = paymentsSnapshot.docs.map(doc => ({
      id: doc.id,
      applicationId: doc.data().applicationId || "",
      amount: doc.data().amount || 0,
      paymentMethod: doc.data().paymentMethod || "",
      referenceNumber: doc.data().referenceNumber || "",
      verifiedAt: doc.data().verifiedAt,
      type: "enrollment_downpayment" as const
    }));
    setCurrentStudentPayments(verifiedPayments);
    console.log("[Student Assessment] Found verified payments for", student.email, ":", verifiedPayments.length);
    
    // Calculate total units from enrolled subjects
    const totalUnits = studentSubjects.reduce((sum, subject) => sum + (subject.units || 0), 0);
    
    // Pre-populate with existing assessment if available
    const existing = getExistingAssessment(student.studentId, student.id);
    if (existing) {
      const schoolYear = subjectSchoolYear || existing.schoolYear || enrolledSchoolYear;
      const semester = subjectSemester || existing.semester || enrolledSemester;
      const selectedFeeIds = new Set(existing.fees
        .filter(fee => feeTemplates.find(template => template.id === fee.id)?.category !== "laboratory" || hasLaboratorySubject)
        .map(fee => fee.id));
      if (hasLaboratorySubject) {
        getApplicableFees(student.program, schoolYear, semester)
          .filter(fee => fee.category === "laboratory")
          .forEach(fee => selectedFeeIds.add(fee.id));
      }

      setAssessmentForm({
        enrolledUnits: existing.enrolledUnits.toString(),
        schoolYear,
        semester,
        selectedFees: Array.from(selectedFeeIds),
        useAutoUnits: false
      });
    } else {
      // Auto-select all applicable fees for new assessment
      const applicableFees = getApplicableFees(student.program, enrolledSchoolYear, enrolledSemester)
        .filter(fee => fee.category !== "laboratory" || hasLaboratorySubject);
      
      setAssessmentForm({
        enrolledUnits: totalUnits > 0 ? totalUnits.toString() : "",
        schoolYear: enrolledSchoolYear,
        semester: enrolledSemester,
        selectedFees: applicableFees.map(f => f.id),
        useAutoUnits: totalUnits > 0
      });
    }
    
    setIsAssessmentDialogOpen(true);
  };

  // Toggle fee selection
  const toggleFeeSelection = (feeId: string) => {
    setAssessmentForm(prev => ({
      ...prev,
      selectedFees: prev.selectedFees.includes(feeId)
        ? prev.selectedFees.filter(id => id !== feeId)
        : [...prev.selectedFees, feeId]
    }));
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter students
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.program.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingState message="Loading student assessments..." />;
  }

  // Calculate preview if dialog is open
  const previewCalculation = selectedStudent ? (() => {
    const enrolledUnits = parseFloat(assessmentForm.enrolledUnits) || 0;
    const tuitionRate = getTuitionRate(selectedStudent.program, selectedStudent.yearLevel);
    const totalTuition = tuitionRate ? enrolledUnits * tuitionRate.ratePerUnit : 0;
    
    const applicableFees = getApplicableFees(selectedStudent.program);
    const selectedFeeObjects = applicableFees.filter(fee => 
      assessmentForm.selectedFees.includes(fee.id)
    );
    const totalFees = selectedFeeObjects.reduce((sum, fee) => sum + fee.amount, 0);
    
    // Calculate verified payments total
    const totalVerifiedPayments = currentStudentPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    const subtotal = totalTuition + totalFees;
    const remainingBalance = Math.max(0, subtotal - totalVerifiedPayments);
    
    return {
      totalTuition,
      totalFees,
      totalAmountDue: subtotal,
      totalVerifiedPayments,
      remainingBalance,
      tuitionRate: tuitionRate?.ratePerUnit || 0
    };
  })() : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <FileText className="h-5 w-5" />
          Student Assessment
        </h1>
      </div>

      {/* Students List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Students</CardTitle>
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
              icon={Search}
              title="No students found"
              description="Try adjusting your search criteria."
            />
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Year Level</TableHead>
                    <TableHead>Assessment Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map(student => {
                    const hasAssessment = hasExistingAssessment(student.studentId, student.id);
                    const assessment = getExistingAssessment(student.studentId, student.id);
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>
                          {formatProgramDisplay(student.program)}
                        </TableCell>
                        <TableCell>{student.yearLevel}</TableCell>
                        <TableCell>
                          {hasAssessment ? (
                            <div className="space-y-1">
                              <Badge variant="default" className="flex items-center gap-1 w-fit">
                                <CheckCircle className="h-3 w-3" />
                                Assessed
                              </Badge>
                              {assessment && (
                                <div className="text-xs text-muted-foreground">
                                  {assessment.enrolledUnits} units • {formatCurrency(assessment.totalAmountDue)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              <AlertCircle className="h-3 w-3" />
                              No Assessment
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={hasAssessment ? "outline" : "default"}
                            onClick={() => handleOpenDialog(student)}
                          >
                            {hasAssessment ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Update
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Create
                              </>
                            )}
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

      {/* Assessment Dialog */}
      <Dialog open={isAssessmentDialogOpen} onOpenChange={setIsAssessmentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {hasExistingAssessment(selectedStudent?.studentId || "", selectedStudent?.id || "") ? "Update" : "Create"} Assessment
            </DialogTitle>
            <DialogDescription>
              {selectedStudent?.name} • {formatProgramDisplay(selectedStudent?.program || "")} • {selectedStudent?.yearLevel}
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-6 py-4">
              {/* Enrollment Details */}
              <div className="space-y-4">
                <h4 className="font-medium">Enrollment Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="enrolledUnits">Enrolled Units *</Label>
                    <Input
                      id="enrolledUnits"
                      type="number"
                      placeholder="0"
                      value={assessmentForm.enrolledUnits}
                      onChange={(e) => setAssessmentForm({...assessmentForm, enrolledUnits: e.target.value, useAutoUnits: false})}
                      disabled={assessmentForm.useAutoUnits}
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="useAutoUnits"
                        checked={assessmentForm.useAutoUnits}
                        onCheckedChange={(checked) => {
                          // studentSubjects collection uses Firebase UID, not custom studentId
                          const studentSubjects = enrolledSubjects.filter(
                            s => s.studentId === selectedStudent.id && s.status === "enrolled"
                          );
                          const totalUnits = studentSubjects.reduce((sum, subject) => sum + (subject.units || 0), 0);
                          setAssessmentForm({...assessmentForm, useAutoUnits: !!checked, enrolledUnits: checked ? totalUnits.toString() : assessmentForm.enrolledUnits});
                        }}
                      />
                      <Label htmlFor="useAutoUnits" className="cursor-pointer text-sm">
                        Auto-calculate from enrolled subjects
                      </Label>
                    </div>
                    {currentStudentSubjects.length > 0 && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Enrolled Subjects ({currentStudentSubjects.length})</span>
                        </div>
                        <div className="space-y-1">
                          {currentStudentSubjects.map(subject => (
                            <div key={subject.id} className="text-xs text-muted-foreground flex justify-between">
                              <span>{subject.subjectCode} - {subject.subjectName}</span>
                              <span className="font-medium">{subject.units} units</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t text-sm font-medium flex justify-between">
                          <span>Total Units:</span>
                          <span className="text-blue-600">
                            {currentStudentSubjects.reduce((sum, s) => sum + (s.units || 0), 0)} units
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schoolYear">School Year *</Label>
                    <Input
                      id="schoolYear"
                      placeholder="e.g., 2024-2025"
                      value={assessmentForm.schoolYear}
                      onChange={(e) => setAssessmentForm({...assessmentForm, schoolYear: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="semester">Semester (Optional)</Label>
                    <Select 
                      value={assessmentForm.semester}
                      onValueChange={(value) => setAssessmentForm({...assessmentForm, semester: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1st Semester">1st Semester</SelectItem>
                        <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                        <SelectItem value="Summer">Summer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Tuition Preview */}
              {previewCalculation && previewCalculation.tuitionRate > 0 && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-muted-foreground">Tuition Rate per Unit</div>
                      <div className="font-medium">{formatCurrency(previewCalculation.tuitionRate)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Total Tuition</div>
                      <div className="text-lg font-bold text-blue-600">
                        {formatCurrency(previewCalculation.totalTuition)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Warning when no tuition rate found */}
              {previewCalculation && previewCalculation.tuitionRate === 0 && parseFloat(assessmentForm.enrolledUnits || "0") > 0 && (
                <div className="border rounded-lg p-4 bg-orange-50 border-orange-200">
                  <div className="flex items-center gap-2 text-orange-900">
                    <AlertCircle className="h-4 w-4" />
                    <div className="text-sm">
                      <div className="font-medium">No tuition rate configured</div>
                      <div className="text-orange-700 mt-1">
                        Please configure a tuition rate for {formatProgramDisplay(selectedStudent?.program || "")} - Year {selectedStudent?.yearLevel} in Fee Configuration.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fee Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Applicable Fees</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const applicableFees = getApplicableFees(selectedStudent.program);
                      setAssessmentForm({
                        ...assessmentForm,
                        selectedFees: assessmentForm.selectedFees.length === applicableFees.length
                          ? []
                          : applicableFees.map(f => f.id)
                      });
                    }}
                  >
                    {assessmentForm.selectedFees.length === getApplicableFees(selectedStudent.program).length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>

                <div className="border rounded-lg">
                  {getApplicableFees(selectedStudent.program).length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No applicable fees found for this program and school year.
                      <br />
                      Please add fees in Fee Configuration.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {getApplicableFees(selectedStudent.program).map(fee => (
                        <div
                          key={fee.id}
                          className="flex items-center justify-between p-4 hover:bg-accent cursor-pointer"
                          onClick={() => toggleFeeSelection(fee.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={assessmentForm.selectedFees.includes(fee.id)}
                              onCheckedChange={() => toggleFeeSelection(fee.id)}
                            />
                            <div>
                              <div className="font-medium">{fee.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {fee.category.charAt(0).toUpperCase() + fee.category.slice(1)}
                                {fee.description && ` • ${fee.description}`}
                              </div>
                            </div>
                          </div>
                          <div className="font-medium text-blue-600">
                            {formatCurrency(fee.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Verified Payments History */}
              {currentStudentPayments.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Verified Payments</h4>
                  <div className="border rounded-lg p-3 bg-green-50">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Enrollment Downpayments ({currentStudentPayments.length})</span>
                    </div>
                    <div className="space-y-1">
                      {currentStudentPayments.map(payment => (
                        <div key={payment.id} className="text-xs text-green-900 flex justify-between py-1">
                          <span>{payment.applicationId} • {payment.paymentMethod}</span>
                          <span className="font-medium">{formatCurrency(payment.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-green-200 text-sm font-medium flex justify-between">
                      <span className="text-green-900">Total Paid:</span>
                      <span className="text-green-600">
                        {formatCurrency(currentStudentPayments.reduce((sum, p) => sum + p.amount, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Total Preview */}
              {previewCalculation && (
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Tuition:</span>
                    <span className="font-medium">{formatCurrency(previewCalculation.totalTuition)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Fees:</span>
                    <span className="font-medium">{formatCurrency(previewCalculation.totalFees)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Verified Payments:</span>
                    <span className="font-medium">{formatCurrency(previewCalculation.totalVerifiedPayments)}</span>
                  </div>
                  <div className="flex justify-between text-lg border-t pt-2">
                    <span className="font-semibold">Total Amount Due:</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(previewCalculation.totalAmountDue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg border-t pt-2">
                    <span className="font-semibold">Remaining Balance:</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(previewCalculation.remainingBalance)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssessmentDialogOpen(false);
                setSelectedStudent(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateAssessment}>
              {hasExistingAssessment(selectedStudent?.studentId || "", selectedStudent?.id || "") ? "Update" : "Create"} Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}