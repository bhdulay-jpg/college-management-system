"use client";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { CheckCircle2, Mail, FileText, Clock, Wallet, UserCheck, IdCard, Shield } from "lucide-react";
import { useRouter } from "../router";

interface SuccessPageProps {
  applicationId: string;
  email: string;
}

export function SuccessPage({ applicationId, email }: SuccessPageProps) {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-3xl">
        <Card className="border-success shadow-lg">
          <CardContent className="pt-12 pb-8 text-center space-y-6">
            {/* Success icon */}
            <div className="inline-flex items-center justify-center rounded-full bg-success/10 p-6 animate-in zoom-in duration-300">
              <CheckCircle2 className="h-16 w-16 text-success" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-3xl">Application Submitted Successfully!</h1>
              <p className="text-lg text-muted-foreground">
                Thank you for applying to CollegeConnect Philippines
              </p>
            </div>

            {/* Application ID */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6 space-y-2">
                <div className="text-sm text-muted-foreground">Your Application ID</div>
                <div className="text-2xl font-mono tracking-wide text-primary font-bold">{applicationId}</div>
                <p className="text-xs text-muted-foreground">
                  Keep this ID safe for tracking your application status
                </p>
              </CardContent>
            </Card>

            {/* What happens next - Updated workflow */}
            <div className="text-left space-y-4">
              <h3 className="text-center text-xl font-semibold">Next Steps in Your Enrollment</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-muted">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium mb-1">1. Confirmation Email Sent</div>
                    <div className="text-sm text-muted-foreground">
                      We've sent a confirmation email to <strong className="text-foreground">{email}</strong> with your application details and payment information.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-muted">
                  <div className="bg-blue-500/10 p-2 rounded-full">
                    <Wallet className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium mb-1">2. Business Office Payment Verification</div>
                    <div className="text-sm text-muted-foreground">
                      The Business Office will verify your payment and receipt within <strong className="text-foreground">24-48 hours</strong>. You'll receive an email once verified.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-muted">
                  <div className="bg-green-500/10 p-2 rounded-full">
                    <UserCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium mb-1">3. Registrar Document Review</div>
                    <div className="text-sm text-muted-foreground">
                      After payment verification, the Registrar will review your documents and application details.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-muted">
                  <div className="bg-purple-500/10 p-2 rounded-full">
                    <IdCard className="h-5 w-5 text-purple-600 flex-shrink-0" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium mb-1">4. School ID & Email Creation</div>
                    <div className="text-sm text-muted-foreground">
                      The Registrar will create your <strong className="text-foreground">school ID number</strong> and <strong className="text-foreground">official school email accounts</strong> for both you and your parent/guardian.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-muted">
                  <div className="bg-orange-500/10 p-2 rounded-full">
                    <Shield className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium mb-1">5. Admin Account Activation</div>
                    <div className="text-sm text-muted-foreground">
                      The Admin will create your user accounts and send login credentials to both student and parent email addresses.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-success/10 rounded-lg border border-success/30">
                  <div className="bg-success/20 p-2 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium mb-1 text-success">6. Access Your Dashboard</div>
                    <div className="text-sm text-muted-foreground">
                      Once your accounts are created, you can log in and access your student dashboard to view grades, schedules, and announcements!
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <Card className="bg-info/10 border-info/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-info mt-0.5" />
                  <div className="text-left text-sm">
                    <div className="font-medium mb-1">Expected Timeline</div>
                    <p className="text-muted-foreground">
                      The entire verification and account creation process typically takes <strong className="text-foreground">2-5 business days</strong>. You'll receive email notifications at each step.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Important note */}
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 text-sm">
              <p className="text-left">
                <strong className="text-warning-foreground">Important Reminders:</strong>
              </p>
              <ul className="list-disc list-inside text-left mt-2 space-y-1 text-muted-foreground ml-1">
                <li>Check your email regularly (including spam folder)</li>
                <li>Keep your application ID for reference</li>
                <li>Ensure your payment receipt is clear and complete</li>
                <li>Both student and parent will receive separate login credentials</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={() => navigate("home")} className="flex-1">
                Return to Homepage
              </Button>
              <Button onClick={() => navigate("announcements")} variant="outline" className="flex-1">
                View Announcements
              </Button>
            </div>

            {/* Support */}
            <div className="text-sm text-muted-foreground pt-4 border-t">
              Questions or concerns? Contact us at{" "}
              <a href="mailto:admissions@collegeconnect.edu.ph" className="text-primary hover:underline font-medium">
                admissions@collegeconnect.edu.ph
              </a>
              {" "}or call <strong>(02) 8123-4567</strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}