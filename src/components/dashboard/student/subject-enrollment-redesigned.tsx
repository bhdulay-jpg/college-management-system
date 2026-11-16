"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Input } from "../../ui/input";
import { 
  BookOpen, CheckCircle, AlertCircle, Calendar, Clock, MapPin, User, 
  GraduationCap, X, Search, Info, Lock, Package, Sparkles, 
  Check, FileCheck, Loader2, ChevronDown, ChevronUp, Filter, Users, Plus
} from "lucide-react";
import { collection, query, onSnapshot, where, doc, serverTimestamp, getDocs, arrayUnion, arrayRemove, getDoc, writeBatch } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { toast } from "sonner@2.0.3";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { motion, AnimatePresence } from "motion/react";
import { StudentPageHeader } from "../../student-page-header";

interface Schedule {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomId: string;
  room: string;
  roomCapacity: number;
  program: string;
  yearLevel: string;
  semester: string;
  enrolledStudents: string[];
  maxStudents: number;
  units?: number;
}

interface EnrolledSchedule {
  id: string;
  studentId: string;
  scheduleId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  units: number;
  yearLevel: string;
  semester: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  teacherName: string;
  schoolYear: string;
  status: string;
  enrolledAt: any;
}

interface StudentData {
  program: string;
  yearLevel: string;
  semester: string;
  studentId: string;
  uid: string;
  name?: string;
  email?: string;
}

interface EnrollmentPeriod {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  units: number;
  prerequisites: string[];
  description?: string;
}

interface EnrollmentRestriction {
  canEnroll: boolean;
  reasons: string[];
  warnings: string[];
}

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MAX_UNITS = 24;

export function SubjectEnrollment() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [enrolledSchedules, setEnrolledSchedules] = useState<EnrolledSchedule[]>([]);
  const [pendingEnrollments, setPendingEnrollments] = useState<Schedule[]>([]);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [subjects, setSubjects] = useState<Map<string, Subject>>(new Map());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [enrollmentPeriod, setEnrollmentPeriod] = useState<EnrollmentPeriod | null>(null);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDay, setFilterDay] = useState<string>("all");
  const [filterAvailability, setFilterAvailability] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // UI states
  const [showCart, setShowCart] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Schedule | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Store restrictions
  const [scheduleRestrictions, setScheduleRestrictions] = useState<Map<string, EnrollmentRestriction>>(new Map());
  
  // Check enrollment period
  useEffect(() => {
    const checkEnrollmentPeriod = async () => {
      try {
        const docRef = doc(db, "settings", "enrollmentPeriod");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as EnrollmentPeriod;
          setEnrollmentPeriod(data);

          const now = new Date();
          const start = new Date(data.startDate);
          const end = new Date(data.endDate);
          setIsEnrollmentOpen(data.isActive && now >= start && now <= end);
        }
      } catch (error) {
        console.error("Error checking enrollment period:", error);
      }
    };

    checkEnrollmentPeriod();
  }, []);

  // Get current user's student data
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("[SubjectEnrollment] No authenticated user found");
      setLoading(false);
      return;
    }

    const userQuery = query(
      collection(db, "users"),
      where("uid", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(userQuery, (snapshot) => {
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        setStudentData({ ...userData, uid: currentUser.uid } as StudentData);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load all subjects
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "subjects"), (snapshot) => {
      const subjectsMap = new Map<string, Subject>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        subjectsMap.set(doc.id, {
          id: doc.id,
          code: data.code,
          name: data.name,
          units: data.units || 3,
          prerequisites: data.prerequisites || [],
          description: data.description || "",
        });
      });
      setSubjects(subjectsMap);
    });

    return () => unsubscribe();
  }, []);

  // Real-time schedules listener
  useEffect(() => {
    if (!studentData?.program || !studentData?.yearLevel || !studentData?.semester) {
      setLoading(false);
      return;
    }

    const programCode = studentData.program.split(" - ")[0].trim();
    const semesterParts = studentData.semester.split(" ");
    const semester = semesterParts.slice(0, 2).join(" ");
    
    const constraints = [
      where("program", "==", programCode),
      where("yearLevel", "==", studentData.yearLevel),
      where("semester", "==", semester)
    ];

    const q = query(collection(db, "schedules"), ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const schedulesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        enrolledStudents: doc.data().enrolledStudents || []
      })) as Schedule[];
      
      setSchedules(schedulesData);
      setLoading(false);
    }, (error) => {
      console.error("[SubjectEnrollment] Error fetching schedules:", error);
      toast.error("Failed to load schedules");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentData?.program, studentData?.yearLevel, studentData?.semester]);

  // Real-time enrolled schedules listener
  useEffect(() => {
    if (!studentData?.uid) return;

    const q = query(
      collection(db, "studentSubjects"),
      where("studentId", "==", studentData.uid), // Use Firebase UID
      where("status", "==", "enrolled")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const enrolledData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as EnrolledSchedule[];
      setEnrolledSchedules(enrolledData);
    });

    return () => unsubscribe();
  }, [studentData?.uid]);

  useEffect(() => {
    const studentUid = studentData?.uid;
    if (!studentUid || schedules.length === 0 || enrolledSchedules.length === 0) return;

    const schedulesById = new Map<string, Schedule>();
    schedules.forEach(schedule => schedulesById.set(schedule.id, schedule));
    const missingRosterIds = new Set(
      enrolledSchedules
        .filter(enrollment => {
          const schedule = schedulesById.get(enrollment.scheduleId);
          return schedule && !schedule.enrolledStudents?.includes(studentUid);
        })
        .map(enrollment => enrollment.scheduleId)
    );

    if (missingRosterIds.size === 0) return;

    const batch = writeBatch(db);
    missingRosterIds.forEach(scheduleId => {
      batch.update(doc(db, "schedules", scheduleId), {
        enrolledStudents: arrayUnion(studentUid)
      });
    });
    batch.commit().catch(error => {
      console.error("[SubjectEnrollment] Failed to synchronize enrolled schedule rosters:", error);
    });
  }, [studentData?.uid, schedules, enrolledSchedules]);

  // Calculate restrictions
  useEffect(() => {
    const calculateAllRestrictions = async () => {
      const newRestrictions = new Map<string, EnrollmentRestriction>();
      
      for (const schedule of schedules) {
        const restrictions = await checkEnrollmentRestrictions(schedule);
        newRestrictions.set(schedule.id, restrictions);
      }
      
      setScheduleRestrictions(newRestrictions);
    };

    if (schedules.length > 0) {
      calculateAllRestrictions();
    }
  }, [schedules, enrolledSchedules, pendingEnrollments, isEnrollmentOpen]);

  // Helper functions
  const isScheduleEnrolled = (scheduleId: string) => {
    return enrolledSchedules.some(es => es.scheduleId === scheduleId);
  };

  const isSchedulePending = (scheduleId: string) => {
    return pendingEnrollments.some(pe => pe.id === scheduleId);
  };

  const getScheduleCapacity = (schedule: Schedule) =>
    schedule.maxStudents ?? schedule.roomCapacity ?? 0;

  const getAvailableSlots = (schedule: Schedule) => {
    const enrolled = schedule.enrolledStudents?.length || 0;
    return getScheduleCapacity(schedule) - enrolled;
  };

  const isSectionFull = (schedule: Schedule) => {
    return getAvailableSlots(schedule) <= 0;
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const hasTimeConflict = (schedule1: { dayOfWeek: string; startTime: string; endTime: string }, schedule2: { dayOfWeek: string; startTime: string; endTime: string }) => {
    if (schedule1.dayOfWeek !== schedule2.dayOfWeek) return false;
    return (schedule1.startTime < schedule2.endTime && schedule1.endTime > schedule2.startTime);
  };

  const checkPrerequisites = async (subjectId: string): Promise<{ met: boolean; missing: string[] }> => {
    try {
      const subject = subjects.get(subjectId);
      if (!subject || !subject.prerequisites || subject.prerequisites.length === 0) {
        return { met: true, missing: [] };
      }

      const completedQuery = query(
        collection(db, "studentSubjects"),
        where("studentId", "==", studentData?.uid), // Use Firebase UID
        where("status", "==", "completed")
      );

      const snapshot = await getDocs(completedQuery);
      const completedCodes = snapshot.docs.map(doc => doc.data().subjectCode);

      const missingPrereqs = subject.prerequisites.filter(
        prereq => !completedCodes.includes(prereq)
      );

      return { met: missingPrereqs.length === 0, missing: missingPrereqs };
    } catch (error) {
      console.error("Error checking prerequisites:", error);
      return { met: true, missing: [] };
    }
  };

  const checkEnrollmentRestrictions = async (schedule: Schedule): Promise<EnrollmentRestriction> => {
    const reasons: string[] = [];
    const warnings: string[] = [];

    if (isScheduleEnrolled(schedule.id)) {
      reasons.push("Already enrolled");
    }
    
    if (isSchedulePending(schedule.id)) {
      reasons.push("Already selected");
    }

    if (isSectionFull(schedule)) {
      reasons.push("Section is full");
    }

    const alreadyEnrolledInSubject = enrolledSchedules.some(
      es => es.subjectCode === schedule.subjectCode
    );
    const alreadyPendingInSubject = pendingEnrollments.some(
      pe => pe.subjectCode === schedule.subjectCode
    );
    
    if (alreadyEnrolledInSubject) {
      reasons.push(`Already enrolled in ${schedule.subjectCode}`);
    } else if (alreadyPendingInSubject) {
      reasons.push(`Already selected ${schedule.subjectCode}`);
    }

    const prereqCheck = await checkPrerequisites(schedule.subjectId);
    if (!prereqCheck.met) {
      reasons.push(`Prerequisites: ${prereqCheck.missing.join(", ")}`);
    }

    const enrolledConflicts = enrolledSchedules.filter(es => 
      hasTimeConflict(
        { dayOfWeek: schedule.dayOfWeek, startTime: schedule.startTime, endTime: schedule.endTime },
        { dayOfWeek: es.dayOfWeek, startTime: es.startTime, endTime: es.endTime }
      )
    );
    
    const pendingConflicts = pendingEnrollments.filter(pe => 
      hasTimeConflict(
        { dayOfWeek: schedule.dayOfWeek, startTime: schedule.startTime, endTime: schedule.endTime },
        { dayOfWeek: pe.dayOfWeek, startTime: pe.startTime, endTime: pe.endTime }
      )
    );
    
    if (enrolledConflicts.length > 0 || pendingConflicts.length > 0) {
      reasons.push("Schedule conflict detected");
    }

    const enrolledUnits = enrolledSchedules.reduce((sum, s) => sum + s.units, 0);
    const pendingUnits = pendingEnrollments.reduce((sum, s) => {
      const subject = subjects.get(s.subjectId);
      return sum + (subject?.units || 3);
    }, 0);
    const currentUnits = enrolledUnits + pendingUnits;
    
    const subject = subjects.get(schedule.subjectId);
    const scheduleUnits = subject?.units || 3;
    
    if (currentUnits + scheduleUnits > MAX_UNITS) {
      reasons.push(`Exceeds max units (${currentUnits + scheduleUnits}/${MAX_UNITS})`);
    }

    if (!isEnrollmentOpen) {
      reasons.push("Enrollment period closed");
    }

    return {
      canEnroll: reasons.length === 0,
      reasons,
      warnings
    };
  };

  const handleEnroll = async (schedule: Schedule) => {
    if (!studentData) {
      toast.error("Student data not found");
      return;
    }

    try {
      const restrictions = await checkEnrollmentRestrictions(schedule);

      if (!restrictions.canEnroll) {
        toast.error(
          <div className="space-y-1">
            <div>Cannot add this subject</div>
            {restrictions.reasons.map((reason, idx) => (
              <div key={idx} className="text-xs">• {reason}</div>
            ))}
          </div>
        );
        return;
      }

      setPendingEnrollments(prev => [...prev, schedule]);

      toast.success(`${schedule.subjectCode} added!`);
    } catch (error: any) {
      console.error("Error adding to pending enrollments:", error);
      toast.error(`Failed to add: ${error.message}`);
    }
  };

  const handleRemovePending = (scheduleId: string) => {
    const removedSchedule = pendingEnrollments.find(s => s.id === scheduleId);
    setPendingEnrollments(prev => prev.filter(s => s.id !== scheduleId));
    
    if (removedSchedule) {
      toast.info(`${removedSchedule.subjectCode} removed`);
    }
  };

  const handleSaveEnrollments = async () => {
    if (!studentData) {
      toast.error("Student data not found");
      return;
    }

    if (pendingEnrollments.length === 0) {
      toast.error("Please select at least one subject");
      return;
    }

    const subjectsList = pendingEnrollments.map(s => `• ${s.subjectCode} - ${s.subjectName}`).join('\n');
    const confirmMessage = enrolledSchedules.length > 0 
      ? `⚠️ IMPORTANT: You are about to finalize your enrollment\n\n` +
        `This will REPLACE your ${enrolledSchedules.length} current subject(s) with these ${pendingEnrollments.length} new subject(s):\n\n` +
        `${subjectsList}\n\n` +
        `Total Units: ${totalPendingUnits}\n\n` +
        `Are you sure? This cannot be undone.`
      : `You are about to enroll in ${pendingEnrollments.length} subject(s):\n\n` +
        `${subjectsList}\n\n` +
        `Total Units: ${totalPendingUnits}\n\n` +
        `Confirm enrollment?`;
    
    const confirmed = window.confirm(confirmMessage);
    
    if (!confirmed) return;

    setProcessing(true);

    try {
      // Remove current enrollments
      const enrolledQuery = query(
        collection(db, "studentSubjects"),
        where("studentId", "==", studentData.uid), // Use Firebase UID
        where("status", "==", "enrolled")
      );
      const enrolledSnapshot = await getDocs(enrolledQuery);

      const batch = writeBatch(db);
      const existingScheduleIds = new Set<string>();
      const pendingScheduleIds = new Set(pendingEnrollments.map((schedule) => schedule.id));

      enrolledSnapshot.docs.forEach((docSnapshot) => {
        const scheduleId = docSnapshot.data().scheduleId;
        if (scheduleId) existingScheduleIds.add(scheduleId);
        batch.delete(docSnapshot.ref);
      });

      const currentYear = new Date().getFullYear();
      const schoolYear = `${currentYear}-${currentYear + 1}`;

      pendingEnrollments.forEach((schedule) => {
        const subject = subjects.get(schedule.subjectId);
        const units = subject?.units || 3;

        const enrollmentRef = doc(collection(db, "studentSubjects"));
        batch.set(enrollmentRef, {
          studentId: studentData.uid, // Use Firebase UID, not custom studentId
          studentName: studentData.name || "Unknown Student",
          studentEmail: studentData.email || "",
          scheduleId: schedule.id,
          subjectId: schedule.subjectId,
          subjectCode: schedule.subjectCode,
          subjectName: schedule.subjectName,
          units: units,
          yearLevel: schedule.yearLevel,
          semester: schedule.semester,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          room: schedule.room,
          teacherName: schedule.teacherName,
          schoolYear: schoolYear,
          status: "enrolled",
          enrolledAt: serverTimestamp(),
        });
      });

      existingScheduleIds.forEach((scheduleId) => {
        if (!pendingScheduleIds.has(scheduleId)) {
          batch.update(doc(db, "schedules", scheduleId), {
            enrolledStudents: arrayRemove(studentData.uid)
          });
        }
      });

      pendingScheduleIds.forEach((scheduleId) => {
        batch.update(doc(db, "schedules", scheduleId), {
          enrolledStudents: arrayUnion(studentData.uid)
        });
      });

      await batch.commit();

      setPendingEnrollments([]);

      toast.success(`Enrollment confirmed! ${pendingEnrollments.length} subject${pendingEnrollments.length !== 1 ? 's' : ''} enrolled.`);

      setShowCart(false);
    } catch (error: any) {
      console.error("Error saving enrollments:", error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = async (enrolledSchedule: EnrolledSchedule) => {
    if (!confirm(`Drop ${enrolledSchedule.subjectCode}?`)) {
      return;
    }

    setProcessing(true);

    try {
      if (!studentData?.uid) {
        throw new Error("Student data not found");
      }

      const batch = writeBatch(db);
      batch.delete(doc(db, "studentSubjects", enrolledSchedule.id));
      batch.update(doc(db, "schedules", enrolledSchedule.scheduleId), {
        enrolledStudents: arrayRemove(studentData.uid)
      });
      await batch.commit();

      toast.success(`Dropped ${enrolledSchedule.subjectCode}`);
    } catch (error: any) {
      console.error("Error dropping schedule:", error);
      toast.error(`Failed to drop: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const openSubjectDetails = (schedule: Schedule) => {
    setSelectedSubject(schedule);
    setDetailsOpen(true);
  };

  // Filter schedules
  const filteredSchedules = schedules.filter(schedule => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        schedule.subjectCode.toLowerCase().includes(searchLower) ||
        schedule.subjectName.toLowerCase().includes(searchLower) ||
        schedule.teacherName.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    if (filterDay !== "all" && schedule.dayOfWeek !== filterDay) {
      return false;
    }

    if (filterAvailability === "available" && (isSectionFull(schedule) || isScheduleEnrolled(schedule.id))) {
      return false;
    }
    if (filterAvailability === "enrolled" && !isScheduleEnrolled(schedule.id)) {
      return false;
    }

    return true;
  });

  // Sort by subject code
  const sortedSchedules = [...filteredSchedules].sort((a, b) => 
    a.subjectCode.localeCompare(b.subjectCode)
  );

  const totalEnrolledUnits = enrolledSchedules.reduce((sum, s) => sum + s.units, 0);
  const totalPendingUnits = pendingEnrollments.reduce((sum, s) => {
    const subject = subjects.get(s.subjectId);
    return sum + (subject?.units || 3);
  }, 0);
  const totalUnits = totalEnrolledUnits + totalPendingUnits;
  const remainingUnits = MAX_UNITS - totalUnits;

  if (loading) {
    return <LoadingState message="Loading enrollment data..." />;
  }

  if (!studentData) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Student data not found"
        description="Unable to load your student information"
      />
    );
  }

  if (!studentData.program || !studentData.yearLevel || !studentData.semester) {
    return (
      <div className="min-h-screen bg-background">
        <StudentPageHeader
          title="Subject Enrollment"
          description="Browse and enroll in available subjects for this semester"
          icon={BookOpen}
        />
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/50">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertTitle className="dark:text-orange-300">Incomplete Profile</AlertTitle>
            <AlertDescription className="text-orange-800 dark:text-orange-400">
              Please contact the registrar's office to update your profile
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentPageHeader
        title="Subject Enrollment"
        description="Browse and enroll in available subjects for this semester"
        icon={BookOpen}
      />

      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Enrollment Status Card */}
        <Card className="dark:bg-gray-900 dark:border-gray-800 border-2 border-primary/20 dark:border-primary/30">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Current Enrolled */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
                  <span className="text-sm text-green-700 dark:text-green-400">Current Enrolled</span>
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-500">{enrolledSchedules.length}</div>
                <div className="text-xs text-green-600/70 dark:text-green-500/70 mt-1">{totalEnrolledUnits} units</div>
              </div>

              {/* Pending */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                  <span className="text-sm text-blue-700 dark:text-blue-400">Pending</span>
                </div>
                <motion.div 
                  key={pendingEnrollments.length}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-bold text-blue-600 dark:text-blue-500"
                >
                  {pendingEnrollments.length}
                </motion.div>
                <div className="text-xs text-blue-600/70 dark:text-blue-500/70 mt-1">{totalPendingUnits} units</div>
              </div>

              {/* Total Units */}
              <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 rounded-xl border border-primary/20 dark:border-primary/30">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <span className="text-sm text-primary/90">Total Units</span>
                </div>
                <div className="text-3xl font-bold text-primary">{totalUnits}</div>
                <div className="text-xs text-primary/70 mt-1">of {MAX_UNITS} max</div>
              </div>

              {/* Remaining */}
              <div className={`p-4 bg-gradient-to-br ${remainingUnits <= 3 ? 'from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20' : 'from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20'} rounded-xl border ${remainingUnits <= 3 ? 'border-red-200 dark:border-red-800' : 'border-orange-200 dark:border-orange-800'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className={`h-5 w-5 ${remainingUnits <= 3 ? 'text-red-600 dark:text-red-500' : 'text-orange-600 dark:text-orange-500'}`} />
                  <span className={`text-sm ${remainingUnits <= 3 ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'}`}>Available</span>
                </div>
                <div className={`text-3xl font-bold ${remainingUnits <= 3 ? 'text-red-600 dark:text-red-500' : 'text-orange-600 dark:text-orange-500'}`}>
                  {Math.max(0, remainingUnits)}
                </div>
                <div className={`text-xs ${remainingUnits <= 3 ? 'text-red-600/70 dark:text-red-500/70' : 'text-orange-600/70 dark:text-orange-500/70'} mt-1`}>units left</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground dark:text-gray-400">Unit Load Progress</span>
                <span className="text-sm font-semibold dark:text-gray-200">
                  {totalUnits}/{MAX_UNITS} units
                </span>
              </div>
              <div className="relative w-full bg-muted/30 dark:bg-gray-800 rounded-full h-3 overflow-hidden border dark:border-gray-700">
                <div 
                  className="h-full transition-all duration-500 bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 absolute left-0"
                  style={{ width: `${Math.min((totalEnrolledUnits / MAX_UNITS) * 100, 100)}%` }}
                />
                {totalPendingUnits > 0 && (
                  <div 
                    className="h-full transition-all duration-500 bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600 absolute"
                    style={{ 
                      left: `${Math.min((totalEnrolledUnits / MAX_UNITS) * 100, 100)}%`,
                      width: `${Math.min((totalPendingUnits / MAX_UNITS) * 100, 100 - (totalEnrolledUnits / MAX_UNITS) * 100)}%` 
                    }}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrollment Status Alert */}
        {!isEnrollmentOpen && enrollmentPeriod && (
          <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="dark:text-red-300">Enrollment Closed</AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-400 text-sm">
              Enrollment ended on {formatDate(enrollmentPeriod.endDate)}
            </AlertDescription>
          </Alert>
        )}

        {isEnrollmentOpen && enrollmentPeriod && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/50">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="dark:text-green-300">Enrollment Open</AlertTitle>
            <AlertDescription className="text-green-800 dark:text-green-400 text-sm">
              Enroll until {formatDate(enrollmentPeriod.endDate)}
            </AlertDescription>
          </Alert>
        )}

        {/* First-time user help */}
        {pendingEnrollments.length === 0 && enrolledSchedules.length === 0 && (
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="dark:text-blue-300">How to Enroll</AlertTitle>
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-400">
              Browse subjects below → Click "Add" → Review your selections → Confirm enrollment
            </AlertDescription>
          </Alert>
        )}

        {/* Search & Filters */}
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-4">
            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-gray-400" />
              <Input
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Collapsible Filters */}
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700 dark:text-gray-200">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {showFilters ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-3">
                <Select value={filterDay} onValueChange={setFilterDay}>
                  <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
                    <SelectValue placeholder="All days" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectItem value="all">All Days</SelectItem>
                    {DAYS_ORDER.map(day => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterAvailability} onValueChange={setFilterAvailability}>
                  <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
                    <SelectValue placeholder="All subjects" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectItem value="all">All Subjects</SelectItem>
                    <SelectItem value="available">Available Only</SelectItem>
                    <SelectItem value="enrolled">My Enrolled</SelectItem>
                  </SelectContent>
                </Select>

                {(filterDay !== "all" || filterAvailability !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterDay("all");
                      setFilterAvailability("all");
                    }}
                    className="w-full dark:hover:bg-gray-700"
                  >
                    Clear Filters
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Available Subjects Table */}
        {sortedSchedules.length === 0 ? (
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="py-12">
              <EmptyState
                icon={BookOpen}
                title="No subjects found"
                description={
                  searchTerm || filterDay !== "all" || filterAvailability !== "all"
                    ? "Try adjusting your filters" 
                    : "No schedules available for your program"
                }
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="dark:text-gray-100">Available Subjects</CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    {sortedSchedules.length} subject{sortedSchedules.length !== 1 ? 's' : ''} available for enrollment
                  </CardDescription>
                </div>
                {pendingEnrollments.length > 0 && (
                  <Button onClick={() => setShowCart(true)} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600">
                    <FileCheck className="mr-2 h-4 w-4" />
                    Review ({pendingEnrollments.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-gray-800/50 hover:bg-muted/50 dark:hover:bg-gray-800/50">
                      <TableHead className="w-[200px] dark:text-gray-300">Subject</TableHead>
                      <TableHead className="text-center w-[80px] dark:text-gray-300">Units</TableHead>
                      <TableHead className="w-[140px] dark:text-gray-300">Schedule</TableHead>
                      <TableHead className="w-[100px] dark:text-gray-300">Room</TableHead>
                      <TableHead className="w-[180px] dark:text-gray-300">Teacher</TableHead>
                      <TableHead className="text-center w-[120px] dark:text-gray-300">Slots</TableHead>
                      <TableHead className="text-center w-[120px] dark:text-gray-300">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSchedules.map((schedule) => {
                      const restrictions = scheduleRestrictions.get(schedule.id);
                      const canEnroll = restrictions?.canEnroll ?? false;
                      const enrolled = isScheduleEnrolled(schedule.id);
                      const pending = isSchedulePending(schedule.id);
                      const availableSlots = getAvailableSlots(schedule);
                      const full = isSectionFull(schedule);

                      return (
                        <TableRow key={schedule.id} className={`hover:bg-muted/30 dark:hover:bg-gray-800/30 ${enrolled ? 'bg-green-50/50 dark:bg-green-950/20' : pending ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                          {/* Subject */}
                          <TableCell className="align-top">
                            <div className="space-y-1.5">
                              <Badge variant="secondary" className="font-mono text-xs dark:bg-gray-800 dark:text-gray-300">
                                {schedule.subjectCode}
                              </Badge>
                              <div className="font-medium text-sm leading-tight dark:text-gray-200">
                                {schedule.subjectName}
                              </div>
                            </div>
                          </TableCell>

                          {/* Units */}
                          <TableCell className="text-center align-top">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
                              <span className="font-bold text-blue-600 dark:text-blue-400">{subjects.get(schedule.subjectId)?.units || 3}</span>
                            </div>
                          </TableCell>

                          {/* Schedule */}
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                                <span className="font-medium dark:text-gray-200">{schedule.dayOfWeek}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground dark:text-gray-400">
                                <Clock className="h-3 w-3" />
                                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                              </div>
                            </div>
                          </TableCell>

                          {/* Room */}
                          <TableCell className="align-top">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                              <span className="font-medium dark:text-gray-200">{schedule.room}</span>
                            </div>
                          </TableCell>

                          {/* Teacher */}
                          <TableCell className="align-top">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                              <span className="font-medium dark:text-gray-200">{schedule.teacherName}</span>
                            </div>
                          </TableCell>

                          {/* Slots */}
                          <TableCell className="text-center align-top">
                            <Badge 
                              variant={full ? "destructive" : availableSlots <= 5 ? "secondary" : "outline"}
                              className={
                                full ? "dark:bg-red-900 dark:text-red-200" :
                                availableSlots <= 5 ? "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400" :
                                "dark:border-gray-600 dark:text-gray-300"
                              }
                            >
                              {availableSlots}/{getScheduleCapacity(schedule)}
                            </Badge>
                          </TableCell>

                          {/* Action */}
                          <TableCell className="text-center align-top">
                            {enrolled ? (
                              <Badge className="bg-green-600 dark:bg-green-700 gap-1">
                                <Check className="h-3 w-3" />
                                Enrolled
                              </Badge>
                            ) : pending ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemovePending(schedule.id)}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            ) : canEnroll ? (
                              <Button
                                size="sm"
                                onClick={() => handleEnroll(schedule)}
                                className="bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/80"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled
                                      className="dark:text-gray-500"
                                    >
                                      <Lock className="h-4 w-4 mr-1" />
                                      Locked
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs dark:bg-gray-800 dark:border-gray-700">
                                    <div className="space-y-1">
                                      {restrictions?.reasons.map((reason, idx) => (
                                        <div key={idx} className="text-xs dark:text-gray-300">• {reason}</div>
                                      ))}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cart Sheet */}
        <Sheet open={showCart} onOpenChange={setShowCart}>
          <SheetContent className="w-full sm:max-w-2xl dark:bg-gray-900 dark:border-gray-800">
            <SheetHeader>
              <SheetTitle className="dark:text-gray-100">Review Enrollment</SheetTitle>
              <SheetDescription className="dark:text-gray-400">
                Review your selections before confirming enrollment
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground dark:text-gray-400 mb-1">Selected Subjects</div>
                    <div className="text-2xl font-bold dark:text-gray-100">{pendingEnrollments.length}</div>
                  </CardContent>
                </Card>
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground dark:text-gray-400 mb-1">Total Units</div>
                    <div className="text-2xl font-bold dark:text-gray-100">{totalPendingUnits}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Pending List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {pendingEnrollments.map((schedule) => {
                  const subject = subjects.get(schedule.subjectId);
                  return (
                    <Card key={schedule.id} className="dark:bg-gray-800 dark:border-gray-700">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Badge variant="secondary" className="mb-2 dark:bg-gray-700 dark:text-gray-300">{schedule.subjectCode}</Badge>
                            <div className="font-medium dark:text-gray-200">{schedule.subjectName}</div>
                            <div className="text-sm text-muted-foreground dark:text-gray-400 mt-1">
                              {schedule.dayOfWeek} • {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                            </div>
                            <div className="text-sm text-muted-foreground dark:text-gray-400">
                              {schedule.room} • {schedule.teacherName}
                            </div>
                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                              {subject?.units || 3} units
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePending(schedule.id)}
                            className="dark:hover:bg-gray-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setShowCart(false)}
                  className="flex-1 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEnrollments}
                  disabled={processing || pendingEnrollments.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Confirm Enrollment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
