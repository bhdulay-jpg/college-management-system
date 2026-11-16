"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import {
  Users, Search, X, Loader2, BookOpen, Calendar, Clock, 
  MapPin, User, AlertCircle, CheckCircle, Trash2, Eye, Edit, 
  FileText, Shield, TrendingUp, Archive, Info
} from "lucide-react";
import { collection, query, onSnapshot, where, getDocs, deleteDoc, doc, updateDoc, arrayRemove, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { toast } from "sonner@2.0.3";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { PageHeader } from "../shared/page-header";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";

interface StudentEnrollment {
  id: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  scheduleId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  units: number;
  yearLevel: string;
  semester: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  teacherName: string;
  schoolYear: string;
  status: string;
  enrolledAt: any;
  program?: string;
  // Grade information
  midtermGrade?: number;
  finalExamGrade?: number;
  finalGrade?: number;
  gradeStatus?: "none" | "in-progress" | "final";
}

interface GradeRecord {
  id: string;
  studentId: string;
  subjectCode: string;
  gradeType?: "Midterm" | "Final";
  percentage?: number;
  midtermGrade?: number;
  finalExamGrade?: number;
  finalGrade?: number;
  semester?: string;
  schoolYear?: string;
  updatedAt?: any;
  createdAt?: any;
}

interface StudentInfo {
  uid: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  program: string;
  yearLevel: string;
  semester: string;
}

interface AuditLog {
  action: "drop" | "edit" | "override_drop";
  registrarUid: string;
  registrarName: string;
  studentId: string;
  studentName: string;
  subjectCode: string;
  subjectName: string;
  previousValues?: any;
  newValues?: any;
  gradeStatusAtTime: string;
  midtermGrade?: number;
  finalExamGrade?: number;
  finalGrade?: number;
  transcriptNotation?: string;
  reason?: string;
  overrideUsed: boolean;
  timestamp: any;
}

interface DropDialogState {
  enrollment: StudentEnrollment | null;
  requiresOverride: boolean;
  warning: string;
  transcriptNotation: string;
}

export function ManageEnrollmentsPage() {
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [studentSubjectEnrollments, setStudentSubjectEnrollments] = useState<StudentEnrollment[]>([]);
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [selectedStudentEnrollments, setSelectedStudentEnrollments] = useState<StudentEnrollment[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dropDialogState, setDropDialogState] = useState<DropDialogState | null>(null);
  const [dropReason, setDropReason] = useState("");
  const [overridePassword, setOverridePassword] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [currentRegistrar, setCurrentRegistrar] = useState<{ uid: string; name: string } | null>(null);

  // Get current registrar info
  useEffect(() => {
    const getCurrentRegistrar = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const userQuery = query(
          collection(db, "users"),
          where("uid", "==", currentUser.uid)
        );
        const snapshot = await getDocs(userQuery);
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          setCurrentRegistrar({
            uid: currentUser.uid,
            name: `${userData.firstName} ${userData.lastName}`
          });
        }
      } catch (error) {
        console.error("Error fetching registrar info:", error);
      }
    };

    getCurrentRegistrar();
  }, []);

  // Load all students
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "Student"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({
        uid: doc.data().uid || doc.id,
        studentId: doc.data().studentId,
        firstName: doc.data().firstName,
        lastName: doc.data().lastName,
        email: doc.data().email,
        program: doc.data().program || "",
        yearLevel: doc.data().yearLevel || "",
        semester: doc.data().semester || "",
      })) as StudentInfo[];
      
      setStudents(studentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load active student subject enrollments
  useEffect(() => {
    const q = query(collection(db, "studentSubjects"), where("status", "==", "enrolled"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudentSubjectEnrollments(snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as StudentEnrollment[]);
    }, (error) => {
      console.error("Error fetching active enrollments:", error);
      toast.error("Failed to load active enrollments");
    });

    return () => unsubscribe();
  }, []);

  // Keep the registrar enrollment view in sync with teacher gradebook updates.
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "grades"), (snapshot) => {
      setGradeRecords(snapshot.docs.map(gradeDoc => ({
        id: gradeDoc.id,
        ...gradeDoc.data(),
      })) as GradeRecord[]);
    }, (error) => {
      console.error("Error fetching enrollment grades:", error);
      toast.error("Failed to load grades for enrollments");
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const normalize = (value: string | undefined) => (value || "").trim().toLowerCase();
    const gradeTime = (value: any) => {
      if (value?.toMillis) return value.toMillis();
      if (value instanceof Date) return value.getTime();
      const timestamp = Date.parse(value || "");
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };

    const enrollmentsData = studentSubjectEnrollments.map(enrollment => {
      const student = students.find(item =>
        item.uid === enrollment.studentId || item.studentId === enrollment.studentId
      );
      const studentIds = new Set([enrollment.studentId, student?.studentId].filter(Boolean).map(normalize));
      const subjectGrades = gradeRecords.filter(grade =>
        studentIds.has(normalize(grade.studentId)) &&
        normalize(grade.subjectCode) === normalize(enrollment.subjectCode)
      );
      const matchingTermGrades = subjectGrades.filter(grade =>
        (!enrollment.schoolYear || !grade.schoolYear || grade.schoolYear === enrollment.schoolYear) &&
        (!enrollment.semester || !grade.semester || grade.semester === enrollment.semester)
      );
      const relevantGrades = matchingTermGrades.length > 0 ? matchingTermGrades : subjectGrades;
      const latestGrade = (gradeType: "Midterm" | "Final") => relevantGrades
        .filter(grade => grade.gradeType?.toLowerCase() === gradeType.toLowerCase())
        .sort((a, b) => gradeTime(b.updatedAt || b.createdAt) - gradeTime(a.updatedAt || a.createdAt))[0];
      const legacyGrade = relevantGrades
        .filter(grade => grade.midtermGrade != null || grade.finalGrade != null)
        .sort((a, b) => gradeTime(b.updatedAt || b.createdAt) - gradeTime(a.updatedAt || a.createdAt))[0];

      const midtermGrade = legacyGrade?.midtermGrade ?? latestGrade("Midterm")?.percentage;
      const finalExamGrade = legacyGrade?.finalExamGrade ?? latestGrade("Final")?.percentage;
      const finalGrade = legacyGrade?.finalGrade ??
        (midtermGrade != null && finalExamGrade != null ? (midtermGrade + finalExamGrade) / 2 : undefined);
      const gradeStatus = finalGrade != null
        ? "final"
        : midtermGrade != null || finalExamGrade != null
          ? "in-progress"
          : "none";
      return {
        ...enrollment,
        midtermGrade,
        finalExamGrade,
        finalGrade,
        gradeStatus,
        studentName: student ? `${student.firstName} ${student.lastName}` : enrollment.studentId,
        studentEmail: student?.email,
        program: student?.program,
      } as StudentEnrollment;
    });

    setEnrollments(enrollmentsData);
  }, [studentSubjectEnrollments, gradeRecords, students]);

  const formatTime = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getGradeDisplay = (enrollment: StudentEnrollment): { display: string; className: string } => {
    if (enrollment.gradeStatus === "final" && enrollment.finalGrade !== undefined) {
      return {
        display: enrollment.finalGrade.toFixed(2),
        className: "text-success font-semibold"
      };
    } else if (enrollment.gradeStatus === "in-progress") {
      const currentGrade = enrollment.midtermGrade ?? enrollment.finalExamGrade;
      return {
        display: currentGrade !== undefined ? `In Progress (${currentGrade.toFixed(2)})` : "In Progress",
        className: "text-info"
      };
    } else {
      return {
        display: "N/A",
        className: "text-muted-foreground"
      };
    }
  };

  const handleViewStudent = async (student: StudentInfo) => {
    setSelectedStudent(student);
    
    const studentEnrolls = getStudentEnrollments(student);
    setSelectedStudentEnrollments(studentEnrolls);
    setDetailsOpen(true);

    // Load audit logs for this student
    loadAuditLogs(student);
  };

  const loadAuditLogs = async (student: StudentInfo) => {
    try {
      const studentIds = Array.from(new Set([student.uid, student.studentId].filter(Boolean)));
      const snapshots = await Promise.all(studentIds.map(studentId =>
        getDocs(query(
          collection(db, "enrollmentAuditLogs"),
          where("studentId", "==", studentId)
        ))
      ));
      const logsById = new Map<string, AuditLog>();
      snapshots.forEach(snapshot => {
        snapshot.docs.forEach(logDoc => {
          logsById.set(logDoc.id, {
            id: logDoc.id,
            ...logDoc.data()
          } as AuditLog);
        });
      });
      const logs = Array.from(logsById.values());
      
      // Sort by timestamp descending
      logs.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });
      
      setAuditLogs(logs);
    } catch (error) {
      console.error("Error loading audit logs:", error);
    }
  };

  const initiateDropSubject = (enrollment: StudentEnrollment) => {
    let requiresOverride = false;
    let warning = "";
    let transcriptNotation = "";

    // Grade-dependent drop logic
    if (enrollment.gradeStatus === "final" && enrollment.finalGrade !== undefined) {
      requiresOverride = true;
      warning = `⚠️ FINAL GRADE POSTED: This subject has a final grade of ${enrollment.finalGrade.toFixed(2)}. Dropping requires administrator override and may affect the student's transcript permanently.`;
      transcriptNotation = "Dropped with Final Grade (DFG)";
    } else if (enrollment.gradeStatus === "in-progress") {
      const currentGrade = enrollment.midtermGrade ?? enrollment.finalExamGrade;
      warning = `This subject has a recorded grade${currentGrade !== undefined ? ` of ${currentGrade.toFixed(2)}` : ""}. The grade will be preserved for audit but marked as "Dropped" (DW) on the transcript and excluded from GPA calculation.`;
      transcriptNotation = "Dropped with Warning (DW)";
    } else {
      warning = "This subject has no grades recorded. It will be removed from the student's active load.";
      transcriptNotation = "Withdrawn (W)";
    }

    setDropDialogState({
      enrollment,
      requiresOverride,
      warning,
      transcriptNotation
    });
  };

  const createAuditLog = async (
    action: "drop" | "edit" | "override_drop",
    enrollment: StudentEnrollment,
    overrideUsed: boolean
  ): Promise<void> => {
    if (!currentRegistrar || !selectedStudent) return;

    try {
      const auditLog: any = {
        action,
        registrarUid: currentRegistrar.uid,
        registrarName: currentRegistrar.name,
        studentId: enrollment.studentId,
        studentName: enrollment.studentName || enrollment.studentId,
        subjectCode: enrollment.subjectCode,
        subjectName: enrollment.subjectName,
        gradeStatusAtTime: enrollment.gradeStatus || "none",
        transcriptNotation: dropDialogState?.transcriptNotation || "",
        reason: dropReason || "No reason provided",
        overrideUsed,
        timestamp: serverTimestamp(),
        previousValues: {
          status: enrollment.status,
          scheduleId: enrollment.scheduleId
        },
        newValues: {
          status: "dropped",
          droppedBy: currentRegistrar.name,
          droppedAt: new Date().toISOString()
        }
      };

      // Only add grade fields if they have actual values (not undefined)
      if (enrollment.midtermGrade !== undefined && enrollment.midtermGrade !== null) {
        auditLog.midtermGrade = enrollment.midtermGrade;
      }
      if (enrollment.finalExamGrade !== undefined && enrollment.finalExamGrade !== null) {
        auditLog.finalExamGrade = enrollment.finalExamGrade;
      }
      if (enrollment.finalGrade !== undefined && enrollment.finalGrade !== null) {
        auditLog.finalGrade = enrollment.finalGrade;
      }

      await addDoc(collection(db, "enrollmentAuditLogs"), auditLog);
      console.log("✅ Audit log created successfully");
    } catch (error) {
      console.error("Error creating audit log:", error);
      throw error;
    }
  };

  const handleDropSubject = async () => {
    if (!dropDialogState?.enrollment) return;

    const enrollment = dropDialogState.enrollment;

    // Validate override if required
    if (dropDialogState.requiresOverride) {
      // Simple override check - in production, this should be more secure
      if (overridePassword !== "OVERRIDE2024") {
        toast.error("Invalid override password");
        return;
      }
    }

    if (!dropReason.trim()) {
      toast.error("Please provide a reason for dropping this subject");
      return;
    }

    setProcessing(true);

    try {
      // Create audit log FIRST
      await createAuditLog(
        dropDialogState.requiresOverride ? "override_drop" : "drop",
        enrollment,
        dropDialogState.requiresOverride
      );

      // Update enrollment status (soft delete)
      await updateDoc(doc(db, "studentSubjects", enrollment.id), {
        status: "dropped",
        droppedAt: serverTimestamp(),
        droppedBy: currentRegistrar?.name || "Unknown",
        dropReason: dropReason,
        transcriptNotation: dropDialogState.transcriptNotation,
        overrideUsed: dropDialogState.requiresOverride
      });

      // Remove student from schedule
      const student = students.find(s =>
        s.uid === enrollment.studentId || s.studentId === enrollment.studentId
      );
      if (student && enrollment.scheduleId) {
        const scheduleRef = doc(db, "schedules", enrollment.scheduleId);
        await updateDoc(scheduleRef, {
          enrolledStudents: arrayRemove(student.uid)
        });
      }

      // If there's a grade, preserve it but mark as dropped
      if (enrollment.gradeStatus !== "none") {
        try {
          const gradesQuery = query(
            collection(db, "grades"),
            where("studentId", "==", enrollment.studentId),
            where("subjectCode", "==", enrollment.subjectCode)
          );
          const gradesSnapshot = await getDocs(gradesQuery);
          
          const matchingTermGrades = gradesSnapshot.docs.filter(gradeDoc => {
            const gradeData = gradeDoc.data();
            return (!enrollment.schoolYear || !gradeData.schoolYear || gradeData.schoolYear === enrollment.schoolYear) &&
              (!enrollment.semester || !gradeData.semester || gradeData.semester === enrollment.semester);
          });
          const gradesToUpdate = matchingTermGrades.length > 0 ? matchingTermGrades : gradesSnapshot.docs;
          await Promise.all(gradesToUpdate.map(gradeDoc => updateDoc(gradeDoc.ref, {
              status: "dropped",
              droppedAt: serverTimestamp(),
              transcriptNotation: dropDialogState.transcriptNotation,
              includeInGPA: false // Exclude from GPA calculation
          })));
        } catch (error) {
          console.error("Error updating grade record:", error);
        }
      }

      toast.success(
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Subject Dropped
          </div>
          <div className="text-xs">{enrollment.subjectCode} - {enrollment.subjectName}</div>
          <div className="text-xs">Notation: {dropDialogState.transcriptNotation}</div>
        </div>
      );

      // Update local state
      setSelectedStudentEnrollments(prev => prev.filter(e => e.id !== enrollment.id));
      
      // Reload audit logs
      if (selectedStudent) {
        loadAuditLogs(selectedStudent);
      }

      // Close dialog and reset state
      setDropDialogState(null);
      setDropReason("");
      setOverridePassword("");
    } catch (error: any) {
      console.error("Error dropping subject:", error);
      toast.error(`Failed to drop subject: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Get unique programs and year levels
  const programs = Array.from(new Set(students.map(s => s.program).filter(Boolean)));
  const yearLevels = Array.from(new Set(students.map(s => s.yearLevel).filter(Boolean)));

  // Filter students
  const filteredStudents = students.filter(student => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        student.firstName.toLowerCase().includes(searchLower) ||
        student.lastName.toLowerCase().includes(searchLower) ||
        student.studentId.toLowerCase().includes(searchLower) ||
        student.email.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    if (programFilter !== "all" && student.program !== programFilter) {
      return false;
    }

    if (yearFilter !== "all" && student.yearLevel !== yearFilter) {
      return false;
    }

    return true;
  });

  // Sort students by last name
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const lastNameA = a.lastName || "";
    const lastNameB = b.lastName || "";
    return lastNameA.localeCompare(lastNameB);
  });

  // Calculate enrollment stats per student
  const getStudentEnrollments = (student: StudentInfo) =>
    enrollments.filter(e =>
      e.studentId === student.uid || e.studentId === student.studentId
    );

  useEffect(() => {
    if (detailsOpen && selectedStudent) {
      setSelectedStudentEnrollments(getStudentEnrollments(selectedStudent));
    }
  }, [detailsOpen, enrollments, selectedStudent]);

  const getStudentStats = (student: StudentInfo) => {
    const studentEnrolls = getStudentEnrollments(student);
    const totalUnits = studentEnrolls.reduce((sum, e) => sum + e.units, 0);
    const withGrades = studentEnrolls.filter(e => e.gradeStatus !== "none").length;
    return {
      count: studentEnrolls.length,
      units: totalUnits,
      withGrades
    };
  };

  if (loading) {
    return <LoadingState message="Loading enrollment data..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Shield}
        title="Manage Enrollments"
        description="View, modify, and drop student subject enrollments"
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {/* Search & Filters */}
        <Card className="elevation-sm">
          <CardContent className="p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name, ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map(program => (
                  <SelectItem key={program} value={program}>{program}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All year levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Year Levels</SelectItem>
                {yearLevels.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(searchTerm || programFilter !== "all" || yearFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setProgramFilter("all");
                setYearFilter("all");
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          )}
          </CardContent>
        </Card>

        {/* Students Table */}
        {sortedStudents.length === 0 ? (
          <Card className="elevation-sm">
            <CardContent className="py-12">
              <EmptyState
                icon={Users}
                title="No students found"
                description="Try adjusting your search or filters"
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="elevation-sm">
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>
                {sortedStudents.length} student{sortedStudents.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Year Level</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Graded</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStudents.map((student) => {
                    const stats = getStudentStats(student);
                    
                    return (
                      <TableRow key={student.studentId}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {student.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {student.studentId}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {student.program || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {student.yearLevel || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span className={stats.count > 0 ? "text-success font-semibold" : "text-muted-foreground"}>
                              {stats.count}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={stats.units > 0 ? "font-semibold" : "text-muted-foreground"}>
                            {stats.units}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className={stats.withGrades > 0 ? "text-info font-semibold" : "text-muted-foreground"}>
                              {stats.withGrades}/{stats.count}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewStudent(student)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Management Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="w-[90vw] overflow-y-auto sm:max-w-5xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Manage Student Enrollments
            </SheetTitle>
            <SheetDescription>
              View, modify, and drop enrolled subjects for this student
            </SheetDescription>
          </SheetHeader>

          {selectedStudent && (
            <div className="mt-6 space-y-6 px-4 sm:px-6">
              <Tabs defaultValue="enrollments" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="enrollments">Active Enrollments</TabsTrigger>
                  <TabsTrigger value="audit">
                    Audit Trail
                    {auditLogs.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{auditLogs.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="enrollments" className="space-y-4 mt-4">
                  {/* Student Info */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-muted-foreground">Student Name</div>
                          <div className="font-semibold text-lg">
                            {selectedStudent.firstName} {selectedStudent.lastName}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-muted-foreground">Student ID</div>
                            <Badge variant="outline" className="font-mono mt-1">
                              {selectedStudent.studentId}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Email</div>
                            <div className="text-sm mt-1">{selectedStudent.email}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Program</div>
                            <div className="text-sm mt-1">{selectedStudent.program}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Year Level</div>
                            <Badge variant="secondary" className="mt-1">
                              {selectedStudent.yearLevel}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Enrollment Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="border-2 border-info/30 bg-info/5 dark:bg-info/10">
                      <CardContent className="pt-4 pb-3 text-center">
                        <div className="text-2xl font-bold text-info">
                          {selectedStudentEnrollments.length}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Enrolled Subjects
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-success/30 bg-success/5 dark:bg-success/10">
                      <CardContent className="pt-4 pb-3 text-center">
                        <div className="text-2xl font-bold text-success">
                          {selectedStudentEnrollments.reduce((sum, e) => sum + e.units, 0)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Total Units
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-primary/30 bg-primary/5 dark:bg-primary/10">
                      <CardContent className="pt-4 pb-3 text-center">
                        <div className="text-2xl font-bold text-primary">
                          {selectedStudentEnrollments.filter(e => e.gradeStatus !== "none").length}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          With Grades
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Enrolled Subjects */}
                  {selectedStudentEnrollments.length === 0 ? (
                    <Card>
                      <CardContent className="py-12">
                        <EmptyState
                          icon={BookOpen}
                          title="No active enrollments"
                          description="This student is not enrolled in any subjects"
                        />
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-success" />
                          Enrolled Subjects
                        </h3>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Subject</TableHead>
                              <TableHead>Schedule</TableHead>
                              <TableHead>Instructor</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Grade</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedStudentEnrollments
                              .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode))
                              .map((enrollment) => {
                                const gradeDisplay = getGradeDisplay(enrollment);
                                
                                return (
                                  <TableRow key={enrollment.id}>
                                    <TableCell>
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="default" className="font-mono">
                                            {enrollment.subjectCode}
                                          </Badge>
                                          <Badge variant="outline">
                                            {enrollment.units} Units
                                          </Badge>
                                        </div>
                                        <div className="font-medium text-sm">
                                          {enrollment.subjectName}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-1 text-sm">
                                        <div className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3 text-muted-foreground" />
                                          {enrollment.dayOfWeek}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                          {formatTime(enrollment.startTime)} - {formatTime(enrollment.endTime)}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3 text-muted-foreground" />
                                          {enrollment.room}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1 text-sm">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                        {enrollment.teacherName}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="success">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Enrolled
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <span className={gradeDisplay.className}>
                                          {gradeDisplay.display}
                                        </span>
                                        {enrollment.gradeStatus === "final" && (
                                          <Shield className="h-3 w-3 text-warning" title="Final grade posted - override required to drop" />
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => initiateDropSubject(enrollment)}
                                        disabled={processing}
                                      >
                                        {processing ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Drop
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

                      <Alert variant="warning">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          <strong>Important:</strong> All enrollment modifications are logged and audited. Dropping subjects with final grades requires administrator override.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="audit" className="space-y-4 mt-4">
                  {auditLogs.length === 0 ? (
                    <Card>
                      <CardContent className="py-12">
                        <EmptyState
                          icon={FileText}
                          title="No audit records"
                          description="No enrollment modifications have been made for this student"
                        />
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map((log, index) => (
                        <Card key={index} className="border-2">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={log.action === "override_drop" ? "destructive" : "secondary"}
                                    className="font-semibold"
                                  >
                                    {log.action === "override_drop" ? "OVERRIDE DROP" : log.action.toUpperCase()}
                                  </Badge>
                                  {log.overrideUsed && (
                                    <Badge variant="warning">
                                      <Shield className="h-3 w-3 mr-1" />
                                      Override Used
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {log.timestamp?.toDate().toLocaleString("en-PH", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Subject:</span>
                                  <div className="font-medium">{log.subjectCode} - {log.subjectName}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Registrar:</span>
                                  <div className="font-medium">{log.registrarName}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Grade Status:</span>
                                  <Badge variant="outline" className="mt-1">
                                    {log.gradeStatusAtTime === "final" ? "Final Grade" : 
                                     log.gradeStatusAtTime === "in-progress" ? "In Progress" : "No Grade"}
                                  </Badge>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Transcript Notation:</span>
                                  <div className="font-medium text-warning">{log.transcriptNotation}</div>
                                </div>
                              </div>

                              {(log.midtermGrade !== undefined || log.finalGrade !== undefined) && (
                                <div className="p-2 bg-muted/50 rounded text-sm">
                                  <span className="text-muted-foreground">Grades at time of drop:</span>
                                  <div className="mt-1 space-x-3">
                                    {log.midtermGrade !== undefined && (
                                      <span>Midterm: <strong>{log.midtermGrade.toFixed(2)}</strong></span>
                                    )}
                                    {log.finalGrade !== undefined && (
                                      <span>Final: <strong>{log.finalGrade.toFixed(2)}</strong></span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {log.reason && (
                                <div className="p-2 bg-muted/50 rounded text-sm">
                                  <span className="text-muted-foreground">Reason:</span>
                                  <div className="mt-1">{log.reason}</div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Drop Confirmation Dialog */}
      <AlertDialog open={!!dropDialogState} onOpenChange={() => setDropDialogState(null)}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Drop Subject - Confirmation Required
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 mt-4">
                {/* Subject Info */}
                <Card className="border-2 border-warning/30 bg-warning/5 dark:bg-warning/10">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="font-mono">
                          {dropDialogState?.enrollment?.subjectCode}
                        </Badge>
                        <Badge variant="outline">
                          {dropDialogState?.enrollment?.units} Units
                        </Badge>
                      </div>
                      <div className="font-medium">
                        {dropDialogState?.enrollment?.subjectName}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Warning */}
                <Alert variant={dropDialogState?.requiresOverride ? "destructive" : "warning"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm whitespace-pre-wrap">
                    {dropDialogState?.warning}
                  </AlertDescription>
                </Alert>

                {/* Transcript Notation */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Transcript Notation</div>
                  <div className="font-semibold text-warning">{dropDialogState?.transcriptNotation}</div>
                </div>

                {/* Drop Reason */}
                <div className="space-y-2">
                  <Label htmlFor="drop-reason">Reason for Dropping *</Label>
                  <Textarea
                    id="drop-reason"
                    placeholder="Provide a detailed reason for dropping this subject..."
                    value={dropReason}
                    onChange={(e) => setDropReason(e.target.value)}
                    rows={3}
                    required
                  />
                </div>

                {/* Override Password */}
                {dropDialogState?.requiresOverride && (
                  <div className="space-y-2">
                    <Label htmlFor="override-password" className="text-destructive">
                      Administrator Override Password *
                    </Label>
                    <Input
                      id="override-password"
                      type="password"
                      placeholder="Enter override password"
                      value={overridePassword}
                      onChange={(e) => setOverridePassword(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Dropping subjects with final grades requires administrator authorization
                    </p>
                  </div>
                )}

                {/* Consequences */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>This action will:</AlertTitle>
                  <AlertDescription className="text-xs space-y-1 mt-2">
                    <div>• Remove subject from student's active enrollment</div>
                    <div>• Update student's unit load immediately</div>
                    <div>• Apply transcript notation: {dropDialogState?.transcriptNotation}</div>
                    <div>• Create permanent audit log</div>
                    <div>• Sync changes across all system modules within 3 seconds</div>
                    {dropDialogState?.enrollment?.gradeStatus !== "none" && (
                      <div>• Preserve grade record but exclude from GPA calculation</div>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t px-6 py-4">
            <AlertDialogCancel onClick={() => {
              setDropDialogState(null);
              setDropReason("");
              setOverridePassword("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDropSubject}
              disabled={processing || !dropReason.trim() || (dropDialogState?.requiresOverride && !overridePassword)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Confirm Drop
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}