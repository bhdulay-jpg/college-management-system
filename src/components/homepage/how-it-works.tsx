import { FileText, UserCheck, GraduationCap, CheckCircle2 } from "lucide-react";
import { useRouter } from "../router";
import { ScrollAnimation, StaggerContainer, StaggerItem } from "../scroll-animation";

export function HowItWorks() {
  const { navigate } = useRouter();

  const steps = [
    {
      number: "01",
      icon: FileText,
      title: "Apply Online",
      description: "Complete the application, select a program, and provide the required information and documents.",
      highlight: "Submit from any device",
    },
    {
      number: "02",
      icon: UserCheck,
      title: "Application Review",
      description: "The admissions team reviews your submission and updates your application status.",
      highlight: "Follow your application status",
    },
    {
      number: "03",
      icon: GraduationCap,
      title: "Start Learning",
      description: "After acceptance and account setup, sign in to access the student portal and academic services.",
      highlight: "Access your student portal",
    },
  ];

  return (
    <section className="py-20 md:py-24 lg:py-28 bg-blue-bayoux-50/50 dark:bg-blue-bayoux-950/20">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-screen-2xl">
        <ScrollAnimation direction="up" className="text-center mb-12 md:mb-14 lg:mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3.5 py-1.5 text-sm tracking-tight">
            <span className="text-blue-bayoux-700 dark:text-blue-bayoux-300">Simple Process</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight">
            How Enrollment Works
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            See the application process from submission through portal access.
          </p>
        </ScrollAnimation>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto" staggerDelay={0.2}>
          {steps.map((step, index) => (
            <StaggerItem key={index} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-blue-bayoux-300 to-transparent dark:from-blue-bayoux-700" />
              )}

              <div className="relative bg-card border-2 rounded-xl p-6 md:p-8 space-y-5 hover:border-blue-bayoux-400 dark:hover:border-blue-bayoux-600 transition-all hover:shadow-xl group">
                {/* Step number */}
                <div className="flex items-center justify-between">
                  <div className="text-5xl font-light text-blue-bayoux-200 dark:text-blue-bayoux-800 tracking-tight">
                    {step.number}
                  </div>
                  <div className="inline-flex rounded-xl bg-blue-bayoux-100 dark:bg-blue-bayoux-900 p-3 group-hover:scale-110 transition-transform">
                    <step.icon className="h-7 w-7 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl tracking-tight leading-tight">{step.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-blue-bayoux-600 dark:text-blue-bayoux-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{step.highlight}</span>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <div className="text-center mt-12 md:mt-16">
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Ready to begin your journey? Start your application now.
          </p>
          <button
            onClick={() => navigate("enrollment")}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-bayoux-600 hover:bg-blue-bayoux-700 dark:bg-blue-bayoux-500 dark:hover:bg-blue-bayoux-600 text-white rounded-lg transition-colors text-base"
          >
            <FileText className="h-4 w-4" />
            Start Application
          </button>
        </div>
      </div>
    </section>
  );
}
