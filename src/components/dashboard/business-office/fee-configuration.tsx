"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { 
  Settings,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  BookOpen,
  Award
} from "lucide-react";
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { toast } from "sonner@2.0.3";
import { formatProgramDisplay } from "../../../lib/program-service";
import { MultiSelect } from "../../ui/multi-select";
import { usePrograms } from "../../../hooks/use-programs";

interface TuitionRate {
  id: string;
  program: string;
  yearLevel: string;
  ratePerUnit: number;
  effectiveDate: string;
}

interface FeeTemplate {
  id: string;
  name: string;
  amount: number;
  category: "tuition" | "laboratory" | "miscellaneous" | "osf" | "program-specific";
  applicablePrograms: string[]; // Array of program codes (e.g., ["BSCS", "BSIT"])
  schoolYear?: string; // e.g., "2024-2025"
  semester?: string; // "1st Semester" | "2nd Semester" | "Summer"
  isActive: boolean;
  description?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface DiscountTemplate {
  id: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  eligibility: string;
  isActive: boolean;
}

export function FeeConfiguration() {
  const { programs: availablePrograms } = usePrograms();
  const [loading, setLoading] = useState(true);
  const [tuitionRates, setTuitionRates] = useState<TuitionRate[]>([]);
  const [feeTemplates, setFeeTemplates] = useState<FeeTemplate[]>([]);
  const [discountTemplates, setDiscountTemplates] = useState<DiscountTemplate[]>([]);
  
  const [isTuitionDialogOpen, setIsTuitionDialogOpen] = useState(false);
  const [isFeeDialogOpen, setIsFeeDialogOpen] = useState(false);
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  
  const [tuitionForm, setTuitionForm] = useState({
    program: "",
    yearLevel: "",
    ratePerUnit: ""
  });

  const [feeForm, setFeeForm] = useState({
    name: "",
    amount: "",
    category: "tuition" as "tuition" | "laboratory" | "miscellaneous" | "osf" | "program-specific",
    applicablePrograms: [] as string[],
    schoolYear: "",
    semester: "",
    description: ""
  });

  const [discountForm, setDiscountForm] = useState({
    name: "",
    type: "percentage" as "percentage" | "fixed",
    value: "",
    eligibility: ""
  });

  // Real-time listeners
  useEffect(() => {
    // Wait for auth to be ready before querying Firestore
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const unsubscribeTuition = onSnapshot(collection(db, "tuitionRates"), (snapshot) => {
        const rates = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TuitionRate[];
        setTuitionRates(rates);
        setLoading(false);
      });

      const unsubscribeFees = onSnapshot(collection(db, "feeTemplates"), (snapshot) => {
        const fees = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FeeTemplate[];
        setFeeTemplates(fees);
      });

      const unsubscribeDiscounts = onSnapshot(collection(db, "discountTemplates"), (snapshot) => {
        const discounts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DiscountTemplate[];
        setDiscountTemplates(discounts);
      });

      // Cleanup function for Firestore listeners
      return () => {
        unsubscribeTuition();
        unsubscribeFees();
        unsubscribeDiscounts();
      };
    });

    // Cleanup function for auth listener
    return () => unsubscribeAuth();
  }, []);

  const handleAddTuitionRate = async () => {
    if (!tuitionForm.program || !tuitionForm.yearLevel || !tuitionForm.ratePerUnit) {
      toast.error("Please fill in all fields");
      return;
    }

    const rate = parseFloat(tuitionForm.ratePerUnit);
    if (isNaN(rate) || rate <= 0) {
      toast.error("Please enter a valid rate");
      return;
    }

    // Check for duplicate
    const duplicate = tuitionRates.find(
      r => r.program === tuitionForm.program && r.yearLevel === tuitionForm.yearLevel
    );
    if (duplicate) {
      toast.error(`Tuition rate for ${formatProgramDisplay(tuitionForm.program)} - Year ${tuitionForm.yearLevel} already exists`);
      return;
    }

    try {
      await addDoc(collection(db, "tuitionRates"), {
        program: tuitionForm.program,
        yearLevel: tuitionForm.yearLevel,
        ratePerUnit: rate,
        effectiveDate: new Date().toISOString(),
        createdAt: serverTimestamp()
      });

      toast.success("Tuition rate added successfully");
      setIsTuitionDialogOpen(false);
      setTuitionForm({ program: "", yearLevel: "", ratePerUnit: "" });
    } catch (error) {
      console.error("Error adding tuition rate:", error);
      toast.error("Failed to add tuition rate");
    }
  };

  const openFeeDialog = (fee?: FeeTemplate) => {
    setEditingFeeId(fee?.id || null);
    setFeeForm({
      name: fee?.name || "",
      amount: fee ? String(fee.amount) : "",
      category: fee?.category || "tuition",
      applicablePrograms: fee?.applicablePrograms || [],
      schoolYear: fee?.schoolYear || "",
      semester: fee?.semester || "",
      description: fee?.description || ""
    });
    setIsFeeDialogOpen(true);
  };

  const handleSaveFee = async () => {
    if (!feeForm.name.trim() || !feeForm.amount.trim() || !feeForm.schoolYear.trim()) {
      toast.error("Please fill in the fee name, amount, and school year");
      return;
    }

    const amount = parseFloat(feeForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const feeData = {
        name: feeForm.name.trim(),
        amount,
        category: feeForm.category,
        applicablePrograms: feeForm.applicablePrograms,
        schoolYear: feeForm.schoolYear.trim(),
        semester: feeForm.semester,
        description: feeForm.description.trim(),
        updatedAt: serverTimestamp()
      };

      if (editingFeeId) {
        await updateDoc(doc(db, "feeTemplates", editingFeeId), feeData);
      } else {
        await addDoc(collection(db, "feeTemplates"), {
          ...feeData,
          isActive: true,
          createdAt: serverTimestamp()
        });
      }

      toast.success(editingFeeId ? "Fee updated successfully" : "Fee added successfully");
      setIsFeeDialogOpen(false);
      setEditingFeeId(null);
      setFeeForm({ name: "", amount: "", category: "tuition", applicablePrograms: [], schoolYear: "", semester: "", description: "" });
    } catch (error) {
      console.error(editingFeeId ? "Error updating fee:" : "Error adding fee:", error);
      toast.error(editingFeeId ? "Failed to update fee" : "Failed to add fee");
    }
  };

  const handleAddDiscount = async () => {
    if (!discountForm.name || !discountForm.value || !discountForm.eligibility) {
      toast.error("Please fill in all fields");
      return;
    }

    const value = parseFloat(discountForm.value);
    if (isNaN(value) || value <= 0) {
      toast.error("Please enter a valid value");
      return;
    }

    try {
      await addDoc(collection(db, "discountTemplates"), {
        name: discountForm.name,
        type: discountForm.type,
        value: value,
        eligibility: discountForm.eligibility,
        isActive: true,
        createdAt: serverTimestamp()
      });

      toast.success("Discount added successfully");
      setIsDiscountDialogOpen(false);
      setDiscountForm({ name: "", type: "percentage", value: "", eligibility: "" });
    } catch (error) {
      console.error("Error adding discount:", error);
      toast.error("Failed to add discount");
    }
  };

  const handleDeleteTuitionRate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tuition rate?")) return;

    try {
      await deleteDoc(doc(db, "tuitionRates", id));
      toast.success("Tuition rate deleted");
    } catch (error) {
      console.error("Error deleting tuition rate:", error);
      toast.error("Failed to delete tuition rate");
    }
  };

  const handleDeleteFee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fee?")) return;

    try {
      await deleteDoc(doc(db, "feeTemplates", id));
      toast.success("Fee deleted");
    } catch (error) {
      console.error("Error deleting fee:", error);
      toast.error("Failed to delete fee");
    }
  };

  const handleToggleFee = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "feeTemplates", id), {
        isActive: !currentStatus
      });
      toast.success(`Fee ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error("Error toggling fee:", error);
      toast.error("Failed to update fee status");
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    if (!confirm("Are you sure you want to delete this discount?")) return;

    try {
      await deleteDoc(doc(db, "discountTemplates", id));
      toast.success("Discount deleted");
    } catch (error) {
      console.error("Error deleting discount:", error);
      toast.error("Failed to delete discount");
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return <LoadingState message="Loading fee configuration..." />;
  }

  return (
    <div className="min-w-0 space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Settings className="h-5 w-5" />
          Fee Configuration
        </h1>
      </div>

      <Tabs defaultValue="tuition" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="tuition" className="h-auto min-h-9 whitespace-normal px-1 py-2 text-center text-xs sm:text-sm">
            Tuition Rates
          </TabsTrigger>
          <TabsTrigger value="fees" className="h-auto min-h-9 whitespace-normal px-1 py-2 text-center text-xs sm:text-sm">
            School Fees
          </TabsTrigger>
          <TabsTrigger value="discounts" className="h-auto min-h-9 whitespace-normal px-1 py-2 text-center text-xs sm:text-sm">
            Discounts & Scholarships
          </TabsTrigger>
        </TabsList>

        {/* Tuition Rates Tab */}
        <TabsContent value="tuition" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Tuition Rates</CardTitle>
                  <CardDescription>Set tuition rate per unit for each program and year level</CardDescription>
                </div>
                <Dialog open={isTuitionDialogOpen} onOpenChange={setIsTuitionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rate
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Add Tuition Rate</DialogTitle>
                      <DialogDescription>Set tuition rate per unit for a program</DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
                      <div className="space-y-2">
                        <Label htmlFor="program">Program *</Label>
                        <Select
                          value={tuitionForm.program}
                          onValueChange={(value) => setTuitionForm({...tuitionForm, program: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select program" />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePrograms.map(program => (
                              <SelectItem key={program.code} value={program.code}>
                                {formatProgramDisplay(program.code)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Select from available programs in the system
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="yearLevel">Year Level *</Label>
                        <Select 
                          value={tuitionForm.yearLevel}
                          onValueChange={(value) => setTuitionForm({...tuitionForm, yearLevel: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select year level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1st Year</SelectItem>
                            <SelectItem value="2">2nd Year</SelectItem>
                            <SelectItem value="3">3rd Year</SelectItem>
                            <SelectItem value="4">4th Year</SelectItem>
                            <SelectItem value="5">5th Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ratePerUnit">Rate per Unit (₱) *</Label>
                        <Input
                          id="ratePerUnit"
                          type="number"
                          placeholder="0.00"
                          value={tuitionForm.ratePerUnit}
                          onChange={(e) => setTuitionForm({...tuitionForm, ratePerUnit: e.target.value})}
                        />
                      </div>
                    </div>
                    <DialogFooter className="mt-0 px-4 py-3 sm:px-6">
                      <Button variant="outline" onClick={() => setIsTuitionDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddTuitionRate}>Add Rate</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {tuitionRates.length === 0 ? (
                <EmptyState
                  icon={DollarSign}
                  title="No tuition rates yet"
                  description="Add tuition rates for different programs and year levels."
                />
              ) : (
                <div className="rounded-lg border">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Program</TableHead>
                        <TableHead>Year Level</TableHead>
                        <TableHead>Rate per Unit</TableHead>
                        <TableHead>Effective Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tuitionRates.map(rate => (
                        <TableRow key={rate.id}>
                          <TableCell className="font-medium">
                            {formatProgramDisplay(rate.program)}
                          </TableCell>
                          <TableCell>
                            {rate.yearLevel === "1" && "1st Year"}
                            {rate.yearLevel === "2" && "2nd Year"}
                            {rate.yearLevel === "3" && "3rd Year"}
                            {rate.yearLevel === "4" && "4th Year"}
                            {rate.yearLevel === "5" && "5th Year"}
                          </TableCell>
                          <TableCell className="font-medium text-blue-600">
                            {formatCurrency(rate.ratePerUnit)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(rate.effectiveDate).toLocaleDateString('en-PH')}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTuitionRate(rate.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
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
        </TabsContent>

        {/* School Fees Tab */}
        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>School Fee Templates</CardTitle>
                  <CardDescription>Manage mandatory, program, laboratory, and other fees</CardDescription>
                </div>
                <Dialog
                  open={isFeeDialogOpen}
                  onOpenChange={(open) => {
                    setIsFeeDialogOpen(open);
                    if (!open) setEditingFeeId(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" className="w-full sm:w-auto" onClick={() => openFeeDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Fee
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="mx-4 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:mx-0 sm:w-full sm:max-w-2xl">
                    <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
                      <DialogTitle>{editingFeeId ? "Edit School Fee" : "Add School Fee"}</DialogTitle>
                      <DialogDescription>
                        {editingFeeId ? "Update this fee template" : "Create a new fee template"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:px-6">
                      <div className="space-y-2">
                        <Label htmlFor="feeName">Fee Name *</Label>
                        <Input
                          id="feeName"
                          placeholder="e.g., Registration Fee"
                          value={feeForm.name}
                          onChange={(e) => setFeeForm({...feeForm, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="feeAmount">Amount (₱) *</Label>
                        <Input
                          id="feeAmount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          value={feeForm.amount}
                          onChange={(e) => setFeeForm({...feeForm, amount: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="feeCategory">Category *</Label>
                        <Select 
                          value={feeForm.category}
                          onValueChange={(value) => setFeeForm({ ...feeForm, category: value as FeeTemplate["category"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tuition">Tuition</SelectItem>
                            <SelectItem value="laboratory">Laboratory</SelectItem>
                            <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
                            <SelectItem value="osf">OSF</SelectItem>
                            <SelectItem value="program-specific">Program-Specific</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="semester">Semester</Label>
                        <Select 
                          value={feeForm.semester}
                          onValueChange={(value) => setFeeForm({ ...feeForm, semester: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select semester" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1st Semester">1st Semester</SelectItem>
                            <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                            <SelectItem value="Summer">Summer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="applicablePrograms">Applicable Programs</Label>
                        <MultiSelect
                          options={availablePrograms?.map(p => ({ 
                            label: formatProgramDisplay(p.code), 
                            value: p.code 
                          })) || []}
                          selected={feeForm.applicablePrograms || []}
                          onChange={(selected) => setFeeForm({...feeForm, applicablePrograms: selected})}
                          placeholder="Select programs (leave empty for all programs)"
                          emptyText="No programs found"
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave empty to apply to all programs, or select specific programs
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="schoolYear">School Year *</Label>
                        <Input
                          id="schoolYear"
                          placeholder="e.g., 2024-2025"
                          value={feeForm.schoolYear}
                          onChange={(e) => setFeeForm({...feeForm, schoolYear: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="feeDescription">Description</Label>
                        <Input
                          id="feeDescription"
                          placeholder="Optional description"
                          value={feeForm.description}
                          onChange={(e) => setFeeForm({...feeForm, description: e.target.value})}
                        />
                      </div>
                    </div>
                    <DialogFooter className="mt-0 flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:px-6">
                      <Button className="w-full sm:w-auto" variant="outline" onClick={() => setIsFeeDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button className="w-full sm:w-auto" onClick={handleSaveFee}>
                        {editingFeeId ? "Save Changes" : "Add Fee"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {feeTemplates.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No fee templates yet"
                  description="Add fee templates to apply to students automatically."
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fee Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeTemplates.map(fee => (
                        <TableRow key={fee.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{fee.name}</div>
                              {fee.description && (
                                <div className="text-xs text-muted-foreground">{fee.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {fee.category.charAt(0).toUpperCase() + fee.category.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-blue-600">
                            {formatCurrency(fee.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={fee.isActive ? "default" : "secondary"}>
                              {fee.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openFeeDialog(fee)}
                                aria-label={`Edit ${fee.name}`}
                              >
                                <Pencil className="h-4 w-4 sm:mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleFee(fee.id, fee.isActive)}
                              >
                                {fee.isActive ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteFee(fee.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
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

        {/* Discounts Tab */}
        <TabsContent value="discounts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Discount & Scholarship Templates</CardTitle>
                  <CardDescription>Manage available discounts and scholarships</CardDescription>
                </div>
                <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Discount
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Add Discount/Scholarship</DialogTitle>
                      <DialogDescription>Create a new discount template</DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
                      <div className="space-y-2">
                        <Label htmlFor="discountName">Name *</Label>
                        <Input
                          id="discountName"
                          placeholder="e.g., Academic Scholarship"
                          value={discountForm.name}
                          onChange={(e) => setDiscountForm({...discountForm, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="discountType">Type *</Label>
                        <Select 
                          value={discountForm.type}
                          onValueChange={(value) => setDiscountForm({ ...discountForm, type: value as DiscountTemplate["type"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount (₱)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="discountValue">
                          Value ({discountForm.type === "percentage" ? "%" : "₱"}) *
                        </Label>
                        <Input
                          id="discountValue"
                          type="number"
                          placeholder="0"
                          value={discountForm.value}
                          onChange={(e) => setDiscountForm({...discountForm, value: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="eligibility">Eligibility *</Label>
                        <Input
                          id="eligibility"
                          placeholder="e.g., Students with GPA 3.5 and above"
                          value={discountForm.eligibility}
                          onChange={(e) => setDiscountForm({...discountForm, eligibility: e.target.value})}
                        />
                      </div>
                    </div>
                    <DialogFooter className="mt-0 px-4 py-3 sm:px-6">
                      <Button variant="outline" onClick={() => setIsDiscountDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddDiscount}>Add Discount</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {discountTemplates.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No discount templates yet"
                  description="Add discount and scholarship templates for students."
                />
              ) : (
                <div className="rounded-lg border">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Eligibility</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {discountTemplates.map(discount => (
                        <TableRow key={discount.id}>
                          <TableCell className="font-medium">{discount.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {discount.type === "percentage" ? "Percentage" : "Fixed"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            {discount.type === "percentage" 
                              ? `${discount.value}%` 
                              : formatCurrency(discount.value)
                            }
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {discount.eligibility}
                          </TableCell>
                          <TableCell>
                            <Badge variant={discount.isActive ? "default" : "secondary"}>
                              {discount.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteDiscount(discount.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
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
        </TabsContent>
      </Tabs>
    </div>
  );
}