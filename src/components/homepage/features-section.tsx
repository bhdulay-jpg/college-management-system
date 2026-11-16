import { GraduationCap, Users, FileCheck, Calendar, BarChart, Shield, Bell, Smartphone } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { ScrollAnimation, StaggerContainer, StaggerItem } from "../scroll-animation";

export function FeaturesSection() {
  const features = [
    {
      icon: FileCheck,
      title: "Digital Enrollment",
      description: "Submit an online application, upload supporting documents, and follow its status.",
    },
    {
      icon: GraduationCap,
      title: "Academic Management",
      description: "Keep grades, course schedules, and curriculum information organized in one place.",
    },
    {
      icon: Users,
      title: "Multi-Role Dashboards",
      description: "Give students, teachers, parents, and staff tools suited to their responsibilities.",
    },
    {
      icon: Calendar,
      title: "Schedule Management",
      description: "Create and manage class timetables, room assignments, and academic dates.",
    },
    {
      icon: BarChart,
      title: "Analytics & Reports",
      description: "Review enrollment, academic, and operational information to support decisions.",
    },
    {
      icon: Bell,
      title: "Announcements & Updates",
      description: "Share important announcements and keep users informed across the platform.",
    },
    {
      icon: Shield,
      title: "Role-Based Access",
      description: "Provide access to the tools and information relevant to each user's responsibilities.",
    },
    {
      icon: Smartphone,
      title: "Mobile Ready",
      description: "Use the platform across desktop, tablet, and mobile screen sizes.",
    },
  ];

  return (
    <section className="pb-20 pt-16 md:pb-24 md:pt-20 lg:pb-28 lg:pt-24">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-screen-2xl">
        <ScrollAnimation direction="up" className="text-center mb-12 md:mb-14 lg:mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border bg-blue-bayoux-50 dark:bg-blue-bayoux-900/50 px-3.5 py-1.5 text-sm tracking-tight">
            <span className="text-blue-bayoux-700 dark:text-blue-bayoux-300">Core Capabilities</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight">
            Built for everyday college operations
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Practical tools for admissions, academic management, and student services.
          </p>
        </ScrollAnimation>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7" staggerDelay={0.1}>
          {features.map((feature, index) => (
            <StaggerItem key={index}>
              <Card 
                className="group relative overflow-hidden border-2 hover:border-blue-bayoux-400 dark:hover:border-blue-bayoux-600 transition-all duration-300 hover:shadow-xl h-full"
              >
              <CardContent className="p-6 md:p-7 space-y-4">
                <div className="inline-flex rounded-xl bg-blue-bayoux-100 dark:bg-blue-bayoux-900 p-3 transition-transform group-hover:scale-110">
                  <feature.icon className="h-6 w-6 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg tracking-tight leading-tight">{feature.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-bayoux-500/0 to-blue-bayoux-600/0 group-hover:from-blue-bayoux-500/5 group-hover:to-blue-bayoux-600/5 transition-all pointer-events-none" />
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
