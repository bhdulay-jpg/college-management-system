"use client";

import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { BookOpen, Edit, GraduationCap, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { auth, db } from "../../../lib/firebase";
import { PROGRAMS, type Program } from "../../../lib/program-service";
import { usePrograms } from "../../../hooks/use-programs";
import { EmptyState } from "../../empty-state";
import { LoadingState } from "../../loading-state";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";

interface ProgramForm {
  code: string;
  name: string;
  department: string;
  duration: string;
  totalUnits: string;
  description: string;
}

const EMPTY_FORM: ProgramForm = {
  code: "",
  name: "",
  department: "",
  duration: "",
  totalUnits: "",
  description: "",
};

export function ProgramManagementPage() {
  const { programs, documentIdByCode, loading, error } = usePrograms();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [form, setForm] = useState<ProgramForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      toast.error("Failed to load programs. Check your Firestore access and try again.");
    }
  }, [error]);

  const openAddDialog = () => {
    setEditingProgram(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (program: Program) => {
    setEditingProgram(program);
    setForm({
      code: program.code,
      name: program.name,
      department: program.department,
      duration: program.duration,
      totalUnits: String(program.totalUnits),
      description: program.description,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    const department = form.department.trim();
    const duration = form.duration.trim();
    const totalUnits = Number(form.totalUnits);

    if (!/^[A-Z0-9]{2,12}$/.test(code)) {
      toast.error("Program code must be 2 to 12 letters or numbers.");
      return;
    }
    if (!name || !department || !duration || !Number.isInteger(totalUnits) || totalUnits < 1) {
      toast.error("Enter a name, department, duration, and a positive whole number of units.");
      return;
    }
    if (editingProgram && code !== editingProgram.code) {
      toast.error("Program codes cannot be changed after creation.");
      return;
    }
    if (programs.some((program) => program.code.toUpperCase() === code && program.code !== editingProgram?.code)) {
      toast.error(`A program with code ${code} already exists.`);
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("Your session expired. Please sign in again.");
      return;
    }

    setSaving(true);
    try {
      const documentId = documentIdByCode.get(code) || code;
      const existingDocument = documentIdByCode.has(code);
      await setDoc(
        doc(db, "programs", documentId),
        {
          code,
          name,
          department,
          duration,
          totalUnits,
          description: form.description.trim(),
          updatedAt: serverTimestamp(),
          ...(existingDocument
            ? {}
            : { createdAt: serverTimestamp(), createdBy: currentUser.email || currentUser.uid }),
        },
        { merge: true }
      );
      toast.success(editingProgram ? "Program updated." : "Program added.");
      setDialogOpen(false);
      setEditingProgram(null);
      setForm(EMPTY_FORM);
    } catch (saveError) {
      console.error("Error saving program:", saveError);
      toast.error("Failed to save the program. Check your Firestore permissions.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (program: Program) => {
    const documentId = documentIdByCode.get(program.code);
    if (!documentId || PROGRAMS.some((builtIn) => builtIn.code === program.code)) {
      toast.error("Built-in programs cannot be deleted.");
      return;
    }
    if (!confirm(`Delete ${program.code} - ${program.name}?`)) return;

    setDeletingCode(program.code);
    try {
      const codeSubjects = await getDocs(
        query(collection(db, "subjects"), where("program", "==", program.code))
      );
      const fullNameSubjects = await getDocs(
        query(collection(db, "subjects"), where("program", "==", `${program.code} - ${program.name}`))
      );
      if (!codeSubjects.empty || !fullNameSubjects.empty) {
        toast.error("Remove this program's curriculum subjects before deleting the program.");
        return;
      }

      await deleteDoc(doc(db, "programs", documentId));
      toast.success("Program deleted.");
    } catch (deleteError) {
      console.error("Error deleting program:", deleteError);
      toast.error("Failed to delete the program. Check your Firestore permissions.");
    } finally {
      setDeletingCode(null);
    }
  };

  if (loading) {
    return <LoadingState message="Loading programs..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl">Program Management</h1>
            <p className="text-sm text-muted-foreground">
              Add and maintain the academic programs used by enrollment and curriculum.
            </p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Program
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Academic Programs ({programs.length})</CardTitle>
            <CardDescription>
              Programs are shared with curriculum setup and enrollment forms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {programs.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No programs available"
                description="Add an academic program to get started."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {programs.map((program) => (
                  <Card key={program.code}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">{program.name}</CardTitle>
                          <Badge variant="outline" className="mt-2">{program.code}</Badge>
                        </div>
                        <GraduationCap className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{program.description || "No description provided."}</p>
                      <div className="text-sm">
                        <div>{program.department || "Department not set"}</div>
                        <div className="text-muted-foreground">
                        {program.duration || "Duration not set"} - {program.totalUnits} units
                        </div>
                      </div>
                      {program.hasCurriculum && (
                        <Badge variant="secondary">
                          <BookOpen className="mr-1 h-3 w-3" />
                          Curriculum available
                        </Badge>
                      )}
                      <div className="flex justify-end gap-2 border-t pt-3">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(program)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={
                            deletingCode === program.code ||
                            !documentIdByCode.has(program.code) ||
                            PROGRAMS.some((builtIn) => builtIn.code === program.code)
                          }
                          onClick={() => handleDelete(program)}
                          aria-label={`Delete ${program.code}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="w-[calc(100%-2rem)] max-h-[90vh] gap-0 overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProgram ? "Edit Program" : "Add Program"}</DialogTitle>
              <DialogDescription>
                Program codes are used to associate enrollment records and curriculum subjects.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-0"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSave();
              }}
            >
              <div className="space-y-5 px-6 py-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="program-code">Program Code *</Label>
                    <Input
                      id="program-code"
                      className="h-11"
                      value={form.code}
                      onChange={(event) => setForm({ ...form, code: event.target.value })}
                      placeholder="e.g. BSIT"
                      disabled={!!editingProgram}
                      maxLength={12}
                      pattern="[A-Za-z0-9]{2,12}"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="program-units">Total Units *</Label>
                    <Input
                      id="program-units"
                      className="h-11"
                      type="number"
                      min="1"
                      step="1"
                      value={form.totalUnits}
                      onChange={(event) => setForm({ ...form, totalUnits: event.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="program-name">Program Name *</Label>
                  <Input
                    id="program-name"
                    className="h-11"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder="Bachelor of Science in ..."
                    required
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="program-department">Department *</Label>
                    <Input
                      id="program-department"
                      className="h-11"
                      value={form.department}
                      onChange={(event) => setForm({ ...form, department: event.target.value })}
                      placeholder="College of ..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="program-duration">Duration *</Label>
                    <Input
                      id="program-duration"
                      className="h-11"
                      value={form.duration}
                      onChange={(event) => setForm({ ...form, duration: event.target.value })}
                      placeholder="e.g. 4 years"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="program-description">Description</Label>
                  <Textarea
                    id="program-description"
                    className="min-h-28"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    placeholder="Describe the program"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingProgram ? "Save Changes" : "Add Program"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
