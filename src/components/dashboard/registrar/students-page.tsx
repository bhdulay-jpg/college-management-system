"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Search, Eye, GraduationCap, Edit, Save, X, User, Mail, Phone, MapPin, Calendar, Users, AlertCircle, UserPlus, ArrowRight, BookOpen, Link2, UserCheck } from "lucide-react";
import { collection, query, onSnapshot, where, doc, updateDoc, serverTimestamp, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { toast } from "sonner@2.0.3";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { formatDateShort } from "../../../lib/date-formatter";
import { useRouter } from "../../router";
import { getProgramByCode, formatProgramDisplay } from "../../../lib/program-service";
import { extractProgramCode } from "../../../lib/program-utils";
import { ParentAccountDisplay } from "../parent-account-display";
import { BSCS_CURRICULUM } from "../../../lib/curriculum-data";
import { PageHeader } from "../shared/page-header";
import { usePrograms } from "../../../hooks/use-programs";

interface Student {
  id: string;
  uid: string;
  name: string;
  email: string;
  studentId?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  province?: string;
  program?: string;
  yearLevel?: string;
  semester?: string;
  enrollmentType?: string;
  section?: string; // Added section field
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  parentId?: string;
  status?: string;
  role: string;
  createdAt?: any;
  lastLogin?: any;
}

interface PendingEnrollment {
  id: string;
  applicationId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  program: string;
  status: string;
  accountCreated?: boolean;
}

interface EditFormData {
  name: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  city: string;
  province: string;
  program: string;
  yearLevel: string;
  semester: string;
  enrollmentType: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
}

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SEMESTERS = ["1st Semester", "2nd Semester", "Summer"];
const GENDERS = ["Male", "Female"];

export function StudentsPage() {
  const { programs } = usePrograms();
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Edit mode states
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingAcademic, setEditingAcademic] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState(false);
  const [linkingParent, setLinkingParent] = useState(false);
  const [parentEmailInput, setParentEmailInput] = useState("");
  const [searchingParent, setSearchingParent] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    city: "",
    province: "",
    program: "",
    yearLevel: "",
    semester: "",
    enrollmentType: "",
    guardianName: "",
    guardianPhone: "",
    guardianEmail: "",
  });

  // Real-time students listener from users collection
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "Student"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Student[];
      setStudents(studentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen for approved enrollments without accounts
  useEffect(() => {
    const q = query(
      collection(db, "enrollments"), 
      where("status", "==", "approved")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const approvedEnrollments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PendingEnrollment[];
      
      const needAccounts = approvedEnrollments.filter(e => !e.accountCreated);
      setPendingApprovals(needAccounts);
    });

    return () => unsubscribe();
  }, []);

  const openDetailsDialog = (student: Student) => {
    setSelectedStudent(student);
    setEditingPersonal(false);
    setEditingAcademic(false);
    setEditingGuardian(false);
    setLinkingParent(false);
    setParentEmailInput("");
    setSearchingParent(false);
    
    // Initialize edit form with current student data
    setEditForm({
      name: student.name || "",
      phone: student.phone || "",
      dateOfBirth: student.dateOfBirth || "",
      gender: student.gender || "",
      address: student.address || "",
      city: student.city || "",
      province: student.province || "",
      program: extractProgramCode(student.program || ""),
      yearLevel: student.yearLevel || "",
      semester: student.semester || "",
      enrollmentType: student.enrollmentType || "",
      guardianName: student.guardianName || "",
      guardianPhone: student.guardianPhone || "",
      guardianEmail: student.guardianEmail || "",
    });
    
    setDetailsOpen(true);
  };

  const handleSavePersonal = async () => {
    if (!selectedStudent) return;

    if (!editForm.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", selectedStudent.id), {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        dateOfBirth: editForm.dateOfBirth || null,
        gender: editForm.gender || null,
        address: editForm.address.trim() || null,
        city: editForm.city.trim() || null,
        province: editForm.province.trim() || null,
        updatedAt: serverTimestamp(),
      });
      
      toast.success("Personal information updated successfully!");
      setEditingPersonal(false);
    } catch (error) {
      console.error("Error updating personal info:", error);
      toast.error("Failed to update personal information");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAcademic = async () => {
    if (!selectedStudent) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", selectedStudent.id), {
        program: editForm.program || null,
        yearLevel: editForm.yearLevel || null,
        semester: editForm.semester || null,
        updatedAt: serverTimestamp(),
      });
      
      toast.success("Academic information updated successfully!");
      setEditingAcademic(false);
    } catch (error) {
      console.error("Error updating academic info:", error);
      toast.error("Failed to update academic information");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGuardian = async () => {
    if (!selectedStudent) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", selectedStudent.id), {
        guardianName: editForm.guardianName.trim() || null,
        guardianPhone: editForm.guardianPhone.trim() || null,
        guardianEmail: editForm.guardianEmail.trim() || null,
        updatedAt: serverTimestamp(),
      });
      
      toast.success("Guardian information updated successfully!");
      setEditingGuardian(false);
    } catch (error) {
      console.error("Error updating guardian info:", error);
      toast.error("Failed to update guardian information");
    } finally {
      setSaving(false);
    }
  };

  const handleLinkParent = async () => {
    if (!selectedStudent) return;

    const email = parentEmailInput.trim().toLowerCase();
    if (!email) {
      toast.error("Please enter a parent email address");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSearchingParent(true);
    try {
      // Search for parent account by email
      const parentsQuery = query(
        collection(db, "users"),
        where("role", "==", "Parent"),
        where("email", "==", email)
      );
      
      const querySnapshot = await getDocs(parentsQuery);
      
      if (querySnapshot.empty) {
        toast.error("No parent account found with this email address");
        setSearchingParent(false);
        return;
      }

      const parentDoc = querySnapshot.docs[0];
      const parentId = parentDoc.id;

      // Link parent to student
      await updateDoc(doc(db, "users", selectedStudent.id), {
        parentId: parentId,
        parentLinkedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Parent account linked successfully!");
      setLinkingParent(false);
      setParentEmailInput("");
    } catch (error) {
      console.error("Error linking parent:", error);
      toast.error("Failed to link parent account");
    } finally {
      setSearchingParent(false);
    }
  };

  const handleUnlinkParent = async () => {
    if (!selectedStudent) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", selectedStudent.id), {
        parentId: null,
        parentUnlinkedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Parent account unlinked successfully!");
    } catch (error) {
      console.error("Error unlinking parent:", error);
      toast.error("Failed to unlink parent account");
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.name.toLowerCase().includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower) ||
      (student.studentId && student.studentId.toLowerCase().includes(searchLower)) ||
      (student.program && student.program.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return <LoadingState message="Loading student records..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Student Records"
        description="View and manage enrolled students"
        icon={UserCheck}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">

        {/* Alert for Pending Account Creation */}
        {pendingApprovals.length > 0 && (
          <Alert className="elevation-sm">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span>
                You have <strong>{pendingApprovals.length}</strong> approved enrollment{pendingApprovals.length > 1 ? 's' : ''} waiting for account creation.
                Students will appear in this list after you create their accounts.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.navigate("dashboard/registrar/enrollments")}
                className="w-full sm:w-auto"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Go to Enrollment Queue
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <Card className="elevation-sm">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, student ID, or program..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card className="elevation-sm">
          <CardHeader>
            <CardTitle>Enrolled Students ({filteredStudents.length})</CardTitle>
            <CardDescription>All students with active accounts</CardDescription>
          </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No students found"
              description={searchTerm ? "Try adjusting your search" : "No enrolled students yet"}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-sm">
                        {student.studentId || "N/A"}
                      </TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.program ? formatProgramDisplay(student.program) : "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailsDialog(student)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-h-[90vh] gap-0 overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              View and edit student information
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <Tabs defaultValue="personal" className="w-full space-y-4 px-6 pb-6">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="academic">Academic Info</TabsTrigger>
                <TabsTrigger value="guardian">Guardian Info</TabsTrigger>
                <TabsTrigger value="parent">Parent Account</TabsTrigger>
              </TabsList>

              {/* Personal Information Tab */}
              <TabsContent value="personal" className="space-y-6 mt-6">
                {/* Personal Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Personal Information
                      </div>
                      {!editingPersonal && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingPersonal(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editingPersonal ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                              id="name"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              placeholder="Enter full name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              value={editForm.phone}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                              placeholder="Enter phone number"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="dateOfBirth">Date of Birth</Label>
                            <Input
                              id="dateOfBirth"
                              type="date"
                              value={editForm.dateOfBirth}
                              onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="gender">Gender</Label>
                            <Select value={editForm.gender} onValueChange={(value) => setEditForm({ ...editForm, gender: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                {GENDERS.map(gender => (
                                  <SelectItem key={gender} value={gender}>{gender}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                              id="address"
                              value={editForm.address}
                              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                              placeholder="Enter street address"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input
                              id="city"
                              value={editForm.city}
                              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                              placeholder="Enter city"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="province">Province</Label>
                            <Input
                              id="province"
                              value={editForm.province}
                              onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                              placeholder="Enter province"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button onClick={handleSavePersonal} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditForm({
                                ...editForm,
                                name: selectedStudent.name || "",
                                phone: selectedStudent.phone || "",
                                dateOfBirth: selectedStudent.dateOfBirth || "",
                                gender: selectedStudent.gender || "",
                                address: selectedStudent.address || "",
                                city: selectedStudent.city || "",
                                province: selectedStudent.province || "",
                              });
                              setEditingPersonal(false);
                            }}
                            disabled={saving}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Full Name</div>
                          <div className="font-medium">{selectedStudent.name}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Student ID</div>
                          <div className="font-medium font-mono">
                            {selectedStudent.studentId || "Not assigned"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Email</div>
                          <div className="font-medium flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {selectedStudent.email}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Phone</div>
                          <div className="font-medium flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {selectedStudent.phone || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Date of Birth</div>
                          <div className="font-medium flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {selectedStudent.dateOfBirth ? formatDateShort(selectedStudent.dateOfBirth) : "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Gender</div>
                          <div className="font-medium">{selectedStudent.gender || "N/A"}</div>
                        </div>
                        <div className="md:col-span-2">
                          <div className="text-sm text-muted-foreground">Address</div>
                          <div className="font-medium flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            {selectedStudent.address ? 
                              `${selectedStudent.address}, ${selectedStudent.city}, ${selectedStudent.province}` 
                              : "N/A"
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Academic Information Tab */}
              <TabsContent value="academic" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Academic Information
                      </div>
                      {!editingAcademic && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingAcademic(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editingAcademic ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="program">Program</Label>
                            <Select value={editForm.program} onValueChange={(value) => setEditForm({ ...editForm, program: value })}>
                              <SelectTrigger>
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
                          <div className="space-y-2">
                            <Label htmlFor="yearLevel">Year Level</Label>
                            <Select value={editForm.yearLevel} onValueChange={(value) => setEditForm({ ...editForm, yearLevel: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select year level" />
                              </SelectTrigger>
                              <SelectContent>
                                {YEAR_LEVELS.map(year => (
                                  <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="semester">Semester</Label>
                            <Select value={editForm.semester} onValueChange={(value) => setEditForm({ ...editForm, semester: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select semester" />
                              </SelectTrigger>
                              <SelectContent>
                                {SEMESTERS.map(sem => (
                                  <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button onClick={handleSaveAcademic} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditForm({
                                ...editForm,
                                program: extractProgramCode(selectedStudent.program || ""),
                                yearLevel: selectedStudent.yearLevel || "",
                                semester: selectedStudent.semester || "",
                              });
                              setEditingAcademic(false);
                            }}
                            disabled={saving}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Program</div>
                          <div className="font-medium">{selectedStudent.program ? formatProgramDisplay(selectedStudent.program) : "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Year Level</div>
                          <div className="font-medium">
                            <Badge variant="secondary">{selectedStudent.yearLevel || "N/A"}</Badge>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Semester</div>
                          <div className="font-medium">{selectedStudent.semester || "N/A"}</div>
                        </div>
                        <div className="md:col-span-2">
                          <div className="text-sm text-muted-foreground">Enrollment Date</div>
                          <div className="font-medium">
                            {selectedStudent.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Guardian Information Tab */}
              <TabsContent value="guardian" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Guardian/Parent Information
                      </div>
                      {!editingGuardian && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingGuardian(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editingGuardian ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="guardianName">Guardian Name</Label>
                            <Input
                              id="guardianName"
                              value={editForm.guardianName}
                              onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })}
                              placeholder="Enter guardian name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="guardianPhone">Guardian Phone</Label>
                            <Input
                              id="guardianPhone"
                              value={editForm.guardianPhone}
                              onChange={(e) => setEditForm({ ...editForm, guardianPhone: e.target.value })}
                              placeholder="Enter guardian phone"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="guardianEmail">Guardian Email</Label>
                            <Input
                              id="guardianEmail"
                              type="email"
                              value={editForm.guardianEmail}
                              onChange={(e) => setEditForm({ ...editForm, guardianEmail: e.target.value })}
                              placeholder="Enter guardian email"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button onClick={handleSaveGuardian} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditForm({
                                ...editForm,
                                guardianName: selectedStudent.guardianName || "",
                                guardianPhone: selectedStudent.guardianPhone || "",
                                guardianEmail: selectedStudent.guardianEmail || "",
                              });
                              setEditingGuardian(false);
                            }}
                            disabled={saving}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Guardian Name</div>
                          <div className="font-medium">{selectedStudent.guardianName || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Guardian Phone</div>
                          <div className="font-medium flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {selectedStudent.guardianPhone || "N/A"}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <div className="text-sm text-muted-foreground">Guardian Email</div>
                          <div className="font-medium flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {selectedStudent.guardianEmail || "N/A"}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Parent Account Tab */}
              <TabsContent value="parent" className="space-y-6 mt-6">
                {selectedStudent.parentId && !linkingParent ? (
                  <div className="space-y-4">
                    <ParentAccountDisplay parentId={selectedStudent.parentId} />
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Manage Parent Link</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Unlinking this parent account will remove their access to view this student's information.
                            </AlertDescription>
                          </Alert>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setLinkingParent(true)}
                            >
                              <Link2 className="h-4 w-4 mr-2" />
                              Change Parent Account
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleUnlinkParent}
                              disabled={saving}
                            >
                              <X className="h-4 w-4 mr-2" />
                              {saving ? "Unlinking..." : "Unlink Parent"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Link Parent Account
                      </CardTitle>
                      <CardDescription>
                        Search for an existing parent account by email to link to this student
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Enter the email address of an existing parent account. The parent must already have an account in the system.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <Label htmlFor="parentEmail">Parent Email Address</Label>
                          <Input
                            id="parentEmail"
                            type="email"
                            value={parentEmailInput}
                            onChange={(e) => setParentEmailInput(e.target.value)}
                            placeholder="parent@example.com"
                            disabled={searchingParent}
                          />
                          <p className="text-xs text-muted-foreground">
                            The email must match an existing parent account exactly
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleLinkParent}
                            disabled={searchingParent || !parentEmailInput.trim()}
                          >
                            <Link2 className="h-4 w-4 mr-2" />
                            {searchingParent ? "Searching..." : "Link Parent Account"}
                          </Button>
                          {selectedStudent.parentId && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setLinkingParent(false);
                                setParentEmailInput("");
                              }}
                              disabled={searchingParent}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals ({pendingApprovals.length})</CardTitle>
            <CardDescription>Enrollments awaiting account creation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovals.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-mono text-sm">
                        {enrollment.applicationId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {enrollment.firstName} {enrollment.middleName ? enrollment.middleName + " " : ""} {enrollment.lastName}
                      </TableCell>
                      <TableCell>{enrollment.email}</TableCell>
                      <TableCell>{enrollment.program ? formatProgramDisplay(enrollment.program) : "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.navigate("dashboard/registrar/enrollments")}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Go to Enrollments
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}