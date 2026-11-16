"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { Checkbox } from "../../ui/checkbox";
import { Search, Plus, Edit, Trash2, BookOpen, GraduationCap, Calendar, FileText } from "lucide-react";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { toast } from "sonner@2.0.3";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { PageHeader } from "../shared/page-header";
import { extractProgramCode } from "../../../lib/program-utils";
import { usePrograms } from "../../../hooks/use-programs";

interface Subject {
  id: string;
  subjectCode: string;
  subjectName: string;
  units: number;
  program: string;
  yearLevel: string;
  semester: string;
  prerequisites: string[];
  description: string;
  isLaboratory?: boolean;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SEMESTERS = ["1st Semester", "2nd Semester", "Summer"];

function parseCsvRow(row: string): string[] | null {
  const columns: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];

    if (character === '"') {
      if (inQuotes && row[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (inQuotes) {
        inQuotes = false;
      } else if (!value.trim()) {
        value = "";
        inQuotes = true;
      } else {
        value += character;
      }
    } else if (character === "," && !inQuotes) {
      columns.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  if (inQuotes) return null;
  columns.push(value.trim());
  return columns;
}

export function SubjectsManagement() {
  const { programs, loading: programsLoading, error: programsError } = usePrograms();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [processing, setProcessing] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgram, setBulkProgram] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [authReady, setAuthReady] = useState(false);

  // Form state
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [units, setUnits] = useState("3");
  const [program, setProgram] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [semester, setSemester] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [description, setDescription] = useState("");
  const [isLaboratory, setIsLaboratory] = useState(false);

  useEffect(() => {
    if (programsError) {
      toast.error("Could not load saved programs; built-in programs are still available.");
    }
  }, [programsError]);

  // Wait for auth to be ready
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthReady(true);
      } else {
        setAuthReady(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time subjects listener - only when auth is ready
  useEffect(() => {
    if (!authReady) return;

    const q = query(
      collection(db, "subjects")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subjectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Subject[];
      setSubjects(subjectsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching subjects:", error);
      toast.error("Failed to load subjects");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authReady]);

  const resetForm = () => {
    setSubjectCode("");
    setSubjectName("");
    setUnits("3");
    setProgram("");
    setYearLevel("");
    setSemester("");
    setPrerequisites("");
    setDescription("");
    setIsLaboratory(false);
    setEditingSubject(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectCode(subject.subjectCode);
    setSubjectName(subject.subjectName);
    setUnits(subject.units.toString());
    setProgram(extractProgramCode(subject.program));
    setYearLevel(subject.yearLevel);
    setSemester(subject.semester);
    setPrerequisites(subject.prerequisites.join(", "));
    setDescription(subject.description || "");
    setIsLaboratory(subject.isLaboratory === true);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!subjectCode || !subjectName || !units || !program || !yearLevel || !semester) {
      toast.error("Please fill in all required fields");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("You must be logged in");
      return;
    }

    setProcessing(true);

    try {
      const prerequisitesArray = prerequisites
        .split(",")
        .map(p => p.trim())
        .filter(p => p.length > 0);

      // Extract program code for consistency (store short code only)
      const programCode = extractProgramCode(program);

      const subjectData = {
        subjectCode: subjectCode.toUpperCase(),
        subjectName,
        units: parseInt(units),
        program: programCode,
        yearLevel,
        semester,
        prerequisites: prerequisitesArray,
        description,
        isLaboratory,
        updatedAt: serverTimestamp(),
      };

      if (editingSubject) {
        // Update existing subject
        await updateDoc(doc(db, "subjects", editingSubject.id), subjectData);
        toast.success("Subject updated successfully!");
      } else {
        // Create new subject
        await addDoc(collection(db, "subjects"), {
          ...subjectData,
          createdBy: currentUser.email,
          createdAt: serverTimestamp(),
        });
        toast.success("Subject created successfully!");
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving subject:", error);
      toast.error(`Failed to save subject: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const openBulkDialog = () => {
    setBulkProgram(selectedProgram === "all" ? "" : selectedProgram);
    setBulkInput("");
    setIsBulkDialogOpen(true);
  };

  const handleBulkAdd = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("You must be logged in");
      return;
    }

    if (!bulkProgram) {
      toast.error("Select a program for these subjects.");
      return;
    }

    const inputRows: Array<{ lineNumber: number; columns: string[]; parseError?: string }> = [];
    bulkInput.split(/\r?\n/).forEach((rawLine, index) => {
      if (!rawLine.trim()) return;

      const columns = rawLine.includes("\t")
        ? rawLine.split("\t").map((column) => column.trim())
        : parseCsvRow(rawLine);
      if (!columns) {
        inputRows.push({ lineNumber: index + 1, columns: [], parseError: "contains an unclosed quoted field." });
        return;
      }
      if (columns[0].toLowerCase() === "year" && columns[1]?.toLowerCase() === "semester") return;
      inputRows.push({ lineNumber: index + 1, columns });
    });

    if (inputRows.length === 0) {
      toast.error("Paste at least one subject row.");
      return;
    }

    if (inputRows.length > 500) {
      toast.error("Add no more than 500 subjects in one batch.");
      return;
    }

    const existingCodes = new Set(
      subjects
        .filter((subject) => extractProgramCode(subject.program) === bulkProgram)
        .map((subject) => subject.subjectCode.trim().toUpperCase())
    );
    const batchCodes = new Set<string>();
    const errors: string[] = [];
    const parsedSubjects: Array<Omit<Subject, "id" | "createdAt" | "updatedAt" | "createdBy">> = [];

    inputRows.forEach(({ lineNumber, columns, parseError }) => {
      if (parseError) {
        errors.push(`Row ${lineNumber}: ${parseError}`);
        return;
      }
      if (columns.length < 5) {
        errors.push(`Row ${lineNumber}: provide year, semester, code, subject name, and units.`);
        return;
      }

      const [yearInput, semesterInput, codeInput] = columns;
      const unitsIndex = columns.findIndex((column, index) => {
        const normalizedColumn = column
          .replace(/[\u200B-\u200D\uFEFF]/g, "")
          .trim()
          .replace(/\s+units?$/i, "");
        const value = Number(normalizedColumn);
        return index >= 3 && Number.isInteger(value) && value >= 1 && value <= 6;
      });
      if (unitsIndex === -1) {
        errors.push(
          `Row ${lineNumber} (${codeInput || "unknown subject"}): couldn't find units from 1 to 6 after the subject name. Parsed fields: ${columns.join(" | ")}.`
        );
        return;
      }

      const nameInput = columns.slice(3, unitsIndex).join(", ").trim();
      const unitsValue = Number(
        columns[unitsIndex].replace(/[\u200B-\u200D\uFEFF]/g, "").trim().replace(/\s+units?$/i, "")
      );
      const prerequisitesInput = columns.slice(unitsIndex + 1).join(", ");
      const yearLevel = /^\d+$/.test(yearInput)
        ? YEAR_LEVELS[Number(yearInput) - 1]
        : YEAR_LEVELS.find((year) => year.toLowerCase() === yearInput.toLowerCase());
      const semesterNumber = /^\d+$/.test(semesterInput) ? Number(semesterInput) : 0;
      const semester = semesterNumber === 1
        ? SEMESTERS[0]
        : semesterNumber === 2
          ? SEMESTERS[1]
          : SEMESTERS.slice(0, 2).find((item) => item.toLowerCase() === semesterInput.toLowerCase());
      const code = codeInput.toUpperCase();
      if (!yearLevel) {
        errors.push(`Row ${lineNumber}: year must be 1–4 or a year label such as "1st Year".`);
        return;
      }
      if (!semester) {
        errors.push(`Row ${lineNumber}: semester must be 1, 2, "1st Semester", or "2nd Semester".`);
        return;
      }
      if (!code || !nameInput) {
        errors.push(`Row ${lineNumber}: subject code and name are required.`);
        return;
      }
      if (existingCodes.has(code) || batchCodes.has(code)) {
        errors.push(`Row ${lineNumber}: subject code "${code}" already exists for this program or in this batch.`);
        return;
      }

      batchCodes.add(code);
      parsedSubjects.push({
        subjectCode: code,
        subjectName: nameInput,
        units: unitsValue,
        program: bulkProgram,
        yearLevel,
        semester,
        prerequisites: prerequisitesInput
          .split(",")
          .map((prerequisite) => prerequisite.trim())
          .filter((prerequisite) => prerequisite && prerequisite.toLowerCase() !== "none"),
        description: "",
        isLaboratory: false,
      });
    });

    if (errors.length > 0) {
      toast.error(`Please fix the following: ${errors.slice(0, 3).join(" ")}`);
      return;
    }

    setBulkProcessing(true);
    try {
      const batch = writeBatch(db);
      parsedSubjects.forEach((subject) => {
        batch.set(doc(collection(db, "subjects")), {
          ...subject,
          createdBy: currentUser.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      toast.success(`${parsedSubjects.length} subjects added to the ${bulkProgram} curriculum.`);
      setIsBulkDialogOpen(false);
      setBulkInput("");
    } catch (error) {
      console.error("Error bulk-adding curriculum subjects:", error);
      toast.error(`Failed to add subjects: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleDelete = async (subject: Subject) => {
    if (!confirm(`Are you sure you want to delete ${subject.subjectCode} - ${subject.subjectName}?`)) {
      return;
    }

    setProcessing(true);

    try {
      await deleteDoc(doc(db, "subjects", subject.id));
      toast.success("Subject deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting subject:", error);
      toast.error(`Failed to delete subject: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = 
      subject.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Compare program codes for consistency
    const subjectProgramCode = extractProgramCode(subject.program);
    const matchesProgram = selectedProgram === "all" || subjectProgramCode === selectedProgram;

    return matchesSearch && matchesProgram;
  });

  // Group subjects by year level first, then by semester
  const subjectsByYear = YEAR_LEVELS.reduce((acc, year) => {
    acc[year] = SEMESTERS.reduce((semAcc, semester) => {
      const semesterSubjects = filteredSubjects.filter(
        s => s.yearLevel === year && s.semester === semester
      );
      if (semesterSubjects.length > 0) {
        semAcc[semester] = semesterSubjects.sort((a, b) => 
          a.subjectCode.localeCompare(b.subjectCode)
        );
      }
      return semAcc;
    }, {} as Record<string, Subject[]>);
    return acc;
  }, {} as Record<string, Record<string, Subject[]>>);

  // Get years that have subjects
  const yearsWithSubjects = YEAR_LEVELS.filter(
    year => Object.keys(subjectsByYear[year]).length > 0
  );

  if (loading || programsLoading) {
    return <LoadingState message="Loading subjects..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={BookOpen}
        title="Subjects Management"
        description="Create and manage subjects for each program's curriculum"
        action={
          <>
            <Button onClick={openBulkDialog} variant="outline" size="lg">
              <FileText className="mr-2 h-4 w-4" />
              Bulk Add Curriculum
            </Button>
            <Button onClick={openAddDialog} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </>
        }
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">

      <Card>
        <CardHeader>
          <CardTitle>All Subjects ({subjects.length})</CardTitle>
          <CardDescription>
            Manage subjects across all programs and year levels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map((programOption) => (
                  <SelectItem key={programOption.code} value={programOption.code}>
                    {programOption.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subjects by Year and Semester */}
          {filteredSubjects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No subjects found"
              description={searchTerm || selectedProgram !== "all" 
                ? "Try adjusting your filters" 
                : "Start by adding your first subject"}
            />
          ) : (
            <Tabs defaultValue={yearsWithSubjects[0]} className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto">
                {yearsWithSubjects.map((year) => {
                  const totalSubjects = Object.values(subjectsByYear[year]).flat().length;
                  return (
                    <TabsTrigger key={year} value={year}>
                      <GraduationCap className="h-4 w-4 mr-2" />
                      {year} ({totalSubjects})
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {yearsWithSubjects.map((year) => {
                const semesters = Object.keys(subjectsByYear[year]);
                const firstSemester = semesters[0];
                
                return (
                  <TabsContent key={year} value={year} className="mt-4 space-y-4">
                    {semesters.length > 0 && (
                      <Tabs defaultValue={firstSemester} className="w-full">
                        <TabsList className="w-full justify-start overflow-x-auto bg-muted/50">
                          {semesters.map((sem) => {
                            const semSubjects = subjectsByYear[year][sem];
                            return (
                              <TabsTrigger key={sem} value={sem}>
                                <Calendar className="h-4 w-4 mr-2" />
                                {sem} ({semSubjects.length})
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>

                        {semesters.map((sem) => {
                          const semSubjects = subjectsByYear[year][sem];
                          return (
                            <TabsContent key={sem} value={sem} className="mt-4">
                              <div className="border rounded-lg">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Code</TableHead>
                                      <TableHead>Subject Name</TableHead>
                                      <TableHead className="text-center">Units</TableHead>
                                      <TableHead>Program</TableHead>
                                      <TableHead>Prerequisites</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {semSubjects.map((subject) => (
                                      <TableRow key={subject.id}>
                                        <TableCell className="font-mono font-medium">
                                          {subject.subjectCode}
                                        </TableCell>
                                        <TableCell>
                                          <div>
                                            <div className="font-medium">{subject.subjectName}</div>
                                            {subject.isLaboratory && (
                                              <Badge variant="outline" className="mt-1">Laboratory subject</Badge>
                                            )}
                                            {subject.description && (
                                              <div className="text-sm text-muted-foreground line-clamp-1">
                                                {subject.description}
                                              </div>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Badge variant="secondary">{subject.units}</Badge>
                                        </TableCell>
                                        <TableCell>
                                          <div className="text-sm">
                                            {subject.program.split(" - ")[0]}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          {subject.prerequisites.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                              {subject.prerequisites.map((prereq, idx) => (
                                                <Badge key={idx} variant="outline" className="text-xs">
                                                  {prereq}
                                                </Badge>
                                              ))}
                                            </div>
                                          ) : (
                                            <span className="text-muted-foreground text-sm">None</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex justify-end gap-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => openEditDialog(subject)}
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleDelete(subject)}
                                              disabled={processing}
                                            >
                                              <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TabsContent>
                          );
                        })}
                      </Tabs>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-h-[90vh] gap-0 overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Bulk Add Curriculum Subjects</DialogTitle>
            <DialogDescription>
              Add many subjects to one program in a single paste. You can include all four years and both semesters in the same batch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-6 py-6">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              Paste comma-separated rows or tab-separated rows copied from a spreadsheet. Each row uses:
              <span className="mt-1 block font-medium text-foreground">
                Year, Semester, Code, Subject Name, Units, Prerequisites
              </span>
              Use 1–4 for year and 1 or 2 for semester. Enter None when there are no prerequisites. Multiple prerequisite codes may follow the units; quote any field that contains commas.
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulkProgram">Program *</Label>
              <Select value={bulkProgram} onValueChange={setBulkProgram} disabled={bulkProcessing}>
                <SelectTrigger id="bulkProgram" className="h-11">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((programOption) => (
                    <SelectItem key={programOption.code} value={programOption.code}>
                      {programOption.code} - {programOption.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulkSubjects">Subject rows *</Label>
              <Textarea
                id="bulkSubjects"
                value={bulkInput}
                onChange={(event) => setBulkInput(event.target.value)}
                placeholder={"year, semester, code, subject_name, units, prerequisites\n1, 1, IT101, Introduction to Computing, 3, None\n1, 2, IT104, Computer Programming 2, 3, IT102"}
                className="min-h-72 font-mono text-sm"
                disabled={bulkProcessing}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Add each subject once. Midterm and Final are already separate grading periods in the teacher gradebook.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkDialogOpen(false)}
              disabled={bulkProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkAdd} disabled={bulkProcessing}>
              {bulkProcessing ? "Adding Subjects..." : "Add Subjects"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Subject Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-h-[90vh] gap-0 overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingSubject ? "Edit Subject" : "Add New Subject"}
            </DialogTitle>
            <DialogDescription>
              {editingSubject 
                ? "Update the subject information below" 
                : "Fill in the details to create a new subject"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-7 px-6 py-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="subjectCode">Subject Code *</Label>
                <Input
                  id="subjectCode"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="e.g., IT101"
                  className="mt-1 h-11 uppercase"
                />
              </div>
              <div>
                <Label htmlFor="units">Units *</Label>
                <Input
                  id="units"
                  type="number"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  min="1"
                  max="6"
                  className="mt-1 h-11"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subjectName">Subject Name *</Label>
              <Input
                id="subjectName"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g., Introduction to Computing"
                className="mt-1 h-11"
              />
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Checkbox
                id="isLaboratory"
                checked={isLaboratory}
                onCheckedChange={(checked) => setIsLaboratory(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="isLaboratory" className="cursor-pointer">Laboratory subject</Label>
                <p className="text-sm text-muted-foreground">
                  Students enrolled in this subject will receive applicable laboratory fees in their assessment.
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="program">Program *</Label>
              <Select value={program} onValueChange={setProgram}>
                <SelectTrigger className="mt-1 h-11">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((programOption) => (
                    <SelectItem key={programOption.code} value={programOption.code}>
                      {programOption.code} - {programOption.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="yearLevel">Year Level *</Label>
                <Select value={yearLevel} onValueChange={setYearLevel}>
                  <SelectTrigger className="mt-1 h-11">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_LEVELS.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="semester">Semester *</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger className="mt-1 h-11">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((sem) => (
                      <SelectItem key={sem} value={sem}>
                        {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="prerequisites">Prerequisites (Optional)</Label>
              <Input
                id="prerequisites"
                value={prerequisites}
                onChange={(e) => setPrerequisites(e.target.value)}
                placeholder="e.g., IT101, IT102 (comma-separated)"
                className="mt-1 h-11"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter subject codes separated by commas
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the subject..."
                className="mt-1 min-h-24"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={processing}>
              {editingSubject ? "Update Subject" : "Create Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}