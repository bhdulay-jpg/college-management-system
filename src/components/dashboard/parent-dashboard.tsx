"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "./dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { EmptyState } from "../empty-state";
import { LoadingState } from "../loading-state";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Users, GraduationCap, CheckCircle, AlertCircle, BookOpen, Calendar, User, Eye, Mail, Phone, DollarSign, Bell } from "lucide-react";
import { collection, query, onSnapshot, where, getDocs, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRouter } from "../router";
import { formatDateShort } from "../../lib/date-formatter";
import { formatProgramDisplay } from "../../lib/program-service";

interface Student {
  id: string;
  name: string;
  email: string;
  studentId?: string;
  phone?: string;
  program?: string;
  yearLevel?: string;
  semester?: string;
  enrollmentType?: string;
  status?: string;
}

interface Grade {
  id: string;
  studentId: string;
  studentName: string;
  subjectCode: string;
  subjectName: string;
  grade: number;
  semester: string;
  schoolYear: string;
  gradedAt: any;
}

interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  subjectCode: string;
  subjectName: string;
  status: string;
  date: any;
  timeIn?: any;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  author: string;
  createdAt: any;
  priority?: string;
}

export function ParentDashboard() {
  const { user, navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Fetch students linked to this parent
  useEffect(() => {
    if (!user) return;

    console.log("[ParentDashboard] Fetching students for parent:", user.id);

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
        
        console.log(`[ParentDashboard] Found ${studentsData.length} linked students`);
        setStudents(studentsData);
        
        // Auto-select first student if available
        if (studentsData.length > 0 && !selectedStudent) {
          setSelectedStudent(studentsData[0]);
        }
        
        setLoading(false);
      }, (error) => {
        console.error("[ParentDashboard] Error fetching students:", error);
        setLoading(false);
      });

      return () => unsubscribeStudents();
    });

    return () => unsubscribeParent();
  }, [user]);

  // Fetch grades for all linked students
  useEffect(() => {
    if (students.length === 0) {
      setGrades([]);
      return;
    }

    const studentIds = students.map(s => s.id);
    
    // Firestore 'in' queries are limited to 10 items, so we need to handle this
    if (studentIds.length > 10) {
      console.warn("[ParentDashboard] More than 10 students linked. Only showing first 10.");
      studentIds.splice(10);
    }

    const gradesQuery = query(
      collection(db, "grades"),
      where("studentId", "in", studentIds)
    );

    const unsubscribe = onSnapshot(gradesQuery, (snapshot) => {
      const gradesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Grade[];
      
      console.log(`[ParentDashboard] Loaded ${gradesData.length} grade records`);
      setGrades(gradesData);
    });

    return () => unsubscribe();
  }, [students]);

  // Fetch attendance for all linked students
  useEffect(() => {
    if (students.length === 0) {
      setAttendance([]);
      return;
    }

    const studentIds = students.map(s => s.id);
    
    if (studentIds.length > 10) {
      studentIds.splice(10);
    }

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("studentId", "in", studentIds)
    );

    const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
      const attendanceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Attendance[];
      
      console.log(`[ParentDashboard] Loaded ${attendanceData.length} attendance records`);
      setAttendance(attendanceData);
    });

    return () => unsubscribe();
  }, [students]);

  // Fetch announcements
  useEffect(() => {
    const announcementsQuery = query(collection(db, "announcements"));

    const unsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
      const announcementsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Announcement[];
      
      // Sort by date, newest first
      announcementsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setAnnouncements(announcementsData);
    });

    return () => unsubscribe();
  }, []);

  // Filter data for selected student
  const selectedStudentGrades = selectedStudent 
    ? grades.filter(g => g.studentId === selectedStudent.id)
    : [];
  
  const selectedStudentAttendance = selectedStudent
    ? attendance.filter(a => a.studentId === selectedStudent.id)
    : [];

  // Calculate stats
  const stats = {
    totalChildren: students.length,
    totalGrades: grades.length,
    totalAttendance: attendance.length,
    announcements: announcements.length,
  };

  // Calculate attendance rate for selected student
  const attendanceStats = selectedStudentAttendance.reduce((acc, record) => {
    if (record.status === "present") acc.present++;
    else if (record.status === "absent") acc.absent++;
    else if (record.status === "late") acc.late++;
    return acc;
  }, { present: 0, absent: 0, late: 0 });

  const totalAttendanceRecords = attendanceStats.present + attendanceStats.absent + attendanceStats.late;
  const attendanceRate = totalAttendanceRecords > 0 
    ? ((attendanceStats.present / totalAttendanceRecords) * 100).toFixed(1)
    : "0";

  // Calculate average grade for selected student
  const averageGrade = selectedStudentGrades.length > 0
    ? (selectedStudentGrades.reduce((sum, g) => sum + g.grade, 0) / selectedStudentGrades.length).toFixed(2)
    : "N/A";

  if (loading) {
    return (
      <DashboardLayout userRole="Parent" userName={user?.name || "Parent"} notificationCount={0}>
        <div className="p-4 md:p-6">
          <LoadingState message="Loading student information..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Parent" userName={user?.name || "Parent"} notificationCount={stats.announcements}>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-8 space-y-8">
          {/* Welcome Section */}
          <div>
            <h1 className="text-muted-foreground mb-1">Welcome back,</h1>
            <p className="text-foreground/60">{user?.name || "Parent"}</p>
          </div>

          {/* Main Content */}
          {students.length > 0 ? (
            <>
              {/* Quick Navigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <button
                  onClick={() => navigate("dashboard/parent/children")}
                  className="p-6 border rounded-xl text-left bg-card hover:bg-accent/5 hover:border-blue-bayoux-400 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900/30 flex items-center justify-center group-hover:bg-blue-bayoux-200 dark:group-hover:bg-blue-bayoux-900/50 transition-colors">
                      <Users className="h-6 w-6 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                    </div>
                    <div className="text-3xl tabular-nums text-blue-bayoux-600 dark:text-blue-bayoux-400">{students.length}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-foreground">My Children</div>
                    <p className="text-sm text-muted-foreground">
                      View detailed information about your children
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("dashboard/parent/reports")}
                  className="p-6 border rounded-xl text-left bg-card hover:bg-accent/5 hover:border-blue-bayoux-400 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                      <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-3xl tabular-nums text-emerald-600 dark:text-emerald-400">{stats.totalGrades}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-foreground">Progress Reports</div>
                    <p className="text-sm text-muted-foreground">
                      View grades and attendance records
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("dashboard/parent/billing")}
                  className="p-6 border rounded-xl text-left bg-card hover:bg-accent/5 hover:border-blue-bayoux-400 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                      <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-3xl tabular-nums text-amber-600 dark:text-amber-400">₱0</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-foreground">Billing</div>
                    <p className="text-sm text-muted-foreground">
                      View payment history and records
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("dashboard/parent/announcements")}
                  className="p-6 border rounded-xl text-left bg-card hover:bg-accent/5 hover:border-blue-bayoux-400 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center group-hover:bg-sky-200 dark:group-hover:bg-sky-900/50 transition-colors">
                      <Bell className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div className="text-3xl tabular-nums text-sky-600 dark:text-sky-400">{stats.announcements}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-foreground">Announcements</div>
                    <p className="text-sm text-muted-foreground">
                      View campus news and updates
                    </p>
                  </div>
                </button>
              </div>

              {/* Recent Announcements */}
              {announcements.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2>Recent Announcements</h2>
                      <p className="text-sm text-muted-foreground">Stay updated with campus news</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => navigate("dashboard/parent/announcements")}
                      className="text-blue-bayoux-600 dark:text-blue-bayoux-400 hover:text-blue-bayoux-700 dark:hover:text-blue-bayoux-300"
                    >
                      View All
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {announcements.slice(0, 3).map((announcement) => (
                      <div key={announcement.id} className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900/30 flex items-center justify-center flex-shrink-0">
                            <Bell className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="truncate">{announcement.title}</h3>
                              {announcement.priority === "high" && (
                                <Badge variant="destructive" className="flex-shrink-0">High Priority</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{announcement.message}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="truncate">{announcement.author}</span>
                              <span>•</span>
                              <span className="flex-shrink-0">
                                {announcement.createdAt?.toDate?.()
                                  ? formatDateShort(announcement.createdAt.toDate().toISOString())
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <EmptyState
                  icon={Users}
                  title="No Students Found"
                  description="Your account hasn't been linked to any students yet. Please contact the registrar to link your children's accounts."
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}