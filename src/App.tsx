"use client";

import { RouterProvider, useRouter } from "./components/router";
import { PageTransition } from "./components/page-transition";
import { Homepage } from "./components/pages/homepage";
import { AboutPage } from "./components/pages/about-page";
import { ProgramsPage } from "./components/pages/programs-page";
import { EnrollmentPage } from "./components/pages/enrollment-page";

import { ContactPage } from "./components/pages/contact-page";
import { LoginPage } from "./components/auth/login-page";
import { ResetPassword } from "./components/auth/reset-password";
import { AcceptInvitePage } from "./components/auth/accept-invite";
import { DashboardPage } from "./components/pages/dashboard-page";
import { DashboardLayout } from "./components/dashboard/dashboard-layout";
import { UsersPage } from "./components/dashboard/admin/users-page";
import { EnrollmentsPage } from "./components/dashboard/admin/enrollments-page";
import { AnalyticsPage } from "./components/dashboard/admin/analytics-page";
import { EnrollmentsPage as RegistrarEnrollmentsPage } from "./components/dashboard/registrar/enrollments-page";
import { StudentsPage as RegistrarStudentsPage } from "./components/dashboard/registrar/students-page";
import { ManageEnrollmentsPage } from "./components/dashboard/registrar/manage-enrollments-page";
import { ProgramsPage as RegistrarProgramsPage } from "./components/dashboard/registrar/programs-page";
import { SubjectsManagement } from "./components/dashboard/registrar/subjects-management";
import { CurriculumView } from "./components/dashboard/registrar/curriculum-view";
import { ProgramManagementPage } from "./components/dashboard/admin/program-management-page";
import { SubjectEnrollment } from "./components/dashboard/student/subject-enrollment";
import { PaymentsPage } from "./components/dashboard/business/payments-page";
import { AdminEnrollmentSettingsPage } from "./components/dashboard/admin/enrollment-settings-page";
import { RegistrarEnrollmentSettingsPage } from "./components/dashboard/registrar/enrollment-settings-page";
import { RegistrarSchedulePage } from "./components/dashboard/registrar/schedule-page";
import { RegistrarRoomsPage } from "./components/dashboard/registrar/rooms-page";
import { MyClasses } from "./components/dashboard/teacher/my-classes";
import { Attendance } from "./components/dashboard/teacher/attendance";
import { EnhancedAttendanceSystem } from "./components/dashboard/teacher/enhanced-attendance-system";
import { Gradebook } from "./components/dashboard/teacher/gradebook";
import { MyCurriculum } from "./components/dashboard/student/my-curriculum";
import { MySchedule } from "./components/dashboard/student/my-schedule";
import { MyGrades } from "./components/dashboard/student/my-grades";
import { MyAttendance } from "./components/dashboard/student/my-attendance";
import { TuitionFees } from "./components/dashboard/student/tuition-fees";
import { StudentPaymentsPage } from "./components/dashboard/student/payments-page";
import { ChildrenPage } from "./components/dashboard/parent/children-page";
import { ReportsPage } from "./components/dashboard/parent/reports-page";
import { BillingPage } from "./components/dashboard/parent/billing-page";
import { AnnouncementsPage as ParentAnnouncementsPage } from "./components/dashboard/parent/announcements-page";
import { ChildTuitionFees } from "./components/dashboard/parent/child-tuition-fees";
import { StudentLedger } from "./components/dashboard/business-office/student-ledger";
import { FeeConfiguration } from "./components/dashboard/business-office/fee-configuration";
import { StudentAssessment } from "./components/dashboard/business-office/student-assessment";
import { AnnouncementsPage as AdminAnnouncementsPage } from "./components/dashboard/admin/announcements-page";
import { AnnouncementsPage as TeacherAnnouncementsPage } from "./components/dashboard/teacher/announcements-page";
import { AnnouncementsPage as StudentAnnouncementsPage } from "./components/dashboard/student/announcements-page";
import { AnnouncementsPage as RegistrarAnnouncementsPage } from "./components/dashboard/registrar/announcements-page";
import { AnnouncementsPage as BusinessAnnouncementsPage } from "./components/dashboard/business-office/announcements-page";
import { NotificationsPage } from "./components/dashboard/shared/notifications-page";
import { Toaster } from "./components/ui/sonner";
import { LoadingState } from "./components/loading-state";
import { getFirebaseInitializationError, isFirebaseInitialized } from "./lib/firebase";

function AppRoutes() {
  const { currentRoute, user, loading } = useRouter();

  if (currentRoute.startsWith("dashboard") && !user) {
    return loading ? <LoadingState message="Loading your account..." /> : <LoginPage />;
  }

  // Admin sub-routes
  if (currentRoute === "dashboard/admin/users" && user?.role === "Admin") {
    return (
      <DashboardLayout userRole="Admin" userName={user.name} notificationCount={0}>
        <UsersPage />
      </DashboardLayout>
    );
  }
  
  if (currentRoute === "dashboard/admin/enrollments" && user?.role === "Admin") {
    return (
      <DashboardLayout userRole="Admin" userName={user.name} notificationCount={0}>
        <EnrollmentsPage />
      </DashboardLayout>
    );
  }
  
  if (currentRoute === "dashboard/admin/analytics" && user?.role === "Admin") {
    return (
      <DashboardLayout userRole="Admin" userName={user.name} notificationCount={0}>
        <AnalyticsPage />
      </DashboardLayout>
    );
  }
  
  if (currentRoute === "dashboard/admin/curriculum" && user?.role === "Admin") {
    return (
      <DashboardLayout userRole="Admin" userName={user.name} notificationCount={0}>
        <SubjectsManagement />
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/admin/programs" && user?.role === "Admin") {
    return (
      <DashboardLayout userRole="Admin" userName={user.name} notificationCount={0}>
        <ProgramManagementPage />
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/admin/enrollment-period" && user?.role === "Admin") {
    return <AdminEnrollmentSettingsPage />;
  }

  if (currentRoute === "dashboard/admin/announcements" && user?.role === "Admin") {
    return <AdminAnnouncementsPage />;
  }

  if (currentRoute === "dashboard/admin/notifications" && user?.role === "Admin") {
    return (
      <DashboardLayout userRole="Admin" userName={user.name} notificationCount={0}>
        <NotificationsPage userId={user.uid || user.id} userRole={user.role} />
      </DashboardLayout>
    );
  }

  // Registrar sub-routes
  if (currentRoute === "dashboard/registrar/enrollments" && user?.role === "Registrar") {
    return (
      <DashboardLayout userRole="Registrar" userName={user.name} notificationCount={0}>
        <RegistrarEnrollmentsPage />
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/registrar/students" && user?.role === "Registrar") {
    return (
      <DashboardLayout userRole="Registrar" userName={user.name} notificationCount={0}>
        <RegistrarStudentsPage />
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/registrar/manage-enrollments" && user?.role === "Registrar") {
    return (
      <DashboardLayout userRole="Registrar" userName={user.name} notificationCount={0}>
        <ManageEnrollmentsPage />
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/registrar/programs" && user?.role === "Registrar") {
    return (
      <DashboardLayout userRole="Registrar" userName={user.name} notificationCount={0}>
        <RegistrarProgramsPage />
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/registrar/subjects" && user?.role === "Registrar") {
    return (
      <DashboardLayout userRole="Registrar" userName={user.name} notificationCount={0}>
        <div className="p-4 md:p-6">
          <SubjectsManagement />
        </div>
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/registrar/curriculum" && user?.role === "Registrar") {
    return (
      <DashboardLayout userRole="Registrar" userName={user.name} notificationCount={0}>
        <div className="p-4 md:p-6">
          <CurriculumView />
        </div>
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/registrar/enrollment-period" && user?.role === "Registrar") {
    return <RegistrarEnrollmentSettingsPage />;
  }

  if (currentRoute === "dashboard/registrar/schedules" && user?.role === "Registrar") {
    return <RegistrarSchedulePage />;
  }

  if (currentRoute === "dashboard/registrar/rooms" && user?.role === "Registrar") {
    return <RegistrarRoomsPage />;
  }

  if (currentRoute === "dashboard/registrar/announcements" && user?.role === "Registrar") {
    return <RegistrarAnnouncementsPage />;
  }

  if (currentRoute === "dashboard/registrar/notifications" && user?.role === "Registrar") {
    return (
      <DashboardLayout userRole="Registrar" userName={user.name} notificationCount={0}>
        <NotificationsPage userId={user.uid || user.id} userRole={user.role} />
      </DashboardLayout>
    );
  }

  // Business Office sub-routes
  if (
    (currentRoute === "dashboard/business/payments" || currentRoute === "dashboard/business-office/payments") &&
    user?.role === "Business Office"
  ) {
    return (
      <DashboardLayout userRole="Business Office" userName={user.name} notificationCount={0}>
        <PaymentsPage />
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/business/student-ledger" && user?.role === "Business Office") {
    return (
      <DashboardLayout userRole="Business Office" userName={user.name} notificationCount={0}>
        <div className="p-4 md:p-6">
          <StudentLedger />
        </div>
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/business/fee-configuration" && user?.role === "Business Office") {
    return (
      <DashboardLayout userRole="Business Office" userName={user.name} notificationCount={0}>
        <div className="p-4 md:p-6">
          <FeeConfiguration />
        </div>
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/business/student-assessment" && user?.role === "Business Office") {
    return (
      <DashboardLayout userRole="Business Office" userName={user.name} notificationCount={0}>
        <div className="p-4 md:p-6">
          <StudentAssessment />
        </div>
      </DashboardLayout>
    );
  }

  if (
    (currentRoute === "dashboard/business/announcements" || currentRoute === "dashboard/business-office/announcements") &&
    user?.role === "Business Office"
  ) {
    return <BusinessAnnouncementsPage />;
  }

  if (currentRoute === "dashboard/business-office/notifications" && user?.role === "Business Office") {
    return (
      <DashboardLayout userRole="Business Office" userName={user.name} notificationCount={0}>
        <NotificationsPage userId={user.uid || user.id} userRole={user.role} />
      </DashboardLayout>
    );
  }

  // Teacher sub-routes
  if (currentRoute === "dashboard/teacher/classes" && user?.role === "Teacher") {
    return <MyClasses />;
  }

  if (currentRoute === "dashboard/teacher/gradebook" && user?.role === "Teacher") {
    return <Gradebook />;
  }

  if (currentRoute === "dashboard/teacher/attendance" && user?.role === "Teacher") {
    return <EnhancedAttendanceSystem />;
  }

  if (currentRoute === "dashboard/teacher/attendance/enhanced" && user?.role === "Teacher") {
    return <Attendance />;
  }

  if (currentRoute === "dashboard/teacher/announcements" && user?.role === "Teacher") {
    return <TeacherAnnouncementsPage />;
  }

  if (currentRoute === "dashboard/teacher/notifications" && user?.role === "Teacher") {
    return (
      <DashboardLayout userRole="Teacher" userName={user.name} notificationCount={0}>
        <NotificationsPage userId={user.uid || user.id} userRole={user.role} />
      </DashboardLayout>
    );
  }

  // Student sub-routes
  if (currentRoute === "dashboard/student/subjects" && user?.role === "Student") {
    return (
      <DashboardLayout userRole="Student" userName={user.name} notificationCount={0}>
        <div className="p-4 md:p-6">
          <SubjectEnrollment />
        </div>
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/student/grades" && user?.role === "Student") {
    return <MyGrades />;
  }

  if (currentRoute === "dashboard/student/payments" && user?.role === "Student") {
    return <StudentPaymentsPage />;
  }

  if (currentRoute === "dashboard/student/announcements" && user?.role === "Student") {
    return <StudentAnnouncementsPage />;
  }

  if (currentRoute === "dashboard/student/curriculum" && user?.role === "Student") {
    return <MyCurriculum />;
  }

  if (currentRoute === "dashboard/student/schedule" && user?.role === "Student") {
    return <MySchedule />;
  }

  if (currentRoute === "dashboard/student/attendance" && user?.role === "Student") {
    return <MyAttendance />;
  }

  if (currentRoute === "dashboard/student/tuition-fees" && user?.role === "Student") {
    return <TuitionFees />;
  }

  if (currentRoute === "dashboard/student/notifications" && user?.role === "Student") {
    return (
      <DashboardLayout userRole="Student" userName={user.name} notificationCount={0}>
        <NotificationsPage userId={user.uid || user.id} userRole={user.role} />
      </DashboardLayout>
    );
  }

  // Parent sub-routes
  if (currentRoute === "dashboard/parent/children" && user?.role === "Parent") {
    return (
      <DashboardLayout userRole="Parent" userName={user.name} notificationCount={0}>
        <ChildrenPage />
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/parent/reports" && user?.role === "Parent") {
    return (
      <DashboardLayout userRole="Parent" userName={user.name} notificationCount={0}>
        <ReportsPage />
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/parent/billing" && user?.role === "Parent") {
    return (
      <DashboardLayout userRole="Parent" userName={user.name} notificationCount={0}>
        <BillingPage />
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/parent/announcements" && user?.role === "Parent") {
    return <ParentAnnouncementsPage />;
  }

  if (currentRoute === "dashboard/parent/tuition-fees" && user?.role === "Parent") {
    return (
      <DashboardLayout userRole="Parent" userName={user.name} notificationCount={0}>
        <div className="p-4 md:p-6">
          <ChildTuitionFees />
        </div>
      </DashboardLayout>
    );
  }

  if (currentRoute === "dashboard/parent/notifications" && user?.role === "Parent") {
    return (
      <DashboardLayout userRole="Parent" userName={user.name} notificationCount={0}>
        <NotificationsPage userId={user.uid || user.id} userRole={user.role} />
      </DashboardLayout>
    );
  }

  // Wrap each route with animation class for smooth transitions
  const renderRoute = () => {
    switch (currentRoute) {
      case "home":
        return <Homepage />;
      case "about":
        return <AboutPage />;
      case "programs":
        return <ProgramsPage />;
      case "enrollment":
        return <EnrollmentPage />;
      case "contact":
        return <ContactPage />;
      case "login":
        return <LoginPage />;
      case "reset-password":
        return <ResetPassword />;
      case "accept-invite":
        return <AcceptInvitePage />;
      case "dashboard":
        return <DashboardPage />;
      default:
        if (currentRoute.startsWith("dashboard/")) {
          return <DashboardPage />;
        }
        return <Homepage />;
    }
  };

  return (
    <PageTransition routeKey={currentRoute}>
      {renderRoute()}
    </PageTransition>
  );
}

function FirebaseConfigurationError() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section role="alert" className="w-full max-w-xl space-y-3 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-xl font-semibold">Firebase configuration required</h1>
        <p className="text-sm text-muted-foreground">
          Add the required VITE_FIREBASE_* environment variables in Vercel Project Settings, then redeploy.
        </p>
        <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
          {getFirebaseInitializationError() || "Firebase services could not be initialized."}
        </pre>
      </section>
    </main>
  );
}

export default function App() {
  if (!isFirebaseInitialized()) {
    return <FirebaseConfigurationError />;
  }

  return (
    <RouterProvider>
      <AppRoutes />
      <Toaster position="top-right" richColors />
    </RouterProvider>
  );
}
