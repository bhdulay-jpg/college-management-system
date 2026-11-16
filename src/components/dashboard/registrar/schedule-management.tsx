"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Checkbox } from "../../ui/checkbox";
import { Search, Plus, Edit, Trash2, Calendar, Clock, User, MapPin, BookOpen, Users, AlertCircle, Check } from "lucide-react";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where, orderBy, getDocs } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { toast } from "sonner@2.0.3";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { Alert, AlertDescription } from "../../ui/alert";
import { PageHeader } from "../shared/page-header";

interface Subject {
  id: string;
  subjectCode: string;
  subjectName: string;
  program: string;
  yearLevel: string;
  semester: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  uid: string;
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
  program: string;
  yearLevel: string;
  semester: string;
  enrollmentType: string; // morning, afternoon, evening
  enrolledStudents: string[]; // Array of student UIDs
  maxStudents: number; // From room capacity
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ENROLLMENT_TYPES = [
  { value: "morning", label: "Morning (7:00 AM - 12:00 PM)", timeRange: "07:00-12:00" },
  { value: "afternoon", label: "Afternoon (1:00 PM - 6:00 PM)", timeRange: "13:00-18:00" },
  { value: "evening", label: "Evening (6:00 PM - 9:00 PM)", timeRange: "18:00-21:00" },
];

// Helper function to convert day names to abbreviated format
const getDayAbbreviation = (day: string): string => {
  const abbreviations: Record<string, string> = {
    "Monday": "M",
    "Tuesday": "T",
    "Wednesday": "W",
    "Thursday": "Th",
    "Friday": "F",
    "Saturday": "S",
  };
  return abbreviations[day] || day;
};

// Helper function to convert multiple days to combined format (e.g., ["Monday", "Wednesday"] => "MW")
const formatDaysAbbreviated = (days: string[]): string => {
  const sortedDays = days.sort((a, b) => DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b));
  return sortedDays.map(getDayAbbreviation).join("");
};

// Helper function to parse abbreviated days back to full names (e.g., "MW" => ["Monday", "Wednesday"])
const parseDaysFromAbbreviation = (abbreviated: string): string[] => {
  const dayMap: Record<string, string> = {
    "M": "Monday",
    "T": "Tuesday",
    "W": "Wednesday",
    "Th": "Thursday",
    "F": "Friday",
    "S": "Saturday",
  };
  
  const days: string[] = [];
  let i = 0;
  
  while (i < abbreviated.length) {
    // Check for two-character abbreviation first (Th)
    if (i < abbreviated.length - 1 && abbreviated.substring(i, i + 2) === "Th") {
      days.push(dayMap["Th"]);
      i += 2;
    } else {
      const char = abbreviated[i];
      if (dayMap[char]) {
        days.push(dayMap[char]);
      }
      i++;
    }
  }
  
  return days;
};

// Wizard Component for Creating Schedules
interface CreateScheduleWizardProps {
  subjects: Subject[];
  teachers: Teacher[];
  rooms: Room[];
  selectedSubjectId: string;
  setSelectedSubjectId: (value: string) => void;
  selectedTeacherId: string;
  setSelectedTeacherId: (value: string) => void;
  enrollmentType: string;
  setEnrollmentType: (value: string) => void;
  selectedDays: string[];
  setSelectedDays: (value: string[]) => void;
  startTime: string;
  setStartTime: (value: string) => void;
  endTime: string;
  setEndTime: (value: string) => void;
  selectedRoomId: string;
  setSelectedRoomId: (value: string) => void;
  section: string;
  setSection: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  processing: boolean;
}

function CreateScheduleWizard({
  subjects,
  teachers,
  rooms,
  selectedSubjectId,
  setSelectedSubjectId,
  selectedTeacherId,
  setSelectedTeacherId,
  enrollmentType,
  setEnrollmentType,
  selectedDays,
  setSelectedDays,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  selectedRoomId,
  setSelectedRoomId,
  section,
  setSection,
  onSubmit,
  onCancel,
  processing,
}: CreateScheduleWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const steps = [
    { number: 1, title: "Subject & Type", icon: BookOpen },
    { number: 2, title: "Teacher", icon: User },
    { number: 3, title: "Time & Days", icon: Clock },
    { number: 4, title: "Room & Review", icon: MapPin },
  ];

  // Validation for each step
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return selectedSubjectId !== "" && enrollmentType !== "";
      case 2:
        return true; // Teacher is optional
      case 3:
        return selectedDays.length > 0 && startTime !== "" && endTime !== "";
      case 4:
        return selectedRoomId !== "";
      default:
        return false;
    }
  };

  const canProceed = isStepValid(currentStep);

  const handleNext = () => {
    if (currentStep < totalSteps && canProceed) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (isStepValid(4)) {
      onSubmit();
    }
  };

  // Get selected subject details
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const selectedEnrollmentType = ENROLLMENT_TYPES.find(t => t.value === enrollmentType);

  return (
    <>
      <DialogHeader className="pb-6">
        <DialogTitle className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-bayoux-500 to-blue-bayoux-600 flex items-center justify-center shadow-lg shadow-blue-bayoux-500/20">
            <Plus className="h-5 w-5 text-white" />
          </div>
          <span>Create New Schedule</span>
        </DialogTitle>
        <DialogDescription className="mt-2">
          Follow the steps below to create a new schedule. All fields marked with * are required.
        </DialogDescription>
      </DialogHeader>

      {/* Progress Steps */}
      <div className="border-y border-blue-bayoux-200 dark:border-blue-bayoux-800 bg-gradient-to-b from-blue-bayoux-50 to-white dark:from-blue-bayoux-950 dark:to-blue-bayoux-950/50">
        <div className="py-10">
          <div className="max-w-4xl mx-auto px-6">
            <div className="relative">
              {/* Progress Line - runs through center of circles */}
              <div className="absolute top-8 left-0 right-0 flex items-center px-20">
                <div className="flex-1 h-[3px] bg-blue-bayoux-200 dark:bg-blue-bayoux-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-bayoux-600 to-blue-bayoux-500 transition-all duration-700 ease-in-out"
                    style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Steps Container */}
              <div className="relative z-10 flex items-start justify-between">
                {steps.map((step) => {
                  const StepIcon = step.icon;
                  const isActive = currentStep === step.number;
                  const isCompleted = currentStep > step.number;
                  const isAccessible = isCompleted || isStepValid(step.number - 1) || step.number === 1;

                  return (
                    <div key={step.number} className="flex flex-col items-center" style={{ width: '140px' }}>
                      {/* Circle Button */}
                      <button
                        onClick={() => {
                          if (isCompleted || (step.number < currentStep && isAccessible)) {
                            setCurrentStep(step.number);
                          }
                        }}
                        disabled={!isCompleted && step.number > currentStep}
                        className={`group relative mb-3.5 transition-all duration-300 ${
                          isActive ? 'scale-110' : isCompleted ? 'hover:scale-105' : ''
                        }`}
                      >
                        {/* Glow effect for active */}
                        {isActive && (
                          <div className="absolute inset-0 rounded-full bg-blue-bayoux-600 dark:bg-blue-bayoux-500 blur-xl opacity-40 animate-pulse" />
                        )}
                        
                        {/* Circle */}
                        <div className={`relative h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isActive
                            ? "bg-gradient-to-br from-blue-bayoux-600 to-blue-bayoux-700 dark:from-blue-bayoux-500 dark:to-blue-bayoux-600 text-white shadow-xl"
                            : isCompleted
                            ? "bg-gradient-to-br from-blue-bayoux-600 to-blue-bayoux-700 dark:from-blue-bayoux-500 dark:to-blue-bayoux-600 text-white shadow-lg cursor-pointer"
                            : "bg-white dark:bg-blue-bayoux-900 border-2 border-blue-bayoux-300 dark:border-blue-bayoux-700 text-blue-bayoux-400 dark:text-blue-bayoux-500 shadow-sm"
                        }`}>
                          {isCompleted ? (
                            <Check className="h-7 w-7 stroke-[2.5]" />
                          ) : (
                            <StepIcon className="h-7 w-7" />
                          )}
                        </div>
                      </button>
                      
                      {/* Label */}
                      <div className="text-center px-2">
                        <p className={`text-sm font-semibold transition-all duration-300 leading-tight ${
                          isActive 
                            ? "text-blue-bayoux-700 dark:text-blue-bayoux-300" 
                            : isCompleted
                            ? "text-blue-bayoux-600 dark:text-blue-bayoux-400"
                            : "text-blue-bayoux-500 dark:text-blue-bayoux-500"
                        }`}>
                          {step.title}
                        </p>
                        {isActive && (
                          <p className="text-[10px] text-blue-bayoux-600 dark:text-blue-bayoux-400 mt-0.5">Step {step.number} of {totalSteps}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {/* Step 1: Subject & Type */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in-50 duration-300 max-w-2xl mx-auto">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                </div>
                <Label htmlFor="subject" className="text-base">
                  Select Subject *
                </Label>
              </div>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="h-14 text-base">
                  <SelectValue placeholder="Choose a subject from the list" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No subjects available
                    </div>
                  ) : (
                    subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id} className="py-4">
                        <div className="flex flex-col items-start gap-1">
                          <div className="font-medium">
                            {subject.subjectCode} - {subject.subjectName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {subject.program} • Year {subject.yearLevel} • {subject.semester}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedSubject && (
                <div className="mt-4 p-5 bg-gradient-to-br from-blue-bayoux-50 to-blue-bayoux-100/50 dark:from-blue-bayoux-950/50 dark:to-blue-bayoux-900/30 border-2 border-blue-bayoux-200 dark:border-blue-bayoux-800 rounded-xl">
                  <div className="text-xs text-blue-bayoux-700 dark:text-blue-bayoux-300 mb-3">Selected Subject Details</div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1.5">Program</div>
                      <div className="font-medium text-sm">{selectedSubject.program.split(" - ")[0]}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1.5">Year Level</div>
                      <div className="font-medium text-sm">Year {selectedSubject.yearLevel}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1.5">Semester</div>
                      <div className="font-medium text-sm">{selectedSubject.semester}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-blue-bayoux-200 dark:bg-blue-bayoux-800" />

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                </div>
                <Label htmlFor="enrollmentType" className="text-base">
                  Enrollment Type *
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Select the time slot for this schedule. Students will only see schedules matching their enrollment type.
              </p>
              <div className="grid gap-3">
                {ENROLLMENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setEnrollmentType(type.value)}
                    className={`p-5 rounded-xl border-2 transition-all text-left group ${
                      enrollmentType === type.value
                        ? "border-blue-bayoux-600 dark:border-blue-bayoux-500 bg-gradient-to-br from-blue-bayoux-50 to-blue-bayoux-100/50 dark:from-blue-bayoux-950/50 dark:to-blue-bayoux-900/30 shadow-sm"
                        : "border-blue-bayoux-200 dark:border-blue-bayoux-800 hover:border-blue-bayoux-400 dark:hover:border-blue-bayoux-600 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className={`font-medium mb-1 ${enrollmentType === type.value ? "text-blue-bayoux-700 dark:text-blue-bayoux-300" : ""}`}>
                          {type.label.split(" (")[0]}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {type.label.match(/\(([^)]+)\)/)?.[1]}
                        </div>
                      </div>
                      <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        enrollmentType === type.value
                          ? "border-blue-bayoux-600 dark:border-blue-bayoux-500 bg-blue-bayoux-600 dark:bg-blue-bayoux-500"
                          : "border-blue-bayoux-300 dark:border-blue-bayoux-700 group-hover:border-blue-bayoux-400 dark:group-hover:border-blue-bayoux-600"
                      }`}>
                        {enrollmentType === type.value && (
                          <Check className="h-4 w-4 text-white" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Teacher */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-in fade-in-50 duration-300 max-w-2xl mx-auto">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                </div>
                <Label htmlFor="teacher" className="text-base">
                  Assign Teacher (Optional)
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Select a teacher for this schedule, or leave as "To Be Announced" if not yet decided.
              </p>
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger className="h-14 text-base">
                  <SelectValue placeholder="Select teacher or leave as TBA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TBA" className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">To Be Announced</div>
                        <div className="text-xs text-muted-foreground">Teacher not yet assigned</div>
                      </div>
                    </div>
                  </SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id} className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-bayoux-100 dark:bg-blue-bayoux-900 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                        </div>
                        <div>
                          <div className="font-medium">{teacher.name}</div>
                          <div className="text-xs text-muted-foreground">{teacher.email}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTeacherId === "TBA" && (
                <Alert className="mt-4 border-blue-bayoux-200 dark:border-blue-bayoux-800 bg-blue-bayoux-50/50 dark:bg-blue-bayoux-950/30">
                  <AlertCircle className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                  <AlertDescription className="text-blue-bayoux-700 dark:text-blue-bayoux-300">
                    Schedule will be created with teacher marked as "To Be Announced". You can assign a teacher later by editing the schedule.
                  </AlertDescription>
                </Alert>
              )}
              {selectedTeacherId !== "TBA" && selectedTeacher && (
                <div className="mt-4 p-5 bg-gradient-to-br from-blue-bayoux-50 to-blue-bayoux-100/50 dark:from-blue-bayoux-950/50 dark:to-blue-bayoux-900/30 border-2 border-blue-bayoux-200 dark:border-blue-bayoux-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-blue-bayoux-600 dark:bg-blue-bayoux-500 flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-blue-bayoux-700 dark:text-blue-bayoux-300 mb-1">Selected Teacher</div>
                      <div className="font-medium">{selectedTeacher.name}</div>
                      <div className="text-sm text-muted-foreground">{selectedTeacher.email}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-blue-bayoux-200 dark:bg-blue-bayoux-800" />

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                </div>
                <Label htmlFor="section" className="text-base">
                  Section (Optional)
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Specify if this schedule is designated for a particular section of students.
              </p>
              <Input
                id="section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g., A, B, 1-A, Section 1"
                className="h-14 text-base"
              />
              {section && (
                <div className="mt-4 p-4 bg-blue-bayoux-50 dark:bg-blue-bayoux-950/50 border border-blue-bayoux-200 dark:border-blue-bayoux-800 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                    <span className="text-blue-bayoux-700 dark:text-blue-bayoux-300">
                      Section set to: <span className="font-medium">{section}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Time & Days */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-in fade-in-50 duration-300 max-w-2xl mx-auto">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                </div>
                <Label className="text-base">
                  Select Days *
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Choose one or more days for this schedule. A separate schedule entry will be created for each day.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      if (selectedDays.includes(day)) {
                        setSelectedDays(selectedDays.filter(d => d !== day));
                      } else {
                        setSelectedDays([...selectedDays, day]);
                      }
                    }}
                    className={`p-4 rounded-xl border-2 transition-all group ${
                      selectedDays.includes(day)
                        ? "border-blue-bayoux-600 dark:border-blue-bayoux-500 bg-gradient-to-br from-blue-bayoux-50 to-blue-bayoux-100/50 dark:from-blue-bayoux-950/50 dark:to-blue-bayoux-900/30 shadow-sm"
                        : "border-blue-bayoux-200 dark:border-blue-bayoux-800 hover:border-blue-bayoux-400 dark:hover:border-blue-bayoux-600 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedDays.includes(day)
                          ? "border-blue-bayoux-600 dark:border-blue-bayoux-500 bg-blue-bayoux-600 dark:bg-blue-bayoux-500"
                          : "border-blue-bayoux-300 dark:border-blue-bayoux-700 group-hover:border-blue-bayoux-400 dark:group-hover:border-blue-bayoux-600"
                      }`}>
                        {selectedDays.includes(day) ? (
                          <Check className="h-5 w-5 text-white" />
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground">{day.substring(0, 2)}</span>
                        )}
                      </div>
                      <span className={`text-sm font-medium ${selectedDays.includes(day) ? "text-blue-bayoux-700 dark:text-blue-bayoux-300" : ""}`}>{day}</span>
                    </div>
                  </button>
                ))}
              </div>
              {selectedDays.length > 0 && (
                <div className="mt-4 p-5 bg-gradient-to-br from-blue-bayoux-50 to-blue-bayoux-100/50 dark:from-blue-bayoux-950/50 dark:to-blue-bayoux-900/30 border-2 border-blue-bayoux-200 dark:border-blue-bayoux-800 rounded-xl">
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <Check className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                    <span className="text-blue-bayoux-700 dark:text-blue-bayoux-300 font-medium">
                      {selectedDays.length} day(s) selected
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedDays.map(day => (
                      <span key={day} className="px-3 py-1 bg-white dark:bg-blue-bayoux-900 border border-blue-bayoux-300 dark:border-blue-bayoux-700 rounded-full text-sm">
                        {day}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    A separate schedule will be created for each selected day
                  </p>
                </div>
              )}
            </div>

            <div className="h-px bg-blue-bayoux-200 dark:bg-blue-bayoux-800" />

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                </div>
                <Label className="text-base">
                  Class Time *
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Set the start and end time for this class schedule.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-sm text-muted-foreground">
                    Start Time
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-14 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-sm text-muted-foreground">
                    End Time
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-14 text-base"
                  />
                </div>
              </div>
              {startTime && endTime && (
                <div className="mt-4 p-5 bg-gradient-to-br from-blue-bayoux-50 to-blue-bayoux-100/50 dark:from-blue-bayoux-950/50 dark:to-blue-bayoux-900/30 border-2 border-blue-bayoux-200 dark:border-blue-bayoux-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-blue-bayoux-700 dark:text-blue-bayoux-300 mb-1">Class Duration</div>
                      <div className="text-lg font-medium">{startTime} - {endTime}</div>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-bayoux-600 dark:bg-blue-bayoux-500 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Room & Review */}
        {currentStep === 4 && (
          <div className="space-y-8 animate-in fade-in-50 duration-300 max-w-2xl mx-auto">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                </div>
                <Label htmlFor="room" className="text-base">
                  Select Room *
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the room where this class will be held.
              </p>
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger className="h-14 text-base">
                  <SelectValue placeholder="Choose a room from the list" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No rooms available. Please add rooms first.
                    </div>
                  ) : (
                    rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id} className="py-4">
                        <div className="flex flex-col items-start gap-1">
                          <div className="font-medium">
                            {room.roomNumber} - {room.roomName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {room.building} • Capacity: {room.capacity} students
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedRoom && (
                <div className="mt-4 p-5 bg-gradient-to-br from-blue-bayoux-50 to-blue-bayoux-100/50 dark:from-blue-bayoux-950/50 dark:to-blue-bayoux-900/30 border-2 border-blue-bayoux-200 dark:border-blue-bayoux-800 rounded-xl">
                  <div className="text-xs text-blue-bayoux-700 dark:text-blue-bayoux-300 mb-3">Selected Room Details</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1.5">Building</div>
                      <div className="font-medium text-sm">{selectedRoom.building}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1.5">Max Capacity</div>
                      <div className="font-medium text-sm">{selectedRoom.capacity} students</div>
                    </div>
                  </div>
                  {selectedRoom.facilities && (
                    <div className="mt-4 pt-4 border-t border-blue-bayoux-200 dark:border-blue-bayoux-700">
                      <div className="text-xs text-muted-foreground mb-1.5">Available Facilities</div>
                      <div className="text-sm">{selectedRoom.facilities}</div>
                    </div>
                  )}
                </div>
              )}
              {rooms.length === 0 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No rooms available. Please add rooms first before creating a schedule.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="h-px bg-blue-bayoux-200 dark:bg-blue-bayoux-800" />

            {/* Review Summary */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900 flex items-center justify-center">
                  <Check className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                </div>
                <Label className="text-base">
                  Review Schedule
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Please review all the details before creating the schedule.
              </p>
              <div className="border-2 border-blue-bayoux-200 dark:border-blue-bayoux-800 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-blue-bayoux-600 to-blue-bayoux-500 p-4">
                  <div className="text-white font-medium">Schedule Summary</div>
                  <div className="text-blue-bayoux-100 text-sm mt-1">Verify all information is correct</div>
                </div>
                <div className="p-6 space-y-4 bg-gradient-to-br from-blue-bayoux-50/50 to-transparent dark:from-blue-bayoux-950/30 dark:to-transparent">
                  <div className="flex items-start gap-4 p-4 bg-white dark:bg-blue-bayoux-900/50 rounded-lg border border-blue-bayoux-200 dark:border-blue-bayoux-800">
                    <div className="h-10 w-10 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">Subject</div>
                      <div className="font-medium">
                        {selectedSubject ? `${selectedSubject.subjectCode} - ${selectedSubject.subjectName}` : "Not selected"}
                      </div>
                      {selectedSubject && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {selectedSubject.program} • Year {selectedSubject.yearLevel}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-white dark:bg-blue-bayoux-900/50 rounded-lg border border-blue-bayoux-200 dark:border-blue-bayoux-800">
                    <div className="h-10 w-10 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">Teacher</div>
                      <div className="font-medium">
                        {selectedTeacherId === "TBA" ? "To Be Announced" : selectedTeacher?.name || "Not selected"}
                      </div>
                      {selectedTeacher && selectedTeacherId !== "TBA" && (
                        <div className="text-xs text-muted-foreground mt-1">{selectedTeacher.email}</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-4 p-4 bg-white dark:bg-blue-bayoux-900/50 rounded-lg border border-blue-bayoux-200 dark:border-blue-bayoux-800">
                      <div className="h-10 w-10 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">Enrollment Type</div>
                        <div className="font-medium text-sm">
                          {selectedEnrollmentType?.label.split(" (")[0] || "Not selected"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-white dark:bg-blue-bayoux-900/50 rounded-lg border border-blue-bayoux-200 dark:border-blue-bayoux-800">
                      <div className="h-10 w-10 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900 flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">Room</div>
                        <div className="font-medium text-sm">
                          {selectedRoom ? `${selectedRoom.roomNumber}` : "Not selected"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-white dark:bg-blue-bayoux-900/50 rounded-lg border border-blue-bayoux-200 dark:border-blue-bayoux-800">
                    <div className="h-10 w-10 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">Schedule</div>
                      <div className="font-medium">
                        {selectedDays.length > 0 ? selectedDays.join(", ") : "Not selected"}
                      </div>
                      {startTime && endTime && (
                        <div className="text-sm text-muted-foreground mt-1">{startTime} - {endTime}</div>
                      )}
                    </div>
                  </div>

                  {section && (
                    <div className="flex items-start gap-4 p-4 bg-white dark:bg-blue-bayoux-900/50 rounded-lg border border-blue-bayoux-200 dark:border-blue-bayoux-800">
                      <div className="h-10 w-10 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900 flex items-center justify-center flex-shrink-0">
                        <Users className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">Section</div>
                        <div className="font-medium">{section}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with Navigation */}
      <DialogFooter className="border-t-2 border-blue-bayoux-200 dark:border-blue-bayoux-800 bg-blue-bayoux-50/30 dark:bg-blue-bayoux-950/20 px-6 py-5 mt-6">
        <div className="flex items-center justify-between w-full gap-4">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="h-11 px-6"
          >
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <Button 
                variant="outline" 
                onClick={handleBack}
                className="h-11 px-6"
              >
                <span className="mr-2">←</span>
                Back
              </Button>
            )}
            {currentStep < totalSteps ? (
              <Button 
                onClick={handleNext} 
                disabled={!canProceed}
                className="h-11 px-8 bg-gradient-to-r from-blue-bayoux-600 to-blue-bayoux-500 hover:from-blue-bayoux-700 hover:to-blue-bayoux-600"
              >
                Next
                <span className="ml-2">→</span>
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={!canProceed || processing || rooms.length === 0}
                className="h-11 px-8 bg-gradient-to-r from-blue-bayoux-600 to-blue-bayoux-500 hover:from-blue-bayoux-700 hover:to-blue-bayoux-600"
              >
                {processing ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create Schedule
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogFooter>
    </>
  );
}

export function ScheduleManagement() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDay, setFilterDay] = useState("all");
  const [filterEnrollmentType, setFilterEnrollmentType] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [processing, setProcessing] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // Wait for auth to be ready
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthReady(true);
      } else {
        setAuthReady(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Form state
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("TBA");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]); // Changed to array for multiple days
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [enrollmentType, setEnrollmentType] = useState("");

  // Load subjects - only when auth is ready
  useEffect(() => {
    if (!authReady) return;

    const q = query(collection(db, "subjects"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subjectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Subject[];
      setSubjects(subjectsData);
    }, (error) => {
      console.error("Error fetching subjects:", error);
      toast.error("Failed to load subjects");
    });

    return () => unsubscribe();
  }, [authReady]);

  // Load teachers
  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "Teacher"),
      orderBy("name", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teachersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Teacher[];
      setTeachers(teachersData);
    }, (error) => {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to load teachers");
    });

    return () => unsubscribe();
  }, []);

  // Load rooms
  useEffect(() => {
    const q = query(
      collection(db, "rooms"),
      orderBy("building", "asc"),
      orderBy("roomNumber", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Room[];
      setRooms(roomsData);
    }, (error) => {
      console.error("Error fetching rooms:", error);
      toast.error("Failed to load rooms");
    });

    return () => unsubscribe();
  }, []);

  // Load schedules
  useEffect(() => {
    const q = query(
      collection(db, "schedules"),
      orderBy("dayOfWeek", "asc"),
      orderBy("startTime", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const schedulesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Schedule[];
      setSchedules(schedulesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching schedules:", error);
      toast.error("Failed to load schedules");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setSelectedSubjectId("");
    setSelectedTeacherId("TBA");
    setSelectedRoomId("");
    setSelectedDays([]);
    setStartTime("");
    setEndTime("");
    setEnrollmentType("");
    setEditingSchedule(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setSelectedSubjectId(schedule.subjectId);
    setSelectedTeacherId(schedule.teacherId);
    setSelectedRoomId(schedule.roomId);
    setSelectedDays(parseDaysFromAbbreviation(schedule.dayOfWeek));
    setStartTime(schedule.startTime);
    setEndTime(schedule.endTime);
    setIsDialogOpen(true);
  };

  // Check for room conflicts
  const checkRoomConflict = async (roomId: string, day: string, start: string, end: string, excludeScheduleId?: string): Promise<boolean> => {
    const conflictingSchedules = schedules.filter(s => {
      if (excludeScheduleId && s.id === excludeScheduleId) return false;
      if (s.roomId !== roomId) return false;
      if (s.dayOfWeek !== day) return false;
      
      // Check time overlap
      const scheduleStart = s.startTime;
      const scheduleEnd = s.endTime;
      
      // Times overlap if: start < scheduleEnd AND end > scheduleStart
      return start < scheduleEnd && end > scheduleStart;
    });

    return conflictingSchedules.length > 0;
  };

  const handleSubmit = async () => {
    if (!selectedSubjectId || !selectedRoomId || selectedDays.length === 0 || !startTime || !endTime || !enrollmentType) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (startTime >= endTime) {
      toast.error("End time must be after start time");
      return;
    }

    // Validate enrollment type time range
    const selectedType = ENROLLMENT_TYPES.find(t => t.value === enrollmentType);
    if (selectedType) {
      const [typeStartHour, typeEndHour] = selectedType.timeRange.split("-").map(t => parseInt(t.split(":")[0]));
      const startHour = parseInt(startTime.split(":")[0]);
      const endHour = parseInt(endTime.split(":")[0]);
      
      if (startHour < typeStartHour || endHour > typeEndHour) {
        toast.error(`Schedule time must be within ${selectedType.label} time range`);
        return;
      }
    }

    // Check for room conflicts on all selected days
    for (const day of selectedDays) {
      const hasConflict = await checkRoomConflict(selectedRoomId, day, startTime, endTime, editingSchedule?.id);
      if (hasConflict) {
        toast.error(`Room is already booked for ${day} at this time slot`);
        return;
      }
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

      // Get teacher info or use TBA
      let teacherInfo = {
        teacherId: "TBA",
        teacherName: "To Be Announced",
        teacherEmail: ""
      };

      if (selectedTeacherId) {
        const teacher = teachers.find(t => t.id === selectedTeacherId);
        if (teacher) {
          teacherInfo = {
            teacherId: teacher.id,
            teacherName: teacher.name,
            teacherEmail: teacher.email
          };
        }
      }

      if (editingSchedule) {
        // Update existing schedule (preserve enrolled students)
        const scheduleData = {
          subjectId: subject.id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          ...teacherInfo,
          dayOfWeek: formatDaysAbbreviated(selectedDays), // Keep single day for edit mode
          startTime,
          endTime,
          roomId: room.id,
          room: `${room.roomNumber} - ${room.roomName}`,
          roomCapacity: room.capacity,
          program: subject.program,
          yearLevel: subject.yearLevel,
          semester: subject.semester,
          enrollmentType,
          maxStudents: room.capacity,
          updatedAt: serverTimestamp(),
        };
        
        await updateDoc(doc(db, "schedules", editingSchedule.id), scheduleData);
        toast.success("Schedule updated successfully!");
      } else {
        // Create a SINGLE schedule with multiple days combined (e.g., "MW", "TTh", "MWF")
        const scheduleData = {
          subjectId: subject.id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          ...teacherInfo,
          dayOfWeek: formatDaysAbbreviated(selectedDays), // Combined format like "MW" or "TTh"
          startTime,
          endTime,
          roomId: room.id,
          room: `${room.roomNumber} - ${room.roomName}`,
          roomCapacity: room.capacity,
          program: subject.program,
          yearLevel: subject.yearLevel,
          semester: subject.semester,
          enrollmentType,
          maxStudents: room.capacity,
          enrolledStudents: [], // Initialize empty array
          createdBy: currentUser.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await addDoc(collection(db, "schedules"), scheduleData);
        
        toast.success(`Schedule created successfully! (${formatDaysAbbreviated(selectedDays)})`);
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

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = 
      schedule.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.room.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDay = filterDay === "all" || schedule.dayOfWeek === filterDay;
    const matchesEnrollmentType = filterEnrollmentType === "all" || schedule.enrollmentType === filterEnrollmentType;

    return matchesSearch && matchesDay && matchesEnrollmentType;
  });

  // Group schedules by day
  const schedulesByDay = filteredSchedules.reduce((acc, schedule) => {
    if (!acc[schedule.dayOfWeek]) {
      acc[schedule.dayOfWeek] = [];
    }
    acc[schedule.dayOfWeek].push(schedule);
    return acc;
  }, {} as Record<string, Schedule[]>);

  // Sort days
  const sortedDays = Object.keys(schedulesByDay).sort((a, b) => {
    return DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b);
  });

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getEnrollmentTypeLabel = (type: string) => {
    const enrollType = ENROLLMENT_TYPES.find(t => t.value === type);
    return enrollType ? enrollType.label.split(" ")[0] : type;
  };

  const getCapacityColor = (enrolled: number, max: number) => {
    const percentage = (enrolled / max) * 100;
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 75) return "text-warning";
    return "text-success";
  };

  if (loading) {
    return <LoadingState message="Loading schedules..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Calendar}
        title="Schedule Management"
        description="Assign teachers and create class schedules with enrollment type filtering"
        action={
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Schedule
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {/* Info Alert */}
      {rooms.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No rooms available. Please add rooms first in the Room Management section.
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{schedules.length}</div>
                <div className="text-sm text-muted-foreground">Total Schedules</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{subjects.length}</div>
                <div className="text-sm text-muted-foreground">Available Subjects</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{teachers.length}</div>
                <div className="text-sm text-muted-foreground">Active Teachers</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{rooms.length}</div>
                <div className="text-sm text-muted-foreground">Available Rooms</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>All Schedules ({schedules.length})</CardTitle>
          <CardDescription>
            View and manage class schedules and teacher assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject, teacher, or room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterDay} onValueChange={setFilterDay}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEnrollmentType} onValueChange={setFilterEnrollmentType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ENROLLMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label.split(" ")[0]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Schedules by Day */}
          {filteredSchedules.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No schedules found"
              description={searchTerm || filterDay !== "all" || filterEnrollmentType !== "all"
                ? "Try adjusting your filters" 
                : "Start by creating your first class schedule"}
            />
          ) : (
            <div className="space-y-6">
              {sortedDays.map((day) => (
                <div key={day} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{day}</h3>
                    <Badge variant="secondary">{schedulesByDay[day].length} classes</Badge>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Teacher</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedulesByDay[day].map((schedule) => {
                          const enrolled = schedule.enrolledStudents?.length || 0;
                          const max = schedule.maxStudents || schedule.roomCapacity || 0;
                          return (
                            <TableRow key={schedule.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{schedule.subjectCode}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {schedule.subjectName}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {schedule.yearLevel} • {schedule.semester}
                                    {schedule.section && ` • Section ${schedule.section}`}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">{schedule.teacherName}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {schedule.teacherEmail}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">
                                    {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">{schedule.room}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {getEnrollmentTypeLabel(schedule.enrollmentType)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                  <span className={`text-sm font-medium ${getCapacityColor(enrolled, max)}`}>
                                    {enrolled}/{max}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(schedule)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(schedule)}
                                    disabled={processing}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Schedule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-h-[90vh] gap-0 overflow-hidden flex flex-col sm:max-w-5xl">
          {editingSchedule ? (
            // Simple edit form without wizard
            <>
              <DialogHeader>
                <DialogTitle>Edit Schedule</DialogTitle>
                <DialogDescription>
                  Update the schedule information below
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 overflow-y-auto px-6 py-6">
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.subjectCode} - {subject.subjectName}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({subject.program.split(" - ")[0]})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="teacher">Teacher (Optional)</Label>
                  <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select teacher or leave as TBA" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TBA">To Be Announced (TBA)</SelectItem>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({teacher.email})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="enrollmentType">Enrollment Type *</Label>
                  <Select value={enrollmentType} onValueChange={setEnrollmentType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select enrollment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENROLLMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="day">Day of Week *</Label>
                  <Select value={selectedDays[0]} onValueChange={(value) => setSelectedDays([value])}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time *</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="room">Room *</Label>
                  <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.roomNumber} - {room.roomName}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({room.building} • Capacity: {room.capacity})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="section">Section (Optional)</Label>
                  <Input
                    id="section"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g., A, B, 1-A"
                    className="mt-1"
                  />
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={processing || rooms.length === 0}>
                  Update Schedule
                </Button>
              </DialogFooter>
            </>
          ) : (
            <CreateScheduleWizard
              subjects={subjects}
              teachers={teachers}
              rooms={rooms}
              selectedSubjectId={selectedSubjectId}
              setSelectedSubjectId={setSelectedSubjectId}
              selectedTeacherId={selectedTeacherId}
              setSelectedTeacherId={setSelectedTeacherId}
              enrollmentType={enrollmentType}
              setEnrollmentType={setEnrollmentType}
              selectedDays={selectedDays}
              setSelectedDays={setSelectedDays}
              startTime={startTime}
              setStartTime={setStartTime}
              endTime={endTime}
              setEndTime={setEndTime}
              selectedRoomId={selectedRoomId}
              setSelectedRoomId={setSelectedRoomId}
              section={section}
              setSection={setSection}
              onSubmit={handleSubmit}
              onCancel={() => setIsDialogOpen(false)}
              processing={processing}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}