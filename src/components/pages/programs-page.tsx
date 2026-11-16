"use client";

import { PageHeader } from "../page-header";
import { PageFooter } from "../page-footer";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Code, Briefcase, HeartPulse, GraduationCap, Clock, BookOpen, CheckCircle2, Calendar, Users, FileText } from "lucide-react";
import { useRouter } from "../router";
import { usePrograms } from "../../hooks/use-programs";

export function ProgramsPage() {
  const { navigate } = useRouter();
  const { programs: managedPrograms } = usePrograms();

  const programs = [
    {
      id: 1,
      code: "BSCS",
      name: "Computer Science",
      degree: "BS Computer Science (BSCS)",
      description: "Comprehensive program covering software development, algorithms, and emerging technologies aligned with CHED standards.",
      duration: "4 years",
      units: "165 units",
      tuition: "₱35,000/sem",
      icon: Code,
      available: true,
    },
    {
      id: 2,
      code: "BSBA",
      name: "Business Administration",
      degree: "BS Business Administration (BSBA)",
      description: "Develop leadership and management skills with majors in Marketing, Financial, or Operations Management.",
      duration: "4 years",
      units: "162 units",
      tuition: "₱32,000/sem",
      icon: Briefcase,
      available: true,
    },
    {
      id: 3,
      code: "BSN",
      name: "Nursing",
      degree: "BS Nursing (BSN)",
      description: "Prepare for healthcare careers with comprehensive nursing education, clinical experience, and PNLE preparation.",
      duration: "4 years",
      units: "184 units",
      tuition: "₱45,000/sem",
      icon: HeartPulse,
      available: true,
    },
    {
      id: 4,
      code: "AAAS",
      name: "General Education",
      degree: "Associate in Arts/Science (AA/AS)",
      description: "Two-year foundation program ideal for students planning to continue to a bachelor's degree.",
      duration: "2 years",
      units: "72 units",
      tuition: "₱18,000/sem",
      icon: GraduationCap,
      available: true,
    },
  ];
  const additionalPrograms = managedPrograms.filter(
    (program) => !programs.some((featuredProgram) => featuredProgram.code === program.code)
  );

  const enrollmentInfo = [
    {
      icon: Calendar,
      title: "Enrollment Periods",
      description: "1st Sem: May-June | 2nd Sem: Oct-Nov | Summer: Mar-Apr",
    },
    {
      icon: FileText,
      title: "Required Documents",
      description: "Form 137, PSA Birth Certificate, Good Moral, 2x2 Photos",
    },
    {
      icon: Users,
      title: "Financial Aid",
      description: "Scholarships, CHED grants, and installment plans available",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader variant="public" />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-bayoux-200/20 dark:bg-blue-bayoux-800/20 blur-3xl" />
          </div>

          <div className="container mx-auto px-4 max-w-screen-2xl">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border bg-blue-bayoux-50 dark:bg-blue-bayoux-900/50 px-4 py-2 text-sm">
                <span className="text-blue-bayoux-700 dark:text-blue-bayoux-300">Academic Programs</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl">
                CHED-Compliant Degree Programs
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Comprehensive programs designed to prepare Filipino students for successful careers. 
                All programs meet CHED standards and industry requirements.
              </p>
            </div>
          </div>
        </section>

        {/* Programs Grid */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-screen-2xl">
            <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {programs.map((program) => (
                <Card key={program.id} className="group border-2 hover:border-blue-bayoux-400 dark:hover:border-blue-bayoux-600 transition-all hover:shadow-2xl">
                  <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="inline-flex p-3 bg-blue-bayoux-100 dark:bg-blue-bayoux-900 rounded-xl group-hover:scale-110 transition-transform">
                        <program.icon className="h-7 w-7 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                      </div>
                      {program.available && (
                        <Badge className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                          Now Accepting
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl">{program.name}</h3>
                      <Badge variant="outline" className="w-fit text-xs">
                        {program.degree}
                      </Badge>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {program.description}
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Program Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                        <div>
                          <div className="text-xs text-muted-foreground">Duration</div>
                          <div className="text-sm">{program.duration}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                        <div>
                          <div className="text-xs text-muted-foreground">Total Units</div>
                          <div className="text-sm">{program.units}</div>
                        </div>
                      </div>
                    </div>

                    {/* Tuition & CTA */}
                    <div className="pt-4 border-t space-y-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-muted-foreground">Tuition Fee</span>
                        <span className="text-2xl text-blue-bayoux-600 dark:text-blue-bayoux-400">
                          {program.tuition}
                        </span>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => navigate("enrollment")}
                      >
                        Apply for {program.name}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {additionalPrograms.map((program) => (
                <Card key={program.code} className="group border-2 hover:border-blue-bayoux-400 dark:hover:border-blue-bayoux-600 transition-all hover:shadow-2xl">
                  <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="inline-flex p-3 bg-blue-bayoux-100 dark:bg-blue-bayoux-900 rounded-xl">
                        <GraduationCap className="h-7 w-7 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                      </div>
                      <Badge className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                        Now Accepting
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl">{program.name}</h3>
                      <Badge variant="outline" className="w-fit text-xs">
                        {program.code}
                      </Badge>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {program.description}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                        <div>
                          <div className="text-xs text-muted-foreground">Duration</div>
                          <div className="text-sm">{program.duration}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                        <div>
                          <div className="text-xs text-muted-foreground">Total Units</div>
                          <div className="text-sm">{program.totalUnits} units</div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t space-y-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-muted-foreground">Tuition Fee</span>
                        <span className="text-sm text-muted-foreground">Contact admissions</span>
                      </div>
                      <Button className="w-full" onClick={() => navigate("enrollment")}>
                        Apply for {program.name}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Enrollment Info Section */}
        <section className="py-20 bg-blue-bayoux-50/50 dark:bg-blue-bayoux-950/20">
          <div className="container mx-auto px-4 max-w-screen-2xl">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16 space-y-4">
                <h2 className="text-3xl md:text-4xl lg:text-5xl">
                  Enrollment Information
                </h2>
                <p className="text-lg text-muted-foreground">
                  Important details about the enrollment process
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {enrollmentInfo.map((info, index) => (
                  <Card key={index} className="border-2">
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="inline-flex p-3 bg-blue-bayoux-100 dark:bg-blue-bayoux-900 rounded-xl">
                        <info.icon className="h-6 w-6 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                      </div>
                      <h3 className="text-lg">{info.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {info.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="text-center mt-12 space-y-6">
                <div className="space-y-3">
                  <h3 className="text-xl">All Programs Include:</h3>
                  <div className="flex flex-wrap justify-center gap-4 text-sm">
                    {[
                      "CHED-compliant curriculum",
                      "Hands-on practicum/OJT",
                      "Capstone project",
                      "Industry partnerships",
                      "Career guidance",
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button size="lg" onClick={() => navigate("enrollment")}>
                  Start Your Enrollment
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PageFooter />
    </div>
  );
}
