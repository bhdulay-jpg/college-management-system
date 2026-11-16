"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { Calendar, Clock, Save, AlertCircle, CheckCircle } from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { toast } from "sonner@2.0.3";
import { LoadingState } from "../loading-state";
import { getEnrollmentPeriodStatus } from "../../lib/enrollment-period";

interface EnrollmentPeriod {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  lastUpdatedBy?: string;
  lastUpdatedAt?: any;
}

export function EnrollmentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enrollmentPeriod, setEnrollmentPeriod] = useState<EnrollmentPeriod>({
    startDate: "",
    endDate: "",
    startTime: "08:00",
    endTime: "17:00",
    isActive: false,
  });

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");

  useEffect(() => {
    loadEnrollmentPeriod();
  }, []);

  const loadEnrollmentPeriod = async () => {
    try {
      const docRef = doc(db, "settings", "enrollmentPeriod");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as EnrollmentPeriod;
        setEnrollmentPeriod(data);
        setStartDate(data.startDate);
        setEndDate(data.endDate);
        setStartTime(data.startTime || "08:00");
        setEndTime(data.endTime || "17:00");
      }
      setLoading(false);
    } catch (error) {
      console.error("Error loading enrollment period:", error);
      toast.error("Failed to load enrollment period");
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!startDate || !endDate || !startTime || !endTime) {
      toast.error("Please provide both dates and times");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date must be before end date");
      return;
    }

    // Check if same day, validate times
    if (startDate === endDate && startTime >= endTime) {
      toast.error("End time must be after start time on the same day");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("You must be logged in");
      return;
    }

    setSaving(true);

    try {
      const now = new Date();
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${endDate}T${endTime}`);
      const isActive = now >= startDateTime && now <= endDateTime;

      const enrollmentData: EnrollmentPeriod = {
        startDate,
        endDate,
        startTime,
        endTime,
        isActive,
        lastUpdatedBy: currentUser.email || "Unknown",
        lastUpdatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "settings", "enrollmentPeriod"), enrollmentData);
      
      setEnrollmentPeriod(enrollmentData);
      toast.success("Enrollment period updated successfully!");
    } catch (error: any) {
      console.error("Error saving enrollment period:", error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getEnrollmentStatus = () => {
    if (!enrollmentPeriod.startDate || !enrollmentPeriod.endDate) {
      return { text: "Not Configured", color: "text-gray-600", variant: "secondary" as const };
    }

    const status = getEnrollmentPeriodStatus(enrollmentPeriod);
    if (status === "upcoming") {
      return { text: "Upcoming", color: "text-blue-600", variant: "default" as const };
    } else if (status === "closed") {
      return { text: "Closed", color: "text-red-600", variant: "destructive" as const };
    } else {
      return { text: "Active", color: "text-green-600", variant: "default" as const };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    if (!time) return "Not set";
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return <LoadingState message="Loading enrollment settings..." />;
  }

  const status = getEnrollmentStatus();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Enrollment Period Management
        </h2>
        <p className="text-muted-foreground">
          Configure when students can enroll in subjects
        </p>
      </div>

      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Enrollment Period</CardTitle>
            <Badge variant={status.variant} className="text-sm">
              <Clock className="mr-1 h-3 w-3" />
              {status.text}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {enrollmentPeriod.startDate && enrollmentPeriod.endDate ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Start</div>
                  <div className="font-medium">{formatDate(enrollmentPeriod.startDate)}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    at {formatTime(enrollmentPeriod.startTime)}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">End</div>
                  <div className="font-medium">{formatDate(enrollmentPeriod.endDate)}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    at {formatTime(enrollmentPeriod.endTime)}
                  </div>
                </div>
              </div>

              {status.text === "Active" && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Enrollment is currently open. Students can enroll in subjects until{" "}
                    {formatDate(enrollmentPeriod.endDate)} at {formatTime(enrollmentPeriod.endTime)}.
                  </AlertDescription>
                </Alert>
              )}

              {status.text === "Closed" && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Enrollment period has ended. Configure a new period to allow student enrollment.
                  </AlertDescription>
                </Alert>
              )}

              {status.text === "Upcoming" && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Enrollment will open on {formatDate(enrollmentPeriod.startDate)} at {formatTime(enrollmentPeriod.startTime)}.
                  </AlertDescription>
                </Alert>
              )}

              {enrollmentPeriod.lastUpdatedBy && (
                <div className="text-xs text-muted-foreground">
                  Last updated by {enrollmentPeriod.lastUpdatedBy}
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No enrollment period has been configured yet. Set the dates below to enable student enrollment.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Update Enrollment Period</CardTitle>
          <CardDescription>
            Set the start and end dates for the next enrollment period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                When enrollment opens for students
              </p>
            </div>

            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                When enrollment closes for students
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                When enrollment opens for students
              </p>
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
              <p className="text-xs text-muted-foreground mt-1">
                When enrollment closes for students
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={loadEnrollmentPeriod}
              disabled={saving}
            >
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-medium text-xs">1</span>
              </div>
              <p>
                Students can only enroll in subjects during the active enrollment period
              </p>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-medium text-xs">2</span>
              </div>
              <p>
                The system automatically determines if enrollment is open based on the current date
              </p>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-medium text-xs">3</span>
              </div>
              <p>
                You can update the enrollment period at any time to extend or modify the dates
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}