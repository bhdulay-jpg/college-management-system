import { GraduationCap } from "lucide-react";
import { useRouter } from "./router";
import { ScrollAnimation } from "./scroll-animation";

export function PageFooter() {
  const { navigate } = useRouter();

  const quickLinks = [
    { label: "Home", route: "home" },
    { label: "About Us", route: "about" },
    { label: "Programs", route: "programs" },
    { label: "Enrollment", route: "enrollment" },
  ];

  const resources = [
    { label: "Contact", route: "contact" },
    { label: "Student Portal", route: "login" },
  ];

  return (
    <footer className="border-t bg-blue-bayoux-50/30 dark:bg-blue-bayoux-950/30">
      <ScrollAnimation direction="up">
        <div className="container mx-auto px-6 py-16 md:px-8 md:py-20 lg:px-12">
          <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="inline-flex p-2 bg-primary/10 rounded-lg">
                <GraduationCap className="h-7 w-7 text-primary" />
              </div>
              <span className="text-lg font-semibold leading-tight">College Management System</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              A unified digital workspace for admissions, academics, schedules, and student services.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-sm">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              {quickLinks.map((link) => (
                <li key={link.route}>
                  <button
                    onClick={() => navigate(link.route as any)}
                    className="text-muted-foreground hover:text-blue-bayoux-600 dark:hover:text-blue-bayoux-400 transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">Resources</h4>
            <ul className="space-y-3 text-sm">
              {resources.map((link) => (
                <li key={link.route}>
                  <button
                    onClick={() => navigate(link.route as any)}
                    className="text-muted-foreground hover:text-blue-bayoux-600 dark:hover:text-blue-bayoux-400 transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span>© {new Date().getFullYear()} College Management System. All rights reserved.</span>
            </div>
          </div>
        </div>
        </div>
      </ScrollAnimation>
    </footer>
  );
}
