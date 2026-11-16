"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "./dashboard-layout";
import { StatCard } from "./stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { EmptyState } from "../empty-state";
import { LoadingState } from "../loading-state";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { 
  BookOpen, Users, Calendar, ClipboardCheck, Clock, MapPin, 
  TrendingUp, ChevronRight, Grid3x3, List, AlertCircle,
  FileText, Megaphone
} from "lucide-react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRouter } from "../router";
import { cn } from "../ui/utils";

interface Schedule {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomId: string;
  room: string;
  section: string;
  program: string;
  yearLevel: string;
  semester: string;
  enrollmentType: string;
  enrolledStudents: string[];
  maxStudents: number;
}

interface SubjectEnrollment {
  id: string;
  studentId: string;
  studentName: string;
  scheduleId: string;
  subjectCode: string;
  status: string;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ENROLLMENT_TYPES = [
  { value: "morning", label: "Morning", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "afternoon", label: "Afternoon", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "evening", label: "Evening", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
];

export function EnhancedTeacherDashboard() {
  const { user } = useRouter();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [enrollments, setEnrollments] = useState<SubjectEnrollment[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Helper functions defined before use
  const parseTimeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getEnrollmentTypeConfig = (type: string) => {
    return ENROLLMENT_TYPES.find(t => t.value === type) || ENROLLMENT_TYPES[0];
  };

  const getCapacityColor = (enrolled: number, max: number) => {
    const percentage = (enrolled / max) * 100;
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-green-600";
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribers: (() => void)[] = [];

    // Load teacher's schedules - simplified query without multiple orderBy to avoid index requirement
    const schedulesQuery = query(
      collection(db, "schedules"),
      where("teacherId", "==", user.id)
    );
    const unsubSchedules = onSnapshot(schedulesQuery, (snapshot) => {
      const schedulesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Schedule[];
      
      // Sort in memory instead of in query
      schedulesData.sort((a, b) => {
        const dayCompare = DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek);
        if (dayCompare !== 0) return dayCompare;
        return a.startTime.localeCompare(b.startTime);
      });
      
      setSchedules(schedulesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching schedules:", error);
      setLoading(false);
    });
    unsubscribers.push(unsubSchedules);

    // Load enrollments for teacher's subjects
    const enrollmentsQuery = query(
      collection(db, "subjectEnrollments"),
      where("status", "==", "approved")
    );
    const unsubEnrollments = onSnapshot(enrollmentsQuery, (snapshot) => {
      const enrollmentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as SubjectEnrollment[];
      setEnrollments(enrollmentsData);
    }, (error) => {
      console.error("Error fetching enrollments:", error);
    });
    unsubscribers.push(unsubEnrollments);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user]);

  // Calculate statistics
  const stats = useMemo(() => {
    const uniqueSubjects = new Set(schedules.map(s => s.subjectId)).size;
    const totalStudents = schedules.reduce((sum, s) => sum + (s.enrolledStudents?.length || 0), 0);
    const totalClasses = schedules.length;
    
    // Calculate classes by day
    const classesByDay = schedules.reduce((acc, s) => {
      acc[s.dayOfWeek] = (acc[s.dayOfWeek] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const busiestDay = Object.entries(classesByDay).sort((a, b) => b[1] - a[1])[0];

    // Calculate teaching load (hours per week)
    const totalHoursPerWeek = schedules.reduce((sum, s) => {
      const start = parseTimeToMinutes(s.startTime);
      const end = parseTimeToMinutes(s.endTime);
      return sum + (end - start) / 60;
    }, 0);

    return {
      uniqueSubjects,
      totalStudents,
      totalClasses,
      busiestDay: busiestDay ? `${busiestDay[0]} (${busiestDay[1]} classes)` : "N/A",
      totalHoursPerWeek: totalHoursPerWeek.toFixed(1),
    };
  }, [schedules]);

  // Group schedules by day
  const schedulesByDay = useMemo(() => {
    return schedules.reduce((acc, schedule) => {
      if (!acc[schedule.dayOfWeek]) {
        acc[schedule.dayOfWeek] = [];
      }
      acc[schedule.dayOfWeek].push(schedule);
      return acc;
    }, {} as Record<string, Schedule[]>);
  }, [schedules]);

  const sortedDays = Object.keys(schedulesByDay).sort((a, b) => {
    return DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b);
  });

  // Get today's schedules
  const todaySchedules = useMemo(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return schedules.filter(s => s.dayOfWeek === today).sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
  }, [schedules]);

  const statCards = [
    { 
      title: "My Classes", 
      value: stats.totalClasses.toString(), 
      icon: BookOpen,
      description: `${stats.uniqueSubjects} unique subjects`
    },
    { 
      title: "Total Students", 
      value: stats.totalStudents.toString(), 
      icon: Users,
      description: "Across all classes"
    },
    { 
      title: "Teaching Load", 
      value: `${stats.totalHoursPerWeek}h`, 
      icon: Clock,
      description: "Hours per week"
    },
    { 
      title: "Busiest Day", 
      value: stats.busiestDay.split(" ")[0], 
      icon: TrendingUp,
      description: stats.busiestDay.includes("(") ? stats.busiestDay.match(/\(([^)]+)\)/)?.[1] || "" : "No classes"
    },
  ];

  if (loading) {
    return (
      <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
        <div className="p-4 md:p-6">
          <LoadingState message="Loading your teaching schedule..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1>Teacher Dashboard</h1>
            <p className="text-muted-foreground">Manage your classes, attendance, and grades</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {statCards.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Today's Classes Highlight */}
        {todaySchedules.length > 0 && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Today's Classes
                  </CardTitle>
                  <CardDescription>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </CardDescription>
                </div>
                <Badge variant="default" className="text-lg px-3 py-1">
                  {todaySchedules.length} {todaySchedules.length === 1 ? 'class' : 'classes'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todaySchedules.map((schedule) => {
                  const typeConfig = getEnrollmentTypeConfig(schedule.enrollmentType);
                  const enrolled = schedule.enrolledStudents?.length || 0;
                  const max = schedule.maxStudents || 0;
                  
                  return (
                    <div key={schedule.id} className="p-4 border rounded-lg bg-background hover:border-primary/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <div className="font-medium text-lg">{schedule.subjectCode}</div>
                            <Badge className={typeConfig.color}>
                              {typeConfig.label}
                            </Badge>
                            {schedule.section && (
                              <Badge variant="outline">Section {schedule.section}</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mb-3">
                            {schedule.subjectName}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{schedule.room}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className={getCapacityColor(enrolled, max)}>
                                {enrolled}/{max} students
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => router.navigate("dashboard/teacher/attendance")}
                            className="flex-1 sm:flex-none"
                          >
                            <ClipboardCheck className="h-4 w-4 sm:mr-2" />
                            <span className="sm:inline">Attendance</span>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => router.navigate("dashboard/teacher/gradebook")}
                            className="flex-1 sm:flex-none"
                          >
                            <FileText className="h-4 w-4 sm:mr-2" />
                            <span className="sm:inline">Grades</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content - Weekly Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  My Teaching Schedule
                </CardTitle>
                <CardDescription>All your assigned classes for this semester</CardDescription>
              </div>
              <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <TabsList>
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    List
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="flex items-center gap-2">
                    <Grid3x3 className="h-4 w-4" />
                    Calendar
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No Classes Assigned"
                description="You don't have any classes assigned yet. The registrar will assign classes to you through the schedule management system."
              />
            ) : viewMode === "list" ? (
              <div className="space-y-4">
                {sortedDays.map((day) => (
                  <div key={day} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">{day}</span>
                      </div>
                      <Badge variant="secondary">{schedulesByDay[day].length} classes</Badge>
                    </div>
                    <div className="divide-y">
                      {schedulesByDay[day].map((schedule) => {
                        const typeConfig = getEnrollmentTypeConfig(schedule.enrollmentType);
                        const enrolled = schedule.enrolledStudents?.length || 0;
                        const max = schedule.maxStudents || 0;
                        
                        return (
                          <div key={schedule.id} className="p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="font-medium">{schedule.subjectCode}</div>
                                  <Badge className={typeConfig.color}>
                                    {typeConfig.label}
                                  </Badge>
                                  {schedule.section && (
                                    <Badge variant="outline">Sec {schedule.section}</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground mb-2">
                                  {schedule.subjectName}
                                </div>
                                <div className="text-xs text-muted-foreground mb-3">
                                  {schedule.program.split(" - ")[0]} • {schedule.yearLevel} • {schedule.semester}
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span>{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    <span>{schedule.room}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3 text-muted-foreground" />
                                    <span className={getCapacityColor(enrolled, max)}>
                                      {enrolled}/{max}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <WeeklyCalendarView
                schedules={schedules}
                formatTime={formatTime}
                getEnrollmentTypeConfig={getEnrollmentTypeConfig}
              />
            )}
          </CardContent>
        </Card>

        <section aria-label="Quick access">
          <h2 className="mb-3 text-lg font-semibold">Quick access</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "My classes", detail: "View your assigned classes", route: "dashboard/teacher/classes", icon: BookOpen },
              { label: "Take attendance", detail: "Mark or review attendance", route: "dashboard/teacher/attendance", icon: ClipboardCheck },
              { label: "Enter grades", detail: "Update student grades", route: "dashboard/teacher/gradebook", icon: FileText },
              { label: "Announcements", detail: "Share updates with students", route: "dashboard/teacher/announcements", icon: Megaphone },
            ].map((item) => (
              <Button
                key={item.route}
                type="button"
                variant="outline"
                className="h-auto min-h-20 justify-between gap-3 whitespace-normal p-4 text-left"
                onClick={() => router.navigate(item.route)}
              >
                <span className="flex min-w-0 items-start gap-3">
                  <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <span className="block font-medium">{item.label}</span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">{item.detail}</span>
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Button>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

// Weekly Calendar View Component
function WeeklyCalendarView({ schedules, formatTime, getEnrollmentTypeConfig }: any) {
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-2 min-w-[900px]">
        {/* Header */}
        <div className="font-medium text-sm p-2 bg-muted rounded">Time</div>
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className="font-medium text-sm p-2 bg-muted rounded text-center">
            {day.substring(0, 3)}
          </div>
        ))}

        {/* Time slots */}
        {["07:00-12:00", "13:00-18:00", "18:00-21:00"].map((timeRange, idx) => {
          const [start, end] = timeRange.split("-");
          const label = idx === 0 ? "Morning" : idx === 1 ? "Afternoon" : "Evening";
          
          const cells = [
            <div key={`time-${timeRange}`} className="text-sm p-2 border rounded bg-muted/30">
              <div className="font-medium">{label}</div>
              <div className="text-xs text-muted-foreground">{start}-{end}</div>
            </div>,
            ...DAYS_OF_WEEK.map(day => {
              const daySchedules = schedules.filter((s: Schedule) => 
                s.dayOfWeek === day && 
                s.startTime >= start && 
                s.endTime <= end
              );

              return (
                <div key={`${day}-${timeRange}`} className="border rounded p-1 min-h-[80px] bg-background">
                  <div className="space-y-1">
                    {daySchedules.map((schedule: Schedule) => {
                      const typeConfig = getEnrollmentTypeConfig(schedule.enrollmentType);
                      return (
                        <div
                          key={schedule.id}
                          className={cn(
                            "p-2 rounded text-xs",
                            typeConfig.color
                          )}
                        >
                          <div className="font-medium truncate">
                            {schedule.subjectCode}
                          </div>
                          <div className="opacity-75 truncate">
                            {formatTime(schedule.startTime)}
                          </div>
                          <div className="opacity-75 truncate">
                            {schedule.room.split(" - ")[0]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ];
          
          return cells;
        }).flat()}
      </div>
    </div>
  );
}