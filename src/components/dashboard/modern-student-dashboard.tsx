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
  Activity,
  Megaphone,
  Users,
  DollarSign,
  CalendarClock
} from "lucide-react";
import { collection, query, onSnapshot, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRouter } from "../router";
import { StudentProgramInfo } from "./student-program-info";
import { useAnnouncementNotifications } from "../../hooks/use-announcement-notifications";

// @realtime @readonly @student_friendly_UI @modern_redesign
// Ultra-Modern Student Dashboard with semantic design system
// Comprehensive UI/UX improvements while preserving all backend logic

export function StudentDashboard() {
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
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());

  // Get real-time announcement notifications
  const notificationCount = useAnnouncementNotifications({
    userId: user?.uid || "",
    userRole: user?.role || "Student"
  });

  // Real-time statistics
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

    // Recent Activity - combine announcements and grades
    const recentAnnouncementsQuery = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc"),
      limit(3)
    );
    const unsubRecentAnnouncements = onSnapshot(
      recentAnnouncementsQuery,
      (snapshot) => {
        const activities = snapshot.docs.map(doc => ({
          id: doc.id,
          type: "announcement",
          ...doc.data()
        }));
        setRecentActivity(activities);
      }
    );
    unsubscribers.push(unsubRecentAnnouncements);

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
    if (percentage >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (percentage >= 75) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
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
        {/* Modern Hero Header */}
        <div className="bg-primary text-primary-foreground">
          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl tracking-tight">
                  Welcome back, {user?.name?.split(' ')[0] || 'Student'}
                </h1>
                <p className="opacity-90 text-lg">
                  Track your academic journey and stay on top of your progress
                </p>
              </div>
              
              {/* Sync Indicator */}
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-3.5 shadow-lg">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-pulse" />
                </div>
                <div className="text-sm">
                  <div className="font-medium">Live Sync</div>
                  <div className="text-xs opacity-80">{formatTimestamp(lastSynced)}</div>
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

          {/* Quick Stats Grid - Ultra Modern Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Enrolled Courses */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-md">
                        <BookOpen className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Enrolled</p>
                        <p className="text-xs text-muted-foreground">This Semester</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-4xl font-bold">
                        {stats.enrolledCourses}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Course{stats.enrolledCourses !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Rate */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
              <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAttendanceGradient(attendanceStats.presentPercentage)} flex items-center justify-center shadow-md`}>
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className={`text-sm ${getAttendanceColor(attendanceStats.presentPercentage)}`}>Attendance</p>
                        <p className="text-xs text-muted-foreground">Overall Rate</p>
                      </div>
                    </div>
                    <div>
                      <p className={`text-4xl font-bold ${getAttendanceColor(attendanceStats.presentPercentage)}`}>
                        {attendanceStats.presentPercentage}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {attendanceStats.total} total records
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grades */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                        <Award className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-amber-600 dark:text-amber-400">Grades</p>
                        <p className="text-xs text-muted-foreground">Total Records</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-4xl font-bold">
                        {stats.gradeRecords}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Graded subjects
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Announcements */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-md">
                        <Megaphone className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-rose-600 dark:text-rose-400">Updates</p>
                        <p className="text-xs text-muted-foreground">New Posts</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-4xl font-bold">
                          {stats.announcements}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Announcements
                        </p>
                      </div>
                      {notificationCount > 0 && (
                        <Badge className="bg-rose-500 text-white">
                          {notificationCount} new
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Access Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Quick Access</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* My Grades */}
              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-3 hover:bg-muted hover:border-primary transition-all group"
                onClick={() => window.location.href = "/student/grades"}
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium">My Grades</span>
              </Button>

              {/* My Schedule */}
              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-3 hover:bg-muted hover:border-primary transition-all group"
                onClick={() => window.location.href = "/student/schedule"}
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium">Schedule</span>
              </Button>

              {/* Tuition & Fees */}
              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-3 hover:bg-muted hover:border-primary transition-all group"
                onClick={() => window.location.href = "/student/tuition"}
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium">Tuition</span>
              </Button>

              {/* Announcements */}
              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-3 hover:bg-muted hover:border-primary transition-all group"
                onClick={() => window.location.href = "/student/announcements"}
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Megaphone className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium">Updates</span>
              </Button>
            </div>
          </div>

          {/* Recent Activity Section */}
          {recentActivity.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                      <Activity className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle>Recent Activity</CardTitle>
                      <CardDescription>Stay updated with what's new</CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-2">
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.slice(0, 3).map((activity, index) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                      <Megaphone className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {activity.title}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {activity.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {activity.postedByRole}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {activity.createdAt?.toDate?.().toLocaleDateString() || 'Recently'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Attendance Breakdown */}
          {attendanceStats.total > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <CalendarClock className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle>Attendance Overview</CardTitle>
                    <CardDescription>Your attendance breakdown</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{attendanceStats.present}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">Present</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{attendanceStats.late}</div>
                    <div className="text-xs text-amber-600 dark:text-amber-500 mt-1">Late</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                    <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{attendanceStats.absent}</div>
                    <div className="text-xs text-rose-600 dark:text-rose-500 mt-1">Absent</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
