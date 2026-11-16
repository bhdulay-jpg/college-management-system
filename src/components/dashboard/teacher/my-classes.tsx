"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "../dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import {
  BookOpen, Users, Clock, MapPin, Search,
  ChevronRight, Calendar, GraduationCap, ArrowLeft, Mail
} from "lucide-react";
import { collection, query, onSnapshot, where, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useRouter } from "../../router";
import { cn } from "../../ui/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

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
  enrolledStudents: string[];
  maxStudents: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  program: string;
  yearLevel: string;
  studentNumber: string;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function MyClasses() {
  const { user } = useRouter();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedClass, setSelectedClass] = useState<Schedule | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDay, setFilterDay] = useState("all");
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});

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

        // Sort by day and time
        schedulesData.sort((a, b) => {
          const dayCompare = DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek);
          if (dayCompare !== 0) return dayCompare;
          return a.startTime.localeCompare(b.startTime);
        });

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

  // Load students for selected class
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      return;
    }

    console.log("Loading students for schedule:", selectedClass.id);
    setLoadingStudents(true);

    // Real-time listener for enrolled students
    const studentSubjectsQuery = query(
      collection(db, "studentSubjects"),
      where("scheduleId", "==", selectedClass.id),
      where("status", "==", "enrolled")
    );
    
    const unsubscribe = onSnapshot(studentSubjectsQuery, async (snapshot) => {
      console.log("StudentSubjects query result:", snapshot.size, "documents");
      
      const enrolledStudentIds = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log("StudentSubject doc:", doc.id, data);
        return data.studentId;
      });
      
      console.log("Enrolled student IDs:", enrolledStudentIds);
      
      if (enrolledStudentIds.length === 0) {
        console.log("No enrolled students found");
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
        console.log("Total students in database:", usersSnapshot.size);
        
        const allStudents = usersSnapshot.docs.map(doc => {
          const student = {
            id: doc.id,
            ...doc.data(),
          };
          console.log("Student doc:", doc.id, student);
          return student;
        }) as Student[];

        // Filter to only enrolled students by matching Firebase user ID
        const enrolledStudents = allStudents.filter(student => {
          const isEnrolled = enrolledStudentIds.includes(student.id);
          console.log(`Student ${student.id} (${student.name}) enrolled:`, isEnrolled);
          return isEnrolled;
        });

        console.log("Final enrolled students:", enrolledStudents.length, enrolledStudents);
        setStudents(enrolledStudents);
      } catch (error) {
        console.error("Error loading students:", error);
      } finally {
        setLoadingStudents(false);
      }
    });

    return () => unsubscribe();
  }, [selectedClass]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getCapacityColor = (enrolled: number, max: number) => {
    const percentage = (enrolled / max) * 100;
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-green-600";
  };

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      const matchesSearch = 
        schedule.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.section.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDay = filterDay === "all" || schedule.dayOfWeek === filterDay;

      return matchesSearch && matchesDay;
    });
  }, [schedules, searchTerm, filterDay]);

  // Group by subject
  const groupedBySubject = useMemo(() => {
    const groups: Record<string, Schedule[]> = {};
    filteredSchedules.forEach(schedule => {
      const key = schedule.subjectCode;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(schedule);
    });
    return groups;
  }, [filteredSchedules]);

  if (loading) {
    return (
      <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
        <div className="p-4 md:p-6">
          <LoadingState message="Loading your classes..." />
        </div>
      </DashboardLayout>
    );
  }

  // Class Details View
  if (selectedClass) {
    const enrolled = enrollmentCounts[selectedClass.id] || 0;
    const max = selectedClass.maxStudents || 0;

    return (
      <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
        <div className="p-4 md:p-6 space-y-6">
          {/* Header with Back Button */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedClass(null)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Classes
            </Button>
            <h1 className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              {selectedClass.subjectCode}
            </h1>
            <p className="text-muted-foreground">{selectedClass.subjectName}</p>
          </div>

          {/* Class Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{enrolled}/{max}</div>
                  <div className="text-sm text-muted-foreground">Students</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-lg font-bold">
                    {formatTime(selectedClass.startTime)} - {formatTime(selectedClass.endTime)}
                  </div>
                  <div className="text-sm text-muted-foreground">{selectedClass.dayOfWeek}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-lg font-bold">{selectedClass.room.split(" - ")[0]}</div>
                  <div className="text-sm text-muted-foreground">Room</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <GraduationCap className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-sm font-medium">{selectedClass.section}</div>
                  <div className="text-xs text-muted-foreground">{selectedClass.yearLevel}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Enrolled Students ({enrolled})
              </CardTitle>
              <CardDescription>Students taking this class</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStudents ? (
                <LoadingState message="Loading students..." />
              ) : students.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No Students Enrolled"
                  description="No students have enrolled in this class yet."
                />
              ) : (
                <div className="space-y-3">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {student.studentNumber || student.email}
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <GraduationCap className="h-4 w-4" />
                          <span>{student.yearLevel}</span>
                        </div>
                        {student.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            <span className="truncate max-w-[200px]">{student.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Classes List View
  return (
    <DashboardLayout userRole="Teacher" userName={user?.name || "Teacher"} notificationCount={0}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            My Classes
          </h1>
          <p className="text-muted-foreground">
            View and manage all your assigned classes
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by subject code, name, or section..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  {DAYS_OF_WEEK.map(day => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
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
                icon={BookOpen}
                title="No Classes Found"
                description={searchTerm || filterDay !== "all" 
                  ? "No classes match your search criteria. Try adjusting your filters."
                  : "You don't have any classes assigned yet."}
              />
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="grouped" className="space-y-4">
            <TabsList>
              <TabsTrigger value="grouped">By Subject</TabsTrigger>
              <TabsTrigger value="all">All Classes</TabsTrigger>
            </TabsList>

            <TabsContent value="grouped" className="space-y-4">
              {Object.entries(groupedBySubject).map(([subjectCode, subjectSchedules]) => {
                const firstSchedule = subjectSchedules[0];
                const totalStudents = subjectSchedules.reduce(
                  (sum, s) => sum + (s.enrolledStudents?.length || 0), 0
                );

                return (
                  <Card key={subjectCode}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{subjectCode}</CardTitle>
                          <CardDescription className="mt-1">
                            {firstSchedule.subjectName}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">
                          {subjectSchedules.length} {subjectSchedules.length === 1 ? 'class' : 'classes'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {subjectSchedules.map((schedule) => {
                          const enrolled = enrollmentCounts[schedule.id] || 0;
                          const max = schedule.maxStudents || 0;

                          return (
                            <div
                              key={schedule.id}
                              onClick={() => setSelectedClass(schedule)}
                              className="p-4 border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    {schedule.section && (
                                      <Badge variant="outline">Section {schedule.section}</Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span>{schedule.dayOfWeek}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4 text-muted-foreground" />
                                      <span>
                                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-4 w-4 text-muted-foreground" />
                                      <span>{schedule.room.split(" - ")[0]}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                      <span className={getCapacityColor(enrolled, max)}>
                                        {enrolled}/{max}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="all" className="space-y-3">
              {filteredSchedules.map((schedule) => {
                const enrolled = enrollmentCounts[schedule.id] || 0;
                const max = schedule.maxStudents || 0;

                return (
                  <Card
                    key={schedule.id}
                    onClick={() => setSelectedClass(schedule)}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="font-medium text-lg">{schedule.subjectCode}</div>
                            {schedule.section && (
                              <Badge variant="outline">Section {schedule.section}</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mb-3">
                            {schedule.subjectName}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{schedule.dayOfWeek}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{schedule.room.split(" - ")[0]}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className={getCapacityColor(enrolled, max)}>
                                {enrolled}/{max} students
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}