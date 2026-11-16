"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { GraduationCap, Clock, BookOpen, CheckCircle } from "lucide-react";
import { PageHeader } from "../shared/page-header";
import { LoadingState } from "../../loading-state";
import { toast } from "sonner@2.0.3";
import { usePrograms } from "../../../hooks/use-programs";

export function ProgramsPage() {
  const { programs, loading, error } = usePrograms();

  useEffect(() => {
    if (error) {
      toast.error("Failed to load saved programs.");
    }
  }, [error]);

  if (loading) {
    return <LoadingState message="Loading programs..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={GraduationCap}
        title="Academic Programs"
        description="Available degree programs and courses"
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <Card key={program.code} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{program.name}</CardTitle>
                    <CardDescription className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary">{program.code}</Badge>
                      {program.hasCurriculum && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Curriculum Available
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  <GraduationCap className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{program.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>{program.department}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{program.duration} • {program.totalUnits} units</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
