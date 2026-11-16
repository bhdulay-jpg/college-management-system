"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { User, GraduationCap, CheckCircle, TrendingUp, Award, Download, FileText } from "lucide-react";
import { collection, query, where, onSnapshot, getDocs, doc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useRouter } from "../../router";
import { formatDateShort } from "../../../lib/date-formatter";
import { formatProgramDisplay } from "../../../lib/program-service";

interface Student {
  id: string;
  name: string;
  studentId?: string;
  program?: string;
  yearLevel?: string;
}

interface Grade {
  id: string;
  studentId: string;
  subjectCode: string;
  subjectName: string;
  grade?: number; // Old format
  percentage?: number; // New format from gradebook
  semester: string;
  schoolYear: string;
  gradedAt: any;
  gradeType?: string; // Midterm or Final
  finalGrade?: number; // Computed final grade
}

interface EnrolledSubject {
  id: string;
  studentId: string;
  subjectCode: string;
  subjectName: string;
  units: number;
  semester: string;
  schoolYear: string;
}

interface Attendance {
  id: string;
  studentId: string;
  status: string;
  date: any;
}

export function ReportsPage() {
  const { user } = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [enrolledSubjects, setEnrolledSubjects] = useState<EnrolledSubject[]>([]);

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

  // Fetch grades for selected student
  useEffect(() => {
    if (!selectedStudentId) return;

    const gradesQuery = query(
      collection(db, "grades"),
      where("studentId", "==", selectedStudentId)
    );

    const unsubscribe = onSnapshot(gradesQuery, (snapshot) => {
      const gradesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Grade[];
      setGrades(gradesData);
    });

    return () => unsubscribe();
  }, [selectedStudentId]);

  // Fetch attendance for selected student
  useEffect(() => {
    if (!selectedStudentId) return;

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("studentId", "==", selectedStudentId)
    );

    const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
      const attendanceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Attendance[];
      setAttendance(attendanceData);
    });

    return () => unsubscribe();
  }, [selectedStudentId]);

  // Fetch enrolled subjects for selected student
  useEffect(() => {
    if (!selectedStudentId) return;

    const enrolledQuery = query(
      collection(db, "studentSubjects"),
      where("studentId", "==", selectedStudentId),
      where("status", "==", "enrolled")
    );

    const unsubscribe = onSnapshot(enrolledQuery, (snapshot) => {
      const enrolledData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as EnrolledSubject[];
      setEnrolledSubjects(enrolledData);
    });

    return () => unsubscribe();
  }, [selectedStudentId]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // Helper functions matching student design
  const getGradeColor = (grade: number | null) => {
    if (grade === null) return "text-muted-foreground";
    if (grade >= 90) return "text-success";
    if (grade >= 80) return "text-info";
    if (grade >= 75) return "text-warning";
    return "text-destructive";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Passed":
        return <Badge className="bg-success hover:bg-success/90 text-white border-0">Passed</Badge>;
      case "Failed":
        return <Badge className="bg-destructive hover:bg-destructive/90 text-white border-0">Failed</Badge>;
      case "In Progress":
        return <Badge className="bg-info hover:bg-info/90 text-white border-0">In Progress</Badge>;
      default:
        return <Badge variant="outline">No Grades</Badge>;
    }
  };

  // Build subject grades from enrolledSubjects (matching student design)
  const buildSubjectGrades = () => {
    return enrolledSubjects.map(subject => {
      const subjectGrades = grades.filter(g => g.subjectCode === subject.subjectCode);
      
      const midterm = subjectGrades.find(g => g.gradeType === "Midterm")?.percentage || 
                      subjectGrades.find(g => g.gradeType === "Midterm")?.grade || null;
      const final = subjectGrades.find(g => g.gradeType === "Final")?.percentage || 
                    subjectGrades.find(g => g.gradeType === "Final")?.grade || null;
      
      let finalGrade: number | null = null;
      let status: "No Grades" | "In Progress" | "Passed" | "Failed" = "No Grades";

      if (midterm !== null && final !== null) {
        finalGrade = (midterm * 0.5) + (final * 0.5);
        status = finalGrade >= 75 ? "Passed" : "Failed";
      } else if (midterm !== null || final !== null) {
        status = "In Progress";
      }

      return {
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        units: subject.units,
        midterm,
        final,
        finalGrade,
        status,
        semester: subject.semester,
        schoolYear: subject.schoolYear,
      };
    });
  };

  const subjectGrades = buildSubjectGrades();

  // Calculate statistics
  const completedSubjects = subjectGrades.filter(s => s.finalGrade !== null);
  const averageGrade = completedSubjects.length > 0
    ? (completedSubjects.reduce((sum, s) => sum + (s.finalGrade || 0), 0) / completedSubjects.length).toFixed(2)
    : "0.00";

  const attendanceStats = attendance.reduce((acc, record) => {
    if (record.status === "present") acc.present++;
    else if (record.status === "absent") acc.absent++;
    else if (record.status === "late") acc.late++;
    return acc;
  }, { present: 0, absent: 0, late: 0 });

  const totalAttendanceRecords = attendanceStats.present + attendanceStats.absent + attendanceStats.late;
  const attendanceRate = totalAttendanceRecords > 0
    ? ((attendanceStats.present / totalAttendanceRecords) * 100).toFixed(1)
    : "0.0";

  const passingGrades = subjectGrades.filter(s => s.status === "Passed").length;
  const failingGrades = subjectGrades.filter(s => s.status === "Failed").length;

  if (loading) {
    return <LoadingState message="Loading progress reports..." />;
  }

  if (students.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState
          icon={FileText}
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
        <h1 className="text-2xl md:text-3xl">Progress Reports</h1>
        <p className="text-muted-foreground">View academic performance and attendance records</p>
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Average Grade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{averageGrade}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {completedSubjects.length} subject{completedSubjects.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Attendance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{attendanceRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {attendanceStats.present} of {totalAttendanceRecords} days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-green-600" />
                  Passing Grades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{passingGrades}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Grades ≥ 75
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-red-600" />
                  Needs Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{failingGrades}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Grades &lt; 75
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Student Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {selectedStudent.name}
              </CardTitle>
              <CardDescription>
                {selectedStudent.program ? formatProgramDisplay(selectedStudent.program) : "No Program"} - {selectedStudent.yearLevel || "N/A"}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Grades Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Subject Grades</CardTitle>
                  <CardDescription className="mt-1">
                    {subjectGrades[0]?.semester || "Current Semester"} - {subjectGrades[0]?.schoolYear || "SY"}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {subjectGrades.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-center">Units</TableHead>
                        <TableHead className="text-center">Midterm</TableHead>
                        <TableHead className="text-center">Final</TableHead>
                        <TableHead className="text-center">Final Grade</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjectGrades.map((subject) => (
                        <TableRow 
                          key={`${subject.subjectCode}-${subject.semester}-${subject.schoolYear}`} 
                          className="hover:bg-muted/30"
                        >
                          <TableCell>
                            <div>
                              <div className="font-mono text-xs text-muted-foreground mb-0.5">
                                {subject.subjectCode}
                              </div>
                              <div className="font-medium text-sm">
                                {subject.subjectName}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <span className="font-medium">{subject.units}</span>
                          </TableCell>

                          <TableCell className="text-center">
                            {subject.midterm !== null ? (
                              <span className={`font-medium ${getGradeColor(subject.midterm)}`}>
                                {subject.midterm.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            {subject.final !== null ? (
                              <span className={`font-medium ${getGradeColor(subject.final)}`}>
                                {subject.final.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            {subject.finalGrade !== null ? (
                              <span className={`font-medium ${getGradeColor(subject.finalGrade)}`}>
                                {subject.finalGrade.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            {getStatusBadge(subject.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  icon={GraduationCap}
                  title="No Grades Yet"
                  description="No grade records available for this student."
                />
              )}
            </CardContent>
          </Card>

          {/* Attendance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
              <CardDescription>Overview of attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              {attendance.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg bg-success/10 border-success/20">
                      <div className="text-2xl font-bold text-success">{attendanceStats.present}</div>
                      <div className="text-sm text-success">Present Days</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {totalAttendanceRecords > 0 
                          ? ((attendanceStats.present / totalAttendanceRecords) * 100).toFixed(1)
                          : 0}%
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-destructive/10 border-destructive/20">
                      <div className="text-2xl font-bold text-destructive">{attendanceStats.absent}</div>
                      <div className="text-sm text-destructive">Absent Days</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {totalAttendanceRecords > 0
                          ? ((attendanceStats.absent / totalAttendanceRecords) * 100).toFixed(1)
                          : 0}%
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-warning/10 border-warning/20">
                      <div className="text-2xl font-bold text-warning">{attendanceStats.late}</div>
                      <div className="text-sm text-warning">Late Days</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {totalAttendanceRecords > 0
                          ? ((attendanceStats.late / totalAttendanceRecords) * 100).toFixed(1)
                          : 0}%
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Total Attendance Records</div>
                        <div className="text-sm text-muted-foreground">
                          All recorded attendance entries
                        </div>
                      </div>
                      <div className="text-3xl font-bold">{totalAttendanceRecords}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title="No Attendance Records"
                  description="No attendance data available for this student."
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}