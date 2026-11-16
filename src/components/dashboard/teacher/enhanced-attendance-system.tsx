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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import {
  ClipboardCheck, Users, Calendar, Search, Save, CheckCircle2, XCircle,
  Clock, Filter, AlertCircle, ArrowLeft, CheckCheck, 
  Download, Activity, History, ChevronRight, RefreshCw,
  BookOpen, MapPin
} from "lucide-react";
import { collection, query, onSnapshot, where, getDocs, Timestamp, orderBy, doc, writeBatch } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useRouter } from "../../router";
import { toast } from "sonner@2.0.3";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { cn } from "../../ui/utils";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "../../ui/pagination";

// ============================================================================
// INTERFACES
// ============================================================================

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
  room?: string;
  teacherId: string;
  teacherName: string;
}

interface Student {
  id: string;
  uid: string;
  name: string;
  studentNumber: string;
  email: string;
  parentEmail?: string;
  parentPhone?: string;
  program?: string;
  yearLevel?: string;
  section?: string;
}

interface AttendanceRecord {
  id: string;
  scheduleId: string;
  teacherId: string;
  studentId: string;
  status: "present" | "absent" | "late" | "excused";
  date: Date;
  remarks?: string;
  subjectCode?: string;
  subjectName?: string;
}

interface AttendanceEntry {
  studentId: string;
  status: "present" | "absent" | "late" | "excused";
  remarks?: string;
}

function parseAttendanceDate(value: unknown): Date | null {
  let date: Date | null = null;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  } else if (typeof value === "object" && value !== null && "toDate" in value) {
    const toDate = value.toDate;
    if (typeof toDate === "function") {
      const converted = toDate.call(value);
      if (converted instanceof Date) date = converted;
    }
  }

  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function formatDateInputValue(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function formatAttendanceDate(date: Date): string {
  const [year, month, day] = formatDateInputValue(date).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG = {
  present: {
    label: "Present",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300",
    icon: CheckCircle2,
    iconColor: "text-green-600"
  },
  absent: {
    label: "Absent",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300",
    icon: XCircle,
    iconColor: "text-red-600"
  },
  late: {
    label: "Late",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300",
    icon: Clock,
    iconColor: "text-yellow-600"
  },
  excused: {
    label: "Excused",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300",
    icon: AlertCircle,
    iconColor: "text-blue-600"
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EnhancedAttendanceSystem() {
  const { user } = useRouter();
  
  // Navigation State
  const [currentView, setCurrentView] = useState<"overview" | "logs">("overview");
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  
  // Data State
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendance, setAttendance] = useState<Map<string, AttendanceEntry>>(new Map());
  
  // UI State
  const [selectedDate, setSelectedDate] = useState(() => formatDateInputValue(new Date()));
  const [logDate, setLogDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  // Load schedules
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const schedulesQuery = query(
      collection(db, "schedules"),
      where("teacherId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      schedulesQuery,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Schedule[];
        setSchedules(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching schedules:", error);
        toast.error("Failed to load schedules");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Load attendance records
  useEffect(() => {
    if (!user) return;

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("teacherId", "==", user.uid),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const records = snapshot.docs.flatMap(recordDoc => {
          const data = recordDoc.data();
          const date = parseAttendanceDate(data.date);
          if (!date) {
            console.warn(`Skipping attendance record ${recordDoc.id} with an invalid date.`);
            return [];
          }

          return [{
            id: recordDoc.id,
            ...data,
            date,
          } as AttendanceRecord];
        });

        setAllAttendanceRecords(records);
      },
      (error) => {
        console.error("Error fetching attendance:", error);
        toast.error("Failed to load attendance records");
      }
    );

    return () => unsubscribe();
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

  // Load students for selected schedule
  useEffect(() => {
    if (!selectedSchedule) {
      setStudents([]);
      return;
    }

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
        return;
      }

      try {
        // Get user details for enrolled students using Firebase user IDs
        const usersQuery = query(
          collection(db, "users"),
          where("role", "==", "Student")
        );
        const usersSnapshot = await getDocs(usersQuery);
        const allStudents = usersSnapshot.docs.map(studentDoc => {
          const data = studentDoc.data();
          const uid = typeof data.uid === "string" ? data.uid : studentDoc.id;
          const fullName = [data.firstName, data.lastName]
            .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
            .join(" ");

          return {
            id: uid,
            uid,
            name: typeof data.name === "string" && data.name.trim()
              ? data.name.trim()
              : fullName || (typeof data.email === "string" ? data.email : "Unnamed student"),
            studentNumber: typeof data.studentNumber === "string"
              ? data.studentNumber
              : typeof data.studentId === "string" ? data.studentId : "",
            email: typeof data.email === "string" ? data.email : "",
            parentEmail: typeof data.parentEmail === "string" ? data.parentEmail : undefined,
            parentPhone: typeof data.parentPhone === "string" ? data.parentPhone : undefined,
            program: typeof data.program === "string" ? data.program : undefined,
            yearLevel: typeof data.yearLevel === "string" ? data.yearLevel : undefined,
            section: typeof data.section === "string" ? data.section : undefined,
          };
        });

        // Filter to only enrolled students by matching Firebase user ID
        const enrolledStudents = allStudents.filter(student =>
          enrolledStudentIds.includes(student.uid)
        );

        setStudents(enrolledStudents);

        // Initialize attendance
        const initialAttendance = new Map<string, AttendanceEntry>();
        enrolledStudents.forEach(student => {
          initialAttendance.set(student.id, {
            studentId: student.id,
            status: "present"
          });
        });
        setAttendance(initialAttendance);

      } catch (error) {
        console.error("Error loading students:", error);
        toast.error("Failed to load students");
      }
    });

    return () => unsubscribe();
  }, [selectedSchedule]);

  useEffect(() => {
    if (!selectedSchedule || students.length === 0 || hasUnsavedChanges) return;

    const updatedAttendance = new Map<string, AttendanceEntry>();
    students.forEach(student => {
      updatedAttendance.set(student.id, { studentId: student.id, status: "present" });
    });

    allAttendanceRecords
      .filter(record =>
        record.scheduleId === selectedSchedule.id &&
        formatDateInputValue(record.date) === selectedDate
      )
      .forEach(record => {
        if (updatedAttendance.has(record.studentId)) {
          updatedAttendance.set(record.studentId, {
            studentId: record.studentId,
            status: record.status,
            remarks: record.remarks,
          });
        }
      });

    setAttendance(updatedAttendance);
  }, [selectedSchedule?.id, selectedDate, students, allAttendanceRecords, hasUnsavedChanges]);

  // ============================================================================
  // MANUAL ATTENDANCE FUNCTIONS
  // ============================================================================

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

  const handleMarkAllPresent = () => {
    setAttendance(prev => {
      const newAttendance = new Map(prev);
      students.forEach(student => {
        newAttendance.set(student.id, {
          studentId: student.id,
          status: "present"
        });
      });
      return newAttendance;
    });
    setHasUnsavedChanges(true);
    toast.success("All students marked present");
  };

  const handleResetAll = () => {
    const initialAttendance = new Map<string, AttendanceEntry>();
    students.forEach(student => {
      initialAttendance.set(student.id, {
        studentId: student.id,
        status: "present"
      });
    });
    setAttendance(initialAttendance);
    setHasUnsavedChanges(false);
    toast.info("Attendance reset");
  };

  // ============================================================================
  // SAVE ATTENDANCE
  // ============================================================================

  const handleSaveAttendance = async () => {
    if (!selectedSchedule || !user) return;

    setSaving(true);
    try {
      const attendanceDateValue = selectedDate || formatDateInputValue(new Date());
      const attendanceDate = new Date(`${attendanceDateValue}T00:00:00`);
      setSelectedDate(attendanceDateValue);

      const existingRecords = new Map<string, AttendanceRecord>();
      allAttendanceRecords
        .filter(record =>
          record.scheduleId === selectedSchedule.id &&
          formatDateInputValue(record.date) === attendanceDateValue
        )
        .forEach(record => existingRecords.set(record.studentId, record));

      const batch = writeBatch(db);
      attendance.forEach(entry => {
        const record = {
          scheduleId: selectedSchedule.id,
          subjectCode: selectedSchedule.subjectCode,
          subjectName: selectedSchedule.subjectName,
          section: selectedSchedule.section,
          teacherId: user.uid,
          teacherName: user.name,
          studentId: entry.studentId,
          status: entry.status,
          date: Timestamp.fromDate(attendanceDate),
          remarks: entry.remarks || "",
        };
        const existingRecord = existingRecords.get(entry.studentId);
        if (existingRecord) {
          batch.update(doc(db, "attendance", existingRecord.id), {
            ...record,
            updatedAt: Timestamp.now(),
          });
        } else {
          batch.set(doc(collection(db, "attendance")), {
            ...record,
            createdAt: Timestamp.now(),
          });
        }
      });

      await batch.commit();
      setHasUnsavedChanges(false);
      toast.success("Attendance Saved!", {
        description: `Recorded for ${students.length} students`
      });
      
      // Go back to overview
      setCurrentView("overview");
      
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // EXPORT FUNCTIONS
  // ============================================================================

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
          selectedDate
        ];
      })
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${selectedSchedule.subjectCode}-${selectedDate}.csv`;
    a.click();
    
    toast.success("Attendance Exported");
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Calculate stats for selected schedule
  const scheduleStats = useMemo(() => {
    if (!selectedSchedule) return null;

    const scheduleRecords = allAttendanceRecords.filter(
      r => r.scheduleId === selectedSchedule.id
    );

    const totalSessions = new Set(scheduleRecords.map(r =>
      formatDateInputValue(r.date)
    )).size;

    const present = scheduleRecords.filter(r => r.status === "present").length;
    const absent = scheduleRecords.filter(r => r.status === "absent").length;
    const late = scheduleRecords.filter(r => r.status === "late").length;
    const excused = scheduleRecords.filter(r => r.status === "excused").length;
    const total = scheduleRecords.length;

    const attendanceRate = total > 0 ? ((present + late) / total * 100).toFixed(1) : "0";

    return {
      totalSessions,
      present,
      absent,
      late,
      excused,
      total,
      attendanceRate,
      totalStudents: enrollmentCounts[selectedSchedule.id] || 0
    };
  }, [selectedSchedule, allAttendanceRecords, enrollmentCounts]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (statusFilter === "all") return matchesSearch;
      
      const studentAttendance = attendance.get(student.id);
      return matchesSearch && studentAttendance?.status === statusFilter;
    });
  }, [students, searchTerm, statusFilter, attendance]);

  // Paginated students
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
        <div className="p-4 md:p-6">
          <LoadingState message="Loading attendance system..." />
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================================
  // OVERVIEW VIEW
  // ============================================================================

  if (currentView === "overview") {
    return (
      <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
        <div className="p-4 md:p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" />
                Attendance
              </h1>
              <p className="text-muted-foreground">
                Track and manage student attendance
              </p>
            </div>
          </div>

          {/* Subject Selection */}
          {!selectedSchedule && (
            <Card>
              <CardHeader>
                <CardTitle>Choose a class</CardTitle>
                <CardDescription>Select a class to review or record attendance</CardDescription>
              </CardHeader>
              <CardContent>
                {schedules.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="No Schedules Found"
                    description="You don't have any assigned schedules yet."
                  />
                ) : (
                  <div className="grid gap-3">
                    {schedules.map(schedule => (
                      <Card
                        key={schedule.id}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => setSelectedSchedule(schedule)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4>{schedule.subjectCode}</h4>
                                <Badge variant="outline">{schedule.section}</Badge>
                              </div>
                              <p className="text-muted-foreground">{schedule.subjectName}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {schedule.dayOfWeek}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                </span>
                                {schedule.room && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {schedule.room}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{enrollmentCounts[schedule.id] || 0} Students</span>
                              </div>
                              <Button variant="ghost" size="sm" className="mt-2">
                                View <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Subject Overview */}
          {selectedSchedule && scheduleStats && (
            <>
              <Card>
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSchedule(null)}
                        className="mb-1"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Subjects
                      </Button>
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h2>{selectedSchedule.subjectCode}</h2>
                            <Badge variant="outline">{selectedSchedule.section}</Badge>
                          </div>
                          <p className="text-muted-foreground">{selectedSchedule.subjectName}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {selectedSchedule.dayOfWeek}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}
                            </span>
                            {selectedSchedule.room && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {selectedSchedule.room}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {scheduleStats.totalStudents} Students
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <label htmlFor="teacher-attendance-date" className="text-sm font-medium">
                              Attendance date
                            </label>
                            <Input
                              id="teacher-attendance-date"
                              type="date"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value || formatDateInputValue(new Date()))}
                              disabled={hasUnsavedChanges}
                              className="h-8 w-[150px]"
                            />
                            {hasUnsavedChanges && (
                              <span className="text-xs text-muted-foreground">
                                Save or reset changes before changing the date.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <Button variant="outline" size="sm" onClick={() => setCurrentView("logs")}>
                        <History className="h-4 w-4" />
                        View Logs
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleExportAttendance}>
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAllPresent}
                      >
                        <CheckCheck className="h-4 w-4" />
                        Mark All Present
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetAll}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveAttendance}
                        disabled={!hasUnsavedChanges || saving}
                      >
                        <Save className="h-4 w-4" />
                        {saving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>

                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Students</CardTitle>
                    <CardDescription>
                      {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative min-w-[180px] flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="excused">Excused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Student Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedStudents.map(student => {
                        const studentAttendance = attendance.get(student.id);
                        const status = studentAttendance?.status || "present";
                        const StatusIcon = STATUS_CONFIG[status].icon;
                        return (
                          <TableRow key={student.id}>
                            <TableCell className="py-2 font-medium">{student.name}</TableCell>
                            <TableCell className="py-2">{student.studentNumber}</TableCell>
                            <TableCell className="py-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "flex w-fit items-center gap-1",
                                  STATUS_CONFIG[status].color
                                )}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {STATUS_CONFIG[status].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant={status === "present" ? "default" : "outline"}
                                  aria-label={`Mark ${student.name} present`}
                                  title="Present"
                                  onClick={() => handleStatusChange(student.id, "present")}
                                  className="h-7 w-7 p-1"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={status === "late" ? "default" : "outline"}
                                  aria-label={`Mark ${student.name} late`}
                                  title="Late"
                                  onClick={() => handleStatusChange(student.id, "late")}
                                  className="h-7 w-7 p-1"
                                >
                                  <Clock className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={status === "absent" ? "default" : "outline"}
                                  aria-label={`Mark ${student.name} absent`}
                                  title="Absent"
                                  onClick={() => handleStatusChange(student.id, "absent")}
                                  className="h-7 w-7 p-1"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={status === "excused" ? "default" : "outline"}
                                  aria-label={`Mark ${student.name} excused`}
                                  title="Excused"
                                  onClick={() => handleStatusChange(student.id, "excused")}
                                  className="h-7 w-7 p-1"
                                >
                                  <AlertCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {totalPages > 1 && (
                    <div className="mt-3 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================================
  // MANUAL ATTENDANCE VIEW
  // ============================================================================

  if (currentView === "manual" && selectedSchedule) {
    return (
      <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
        <div className="p-4 md:p-5 space-y-4">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView("overview")}
                className="mb-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Button>
              <h1 className="flex items-center gap-2">
                <ClipboardCheck className="h-6 w-6 text-primary" />
                Manual Attendance
              </h1>
              <p className="text-muted-foreground">
                {selectedSchedule.subjectCode} - {selectedSchedule.section}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label htmlFor="manual-attendance-date" className="text-sm font-medium">
                  Attendance date
                </label>
                <Input
                  id="manual-attendance-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || formatDateInputValue(new Date()))}
                  disabled={hasUnsavedChanges}
                  className="h-8 w-[150px]"
                />
                {hasUnsavedChanges && (
                  <span className="text-xs text-muted-foreground">
                    Save or reset changes before changing the date.
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={handleMarkAllPresent} variant="outline" size="sm">
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Present
              </Button>
              <Button onClick={handleResetAll} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleExportAttendance} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleSaveAttendance} disabled={!hasUnsavedChanges || saving} size="sm">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          {/* Student List */}
          <Card>
            <CardHeader className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Students</CardTitle>
                <CardDescription>
                  {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-[180px] flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="excused">Excused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Student Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStudents.map(student => {
                    const studentAttendance = attendance.get(student.id);
                    const status = studentAttendance?.status || "present";
                    const StatusIcon = STATUS_CONFIG[status].icon;

                    return (
                      <TableRow key={student.id}>
                        <TableCell className="py-2 font-medium">{student.name}</TableCell>
                        <TableCell className="py-2">{student.studentNumber}</TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "flex items-center gap-1 w-fit",
                              STATUS_CONFIG[status].color
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {STATUS_CONFIG[status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant={status === "present" ? "default" : "outline"}
                              aria-label={`Mark ${student.name} present`}
                              title="Present"
                              onClick={() => handleStatusChange(student.id, "present")}
                              className="h-7 w-7 p-1"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={status === "late" ? "default" : "outline"}
                              aria-label={`Mark ${student.name} late`}
                              title="Late"
                              onClick={() => handleStatusChange(student.id, "late")}
                              className="h-7 w-7 p-1"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={status === "absent" ? "default" : "outline"}
                              aria-label={`Mark ${student.name} absent`}
                              title="Absent"
                              onClick={() => handleStatusChange(student.id, "absent")}
                              className="h-7 w-7 p-1"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={status === "excused" ? "default" : "outline"}
                              aria-label={`Mark ${student.name} excused`}
                              title="Excused"
                              onClick={() => handleStatusChange(student.id, "excused")}
                              className="h-7 w-7 p-1"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-3 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================================
  // LOGS VIEW
  // ============================================================================

  if (currentView === "logs" && selectedSchedule) {
    const scheduleRecords = allAttendanceRecords.filter(
      r => r.scheduleId === selectedSchedule.id
    );
    const searchQuery = searchTerm.trim().toLowerCase();
    const filteredRecords = scheduleRecords
      .filter(record => {
        const student = students.find(item => item.id === record.studentId);
        const matchesDate = !logDate || formatDateInputValue(record.date) === logDate;
        const matchesStatus = statusFilter === "all" || record.status === statusFilter;
        const matchesSearch = !searchQuery ||
          student?.name.toLowerCase().includes(searchQuery) ||
          student?.studentNumber.toLowerCase().includes(searchQuery);
        return matchesDate && matchesStatus && matchesSearch;
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const handleExportLogs = () => {
      const csvContent = [
        ["Date", "Student Name", "Student Number", "Status", "Remarks"],
        ...filteredRecords.map(record => {
          const student = students.find(item => item.id === record.studentId);
          return [
            formatAttendanceDate(record.date),
            student?.name || "Unknown",
            student?.studentNumber || "",
            record.status,
            record.remarks || "",
          ];
        }),
      ]
        .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
        .join("\r\n");
      const url = window.URL.createObjectURL(new Blob([csvContent], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-logs-${selectedSchedule.subjectCode}-${logDate || "all-dates"}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      toast.success("Filtered attendance logs exported");
    };

    return (
      <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
        <div className="p-4 md:p-5 space-y-4">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView("overview")}
                className="mb-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Button>
              <h1 className="flex items-center gap-2">
                <History className="h-6 w-6 text-primary" />
                Attendance Logs
              </h1>
              <p className="text-muted-foreground">
                {selectedSchedule.subjectCode} - {selectedSchedule.section}
              </p>
            </div>
            <Button onClick={handleExportLogs} variant="outline" size="sm" disabled={filteredRecords.length === 0}>
              <Download className="h-4 w-4" />
              Export Filtered
            </Button>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-3 px-4 pt-4">
              <div>
                <CardTitle>Attendance records</CardTitle>
                <CardDescription>
                  {filteredRecords.length} record{filteredRecords.length === 1 ? "" : "s"} for {logDate || "all dates"}
                </CardDescription>
              </div>
              <div className="flex w-full flex-wrap items-end gap-3">
                <div className="min-w-[220px] flex-1 space-y-1">
                  <label htmlFor="attendance-log-search" className="text-xs font-medium text-muted-foreground">
                    Student
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="attendance-log-search"
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 pl-10"
                    />
                  </div>
                </div>
                <div className="w-[150px] shrink-0 space-y-1">
                  <label htmlFor="attendance-log-status" className="text-xs font-medium text-muted-foreground">
                    Status
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="attendance-log-status" className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="excused">Excused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[165px] shrink-0 space-y-1">
                  <label htmlFor="attendance-log-date" className="text-xs font-medium text-muted-foreground">
                    Date
                  </label>
                  <Input
                    id="attendance-log-date"
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="h-9 w-full"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {filteredRecords.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No attendance records found"
                  description="Try changing the date, status, or search terms."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Student Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map(record => {
                        const student = students.find(s => s.id === record.studentId);
                        const status = record.status;
                        const StatusIcon = STATUS_CONFIG[status].icon;

                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              {formatAttendanceDate(record.date)}
                            </TableCell>
                            <TableCell className="font-medium">{student?.name || "Unknown"}</TableCell>
                            <TableCell>{student?.studentNumber || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "flex items-center gap-1 w-fit",
                                  STATUS_CONFIG[status].color
                                )}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {STATUS_CONFIG[status].label}
                              </Badge>
                            </TableCell>
                            <TableCell>{record.remarks || "-"}</TableCell>
                          </TableRow>
                        );
                      })}
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

  // Default fallback
  return (
    <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
      <div className="p-4 md:p-6">
        <EmptyState
          icon={Activity}
          title="Attendance"
          description="Select a view to get started"
        />
      </div>
    </DashboardLayout>
  );
}
