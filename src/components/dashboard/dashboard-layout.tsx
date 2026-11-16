"use client";

import { useState } from "react";
import { PageHeader } from "../page-header";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { Home, Users, FileText, Settings, GraduationCap, BookOpen, DollarSign, ClipboardList, Calendar, TrendingUp, Receipt, BarChart2, UserCog, Clock, Building, CreditCard, Phone, Mail, LogOut, Menu, DoorOpen, CheckCircle, Plus, Bug, Activity, Bell, Shield } from "lucide-react";
import { useRouter } from "../router";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: string;
  userName: string;
  userId?: string;
  notificationCount?: number;
}

export function DashboardLayout({ children, userRole, userName, userId, notificationCount = 0 }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const getNavigationItems = () => {
    const baseItems = [
      { icon: Home, label: "Dashboard", href: "dashboard" },
    ];

    const roleItems: Record<string, any[]> = {
      admin: [
        { icon: Users, label: "User Management", href: "dashboard/admin/users" },
        { icon: FileText, label: "Enrollments", href: "dashboard/admin/enrollments" },
        { icon: Building, label: "Programs", href: "dashboard/admin/programs" },
        { icon: GraduationCap, label: "Curriculum Management", href: "dashboard/admin/curriculum" },
        { icon: Calendar, label: "Enrollment Period", href: "dashboard/admin/enrollment-period" },
        { icon: BarChart2, label: "Analytics", href: "dashboard/admin/analytics" },
        { icon: Bell, label: "Announcements", href: "dashboard/admin/announcements" },
      ],
      registrar: [
        { icon: FileText, label: "Enrollment Queue", href: "dashboard/registrar/enrollments" },
        { icon: Users, label: "Student Records", href: "dashboard/registrar/students" },
        { icon: Shield, label: "Manage Enrollments", href: "dashboard/registrar/manage-enrollments" },
        { icon: BookOpen, label: "Subjects", href: "dashboard/registrar/subjects" },
        { icon: Clock, label: "Schedules", href: "dashboard/registrar/schedules" },
        { icon: Building, label: "Programs", href: "dashboard/registrar/programs" },
        { icon: DoorOpen, label: "Rooms", href: "dashboard/registrar/rooms" },
        { icon: Calendar, label: "Enrollment Period", href: "dashboard/registrar/enrollment-period" },
        { icon: GraduationCap, label: "Curriculum", href: "dashboard/registrar/curriculum" },
        { icon: Bell, label: "Announcements", href: "dashboard/registrar/announcements" },
      ],
      teacher: [
        { icon: Users, label: "My Classes", href: "dashboard/teacher/classes" },
        { icon: BookOpen, label: "Gradebook", href: "dashboard/teacher/gradebook" },
        { icon: FileText, label: "Attendance", href: "dashboard/teacher/attendance" },
        { icon: Bell, label: "Announcements", href: "dashboard/teacher/announcements" },
      ],
      student: [
        { icon: BookOpen, label: "My Curriculum", href: "dashboard/student/curriculum" },
        { icon: Clock, label: "My Schedule", href: "dashboard/student/schedule" },
        { icon: GraduationCap, label: "My Grades", href: "dashboard/student/grades" },
        { icon: CheckCircle, label: "My Attendance", href: "dashboard/student/attendance" },
        { icon: Plus, label: "Enroll Subjects", href: "dashboard/student/subjects" },
        { icon: Receipt, label: "Tuition & Fees", href: "dashboard/student/tuition-fees" },
        { icon: DollarSign, label: "Payments", href: "dashboard/student/payments" },
        { icon: Bell, label: "Announcements", href: "dashboard/student/announcements" },
      ],
      parent: [
        { icon: Users, label: "My Children", href: "dashboard/parent/children" },
        { icon: BookOpen, label: "Progress Reports", href: "dashboard/parent/reports" },
        { icon: Receipt, label: "Tuition & Fees", href: "dashboard/parent/tuition-fees" },
        { icon: DollarSign, label: "Billing", href: "dashboard/parent/billing" },
        { icon: Bell, label: "Announcements", href: "dashboard/parent/announcements" },
      ],
      "business office": [
        { icon: Settings, label: "Fee Configuration", href: "dashboard/business/fee-configuration" },
        { icon: FileText, label: "Student Assessment", href: "dashboard/business/student-assessment" },
        { icon: FileText, label: "Student Ledger", href: "dashboard/business/student-ledger" },
        { icon: DollarSign, label: "Payments", href: "dashboard/business/payments" },
        { icon: Bell, label: "Announcements", href: "dashboard/business/announcements" },
      ],
    };

    return [...baseItems, ...(roleItems[userRole?.toLowerCase() || ""] || [])];
  };

  const navigationItems = getNavigationItems();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.navigate("dashboard")}>
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="text-lg text-foreground">CollegeConnect</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => {
          // Check if current route matches this navigation item
          const isActive = router.currentRoute === item.href;
          return (
            <Button
              key={item.href}
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start ${
                isActive 
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" 
                  : "text-foreground hover:bg-muted"
              }`}
              onClick={() => {
                setSidebarOpen(false);
                // Navigate to the href
                if (item.href) {
                  const path = item.href.replace(/^\//, ''); // Remove leading slash
                  router.navigate(path);
                }
              }}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="text-sm text-muted-foreground">
          Logged in as <strong className="text-foreground">{userName}</strong>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageHeader
        variant="dashboard"
        userName={userName}
        userRole={userRole}
        userId={userId}
        notificationCount={notificationCount}
        onLogout={router.logout}
      />

      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 border-r border-border bg-card">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild className="md:hidden fixed bottom-4 right-4 z-50">
            <Button size="icon" className="rounded-full shadow-lg bg-primary hover:bg-primary/90">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
