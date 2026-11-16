"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { BarChart3, Users, TrendingUp, GraduationCap, DollarSign } from "lucide-react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { LoadingState } from "../../loading-state";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalApplications: 0,
    approvedApplications: 0,
    pendingApplications: 0,
    rejectedApplications: 0,
  });

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Total users
    const usersQuery = query(collection(db, "users"));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
    });
    unsubscribers.push(unsubUsers);

    // Students
    const studentsQuery = query(collection(db, "users"), where("role", "==", "Student"));
    const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalStudents: snapshot.size }));
    });
    unsubscribers.push(unsubStudents);

    // Teachers
    const teachersQuery = query(collection(db, "users"), where("role", "==", "Teacher"));
    const unsubTeachers = onSnapshot(teachersQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalTeachers: snapshot.size }));
    });
    unsubscribers.push(unsubTeachers);

    // Enrollment Applications - Real-time listener
    const enrollmentsQuery = query(collection(db, "enrollments"));
    const unsubEnrollments = onSnapshot(enrollmentsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalApplications: snapshot.size }));
    });
    unsubscribers.push(unsubEnrollments);

    // Approved enrollments - Real-time listener
    const approvedQuery = query(collection(db, "enrollments"), where("status", "==", "approved"));
    const unsubApproved = onSnapshot(approvedQuery, (snapshot) => {
      setStats(prev => ({ ...prev, approvedApplications: snapshot.size }));
    });
    unsubscribers.push(unsubApproved);

    // Pending enrollments - Real-time listener
    const pendingQuery = query(collection(db, "enrollments"), where("status", "==", "pending"));
    const unsubPending = onSnapshot(pendingQuery, (snapshot) => {
      setStats(prev => ({ ...prev, pendingApplications: snapshot.size }));
    });
    unsubscribers.push(unsubPending);

    // Rejected enrollments - Real-time listener
    const rejectedQuery = query(collection(db, "enrollments"), where("status", "==", "rejected"));
    const unsubRejected = onSnapshot(rejectedQuery, (snapshot) => {
      setStats(prev => ({ ...prev, rejectedApplications: snapshot.size }));
      setLoading(false);
    });
    unsubscribers.push(unsubRejected);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const userDistributionData = [
    { name: "Students", value: stats.totalStudents },
    { name: "Teachers", value: stats.totalTeachers },
    { name: "Others", value: stats.totalUsers - stats.totalStudents - stats.totalTeachers },
  ];

  const applicationStatusData = [
    { name: "Approved", value: stats.approvedApplications, fill: "#10b981" },
    { name: "Pending", value: stats.pendingApplications, fill: "#f59e0b" },
    { name: "Rejected", value: stats.rejectedApplications, fill: "#ef4444" },
  ];

  const COLORS = ["#74909c", "#597581", "#4d636e"]; // Blue Bayoux palette

  if (loading) {
    return <LoadingState message="Loading analytics..." />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl">Analytics & Reports</h1>
        <p className="text-muted-foreground">System insights and metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Students</p>
                <p className="text-2xl">{stats.totalStudents}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Teachers</p>
                <p className="text-2xl">{stats.totalTeachers}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Applications</p>
                <p className="text-2xl">{stats.totalApplications}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>Breakdown by role</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#74909c"
                  dataKey="value"
                >
                  {userDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Application Status */}
        <Card>
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
            <CardDescription>Real-time enrollment applications overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status Summary Cards - Mobile Friendly */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">Approved</div>
                  <div className="text-xl sm:text-2xl text-green-600 dark:text-green-400">
                    {stats.approvedApplications}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">Pending</div>
                  <div className="text-xl sm:text-2xl text-yellow-600 dark:text-yellow-400">
                    {stats.pendingApplications}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">Rejected</div>
                  <div className="text-xl sm:text-2xl text-red-600 dark:text-red-400">
                    {stats.rejectedApplications}
                  </div>
                </div>
              </div>

              {/* Bar Chart - Desktop View */}
              <div className="hidden sm:block">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={applicationStatusData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: 'currentColor' }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fill: 'currentColor' }}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {applicationStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Mobile Pie Chart */}
              <div className="sm:hidden">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={applicationStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {applicationStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle>System Insights</CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Approval Rate</p>
                <p className="text-sm text-muted-foreground">Percentage of approved applications</p>
              </div>
              <div className="text-2xl">
                {stats.totalApplications > 0 
                  ? `${Math.round((stats.approvedApplications / stats.totalApplications) * 100)}%`
                  : "0%"
                }
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Pending Review</p>
                <p className="text-sm text-muted-foreground">Applications awaiting decision</p>
              </div>
              <div className="text-2xl">{stats.pendingApplications}</div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Student-Teacher Ratio</p>
                <p className="text-sm text-muted-foreground">Average students per teacher</p>
              </div>
              <div className="text-2xl">
                {stats.totalTeachers > 0 
                  ? `${Math.round(stats.totalStudents / stats.totalTeachers)}:1`
                  : "N/A"
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
