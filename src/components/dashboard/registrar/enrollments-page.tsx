"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Checkbox } from "../../ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Search, Eye, CheckCircle, XCircle, Clock, FileText, Download, User, Mail, Phone, MapPin, UserPlus, IdCard, Users, Loader2 } from "lucide-react";
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, where, getDocs, getDoc } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { createManagedUser } from "../../../lib/firebase-auth";
import { toast } from "sonner@2.0.3";
import { formatDateShort } from "../../../lib/date-formatter";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { 
  formatCredentialsMessage,
  logAccountCreation,
  type AccountCredentials
} from "../../../lib/notification-service";
import { getProgramName } from "../../../lib/program-service";
import { PageHeader } from "../shared/page-header";

interface Enrollment {
  id: string;
  applicationId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  civilStatus: string;
  nationality: string;
  religion: string;
  address: string;
  city: string;
  province: string;
  zipCode: string;
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  guardianEmail: string;
  studentType: string;
  program: string;
  yearLevel: string;
  semester: string;
  schedule: string;
  lastSchoolAttended: string;
  lastSchoolAddress: string;
  lastSchoolYear: string;
  status: string;
  paymentStatus: string;
  submittedAt: any;
  documents: any[];
  amount: number;
  tuitionFee: number;
  accountCreated?: boolean;
  studentId?: string;
  userId?: string;
  referenceNumber?: string;
  paymentMethod?: string;
  paymentType?: string;
}

export function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [studentIdInput, setStudentIdInput] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [createParentAccount, setCreateParentAccount] = useState(false);
  const [parentPasswordGenerated, setParentPasswordGenerated] = useState("");
  const [parentEmail, setParentEmail] = useState("");

  // Real-time enrollments listener
  useEffect(() => {
    const q = query(collection(db, "enrollments"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const enrollmentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Enrollment[];
      setEnrollments(enrollmentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Generate student ID
  const generateStudentId = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}-${random}`;
  };

  // Generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const randomValues = new Uint32Array(12);
    crypto.getRandomValues(randomValues);
    return Array.from(randomValues, value => chars[value % chars.length]).join("");
  };

  const handleApprove = async (enrollment: Enrollment) => {
    if (processing) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, "enrollments", enrollment.id), {
        status: "approved",
        approvedAt: serverTimestamp(),
      });
      const approvedEnrollment = { ...enrollment, status: "approved" };
      setSelectedEnrollment(approvedEnrollment);
      setDetailsOpen(false);
      setActiveTab("approved");
      openCreateAccountDialog(approvedEnrollment);
      toast.success("Application approved. Create the student's account to finish enrollment.");
    } catch (error) {
      console.error("Error approving enrollment:", error);
      toast.error("Failed to approve enrollment");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (enrollmentId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;

    setProcessing(true);
    try {
      await updateDoc(doc(db, "enrollments", enrollmentId), {
        status: "rejected",
        rejectionReason: reason,
        rejectedAt: serverTimestamp(),
      });
      toast.success("Enrollment rejected");
      setDetailsOpen(false);
    } catch (error) {
      console.error("Error rejecting enrollment:", error);
      toast.error("Failed to reject enrollment");
    } finally {
      setProcessing(false);
    }
  };

  const openCreateAccountDialog = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setAccountEmail(enrollment.email);
    setParentEmail(enrollment.guardianEmail);
    setStudentIdInput(generateStudentId());
    setGeneratedPassword(generatePassword());
    setParentPasswordGenerated(generatePassword());
    setCreateParentAccount(false);
    setCreateAccountOpen(true);
  };

  const handleCreateStudentAccount = async () => {
    if (!selectedEnrollment) return;

    const studentId = studentIdInput.trim();
    const studentEmail = accountEmail.trim().toLowerCase();
    const guardianAccountEmail = parentEmail.trim().toLowerCase();

    if (!studentId || !studentEmail || !generatedPassword) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
      toast.error("Enter a valid student email address.");
      return;
    }

    if (generatedPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (createParentAccount && (!guardianAccountEmail || !parentPasswordGenerated)) {
      toast.error("Please provide parent email and password");
      return;
    }

    if (createParentAccount && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianAccountEmail)) {
      toast.error("Enter a valid parent email address.");
      return;
    }

    if (createParentAccount && guardianAccountEmail === studentEmail) {
      toast.error("Student and parent accounts must use different email addresses.");
      return;
    }

    if (createParentAccount && parentPasswordGenerated.length < 6) {
      toast.error("Parent password must be at least 6 characters");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser?.email) {
      toast.error("Your session expired. Please sign in again.");
      return;
    }

    setProcessing(true);
    let studentUserId = "";

    try {
      const enrollmentRef = doc(db, "enrollments", selectedEnrollment.id);
      const enrollmentSnapshot = await getDoc(enrollmentRef);
      if (!enrollmentSnapshot.exists()) {
        toast.error("This application no longer exists.");
        return;
      }

      const latestEnrollment = enrollmentSnapshot.data();
      if (latestEnrollment.status !== "approved") {
        toast.error("Only approved applications can be used to create student accounts.");
        return;
      }
      if (latestEnrollment.accountCreated) {
        toast.info("An account has already been created for this application.");
        setCreateAccountOpen(false);
        return;
      }

      const studentIdQuery = query(
        collection(db, "users"),
        where("studentId", "==", studentId)
      );
      const studentIdSnapshot = await getDocs(studentIdQuery);
      
      if (!studentIdSnapshot.empty) {
        const existingUser = studentIdSnapshot.docs[0].data();
        toast.error(`Student ID ${studentId} is already assigned to ${existingUser.name || "another user"}.`);
        return;
      }

      const fullName = [
        selectedEnrollment.firstName,
        selectedEnrollment.middleName,
        selectedEnrollment.lastName,
      ].filter(Boolean).join(" ");

      studentUserId = await createManagedUser({
        name: fullName,
        email: studentEmail,
        role: "Student",
        status: "active",
        studentId,
        phone: selectedEnrollment.phone,
        dateOfBirth: selectedEnrollment.dateOfBirth,
        gender: selectedEnrollment.gender,
        address: selectedEnrollment.address,
        city: selectedEnrollment.city,
        province: selectedEnrollment.province,
        program: selectedEnrollment.program,
        yearLevel: selectedEnrollment.yearLevel,
        semester: selectedEnrollment.semester,
        guardianName: selectedEnrollment.guardianName,
        guardianPhone: selectedEnrollment.guardianPhone,
        guardianEmail: selectedEnrollment.guardianEmail,
        parentId: null,
      }, generatedPassword);

      let parentUserId = "";
      if (createParentAccount) {
        try {
          parentUserId = await createManagedUser({
            name: selectedEnrollment.guardianName,
            email: guardianAccountEmail,
            role: "Parent",
            status: "active",
            phone: selectedEnrollment.guardianPhone,
            address: selectedEnrollment.address,
            city: selectedEnrollment.city,
            province: selectedEnrollment.province,
            children: [studentUserId],
            linkedStudentId: studentUserId,
          }, parentPasswordGenerated);
        } catch (parentError) {
          console.error("Error creating parent account:", parentError);
          const errorCode = typeof parentError === "object" && parentError !== null && "code" in parentError
            ? String(parentError.code)
            : "";
          if (errorCode === "auth/email-already-in-use") {
            toast.warning("Student account created. The parent email already exists, so no new parent account was created.");
          } else {
            toast.warning("Student account created, but the optional parent account could not be created.");
          }
        }
      }

      if (parentUserId) {
        try {
          await updateDoc(doc(db, "users", studentUserId), { parentId: parentUserId });
        } catch (linkError) {
          console.error("Parent account was created, but the student profile could not be linked:", linkError);
          toast.warning("The parent account was created, but its link could not be saved to the student profile.");
        }
      }

      await updateDoc(enrollmentRef, {
        accountCreated: true,
        studentId,
        userId: studentUserId,
        parentAccountCreated: !!parentUserId,
        parentUserId: parentUserId || null,
        accountCreatedAt: serverTimestamp(),
        accountCreatedBy: currentUser.email,
      });

      const credentials: AccountCredentials = {
        studentName: fullName,
        studentEmail,
        studentPhone: selectedEnrollment.phone,
        studentId,
        studentPassword: generatedPassword,
        parentName: parentUserId ? selectedEnrollment.guardianName : "",
        parentEmail: parentUserId ? guardianAccountEmail : "",
        parentPhone: parentUserId ? selectedEnrollment.guardianPhone : "",
        parentPassword: parentUserId ? parentPasswordGenerated : "",
        collegeName: "CollegeConnect",
        loginUrl: `${window.location.origin}/login`,
      };

      await logAccountCreation(credentials);
      alert(formatCredentialsMessage(credentials));
      toast.success("Student account created successfully.");

      setCreateAccountOpen(false);
      setDetailsOpen(false);
    } catch (error) {
      console.error("Error creating accounts:", error);

      const errorCode = typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (errorCode === "auth/email-already-in-use") {
        toast.error("This email is already registered. Please use a different email.");
      } else if (errorCode === "auth/invalid-email") {
        toast.error("Invalid email address. Please check and try again.");
      } else if (errorCode === "auth/weak-password") {
        toast.error("Password is too weak. Please use a stronger password.");
      } else if (errorCode === "permission-denied") {
        toast.error("Permission denied. Please update your Firebase security rules.");
      } else if (studentUserId) {
        toast.error("The student account was created, but enrollment could not be finalized. Contact an administrator before retrying.");
      } else {
        toast.error(`Failed to create student account: ${errorMessage}`);
      }
    } finally {
      setProcessing(false);
    }
  };

  const viewDetails = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setDetailsOpen(true);
  };

  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesSearch = 
      enrollment.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.applicationId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = enrollment.status === activeTab;
    
    return matchesSearch && matchesTab;
  });
  const accountsPending = enrollments.filter(
    enrollment => enrollment.status === "approved" && !enrollment.accountCreated
  ).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "pending":
        return <Badge variant="outline" className="border-warning text-warning">Pending Verification</Badge>;
      case "verified":
        return <Badge variant="outline" className="border-success text-success">Verified</Badge>;
      case "rejected":
        return <Badge variant="outline" className="border-destructive text-destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{paymentStatus}</Badge>;
    }
  };

  if (loading) {
    return <LoadingState message="Loading enrollments..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Enrollment Queue"
        description="Review and process student enrollment applications"
        icon={Users}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {accountsPending > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                <strong>{accountsPending}</strong> approved student account{accountsPending === 1 ? "" : "s"} still need to be created.
              </p>
              <Button variant="outline" onClick={() => setActiveTab("approved")}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create student accounts
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card className="elevation-sm">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or application ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Pending</span>
              <span className="sm:hidden">Pending</span>
              <span className="ml-1">({enrollments.filter(e => e.status === "pending").length})</span>
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Approved</span>
              <span className="sm:hidden">Approved</span>
              <span className="ml-1">({enrollments.filter(e => e.status === "approved").length})</span>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Rejected</span>
              <span className="sm:hidden">Rejected</span>
              <span className="ml-1">({enrollments.filter(e => e.status === "rejected").length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card className="elevation-sm">
              <CardHeader>
                <CardTitle>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Applications</CardTitle>
                <CardDescription>
                  {filteredEnrollments.length} application{filteredEnrollments.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
            <CardContent>
              {filteredEnrollments.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={`No ${activeTab} applications`}
                  description={searchTerm ? "Try adjusting your search" : `No applications with ${activeTab} status`}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Application ID</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Account Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEnrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell className="font-medium">{enrollment.applicationId}</TableCell>
                          <TableCell>
                            {enrollment.firstName} {enrollment.middleName ? enrollment.middleName + ' ' : ''}{enrollment.lastName}
                          </TableCell>
                          <TableCell>{getProgramName(enrollment.program)}</TableCell>
                          <TableCell>{getPaymentBadge(enrollment.paymentStatus)}</TableCell>
                          <TableCell>
                            {enrollment.accountCreated ? (
                              <Badge variant="default" className="bg-info/10 text-info border-info/20">
                                <UserPlus className="h-3 w-3 mr-1" />
                                Account Created
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                                No Account
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {enrollment.submittedAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewDetails(enrollment)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {enrollment.status === "pending" ? "Review application" : "View details"}
                              </Button>
                              {enrollment.status === "approved" && !enrollment.accountCreated && (
                                <Button
                                  size="sm"
                                  onClick={() => openCreateAccountDialog(enrollment)}
                                >
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Create account
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-h-[90vh] gap-0 overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Enrollment Application Details</DialogTitle>
            <DialogDescription>
              Application ID: {selectedEnrollment?.applicationId}
            </DialogDescription>
          </DialogHeader>

          {selectedEnrollment && (
            <div className="space-y-8 px-6 py-6">
              {/* Status */}
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Application Status</div>
                  <div className="mt-1">{getStatusBadge(selectedEnrollment.status)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Payment Status</div>
                  <div className="mt-1">{getPaymentBadge(selectedEnrollment.paymentStatus)}</div>
                </div>
              </div>

              {/* Personal Information */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/50 p-6 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Full Name</div>
                    <div className="font-medium">
                      {selectedEnrollment.firstName} {selectedEnrollment.middleName || ''} {selectedEnrollment.lastName}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Date of Birth</div>
                    <div className="font-medium">{formatDateShort(selectedEnrollment.dateOfBirth)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Gender</div>
                    <div className="font-medium">{selectedEnrollment.gender}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {selectedEnrollment.email}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <div className="font-medium flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {selectedEnrollment.phone}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Address</div>
                    <div className="font-medium flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      {selectedEnrollment.city}, {selectedEnrollment.province}
                    </div>
                  </div>
                </div>
              </div>

              {/* Guardian Information */}
              <div>
                <h3 className="font-medium mb-3">Guardian Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/50 p-6 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Guardian Name</div>
                    <div className="font-medium">{selectedEnrollment.guardianName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Guardian Phone</div>
                    <div className="font-medium">{selectedEnrollment.guardianPhone}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-muted-foreground">Guardian Email</div>
                    <div className="font-medium">{selectedEnrollment.guardianEmail}</div>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div>
                <h3 className="font-medium mb-3">Academic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/50 p-6 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Student Type</div>
                    <div className="font-medium">{selectedEnrollment.studentType}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Program</div>
                    <div className="font-medium">{getProgramName(selectedEnrollment.program)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Year Level</div>
                    <div className="font-medium">{selectedEnrollment.yearLevel}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Semester</div>
                    <div className="font-medium">{selectedEnrollment.semester}</div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="font-medium mb-3">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/50 p-6 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Tuition Fee</div>
                    <div className="font-medium">₱{selectedEnrollment.tuitionFee?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Amount Paid</div>
                    <div className="font-medium">₱{selectedEnrollment.amount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              {selectedEnrollment.documents && selectedEnrollment.documents.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Uploaded Documents</h3>
                  <div className="space-y-2">
                    {selectedEnrollment.documents.map((doc: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{doc.name || `Document ${index + 1}`}</span>
                        </div>
                        {doc.url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            {selectedEnrollment?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => selectedEnrollment && handleReject(selectedEnrollment.id)}
                  disabled={processing}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => selectedEnrollment && handleApprove(selectedEnrollment)}
                  disabled={processing}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve & Create Account
                </Button>
              </>
            )}
            {selectedEnrollment?.status === "approved" && !selectedEnrollment.accountCreated && (
              <Button
                variant="secondary"
                onClick={() => openCreateAccountDialog(selectedEnrollment)}
                disabled={processing}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Student Account
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog
        open={createAccountOpen}
        onOpenChange={(open) => {
          if (!processing) setCreateAccountOpen(open);
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-h-[90vh] gap-0 overflow-y-auto sm:max-w-3xl">
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateStudentAccount();
            }}
          >
            <DialogHeader>
              <DialogTitle>Create Student Account</DialogTitle>
              <DialogDescription>
                Approved application {selectedEnrollment?.applicationId}. Confirm the account details below.
              </DialogDescription>
            </DialogHeader>

            {selectedEnrollment && (
              <div className="space-y-6 px-6 py-6">
                <div className="grid gap-3 rounded-lg bg-muted/50 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Student</p>
                    <p className="font-medium">
                      {selectedEnrollment.firstName} {selectedEnrollment.middleName || ""} {selectedEnrollment.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Program</p>
                    <p className="font-medium">{getProgramName(selectedEnrollment.program)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Year and semester</p>
                    <p className="font-medium">{selectedEnrollment.yearLevel} · {selectedEnrollment.semester}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Application email</p>
                    <p className="break-all font-medium">{selectedEnrollment.email}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input
                      id="studentId"
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value)}
                      className="mt-1"
                      placeholder="e.g., 2025-1234"
                      required
                      disabled={processing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountEmail">Student email</Label>
                    <Input
                      id="accountEmail"
                      type="email"
                      value={accountEmail}
                      onChange={(e) => setAccountEmail(e.target.value)}
                      className="mt-1"
                      placeholder="student@example.com"
                      autoComplete="email"
                      required
                      disabled={processing}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="generatedPassword">Temporary password</Label>
                    <Input
                      id="generatedPassword"
                      value={generatedPassword}
                      onChange={(e) => setGeneratedPassword(e.target.value)}
                      className="mt-1"
                      autoComplete="new-password"
                      required
                      disabled={processing}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Save this password securely; it will be included in the credentials summary.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="createParent"
                      checked={createParentAccount}
                      onCheckedChange={(checked) => setCreateParentAccount(checked === true)}
                      disabled={processing}
                    />
                    <Label htmlFor="createParent" className="cursor-pointer">
                      Also create and link a parent/guardian account
                    </Label>
                  </div>

                  {createParentAccount && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="parentEmail">Parent email</Label>
                        <Input
                          id="parentEmail"
                          type="email"
                          value={parentEmail}
                          onChange={(e) => setParentEmail(e.target.value)}
                          className="mt-1"
                          placeholder="parent@example.com"
                          required
                          disabled={processing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="parentPassword">Temporary parent password</Label>
                        <Input
                          id="parentPassword"
                          value={parentPasswordGenerated}
                          onChange={(e) => setParentPasswordGenerated(e.target.value)}
                          className="mt-1"
                          required
                          disabled={processing}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateAccountOpen(false)}
                disabled={processing}
              >
                Close
              </Button>
              <Button type="submit" disabled={processing || !selectedEnrollment}>
                {processing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <IdCard className="mr-2 h-4 w-4" />
                )}
                {processing ? "Creating account..." : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}