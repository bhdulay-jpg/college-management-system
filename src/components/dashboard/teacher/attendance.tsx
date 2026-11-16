"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "../dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import {
  ClipboardCheck, Users, Calendar, Search, Save,
  CheckCircle2, XCircle, Clock, BookOpen, Filter,
  AlertCircle, ArrowLeft,
  CheckCheck, Zap, Send, MessageSquare, Download,
  TrendingUp, TrendingDown, BarChart3, Activity,
  Bell, Mail, FileText, Settings, Home, History,
  Keyboard, X, Eye, ChevronRight
} from "lucide-react";
import { collection, query, onSnapshot, where, addDoc, getDocs, Timestamp, orderBy, limit } from "firebase/firestore";
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
import { cn } from "../../ui/utils";
import { Textarea } from "../../ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../ui/dialog";

interface Schedule {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  section: string;
  enrolledStudents: string[];
  enrollmentType: string;
  room?: string;
}

interface Student {
  id: string;
  name: string;
  studentNumber: string;
  email: string;
  parentEmail?: string;
  parentPhone?: string;
}

interface AttendanceRecord {
  id: string;
  scheduleId: string;
  teacherId: string;
  studentId: string;
  status: "present" | "absent" | "late" | "excused";
  date: Date;
  remarks?: string;
}

interface AttendanceEntry {
  studentId: string;
  status: "present" | "absent" | "late" | "excused";
  remarks?: string;
}

interface MessageTemplate {
  id: string;
  title: string;
  content: string;
}

const ENROLLMENT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "morning", label: "Morning", color: "bg-warning/10 text-warning border-warning/20" },
  { value: "afternoon", label: "Afternoon", color: "bg-info/10 text-info border-info/20" },
  { value: "evening", label: "Evening", color: "bg-accent/10 text-accent border-accent/20" },
];

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "absent-parent",
    title: "Student Absent (to Parent)",
    content: "Dear Parent/Guardian,\n\nThis is to inform you that your child {studentName} was marked absent in {subjectName} today ({date}).\n\nIf this was unplanned, please contact us at your earliest convenience.\n\nThank you."
  },
  {
    id: "late-parent",
    title: "Student Late (to Parent)",
    content: "Dear Parent/Guardian,\n\nYour child {studentName} arrived late to {subjectName} class today ({date}).\n\nPlease ensure timely arrival to avoid missing important lessons.\n\nThank you."
  },
  {
    id: "attendance-pattern",
    title: "Attendance Concern",
    content: "Dear Parent/Guardian,\n\nWe've noticed a pattern of absences/tardiness for {studentName} in {subjectName}.\n\nCurrent attendance rate: {attendanceRate}%\n\nWe'd like to discuss this with you. Please let us know a convenient time.\n\nBest regards."
  },
  {
    id: "good-attendance",
    title: "Excellent Attendance",
    content: "Dear Parent/Guardian,\n\n{studentName} has maintained excellent attendance in {subjectName}!\n\nAttendance rate: {attendanceRate}%\n\nWe appreciate your support in ensuring consistent attendance.\n\nKeep up the great work!"
  }
];

type ViewMode = "dashboard" | "take-attendance" | "history" | "messaging" | "reports";

export function Attendance() {
  const { user } = useRouter();
  const router = useRouter();
  
  // Core State
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendance, setAttendance] = useState<Map<string, AttendanceEntry>>(new Map());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  
  // Messaging State
  const [showMessaging, setShowMessaging] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Keyboard Shortcuts
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  
  // Analytics State
  const [dateRange, setDateRange] = useState("7"); // days
  
  // Day Schedule Restriction
  const [showDayMismatchDialog, setShowDayMismatchDialog] = useState(false);
  const [pendingSchedule, setPendingSchedule] = useState<Schedule | null>(null);

  // Load all schedules
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

  // Real-time enrollment counts for all schedules
  useEffect(() => {
    if (schedules.length === 0) return;

    const unsubscribers: (() => void)[] = [];

    schedules.forEach(schedule => {
      const q = query(
        collection(db, "studentSubjects"),
        where("scheduleId", "==", schedule.id),
        where("status", "==", "enrolled")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setEnrollmentCounts(prev => ({
          ...prev,
          [schedule.id]: snapshot.size
        }));
      });

      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [schedules]);

  // Load all attendance records for analytics
  useEffect(() => {
    if (!user) return;

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("teacherId", "==", user.id),
      orderBy("date", "desc"),
      limit(500)
    );

    const unsubAttendance = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const records = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate(),
        })) as AttendanceRecord[];

        setAllAttendanceRecords(records);
      },
      (error) => {
        console.error("Error fetching attendance:", error);
      }
    );

    return () => unsubAttendance();
  }, [user]);

  // Load students for selected schedule
  useEffect(() => {
    if (!selectedSchedule) {
      setStudents([]);
      return;
    }

    setLoadingStudents(true);

    // Real-time listener for enrolled students
    const studentSubjectsQuery = query(
      collection(db, "studentSubjects"),
      where("scheduleId", "==", selectedSchedule.id),
      where("status", "==", "enrolled")
    );
    
    const unsubscribe = onSnapshot(studentSubjectsQuery, async (snapshot) => {
      const enrolledStudentIds = snapshot.docs.map(doc => doc.data().studentId);
      
      if (enrolledStudentIds.length === 0) {
        setStudents([]);
        setLoadingStudents(false);
        return;
      }

      try {
        // Get user details for enrolled students using Firebase user IDs
        const usersQuery = query(
          collection(db, "users"),
          where("role", "==", "Student")
        );
        const usersSnapshot = await getDocs(usersQuery);
        const allStudents = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Student[];

        // Filter to only enrolled students by matching Firebase user ID
        const enrolledStudents = allStudents.filter(student =>
          enrolledStudentIds.includes(student.id)
        );

        setStudents(enrolledStudents);

        // Initialize attendance for all students as present (for manual mode)
        const initialAttendance = new Map<string, AttendanceEntry>();
        enrolledStudents.forEach(student => {
          initialAttendance.set(student.id, {
            studentId: student.id,
            status: "present",
          });
        });
        setAttendance(initialAttendance);

      } catch (error) {
        console.error("Error loading students:", error);
      } finally {
        setLoadingStudents(false);
      }
    });

    return () => unsubscribe();
  }, [selectedSchedule]);

  // Load existing attendance records for selected date
  useEffect(() => {
    if (!selectedSchedule || !user) return;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("scheduleId", "==", selectedSchedule.id),
      where("teacherId", "==", user.id)
    );

    const unsubAttendance = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const records = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate(),
        })) as AttendanceRecord[];

        // Filter by selected date
        const dateRecords = records.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= startOfDay && recordDate <= endOfDay;
        });

        setAttendanceRecords(dateRecords);

        // Update attendance map with existing records
        if (dateRecords.length > 0) {
          const newAttendance = new Map(attendance);
          dateRecords.forEach(record => {
            newAttendance.set(record.studentId, {
              studentId: record.studentId,
              status: record.status,
              remarks: record.remarks
            });
          });
          setAttendance(newAttendance);
          setHasUnsavedChanges(false);
        }
      },
      (error) => {
        console.error("Error fetching attendance:", error);
      }
    );

    return () => unsubAttendance();
  }, [selectedSchedule, selectedDate, user]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only work when in take-attendance mode and not typing in input
      if (viewMode !== "take-attendance" || !selectedSchedule) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveAttendance();
      }
      
      // Ctrl/Cmd + M to toggle messaging
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        setShowMessaging(!showMessaging);
      }
      
      // ? to show shortcuts
      if (e.key === '?') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [viewMode, selectedSchedule, showMessaging, hasUnsavedChanges]);

  const handleStatusChange = (studentId: string, status: "present" | "absent" | "late" | "excused") => {
    setAttendance(prev => {
      const newAttendance = new Map(prev);
      const existing = prev.get(studentId);
      newAttendance.set(studentId, { 
        studentId, 
        status,
        remarks: existing?.remarks
      });
      return newAttendance;
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveAttendance = async () => {
    if (!selectedSchedule || !user) return;

    setSaving(true);
    try {
      const attendanceDate = new Date(selectedDate);
      
      const promises = Array.from(attendance.values()).map(entry => {
        return addDoc(collection(db, "attendance"), {
          scheduleId: selectedSchedule.id,
          subjectCode: selectedSchedule.subjectCode,
          subjectName: selectedSchedule.subjectName,
          section: selectedSchedule.section,
          teacherId: user.id,
          teacherName: user.name,
          studentId: entry.studentId,
          status: entry.status,
          date: Timestamp.fromDate(attendanceDate),
          remarks: entry.remarks || "",
          createdAt: Timestamp.now(),
        });
      });

      await Promise.all(promises);
      setHasUnsavedChanges(false);
      toast.success("Attendance saved!", {
        description: `Recorded for ${students.length} students`
      });
      
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const handleExportAttendance = () => {
    if (!selectedSchedule) return;

    const csvContent = [
      ["Student Name", "Student Number", "Status", "Date"],
      ...Array.from(attendance.values()).map(entry => {
        const student = students.find(s => s.id === entry.studentId);
        return [
          student?.name || "",
          student?.studentNumber || "",
          entry.status,
          selectedDate,
        ];
      })
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${selectedSchedule.subjectCode}-${selectedDate}.csv`;
    a.click();
    
    toast.success("Attendance exported", {
      description: "CSV file downloaded"
    });
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim() || selectedStudents.length === 0) {
      toast.error("Please select students and enter a message");
      return;
    }

    setSendingMessage(true);
    try {
      const promises = selectedStudents.map(studentId => {
        const student = students.find(s => s.id === studentId);
        return addDoc(collection(db, "messages"), {
          from: user?.id,
          fromName: user?.name,
          fromRole: "Teacher",
          to: studentId,
          toName: student?.name,
          toRole: "Student",
          subject: `Attendance Update - ${selectedSchedule?.subjectName}`,
          content: messageContent,
          scheduleId: selectedSchedule?.id,
          date: Timestamp.now(),
          read: false,
          parentCopy: true, // Also notify parent
        });
      });

      await Promise.all(promises);
      
      toast.success("Messages sent!", {
        description: `Sent to ${selectedStudents.length} student${selectedStudents.length > 1 ? 's' : ''}`
      });
      
      setShowMessaging(false);
      setMessageContent("");
      setSelectedStudents([]);
      setSelectedTemplate("");
    } catch (error) {
      console.error("Error sending messages:", error);
      toast.error("Failed to send messages");
    } finally {
      setSendingMessage(false);
    }
  };

  const applyMessageTemplate = (templateId: string) => {
    const template = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    if (!template || !selectedSchedule) return;

    let content = template.content;
    content = content.replace("{subjectName}", selectedSchedule.subjectName);
    content = content.replace("{date}", new Date(selectedDate).toLocaleDateString());
    
    setMessageContent(content);
    setSelectedTemplate(templateId);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getEnrollmentTypeConfig = (type: string) => {
    return ENROLLMENT_TYPES.find(t => t.value === type) || ENROLLMENT_TYPES[1];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present": return "bg-success/10 text-success border-success/20";
      case "absent": return "bg-destructive/10 text-destructive border-destructive/20";
      case "late": return "bg-warning/10 text-warning border-warning/20";
      case "excused": return "bg-info/10 text-info border-info/20";
      default: return "";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present": return CheckCircle2;
      case "absent": return XCircle;
      case "late": return Clock;
      case "excused": return AlertCircle;
      default: return CheckCircle2;
    }
  };

  const isScheduledToday = (schedule: Schedule) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return schedule.dayOfWeek === today;
  };

  const handleScheduleSelect = (schedule: Schedule) => {
    if (!isScheduledToday(schedule)) {
      setPendingSchedule(schedule);
      setShowDayMismatchDialog(true);
    } else {
      setSelectedSchedule(schedule);
    }
  };

  const proceedWithSchedule = () => {
    if (pendingSchedule) {
      setSelectedSchedule(pendingSchedule);
      setShowDayMismatchDialog(false);
      setPendingSchedule(null);
    }
  };

  const cancelScheduleSelection = () => {
    setShowDayMismatchDialog(false);
    setPendingSchedule(null);
  };

  // Calculate today's statistics
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = allAttendanceRecords.filter(r => {
      const recordDate = new Date(r.date).toISOString().split('T')[0];
      return recordDate === today;
    });

    const totalClasses = schedules.filter(s => s.dayOfWeek === new Date().toLocaleDateString('en-US', { weekday: 'long' })).length;
    const present = todayRecords.filter(r => r.status === "present").length;
    const absent = todayRecords.filter(r => r.status === "absent").length;
    const late = todayRecords.filter(r => r.status === "late").length;
    
    return { totalClasses, present, absent, late, totalRecords: todayRecords.length };
  }, [allAttendanceRecords, schedules]);

  // Calculate at-risk students (frequent absences)
  const atRiskStudents = useMemo(() => {
    const studentAbsences = new Map<string, { count: number; student: Student; lastAbsent: Date }>();

    allAttendanceRecords.forEach(record => {
      if (record.status === "absent") {
        const existing = studentAbsences.get(record.studentId);
        if (existing) {
          existing.count++;
          if (record.date > existing.lastAbsent) {
            existing.lastAbsent = record.date;
          }
        } else {
          const student = students.find(s => s.id === record.studentId);
          if (student) {
            studentAbsences.set(record.studentId, {
              count: 1,
              student,
              lastAbsent: record.date
            });
          }
        }
      }
    });

    return Array.from(studentAbsences.values())
      .filter(item => item.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allAttendanceRecords, students]);

  // Get today's classes
  const todayClasses = useMemo(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return schedules.filter(s => s.dayOfWeek === today);
  }, [schedules]);

  // Calculate current attendance stats if in take-attendance mode
  const currentStats = useMemo(() => {
    const present = Array.from(attendance.values()).filter(a => a.status === "present").length;
    const absent = Array.from(attendance.values()).filter(a => a.status === "absent").length;
    const late = Array.from(attendance.values()).filter(a => a.status === "late").length;
    const excused = Array.from(attendance.values()).filter(a => a.status === "excused").length;
    const total = students.length;
    return { present, absent, late, excused, total };
  }, [attendance, students]);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      const matchesSearch = 
        schedule.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.subjectName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === "all" || schedule.enrollmentType === filterType;

      return matchesSearch && matchesType;
    });
  }, [schedules, searchTerm, filterType]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  if (loading) {
    return (
      <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
        <div className="p-4 md:p-6">
          <LoadingState message="Loading attendance..." />
        </div>
      </DashboardLayout>
    );
  }

  // Keyboard Shortcuts Modal
  const KeyboardShortcutsDialog = () => (
    <Dialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>Quick access keys for faster workflow</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm">Save Attendance</span>
            <Badge variant="outline">Ctrl/Cmd + S</Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm">Open Messaging</span>
            <Badge variant="outline">Ctrl/Cmd + M</Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm">Show Shortcuts</span>
            <Badge variant="outline">?</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">Search Students</span>
            <Badge variant="outline">Focus search bar</Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Dashboard View
  if (viewMode === "dashboard") {
    return (
      <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
        <div className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" />
                Attendance
              </h1>
              <p className="text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowKeyboardShortcuts(true)}>
                <Keyboard className="h-4 w-4 mr-2" />
                Shortcuts
              </Button>
              <Button onClick={() => setViewMode("reports")}>
                <BarChart3 className="h-4 w-4 mr-2" />
                View Reports
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Today's Classes</div>
                  <div className="text-3xl font-bold">{todayStats.totalClasses}</div>
                  <div className="text-xs text-muted-foreground">{todayClasses.length} scheduled now</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Present Today</div>
                  <div className="text-3xl font-bold text-green-600">{todayStats.present}</div>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    Good attendance
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Absent Today</div>
                  <div className="text-3xl font-bold text-red-600">{todayStats.absent}</div>
                  {todayStats.absent > 5 && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      Needs attention
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Late Today</div>
                  <div className="text-3xl font-bold text-yellow-600">{todayStats.late}</div>
                  <div className="text-xs text-muted-foreground">Punctuality matters</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Classes */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Today's Classes
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setViewMode("take-attendance")}>
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <CardDescription>
                  {todayClasses.length} class{todayClasses.length !== 1 ? 'es' : ''} scheduled for today
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayClasses.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="No classes today"
                    description="You have no scheduled classes for today."
                  />
                ) : (
                  <div className="space-y-3">
                    {todayClasses.map(schedule => {
                      const typeConfig = getEnrollmentTypeConfig(schedule.enrollmentType);
                      const enrolled = enrollmentCounts[schedule.id] || 0;
                      const classRecords = allAttendanceRecords.filter(r => 
                        r.scheduleId === schedule.id && 
                        new Date(r.date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                      );
                      const hasRecorded = classRecords.length > 0;

                      return (
                        <div
                          key={schedule.id}
                          onClick={() => {
                            handleScheduleSelect(schedule);
                            setViewMode("take-attendance");
                          }}
                          className="p-4 border rounded-lg hover:border-primary/50 cursor-pointer transition-all hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="font-medium">{schedule.subjectCode}</div>
                                <Badge className={typeConfig.color} variant="outline">
                                  {typeConfig.label}
                                </Badge>
                                {schedule.section && (
                                  <Badge variant="outline">Sec {schedule.section}</Badge>
                                )}
                                {hasRecorded && (
                                  <Badge variant="success">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Recorded
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mb-2">
                                {schedule.subjectName}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {enrolled} students
                                </div>
                                {schedule.room && (
                                  <div className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    Room {schedule.room}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button size="sm" variant={hasRecorded ? "outline" : "default"}>
                              <ClipboardCheck className="h-4 w-4 mr-2" />
                              {hasRecorded ? "View" : "Take Attendance"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* At-Risk Students */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  At-Risk Students
                </CardTitle>
                <CardDescription>Frequent absences detected</CardDescription>
              </CardHeader>
              <CardContent>
                {atRiskStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">All students have good attendance!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {atRiskStudents.map(item => (
                      <div key={item.student.id} className="p-3 border rounded-lg border-destructive/20 bg-destructive/10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.student.name}</div>
                            <div className="text-xs text-muted-foreground">{item.student.studentNumber}</div>
                          </div>
                          <Badge variant="destructive">{item.count} absences</Badge>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Last absent: {item.lastAbsent.toLocaleDateString()}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => {
                            setSelectedStudents([item.student.id]);
                            setShowMessaging(true);
                            applyMessageTemplate("attendance-pattern");
                          }}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Contact Parent
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setViewMode("take-attendance")}
                >
                  <ClipboardCheck className="h-6 w-6" />
                  <span>Take Attendance</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setViewMode("history")}
                >
                  <History className="h-6 w-6" />
                  <span>View History</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setShowMessaging(true)}
                >
                  <MessageSquare className="h-6 w-6" />
                  <span>Send Message</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setViewMode("reports")}
                >
                  <BarChart3 className="h-6 w-6" />
                  <span>View Reports</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <KeyboardShortcutsDialog />

        {/* Day Mismatch Dialog */}
        <Dialog open={showDayMismatchDialog} onOpenChange={setShowDayMismatchDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Class Not Scheduled Today
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-4">
                <p>
                  This class is scheduled for{" "}
                  <span className="font-semibold text-foreground">
                    {pendingSchedule?.dayOfWeek}
                  </span>
                  , but today is{" "}
                  <span className="font-semibold text-foreground">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                  </span>
                  .
                </p>
                <p className="text-sm">
                  Taking attendance for classes on non-scheduled days should only be done for:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside pl-2">
                  <li>Makeup classes</li>
                  <li>Special sessions</li>
                  <li>Rescheduled classes</li>
                </ul>
                <p className="text-sm font-medium">
                  Do you want to proceed with taking attendance for this class?
                </p>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={cancelScheduleSelection}>
                Cancel
              </Button>
              <Button onClick={proceedWithSchedule}>
                Yes, Proceed
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    );
  }

  // Take Attendance View
  if (viewMode === "take-attendance") {
    const hasExistingRecords = attendanceRecords.length > 0;
    const typeConfig = selectedSchedule ? getEnrollmentTypeConfig(selectedSchedule.enrollmentType) : null;

    return (
      <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
        <div className="p-4 md:p-6 space-y-6">
          {/* Header with Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (hasUnsavedChanges) {
                    if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
                      setViewMode("dashboard");
                      setSelectedSchedule(null);
                      setHasUnsavedChanges(false);
                    }
                  } else {
                    setViewMode("dashboard");
                    setSelectedSchedule(null);
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              {selectedSchedule && (
                <div>
                  <h1 className="text-xl font-bold">{selectedSchedule.subjectCode} - {selectedSchedule.subjectName}</h1>
                  <p className="text-sm text-muted-foreground">
                    {selectedSchedule.section ? `Section ${selectedSchedule.section} • ` : ''}
                    {formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedSchedule && !isScheduledToday(selectedSchedule) && (
                <Badge variant="outline" className="border-warning text-warning bg-warning/10">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Not Scheduled Today
                </Badge>
              )}
              {hasUnsavedChanges && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={handleExportAttendance}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                size="sm"
                onClick={() => setShowMessaging(true)}
                variant="outline"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Button>
              <Button onClick={handleSaveAttendance} disabled={saving || !hasUnsavedChanges} size="lg">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </div>

          {/* Class Selection or Attendance Marking */}
          {!selectedSchedule ? (
            <>
              {/* Filters */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by subject..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-full md:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ENROLLMENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Classes List */}
              {filteredSchedules.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <EmptyState
                      icon={ClipboardCheck}
                      title="No Classes Found"
                      description="No classes match your search criteria."
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSchedules.map((schedule) => {
                    const typeConfig = getEnrollmentTypeConfig(schedule.enrollmentType);
                    const enrolled = enrollmentCounts[schedule.id] || 0;
                    const isToday = isScheduledToday(schedule);

                    return (
                      <Card
                        key={schedule.id}
                        onClick={() => handleScheduleSelect(schedule)}
                        className={cn(
                          "cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg",
                          isToday && "border-primary/30 bg-primary/5"
                        )}
                      >
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-lg">{schedule.subjectCode}</div>
                                <Badge className={typeConfig.color}>
                                  {typeConfig.label}
                                </Badge>
                                {isToday && (
                                  <Badge variant="default" className="bg-primary">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Today
                                  </Badge>
                                )}
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {schedule.subjectName}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{enrolled} students</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{schedule.dayOfWeek}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Mode Selection & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Select Date</label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                      {hasExistingRecords && (
                        <div className="flex items-center gap-2 text-xs text-yellow-600">
                          <AlertCircle className="h-3 w-3" />
                          Already recorded
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Quick Actions</label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            students.forEach(student => {
                              handleStatusChange(student.id, "present");
                            });
                          }}
                          className="flex-1"
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            students.forEach(student => {
                              handleStatusChange(student.id, "absent");
                            });
                          }}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-green-600">{currentStats.present}</div>
                    <div className="text-sm text-muted-foreground">Present</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-500">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-yellow-600">{currentStats.late}</div>
                    <div className="text-sm text-muted-foreground">Late</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-red-600">{currentStats.absent}</div>
                    <div className="text-sm text-muted-foreground">Absent</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-blue-600">{currentStats.excused}</div>
                    <div className="text-sm text-muted-foreground">Excused</div>
                  </CardContent>
                </Card>
              </div>

              {/* Student List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Students ({filteredStudents.length}/{students.length})
                      </CardTitle>
                      <CardDescription>Click to mark each student’s attendance status.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search students..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingStudents ? (
                    <LoadingState message="Loading students..." />
                  ) : filteredStudents.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="No Students Found"
                      description="No students match your search."
                    />
                  ) : (
                    <div className="space-y-2">
                      {filteredStudents.map((student, index) => {
                        const studentAttendance = attendance.get(student.id);
                        const status = studentAttendance?.status || "absent";
                        const StatusIcon = getStatusIcon(status);
                        return (
                          <div
                            key={student.id}
                            className={cn(
                              "flex items-center justify-between p-4 border-2 rounded-lg transition-all",
                              "hover:border-primary/30"
                            )}
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium">{student.name}</div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {student.studentNumber}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="grid grid-cols-4 gap-1">
                                {(["present", "late", "absent", "excused"] as const).map((s) => {
                                  const Icon = getStatusIcon(s);
                                  return (
                                    <Button
                                      key={s}
                                      size="sm"
                                      variant={status === s ? "default" : "outline"}
                                      className={cn(
                                        "w-20",
                                        status === s && getStatusColor(s)
                                      )}
                                      onClick={() => handleStatusChange(student.id, s)}
                                    >
                                      <Icon className="h-4 w-4 mr-1" />
                                      {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Messaging Dialog */}
        <Dialog open={showMessaging} onOpenChange={setShowMessaging}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Send Message
              </DialogTitle>
              <DialogDescription>
                Send attendance updates to students and parents
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Students</label>
                <div className="mt-2 max-h-[200px] overflow-y-auto border rounded-lg p-3 space-y-2">
                  {students.map(student => (
                    <div key={student.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`msg-${student.id}`}
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id]);
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor={`msg-${student.id}`} className="text-sm flex-1 cursor-pointer">
                        {student.name} - {student.studentNumber}
                      </label>
                      <Badge className={getStatusColor(attendance.get(student.id)?.status || "absent")}>
                        {attendance.get(student.id)?.status || "absent"}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const absentIds = Array.from(attendance.values())
                        .filter(a => a.status === "absent")
                        .map(a => a.studentId);
                      setSelectedStudents(absentIds);
                    }}
                  >
                    Select Absent
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const lateIds = Array.from(attendance.values())
                        .filter(a => a.status === "late")
                        .map(a => a.studentId);
                      setSelectedStudents(lateIds);
                    }}
                  >
                    Select Late
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedStudents(students.map(s => s.id))}
                  >
                    Select All
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Message Template</label>
                <Select value={selectedTemplate} onValueChange={applyMessageTemplate}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_TEMPLATES.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Message Content</label>
                <Textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Type your message here..."
                  rows={8}
                  className="mt-2"
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {selectedStudents.length} recipient{selectedStudents.length !== 1 ? 's' : ''} selected
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowMessaging(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendMessage} disabled={sendingMessage || selectedStudents.length === 0}>
                    <Send className="h-4 w-4 mr-2" />
                    {sendingMessage ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <KeyboardShortcutsDialog />

        {/* Day Mismatch Dialog */}
        <Dialog open={showDayMismatchDialog} onOpenChange={setShowDayMismatchDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Class Not Scheduled Today
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-4">
                <p>
                  This class is scheduled for{" "}
                  <span className="font-semibold text-foreground">
                    {pendingSchedule?.dayOfWeek}
                  </span>
                  , but today is{" "}
                  <span className="font-semibold text-foreground">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                  </span>
                  .
                </p>
                <p className="text-sm">
                  Taking attendance for classes on non-scheduled days should only be done for:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside pl-2">
                  <li>Makeup classes</li>
                  <li>Special sessions</li>
                  <li>Rescheduled classes</li>
                </ul>
                <p className="text-sm font-medium">
                  Do you want to proceed with taking attendance for this class?
                </p>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={cancelScheduleSelection}>
                Cancel
              </Button>
              <Button onClick={proceedWithSchedule}>
                Yes, Proceed
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    );
  }

  // Other views (history, reports) placeholder
  return (
    <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
      <div className="p-4 md:p-6">
        <Button onClick={() => setViewMode("dashboard")} className="mb-4">
          <Home className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <EmptyState
          icon={Activity}
          title={`${viewMode} View`}
          description="This view is coming soon"
        />
      </div>

      {/* Day Mismatch Dialog */}
      <Dialog open={showDayMismatchDialog} onOpenChange={setShowDayMismatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Class Not Scheduled Today
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-4">
              <p>
                This class is scheduled for{" "}
                <span className="font-semibold text-foreground">
                  {pendingSchedule?.dayOfWeek}
                </span>
                , but today is{" "}
                <span className="font-semibold text-foreground">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                </span>
                .
              </p>
              <p className="text-sm">
                Taking attendance for classes on non-scheduled days should only be done for:
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside pl-2">
                <li>Makeup classes</li>
                <li>Special sessions</li>
                <li>Rescheduled classes</li>
              </ul>
              <p className="text-sm font-medium">
                Do you want to proceed with taking attendance for this class?
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={cancelScheduleSelection}>
              Cancel
            </Button>
            <Button onClick={proceedWithSchedule}>
              Yes, Proceed
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
