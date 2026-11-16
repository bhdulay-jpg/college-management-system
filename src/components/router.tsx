"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loginWithEmail, loginWithGoogle, logout as firebaseLogout, onAuthChange, getCurrentUserData, UserData } from "../lib/firebase-auth";

type Route =
  | "home"
  | "about"
  | "programs"
  | "enrollment"
  | "announcements"
  | "contact"
  | "login"
  | "reset-password"
  | "accept-invite"
  | "dashboard"
  | "dashboard/admin/users"
  | "dashboard/admin/enrollments"
  | "dashboard/admin/curriculum"
  | "dashboard/admin/programs"
  | "dashboard/admin/analytics"
  | "dashboard/admin/settings"
  | "dashboard/admin/enrollment-period"
  | "dashboard/admin/notifications"
  | "dashboard/admin/announcements"
  | "dashboard/registrar/enrollments"
  | "dashboard/registrar/students"
  | "dashboard/registrar/manage-enrollments"
  | "dashboard/registrar/programs"
  | "dashboard/registrar/subjects"
  | "dashboard/registrar/curriculum"
  | "dashboard/registrar/enrollment-period"
  | "dashboard/registrar/schedules"
  | "dashboard/registrar/rooms"
  | "dashboard/registrar/notifications"
  | "dashboard/registrar/announcements"
  | "dashboard/teacher/classes"
  | "dashboard/teacher/gradebook"
  | "dashboard/teacher/attendance"
  | "dashboard/teacher/attendance/enhanced"
  | "dashboard/teacher/notifications"
  | "dashboard/teacher/announcements"
  | "dashboard/student/subjects"
  | "dashboard/student/curriculum"
  | "dashboard/student/schedule"
  | "dashboard/student/grades"
  | "dashboard/student/attendance"
  | "dashboard/student/tuition-fees"
  | "dashboard/student/payments"
  | "dashboard/student/notifications"
  | "dashboard/student/announcements"
  | "dashboard/parent/children"
  | "dashboard/parent/reports"
  | "dashboard/parent/billing"
  | "dashboard/parent/notifications"
  | "dashboard/parent/announcements"
  | "dashboard/business-office/payments"
  | "dashboard/business-office/receipts"
  | "dashboard/business-office/reports"
  | "dashboard/business-office/notifications"
  | "dashboard/business-office/announcements"
  | "dashboard/business/payments"
  | "dashboard/business/receipts"
  | "dashboard/business/reports"
  | string; // Allow any string for dynamic routes

type UserRole = "Admin" | "Registrar" | "Teacher" | "Student" | "Parent" | "Business Office";

interface User {
  id: string;
  uid?: string;
  email: string;
  name: string;
  role: UserRole;
  // Student-specific fields
  program?: string;
  yearLevel?: string;
  semester?: string;
  studentId?: string;
  enrollmentType?: string;
  // Teacher-specific fields
  employeeId?: string;
  department?: string;
  // Parent-specific fields
  parentId?: string;
  linkedStudentId?: string;
}

interface RouterContextType {
  currentRoute: Route;
  navigate: (route: Route) => void;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within a RouterProvider");
  }
  return context;
}

interface RouterProviderProps {
  children: ReactNode;
}

export function RouterProvider({ children }: RouterProviderProps) {
  const [currentRoute, setCurrentRoute] = useState<Route>("home");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userData = await getCurrentUserData();
          if (userData) {
            setUser({
              id: userData.uid,
              uid: userData.uid,
              email: userData.email,
              name: userData.name,
              role: userData.role,
              // Student-specific fields
              program: userData.program,
              yearLevel: userData.yearLevel,
              semester: userData.semester,
              studentId: userData.studentId,
              enrollmentType: userData.enrollmentType,
              // Teacher-specific fields
              employeeId: userData.employeeId,
              department: userData.department,
              // Parent-specific fields
              parentId: userData.parentId,
              linkedStudentId: userData.linkedStudentId,
            });
            setCurrentRoute("dashboard");
          } else {
            setUser(null);
          }
        } else {
          setCurrentRoute((route) => route.startsWith("dashboard") ? "login" : route);
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to load signed-in user data:", error);
        setUser(null);
        setCurrentRoute("login");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const navigate = (route: Route) => {
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userData = await loginWithEmail(email, password);
      setUser({
        id: userData.uid,
        uid: userData.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        // Student-specific fields
        program: userData.program,
        yearLevel: userData.yearLevel,
        semester: userData.semester,
        studentId: userData.studentId,
        enrollmentType: userData.enrollmentType,
        // Teacher-specific fields
        employeeId: userData.employeeId,
        department: userData.department,
        // Parent-specific fields
        parentId: userData.parentId,
        linkedStudentId: userData.linkedStudentId,
      });
      navigate("dashboard");
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = async () => {
    setLoading(true);
    try {
      const userData = await loginWithGoogle();
      setUser({
        id: userData.uid,
        uid: userData.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        // Student-specific fields
        program: userData.program,
        yearLevel: userData.yearLevel,
        semester: userData.semester,
        studentId: userData.studentId,
        enrollmentType: userData.enrollmentType,
        // Teacher-specific fields
        employeeId: userData.employeeId,
        department: userData.department,
        // Parent-specific fields
        parentId: userData.parentId,
        linkedStudentId: userData.linkedStudentId,
      });
      navigate("dashboard");
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseLogout();
      setUser(null);
      navigate("home");
    } catch (error: any) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RouterContext.Provider
      value={{
        currentRoute,
        navigate,
        user,
        login,
        loginGoogle,
        logout,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
}
