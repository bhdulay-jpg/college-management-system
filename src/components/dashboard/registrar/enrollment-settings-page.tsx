"use client";

import { DashboardLayout } from "../dashboard-layout";
import { EnrollmentSettings } from "../enrollment-settings";

export function RegistrarEnrollmentSettingsPage() {
  return (
    <DashboardLayout userRole="Registrar" userName="Registrar" notificationCount={0}>
      <div className="p-4 md:p-6">
        <EnrollmentSettings />
      </div>
    </DashboardLayout>
  );
}
