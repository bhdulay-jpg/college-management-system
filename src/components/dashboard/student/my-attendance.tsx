"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Calendar as CalendarIcon, CheckCircle } from "lucide-react";
import { DashboardLayout } from "../dashboard-layout";
import { EmptyState } from "../../empty-state";
import { LoadingState } from "../../loading-state";
import { StudentPageHeader } from "../../student-page-header";
import { Badge } from "../../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { db, auth } from "../../../lib/firebase";

interface EnrolledSubject {
  id: string;
  subjectCode: string;
  subjectName: string;
}

interface AttendanceRecord {
  id: string;
  subjectCode: string;
  status: string;
  date: unknown;
  remarks?: string;
}

function parseAttendanceDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string") {
    const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "object" && value !== null && "toDate" in value) {
    const toDate = value.toDate;
    if (typeof toDate === "function") {
      const date = toDate.call(value);
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    }
  }

  return null;
}

export function MyAttendance() {
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState("");
  const [enrolledSubjects, setEnrolledSubjects] = useState<EnrolledSubject[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");

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

    const subjectsQuery = query(
      collection(db, "studentSubjects"),
      where("studentId", "==", studentId),
      where("status", "==", "enrolled")
    );

    return onSnapshot(subjectsQuery, snapshot => {
      const subjectsByCode = new Map<string, EnrolledSubject>();
      snapshot.docs.forEach(subjectDoc => {
          const data = subjectDoc.data();
          const subject = {
            id: subjectDoc.id,
            subjectCode: typeof data.subjectCode === "string" ? data.subjectCode : "",
            subjectName: typeof data.subjectName === "string" ? data.subjectName : "",
          };
          if (subject.subjectCode) subjectsByCode.set(subject.subjectCode, subject);
        });
      const subjects = Array.from(subjectsByCode.values());

      setEnrolledSubjects(subjects);
      setSelectedSubject(current =>
        subjects.some(subject => subject.subjectCode === current)
          ? current
          : subjects[0]?.subjectCode || ""
      );
      setLoading(false);
    }, error => {
      console.error("Error fetching enrolled subjects:", error);
      setLoading(false);
    });
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId)
    );

    return onSnapshot(attendanceQuery, snapshot => {
      const records = snapshot.docs.map(recordDoc => {
        const data = recordDoc.data();
        return {
          id: recordDoc.id,
          subjectCode: typeof data.subjectCode === "string" ? data.subjectCode : "",
          status: typeof data.status === "string" ? data.status : "unknown",
          date: data.date,
          remarks: typeof data.remarks === "string" ? data.remarks : "",
        };
      });

      setAttendanceRecords(records);
      setLoading(false);
    }, error => {
      console.error("Error fetching attendance:", error);
      setLoading(false);
    });
  }, [studentId]);

  const selectedSubjectData = enrolledSubjects.find(
    subject => subject.subjectCode === selectedSubject
  );

  const subjectRecords = useMemo(
    () => attendanceRecords
      .filter(record => record.subjectCode === selectedSubject)
      .sort((a, b) => {
        const dateA = parseAttendanceDate(a.date)?.getTime() ?? 0;
        const dateB = parseAttendanceDate(b.date)?.getTime() ?? 0;
        return dateB - dateA;
      }),
    [attendanceRecords, selectedSubject]
  );

  if (loading) {
    return (
      <DashboardLayout userRole="Student" userName="Student" notificationCount={0}>
        <LoadingState message="Loading attendance records..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Student" userName="Student" notificationCount={0}>
      <div className="min-h-screen bg-background">
        <StudentPageHeader
          title="My Attendance"
          description="View attendance records by subject"
          icon={CheckCircle}
        />

        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 md:px-6">
          {enrolledSubjects.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={CalendarIcon}
                  title="No enrolled subjects"
                  description="Enroll in a subject to view its attendance records."
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {enrolledSubjects.map(subject => (
                          <SelectItem key={subject.id} value={subject.subjectCode}>
                            {subject.subjectCode} - {subject.subjectName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attendance history</CardTitle>
                  <CardDescription>
                    {selectedSubjectData?.subjectName || selectedSubject} - {subjectRecords.length} record{subjectRecords.length === 1 ? "" : "s"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {subjectRecords.length === 0 ? (
                    <EmptyState
                      icon={CalendarIcon}
                      title="No attendance records"
                      description="No attendance has been recorded for this subject yet."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subjectRecords.map(record => {
                            const statusLabel = record.status
                              ? record.status.charAt(0).toUpperCase() + record.status.slice(1)
                              : "Unknown";
                            const variant = record.status === "present"
                              ? "default"
                              : record.status === "late"
                                ? "secondary"
                                : record.status === "absent"
                                  ? "destructive"
                                  : "outline";
                            const date = parseAttendanceDate(record.date);

                            return (
                              <TableRow key={record.id}>
                                <TableCell>
                                  {date
                                    ? date.toLocaleDateString("en-US", {
                                      weekday: "short",
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })
                                    : "Date unavailable"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={variant}>{statusLabel}</Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {record.remarks || "-"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
