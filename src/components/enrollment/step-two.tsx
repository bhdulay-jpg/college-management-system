"use client";

import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Alert, AlertDescription } from "../ui/alert";
import { Info } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { usePrograms } from "../../hooks/use-programs";

interface StepTwoData {
  school: string;
  program: string;
  yearLevel: string;
  schedule: string;
  semester: string;
  studentType: string;
  lastSchoolAttended: string;
  lastSchoolAddress: string;
  lastSchoolYear: string;
}

interface StepTwoProps {
  data: StepTwoData;
  onChange: (data: Partial<StepTwoData>) => void;
  errors?: Partial<Record<keyof StepTwoData, string>>;
}

export function StepTwo({ data, onChange, errors = {} }: StepTwoProps) {
  const { programs, loading: programsLoading, error: programsError } = usePrograms();
  const departments = Array.from(
    new Set(programs.map((program) => program.department.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduate"];
  const semesters = ["1st Semester", "2nd Semester", "Summer"];

  const availablePrograms = data.school
    ? programs.filter((program) => program.department.trim() === data.school)
    : [];

  return (
    <div className="space-y-8">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-foreground/80">
          Select your desired program and academic term.
        </AlertDescription>
      </Alert>

      {/* School Selection */}
      <div className="space-y-5">
        <div className="pb-2 border-b-2 border-primary/10">
          <h3 className="text-lg text-primary">Program Selection</h3>
          <p className="text-sm text-muted-foreground mt-1">Choose your academic path</p>
        </div>

        {programsError && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Programs could not be loaded. Please refresh the page or contact admissions before submitting.
            </AlertDescription>
          </Alert>
        )}

        {!programsLoading && !programsError && departments.length === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No programs are currently available. Please contact admissions for assistance.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="school">School/College *</Label>
          <Select
            value={data.school}
            onValueChange={(value) => onChange({ school: value, program: "" })}
            disabled={programsLoading || !!programsError || departments.length === 0}
          >
            <SelectTrigger id="school" aria-invalid={!!errors.school}>
              <SelectValue placeholder={programsLoading ? "Loading schools..." : "Select a school or college"} />
            </SelectTrigger>
            <SelectContent>
              {departments.map((department) => (
                <SelectItem key={department} value={department}>
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.school && <p className="text-sm text-destructive">{errors.school}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="program">Program/Major *</Label>
          <Select
            value={data.program}
            onValueChange={(value) => onChange({ program: value })}
            disabled={!data.school || programsLoading || !!programsError}
          >
            <SelectTrigger id="program" aria-invalid={!!errors.program}>
              <SelectValue
                placeholder={
                  programsLoading
                    ? "Loading programs..."
                    : programsError
                      ? "Programs unavailable"
                      : data.school
                        ? "Select a program"
                        : "Select a school first"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availablePrograms.map((program) => (
                <SelectItem key={program.code} value={program.code}>
                  {program.code} - {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.program && <p className="text-sm text-destructive">{errors.program}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="yearLevel">Year Level *</Label>
          <Select value={data.yearLevel} onValueChange={(value) => onChange({ yearLevel: value })}>
            <SelectTrigger id="yearLevel" aria-invalid={!!errors.yearLevel}>
              <SelectValue placeholder="Select year level" />
            </SelectTrigger>
            <SelectContent>
              {yearLevels.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.yearLevel && <p className="text-sm text-destructive">{errors.yearLevel}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="semester">Academic Term *</Label>
          <Select value={data.semester} onValueChange={(value) => onChange({ semester: value })}>
            <SelectTrigger id="semester" aria-invalid={!!errors.semester}>
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              {semesters.map((semester) => (
                <SelectItem key={semester} value={semester}>
                  {semester}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.semester && <p className="text-sm text-destructive">{errors.semester}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule">Schedule Preference *</Label>
          <Select value={data.schedule} onValueChange={(value) => onChange({ schedule: value })}>
            <SelectTrigger id="schedule" aria-invalid={!!errors.schedule}>
              <SelectValue placeholder="Select schedule preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Morning">Morning (7:00 AM - 12:00 PM)</SelectItem>
              <SelectItem value="Afternoon">Afternoon (1:00 PM - 6:00 PM)</SelectItem>
              <SelectItem value="Evening">Evening (6:00 PM - 9:00 PM)</SelectItem>
              <SelectItem value="Flexible">Flexible</SelectItem>
            </SelectContent>
          </Select>
          {errors.schedule && <p className="text-sm text-destructive">{errors.schedule}</p>}
        </div>
      </div>

      {/* Student Type & Previous Education */}
      <div className="space-y-5">
        <div className="pb-2 border-b-2 border-primary/10">
          <h3 className="text-lg text-primary">Student Information</h3>
          <p className="text-sm text-muted-foreground mt-1">Tell us about your academic background</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="studentType">Student Type *</Label>
          <Select value={data.studentType} onValueChange={(value) => onChange({ studentType: value })}>
            <SelectTrigger id="studentType" aria-invalid={!!errors.studentType}>
              <SelectValue placeholder="Select student type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="New">New Student (Freshmen)</SelectItem>
              <SelectItem value="Transferee">Transferee</SelectItem>
              <SelectItem value="Returning">Returning Student</SelectItem>
              <SelectItem value="Shifter">Shifter (Change Program)</SelectItem>
            </SelectContent>
          </Select>
          {errors.studentType && <p className="text-sm text-destructive">{errors.studentType}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastSchoolAttended">Last School Attended *</Label>
          <Input
            id="lastSchoolAttended"
            value={data.lastSchoolAttended}
            onChange={(e) => onChange({ lastSchoolAttended: e.target.value })}
            placeholder="e.g., Manila High School"
            aria-invalid={!!errors.lastSchoolAttended}
            className={errors.lastSchoolAttended ? "border-destructive" : ""}
          />
          {errors.lastSchoolAttended && <p className="text-sm text-destructive">{errors.lastSchoolAttended}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastSchoolAddress">Last School Address *</Label>
          <Input
            id="lastSchoolAddress"
            value={data.lastSchoolAddress}
            onChange={(e) => onChange({ lastSchoolAddress: e.target.value })}
            placeholder="e.g., 123 Education Ave, Manila"
            aria-invalid={!!errors.lastSchoolAddress}
            className={errors.lastSchoolAddress ? "border-destructive" : ""}
          />
          {errors.lastSchoolAddress && <p className="text-sm text-destructive">{errors.lastSchoolAddress}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastSchoolYear">Year Graduated/Last Attended *</Label>
          <Input
            id="lastSchoolYear"
            value={data.lastSchoolYear}
            onChange={(e) => onChange({ lastSchoolYear: e.target.value })}
            placeholder="e.g., 2024"
            aria-invalid={!!errors.lastSchoolYear}
            className={errors.lastSchoolYear ? "border-destructive" : ""}
          />
          {errors.lastSchoolYear && <p className="text-sm text-destructive">{errors.lastSchoolYear}</p>}
        </div>
      </div>

      {/* Program Information */}
      {data.program && (
        <Alert className="border-success/20 bg-success/5">
          <Info className="h-4 w-4 text-success" />
          <AlertDescription className="text-foreground/80">
            <div>
              <strong className="block mb-1 text-success">Program Information:</strong>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Duration: 4 years (for undergraduate programs)</li>
                <li>Requirements: High school diploma or equivalent</li>
                <li>Application deadline: Check with the registrar</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}