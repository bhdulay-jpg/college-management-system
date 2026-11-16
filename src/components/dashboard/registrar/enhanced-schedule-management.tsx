"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Checkbox } from "../../ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { 
  Search, Plus, Edit, Trash2, Calendar, Clock, User, MapPin, BookOpen, Users, 
  AlertCircle, CheckCircle2, AlertTriangle, Grid3x3, List, UserSquare, 
  Building2, TrendingUp, Filter, Eye, RefreshCw, Info,
  Copy, Download, FileText, X, MoreVertical, FileDown, Printer, ChevronDown
} from "lucide-react";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where, orderBy, writeBatch } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { toast } from "sonner@2.0.3";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { Alert, AlertDescription } from "../../ui/alert";
import { PageHeader } from "../shared/page-header";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ui/tooltip";
import { cn } from "../../ui/utils";
import { 
  daysToAbbreviation, 
  abbreviationToDays, 
  getDisplayDays, 
  hasScheduleConflict, 
  getDayBadgeColor,
  COMMON_DAY_PATTERNS,
  formatTime as utilFormatTime,
  DAYS_OF_WEEK as DAYS_ARRAY
} from "../../../lib/schedule-utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../../ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { usePrograms } from "../../../hooks/use-programs";
import { extractProgramCode } from "../../../lib/program-utils";

interface Subject {
  id: string;
  subjectCode: string;
  subjectName: string;
  program: string;
  yearLevel: string;
  semester: string;
  isLaboratory?: boolean;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  uid: string;
  status?: string;
}

interface Room {
  id: string;
  roomNumber: string;
  roomName: string;
  capacity: number;
  building: string;
  facilities: string;
}

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
  section: string;
  program: string;
  yearLevel: string;
  semester: string;
  isLaboratory?: boolean;
  enrolledStudents: string[];
  maxStudents: number;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

interface ConflictIndicator {
  type: 'none' | 'soft' | 'hard';
  message: string;
  icon: any;
  color: string;
}

interface ConflictDetail {
  type: 'room' | 'teacher';
  severity: 'hard' | 'soft';
  schedule1: Schedule;
  schedule2: Schedule;
  message: string;
}

const getScheduleCapacity = (schedule: Schedule) => {
  const capacity = schedule.maxStudents ?? schedule.roomCapacity;
  return typeof capacity === "number" && Number.isFinite(capacity) ? capacity : 0;
};

const DAYS_OF_WEEK = DAYS_ARRAY;

const TIME_SLOTS = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", 
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30", "21:00"
];

export function EnhancedScheduleManagement() {
  const { programs, loading: programsLoading, error: programsError } = usePrograms();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View and filter state
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "teacher" | "room" | "conflicts">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDay, setFilterDay] = useState("all");
  const [filterProgram, setFilterProgram] = useState("all");
  const [filterYearLevel, setFilterYearLevel] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [filterRoom, setFilterRoom] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Dialog and form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Multi-step form state
  const [selectedProgram, setSelectedProgram] = useState("");
  const [subjectYearFilter, setSubjectYearFilter] = useState("all");
  const [subjectSemesterFilter, setSubjectSemesterFilter] = useState("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("TBA");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [section, setSection] = useState("");
  
  // Conflict detection state
  const [conflicts, setConflicts] = useState<ConflictIndicator>({ type: 'none', message: '', icon: CheckCircle2, color: 'text-success' });
  
  // Autocomplete state
  const [teacherSearchOpen, setTeacherSearchOpen] = useState(false);
  const [roomSearchOpen, setRoomSearchOpen] = useState(false);
  
  // Bulk operations state
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  const [bulkEditMode, setBulkEditMode] = useState(false);

  // Review and duplicate detection state
  const [duplicateSchedules, setDuplicateSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    if (programsError) {
      toast.error("Failed to load programs. Check your Firestore access and try again.");
    }
  }, [programsError]);

  // Load data
  useEffect(() => {
    let unsubscribeData: Array<() => void> = [];
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      unsubscribeData.forEach((unsubscribe) => unsubscribe());
      unsubscribeData = [];

      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Load subjects
      const subjectsQuery = query(collection(db, "subjects"));
      const unsubscribeSubjects = onSnapshot(subjectsQuery, (snapshot) => {
        const subjectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Subject[];
        setSubjects(subjectsData);
      }, (error) => {
        console.error("Error fetching subjects:", error);
        toast.error("Failed to load curriculum subjects.");
      });

      // Load teachers
      const teachersQuery = query(
        collection(db, "users"),
        where("role", "in", ["Teacher", "teacher", "TEACHER"])
      );
      const unsubscribeTeachers = onSnapshot(teachersQuery, (snapshot) => {
        const teachersData = snapshot.docs
          .map((teacherDoc) => {
            const data = teacherDoc.data();
            return {
              id: teacherDoc.id,
              uid: typeof data.uid === "string" ? data.uid : teacherDoc.id,
              name: typeof data.name === "string" && data.name.trim()
                ? data.name.trim()
                : (typeof data.email === "string" ? data.email : "Unnamed teacher"),
              email: typeof data.email === "string" ? data.email : "",
              status: typeof data.status === "string" ? data.status.trim() : undefined,
            };
          })
          .filter((teacher) => !teacher.status || teacher.status.toLowerCase() === "active")
          .sort((a, b) => a.name.localeCompare(b.name));
        setTeachers(teachersData);
      }, (error) => {
        console.error("Error fetching teachers:", error);
        toast.error(`Failed to load teachers${error.code ? ` (${error.code})` : ""}. Check the users collection permissions.`);
      });

      // Load rooms
      const roomsQuery = query(
        collection(db, "rooms"),
        orderBy("building", "asc"),
        orderBy("roomNumber", "asc")
      );
      const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
        const roomsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Room[];
        setRooms(roomsData);
      }, (error) => {
        console.error("Error fetching rooms:", error);
        toast.error("Failed to load rooms. Check that the rooms Firestore index is enabled.");
      });

      // Load schedules
      const schedulesQuery = query(
        collection(db, "schedules"),
        orderBy("dayOfWeek", "asc"),
        orderBy("startTime", "asc")
      );
      const unsubscribeSchedules = onSnapshot(schedulesQuery, (snapshot) => {
        const schedulesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Schedule[];
        setSchedules(schedulesData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching schedules:", error);
        toast.error("Failed to load schedules.");
        setLoading(false);
      });

      unsubscribeData = [unsubscribeSubjects, unsubscribeTeachers, unsubscribeRooms, unsubscribeSchedules];
    });

    return () => {
      unsubscribeAuth();
      unsubscribeData.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  // Check conflicts in real-time
  useEffect(() => {
    if (selectedRoomId && selectedDays.length > 0 && startTime && endTime) {
      checkConflicts();
    } else {
      setConflicts({ type: 'none', message: '', icon: CheckCircle2, color: 'text-success' });
    }
  }, [selectedRoomId, selectedDays, startTime, endTime, selectedTeacherId, schedules]);

  const checkConflicts = () => {
    let hardConflicts: string[] = [];
    let softConflicts: string[] = [];

    const newSchedule = {
      dayOfWeek: daysToAbbreviation(selectedDays),
      startTime,
      endTime
    };

    // Check all existing schedules for conflicts
    schedules.forEach(s => {
      if (editingSchedule && s.id === editingSchedule.id) return;

      if (hasScheduleConflict(newSchedule, s)) {
        // Check room conflicts (HARD)
        if (s.roomId === selectedRoomId) {
          hardConflicts.push(`Room conflict with ${s.subjectCode} (${getDisplayDays(s.dayOfWeek)})`);
        }

        // Teacher overlaps are warnings so intentional exceptions can be confirmed.
        if (selectedTeacherId !== "TBA" && s.teacherId === selectedTeacherId) {
          softConflicts.push(`Teacher already assigned to an overlapping class (${s.subjectCode} on ${getDisplayDays(s.dayOfWeek)})`);
        }
      }
    });

    if (hardConflicts.length > 0) {
      setConflicts({
        type: 'hard',
        message: hardConflicts[0],
        icon: AlertCircle,
        color: 'text-destructive'
      });
    } else if (softConflicts.length > 0) {
      setConflicts({
        type: 'soft',
        message: softConflicts[0],
        icon: AlertTriangle,
        color: 'text-warning'
      });
    } else {
      setConflicts({
        type: 'none',
        message: 'No conflicts detected',
        icon: CheckCircle2,
        color: 'text-success'
      });
    }
  };

  // Detect all conflicts in the system
  const allConflicts = useMemo(() => {
    const conflictList: ConflictDetail[] = [];
    
    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const s1 = schedules[i];
        const s2 = schedules[j];
        
        if (hasScheduleConflict(s1, s2)) {
          // Room conflict (HARD)
          if (s1.roomId === s2.roomId) {
            conflictList.push({
              type: 'room',
              severity: 'hard',
              schedule1: s1,
              schedule2: s2,
              message: `Room ${s1.room.split(' - ')[0]} double-booked: ${s1.subjectCode} and ${s2.subjectCode}`
            });
          }
          
          // Teacher conflict (SOFT)
          if (s1.teacherId !== "TBA" && s1.teacherId === s2.teacherId) {
            conflictList.push({
              type: 'teacher',
              severity: 'soft',
              schedule1: s1,
              schedule2: s2,
              message: `${s1.teacherName} has overlapping classes: ${s1.subjectCode} and ${s2.subjectCode}`
            });
          }
        }
      }
    }
    
    return conflictList;
  }, [schedules]);

  // Get unique sections
  const sections = useMemo(() => {
    const uniqueSections = [...new Set(schedules.map(s => s.section).filter(Boolean))];
    return uniqueSections.sort();
  }, [schedules]);

  const subjectsForSelectedProgram = useMemo(
    () => subjects.filter((subject) =>
      extractProgramCode(subject.program).trim().toUpperCase() === selectedProgram.trim().toUpperCase()
    ),
    [subjects, selectedProgram]
  );

  const availableSubjectYears = useMemo(
    () => [...new Set(subjectsForSelectedProgram.map((subject) => subject.yearLevel).filter(Boolean))].sort(),
    [subjectsForSelectedProgram]
  );

  const availableSubjectSemesters = useMemo(
    () => [...new Set(subjectsForSelectedProgram.map((subject) => subject.semester).filter(Boolean))].sort(),
    [subjectsForSelectedProgram]
  );

  const filteredSubjectsForForm = useMemo(
    () => subjectsForSelectedProgram.filter((subject) =>
      (subjectYearFilter === "all" || subject.yearLevel === subjectYearFilter) &&
      (subjectSemesterFilter === "all" || subject.semester === subjectSemesterFilter)
    ),
    [subjectsForSelectedProgram, subjectYearFilter, subjectSemesterFilter]
  );

  const subjectsByYearSemester = useMemo(() => {
    const grouped: { [key: string]: Subject[] } = {};
    filteredSubjectsForForm.forEach(subject => {
      const group = `${subject.yearLevel || "Year unspecified"} - ${subject.semester || "Semester unspecified"}`;
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(subject);
    });
    return grouped;
  }, [filteredSubjectsForForm]);

  // Keep busy teachers visible so the registrar can see why a choice conflicts.
  const busyTeacherIds = useMemo(() => {
    if (selectedDays.length === 0 || !startTime || !endTime) return new Set<string>();

    const busyTeacherIds = new Set<string>();

    schedules.forEach(s => {
      // Skip if editing this schedule
      if (editingSchedule && s.id === editingSchedule.id) return;
      
      // Check if schedule days overlap with selected days
      const scheduleDays = abbreviationToDays(s.dayOfWeek);
      const hasOverlap = selectedDays.some(day => scheduleDays.includes(day));
      
      if (hasOverlap && startTime < s.endTime && endTime > s.startTime) {
        busyTeacherIds.add(s.teacherId);
      }
    });

    return busyTeacherIds;
  }, [selectedDays, startTime, endTime, schedules, editingSchedule]);

  const availableTeachers = useMemo(
    () => teachers.filter((teacher) => !busyTeacherIds.has(teacher.id)),
    [teachers, busyTeacherIds]
  );

  // Get available rooms (not conflicting)
  const availableRooms = useMemo(() => {
    if (selectedDays.length === 0 || !startTime || !endTime) return rooms;
    
    const busyRoomIds = new Set<string>();
    
    schedules.forEach(s => {
      // Skip if editing this schedule
      if (editingSchedule && s.id === editingSchedule.id) return;
      
      // Check if schedule days overlap with selected days
      const scheduleDays = abbreviationToDays(s.dayOfWeek);
      const hasOverlap = selectedDays.some(day => scheduleDays.includes(day));
      
      if (hasOverlap && startTime < s.endTime && endTime > s.startTime) {
        busyRoomIds.add(s.roomId);
      }
    });
    
    return rooms.filter(r => !busyRoomIds.has(r.id));
  }, [rooms, selectedDays, startTime, endTime, schedules, editingSchedule]);

  // Dashboard statistics
  const stats = useMemo(() => {
    const totalSchedules = schedules.length;
    const uniqueSubjects = new Set(schedules.map(s => s.subjectId)).size;
    const activeTeachers = new Set(schedules.map(s => s.teacherId).filter(id => id !== "TBA")).size;
    const usedRooms = new Set(schedules.map(s => s.roomId)).size;

    // Teacher load analysis
    const teacherLoad = teachers.map(teacher => {
      const teacherSchedules = schedules.filter(s => s.teacherId === teacher.id);
      return {
        teacher,
        scheduleCount: teacherSchedules.length,
        isOverloaded: teacherSchedules.length > 15 // More than 15 classes per week
      };
    }).filter(t => t.scheduleCount > 0).sort((a, b) => b.scheduleCount - a.scheduleCount);

    // Room utilization
    const roomUtilization = rooms.map(room => {
      const roomSchedules = schedules.filter(s => s.roomId === room.id);
      const totalSlots = DAYS_OF_WEEK.length * 3; // 3 time blocks per day
      const utilizationRate = (roomSchedules.length / totalSlots) * 100;
      return {
        room,
        scheduleCount: roomSchedules.length,
        utilizationRate,
        isHighDemand: utilizationRate > 60
      };
    }).sort((a, b) => b.utilizationRate - a.utilizationRate);

    const overloadedTeachers = teacherLoad.filter(t => t.isOverloaded).length;
    const highDemandRooms = roomUtilization.filter(r => r.isHighDemand).length;
    const hardConflicts = allConflicts.filter(c => c.severity === 'hard').length;

    return {
      totalSchedules,
      uniqueSubjects,
      activeTeachers,
      usedRooms,
      overloadedTeachers,
      highDemandRooms,
      hardConflicts,
      teacherLoad,
      roomUtilization
    };
  }, [schedules, teachers, rooms, allConflicts]);

  const resetForm = () => {
    setSelectedProgram("");
    setSubjectYearFilter("all");
    setSubjectSemesterFilter("all");
    setSelectedSubjectId("");
    setSelectedTeacherId("TBA");
    setSelectedDays([]);
    setStartTime("");
    setEndTime("");
    setSelectedRoomId("");
    setSection("");
    setEditingSchedule(null);
    setDuplicateSchedules([]);
    setConflicts({ type: 'none', message: '', icon: CheckCircle2, color: 'text-success' });
  };

  const resetScheduleDetailsForSubjectChange = () => {
    setSelectedSubjectId("");
    setSelectedTeacherId("TBA");
    setSelectedDays([]);
    setStartTime("");
    setEndTime("");
    setSelectedRoomId("");
    setSection("");
    setDuplicateSchedules([]);
    setConflicts({ type: 'none', message: '', icon: CheckCircle2, color: 'text-success' });
  };

  // Check for duplicate schedules
  const checkDuplicateSchedules = () => {
    if (!selectedSubjectId || selectedDays.length === 0 || !startTime || !endTime) {
      setDuplicateSchedules([]);
      return;
    }

    const duplicates = schedules.filter(s => {
      // Skip if editing this schedule
      if (editingSchedule && s.id === editingSchedule.id) return false;
      
      // Check if same subject
      if (s.subjectId !== selectedSubjectId) return false;
      
      // Check if overlapping days
      const scheduleDays = abbreviationToDays(s.dayOfWeek);
      const hasOverlap = selectedDays.some(day => scheduleDays.includes(day));
      
      // Check if overlapping time
      const timeOverlap = startTime < s.endTime && endTime > s.startTime;
      
      return hasOverlap && timeOverlap;
    });

    setDuplicateSchedules(duplicates);
  };

  // Check duplicates when relevant fields change
  useEffect(() => {
    if (selectedSubjectId && selectedDays.length > 0 && startTime && endTime) {
      checkDuplicateSchedules();
    } else {
      setDuplicateSchedules([]);
    }
  }, [selectedSubjectId, selectedDays, startTime, endTime, schedules]);

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (schedule: Schedule) => {
    const subject = subjects.find((item) => item.id === schedule.subjectId);
    setEditingSchedule(schedule);
    setSelectedProgram(extractProgramCode(subject?.program || schedule.program).trim().toUpperCase());
    setSubjectYearFilter(subject?.yearLevel || schedule.yearLevel || "all");
    setSubjectSemesterFilter(subject?.semester || schedule.semester || "all");
    setSelectedSubjectId(schedule.subjectId);
    setSelectedTeacherId(schedule.teacherId);
    // Convert abbreviated days back to full names
    const days = abbreviationToDays(schedule.dayOfWeek);
    setSelectedDays(days.length > 0 ? days : [schedule.dayOfWeek]);
    setStartTime(schedule.startTime);
    setEndTime(schedule.endTime);
    setSelectedRoomId(schedule.roomId);
    setSection(schedule.section || "");
    setIsDialogOpen(true);
  };

  const handleDuplicate = async (schedule: Schedule) => {
    const subject = subjects.find((item) => item.id === schedule.subjectId);
    setEditingSchedule(null); // Ensure it's a new schedule
    setSelectedProgram(extractProgramCode(subject?.program || schedule.program).trim().toUpperCase());
    setSubjectYearFilter(subject?.yearLevel || schedule.yearLevel || "all");
    setSubjectSemesterFilter(subject?.semester || schedule.semester || "all");
    setSelectedSubjectId(schedule.subjectId);
    setSelectedTeacherId(schedule.teacherId);
    const days = abbreviationToDays(schedule.dayOfWeek);
    setSelectedDays(days.length > 0 ? days : [schedule.dayOfWeek]);
    setStartTime(schedule.startTime);
    setEndTime(schedule.endTime);
    setSelectedRoomId(schedule.roomId);
    setSection(schedule.section || "");
    setIsDialogOpen(true);
    toast.info("Schedule duplicated. Modify as needed and save.");
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedSubjectId || !selectedRoomId || selectedDays.length === 0 || !startTime || !endTime) {
      toast.error("Please complete all required fields");
      return;
    }

    if (startTime >= endTime) {
      toast.error("End time must be after start time");
      return;
    }

    // Block hard conflicts
    if (conflicts.type === 'hard') {
      toast.error("Cannot save: Hard conflict detected. Please resolve the room conflict first.");
      return;
    }

    // Warn on soft conflicts
    if (conflicts.type === 'soft') {
      const proceed = confirm("A teacher is already assigned to a class during this time. Continue anyway?");
      if (!proceed) return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("You must be logged in");
      return;
    }

    setProcessing(true);

    try {
      const subject = subjects.find(s => s.id === selectedSubjectId);
      const room = rooms.find(r => r.id === selectedRoomId);

      if (!subject || !room) {
        toast.error("Invalid subject or room selected");
        return;
      }
      const programCode = extractProgramCode(subject.program).trim().toUpperCase();

      // Get teacher info or use TBA
      let teacherInfo = {
        teacherId: "TBA",
        teacherName: "To Be Announced",
        teacherEmail: ""
      };

      if (selectedTeacherId !== "TBA") {
        const teacher = teachers.find(t => t.id === selectedTeacherId);
        if (teacher) {
          teacherInfo = {
            teacherId: teacher.id,
            teacherName: teacher.name,
            teacherEmail: teacher.email
          };
        }
      }

      // Convert selected days to abbreviated format
      const dayAbbreviation = daysToAbbreviation(selectedDays);

      if (editingSchedule) {
        // Update existing schedule
        const scheduleData = {
          subjectId: subject.id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          ...teacherInfo,
          dayOfWeek: dayAbbreviation,
          startTime,
          endTime,
          roomId: room.id,
          room: `${room.roomNumber} - ${room.roomName}`,
          roomCapacity: room.capacity,
          section: section || "",
          program: programCode,
          yearLevel: subject.yearLevel,
          semester: subject.semester,
          isLaboratory: subject.isLaboratory === true,
          maxStudents: room.capacity,
          updatedAt: serverTimestamp(),
        };
        
        await updateDoc(doc(db, "schedules", editingSchedule.id), scheduleData);
        toast.success("Schedule updated successfully.");
      } else {
        // Create a single schedule with multi-day format
        const scheduleData = {
          subjectId: subject.id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          ...teacherInfo,
          dayOfWeek: dayAbbreviation,
          startTime,
          endTime,
          roomId: room.id,
          room: `${room.roomNumber} - ${room.roomName}`,
          roomCapacity: room.capacity,
          section: section || "",
          program: programCode,
          yearLevel: subject.yearLevel,
          semester: subject.semester,
          isLaboratory: subject.isLaboratory === true,
          maxStudents: room.capacity,
          enrolledStudents: [],
          createdBy: currentUser.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await addDoc(collection(db, "schedules"), scheduleData);
        
        const dayDisplay = getDisplayDays(dayAbbreviation);
        toast.success(`Schedule created successfully for ${dayDisplay}.`);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      toast.error(`Failed to save schedule: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (schedule: Schedule) => {
    if (schedule.enrolledStudents && schedule.enrolledStudents.length > 0) {
      toast.error(`Cannot delete schedule with ${schedule.enrolledStudents.length} enrolled student(s)`);
      return;
    }

    if (!confirm(`Are you sure you want to delete this schedule for ${schedule.subjectCode}?`)) {
      return;
    }

    setProcessing(true);

    try {
      await deleteDoc(doc(db, "schedules", schedule.id));
      toast.success("Schedule deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting schedule:", error);
      toast.error(`Failed to delete schedule: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSchedules.length === 0) {
      toast.error("No schedules selected");
      return;
    }

    // Check if any have enrolled students
    const schedulesToDelete = schedules.filter(s => selectedSchedules.includes(s.id));
    const hasEnrolled = schedulesToDelete.some(s => s.enrolledStudents && s.enrolledStudents.length > 0);
    
    if (hasEnrolled) {
      toast.error("Cannot delete schedules with enrolled students");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedSchedules.length} schedule(s)?`)) {
      return;
    }

    setProcessing(true);

    try {
      const batch = writeBatch(db);
      selectedSchedules.forEach(id => {
        batch.delete(doc(db, "schedules", id));
      });
      await batch.commit();
      
      toast.success(`${selectedSchedules.length} schedule(s) deleted successfully.`);
      setSelectedSchedules([]);
      setBulkEditMode(false);
    } catch (error: any) {
      console.error("Error deleting schedules:", error);
      toast.error(`Failed to delete schedules: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Apply filters
  const filteredSchedules = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return schedules.filter(schedule => {
      const matchesSearch = 
        !normalizedSearch ||
        (schedule.subjectCode || "").toLowerCase().includes(normalizedSearch) ||
        (schedule.subjectName || "").toLowerCase().includes(normalizedSearch) ||
        (schedule.teacherName || "").toLowerCase().includes(normalizedSearch) ||
        (schedule.room || "").toLowerCase().includes(normalizedSearch) ||
        (schedule.section && schedule.section.toLowerCase().includes(normalizedSearch));
      
      // Check if filterDay is included in the schedule's days
      const scheduleDays = abbreviationToDays(schedule.dayOfWeek);
      const matchesDay = filterDay === "all" || scheduleDays.includes(filterDay) || schedule.dayOfWeek === filterDay;
      
      const matchesProgram = filterProgram === "all" ||
        extractProgramCode(schedule.program).trim().toUpperCase() === filterProgram.trim().toUpperCase();
      const matchesYearLevel = filterYearLevel === "all" || schedule.yearLevel === filterYearLevel;
      const matchesSemester = filterSemester === "all" || schedule.semester === filterSemester;
      const matchesTeacher = filterTeacher === "all" || schedule.teacherId === filterTeacher;
      const matchesRoom = filterRoom === "all" || schedule.roomId === filterRoom;
      const matchesSection = filterSection === "all" || schedule.section === filterSection;

      return matchesSearch && matchesDay && matchesProgram && matchesYearLevel &&
        matchesSemester && matchesTeacher && matchesRoom && matchesSection;
    });
  }, [schedules, searchTerm, filterDay, filterProgram, filterYearLevel, filterSemester, filterTeacher, filterRoom, filterSection]);

  const activeAdvancedFilterCount = [
    filterDay !== "all",
    filterSection !== "all",
    filterTeacher !== "all",
    filterRoom !== "all",
  ].filter(Boolean).length;
  const hasActiveFilters = Boolean(searchTerm.trim()) ||
    filterProgram !== "all" ||
    filterYearLevel !== "all" ||
    filterSemester !== "all" ||
    activeAdvancedFilterCount > 0;

  const resetScheduleFilters = () => {
    setSearchTerm("");
    setFilterDay("all");
    setFilterProgram("all");
    setFilterYearLevel("all");
    setFilterSemester("all");
    setFilterTeacher("all");
    setFilterRoom("all");
    setFilterSection("all");
    setShowAdvancedFilters(false);
  };

  useEffect(() => {
    const visibleScheduleIds = new Set(filteredSchedules.map((schedule) => schedule.id));
    setSelectedSchedules((selected) => selected.filter((id) => visibleScheduleIds.has(id)));
  }, [filteredSchedules]);

  const availableScheduleYears = useMemo(
    () => [...new Set(schedules.map((schedule) => schedule.yearLevel).filter(Boolean))].sort(),
    [schedules]
  );

  const availableScheduleSemesters = useMemo(
    () => [...new Set(schedules.map((schedule) => schedule.semester).filter(Boolean))].sort(),
    [schedules]
  );

  const filteredTeacherLoad = useMemo(
    () => teachers.map((teacher) => {
      const scheduleCount = filteredSchedules.filter((schedule) => schedule.teacherId === teacher.id).length;
      return { teacher, scheduleCount, isOverloaded: scheduleCount > 15 };
    }).filter((load) => load.scheduleCount > 0).sort((a, b) => b.scheduleCount - a.scheduleCount),
    [teachers, filteredSchedules]
  );

  const filteredRoomUtilization = useMemo(
    () => rooms.map((room) => {
      const scheduleCount = filteredSchedules.filter((schedule) => schedule.roomId === room.id).length;
      const utilizationRate = (scheduleCount / (DAYS_OF_WEEK.length * 3)) * 100;
      return { room, scheduleCount, utilizationRate, isHighDemand: utilizationRate > 60 };
    }).filter((utilization) => utilization.scheduleCount > 0)
      .sort((a, b) => b.utilizationRate - a.utilizationRate),
    [rooms, filteredSchedules]
  );

  const filteredConflicts = useMemo(() => {
    const visibleScheduleIds = new Set(filteredSchedules.map((schedule) => schedule.id));
    return allConflicts.filter((conflict) =>
      visibleScheduleIds.has(conflict.schedule1.id) && visibleScheduleIds.has(conflict.schedule2.id)
    );
  }, [allConflicts, filteredSchedules]);

  const formatTime = utilFormatTime;

  const getCapacityColor = (enrolled: number, max: number) => {
    if (max <= 0) return "text-muted-foreground";
    const percentage = (enrolled / max) * 100;
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 75) return "text-warning";
    return "text-success";
  };

  // Export functions
  const exportToCSV = (data: Schedule[], filename: string) => {
    const headers = ["Subject Code", "Subject Name", "Teacher", "Days", "Time", "Room", "Section", "Program", "Year", "Semester", "Enrolled", "Capacity"];
    const rows = data.map(s => [
      s.subjectCode,
      s.subjectName,
      s.teacherName,
      getDisplayDays(s.dayOfWeek),
      `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`,
      s.room,
      s.section || "",
      s.program,
      s.yearLevel,
      s.semester,
      (s.enrolledStudents || []).length.toString(),
      getScheduleCapacity(s).toString()
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportMasterList = () => {
    exportToCSV(schedules, `master-schedule-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success("Master schedule exported!");
  };

  const exportByTeacher = (teacherId: string) => {
    const teacherSchedules = filteredSchedules.filter(s => s.teacherId === teacherId);
    const teacher = teachers.find(t => t.id === teacherId);
    const filename = `schedule-${teacher?.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(teacherSchedules, filename);
    toast.success(`${teacher?.name}'s schedule exported!`);
  };

  const exportByRoom = (roomId: string) => {
    const roomSchedules = filteredSchedules.filter(s => s.roomId === roomId);
    const room = rooms.find(r => r.id === roomId);
    const filename = `room-${room?.roomNumber}-${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(roomSchedules, filename);
    toast.success(`Room ${room?.roomNumber} schedule exported!`);
  };

  const printSchedule = () => {
    window.print();
    toast.info("Opening print dialog...");
  };

  if (loading || programsLoading) {
    return <LoadingState message="Loading schedule system..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Calendar}
        title="Schedule Management"
        description="Create and review class schedules, check availability, and resolve conflicts."
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={exportMasterList}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Master List (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={printSchedule}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Schedule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={openAddDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Schedule
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assign teachers to subjects and create class schedules</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {/* Dashboard Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalSchedules}</div>
                <div className="text-sm text-muted-foreground">Total Schedules</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <UserSquare className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.activeTeachers}</div>
                <div className="text-sm text-muted-foreground">Active Teachers</div>
                {stats.overloadedTeachers > 0 && (
                  <div className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {stats.overloadedTeachers} overloaded
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-info/10 rounded-lg">
                <Building2 className="h-5 w-5 text-info" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.usedRooms}/{rooms.length}</div>
                <div className="text-sm text-muted-foreground">Rooms in Use</div>
                {stats.highDemandRooms > 0 && (
                  <div className="text-xs text-warning flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    {stats.highDemandRooms} high demand
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(stats.hardConflicts > 0 && "border-destructive/30")}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-lg",
                stats.hardConflicts > 0 
                  ? "bg-destructive/10" 
                  : "bg-primary/10"
              )}>
                {stats.hardConflicts > 0 ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.hardConflicts}</div>
                <div className="text-sm text-muted-foreground">Hard Conflicts</div>
                {stats.hardConflicts > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-destructive hover:text-destructive/90"
                    onClick={() => {
                      resetScheduleFilters();
                      setViewMode("conflicts");
                    }}
                  >
                    View conflicts
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs for Different Views */}
      <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              Calendar Grid
            </TabsTrigger>
            <TabsTrigger value="teacher" className="flex items-center gap-2">
              <UserSquare className="h-4 w-4" />
              Teacher Load
            </TabsTrigger>
            <TabsTrigger value="room" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Room Usage
            </TabsTrigger>
            <TabsTrigger value="conflicts" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Conflicts
              {stats.hardConflicts > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {stats.hardConflicts}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {viewMode === "list" && (
            <Button
              variant={bulkEditMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setBulkEditMode(!bulkEditMode);
                setSelectedSchedules([]);
              }}
            >
              {bulkEditMode ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel Bulk
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Bulk Actions
                </>
              )}
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <div>
                  <CardTitle className="text-base">Find schedules</CardTitle>
                  <CardDescription>Search by subject, teacher, room, or section. Narrow further by program, year, and semester.</CardDescription>
                </div>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetScheduleFilters}>
                  <X className="mr-1 h-3 w-3" />
                  Clear filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="sm:col-span-2">
                <Label htmlFor="schedule-search" className="text-xs">Search schedules</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="schedule-search"
                    placeholder="Subject, teacher, room, or section"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Program</Label>
                <Select value={filterProgram} onValueChange={setFilterProgram}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Programs</SelectItem>
                    {programs.map((program) => (
                      <SelectItem key={program.code} value={program.code}>
                        {program.code} - {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Year Level</Label>
                <Select value={filterYearLevel} onValueChange={setFilterYearLevel}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableScheduleYears.map((yearLevel) => (
                      <SelectItem key={yearLevel} value={yearLevel}>{yearLevel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Semester</Label>
                <Select value={filterSemester} onValueChange={setFilterSemester}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {availableScheduleSemesters.map((semester) => (
                      <SelectItem key={semester} value={semester}>{semester}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-expanded={showAdvancedFilters}
                aria-controls="schedule-advanced-filters"
                onClick={() => setShowAdvancedFilters((expanded) => !expanded)}
              >
                <Filter className="mr-2 h-4 w-4" />
                {showAdvancedFilters ? "Fewer filters" : "More filters"}
                {activeAdvancedFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeAdvancedFilterCount} active
                  </Badge>
                )}
                <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", showAdvancedFilters && "rotate-180")} />
              </Button>
              <span className="text-sm text-muted-foreground">
                Showing {filteredSchedules.length} of {schedules.length} schedules
              </span>
            </div>

            {showAdvancedFilters && (
              <div
                id="schedule-advanced-filters"
                className="grid grid-cols-1 gap-4 rounded-md border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div>
                  <Label className="text-xs">Day</Label>
                  <Select value={filterDay} onValueChange={setFilterDay}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Days</SelectItem>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Section</Label>
                  <Select value={filterSection} onValueChange={setFilterSection}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {sections.map((currentSection) => (
                        <SelectItem key={currentSection} value={currentSection}>
                          Section {currentSection}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Teacher</Label>
                  <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teachers</SelectItem>
                      <SelectItem value="TBA">TBA</SelectItem>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Room</Label>
                  <Select value={filterRoom} onValueChange={setFilterRoom}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rooms</SelectItem>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>{room.roomNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Actions Bar */}
        {bulkEditMode && selectedSchedules.length > 0 && (
          <Alert className="border-primary bg-primary/5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                <span className="font-medium">{selectedSchedules.length} schedule(s) selected</span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={processing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSchedules([])}
                >
                  Clear Selection
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* List View */}
        <TabsContent value="list" className="mt-0">
          <ScheduleListView
            schedules={filteredSchedules}
            totalScheduleCount={schedules.length}
            formatTime={formatTime}
            getCapacityColor={getCapacityColor}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            bulkEditMode={bulkEditMode}
            selectedSchedules={selectedSchedules}
            onToggleSelect={(id: string | null, selectVisible?: boolean) => {
              if (id === null) {
                setSelectedSchedules(selectVisible ? filteredSchedules.map((schedule) => schedule.id) : []);
                return;
              }
              if (selectedSchedules.includes(id)) {
                setSelectedSchedules(selectedSchedules.filter(sid => sid !== id));
              } else {
                setSelectedSchedules([...selectedSchedules, id]);
              }
            }}
            processing={processing}
          />
        </TabsContent>

        {/* Calendar Grid View */}
        <TabsContent value="calendar" className="mt-0">
          <ScheduleCalendarView
            schedules={filteredSchedules}
            formatTime={formatTime}
            onEdit={openEditDialog}
          />
        </TabsContent>

        {/* Teacher Load View */}
        <TabsContent value="teacher" className="mt-0">
          <TeacherLoadView
            teacherLoad={filteredTeacherLoad}
            schedules={filteredSchedules}
            formatTime={formatTime}
            onExport={exportByTeacher}
          />
        </TabsContent>

        {/* Room Usage View */}
        <TabsContent value="room" className="mt-0">
          <RoomUsageView
            roomUtilization={filteredRoomUtilization}
            schedules={filteredSchedules}
            formatTime={formatTime}
            onExport={exportByRoom}
          />
        </TabsContent>

        {/* Conflicts View */}
        <TabsContent value="conflicts" className="mt-0">
          <ConflictsView
            conflicts={filteredConflicts}
            formatTime={formatTime}
            onResolve={openEditDialog}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="w-[calc(100%-2rem)] max-h-[90vh] gap-0 overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingSchedule ? (
                <>
                  <Edit className="h-5 w-5" />
                  Edit Schedule
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Create New Schedule
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingSchedule 
                ? "Update the schedule details below. Changes are saved immediately."
                : "Fill in the class, meeting time, and room below. Conflict checks update as you make changes."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 px-6 py-6">
            {/* Class Details */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <div className="text-sm font-medium">Class Details</div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="schedule-program">Program *</Label>
                  <Select 
                    value={selectedProgram} 
                    onValueChange={(value) => {
                      setSelectedProgram(value);
                      setSubjectYearFilter("all");
                      setSubjectSemesterFilter("all");
                      resetScheduleDetailsForSubjectChange();
                    }}
                  >
                    <SelectTrigger id="schedule-program" className="mt-1 h-11">
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.code} value={program.code}>
                          {program.code} - {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProgram && (
                  <div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="schedule-subject-year">Year Level</Label>
                        <Select
                          value={subjectYearFilter}
                          onValueChange={(value) => {
                            setSubjectYearFilter(value);
                            resetScheduleDetailsForSubjectChange();
                          }}
                        >
                          <SelectTrigger id="schedule-subject-year" className="mt-1 h-11">
                            <SelectValue placeholder="All year levels" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All year levels</SelectItem>
                            {availableSubjectYears.map((yearLevel) => (
                              <SelectItem key={yearLevel} value={yearLevel}>{yearLevel}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="schedule-subject-semester">Semester</Label>
                        <Select
                          value={subjectSemesterFilter}
                          onValueChange={(value) => {
                            setSubjectSemesterFilter(value);
                            resetScheduleDetailsForSubjectChange();
                          }}
                        >
                          <SelectTrigger id="schedule-subject-semester" className="mt-1 h-11">
                            <SelectValue placeholder="All semesters" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All semesters</SelectItem>
                            {availableSubjectSemesters.map((semester) => (
                              <SelectItem key={semester} value={semester}>{semester}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Label>Subject *</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose a year and semester to narrow the list, then search by subject code or name. {filteredSubjectsForForm.length} subject(s) match.
                    </p>
                    <div className="mt-1 min-w-0 overflow-hidden rounded-md border bg-background">
                      <Command>
                        <CommandInput placeholder="Search by subject code or name..." />
                        <CommandList className="max-h-56 overflow-y-auto">
                          <CommandEmpty>No subject found.</CommandEmpty>
                          {Object.keys(subjectsByYearSemester).sort().map((group) => (
                            <CommandGroup key={group} heading={group}>
                              {subjectsByYearSemester[group].map((subject) => (
                                <CommandItem
                                  key={subject.id}
                                  className="min-w-0"
                                  value={`${subject.subjectCode} ${subject.subjectName} ${subject.yearLevel} ${subject.semester}`}
                                  onSelect={() => {
                                    setSelectedSubjectId(subject.id);
                                  }}
                                >
                                  <CheckCircle2
                                    className={cn(
                                      "mr-2 h-4 w-4 shrink-0",
                                      selectedSubjectId === subject.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="min-w-0 flex flex-col">
                                    <span className="truncate font-medium">{subject.subjectCode}</span>
                                    <span className="truncate text-xs text-muted-foreground">{subject.subjectName}</span>
                                    <span className="text-xs text-muted-foreground">Year {subject.yearLevel}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </div>
                    {subjectsForSelectedProgram.length === 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        This program has no curriculum subjects yet. Add its subjects before creating schedules.
                      </p>
                    )}
                    {subjectsForSelectedProgram.length > 0 && filteredSubjectsForForm.length === 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No subjects match these filters. Choose a different year or semester.
                      </p>
                    )}
                    {selectedSubjectId && (
                      <div className="mt-2 rounded-md bg-primary/5 px-3 py-2 text-sm">
                        {(() => {
                          const subject = subjects.find(s => s.id === selectedSubjectId);
                          return subject ? (
                            <>
                              <p className="font-medium">{subject.subjectCode} - {subject.subjectName}</p>
                              <p className="text-xs text-muted-foreground">
                                Year {subject.yearLevel} • {subject.semester}
                              </p>
                            </>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label>Section (Optional)</Label>
                  <Input
                    value={section}
                    onChange={(e) => setSection(e.target.value.toUpperCase())}
                    placeholder="e.g., BSIT-1A"
                    className="mt-1"
                    maxLength={24}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Students will only see schedules for their assigned section
                  </p>
                </div>
              </div>
            </div>

            {selectedSubjectId && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Teacher Assignment</div>
                  <Badge variant="secondary" className="text-xs">Optional</Badge>
                </div>

                <div>
                  <Label>Teacher</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Choose an active teacher or leave as TBA. Busy teachers stay visible so you can see scheduling conflicts.
                  </p>
                  {teachers.length === 0 && (
                    <Alert className="mb-3">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        No active teacher profiles were found. A Firebase Authentication account alone is not enough; add a <code>users/{'{uid}'}</code> document with role <code>Teacher</code>, a name, and active status if set.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Popover open={teacherSearchOpen} onOpenChange={setTeacherSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={teacherSearchOpen}
                        className="w-full justify-between mt-1"
                      >
                        {selectedTeacherId === "TBA" 
                          ? "TBA (To Be Announced)"
                          : (() => {
                              const teacher = teachers.find(t => t.id === selectedTeacherId);
                              return teacher ? teacher.name : "Select teacher";
                            })()
                        }
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 max-w-[calc(100vw-2rem)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search teachers..." />
                        <CommandList className="max-h-[min(60vh,28rem)]">
                          <CommandEmpty>No teacher found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="tba"
                              className="min-h-12 px-3 py-2"
                              onSelect={() => {
                                setSelectedTeacherId("TBA");
                                setTeacherSearchOpen(false);
                              }}
                            >
                              <CheckCircle2
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedTeacherId === "TBA" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">TBA</Badge>
                                <span>To Be Announced</span>
                              </div>
                            </CommandItem>
                            {teachers.map((teacher) => {
                              const isBusy = busyTeacherIds.has(teacher.id);
                              return (
                              <CommandItem
                                key={teacher.id}
                                value={teacher.name}
                                className="min-h-12 px-3 py-2"
                                onSelect={() => {
                                  setSelectedTeacherId(teacher.id);
                                  setTeacherSearchOpen(false);
                                }}
                              >
                                <CheckCircle2
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedTeacherId === teacher.id ? "opacity-100 text-success" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{teacher.name}</span>
                                  <span className="text-xs text-muted-foreground">{teacher.email}</span>
                                </div>
                                <Badge variant={isBusy ? "outline" : "secondary"} className="ml-auto">
                                  {isBusy ? "Busy at this time" : "Available"}
                                </Badge>
                              </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedDays.length > 0 && startTime && endTime && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      {availableTeachers.length} available, {teachers.length - availableTeachers.length} busy. Busy selections require conflict confirmation.
                    </p>
                  )}
                </div>
              </div>
            )}

            {selectedSubjectId && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <div className="text-sm font-medium">Time & Schedule Days</div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time *</Label>
                      <Select value={startTime} onValueChange={setStartTime}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Start time" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {formatTime(time)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>End Time *</Label>
                      <Select value={endTime} onValueChange={setEndTime}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="End time" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {formatTime(time)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {startTime && endTime && startTime >= endTime && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        End time must be after start time
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Schedule Days *
                    </Label>
                    <div className="mt-2 rounded-lg border-2 bg-background/50 p-4 sm:p-5 space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Quick Select Patterns
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                          {COMMON_DAY_PATTERNS.map((pattern) => {
                            const isSelected = [...selectedDays].sort().join(",") === [...pattern.value].sort().join(",");
                            return (
                              <Button
                                key={pattern.abbr}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                  "flex h-auto flex-col px-3 py-2 transition-all",
                                  isSelected && "ring-2 ring-primary ring-offset-2"
                                )}
                                onClick={() => setSelectedDays([...pattern.value])}
                              >
                                <span className="font-mono text-sm font-bold">{pattern.abbr}</span>
                                <span className="text-[10px] opacity-80">{pattern.label.split(" ")[0]}</span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Or select individual days
                        </p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {DAYS_OF_WEEK.map((day) => (
                            <div
                              key={day}
                              className={cn(
                                "flex items-center space-x-3 rounded-lg border-2 p-3 transition-all hover:bg-accent",
                                selectedDays.includes(day) ? "border-primary bg-primary/5" : "border-border"
                              )}
                            >
                              <Checkbox
                                id={`day-${day}`}
                                checked={selectedDays.includes(day)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedDays((currentDays) => currentDays.includes(day)
                                      ? currentDays
                                      : [...currentDays, day]);
                                  } else {
                                    setSelectedDays((currentDays) => currentDays.filter((selectedDay) => selectedDay !== day));
                                  }
                                }}
                              />
                              <Label
                                htmlFor={`day-${day}`}
                                className="flex-1 cursor-pointer select-none font-medium"
                              >
                                {day}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedDays.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="mb-2 text-xs text-muted-foreground">Selected days:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedDays.map((day) => (
                              <Badge key={day} className={getDayBadgeColor(day)}>
                                {day.substring(0, 3)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Available rooms appear below after you choose days and a valid time.
                  </p>
                </div>
              </div>
            )}

            {selectedSubjectId && selectedDays.length > 0 && startTime && endTime && startTime < endTime && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <div className="text-sm font-medium">Room Selection</div>

                <div>
                  <Label>Room *</Label>
                  <Popover open={roomSearchOpen} onOpenChange={setRoomSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={roomSearchOpen}
                        className="w-full justify-between mt-1"
                      >
                        {selectedRoomId
                          ? (() => {
                              const room = rooms.find(r => r.id === selectedRoomId);
                              return room ? `${room.roomNumber} - ${room.roomName} (${room.capacity} capacity)` : "Select room";
                            })()
                          : "Select room"}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 max-w-[calc(100vw-2rem)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search rooms..." />
                        <CommandList className="max-h-[min(60vh,28rem)]">
                          <CommandEmpty>No room found.</CommandEmpty>
                          <CommandGroup>
                            {availableRooms.map((room) => (
                              <CommandItem
                                key={room.id}
                                value={`${room.roomNumber} ${room.roomName}`}
                                className="min-h-12 px-3 py-2"
                                onSelect={() => {
                                  setSelectedRoomId(room.id);
                                  setRoomSearchOpen(false);
                                }}
                              >
                                <CheckCircle2
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedRoomId === room.id ? "opacity-100 text-success" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{room.roomNumber}</span>
                                    <span className="text-sm text-muted-foreground">{room.roomName}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{room.building}</span>
                                    <span>•</span>
                                    <span>{room.capacity} capacity</span>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    {availableRooms.length} room(s) available for selected time slot
                  </p>
                  
                </div>
              </div>
            )}

            {!editingSchedule && selectedSubjectId && selectedRoomId && selectedDays.length > 0 &&
              startTime && endTime && startTime < endTime && (
              <div className="space-y-4 p-4 border-2 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10">
                <div className="text-sm font-medium">Schedule Summary</div>

                <div className="space-y-4">
                  {/* Duplicate Schedule Warning */}
                  {duplicateSchedules.length > 0 && (
                    <Alert className="border-warning bg-warning/10">
                      <Info className="h-4 w-4 text-warning" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-medium text-warning">
                            Similar schedule(s) already exist
                          </p>
                          <p className="text-sm text-warning/90">
                            The following schedule(s) have the same subject and overlapping time:
                          </p>
                          <ul className="text-xs space-y-1 mt-2">
                            {duplicateSchedules.map(dup => (
                              <li key={dup.id} className="flex items-center gap-2">
                                <AlertTriangle className="h-3 w-3" />
                                {dup.subjectCode} • {getDisplayDays(dup.dayOfWeek)} • {formatTime(dup.startTime)}-{formatTime(dup.endTime)} • Room {dup.room.split(' - ')[0]}
                                {dup.section && ` • Section ${dup.section}`}
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs text-warning/90 mt-2">
                            This is just a reminder. You can still proceed if this is intentional (e.g., different section).
                          </p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Review Details */}
                  <div className="bg-background/80 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Program</Label>
                        <p className="font-medium">{selectedProgram}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Subject</Label>
                        <p className="font-medium">
                          {(() => {
                            const subject = subjects.find(s => s.id === selectedSubjectId);
                            return subject ? `${subject.subjectCode} - ${subject.subjectName}` : "";
                          })()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Teacher</Label>
                        <p className="font-medium">
                          {selectedTeacherId === "TBA" ? (
                            <Badge variant="secondary">TBA</Badge>
                          ) : (
                            (() => {
                              const teacher = teachers.find(t => t.id === selectedTeacherId);
                              return teacher ? teacher.name : "";
                            })()
                          )}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Section</Label>
                        <p className="font-medium">{section || "No section"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Schedule Days</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedDays.map(day => (
                            <Badge key={day} variant="outline" className={getDayBadgeColor(day)}>
                              {day.substring(0, 3)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Time</Label>
                        <p className="font-medium">
                          {formatTime(startTime)} - {formatTime(endTime)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Room</Label>
                      <p className="font-medium">
                        {(() => {
                          const room = rooms.find(r => r.id === selectedRoomId);
                          return room ? `${room.roomNumber} - ${room.roomName} (${room.capacity} capacity)` : "";
                        })()}
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Conflict Indicator */}
            {selectedRoomId && selectedDays.length > 0 && startTime && endTime && startTime < endTime && (
              <Alert className={cn(
                conflicts.type === 'hard' && "border-destructive bg-destructive/10",
                conflicts.type === 'soft' && "border-warning bg-warning/10",
                conflicts.type === 'none' && "border-success bg-success/10"
              )}>
                <conflicts.icon className={cn("h-4 w-4", conflicts.color)} />
                <AlertDescription>
                  <span className="font-medium">
                    {conflicts.type === 'hard' && "Hard Conflict: "}
                    {conflicts.type === 'soft' && "Soft Conflict: "}
                    {conflicts.type === 'none' && "No Conflicts: "}
                  </span>
                  {conflicts.message || "Ready to save"}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="sticky bottom-0 z-10 gap-3 border-t bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Required: subject, days, start and end times, and room. Teacher is optional.
            </p>
            <div className="flex shrink-0 justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={processing}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={
                  processing || 
                  !selectedSubjectId || 
                  !selectedRoomId || 
                  selectedDays.length === 0 || 
                  !startTime || 
                  !endTime ||
                  startTime >= endTime ||
                  conflicts.type === 'hard'
                }
              >
                {processing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {editingSchedule ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {editingSchedule ? "Update Schedule" : "Create Schedule"}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

// List View Component
function ScheduleListView({ 
  schedules, 
  totalScheduleCount,
  formatTime, 
  getCapacityColor, 
  onEdit, 
  onDelete,
  onDuplicate,
  bulkEditMode,
  selectedSchedules,
  onToggleSelect,
  processing
}: any) {
  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={Calendar}
            title="No schedules found"
            description="Create your first schedule or adjust your filters"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Schedule List
            </CardTitle>
            <CardDescription>
              Showing {schedules.length} of {totalScheduleCount} schedules
            </CardDescription>
          </div>
          {bulkEditMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleSelect(
                null,
                !schedules.every((schedule: Schedule) => selectedSchedules.includes(schedule.id))
              )}
            >
              {schedules.every((schedule: Schedule) => selectedSchedules.includes(schedule.id))
                ? "Deselect Visible"
                : "Select Visible"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {bulkEditMode && <TableHead className="w-12"></TableHead>}
                <TableHead>Subject</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Enrollment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule: Schedule) => (
                <TableRow key={schedule.id} className={cn(
                  bulkEditMode && selectedSchedules.includes(schedule.id) && "bg-primary/5"
                )}>
                  {bulkEditMode && (
                    <TableCell>
                      <Checkbox
                        checked={selectedSchedules.includes(schedule.id)}
                        onCheckedChange={() => onToggleSelect(schedule.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div>
                      <div className="font-medium">{schedule.subjectCode}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {schedule.subjectName}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {schedule.teacherId === "TBA" ? (
                        <Badge variant="secondary">TBA</Badge>
                      ) : (
                        <div>
                          <div className="text-sm">{schedule.teacherName}</div>
                          <div className="text-xs text-muted-foreground">{schedule.teacherEmail}</div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {abbreviationToDays(schedule.dayOfWeek).map(day => (
                        <Badge key={day} variant="outline" className={getDayBadgeColor(day)}>
                          {day.substring(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm whitespace-nowrap">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {schedule.room.split(" - ")[0]}
                    </div>
                  </TableCell>
                  <TableCell>
                    {schedule.section ? (
                      <Badge variant="outline">Section {schedule.section}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">All</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{schedule.program}</div>
                      <div className="text-xs text-muted-foreground">
                        Year {schedule.yearLevel} • {schedule.semester}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={cn(
                      "text-sm",
                      getCapacityColor((schedule.enrolledStudents || []).length, getScheduleCapacity(schedule))
                    )}>
                      {(schedule.enrolledStudents || []).length} / {getScheduleCapacity(schedule)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(schedule)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDuplicate(schedule)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onDelete(schedule)}
                          className="text-destructive"
                          disabled={processing || (schedule.enrolledStudents && schedule.enrolledStudents.length > 0)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Calendar Grid View Component
function ScheduleCalendarView({ schedules, formatTime, onEdit }: any) {
  // Group schedules by subject
  const subjectGroups = schedules.reduce((acc: any, schedule: Schedule) => {
    const key = `${schedule.subjectCode}-${schedule.section || 'NO_SECTION'}`;
    if (!acc[key]) {
      acc[key] = {
        subjectCode: schedule.subjectCode,
        subjectName: schedule.subjectName,
        section: schedule.section,
        schedules: []
      };
    }
    acc[key].schedules.push(schedule);
    return acc;
  }, {});

  const subjectRows = Object.values(subjectGroups);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3x3 className="h-5 w-5" />
          Weekly Calendar Grid
        </CardTitle>
        <CardDescription>Filtered schedules by day • Click any schedule to edit</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="border rounded-lg">
            {/* Table Header */}
            <div className="grid grid-cols-8 gap-0 border-b bg-muted/50">
              <div className="p-3 font-medium text-sm border-r">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Subjects
                </div>
              </div>
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="p-3 font-medium text-sm text-center border-r last:border-r-0">
                  <div>{day}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {day.substring(0, 3)}
                  </div>
                </div>
              ))}
            </div>

            {/* Table Body */}
            {subjectRows.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No schedules created yet
              </div>
            ) : (
              subjectRows.map((row: any, idx: number) => (
                <div key={idx} className="grid grid-cols-8 gap-0 border-b last:border-b-0 hover:bg-accent/5 transition-colors">
                  {/* Subject Column */}
                  <div className="p-3 border-r">
                    <div className="font-medium text-sm">{row.subjectCode}</div>
                    <div className="text-xs text-muted-foreground truncate">{row.subjectName}</div>
                    {row.section && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1 mt-1">
                        Sec {row.section}
                      </Badge>
                    )}
                  </div>

                  {/* Day Columns */}
                  {DAYS_OF_WEEK.map(day => {
                    // Find schedules for this subject on this day
                    const daySchedules = row.schedules.filter((s: Schedule) => {
                      const scheduleDays = abbreviationToDays(s.dayOfWeek);
                      return scheduleDays.includes(day);
                    });

                    return (
                      <div key={day} className="p-2 border-r last:border-r-0 min-h-[80px]">
                        {daySchedules.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                            -
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {daySchedules.map((schedule: Schedule) => (
                              <TooltipProvider key={schedule.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      onClick={() => onEdit(schedule)}
                                      className="p-2 rounded cursor-pointer bg-primary/10 border border-primary/20 hover:border-primary/40 hover:shadow-sm transition-all"
                                    >
                                      <div className="text-xs font-medium">
                                        {formatTime(schedule.startTime)}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground mt-0.5">
                                        {schedule.room.split(" - ")[0]}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">
                                        {schedule.teacherName.split(" ")[0]}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <div className="space-y-1">
                                      <p className="font-medium">{schedule.subjectCode}</p>
                                      <p className="text-xs">{schedule.subjectName}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Teacher: {schedule.teacherName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Room: {schedule.room}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Time: {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                      </p>
                                      {schedule.section && (
                                        <p className="text-xs text-muted-foreground">
                                          Section: {schedule.section}
                                        </p>
                                      )}
                                      <p className="text-xs text-muted-foreground">
                                        Enrolled: {(schedule.enrolledStudents || []).length} / {getScheduleCapacity(schedule)}
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Teacher Load View Component
function TeacherLoadView({ teacherLoad, schedules, formatTime, onExport }: any) {
  return (
    <div className="space-y-4">
      {teacherLoad.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={UserSquare}
              title="No teacher assignments"
              description="Assign teachers to schedules to see workload analysis"
            />
          </CardContent>
        </Card>
      ) : (
        teacherLoad.map((load: any) => {
          const teacherSchedules = schedules.filter((s: Schedule) => s.teacherId === load.teacher.id);
          
          return (
            <Card key={load.teacher.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <UserSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{load.teacher.name}</CardTitle>
                      <CardDescription>{load.teacher.email}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {load.isOverloaded && (
                      <Badge variant="destructive">Overloaded</Badge>
                    )}
                    <Badge variant="outline">{load.scheduleCount} classes</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onExport(load.teacher.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {teacherSchedules.map((schedule: Schedule) => (
                    <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5">
                      <div className="flex items-center gap-3 flex-1">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium">{schedule.subjectCode}</div>
                          <div className="text-xs text-muted-foreground">{schedule.subjectName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>{getDisplayDays(schedule.dayOfWeek)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{schedule.room.split(" - ")[0]}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

// Room Usage View Component
function RoomUsageView({ roomUtilization, schedules, formatTime, onExport }: any) {
  return (
    <div className="space-y-4">
      {roomUtilization.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Building2}
              title="No room utilization"
              description="Create schedules to see room usage analysis"
            />
          </CardContent>
        </Card>
      ) : (
        roomUtilization.filter((util: any) => util.scheduleCount > 0).map((util: any) => {
          const roomSchedules = schedules.filter((s: Schedule) => s.roomId === util.room.id);
          
          return (
            <Card key={util.room.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-info/10 rounded-lg">
                      <Building2 className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{util.room.roomNumber} - {util.room.roomName}</CardTitle>
                      <CardDescription>{util.room.building} • Capacity: {util.room.capacity}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {util.isHighDemand && (
                      <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                        High Demand
                      </Badge>
                    )}
                    <Badge variant="outline">{util.scheduleCount} bookings</Badge>
                    <Badge variant="outline">{Math.round(util.utilizationRate)}% utilized</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onExport(util.room.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {roomSchedules.map((schedule: Schedule) => (
                    <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5">
                      <div className="flex items-center gap-3 flex-1">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium">{schedule.subjectCode}</div>
                          <div className="text-xs text-muted-foreground">{schedule.subjectName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span>{schedule.teacherName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>{getDisplayDays(schedule.dayOfWeek)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

// Conflicts View Component
function ConflictsView({ conflicts, formatTime, onResolve }: any) {
  const hardConflicts = conflicts.filter((c: ConflictDetail) => c.severity === 'hard');
  const softConflicts = conflicts.filter((c: ConflictDetail) => c.severity === 'soft');

  if (conflicts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={CheckCircle2}
            title="No conflicts detected"
            description="All schedules are properly configured without room or teacher conflicts"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Conflict Summary
          </CardTitle>
          <CardDescription>
            Review and resolve scheduling conflicts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-destructive/10 border-destructive/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="font-medium">Hard Conflicts</span>
              </div>
              <div className="text-3xl font-bold text-destructive">{hardConflicts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Room double-bookings - must be resolved
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-warning/10 border-warning/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span className="font-medium">Soft Conflicts</span>
              </div>
              <div className="text-3xl font-bold text-warning">{softConflicts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Teacher time overlaps - review recommended
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hard Conflicts */}
      {hardConflicts.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="bg-destructive/10">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Hard Conflicts ({hardConflicts.length})
            </CardTitle>
            <CardDescription>
              These conflicts must be resolved immediately
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {hardConflicts.map((conflict: ConflictDetail, index: number) => (
                <div key={index} className="p-4 border border-destructive/20 rounded-lg bg-background">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-destructive" />
                        <span className="font-medium text-destructive">{conflict.message}</span>
                      </div>
                      
                      {/* Schedule 1 */}
                      <div className="pl-6 p-3 border-l-2 border-destructive/30 bg-muted/30 rounded">
                        <div className="font-medium">{conflict.schedule1.subjectCode} - {conflict.schedule1.subjectName}</div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {conflict.schedule1.teacherName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {getDisplayDays(conflict.schedule1.dayOfWeek)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(conflict.schedule1.startTime)} - {formatTime(conflict.schedule1.endTime)}
                          </span>
                        </div>
                      </div>

                      {/* Schedule 2 */}
                      <div className="pl-6 p-3 border-l-2 border-destructive/30 bg-muted/30 rounded">
                        <div className="font-medium">{conflict.schedule2.subjectCode} - {conflict.schedule2.subjectName}</div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {conflict.schedule2.teacherName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {getDisplayDays(conflict.schedule2.dayOfWeek)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(conflict.schedule2.startTime)} - {formatTime(conflict.schedule2.endTime)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onResolve(conflict.schedule1)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onResolve(conflict.schedule2)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit Second
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Soft Conflicts */}
      {softConflicts.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader className="bg-warning/10">
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Soft Conflicts ({softConflicts.length})
            </CardTitle>
            <CardDescription>
              Review these potential scheduling issues
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {softConflicts.map((conflict: ConflictDetail, index: number) => (
                <div key={index} className="p-4 border border-warning/20 rounded-lg bg-background">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-warning" />
                        <span className="font-medium text-warning">{conflict.message}</span>
                      </div>
                      
                      {/* Schedule 1 */}
                      <div className="pl-6 p-3 border-l-2 border-warning/30 bg-muted/30 rounded">
                        <div className="font-medium">{conflict.schedule1.subjectCode} - {conflict.schedule1.subjectName}</div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {getDisplayDays(conflict.schedule1.dayOfWeek)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(conflict.schedule1.startTime)} - {formatTime(conflict.schedule1.endTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {conflict.schedule1.room}
                          </span>
                        </div>
                      </div>

                      {/* Schedule 2 */}
                      <div className="pl-6 p-3 border-l-2 border-yellow-300 bg-muted/30 rounded">
                        <div className="font-medium">{conflict.schedule2.subjectCode} - {conflict.schedule2.subjectName}</div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {getDisplayDays(conflict.schedule2.dayOfWeek)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(conflict.schedule2.startTime)} - {formatTime(conflict.schedule2.endTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {conflict.schedule2.room}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onResolve(conflict.schedule1)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
