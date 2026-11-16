"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { BookOpen, RefreshCw } from "lucide-react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { toast } from "sonner@2.0.3";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { auth } from "../../../lib/firebase";
import { PageHeader } from "../shared/page-header";
import { extractProgramCode } from "../../../lib/program-utils";
import { usePrograms } from "../../../hooks/use-programs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";

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
}

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SEMESTERS = ["1st Semester", "2nd Semester", "Summer"];

export function CurriculumView() {
  const { programs, loading: programsLoading } = usePrograms();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState("BSIT");
  const [authReady, setAuthReady] = useState(false);

  // Set loading when program changes
  useEffect(() => {
    if (authReady) {
      setLoading(true);
    }
  }, [selectedProgram]);

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

  // Real-time subjects listener - filtered by selected program for efficiency
  useEffect(() => {
    if (!authReady) return;

    // Extract program code for querying (handles both "BSIT" and "BSIT - Full Name" formats)
    const programCode = extractProgramCode(selectedProgram);
    console.log("[CurriculumView] Fetching subjects for program:", selectedProgram);
    console.log("[CurriculumView] Using program code for query:", programCode);

    const q = query(
      collection(db, "subjects"),
      where("program", "==", programCode)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subjectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Subject[];
      console.log(`[CurriculumView] Loaded ${subjectsData.length} subjects for ${programCode}`);
      setSubjects(subjectsData);
      setLoading(false);
    }, (error) => {
      console.error("[CurriculumView] Error fetching subjects:", error);
      toast.error("Failed to load curriculum");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authReady, selectedProgram]);

  // Subjects are already filtered by program in the query, no need to filter again
  const programSubjects = subjects;

  // Group by year level and semester
  const organizedCurriculum = YEAR_LEVELS.map(year => ({
    yearLevel: year,
    semesters: SEMESTERS.map(sem => ({
      semester: sem,
      subjects: programSubjects
        .filter(s => s.yearLevel === year && s.semester === sem)
        .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode)),
    })).filter(s => s.subjects.length > 0),
  })).filter(y => y.semesters.length > 0);

  const totalUnits = programSubjects.reduce((sum, subject) => sum + subject.units, 0);

  if (loading || programsLoading) {
    return <LoadingState message="Loading curriculum..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={BookOpen}
        title="Curriculum Overview"
        description="Real-time curriculum view - subjects fetched per program"
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Real-time indicator */}
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-bayoux-50 dark:bg-blue-bayoux-950/20 border border-blue-bayoux-200 dark:border-blue-bayoux-800 rounded-lg">
          <RefreshCw className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
          <span className="text-sm text-muted-foreground">
            <strong className="text-foreground">Real-time sync enabled.</strong> Subjects automatically update when changes are made.
          </span>
        </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Program Curriculum</CardTitle>
              <CardDescription>
                Subject list organized by year level and semester
              </CardDescription>
            </div>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-full sm:w-[320px]">
                <SelectValue />
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
        </CardHeader>
        <CardContent>
          {programSubjects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No subjects in curriculum"
              description="Add subjects for this program to build the curriculum"
            />
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{programSubjects.length}</div>
                      <div className="text-sm text-muted-foreground">Total Subjects</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{totalUnits}</div>
                      <div className="text-sm text-muted-foreground">Total Units</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{organizedCurriculum.length}</div>
                      <div className="text-sm text-muted-foreground">Year Levels</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Year</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Subject Code</TableHead>
                      <TableHead>Subject Name</TableHead>
                      <TableHead className="text-center">Units</TableHead>
                      <TableHead>Prerequisites</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizedCurriculum.flatMap((yearData) =>
                      yearData.semesters.flatMap((semesterData) => [
                        ...semesterData.subjects.map((subject) => (
                          <TableRow key={subject.id}>
                            <TableCell className="whitespace-nowrap">{yearData.yearLevel}</TableCell>
                            <TableCell className="whitespace-nowrap">{semesterData.semester}</TableCell>
                            <TableCell className="font-mono font-medium">{subject.subjectCode}</TableCell>
                            <TableCell className="min-w-52">{subject.subjectName}</TableCell>
                            <TableCell className="text-center">{subject.units}</TableCell>
                            <TableCell>
                              {subject.prerequisites?.length ? subject.prerequisites.join(", ") : "None"}
                            </TableCell>
                          </TableRow>
                        )),
                        <TableRow key={`${yearData.yearLevel}-${semesterData.semester}-total`} className="bg-muted/30">
                          <TableCell colSpan={4} className="text-right font-medium">
                            {yearData.yearLevel} {semesterData.semester} total
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {semesterData.subjects.reduce((sum, subject) => sum + subject.units, 0)}
                          </TableCell>
                          <TableCell />
                        </TableRow>,
                      ])
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}