"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { GraduationCap, BookOpen, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { getProgramByCode } from "../../lib/program-service";
import { BSCS_CURRICULUM } from "../../lib/curriculum-data";

interface StudentProgramInfoProps {
  programCode?: string;
  yearLevel?: string;
  semester?: string;
}

export function StudentProgramInfo({ programCode, yearLevel, semester }: StudentProgramInfoProps) {
  if (!programCode) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900/30 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
          </div>
          <div>
            <h2>My Program</h2>
            <p className="text-sm text-muted-foreground">Your academic program information</p>
          </div>
        </div>
        <div className="p-6 border rounded-xl bg-muted/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="mb-1">No Program Assigned</div>
              <div className="text-sm text-muted-foreground">
                Please contact the registrar to be enrolled in a program
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const program = getProgramByCode(programCode);

  if (!program) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900/30 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
          </div>
          <div>
            <h2>My Program</h2>
            <p className="text-sm text-muted-foreground">Your academic program information</p>
          </div>
        </div>
        <div className="p-6 border rounded-xl bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="mb-1">Program Not Found</div>
              <div className="text-sm text-muted-foreground">
                Program code "{programCode}" is not recognized in the system
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900/30 flex items-center justify-center">
          <GraduationCap className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
        </div>
        <div>
          <h2>My Program</h2>
          <p className="text-sm text-muted-foreground">Your academic program information</p>
        </div>
      </div>
      <div className="space-y-4">
        {/* Program Header */}
        <div className="p-6 bg-blue-bayoux-50 dark:bg-blue-bayoux-950/20 rounded-xl border border-blue-bayoux-200 dark:border-blue-bayoux-800">
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-blue-bayoux-600 dark:bg-blue-bayoux-500 text-white border-0">{program.code}</Badge>
            {program.hasCurriculum && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Curriculum Available
              </Badge>
            )}
          </div>
          <h3 className="mb-2">{program.name}</h3>
          <p className="text-sm text-muted-foreground">{program.description}</p>
        </div>

        {/* Program Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-card rounded-xl border hover:bg-accent/5 hover:border-blue-bayoux-400 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm text-muted-foreground">Department</span>
            </div>
            <div className="ml-13">{program.department}</div>
          </div>

          <div className="p-5 bg-card rounded-xl border hover:bg-accent/5 hover:border-blue-bayoux-400 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-sm text-muted-foreground">Duration</span>
            </div>
            <div className="ml-13">{program.duration}</div>
          </div>

          <div className="p-5 bg-card rounded-xl border hover:bg-accent/5 hover:border-blue-bayoux-400 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900/30 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
              </div>
              <span className="text-sm text-muted-foreground">Total Units</span>
            </div>
            <div className="ml-13">{program.totalUnits} units</div>
          </div>

          <div className="p-5 bg-card rounded-xl border hover:bg-accent/5 hover:border-blue-bayoux-400 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm text-muted-foreground">Current Level</span>
            </div>
            <div className="ml-13">
              {yearLevel || "N/A"} • {semester || "N/A"}
            </div>
          </div>
        </div>

        {/* Curriculum Information */}
        {program.hasCurriculum && program.code === "BSCS" && (
          <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="mb-1">Full Curriculum Available</div>
                <div className="text-sm text-muted-foreground">
                  Your {program.code} program has a complete curriculum with {BSCS_CURRICULUM.length} subjects. 
                  View detailed curriculum information in the "My Curriculum" page.
                </div>
              </div>
            </div>
          </div>
        )}

        {!program.hasCurriculum && (
          <div className="p-5 bg-blue-bayoux-50 dark:bg-blue-bayoux-950/20 rounded-xl border border-blue-bayoux-200 dark:border-blue-bayoux-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900/30 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
              </div>
              <div className="flex-1">
                <div className="mb-1">Curriculum Coming Soon</div>
                <div className="text-sm text-muted-foreground">
                  The detailed curriculum for {program.code} will be available soon. 
                  Please check with your registrar for course information.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
