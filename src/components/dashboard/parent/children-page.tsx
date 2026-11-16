"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { User, Mail, Phone, MapPin, GraduationCap, Calendar, Eye, BookOpen, CheckCircle, Award, TrendingUp, Info } from "lucide-react";
import { collection, query, where, onSnapshot, getDocs, doc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useRouter } from "../../router";
import { formatDateShort } from "../../../lib/date-formatter";
import { formatProgramDisplay } from "../../../lib/program-service";
import { Alert, AlertDescription } from "../../ui/alert";

interface Student {
  id: string;
  uid: string;
  name: string;
  email: string;
  studentId?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  province?: string;
  program?: string;
  yearLevel?: string;
  semester?: string;
  enrollmentType?: string;
  status?: string;
  createdAt?: any;
}

interface Schedule {
  id: string;
  subjectCode: string;
  subjectName: string;
  units: number;
  teacherName?: string;
  room?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  units: number;
  yearLevel: string;
  semester: string;
  category?: string;
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

export function ChildrenPage() {
  const { user } = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [enrolledSchedules, setEnrolledSchedules] = useState<Schedule[]>([]);
  const [curriculum, setCurriculum] = useState<Subject[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [enrolledSubjects, setEnrolledSubjects] = useState<EnrolledSubject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  // Helper functions for grades
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

  // Fetch students linked to this parent
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
        setLoading(false);
      }, (error) => {
        console.error("Error fetching students:", error);
        setLoading(false);
      });

      return () => unsubscribeStudents();
    });

    return () => unsubscribeParent();
  }, [user]);

  // Fetch student details when dialog opens
  const openDetailsDialog = async (student: Student) => {
    setSelectedStudent(student);
    setDetailsOpen(true);
    setLoadingDetails(true);

    try {
      console.log("[ChildrenPage] Fetching details for student:", {
        id: student.id,
        uid: student.uid,
        name: student.name
      });
      
      // First, try to fetch enrolled schedules using studentSubjects collection (same as student dashboard)
      // Use the Firebase UID (student.id) to query, not the studentId field
      const studentSubjectsQuery = query(
        collection(db, "studentSubjects"),
        where("studentId", "==", student.id), // Use Firebase UID, not studentId field
        where("status", "==", "enrolled")
      );
      const studentSubjectsSnapshot = await getDocs(studentSubjectsQuery);
      console.log(`[ChildrenPage] Found ${studentSubjectsSnapshot.size} enrolled student subjects`);
      
      // Get the schedule IDs from studentSubjects
      const scheduleIds = studentSubjectsSnapshot.docs.map(doc => doc.data().scheduleId);
      console.log("[ChildrenPage] Schedule IDs from studentSubjects:", scheduleIds);
      
      // Fetch the actual schedules
      let schedulesData: Schedule[] = [];
      if (scheduleIds.length > 0) {
        // Firestore 'in' query has a limit of 10, so we need to batch
        const batchSize = 10;
        for (let i = 0; i < scheduleIds.length; i += batchSize) {
          const batch = scheduleIds.slice(i, i + batchSize);
          const schedulesQuery = query(
            collection(db, "schedules"),
            where("__name__", "in", batch)
          );
          const schedulesSnapshot = await getDocs(schedulesQuery);
          const batchData = schedulesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Schedule[];
          schedulesData = [...schedulesData, ...batchData];
        }
      }
      
      console.log(`[ChildrenPage] Found ${schedulesData.length} enrolled schedules`);
      setEnrolledSchedules(schedulesData);

      // Fetch enrolled subjects for grades
      const enrolledSubjectsData = studentSubjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as EnrolledSubject[];
      setEnrolledSubjects(enrolledSubjectsData);

      // Fetch grades
      const gradesQuery = query(
        collection(db, "grades"),
        where("studentId", "==", student.id)
      );
      const gradesSnapshot = await getDocs(gradesQuery);
      const gradesData = gradesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Grade[];
      console.log(`[ChildrenPage] Found ${gradesData.length} grades`);
      setGrades(gradesData);

      // Fetch curriculum based on program
      if (student.program) {
        const programCode = student.program.split(" - ")[0];
        console.log("[ChildrenPage] Fetching curriculum for program:", programCode);
        
        const curriculumQuery = query(
          collection(db, "subjects"),
          where("program", "==", programCode)
        );
        const curriculumSnapshot = await getDocs(curriculumQuery);
        const curriculumData = curriculumSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Subject[];
        
        console.log(`[ChildrenPage] Found ${curriculumData.length} curriculum subjects`);
        setCurriculum(curriculumData);
      }
    } catch (error) {
      console.error("Error fetching student details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your children..." />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl">My Children</h1>
        <p className="text-muted-foreground">View and monitor your children's information</p>
      </div>

      {/* Students List */}
      {students.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <Card key={student.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{student.name}</CardTitle>
                      <CardDescription className="font-mono text-sm">
                        {student.studentId || "No ID"}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{student.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-3 w-3" />
                    <span className="truncate">{student.program ? formatProgramDisplay(student.program) : "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{student.yearLevel || "N/A"}</Badge>
                    <Badge variant="outline">{student.semester || "N/A"}</Badge>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  size="sm"
                  onClick={() => openDetailsDialog(student)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={User}
              title="No Students Linked"
              description="Your account hasn't been linked to any students yet. Please contact the registrar."
            />
          </CardContent>
        </Card>
      )}

      {/* Student Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedStudent?.name}</DialogTitle>
            <DialogDescription>Complete student information and academic records</DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Student Info</TabsTrigger>
                <TabsTrigger value="subjects">Enrolled Subjects</TabsTrigger>
                <TabsTrigger value="grades">Grades</TabsTrigger>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              </TabsList>

              {/* Student Information Tab */}
              <TabsContent value="info" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Full Name</div>
                        <div className="font-medium">{selectedStudent.name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Student ID</div>
                        <div className="font-medium font-mono">{selectedStudent.studentId || "N/A"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Email</div>
                        <div className="font-medium flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {selectedStudent.email}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Phone</div>
                        <div className="font-medium flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {selectedStudent.phone || "N/A"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Date of Birth</div>
                        <div className="font-medium flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {selectedStudent.dateOfBirth ? formatDateShort(selectedStudent.dateOfBirth) : "N/A"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Gender</div>
                        <div className="font-medium">{selectedStudent.gender || "N/A"}</div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-sm text-muted-foreground">Address</div>
                        <div className="font-medium flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {selectedStudent.address 
                            ? `${selectedStudent.address}, ${selectedStudent.city}, ${selectedStudent.province}`
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Academic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Program</div>
                        <div className="font-medium">{selectedStudent.program ? formatProgramDisplay(selectedStudent.program) : "N/A"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Year Level</div>
                        <div><Badge variant="secondary">{selectedStudent.yearLevel || "N/A"}</Badge></div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Semester</div>
                        <div className="font-medium">{selectedStudent.semester || "N/A"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Enrollment Type</div>
                        <div className="font-medium capitalize">{selectedStudent.enrollmentType || "N/A"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Status</div>
                        <div>
                          <Badge variant={selectedStudent.status === "active" ? "default" : "secondary"}>
                            {selectedStudent.status || "Active"}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Enrollment Date</div>
                        <div className="font-medium">
                          {selectedStudent.createdAt?.toDate?.()
                            ? formatDateShort(selectedStudent.createdAt.toDate().toISOString())
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Enrolled Subjects Tab */}
              <TabsContent value="subjects" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Currently Enrolled Subjects ({enrolledSchedules.length})
                    </CardTitle>
                    <CardDescription>
                      Subjects your child is currently enrolled in this semester
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingDetails ? (
                      <LoadingState message="Loading enrolled subjects..." />
                    ) : enrolledSchedules.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Subject Code</TableHead>
                              <TableHead>Subject Name</TableHead>
                              <TableHead>Units</TableHead>
                              <TableHead>Teacher</TableHead>
                              <TableHead>Schedule</TableHead>
                              <TableHead>Room</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {enrolledSchedules.map((schedule) => (
                              <TableRow key={schedule.id}>
                                <TableCell className="font-mono">{schedule.subjectCode}</TableCell>
                                <TableCell>{schedule.subjectName}</TableCell>
                                <TableCell>{schedule.units}</TableCell>
                                <TableCell>{schedule.teacherName || "TBA"}</TableCell>
                                <TableCell>
                                  {schedule.dayOfWeek && schedule.startTime && schedule.endTime
                                    ? `${schedule.dayOfWeek} ${schedule.startTime}-${schedule.endTime}`
                                    : "TBA"}
                                </TableCell>
                                <TableCell>{schedule.room || "TBA"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <div className="text-sm font-medium">
                            Total Units: {enrolledSchedules.reduce((sum, s) => sum + (s.units || 0), 0)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <EmptyState
                        icon={BookOpen}
                        title="No Enrolled Subjects"
                        description="This student hasn't enrolled in any subjects yet."
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Grades Tab */}
              <TabsContent value="grades" className="mt-4 space-y-5">
                {/* Info Alert */}
                <Alert className="border-info/20 bg-info/5">
                  <Info className="h-4 w-4 text-info" />
                  <AlertDescription className="text-foreground text-sm">
                    Grades are entered by teachers and automatically synced. <strong>Final Grade = 50% Midterm + 50% Final.</strong> Passing grade is <strong>75%</strong>.
                  </AlertDescription>
                </Alert>

                {loadingDetails ? (
                  <LoadingState message="Loading grades..." />
                ) : enrolledSubjects.length === 0 ? (
                  <Card>
                    <CardContent className="py-16">
                      <EmptyState
                        icon={BookOpen}
                        title="No enrolled subjects"
                        description="This student hasn't enrolled in any subjects yet."
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Performance Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {(() => {
                        const subjectGrades = buildSubjectGrades();
                        const totalUnits = enrolledSubjects.reduce((sum, s) => sum + s.units, 0);
                        const completedSubjects = subjectGrades.filter(s => s.finalGrade !== null);
                        const passedSubjects = subjectGrades.filter(s => s.status === "Passed");
                        const gpa = completedSubjects.length > 0
                          ? (completedSubjects.reduce((sum, s) => sum + (s.finalGrade || 0), 0) / completedSubjects.length).toFixed(2)
                          : "0.00";

                        return (
                          <>
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

                            {/* Total Subjects */}
                            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-card overflow-hidden group">
                              <CardContent className="p-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center group-hover:bg-info/20 transition-colors flex-shrink-0">
                                    <GraduationCap className="h-6 w-6 text-info" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs text-muted-foreground font-medium mb-1">Total Subjects</div>
                                    <div className="text-2xl font-medium text-foreground">{enrolledSubjects.length}</div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Total Units */}
                            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-card overflow-hidden group">
                              <CardContent className="p-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors flex-shrink-0">
                                    <BookOpen className="h-6 w-6 text-warning" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs text-muted-foreground font-medium mb-1">Total Units</div>
                                    <div className="text-2xl font-medium text-foreground">{totalUnits}</div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </>
                        );
                      })()}
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
                              {buildSubjectGrades().map((subject) => (
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
              </TabsContent>

              {/* Curriculum Tab */}
              <TabsContent value="curriculum" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Program Curriculum
                    </CardTitle>
                    <CardDescription>
                      Complete list of subjects in {selectedStudent.program ? formatProgramDisplay(selectedStudent.program) : "the program"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingDetails ? (
                      <LoadingState message="Loading curriculum..." />
                    ) : curriculum.length > 0 ? (
                      <div className="overflow-x-auto rounded-md border">
                        <Table className="min-w-[760px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Year</TableHead>
                              <TableHead>Semester</TableHead>
                              <TableHead>Subject Code</TableHead>
                              <TableHead>Subject Name</TableHead>
                              <TableHead className="text-center">Units</TableHead>
                              <TableHead>Category</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {["1st Year", "2nd Year", "3rd Year", "4th Year"].flatMap((year) =>
                              ["1st Semester", "2nd Semester", "Summer"].flatMap((semester) => {
                                const semesterSubjects = curriculum
                                  .filter((subject) => subject.yearLevel === year && subject.semester === semester)
                                  .sort((a, b) => a.code.localeCompare(b.code));
                                if (semesterSubjects.length === 0) return [];

                                return [
                                  ...semesterSubjects.map((subject) => (
                                    <TableRow key={subject.id}>
                                      <TableCell className="whitespace-nowrap">{year}</TableCell>
                                      <TableCell className="whitespace-nowrap">{semester}</TableCell>
                                      <TableCell className="font-mono font-medium">{subject.code}</TableCell>
                                      <TableCell className="min-w-52">{subject.name}</TableCell>
                                      <TableCell className="text-center whitespace-nowrap">{subject.units}</TableCell>
                                      <TableCell>{subject.category || "None"}</TableCell>
                                    </TableRow>
                                  )),
                                  <TableRow key={`${year}-${semester}-total`} className="bg-muted/30">
                                    <TableCell colSpan={4} className="text-right font-medium">
                                      {year} {semester} total
                                    </TableCell>
                                    <TableCell className="text-center font-medium">
                                      {semesterSubjects.reduce((sum, subject) => sum + subject.units, 0)}
                                    </TableCell>
                                    <TableCell />
                                  </TableRow>,
                                ];
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <EmptyState
                        icon={Award}
                        title="No Curriculum Data"
                        description="Curriculum information is not available for this program."
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}