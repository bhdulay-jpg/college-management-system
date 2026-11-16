"use client";

import { PageHeader } from "../page-header";
import { PageFooter } from "../page-footer";
import { HeroSection } from "../homepage/hero-section";
import { FeaturesSection } from "../homepage/features-section";
import { HowItWorks } from "../homepage/how-it-works";
import { EnrollmentPreview } from "../homepage/enrollment-preview";
import { RolesPreview } from "../homepage/roles-preview";
import { useRouter } from "../router";

export function Homepage() {
  const { navigate } = useRouter();

  const handleEnrollClick = () => {
    navigate("enrollment");
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted dark:bg-background">
      <PageHeader variant="public" />
      
      <main className="flex-1">
        <HeroSection onEnrollClick={handleEnrollClick} />
        <FeaturesSection />
        <HowItWorks />
        <EnrollmentPreview onStartEnrollment={handleEnrollClick} />
        <RolesPreview />
      </main>

      <PageFooter />
    </div>
  );
}
