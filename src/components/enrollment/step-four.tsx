"use client";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Edit2, User, GraduationCap, FileText } from "lucide-react";
import { UploadedFile } from "./cloudinary-uploader";

interface ReviewData {
  // Step 1
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
  
  // Step 2
  school: string;
  program: string;
  yearLevel: string;
  schedule: string;
  semester: string;
  
  // Step 3
  files: UploadedFile[];
}

interface StepFourProps {
  data: ReviewData;
  agreedToTerms: boolean;
  onAgreeToTerms: (agreed: boolean) => void;
  onEdit: (step: number) => void;
}

export function StepFour({ data, agreedToTerms, onAgreeToTerms, onEdit }: StepFourProps) {
  const isMinor = data.dateOfBirth
    ? new Date().getFullYear() - data.dateOfBirth.getFullYear() < 18
    : false;

  const formatDate = (date: Date | undefined) => {
    if (!date) return "—";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Personal Information</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(0)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Full Name</div>
              <div>
                {data.firstName} {data.middleName} {data.lastName}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Date of Birth</div>
              <div>{formatDate(data.dateOfBirth)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div>{data.email || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Phone</div>
              <div>{data.phone || "—"}</div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="text-sm text-muted-foreground mb-1">Address</div>
            <div>
              {data.address || "—"}
              {data.city && data.state && `, ${data.city}, ${data.state} ${data.zipCode}`}
            </div>
          </div>

          {/* Always show parent/guardian information since students provide it during enrollment */}
          {(data.guardianName || data.guardianPhone || data.guardianEmail) && (
            <>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  Parent/Guardian Information
                  {isMinor && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Required for Minor</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Parent/Guardian Name</div>
                    <div>{data.guardianName || "—"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Relationship</div>
                    <div>{data.guardianRelationship || "—"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Contact Number</div>
                    <div>{data.guardianPhone || "—"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Email Address</div>
                    <div>{data.guardianEmail || "—"}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Program Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            <CardTitle>Program Selection</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(1)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">School/College</div>
              <div>{data.school || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Program</div>
              <div>{data.program || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Year Level</div>
              <div>{data.yearLevel || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Academic Term</div>
              <div>{data.semester || "—"}</div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="text-sm text-muted-foreground">Schedule Preference</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{data.schedule || "Not selected"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Uploaded Documents</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(2)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          {data.files.length > 0 ? (
            <div className="space-y-2">
              {data.files
                .filter((f) => f.status === "success")
                .map((file, index) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">Uploaded</Badge>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No documents uploaded</p>
          )}
        </CardContent>
      </Card>

      {/* Terms and conditions */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => onAgreeToTerms(checked as boolean)}
            />
            <label htmlFor="terms" className="text-sm cursor-pointer select-none">
              I confirm that all information provided in this application is accurate and complete. 
              I understand that providing false information may result in the rejection of my application 
              or dismissal from the institution. I have read and agree to the{" "}
              <a href="/terms" className="text-primary hover:underline" target="_blank">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-primary hover:underline" target="_blank">
                Privacy Policy
              </a>
              .
            </label>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <p className="text-muted-foreground">
              <strong>Important:</strong> This application will create an enrollment application record. 
              Your actual student account will be created by an administrator after your application is 
              reviewed and approved.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}