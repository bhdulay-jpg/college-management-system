"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Calendar } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { StudentPageHeader } from "../../student-page-header";
import { DashboardLayout } from "../dashboard-layout";

interface EnrolledSchedule {
  id: string;
  studentId: string;
  scheduleId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  units: number;
  yearLevel: string;
  semester: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  teacherName: string;
  schoolYear: string;
  status: string;
  enrolledAt: any;
}

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function MySchedule() {
  const [loading, setLoading] = useState(true);
  const [enrolledSchedules, setEnrolledSchedules] = useState<EnrolledSchedule[]>([]);
  const [studentId, setStudentId] = useState<string>("");

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("[MySchedule] No authenticated user found");
      setLoading(false);
      return;
    }
    setStudentId(currentUser.uid);
  }, []);

  useEffect(() => {
    if (!studentId) {
      return;
    }

    const q = query(
      collection(db, "studentSubjects"),
      where("studentId", "==", studentId),
      where("status", "==", "enrolled")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const schedulesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as EnrolledSchedule[];
      
      setEnrolledSchedules(schedulesData);
      setLoading(false);
    }, (error) => {
      console.error("[MySchedule] Error fetching enrolled schedules:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentId]);

  const formatTime = (time: string) => {
    if (!time) return "";
    try {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  const sortedSchedules = [...enrolledSchedules].sort((a, b) => {
    const dayCompare = DAYS_ORDER.indexOf(a.dayOfWeek) - DAYS_ORDER.indexOf(b.dayOfWeek);
    if (dayCompare !== 0) return dayCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  if (loading) {
    return (
      <DashboardLayout userRole="Student" userName="Student" notificationCount={0}>
        <LoadingState message="Loading your schedule..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Student" userName="Student" notificationCount={0}>
      <div className="min-h-screen bg-background">
        <StudentPageHeader
          title="My Schedule"
          description="Your enrolled subjects for this semester"
          icon={Calendar}
        />

        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 space-y-5">
        {enrolledSchedules.length === 0 ? (
          <Card className="border-0 shadow-md bg-card">
            <CardContent className="py-16">
              <EmptyState
                icon={Calendar}
                title="No enrolled subjects"
                description="You haven't enrolled in any subjects yet. Go to Subject Enrollment to add subjects."
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-0 shadow-md bg-card">
              <CardHeader>
                <CardTitle>Class Schedule</CardTitle>
                <CardDescription>
                  {sortedSchedules[0]?.semester || "This semester"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-center">Units</TableHead>
                        <TableHead>Day</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Instructor</TableHead>
                        <TableHead>School Year</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedSchedules.map((schedule) => (
                        <TableRow key={schedule.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div>
                              <div className="font-mono text-xs text-muted-foreground mb-0.5">
                                {schedule.subjectCode}
                              </div>
                              <div className="font-medium text-sm">
                                {schedule.subjectName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium">{schedule.units}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{schedule.dayOfWeek}</span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{formatTime(schedule.startTime)}</div>
                              <div className="text-xs text-muted-foreground">
                                to {formatTime(schedule.endTime)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{schedule.room}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{schedule.teacherName}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {schedule.schoolYear}
                            </Badge>
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
        </div>
      </div>
    </DashboardLayout>
  );
}
