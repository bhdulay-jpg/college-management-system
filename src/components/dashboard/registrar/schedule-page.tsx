"use client";

import { DashboardLayout } from "../dashboard-layout";
import { EnhancedScheduleManagement } from "./enhanced-schedule-management";

export function RegistrarSchedulePage() {
  return (
    <DashboardLayout userRole="Registrar" userName="Registrar" notificationCount={0}>
      <div className="p-4 md:p-6">
        <EnhancedScheduleManagement />
      </div>
    </DashboardLayout>
  );
}