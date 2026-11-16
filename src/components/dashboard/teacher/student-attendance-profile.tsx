"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { LoadingState } from "../../loading-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Progress } from "../../ui/progress";
import { Calendar as CalendarIcon, User, Mail, Phone, BookOpen, TrendingUp, TrendingDown, CheckCircle2, XCircle, Clock, AlertCircle, ArrowLeft, Download, BarChart3 } from "lucide-react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { toast } from "sonner@2.0.3";
import { cn } from "../../ui/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

// ============================================================================
// INTERFACES
// ============================================================================

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
  subjectCode: string;
  subjectName: string;
  status: "present" | "absent" | "late" | "excused";
  date: Date;
  remarks?: string;
}

interface Schedule {
  id: string;
  subjectCode: string;
  subjectName: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG = {
  present: {
    label: "Present",
    color: "bg-success/10 text-success border-success/20",
    icon: CheckCircle2,
  },
  absent: {
    label: "Absent",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    icon: XCircle,
  },
  late: {
    label: "Late",
    color: "bg-warning/10 text-warning border-warning/20",
    icon: Clock,
  },
  excused: {
    label: "Excused",
    color: "bg-info/10 text-info border-info/20",
    icon: AlertCircle,
  }
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface StudentAttendanceProfileProps {
  studentId: string;
  onBack?: () => void;
}

export function StudentAttendanceProfile({ studentId, onBack }: StudentAttendanceProfileProps) {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load student
        const studentQuery = query(
          collection(db, "users"),
          where("role", "==", "Student"),
          where("uid", "==", studentId)
        );
        const studentSnapshot = await getDocs(studentQuery);
        
        if (!studentSnapshot.empty) {
          const studentData = {
            id: studentSnapshot.docs[0].id,
            uid: studentSnapshot.docs[0].id,
            ...studentSnapshot.docs[0].data()
          } as Student;
          setStudent(studentData);
        }

        // Load attendance records
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("studentId", "==", studentId),
          orderBy("date", "desc")
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const records = attendanceSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate(),
          scannedAt: doc.data().scannedAt?.toDate(),
        })) as AttendanceRecord[];
        setAttendanceRecords(records);

        // Extract unique schedules
        const uniqueSchedules = Array.from(
          new Set(records.map(r => r.scheduleId))
        ).map(scheduleId => {
          const record = records.find(r => r.scheduleId === scheduleId);
          return {
            id: scheduleId,
            subjectCode: record?.subjectCode || "",
            subjectName: record?.subjectName || ""
          };
        });
        setSchedules(uniqueSchedules);

        setLoading(false);
      } catch (error) {
        console.error("Error loading student attendance:", error);
        toast.error("Failed to load student data");
        setLoading(false);
      }
    };

    loadData();
  }, [studentId]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Overall statistics
  const overallStats = useMemo(() => {
    const present = attendanceRecords.filter(r => r.status === "present").length;
    const late = attendanceRecords.filter(r => r.status === "late").length;
    const absent = attendanceRecords.filter(r => r.status === "absent").length;
    const excused = attendanceRecords.filter(r => r.status === "excused").length;
    const total = attendanceRecords.length;
    
    const attendanceRate = total > 0 ? ((present + late) / total * 100).toFixed(1) : "0";
    
    return { present, late, absent, excused, total, attendanceRate };
  }, [attendanceRecords]);

  // Monthly calendar data
  const monthlyCalendar = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    
    const calendar: Array<{
      day: number | null;
      date: Date | null;
      status: "present" | "absent" | "late" | "excused" | null;
    }> = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendar.push({ day: null, date: null, status: null });
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRecords = attendanceRecords.filter(r => 
        r.date.toISOString().split('T')[0] === dateStr &&
        (selectedSubject === "all" || r.scheduleId === selectedSubject)
      );

      let status: "present" | "absent" | "late" | "excused" | null = null;
      if (dayRecords.length > 0) {
        // Priority: absent > late > excused > present
        if (dayRecords.some(r => r.status === "absent")) status = "absent";
        else if (dayRecords.some(r => r.status === "late")) status = "late";
        else if (dayRecords.some(r => r.status === "excused")) status = "excused";
        else status = "present";
      }

      calendar.push({ day, date, status });
    }

    return calendar;
  }, [attendanceRecords, selectedMonth, selectedYear, selectedSubject]);

  // Subject breakdown
  const subjectBreakdown = useMemo(() => {
    return schedules.map(schedule => {
      const subjectRecords = attendanceRecords.filter(r => r.scheduleId === schedule.id);
      const present = subjectRecords.filter(r => r.status === "present").length;
      const late = subjectRecords.filter(r => r.status === "late").length;
      const absent = subjectRecords.filter(r => r.status === "absent").length;
      const excused = subjectRecords.filter(r => r.status === "excused").length;
      const total = subjectRecords.length;
      const rate = total > 0 ? ((present + late) / total * 100).toFixed(1) : "0";

      return {
        ...schedule,
        present,
        late,
        absent,
        excused,
        total,
        rate: parseFloat(rate)
      };
    });
  }, [schedules, attendanceRecords]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return attendanceRecords
      .filter(r => selectedSubject === "all" || r.scheduleId === selectedSubject)
      .slice(0, 10);
  }, [attendanceRecords, selectedSubject]);

  // Export function
  const handleExport = () => {
    if (!student) return;

    const csvContent = [
      ["Date", "Subject", "Status", "Time", "Method", "Remarks"],
      ...attendanceRecords.map(record => [
        record.date.toLocaleDateString(),
        `${record.subjectCode} - ${record.subjectName}`,
        record.status,
        record.scannedAt?.toLocaleTimeString() || "-",
        record.method || "manual",
        record.remarks || ""
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${student.name}-attendance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast.success("Attendance Exported");
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return <LoadingState message="Loading student attendance..." />;
  }

  if (!student) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Student not found</p>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2>{student.name}</h2>
                  <p className="text-muted-foreground">Student Number: {student.studentNumber}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    {student.program && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {student.program}
                      </span>
                    )}
                    {student.yearLevel && student.section && (
                      <span>{student.yearLevel} - Section {student.section}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overall Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
              <div className="flex items-baseline gap-2">
                <h3>{overallStats.attendanceRate}%</h3>
                {parseFloat(overallStats.attendanceRate) >= 85 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
              <Progress value={parseFloat(overallStats.attendanceRate)} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Present</p>
              <h3 className="text-green-600">{overallStats.present}</h3>
              <p className="text-xs text-muted-foreground">
                {overallStats.total > 0 
                  ? `${((overallStats.present / overallStats.total) * 100).toFixed(1)}% of sessions`
                  : "No data"
                }
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Late</p>
              <h3 className="text-yellow-600">{overallStats.late}</h3>
              <p className="text-xs text-muted-foreground">
                {overallStats.total > 0 
                  ? `${((overallStats.late / overallStats.total) * 100).toFixed(1)}% of sessions`
                  : "No data"
                }
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Absent</p>
              <h3 className="text-red-600">{overallStats.absent}</h3>
              <p className="text-xs text-muted-foreground">
                {overallStats.total > 0 
                  ? `${((overallStats.absent / overallStats.total) * 100).toFixed(1)}% of sessions`
                  : "No data"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Monthly Calendar</TabsTrigger>
          <TabsTrigger value="breakdown">Subject Breakdown</TabsTrigger>
          <TabsTrigger value="history">Attendance History</TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Monthly Attendance Calendar</CardTitle>
                  <CardDescription>Visual overview of attendance</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-3 py-2 border rounded-md"
                  >
                    {MONTHS.map((month, index) => (
                      <option key={index} value={index}>{month}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-3 py-2 border rounded-md"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Subjects</option>
                    {schedules.map(schedule => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.subjectCode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {monthlyCalendar.map((cell, index) => (
                  <div
                    key={index}
                    className={cn(
                      "aspect-square border rounded-lg p-2 text-center relative",
                      cell.day === null && "bg-muted/30",
                      cell.status === "present" && "bg-green-100 dark:bg-green-900/30 border-green-300",
                      cell.status === "late" && "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300",
                      cell.status === "absent" && "bg-red-100 dark:bg-red-900/30 border-red-300",
                      cell.status === "excused" && "bg-blue-100 dark:bg-blue-900/30 border-blue-300"
                    )}
                  >
                    {cell.day && (
                      <>
                        <div className="text-sm">{cell.day}</div>
                        {cell.status && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                            {React.createElement(STATUS_CONFIG[cell.status].icon, {
                              className: cn("h-4 w-4", STATUS_CONFIG[cell.status].color.split(' ')[1])
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-6 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-success/10 border border-success/30" />
                  <span className="text-sm">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-warning/10 border border-warning/30" />
                  <span className="text-sm">Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-destructive/10 border border-destructive/30" />
                  <span className="text-sm">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-info/10 border border-info/30" />
                  <span className="text-sm">Excused</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subject Breakdown */}
        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance by Subject</CardTitle>
              <CardDescription>Performance across all enrolled subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {subjectBreakdown.map(subject => (
                  <div key={subject.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4>{subject.subjectCode}</h4>
                        <p className="text-sm text-muted-foreground">{subject.subjectName}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            subject.rate >= 85 ? "text-green-600" : "text-red-600"
                          )}>
                            {subject.rate}%
                          </span>
                          {subject.rate >= 85 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{subject.total} sessions</p>
                      </div>
                    </div>
                    <Progress value={subject.rate} />
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600">Present: {subject.present}</span>
                      <span className="text-yellow-600">Late: {subject.late}</span>
                      <span className="text-red-600">Absent: {subject.absent}</span>
                      <span className="text-blue-600">Excused: {subject.excused}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Comparison</CardTitle>
              <CardDescription>Visual comparison across subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis 
                    dataKey="subjectCode" 
                    tick={{ fontSize: 12 }}
                    stroke="currentColor"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="currentColor"
                    domain={[0, 100]}
                  />
                  <RechartsTooltip 
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)'
                    }}
                  />
                  <Bar dataKey="rate" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Attendance History</CardTitle>
                  <CardDescription>Recent attendance records</CardDescription>
                </div>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Subjects</option>
                  {schedules.map(schedule => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.subjectCode}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map(record => {
                    const status = record.status;
                    const StatusIcon = STATUS_CONFIG[status].icon;

                    return (
                      <TableRow key={record.id}>
                        <TableCell>
                          {record.date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.subjectCode}</p>
                            <p className="text-sm text-muted-foreground">{record.subjectName}</p>
                          </div>
                        </TableCell>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
