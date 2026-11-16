"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "./dashboard-layout";
import { StatCard } from "./stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { EmptyState } from "../empty-state";
import { LoadingState } from "../loading-state";
import { ActivityFeed } from "./admin/activity-feed";
import { Users, FileText, School, TrendingUp } from "lucide-react";
import { collection, query, onSnapshot, where, orderBy, limit } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { useAnnouncementNotifications } from "../../hooks/use-announcement-notifications";
import { useRouter } from "../router";

export function AdminDashboard() {
  const { user } = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApplications: 0,
    activeStudents: 0,
    totalEnrollments: 0,
  });

  const notificationCount = useAnnouncementNotifications({
    userId: user?.uid || "",
    userRole: user?.role || "Admin"
  });

  // Real-time statistics
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Count total users
    const usersQuery = query(collection(db, "users"));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
    });
    unsubscribers.push(unsubUsers);

    // Count pending applications
    const appsQuery = query(
      collection(db, "enrollments"),
      where("status", "==", "pending")
    );
    const unsubApps = onSnapshot(appsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, pendingApplications: snapshot.size }));
    });
    unsubscribers.push(unsubApps);

    // Count active students
    const studentsQuery = query(
      collection(db, "users"),
      where("role", "==", "Student")
    );
    const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, activeStudents: snapshot.size }));
    });
    unsubscribers.push(unsubStudents);

    // Count total enrollments
    const enrollmentsQuery = query(collection(db, "enrollments"));
    const unsubEnrollments = onSnapshot(enrollmentsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalEnrollments: snapshot.size }));
      setLoading(false);
    });
    unsubscribers.push(unsubEnrollments);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const statCards = [
    { 
      title: "Total Users", 
      value: stats.totalUsers.toString(), 
      icon: Users,
      description: "All system users"
    },
    { 
      title: "Pending Applications", 
      value: stats.pendingApplications.toString(), 
      icon: FileText,
      description: "Awaiting review"
    },
    { 
      title: "Active Students", 
      value: stats.activeStudents.toString(), 
      icon: School,
      description: "Enrolled students"
    },
    { 
      title: "Total Applications", 
      value: stats.totalEnrollments.toString(), 
      icon: TrendingUp,
      description: "All time enrollments"
    },
  ];

  if (loading) {
    return (
      <DashboardLayout userRole="Admin" userName="Administrator" notificationCount={0}>
        <div className="p-4 md:p-6">
          <LoadingState message="Loading dashboard data..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Admin" userName="Administrator" notificationCount={notificationCount}>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-8 space-y-8">
          {/* Welcome Section */}
          <div>
            <h1 className="mb-1">Admin Dashboard</h1>
            <p className="text-muted-foreground">System overview and management</p>
          </div>

          {/* Stats Grid - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>

          {/* Getting Started */}
          <div>
            <div className="mb-4">
              <h2>Welcome to CollegeConnect</h2>
              <p className="text-sm text-muted-foreground">Get started with your college management system</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 border rounded-xl bg-card hover:bg-accent/5 hover:border-blue-bayoux-400 transition-all space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900/30 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                  </div>
                  <h3>User Management</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Create and manage user accounts for Teachers, Students, Parents, Registrars, and Business Office staff.
                </p>
              </div>

              <div className="p-6 border rounded-xl bg-card hover:bg-accent/5 hover:border-blue-bayoux-400 transition-all space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3>Application Review</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Review and process enrollment applications. Approve qualified applicants to create their student accounts.
                </p>
              </div>

              <div className="p-6 border rounded-xl bg-card hover:bg-accent/5 hover:border-blue-bayoux-400 transition-all space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <School className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3>System Configuration</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Configure programs, courses, academic calendars, and other system-wide settings.
                </p>
              </div>

              <div className="p-6 border rounded-xl bg-card hover:bg-accent/5 hover:border-blue-bayoux-400 transition-all space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3>Analytics & Reports</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Monitor system usage, track enrollment trends, and generate comprehensive reports.
                </p>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <ActivityFeed />
        </div>
      </div>
    </DashboardLayout>
  );
}
