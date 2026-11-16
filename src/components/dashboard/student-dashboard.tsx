"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  DollarSign,
  GraduationCap,
  Megaphone,
  Plus,
  Receipt,
} from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAnnouncementNotifications } from "../../hooks/use-announcement-notifications";
import { db } from "../../lib/firebase";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { LoadingState } from "../loading-state";
import { useRouter } from "../router";
import { DashboardLayout } from "./dashboard-layout";

const studentQuickLinks = [
  {
    title: "My program",
    description: "See the courses required for your program",
    route: "dashboard/student/curriculum",
    icon: BookOpen,
  },
  {
    title: "Class schedule",
    description: "See your class times and rooms",
    route: "dashboard/student/schedule",
    icon: CalendarDays,
  },
  {
    title: "My Grades",
    description: "Check grades shared by your teachers",
    route: "dashboard/student/grades",
    icon: Award,
  },
  {
    title: "Attendance",
    description: "See your attendance record",
    route: "dashboard/student/attendance",
    icon: CheckCircle,
  },
  {
    title: "Find classes",
    description: "Browse classes available to you",
    route: "dashboard/student/subjects",
    icon: Plus,
  },
  {
    title: "Tuition and fees",
    description: "View your charges and balance",
    route: "dashboard/student/tuition-fees",
    icon: Receipt,
  },
  {
    title: "Payments",
    description: "Review your payment history",
    route: "dashboard/student/payments",
    icon: DollarSign,
  },
  {
    title: "Announcements",
    description: "Read the latest school updates",
    route: "dashboard/student/announcements",
    icon: Megaphone,
  },
];

type DashboardSource = "subjects" | "attendance" | "grades";

export function StudentDashboard() {
  const router = useRouter();
  const user = router.user;
  const [loading, setLoading] = useState(true);
  const [courseCount, setCourseCount] = useState(0);
  const [gradeCount, setGradeCount] = useState(0);
  const [attendance, setAttendance] = useState({
    present: 0,
    late: 0,
    total: 0,
  });
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const notificationCount = useAnnouncementNotifications({
    userId: user?.uid || "",
    userRole: user?.role || "Student",
  });

  useEffect(() => {
    const userId = user?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadErrors([]);
    setCourseCount(0);
    setGradeCount(0);
    setAttendance({ present: 0, late: 0, total: 0 });

    const pendingSources = new Set<DashboardSource>(["subjects", "attendance", "grades"]);
    const finishSource = (source: DashboardSource) => {
      pendingSources.delete(source);
      if (pendingSources.size === 0) setLoading(false);
    };
    const handleError = (source: DashboardSource, error: Error) => {
      console.error(`[StudentDashboard] Could not load ${source}:`, error);
      setLoadErrors((previous) =>
        previous.includes(source) ? previous : [...previous, source]
      );
      finishSource(source);
    };

    const subjectsQuery = query(
      collection(db, "studentSubjects"),
      where("studentId", "==", userId),
      where("status", "==", "enrolled")
    );
    const unsubscribeSubjects = onSnapshot(
      subjectsQuery,
      (snapshot) => {
        setCourseCount(snapshot.size);
        finishSource("subjects");
      },
      (error) => handleError("subjects", error)
    );

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("studentId", "==", userId)
    );
    const unsubscribeAttendance = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        let present = 0;
        let late = 0;
        snapshot.docs.forEach((attendanceDoc) => {
          const status = attendanceDoc.data().status?.toLowerCase();
          if (status === "present") present += 1;
          if (status === "late") late += 1;
        });
        setAttendance({ present, late, total: snapshot.size });
        finishSource("attendance");
      },
      (error) => handleError("attendance", error)
    );

    const gradesQuery = query(
      collection(db, "grades"),
      where("studentId", "==", userId)
    );
    const unsubscribeGrades = onSnapshot(
      gradesQuery,
      (snapshot) => {
        setGradeCount(snapshot.size);
        finishSource("grades");
      },
      (error) => handleError("grades", error)
    );

    return () => {
      unsubscribeSubjects();
      unsubscribeAttendance();
      unsubscribeGrades();
    };
  }, [user?.uid]);

  if (loading) {
    return (
      <DashboardLayout
        userRole="Student"
        userName={user?.name || "Student"}
        userId={user?.uid}
        notificationCount={notificationCount}
      >
        <div className="p-4 md:p-6">
          <LoadingState message="Loading your dashboard..." />
        </div>
      </DashboardLayout>
    );
  }

  const attendanceRate = attendance.total
    ? Math.round(((attendance.present + attendance.late) / attendance.total) * 100)
    : null;

  const summary = [
    {
      label: "Enrolled subjects",
      value: String(courseCount),
      detail: "Current enrolled classes",
      icon: BookOpen,
    },
    {
      label: "Attendance",
      value: attendanceRate === null ? "—" : `${attendanceRate}%`,
      detail: attendance.total ? `${attendance.total} records` : "No records yet",
      icon: Activity,
    },
    {
      label: "Grade records",
      value: String(gradeCount),
      detail: "Published grade entries",
      icon: GraduationCap,
    },
  ];

  return (
    <DashboardLayout
      userRole="Student"
      userName={user?.name || "Student"}
      userId={user?.uid}
      notificationCount={notificationCount}
    >
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
        <header className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Welcome, {user?.name?.split(" ")[0] || "Student"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your courses, progress, and student services in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {user?.program && <Badge variant="secondary">{user.program}</Badge>}
            {user?.yearLevel && <Badge variant="outline">{user.yearLevel}</Badge>}
            {user?.semester && <Badge variant="outline">{user.semester}</Badge>}
          </div>
        </header>

        {loadErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              Some dashboard information could not be loaded ({loadErrors.join(", ")}).
              You can still open the related modules below.
            </AlertDescription>
          </Alert>
        )}

        <section aria-label="Academic summary" className="grid gap-4 sm:grid-cols-3">
          {summary.map((item) => (
            <Card key={item.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-semibold tabular-nums">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section aria-labelledby="student-quick-access-heading">
          <div className="mb-3">
            <h2 id="student-quick-access-heading" className="text-lg font-semibold">
              Quick access
            </h2>
            <p className="text-sm text-muted-foreground">
              Go straight to the information you need.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {studentQuickLinks.map((quickLink) => (
              <Button
                key={quickLink.route}
                type="button"
                variant="outline"
                className="h-full min-h-24 justify-between gap-3 whitespace-normal p-4 text-left"
                onClick={() => router.navigate(quickLink.route)}
              >
                <span className="flex min-w-0 items-start gap-3">
                  <quickLink.icon
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-medium">
                      {quickLink.title}
                      {quickLink.title === "Announcements" && notificationCount > 0 && (
                        <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                          {notificationCount}
                        </Badge>
                      )}
                    </span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {quickLink.description}
                    </span>
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
