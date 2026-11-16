"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "./dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { EmptyState } from "../empty-state";
import { LoadingState } from "../loading-state";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { 
  GraduationCap, 
  BookOpen, 
  CheckCircle, 
  Calendar, 
  TrendingUp, 
  Clock, 
  RefreshCw,
  AlertCircle,
  ChevronRight,
  BarChart3,
  FileText,
  CreditCard,
  Bell,
  Target,
  Award,
  Activity
} from "lucide-react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRouter } from "../router";
import { StudentProgramInfo } from "./student-program-info";
import { useAnnouncementNotifications } from "../../hooks/use-announcement-notifications";

// @realtime @readonly @student_friendly_UI @modern_redesign
// Enhanced Student Dashboard with real-time sync from Registrar Assignment System
// Redesigned with modern UI/UX while preserving all backend logic

export function RedesignedStudentDashboard() {
  const { user } = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    enrolledCourses: 0,
    attendanceRecords: 0,
    gradeRecords: 0,
    announcements: 0,
  });
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    late: 0,
    absent: 0,
    total: 0,
    presentPercentage: 0,
  });
  const [lastSynced, setLastSynced] = useState<Date>(new Date());

  // Get real-time announcement notifications
  const notificationCount = useAnnouncementNotifications({
    userId: user?.uid || "",
    userRole: user?.role || "Student"
  });

  // Real-time statistics - PRESERVED LOGIC
  useEffect(() => {
    if (!user || !user.uid) {
      setLoading(false);
      return;
    }

    const unsubscribers: (() => void)[] = [];

    // Count enrolled courses - using userId field
    const coursesQuery = query(
      collection(db, "enrollments"),
      where("userId", "==", user.uid)
    );
    const unsubCourses = onSnapshot(
      coursesQuery, 
      (snapshot) => {
        setStats(prev => ({ ...prev, enrolledCourses: snapshot.size }));
        setLastSynced(new Date());
      },
      (error) => {
        console.error("Error fetching enrolled courses:", error);
        setStats(prev => ({ ...prev, enrolledCourses: 0 }));
      }
    );
    unsubscribers.push(unsubCourses);

    // Count attendance records and calculate percentages
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("studentId", "==", user.uid)
    );
    const unsubAttendance = onSnapshot(
      attendanceQuery, 
      (snapshot) => {
        const records = snapshot.docs.map(doc => doc.data());
        const total = records.length;
        const present = records.filter(r => r.status === "present").length;
        const late = records.filter(r => r.status === "late").length;
        const absent = records.filter(r => r.status === "absent").length;
        const presentPercentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        setAttendanceStats({ present, late, absent, total, presentPercentage });
        setStats(prev => ({ ...prev, attendanceRecords: total }));
        setLastSynced(new Date());
      },
      (error) => {
        console.error("Error fetching attendance records:", error);
        setStats(prev => ({ ...prev, attendanceRecords: 0 }));
      }
    );
    unsubscribers.push(unsubAttendance);

    // Count grade records
    const gradesQuery = query(
      collection(db, "grades"),
      where("studentId", "==", user.uid)
    );
    const unsubGrades = onSnapshot(
      gradesQuery, 
      (snapshot) => {
        setStats(prev => ({ ...prev, gradeRecords: snapshot.size }));
        setLastSynced(new Date());
      },
      (error) => {
        console.error("Error fetching grade records:", error);
        setStats(prev => ({ ...prev, gradeRecords: 0 }));
      }
    );
    unsubscribers.push(unsubGrades);

    // Count announcements
    const announcementsQuery = query(collection(db, "announcements"));
    const unsubAnnouncements = onSnapshot(
      announcementsQuery, 
      (snapshot) => {
        setStats(prev => ({ ...prev, announcements: snapshot.size }));
        setLoading(false);
        setLastSynced(new Date());
      },
      (error) => {
        console.error("Error fetching announcements:", error);
        setStats(prev => ({ ...prev, announcements: 0 }));
        setLoading(false);
      }
    );
    unsubscribers.push(unsubAnnouncements);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user]);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleString();
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return "text-emerald-600";
    if (percentage >= 75) return "text-amber-600";
    return "text-rose-600";
  };

  const getAttendanceGradient = (percentage: number) => {
    if (percentage >= 90) return "from-emerald-500 to-green-600";
    if (percentage >= 75) return "from-amber-500 to-orange-600";
    return "from-rose-500 to-red-600";
  };

  if (loading) {
    return (
      <DashboardLayout userRole="Student" userName={user?.name || "Student"} notificationCount={0}>
        <div className="p-4 md:p-8">
          <LoadingState message="Loading your dashboard..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Student" userName={user?.name || "Student"} userId={user?.uid} notificationCount={notificationCount}>
      <div className="min-h-screen bg-background">
        {/* Hero Header Section */}
        <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-white">
          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl tracking-tight">
                  Welcome back, {user?.name?.split(' ')[0] || 'Student'}!
                </h1>
                <p className="text-white/90 text-lg">
                  Track your academic journey and stay on top of your progress
                </p>
              </div>
              
              {/* Sync Indicator */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3">
                <RefreshCw className="h-4 w-4 animate-pulse" />
                <div className="text-sm">
                  <div className="font-medium">Live Sync</div>
                  <div className="text-xs text-white/80">{formatTimestamp(lastSynced)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 -mt-8">
          {/* Program Info Card */}
          <StudentProgramInfo 
            programCode={user?.program} 
            yearLevel={user?.yearLevel}
            semester={user?.semester}
          />

          {/* Quick Stats Grid - Modern Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Enrolled Courses */}
            <Card className="border-0 elevation-md hover:elevation-lg transition-all duration-300 hover:-translate-y-1 bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">Enrolled</p>
                    </div>
                    <div>
                      <p className="text-4xl font-bold text-foreground">
                        {stats.enrolledCourses}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Course{stats.enrolledCourses !== 1 ? 's' : ''} this semester
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Rate */}
            <Card className="border-0 elevation-md hover:elevation-lg transition-all duration-300 hover:-translate-y-1 bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAttendanceGradient(attendanceStats.presentPercentage)} flex items-center justify-center`}>
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <p className="text-sm text-muted-foreground">Attendance</p>
                    </div>
                    <div>
                      <p className={`text-4xl font-bold ${getAttendanceColor(attendanceStats.presentPercentage)}`}>
                        {attendanceStats.presentPercentage}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {attendanceStats.total} total sessions
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grades */}
            <Card className="border-0 elevation-md hover:elevation-lg transition-all duration-300 hover:-translate-y-1 bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-info" />
                      </div>
                      <p className="text-sm text-muted-foreground">Grades</p>
                    </div>
                    <div>
                      <p className="text-4xl font-bold text-foreground">
                        {stats.gradeRecords}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Grade{stats.gradeRecords !== 1 ? 's' : ''} recorded
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Announcements */}
            <Card className="border-0 elevation-md hover:elevation-lg transition-all duration-300 hover:-translate-y-1 bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-warning" />
                      </div>
                      <p className="text-sm text-muted-foreground">Updates</p>
                    </div>
                    <div>
                      <p className="text-4xl font-bold text-foreground">
                        {stats.announcements}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Active announcement{stats.announcements !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Attendance Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Attendance Breakdown Card */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Attendance Analytics</CardTitle>
                        <CardDescription>Attendance performance</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {attendanceStats.total === 0 ? (
                    <EmptyState
                      icon={CheckCircle}
                      title="No attendance records yet"
                      description="Your teacher's attendance records will appear here after your classes"
                    />
                  ) : (
                    <div className="space-y-6">
                      {/* Main Percentage Display */}
                      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white">
                        <div className="absolute inset-0 bg-grid-white/5"></div>
                        <div className="relative z-10 text-center space-y-2">
                          <div className="text-sm text-slate-300 uppercase tracking-wider">Overall Attendance Rate</div>
                          <div className={`text-6xl md:text-7xl font-bold tracking-tight`}>
                            {attendanceStats.presentPercentage}%
                          </div>
                          <div className="text-slate-400">
                            {attendanceStats.present + attendanceStats.late} out of {attendanceStats.total} sessions attended
                          </div>
                        </div>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-slate-600 mb-2">
                          <span>Attendance Breakdown</span>
                          <span className="font-medium">{attendanceStats.total} sessions</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-4 flex overflow-hidden shadow-inner">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500"
                            style={{ width: `${(attendanceStats.present / attendanceStats.total) * 100}%` }}
                            title={`Present: ${attendanceStats.present}`}
                          ></div>
                          <div 
                            className="bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                            style={{ width: `${(attendanceStats.late / attendanceStats.total) * 100}%` }}
                            title={`Late: ${attendanceStats.late}`}
                          ></div>
                          <div 
                            className="bg-gradient-to-r from-rose-500 to-red-500 transition-all duration-500"
                            style={{ width: `${(attendanceStats.absent / attendanceStats.total) * 100}%` }}
                            title={`Absent: ${attendanceStats.absent}`}
                          ></div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 p-4 hover:shadow-md transition-shadow">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                              <CheckCircle className="h-6 w-6 text-white" />
                            </div>
                            <div className="text-2xl font-bold text-emerald-900">{attendanceStats.present}</div>
                            <div className="text-xs text-emerald-700 font-medium">Present</div>
                            <div className="text-sm font-bold text-emerald-600">
                              {Math.round((attendanceStats.present / attendanceStats.total) * 100)}%
                            </div>
                          </div>
                        </div>

                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4 hover:shadow-md transition-shadow">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                              <Clock className="h-6 w-6 text-white" />
                            </div>
                            <div className="text-2xl font-bold text-amber-900">{attendanceStats.late}</div>
                            <div className="text-xs text-amber-700 font-medium">Late</div>
                            <div className="text-sm font-bold text-amber-600">
                              {Math.round((attendanceStats.late / attendanceStats.total) * 100)}%
                            </div>
                          </div>
                        </div>

                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200 p-4 hover:shadow-md transition-shadow">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg">
                              <AlertCircle className="h-6 w-6 text-white" />
                            </div>
                            <div className="text-2xl font-bold text-rose-900">{attendanceStats.absent}</div>
                            <div className="text-xs text-rose-700 font-medium">Absent</div>
                            <div className="text-sm font-bold text-rose-600">
                              {Math.round((attendanceStats.absent / attendanceStats.total) * 100)}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Attendance Warning */}
                      {attendanceStats.presentPercentage < 75 && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 text-sm">
                            <p className="font-medium text-amber-900">Attendance below recommended level</p>
                            <p className="text-amber-700 mt-1">
                              Maintain at least 75% attendance to meet academic requirements
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Academic Progress Card */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-muted/50 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Academic Overview</CardTitle>
                      <CardDescription>Your performance summary</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Grades Card */}
                    <div className="group relative overflow-hidden rounded-xl border-2 bg-gradient-to-br from-muted/50 to-background p-6 hover:border-primary hover:shadow-lg transition-all">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <GraduationCap className="h-6 w-6 text-primary-foreground" />
                          </div>
                          <h3 className="font-semibold text-lg">My Grades</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          View detailed academic performance and course grades
                        </p>
                        <div className="flex items-baseline gap-2">
                          <div className="text-3xl font-bold">{stats.gradeRecords}</div>
                          <div className="text-sm text-muted-foreground">recorded</div>
                        </div>
                      </div>
                    </div>

                    {/* Performance Card */}
                    <div className="group relative overflow-hidden rounded-xl border-2 bg-gradient-to-br from-muted/50 to-background p-6 hover:border-primary hover:shadow-lg transition-all">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/80 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <TrendingUp className="h-6 w-6 text-primary-foreground" />
                          </div>
                          <h3 className="font-semibold text-lg">Performance</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Track your attendance and academic standing
                        </p>
                        <div className="flex items-baseline gap-2">
                          <div className={`text-3xl font-bold ${getAttendanceColor(attendanceStats.presentPercentage)}`}>
                            {attendanceStats.presentPercentage}%
                          </div>
                          <div className="text-sm text-muted-foreground">attendance</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Quick Actions & Info */}
            <div className="space-y-6">
              {/* Enrolled Courses */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-muted/50 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">My Courses</CardTitle>
                      <CardDescription>Current enrollment</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {stats.enrolledCourses > 0 ? (
                    <div className="space-y-4">
                      <div className="text-center p-6 bg-gradient-to-br from-muted/50 to-muted rounded-xl border-2">
                        <div className="text-5xl font-bold mb-2">
                          {stats.enrolledCourses}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Course{stats.enrolledCourses !== 1 ? 's' : ''} Enrolled
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Access your schedule and grades in the respective sections
                      </p>
                    </div>
                  ) : (
                    <EmptyState
                      icon={BookOpen}
                      title="No courses yet"
                      description="Contact the registrar's office for enrollment"
                    />
                  )}
                </CardContent>
              </Card>

              {/* Announcements */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-muted/50 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Announcements</CardTitle>
                      <CardDescription>Latest updates</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {stats.announcements > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Bell className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-2xl font-bold text-amber-900 dark:text-amber-200">{stats.announcements}</div>
                          <div className="text-sm text-amber-700 dark:text-amber-400">Active announcement{stats.announcements !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Check the Announcements page for important campus updates
                      </p>
                    </div>
                  ) : (
                    <EmptyState
                      icon={Calendar}
                      title="No updates"
                      description="Check back later for announcements"
                    />
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats Summary */}
              <Card className="border-0 shadow-lg overflow-hidden bg-primary text-primary-foreground">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      <h3 className="font-semibold">Quick Stats</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="opacity-80">Courses</span>
                        <span className="font-bold">{stats.enrolledCourses}</span>
                      </div>
                      <Separator className="opacity-20" />
                      <div className="flex justify-between items-center text-sm">
                        <span className="opacity-80">Attendance</span>
                        <span className={`font-bold ${getAttendanceColor(attendanceStats.presentPercentage)}`}>
                          {attendanceStats.presentPercentage}%
                        </span>
                      </div>
                      <Separator className="opacity-20" />
                      <div className="flex justify-between items-center text-sm">
                        <span className="opacity-80">Grades</span>
                        <span className="font-bold">{stats.gradeRecords}</span>
                      </div>
                      <Separator className="opacity-20" />
                      <div className="flex justify-between items-center text-sm">
                        <span className="opacity-80">Sessions</span>
                        <span className="font-bold text-emerald-400 dark:text-emerald-300">{attendanceStats.total}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}