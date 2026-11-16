"use client";

import { PageHeader } from "../page-header";
import { EnrollmentForm } from "../enrollment/enrollment-form";

export function EnrollmentPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader variant="public" />
      <EnrollmentForm />
    </div>
  );
}
