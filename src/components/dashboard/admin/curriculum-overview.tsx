"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { BookOpen, GraduationCap, BarChart3, Database, RefreshCw } from "lucide-react";
import { collection, query, onSnapshot, where, getDocs } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { toast } from "sonner@2.0.3";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
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
  createdBy: string;
}

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SEMESTERS = ["1st Semester", "2nd Semester", "Summer"];

export function CurriculumOverview() {
  const { programs, loading: programsLoading } = usePrograms();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(programs[0]?.code || "");
  const [authReady, setAuthReady] = useState(false);

  // Set loading when program changes
  useEffect(() => {
    if (authReady) {
      setLoading(true);
    }
  }, [selectedProgram]);

  // Wait for auth to be ready before querying Firestore
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthReady(true);
      } else {
        setAuthReady(false);
        setLoading(false);
        toast.error("Please log in to view curriculum");
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time subjects listener - filtered by selected program for efficiency
  useEffect(() => {
    if (!authReady) {
      return;
    }

    const programCode = selectedProgram;
    console.log("[CurriculumOverview] Fetching subjects for program:", programCode);

    // Query filtered by program for better performance
    const q = query(
      collection(db, "subjects"),
      where("program", "==", programCode)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subjectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Subject[];
      console.log(`[CurriculumOverview] Loaded ${subjectsData.length} subjects for ${programCode}`);
      setSubjects(subjectsData);
      setLoading(false);
    }, (error) => {
      console.error("[CurriculumOverview] Error fetching subjects:", error);
      if (error.code === 'permission-denied') {
        toast.error("Permission denied. Please ensure you're logged in as Admin.");
      } else {
        toast.error("Failed to load curriculum");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authReady, selectedProgram]);

  // Subjects are already filtered by program in the query
  const programSubjects = subjects;

  // Group by year level and semester
  const organizedCurriculum = YEAR_LEVELS.map(year => ({
    yearLevel: year,
    semesters: SEMESTERS.map(sem => ({
      semester: sem,
      subjects: programSubjects.filter(s => s.yearLevel === year && s.semester === sem),
    })).filter(s => s.subjects.length > 0),
  })).filter(y => y.semesters.length > 0);

  const totalUnits = programSubjects.reduce((sum, subject) => sum + subject.units, 0);

  // Note: Statistics are now per selected program since we're querying filtered data
  // If you need all-program stats, consider a separate query or aggregated data

  if (loading || programsLoading) {
    return <LoadingState message="Loading curriculum data..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Curriculum Overview
        </h2>
        <p className="text-muted-foreground">
          Real-time curriculum view - subjects fetched per program
        </p>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-bayoux-50 dark:bg-blue-bayoux-950/20 border border-blue-bayoux-200 dark:border-blue-bayoux-800 rounded-lg">
        <RefreshCw className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
        <span className="text-sm text-muted-foreground">
          <strong className="text-foreground">Real-time sync enabled.</strong> Subjects automatically update when changes are made.
        </span>
      </div>

      {/* Statistics Grid - Per Selected Program */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border bg-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl tabular-nums text-foreground">{programSubjects.length}</div>
              <div className="text-sm text-muted-foreground">Subjects in Program</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl tabular-nums text-foreground">{totalUnits}</div>
              <div className="text-sm text-muted-foreground">Total Units</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl tabular-nums text-foreground">{organizedCurriculum.length}</div>
              <div className="text-sm text-muted-foreground">Year Levels</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="curriculum" className="w-full">
        <TabsList>
          <TabsTrigger value="curriculum">
            <BookOpen className="mr-2 h-4 w-4" />
            Curriculum View
          </TabsTrigger>
          <TabsTrigger value="statistics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Program Statistics
          </TabsTrigger>
        </TabsList>

        {/* Curriculum View */}
        <TabsContent value="curriculum" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Program Curriculum</CardTitle>
                  <CardDescription>
                    Detailed view of subjects by program
                  </CardDescription>
                </div>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger className="w-[300px]">
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
                  description="No subjects have been added for this program yet"
                />
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Subjects</div>
                      <div className="text-2xl font-bold">{programSubjects.length}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Units</div>
                      <div className="text-2xl font-bold">{totalUnits}</div>
                    </div>
                  </div>

                  {/* Curriculum by Year */}
                  {organizedCurriculum.map((yearData) => (
                    <Card key={yearData.yearLevel}>
                      <CardHeader>
                        <CardTitle className="text-lg">{yearData.yearLevel}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {yearData.semesters.map((semData) => {
                            const semesterUnits = semData.subjects.reduce((sum, s) => sum + s.units, 0);
                            
                            return (
                              <div key={semData.semester}>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium">{semData.semester}</h4>
                                  <Badge variant="secondary">{semesterUnits} units</Badge>
                                </div>
                                <div className="grid gap-2">
                                  {semData.subjects.map((subject) => (
                                    <div key={subject.id} className="flex items-center justify-between p-3 border rounded-lg">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                          <span className="font-mono text-sm font-bold bg-primary/10 px-2 py-1 rounded">
                                            {subject.subjectCode}
                                          </span>
                                          <span className="font-medium">{subject.subjectName}</span>
                                        </div>
                                        {subject.prerequisites.length > 0 && (
                                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                            <span>Prerequisites:</span>
                                            {subject.prerequisites.map((prereq, idx) => (
                                              <Badge key={idx} variant="outline" className="text-xs">
                                                {prereq}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <Badge variant="outline">{subject.units} units</Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics View */}
        <TabsContent value="statistics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Program Statistics - {programs.find((program) => program.code === selectedProgram)?.name || selectedProgram}
              </CardTitle>
              <CardDescription>
                Detailed breakdown of subjects and units for the selected program
              </CardDescription>
            </CardHeader>
            <CardContent>
              {programSubjects.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="No subjects found"
                  description="This program doesn't have any subjects yet"
                />
              ) : (
                <div className="space-y-6">
                  {/* Overview Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border bg-muted/50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <BookOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
                          <div className="text-2xl tabular-nums text-foreground">{programSubjects.length}</div>
                          <div className="text-xs text-muted-foreground">Total Subjects</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border bg-muted/50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <GraduationCap className="h-6 w-6 mx-auto mb-2 text-primary" />
                          <div className="text-2xl tabular-nums text-foreground">{totalUnits}</div>
                          <div className="text-xs text-muted-foreground">Total Units</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border bg-muted/50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <BarChart3 className="h-6 w-6 mx-auto mb-2 text-primary" />
                          <div className="text-2xl tabular-nums text-foreground">
                            {totalUnits > 0 ? (totalUnits / programSubjects.length).toFixed(1) : 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Avg Units/Subject</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border bg-muted/50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Database className="h-6 w-6 mx-auto mb-2 text-primary" />
                          <div className="text-2xl tabular-nums text-foreground">{organizedCurriculum.length}</div>
                          <div className="text-xs text-muted-foreground">Year Levels</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Breakdown by Year and Semester */}
                  <div>
                    <h4 className="font-medium mb-4">Subjects & Units Distribution</h4>
                    <div className="space-y-3">
                      {organizedCurriculum.map((yearData) => (
                        <Card key={yearData.yearLevel} className="border">
                          <CardContent className="pt-6">
                            <h5 className="font-medium mb-3">{yearData.yearLevel}</h5>
                            <div className="space-y-2">
                              {yearData.semesters.map((semData) => {
                                const semesterUnits = semData.subjects.reduce((sum, s) => sum + s.units, 0);
                                return (
                                  <div key={semData.semester} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                                    <div>
                                      <div className="font-medium text-sm">{semData.semester}</div>
                                      <div className="text-xs text-muted-foreground">{semData.subjects.length} subjects</div>
                                    </div>
                                    <div className="text-right">
                                      <Badge variant="secondary">{semesterUnits} units</Badge>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
