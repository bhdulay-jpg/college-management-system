"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { DashboardLayout } from "../dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { GradeInput } from "./grade-input";
import {
  BookOpen, Users, Search, Save, ArrowLeft,
  Award, FileText, GraduationCap, AlertCircle, CheckCircle2, Loader2
} from "lucide-react";
import { collection, query, onSnapshot, where, addDoc, getDocs, Timestamp, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useRouter } from "../../router";
import { toast } from "sonner@2.0.3";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface Schedule {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  semester: string;
  schoolYear: string;
  teacherId: string;
}

interface EnrolledStudent {
  id: string;
  studentId: string;
  studentName: string;
  studentSchoolId: string; // The actual school ID (not Firebase UID)
  subjectCode: string;
  scheduleId: string;
}

interface Grade {
  id?: string;
  studentId: string;
  subjectCode: string;
  gradeType: "Midterm" | "Final";
  percentage: number;
  semester: string;
  schoolYear: string;
  createdAt?: any;
  updatedAt?: any;
}

interface StudentGrade {
  studentId: string;
  studentName: string;
  studentSchoolId: string; // Add school ID here too
  midterm: number | null;
  final: number | null;
  finalGrade: number | null;
  status: "No Grades" | "In Progress" | "Passed" | "Failed";
}

export function Gradebook() {
  const { user } = useRouter();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveButtonRef, setSaveButtonRef] = useState<HTMLButtonElement | null>(null);

  // Load teacher's schedules
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const schedulesQuery = query(
      collection(db, "schedules"),
      where("teacherId", "==", user.id)
    );

    const unsubSchedules = onSnapshot(
      schedulesQuery,
      (snapshot) => {
        const schedulesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Schedule[];
        setSchedules(schedulesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching schedules:", error);
        setLoading(false);
      }
    );

    return () => unsubSchedules();
  }, [user]);

  // Load enrolled students for selected schedule
  useEffect(() => {
    if (!selectedSchedule) {
      setEnrolledStudents([]);
      return;
    }

    const q = query(
      collection(db, "studentSubjects"),
      where("scheduleId", "==", selectedSchedule.id),
      where("status", "==", "enrolled")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Get student subject enrollments
      const studentSubjects = snapshot.docs.map(doc => ({
        id: doc.id,
        studentId: doc.data().studentId, // Firebase UID
        subjectCode: doc.data().subjectCode,
        scheduleId: doc.data().scheduleId,
      }));
      
      // Fetch actual student data from users collection
      const studentsWithData: EnrolledStudent[] = [];
      
      for (const enrollment of studentSubjects) {
        try {
          const studentDocRef = doc(db, "users", enrollment.studentId);
          const studentDocSnap = await getDoc(studentDocRef);
          
          if (studentDocSnap.exists()) {
            const studentData = studentDocSnap.data();
            studentsWithData.push({
              id: enrollment.id,
              studentId: enrollment.studentId, // Keep Firebase UID for grade matching
              studentName: studentData.name || "Unknown Student",
              studentSchoolId: studentData.studentId || "No ID", // The actual school-assigned ID
              subjectCode: enrollment.subjectCode,
              scheduleId: enrollment.scheduleId,
            });
          } else {
            // Fallback if student not found
            studentsWithData.push({
              id: enrollment.id,
              studentId: enrollment.studentId,
              studentName: "Unknown Student",
              studentSchoolId: "No ID",
              subjectCode: enrollment.subjectCode,
              scheduleId: enrollment.scheduleId,
            });
          }
        } catch (error) {
          console.error("Error fetching student data:", error);
          // Fallback on error
          studentsWithData.push({
            id: enrollment.id,
            studentId: enrollment.studentId,
            studentName: "Unknown Student",
            studentSchoolId: "No ID",
            subjectCode: enrollment.subjectCode,
            scheduleId: enrollment.scheduleId,
          });
        }
      }
      
      // Sort by student name
      studentsWithData.sort((a, b) => a.studentName.localeCompare(b.studentName));
      
      setEnrolledStudents(studentsWithData);
    });

    return () => unsubscribe();
  }, [selectedSchedule]);

  // Load grades for selected schedule
  useEffect(() => {
    if (!selectedSchedule) {
      setGrades([]);
      return;
    }

    const q = query(
      collection(db, "grades"),
      where("subjectCode", "==", selectedSchedule.subjectCode)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gradesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Grade[];
      
      setGrades(gradesData);
    });

    return () => unsubscribe();
  }, [selectedSchedule]);

  // Build student grades table
  useEffect(() => {
    const studentGradeMap: StudentGrade[] = enrolledStudents.map(student => {
      const studentGradesData = grades.filter(g => g.studentId === student.studentId);
      
      const midterm = studentGradesData.find(g => g.gradeType === "Midterm")?.percentage || null;
      const final = studentGradesData.find(g => g.gradeType === "Final")?.percentage || null;
      
      let finalGrade: number | null = null;
      let status: "No Grades" | "In Progress" | "Passed" | "Failed" = "No Grades";

      // Compute final grade if both midterm and final are available
      if (midterm !== null && final !== null) {
        finalGrade = (midterm * 0.5) + (final * 0.5);
        // 75 and above is passed, 74 and below is failed
        status = finalGrade >= 75 ? "Passed" : "Failed";
      } else if (midterm !== null || final !== null) {
        status = "In Progress";
      }

      return {
        studentId: student.studentId,
        studentName: student.studentName,
        studentSchoolId: student.studentSchoolId,
        midterm,
        final,
        finalGrade,
        status,
      };
    });

    setStudentGrades(studentGradeMap);
  }, [enrolledStudents, grades]);

  const handleGradeChange = async (studentId: string, gradeType: "Midterm" | "Final", value: string) => {
    if (!selectedSchedule) return;

    const numValue = value === "" ? null : parseFloat(value);
    
    // Validate grade (0-100)
    if (numValue !== null && (numValue < 0 || numValue > 100)) {
      toast.error("Grade must be between 0 and 100");
      return;
    }

    try {
      // Find existing grade record
      const existingGrade = grades.find(
        g => g.studentId === studentId && g.gradeType === gradeType
      );

      if (numValue === null) {
        // If value is empty and grade exists, you might want to delete it
        // For now, we'll just return
        return;
      }

      const gradeData: Partial<Grade> = {
        studentId,
        subjectCode: selectedSchedule.subjectCode,
        gradeType,
        percentage: numValue,
        semester: selectedSchedule.semester || "1st Semester",
        schoolYear: selectedSchedule.schoolYear || "2024-2025",
      };

      if (existingGrade?.id) {
        // Update existing
        await updateDoc(doc(db, "grades", existingGrade.id), {
          ...gradeData,
          updatedAt: Timestamp.now(),
        });
        toast.success(`${gradeType} grade updated`);
      } else {
        // Create new
        await addDoc(collection(db, "grades"), {
          ...gradeData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        toast.success(`${gradeType} grade added`);
      }
    } catch (error) {
      console.error("Error saving grade:", error);
      toast.error("Failed to save grade");
    }
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return "text-muted-foreground";
    if (grade >= 90) return "text-green-600";
    if (grade >= 80) return "text-blue-600";
    if (grade >= 75) return "text-orange-600";
    return "text-red-600";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Passed":
        return <Badge variant="success">Passed</Badge>;
      case "Failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "In Progress":
        return <Badge variant="secondary">In Progress</Badge>;
      default:
        return <Badge variant="outline">No Grades</Badge>;
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const withFinalGrades = studentGrades.filter(s => s.finalGrade !== null);
    const averageGrade = withFinalGrades.length > 0
      ? withFinalGrades.reduce((sum, s) => sum + (s.finalGrade || 0), 0) / withFinalGrades.length
      : 0;
    const passing = studentGrades.filter(s => s.status === "Passed").length;
    const failing = studentGrades.filter(s => s.status === "Failed").length;

    return {
      total: studentGrades.length,
      graded: withFinalGrades.length,
      pending: studentGrades.length - withFinalGrades.length,
      averageGrade: averageGrade.toFixed(2),
      passing,
      failing,
    };
  }, [studentGrades]);

  const filteredStudents = useMemo(() => {
    return studentGrades.filter(student =>
      student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [studentGrades, searchTerm]);

  if (loading) {
    return (
      <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
        <div className="p-4 md:p-6">
          <LoadingState message="Loading gradebook..." />
        </div>
      </DashboardLayout>
    );
  }

  // Grade Entry View
  if (selectedSchedule) {
    return (
      <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
        <div className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSchedule(null)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Classes
            </Button>
            <h1 className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Gradebook
            </h1>
            <p className="text-muted-foreground">
              {selectedSchedule.subjectCode} - {selectedSchedule.subjectName}
            </p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total Students</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                    <Award className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.averageGrade}</div>
                    <div className="text-xs text-muted-foreground">Class Average</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-success">{stats.passing}</div>
                    <div className="text-xs text-muted-foreground">Passing</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-destructive">{stats.failing}</div>
                    <div className="text-xs text-muted-foreground">Failing</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.pending}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grades Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Student Grades</CardTitle>
                  <CardDescription>Midterm and final grades are weighted equally; 75 is passing.</CardDescription>
                </div>
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredStudents.length === 0 ? (
                <div className="p-12">
                  <EmptyState
                    icon={Users}
                    title="No students enrolled"
                    description="No students are enrolled in this subject yet."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead className="w-[200px]">Student Name</TableHead>
                        <TableHead className="w-[150px]">Student ID</TableHead>
                        <TableHead className="text-center w-[140px]">Midterm</TableHead>
                        <TableHead className="text-center w-[140px]">Final</TableHead>
                        <TableHead className="text-center w-[120px]">Final Grade</TableHead>
                        <TableHead className="text-center w-[120px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student, index) => (
                        <TableRow key={student.studentId} className="hover:bg-muted/30">
                          {/* Row Number */}
                          <TableCell className="text-center text-muted-foreground">
                            {index + 1}
                          </TableCell>

                          {/* Student Name */}
                          <TableCell className="font-medium">{student.studentName}</TableCell>

                          {/* Student ID - Display school ID, not Firebase UID */}
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {student.studentSchoolId}
                          </TableCell>

                          {/* Midterm Grade */}
                          <TableCell className="text-center">
                            <GradeInput
                              value={student.midterm}
                              studentId={student.studentId}
                              gradeType="Midterm"
                              onSave={handleGradeChange}
                            />
                          </TableCell>

                          {/* Final Grade */}
                          <TableCell className="text-center">
                            <GradeInput
                              value={student.final}
                              studentId={student.studentId}
                              gradeType="Final"
                              onSave={handleGradeChange}
                            />
                          </TableCell>

                          {/* Computed Final Grade */}
                          <TableCell className="text-center">
                            {student.finalGrade !== null ? (
                              <div className={`text-2xl font-bold ${getGradeColor(student.finalGrade)}`}>
                                {student.finalGrade.toFixed(1)}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">—</div>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="text-center">
                            {getStatusBadge(student.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Class Selection View
  return (
    <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Gradebook
          </h1>
          <p className="text-muted-foreground">
            Select a class to manage student grades
          </p>
        </div>

        {schedules.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No classes assigned"
            description="You don't have any classes assigned yet."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((schedule) => (
              <Card
                key={schedule.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedSchedule(schedule)}
              >
                <CardHeader>
                  <div className="space-y-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {schedule.subjectCode}
                    </Badge>
                    <CardTitle className="text-base leading-tight">{schedule.subjectName}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>{schedule.dayOfWeek}</div>
                    <div>{schedule.startTime} - {schedule.endTime}</div>
                    <div>{schedule.semester}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}