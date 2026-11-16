"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { GraduationCap, Award, BookOpen, TrendingUp } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { StudentPageHeader } from "../../student-page-header";
import { DashboardLayout } from "../dashboard-layout";

interface EnrolledSubject {
  id: string;
  studentId: string;
  subjectCode: string;
  subjectName: string;
  units: number;
  semester: string;
  schoolYear: string;
}

interface Grade {
  id: string;
  studentId: string;
  subjectCode: string;
  gradeType: "Midterm" | "Final";
  percentage: number;
  semester: string;
  schoolYear: string;
}

interface SubjectGrade {
  subjectCode: string;
  subjectName: string;
  units: number;
  midterm: number | null;
  final: number | null;
  finalGrade: number | null;
  status: "No Grades" | "In Progress" | "Passed" | "Failed";
}

export function MyGrades() {
  const [loading, setLoading] = useState(true);
  const [enrolledSubjects, setEnrolledSubjects] = useState<EnrolledSubject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [studentId, setStudentId] = useState<string>("");

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setStudentId(currentUser.uid);
  }, []);

  useEffect(() => {
    if (!studentId) return;

    const q = query(
      collection(db, "studentSubjects"),
      where("studentId", "==", studentId),
      where("status", "==", "enrolled")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as EnrolledSubject[];
      setEnrolledSubjects(subjects);
    });

    return () => unsubscribe();
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;

    const q = query(
      collection(db, "grades"),
      where("studentId", "==", studentId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gradesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Grade[];
      setGrades(gradesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching grades:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentId]);

  const buildSubjectGrades = (): SubjectGrade[] => {
    return enrolledSubjects.map(subject => {
      const subjectGrades = grades.filter(g => g.subjectCode === subject.subjectCode);
      
      const midterm = subjectGrades.find(g => g.gradeType === "Midterm")?.percentage || null;
      const final = subjectGrades.find(g => g.gradeType === "Final")?.percentage || null;
      
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
      };
    });
  };

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

  if (loading) {
    return (
      <DashboardLayout userRole="Student" userName="Student" notificationCount={0}>
        <LoadingState message="Loading your grades..." />
      </DashboardLayout>
    );
  }

  const subjectGrades = buildSubjectGrades();
  const completedSubjects = subjectGrades.filter(s => s.finalGrade !== null);
  const passedSubjects = subjectGrades.filter(s => s.status === "Passed");
  
  const gpa = completedSubjects.length > 0
    ? (completedSubjects.reduce((sum, s) => sum + (s.finalGrade || 0), 0) / completedSubjects.length).toFixed(2)
    : "0.00";

  return (
    <DashboardLayout userRole="Student" userName="Student" notificationCount={0}>
      <div className="min-h-screen bg-background">
        <StudentPageHeader
          title="My Grades"
          description="View your academic performance and grades per subject"
          icon={GraduationCap}
        />

        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 space-y-5">
        {enrolledSubjects.length === 0 ? (
          <Card className="border-0 shadow-md bg-card">
            <CardContent className="py-16">
              <EmptyState
                icon={BookOpen}
                title="No enrolled subjects"
                description="You haven't enrolled in any subjects yet. Enroll in subjects to see your grades here."
              />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Performance Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* General Average */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-card overflow-hidden group">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground font-medium mb-1">General Average</div>
                      <div className="text-2xl font-medium text-foreground">{gpa}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Passed Subjects */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-card overflow-hidden group">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors flex-shrink-0">
                      <TrendingUp className="h-6 w-6 text-success" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground font-medium mb-1">Passed Subjects</div>
                      <div className="text-2xl font-medium text-success">{passedSubjects.length}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Grades Table */}
            <Card className="border-0 shadow-md bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Subject Grades</CardTitle>
                    <CardDescription className="mt-1">
                      {enrolledSubjects[0]?.semester || "Current Semester"} - {enrolledSubjects[0]?.schoolYear || "SY"}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {enrolledSubjects.length} subject{enrolledSubjects.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
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
                          key={subject.subjectCode} 
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
              </CardContent>
            </Card>
          </>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
