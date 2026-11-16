"use client";

import { useRouter } from "../router";
import { AdminDashboard } from "../dashboard/admin-dashboard";
import { RegistrarDashboard } from "../dashboard/registrar-dashboard";
import { EnhancedTeacherDashboard } from "../dashboard/enhanced-teacher-dashboard";
import { StudentDashboard } from "../dashboard/student-dashboard";
import { ParentDashboard } from "../dashboard/parent-dashboard";
import { BusinessDashboard } from "../dashboard/business-dashboard";

export function DashboardPage() {
  const { user } = useRouter();

  if (!user) {
    return null;
  }

  switch (user.role) {
    case "Admin":
      return <AdminDashboard />;
    case "Registrar":
      return <RegistrarDashboard />;
    case "Teacher":
      return <EnhancedTeacherDashboard />;
    case "Student":
      return <StudentDashboard />;
    case "Parent":
      return <ParentDashboard />;
    case "Business Office":
      return <BusinessDashboard />;
    default:
      return (
        <div className="p-6" role="alert">
          Your account role is not recognized. Please contact an administrator.
        </div>
      );
  }
}