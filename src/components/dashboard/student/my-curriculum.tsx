"use client";

// @realtime @readonly @registrar_controlled
// This component displays the official curriculum for the student's enrolled program
// Data is controlled by Registrar and Admin only - students can only VIEW

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { BookOpen, CheckCircle, Clock, XCircle, AlertCircle, GraduationCap } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { getProgramName } from "../../../lib/program-service";
import { StudentPageHeader } from "../../student-page-header";
import { DashboardLayout } from "../dashboard-layout";
import { extractProgramCode } from "../../../lib/program-utils";

interface Subject {
  id: string;
  subjectCode: string;
  subjectName: string;
  units: number;
  program: string;
  yearLevel: string;
  semester: string;
  prerequisites: string[];
  description?: string;
  category?: string;
}

interface StudentSubject {
  subjectCode: string;
  status: "enrolled" | "completed" | "dropped" | "pending";
}

interface StudentData {
  program: string;
  yearLevel: string;
  semester: string;
  studentId: string;
  uid: string; // Add Firebase UID
}

export function MyCurriculum() {
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [curriculumSubjects, setCurriculumSubjects] = useState<Subject[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("1");

  // Get current user data
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("[MyCurriculum] No authenticated user found");
      setLoading(false);
      return;
    }

    console.log("[MyCurriculum] Querying user data for UID:", currentUser.uid);

    const userQuery = query(
      collection(db, "users"),
      where("uid", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(userQuery, (snapshot) => {
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data() as StudentData;
        console.log("[MyCurriculum] User data loaded:", {
          program: userData.program,
          yearLevel: userData.yearLevel,
          semester: userData.semester,
          studentId: userData.studentId
        });
        setStudentData(userData);
      } else {
        console.error("[MyCurriculum] No user document found for UID:", currentUser.uid);
        setLoading(false);
      }
    }, (error) => {
      console.error("[MyCurriculum] Error fetching user data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time curriculum listener (filtered by student's program)
  useEffect(() => {
    if (!studentData?.program) {
      console.log("[MyCurriculum] No program data available, skipping curriculum load");
      setLoading(false);
      return;
    }

    // Extract program code for querying (handles both "BSIT" and "BSIT - Full Name" formats)
    const programCode = extractProgramCode(studentData.program);
    console.log("[MyCurriculum] Loading curriculum for program:", studentData.program);
    console.log("[MyCurriculum] Using program code for query:", programCode);

    const q = query(
      collection(db, "subjects"),
      where("program", "==", programCode)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Subject[];
      console.log(`[MyCurriculum] Loaded ${subjects.length} subjects for ${studentData.program}`);
      setCurriculumSubjects(subjects);
      setLoading(false);
    }, (error) => {
      console.error("[MyCurriculum] Error fetching curriculum:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentData?.program]);

  // Real-time student subjects listener
  useEffect(() => {
    if (!studentData?.uid) return;

    const q = query(
      collection(db, "studentSubjects"),
      where("studentId", "==", studentData.uid) // Use Firebase UID
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subjects = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          subjectCode: data.subjectCode,
          status: data.status,
        };
      }) as StudentSubject[];
      setStudentSubjects(subjects);
    });

    return () => unsubscribe();
  }, [studentData?.uid]);

  const getSubjectStatus = (subjectCode: string): { status: string; color: string; icon: any } => {
    const studentSubject = studentSubjects.find(s => s.subjectCode === subjectCode);
    
    if (!studentSubject) {
      return { status: "Not Taken", color: "bg-gray-500", icon: Clock };
    }

    switch (studentSubject.status) {
      case "completed":
        return { status: "Completed", color: "bg-info", icon: CheckCircle };
      case "enrolled":
        return { status: "Enrolled", color: "bg-success", icon: GraduationCap };
      case "pending":
        return { status: "Pending", color: "bg-warning", icon: AlertCircle };
      case "dropped":
        return { status: "Dropped", color: "bg-destructive", icon: XCircle };
      default:
        return { status: "Not Taken", color: "bg-muted", icon: Clock };
    }
  };

  const getSubjectsByYearSemester = (year: string, semester: string) => {
    return curriculumSubjects
      .filter(s => s.yearLevel === year && s.semester === semester)
      .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode));
  };

  const getTotalUnitsByYearSemester = (year: string, semester: string) => {
    return getSubjectsByYearSemester(year, semester).reduce((sum, s) => sum + s.units, 0);
  };

  const getCompletedUnits = () => {
    return curriculumSubjects
      .filter(s => {
        const studentSubject = studentSubjects.find(ss => ss.subjectCode === s.subjectCode);
        return studentSubject?.status === "completed";
      })
      .reduce((sum, s) => sum + s.units, 0);
  };

  const getTotalCurriculumUnits = () => {
    return curriculumSubjects.reduce((sum, s) => sum + s.units, 0);
  };

  if (loading) {
    return (
      <DashboardLayout userRole="Student" userName="Student" notificationCount={0}>
        <LoadingState message="Loading curriculum..." />
      </DashboardLayout>
    );
  }

  if (!studentData) {
    return (
      <DashboardLayout userRole="Student" userName="Student" notificationCount={0}>
        <div className="min-h-screen bg-background">
          <StudentPageHeader
            title="My Curriculum"
            description="Official curriculum for your program"
            icon={BookOpen}
          />
          <div className="max-w-7xl mx-auto px-6 md:px-8 py-6">
            <Card className="border-0 shadow-md bg-card">
              <CardContent className="py-12">
                <EmptyState
                  icon={AlertCircle}
                  title="Student data not found"
                  description="Unable to load your student information"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (curriculumSubjects.length === 0) {
    return (
      <DashboardLayout userRole="Student" userName="Student" notificationCount={0}>
        <div className="min-h-screen bg-background">
          <StudentPageHeader
            title="My Curriculum"
            description="Official curriculum for your program"
            icon={BookOpen}
          />
          <div className="max-w-7xl mx-auto px-6 md:px-8 py-6">
            <Card className="border-0 shadow-md bg-card">
              <CardContent className="py-12">
                <EmptyState
                  icon={BookOpen}
                  title="No curriculum available"
                  description="The curriculum for your program has not been set up yet. Please contact the registrar's office."
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const completedUnits = getCompletedUnits();
  const totalUnits = getTotalCurriculumUnits();
  const progressPercentage = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  return (
    <DashboardLayout userRole="Student" userName="Student" notificationCount={0}>
      <div className="min-h-screen bg-background">
        <StudentPageHeader
          title="My Curriculum"
          description="Official curriculum for your program - Read only"
          icon={BookOpen}
        />

        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 space-y-5">
        {/* Program Info and Progress */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-md bg-card">
            <CardHeader>
              <CardTitle>Program Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Program</div>
                <div className="font-medium text-foreground">{getProgramName(studentData.program)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">Year Level</div>
                  <div className="font-medium text-foreground">{studentData.yearLevel}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Semester</div>
                  <div className="font-medium text-foreground">{studentData.semester}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-card">
            <CardHeader>
              <CardTitle>Academic Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Units Completed</span>
                  <span className="font-medium text-foreground">{completedUnits} / {totalUnits} units</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div 
                    className="bg-primary h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{progressPercentage}% complete</div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2 bg-success/10 rounded border border-success/20">
                  <div className="text-xs text-success">Completed</div>
                  <div className="font-medium text-foreground">{studentSubjects.filter(s => s.status === 'completed').length}</div>
                </div>
                <div className="p-2 bg-info/10 rounded border border-info/20">
                  <div className="text-xs text-info">Enrolled</div>
                  <div className="font-medium text-foreground">{studentSubjects.filter(s => s.status === 'enrolled').length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Curriculum by Year Level */}
        <Card className="border-0 shadow-md bg-card">
          <CardHeader>
            <CardTitle>Curriculum Overview</CardTitle>
            <CardDescription>
              View subjects by year level and semester
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedYear} onValueChange={setSelectedYear}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="1">1st Year</TabsTrigger>
                <TabsTrigger value="2">2nd Year</TabsTrigger>
                <TabsTrigger value="3">3rd Year</TabsTrigger>
                <TabsTrigger value="4">4th Year</TabsTrigger>
              </TabsList>

              {["1", "2", "3", "4"].map(year => (
                <TabsContent key={year} value={year} className="mt-6 space-y-6">
                  {["1st Semester", "2nd Semester"].map(semester => {
                    const subjects = getSubjectsByYearSemester(`${year}${year === "1" ? "st" : year === "2" ? "nd" : year === "3" ? "rd" : "th"} Year`, semester);
                    const totalUnits = getTotalUnitsByYearSemester(`${year}${year === "1" ? "st" : year === "2" ? "nd" : year === "3" ? "rd" : "th"} Year`, semester);

                    if (subjects.length === 0) return null;

                    return (
                      <div key={semester}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium text-foreground">{semester}</h3>
                          <Badge variant="outline">{totalUnits} units total</Badge>
                        </div>
                        <div className="overflow-x-auto rounded-md border">
                          <Table className="min-w-[760px]">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead className="text-center">Units</TableHead>
                                <TableHead>Prerequisites</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                          {subjects.map(subject => {
                            const { status, color, icon: StatusIcon } = getSubjectStatus(subject.subjectCode);
                            return (
                              <TableRow key={subject.id}>
                                <TableCell className="font-mono font-medium">{subject.subjectCode}</TableCell>
                                <TableCell className="min-w-52">
                                  <div className="font-medium text-foreground">{subject.subjectName}</div>
                                  {subject.category && (
                                    <div className="mt-1 text-xs text-muted-foreground">{subject.category}</div>
                                  )}
                                  {subject.description && (
                                    <div className="mt-1 text-sm text-muted-foreground">{subject.description}</div>
                                  )}
                                </TableCell>
                                <TableCell className="text-center whitespace-nowrap">
                                  {subject.units} {subject.units === 1 ? "unit" : "units"}
                                </TableCell>
                                <TableCell>
                                  {subject.prerequisites?.length ? subject.prerequisites.join(", ") : "None"}
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${color} text-white whitespace-nowrap`}>
                                    <StatusIcon className="mr-1 h-3 w-3" />
                                    {status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}