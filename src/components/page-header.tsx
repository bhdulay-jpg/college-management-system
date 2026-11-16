"use client";

import { GraduationCap, Bell, User, Moon, Sun, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { useState, useEffect } from "react";
import { useRouter } from "./router";
import { NotificationDropdown } from "./notifications/notification-dropdown";
import { useNotificationCount } from "../hooks/useNotificationCount";

interface PageHeaderProps {
  variant?: "public" | "dashboard";
  userName?: string;
  userRole?: string;
  userId?: string;
  notificationCount?: number;
  onLogout?: () => void;
}

export function PageHeader({
  variant = "public",
  userName,
  userRole,
  userId,
  notificationCount = 0,
  onLogout,
}: PageHeaderProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  
  // Get real-time notification count
  const { unreadCount, loading: notificationLoading } = useNotificationCount(userId, userRole);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
  };

  const handleNavClick = (route: any) => {
    router.navigate(route);
    setMobileMenuOpen(false);
  };

  const notificationsRoute = {
    Admin: "dashboard/admin/notifications",
    Registrar: "dashboard/registrar/notifications",
    Teacher: "dashboard/teacher/notifications",
    Student: "dashboard/student/notifications",
    Parent: "dashboard/parent/notifications",
    "Business Office": "dashboard/business-office/notifications",
  }[userRole || ""] || "dashboard";

  if (variant === "public") {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <button 
            onClick={() => router.navigate("home")}
            className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="inline-flex p-1.5 bg-primary/10 rounded-lg">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-semibold leading-tight sm:text-base">College Management<br />System</span>
          </button>

          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => router.navigate("home")} className="text-sm transition-colors hover:text-blue-bayoux-600 dark:hover:text-blue-bayoux-400">
              Home
            </button>
            <button onClick={() => router.navigate("about")} className="text-sm transition-colors hover:text-blue-bayoux-600 dark:hover:text-blue-bayoux-400">
              About
            </button>
            <button onClick={() => router.navigate("programs")} className="text-sm transition-colors hover:text-blue-bayoux-600 dark:hover:text-blue-bayoux-400">
              Programs
            </button>
            <button onClick={() => router.navigate("enrollment")} className="text-sm transition-colors hover:text-blue-bayoux-600 dark:hover:text-blue-bayoux-400">
              Enrollment
            </button>
            <button onClick={() => router.navigate("contact")} className="text-sm transition-colors hover:text-blue-bayoux-600 dark:hover:text-blue-bayoux-400">
              Contact
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            
            <Button onClick={() => router.navigate("login")} className="hidden md:inline-flex">
              Login
            </Button>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <GraduationCap className="h-6 w-6 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                    College Management System
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-4 mt-8">
                  <button onClick={() => handleNavClick("home")} className="text-left py-2 hover:text-blue-bayoux-600 dark:hover:text-blue-bayoux-400 transition-colors">
                    Home
                  </button>
                  <button onClick={() => handleNavClick("about")} className="text-left py-2 hover:text-blue-bayoux-600 dark:hover:text-blue-bayoux-400 transition-colors">
                    About
                  </button>
                  <button onClick={() => handleNavClick("programs")} className="text-left py-2 hover:text-blue-bayoux-600 dark:hover:text-blue-bayoux-400 transition-colors">
                    Programs
                  </button>
                  <button onClick={() => handleNavClick("enrollment")} className="text-left py-2 hover:text-blue-bayoux-600 dark:hover:text-blue-bayoux-400 transition-colors">
                    Enrollment
                  </button>
                  <button onClick={() => handleNavClick("contact")} className="text-left py-2 hover:text-blue-bayoux-600 dark:hover:text-blue-bayoux-400 transition-colors">
                    Contact
                  </button>
                  <Button onClick={() => handleNavClick("login")} className="mt-4">
                    Login
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    );
  }

  // Dashboard variant
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <button
          onClick={() => router.navigate("dashboard")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="inline-flex p-1.5 bg-primary/10 rounded-lg">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <span className="text-lg font-semibold">College Management System</span>
          {userRole && (
            <Badge variant="secondary" className="ml-2">
              {userRole}
            </Badge>
          )}
        </button>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          <NotificationDropdown 
            userId={userId || ""} 
            userRole={userRole || "Student"} 
            notificationCount={unreadCount} 
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="User menu">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p>{userName || "User"}</p>
                  <p className="text-xs text-muted-foreground">{userRole}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.navigate(notificationsRoute)}>
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout || router.logout} className="text-destructive">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}