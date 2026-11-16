"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "./dashboard-layout";
import { StatCard } from "./stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { LoadingState } from "../loading-state";
import { FileText, Users, Clock, LayoutDashboard, UserPlus, ArrowRight } from "lucide-react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { PageHeader } from "./shared/page-header";
import { useRouter } from "../router";

export function RegistrarDashboard() {
  const { user, navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [stats, setStats] = useState({
    pendingApplications: 0,
    approvedApplications: 0,
    approvedWithoutAccounts: 0,
    totalStudents: 0,
    rejectedApplications: 0,
  });

  // Wait for auth to be ready
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthReady(true);
      } else {
        setAuthReady(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time statistics - only when auth is ready
  useEffect(() => {
    if (!authReady) return;

    const unsubscribers: (() => void)[] = [];
    const handleError = (source: string, error: Error) => {
      console.error(`[RegistrarDashboard] Failed to load ${source}:`, error);
      setLoadError(true);
      setLoading(false);
    };

    // Count pending applications
    const pendingQuery = query(
      collection(db, "enrollments"),
      where("status", "==", "pending")
    );
    const unsubPending = onSnapshot(pendingQuery, (snapshot) => {
      setStats(prev => ({ ...prev, pendingApplications: snapshot.size }));
    }, (error) => handleError("pending applications", error));
    unsubscribers.push(unsubPending);

    // Count approved applications
    const approvedQuery = query(
      collection(db, "enrollments"),
      where("status", "==", "approved")
    );
    const unsubApproved = onSnapshot(approvedQuery, (snapshot) => {
      const approvedWithoutAccounts = snapshot.docs.filter(
        (application) => !application.data().accountCreated
      ).length;
      setStats(prev => ({
        ...prev,
        approvedApplications: snapshot.size,
        approvedWithoutAccounts,
      }));
    }, (error) => handleError("approved applications", error));
    unsubscribers.push(unsubApproved);

    // Count rejected applications
    const rejectedQuery = query(
      collection(db, "enrollments"),
      where("status", "==", "rejected")
    );
    const unsubRejected = onSnapshot(rejectedQuery, (snapshot) => {
      setStats(prev => ({ ...prev, rejectedApplications: snapshot.size }));
    }, (error) => handleError("rejected applications", error));
    unsubscribers.push(unsubRejected);

    // Count total students
    const studentsQuery = query(
      collection(db, "users"),
      where("role", "==", "Student")
    );
    const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalStudents: snapshot.size }));
      setLoading(false);
    }, (error) => handleError("student records", error));
    unsubscribers.push(unsubStudents);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [authReady]);

  const statCards = [
    { 
      title: "Pending Applications", 
      value: stats.pendingApplications.toString(), 
      icon: Clock,
      description: "Awaiting review"
    },
    {
      title: "Accounts to Create",
      value: stats.approvedWithoutAccounts.toString(),
      icon: UserPlus,
      description: "Approved students without accounts"
    },
    {
      title: "Total Students",
      value: stats.totalStudents.toString(),
      icon: Users,
      description: "Enrolled students"
    },
    { 
      title: "All Applications", 
      value: (stats.pendingApplications + stats.approvedApplications + stats.rejectedApplications).toString(), 
      icon: FileText,
      description: "Total submissions"
    },
  ];

  if (loading) {
    return (
      <DashboardLayout userRole="Registrar" userName={user?.name || "Registrar"} notificationCount={0}>
        <div className="p-4 md:p-6">
          <LoadingState message="Loading registrar data..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Registrar" userName={user?.name || "Registrar"} notificationCount={stats.pendingApplications}>
      <div className="min-h-screen bg-background">
        <PageHeader
          icon={LayoutDashboard}
          title="Registrar Dashboard"
          description="Enrollment and student records management"
        />

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
          {loadError && (
            <Alert variant="destructive">
              <AlertDescription>
                Some Registrar dashboard data could not be loaded. Refresh the page or check your access.
              </AlertDescription>
            </Alert>
          )}

          {/* Stats Grid - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>

          <Card className="border-0 elevation-md bg-card">
            <CardHeader>
              <CardTitle>Enrollment workflow</CardTitle>
              <CardDescription>
                Review applications, approve eligible students, then create their accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-medium">
                    {stats.pendingApplications > 0
                      ? `${stats.pendingApplications} application${stats.pendingApplications === 1 ? "" : "s"} need review`
                      : "No applications are waiting for review"}
                  </p>
                  {stats.approvedWithoutAccounts > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {stats.approvedWithoutAccounts} approved student account{stats.approvedWithoutAccounts === 1 ? "" : "s"} still need to be created.
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => navigate("dashboard/registrar/enrollments")}>
                    <FileText className="mr-2 h-4 w-4" />
                    {stats.pendingApplications > 0 ? "Review applications" : "Open enrollment queue"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("dashboard/registrar/students")}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Student records
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}