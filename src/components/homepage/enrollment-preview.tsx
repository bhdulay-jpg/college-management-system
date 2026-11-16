import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { CheckCircle2, FileText, Clock, ArrowRight } from "lucide-react";
import { ScrollAnimation } from "../scroll-animation";

interface EnrollmentPreviewProps {
  onStartEnrollment?: () => void;
}

export function EnrollmentPreview({ onStartEnrollment }: EnrollmentPreviewProps) {
  const benefits = [
    "Complete your application online",
    "Choose a program during application",
    "Upload required supporting documents",
    "Review details before submission",
    "Follow your application status",
    "Use desktop or mobile devices",
  ];

  return (
    <section className="py-20 md:py-24 lg:py-28">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-screen-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <ScrollAnimation direction="right" className="space-y-8 order-2 lg:order-1">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border bg-blue-bayoux-50 dark:bg-blue-bayoux-900/50 px-3.5 py-1.5 text-sm tracking-tight">
                <span className="text-blue-bayoux-700 dark:text-blue-bayoux-300">Digital Enrollment</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight">
                Apply Anytime, Anywhere
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Experience the convenience of our fully digital enrollment process. 
                Review the requirements, provide your information, and submit your application online.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400 mt-0.5 flex-shrink-0" />
                  <span className="text-base leading-relaxed">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button size="lg" onClick={onStartEnrollment} className="group h-14 px-8 text-base">
                Start Your Application
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            <div className="flex items-start gap-4 p-5 bg-blue-bayoux-50 dark:bg-blue-bayoux-900/50 rounded-lg border border-blue-bayoux-200 dark:border-blue-bayoux-800">
              <div className="inline-flex p-3 bg-blue-bayoux-100 dark:bg-blue-bayoux-900 rounded-lg flex-shrink-0">
                <Clock className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm mb-0.5 tracking-tight">Application updates</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Check your application status and follow the next steps as they become available.
                </p>
              </div>
            </div>
          </ScrollAnimation>

          {/* Visual Preview */}
          <ScrollAnimation direction="left" className="order-1 lg:order-2">
            <div className="relative">
              {/* Main Card */}
              <Card className="relative border-2 shadow-xl">
                <CardContent className="p-6 md:p-8 space-y-7">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1 tracking-tight">Application preview</div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                        <span className="text-lg tracking-tight">Online application</span>
                      </div>
                    </div>
                    <div className="inline-flex px-3 py-1 bg-blue-bayoux-100 dark:bg-blue-bayoux-900 rounded-full text-xs text-blue-bayoux-700 dark:text-blue-bayoux-300 tracking-tight">
                      Preview
                    </div>
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Applicant details</span>
                      <span className="text-sm">Provide your information</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Program</span>
                      <span className="text-sm">Choose a program</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Documents</span>
                      <span className="text-sm">Upload requirements</span>
                    </div>
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <div className="text-sm text-muted-foreground tracking-tight">Before you submit</div>
                    <div className="flex items-start gap-2.5 p-3 bg-blue-bayoux-50 dark:bg-blue-bayoux-950/50 rounded-lg border border-blue-bayoux-200 dark:border-blue-bayoux-900">
                      <CheckCircle2 className="h-4 w-4 text-blue-bayoux-600 dark:text-blue-bayoux-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm tracking-tight">Review your information</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Confirm your details and supporting documents before sending.</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </ScrollAnimation>
        </div>
      </div>
    </section>
  );
}
