"use client";

import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Alert, AlertDescription } from "../ui/alert";
import { Info, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { formatPhoneNumber } from "../../lib/phone-formatter";

interface StepOneData {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: Date | undefined;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  guardianEmail: string;
  gender: string;
  civilStatus: string;
  nationality: string;
  religion: string;
  province: string;
}

interface StepOneProps {
  data: StepOneData;
  onChange: (data: Partial<StepOneData>) => void;
  errors?: Partial<Record<keyof StepOneData, string>>;
}

// Helper functions for date picker
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= 1940; i--) {
    years.push(i);
  }
  return years;
};

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month, 0).getDate();
};

export function StepOne({ data, onChange, errors = {} }: StepOneProps) {
  // Extract date parts
  const selectedYear = data.dateOfBirth?.getFullYear();
  const selectedMonth = data.dateOfBirth ? data.dateOfBirth.getMonth() + 1 : undefined;
  const selectedDay = data.dateOfBirth?.getDate();

  const handleDateChange = (type: 'year' | 'month' | 'day', value: string) => {
    const numValue = parseInt(value);
    const year = type === 'year' ? numValue : (selectedYear || new Date().getFullYear());
    const month = type === 'month' ? numValue : (selectedMonth || 1);
    const day = type === 'day' ? numValue : (selectedDay || 1);

    // Validate and create date
    const maxDays = getDaysInMonth(month, year);
    const validDay = Math.min(day, maxDays);
    
    const newDate = new Date(year, month - 1, validDay);
    onChange({ dateOfBirth: newDate });
  };

  const currentDaysInMonth = selectedYear && selectedMonth 
    ? getDaysInMonth(selectedMonth, selectedYear) 
    : 31;

  return (
    <div className="space-y-8">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-foreground/80">
          All fields marked with <span className="text-destructive">*</span> are required. Make sure to provide accurate information as it will be used for your official records.
        </AlertDescription>
      </Alert>

      {/* Personal Information */}
      <div className="space-y-5">
        <div className="pb-2 border-b-2 border-primary/10">
          <h3 className="text-lg text-primary">Personal Information</h3>
          <p className="text-sm text-muted-foreground mt-1">Please enter your personal details</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="firstName">First Name *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enter your legal first name as it appears on official documents</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="firstName"
              value={data.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
              placeholder="Juan"
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? "firstName-error" : undefined}
              className={errors.firstName ? "border-destructive" : ""}
            />
            {errors.firstName && (
              <p id="firstName-error" className="text-sm text-destructive">
                {errors.firstName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="middleName">Middle Name</Label>
            <Input
              id="middleName"
              value={data.middleName}
              onChange={(e) => onChange({ middleName: e.target.value })}
              placeholder="Santos"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={data.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
              placeholder="Dela Cruz"
              aria-invalid={!!errors.lastName}
              className={errors.lastName ? "border-destructive" : ""}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Date of Birth *</Label>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Select 
                value={selectedMonth?.toString()} 
                onValueChange={(value) => handleDateChange('month', value)}
              >
                <SelectTrigger className={errors.dateOfBirth ? "border-destructive" : ""}>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Select 
                value={selectedDay?.toString()} 
                onValueChange={(value) => handleDateChange('day', value)}
              >
                <SelectTrigger className={errors.dateOfBirth ? "border-destructive" : ""}>
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: currentDaysInMonth }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Select 
                value={selectedYear?.toString()} 
                onValueChange={(value) => handleDateChange('year', value)}
              >
                <SelectTrigger className={errors.dateOfBirth ? "border-destructive" : ""}>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {generateYears().map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {errors.dateOfBirth && (
            <p className="text-sm text-destructive">{errors.dateOfBirth}</p>
          )}
          {data.dateOfBirth && (
            <p className="text-sm text-muted-foreground">
              Selected: {data.dateOfBirth.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender *</Label>
          <Select 
            value={data.gender} 
            onValueChange={(value) => onChange({ gender: value })}
          >
            <SelectTrigger className={errors.gender ? "border-destructive" : ""}>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && (
            <p className="text-sm text-destructive">{errors.gender}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="civilStatus">Civil Status *</Label>
          <Select 
            value={data.civilStatus} 
            onValueChange={(value) => onChange({ civilStatus: value })}
          >
            <SelectTrigger className={errors.civilStatus ? "border-destructive" : ""}>
              <SelectValue placeholder="Select civil status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Single">Single</SelectItem>
              <SelectItem value="Married">Married</SelectItem>
              <SelectItem value="Widowed">Widowed</SelectItem>
              <SelectItem value="Separated">Separated</SelectItem>
              <SelectItem value="Divorced">Divorced</SelectItem>
            </SelectContent>
          </Select>
          {errors.civilStatus && (
            <p className="text-sm text-destructive">{errors.civilStatus}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nationality">Nationality *</Label>
          <Input
            id="nationality"
            value={data.nationality}
            onChange={(e) => onChange({ nationality: e.target.value })}
            placeholder="Filipino"
            aria-invalid={!!errors.nationality}
            className={errors.nationality ? "border-destructive" : ""}
          />
          {errors.nationality && <p className="text-sm text-destructive">{errors.nationality}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="religion">Religion *</Label>
          <Input
            id="religion"
            value={data.religion}
            onChange={(e) => onChange({ religion: e.target.value })}
            placeholder="Roman Catholic"
            aria-invalid={!!errors.religion}
            className={errors.religion ? "border-destructive" : ""}
          />
          {errors.religion && <p className="text-sm text-destructive">{errors.religion}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="province">Province *</Label>
          <Input
            id="province"
            value={data.province}
            onChange={(e) => onChange({ province: e.target.value })}
            placeholder="Metro Manila"
            aria-invalid={!!errors.province}
            className={errors.province ? "border-destructive" : ""}
          />
          {errors.province && <p className="text-sm text-destructive">{errors.province}</p>}
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-5">
        <div className="pb-2 border-b-2 border-primary/10">
          <h3 className="text-lg text-primary">Contact Information</h3>
          <p className="text-sm text-muted-foreground mt-1">How can we reach you?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="juan.delacruz@example.com"
              aria-invalid={!!errors.email}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formatPhoneNumber(data.phone)}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="+63 912 345 6789"
              aria-invalid={!!errors.phone}
              className={errors.phone ? "border-destructive" : ""}
            />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Street Address *</Label>
          <Input
            id="address"
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="123 Rizal Street, Barangay San Juan"
            aria-invalid={!!errors.address}
            className={errors.address ? "border-destructive" : ""}
          />
          {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City/Municipality *</Label>
            <Input
              id="city"
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="Manila"
              aria-invalid={!!errors.city}
              className={errors.city ? "border-destructive" : ""}
            />
            {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">Province/Region *</Label>
            <Input
              id="state"
              value={data.state}
              onChange={(e) => onChange({ state: e.target.value })}
              placeholder="Metro Manila"
              aria-invalid={!!errors.state}
              className={errors.state ? "border-destructive" : ""}
            />
            {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="zipCode">ZIP/Postal Code *</Label>
            <Input
              id="zipCode"
              value={data.zipCode}
              onChange={(e) => onChange({ zipCode: e.target.value })}
              placeholder="1000"
              aria-invalid={!!errors.zipCode}
              className={errors.zipCode ? "border-destructive" : ""}
            />
            {errors.zipCode && <p className="text-sm text-destructive">{errors.zipCode}</p>}
          </div>
        </div>
      </div>

      {/* Parent/Guardian Information - Always Required */}
      <div className="space-y-5 p-6 border-2 rounded-xl bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg text-primary">Parent/Guardian Information</h3>
            <p className="text-sm text-foreground/70 mt-1.5">
              Required for all students. This information will be used to create a linked parent account for monitoring academic progress.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="guardianName">Guardian Full Name *</Label>
            <Input
              id="guardianName"
              value={data.guardianName}
              onChange={(e) => onChange({ guardianName: e.target.value })}
              placeholder="Maria Dela Cruz"
              aria-invalid={!!errors.guardianName}
              className={errors.guardianName ? "border-destructive" : ""}
            />
            {errors.guardianName && (
              <p className="text-sm text-destructive">{errors.guardianName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardianRelationship">Relationship *</Label>
            <Select 
              value={data.guardianRelationship} 
              onValueChange={(value) => onChange({ guardianRelationship: value })}
            >
              <SelectTrigger className={errors.guardianRelationship ? "border-destructive" : ""}>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mother">Mother</SelectItem>
                <SelectItem value="Father">Father</SelectItem>
                <SelectItem value="Legal Guardian">Legal Guardian</SelectItem>
                <SelectItem value="Grandfather">Grandfather</SelectItem>
                <SelectItem value="Grandmother">Grandmother</SelectItem>
                <SelectItem value="Uncle">Uncle</SelectItem>
                <SelectItem value="Aunt">Aunt</SelectItem>
                <SelectItem value="Sibling">Sibling</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.guardianRelationship && (
              <p className="text-sm text-destructive">{errors.guardianRelationship}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="guardianPhone">Guardian Phone *</Label>
            <Input
              id="guardianPhone"
              type="tel"
              value={formatPhoneNumber(data.guardianPhone)}
              onChange={(e) => onChange({ guardianPhone: e.target.value })}
              placeholder="+63 912 345 6789"
              aria-invalid={!!errors.guardianPhone}
              className={errors.guardianPhone ? "border-destructive" : ""}
            />
            {errors.guardianPhone && (
              <p className="text-sm text-destructive">{errors.guardianPhone}</p>
            )}
            <p className="text-xs text-muted-foreground">Parent will receive account credentials via SMS/email</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardianEmail">Guardian Email *</Label>
            <Input
              id="guardianEmail"
              type="email"
              value={data.guardianEmail}
              onChange={(e) => onChange({ guardianEmail: e.target.value })}
              placeholder="maria.delacruz@example.com"
              aria-invalid={!!errors.guardianEmail}
              className={errors.guardianEmail ? "border-destructive" : ""}
            />
            {errors.guardianEmail && (
              <p className="text-sm text-destructive">{errors.guardianEmail}</p>
            )}
            <p className="text-xs text-muted-foreground">Parent account will be created with this email</p>
          </div>
        </div>
      </div>
    </div>
  );
}