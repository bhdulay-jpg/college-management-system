import { Shield, UserCheck, GraduationCap, Users, User, DollarSign } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { ScrollAnimation, StaggerContainer, StaggerItem } from "../scroll-animation";

export function RolesPreview() {
  const roles = [
    {
      icon: Shield,
      name: "Admin",
      description: "Complete system control and oversight",
      features: ["User management", "System analytics", "Platform configuration"],
    },
    {
      icon: UserCheck,
      name: "Registrar",
      description: "Academic records and enrollment",
      features: ["Application review", "Student records", "Enrollment approval"],
    },
    {
      icon: GraduationCap,
      name: "Teacher",
      description: "Course and student management",
      features: ["Grade management", "Attendance tracking", "Course materials"],
    },
    {
      icon: Users,
      name: "Student",
      description: "Academic progress and resources",
      features: ["Grade viewing", "Payment tracking", "Course enrollment"],
    },
    {
      icon: User,
      name: "Parent",
      description: "Child's academic monitoring",
      features: ["Progress tracking", "Payment management", "Communication"],
    },
    {
      icon: DollarSign,
      name: "Business Office",
      description: "Financial operations and billing",
      features: ["Payment verification", "Receipt generation", "Financial reports"],
    },
  ];

  return (
    <section className="py-20 md:py-24 lg:py-28 bg-blue-bayoux-50/50 dark:bg-blue-bayoux-950/20">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-screen-2xl">
        <ScrollAnimation direction="up" className="text-center mb-12 md:mb-14 lg:mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3.5 py-1.5 text-sm tracking-tight">
            <span className="text-blue-bayoux-700 dark:text-blue-bayoux-300">Multi-Role System</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight">
            Tailored for Every User
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Specialized dashboards and tools designed for each role in your institution
          </p>
        </ScrollAnimation>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto" staggerDelay={0.1}>
          {roles.map((role, index) => (
            <StaggerItem key={index}>
              <Card 
                className="group relative border-2 hover:border-blue-bayoux-400 dark:hover:border-blue-bayoux-600 transition-all hover:shadow-xl overflow-hidden h-full"
              >
              <CardContent className="p-6 md:p-7 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="inline-flex rounded-xl bg-blue-bayoux-100 dark:bg-blue-bayoux-900 p-3 group-hover:scale-110 transition-transform">
                    <role.icon className="h-6 w-6 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl tracking-tight leading-tight">{role.name}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{role.description}</p>
                </div>

                <div className="space-y-2.5 pt-2">
                  {role.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-base">
                      <div className="h-2 w-2 rounded-full bg-blue-bayoux-600 dark:bg-blue-bayoux-400 flex-shrink-0" />
                      <span className="text-muted-foreground leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-bayoux-500/0 to-blue-bayoux-600/0 group-hover:from-blue-bayoux-500/5 group-hover:to-blue-bayoux-600/5 transition-all pointer-events-none" />
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <ScrollAnimation direction="fade" delay={0.3} className="text-center mt-10">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Role-based access control ensures each user sees exactly what they need
          </p>
        </ScrollAnimation>
      </div>
    </section>
  );
}
