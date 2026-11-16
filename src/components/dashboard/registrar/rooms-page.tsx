"use client";

import { DashboardLayout } from "../dashboard-layout";
import { RoomsManagement } from "./rooms-management";

export function RegistrarRoomsPage() {
  return (
    <DashboardLayout userRole="Registrar" userName="Registrar" notificationCount={0}>
      <div className="p-4 md:p-6">
        <RoomsManagement />
      </div>
    </DashboardLayout>
  );
}
